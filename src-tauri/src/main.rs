use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::{Duration, Instant},
};

#[cfg(target_os = "linux")]
use gtk::prelude::*;
use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

const CONTROLLER_LABEL: &str = "controller";
const CONFIG_LABEL: &str = "config";
const TRAY_ID: &str = "main";
const CAPTURE_WIDTH: u32 = 256;
const CAPTURE_HEIGHT: u32 = 144;

struct NativeState {
    services_started: AtomicBool,
    system: Mutex<System>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Bounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeMonitor {
    id: u32,
    name: String,
    label: String,
    bounds: Bounds,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisplayDescriptor {
    id: u32,
    enabled: bool,
    bounds: Bounds,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrayDisplay {
    id: u32,
    label: String,
    enabled: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrayState {
    effects_enabled: bool,
    color_theme_id: String,
    glitch_theme_id: String,
    displays: Vec<TrayDisplay>,
    update_status: String,
    update_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeInput {
    kind: String,
    x: Option<f64>,
    y: Option<f64>,
    button: Option<u32>,
    key: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStats {
    cpu: u32,
    ram: u32,
    ram_total: u64,
    uptime: u64,
}

fn stable_monitor_id(name: &str, position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> u32 {
    let mut hash = 2_166_136_261_u32;
    for byte in format!(
        "{name}:{}:{}:{}:{}",
        position.x, position.y, size.width, size.height
    )
    .bytes()
    {
        hash ^= u32::from(byte);
        hash = hash.wrapping_mul(16_777_619);
    }
    hash
}

fn monitors(app: &AppHandle) -> Result<Vec<NativeMonitor>, String> {
    app.available_monitors()
        .map_err(|error| error.to_string())?
        .into_iter()
        .map(|monitor| {
            let position = *monitor.position();
            let size = *monitor.size();
            let name = monitor
                .name()
                .cloned()
                .unwrap_or_else(|| "Unknown monitor".to_string());
            let id = stable_monitor_id(&name, position, size);
            Ok(NativeMonitor {
                id,
                label: format!("{} ({}x{})", name, size.width, size.height),
                name,
                bounds: Bounds {
                    x: position.x,
                    y: position.y,
                    width: size.width,
                    height: size.height,
                },
            })
        })
        .collect()
}

#[tauri::command]
fn get_monitors(app: AppHandle) -> Result<Vec<NativeMonitor>, String> {
    monitors(&app)
}

fn apply_click_through(window: &WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let gtk_window = window.gtk_window().map_err(|error| error.to_string())?;
        if let Some(gdk_window) = gtk_window.window() {
            let empty_region = cairo::Region::create();
            gdk_window.input_shape_combine_region(&empty_region, 0, 0);
            return Ok(());
        }
    }
    window
        .set_ignore_cursor_events(true)
        .map_err(|error| error.to_string())
}

fn settle_overlay(window: &WebviewWindow, bounds: &Bounds) -> Result<(), String> {
    window
        .set_size(Size::Physical(PhysicalSize::new(
            bounds.width,
            bounds.height,
        )))
        .map_err(|error| error.to_string())?;
    window
        .set_position(Position::Physical(PhysicalPosition::new(
            bounds.x, bounds.y,
        )))
        .map_err(|error| error.to_string())?;
    apply_click_through(window)
}

fn create_overlay(app: &AppHandle, display: &DisplayDescriptor) -> Result<(), String> {
    let label = format!("overlay-{}", display.id);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let window =
        WebviewWindowBuilder::new(app, &label, WebviewUrl::App("overlay/index.html".into()))
            .title(format!("Hronomancer Overlay {}", display.id))
            .position(display.bounds.x as f64, display.bounds.y as f64)
            .inner_size(display.bounds.width as f64, display.bounds.height as f64)
            .transparent(true)
            .decorations(false)
            .shadow(false)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .closable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focusable(false)
            .content_protected(true)
            .visible(false)
            .build()
            .map_err(|error| error.to_string())?;

    #[cfg(target_os = "linux")]
    {
        let gtk_window = window.gtk_window().map_err(|error| error.to_string())?;
        gtk_window.realize();
        if let Some(gdk_window) = gtk_window.window() {
            gdk_window.set_override_redirect(true);
        }
    }

    // Apply geometry and the empty input region both before and immediately
    // after mapping. Some Linux compositors recreate the native surface while
    // showing it, so doing both avoids even a short click-blocking interval.
    settle_overlay(&window, &display.bounds)?;
    window.show().map_err(|error| error.to_string())?;
    settle_overlay(&window, &display.bounds)?;
    let settled_window = window.clone();
    let bounds = display.bounds.clone();
    let app_for_thread = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(750));
        let _ = app_for_thread.run_on_main_thread(move || {
            if let Err(error) = settle_overlay(&settled_window, &bounds) {
                eprintln!(
                    "[Hronomancer] Failed to settle {}: {error}",
                    settled_window.label()
                );
            }
        });
    });
    Ok(())
}

#[tauri::command]
fn sync_overlays(
    app: AppHandle,
    displays: Vec<DisplayDescriptor>,
    effects_enabled: bool,
    boot_complete: bool,
) -> Result<(), String> {
    let enabled: HashSet<u32> = displays
        .iter()
        .filter(|display| effects_enabled && if boot_complete { display.enabled } else { true })
        .map(|display| display.id)
        .collect();

    for (label, window) in app.webview_windows() {
        if let Some(id) = label
            .strip_prefix("overlay-")
            .and_then(|value| value.parse::<u32>().ok())
        {
            if !enabled.contains(&id) {
                let _ = window.destroy();
            }
        }
    }

    for display in displays
        .iter()
        .filter(|display| enabled.contains(&display.id))
    {
        if let Some(window) = app.get_webview_window(&format!("overlay-{}", display.id)) {
            settle_overlay(&window, &display.bounds)?;
        } else {
            create_overlay(&app, display)?;
        }
    }
    Ok(())
}

fn create_config_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(CONFIG_LABEL) {
        return Ok(window);
    }
    WebviewWindowBuilder::new(
        app,
        CONFIG_LABEL,
        WebviewUrl::App("config/index.html".into()),
    )
    .title("Hronomancer")
    .inner_size(420.0, 600.0)
    .min_inner_size(390.0, 480.0)
    .resizable(true)
    .decorations(false)
    .always_on_top(true)
    .background_color(tauri::webview::Color(10, 10, 10, 255))
    .visible(false)
    .build()
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn toggle_config_window(app: AppHandle) -> Result<(), String> {
    let window = create_config_window(&app)?;
    if window.is_visible().map_err(|error| error.to_string())? {
        window.hide().map_err(|error| error.to_string())
    } else {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn close_config_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(CONFIG_LABEL) {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn move_config_window(app: AppHandle, offset_x: i32, offset_y: i32) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(CONFIG_LABEL) {
        let position = window.outer_position().map_err(|error| error.to_string())?;
        window
            .set_position(Position::Physical(PhysicalPosition::new(
                position.x + offset_x,
                position.y + offset_y,
            )))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn request_state(window: WebviewWindow, app: AppHandle) -> Result<(), String> {
    app.emit_to(CONTROLLER_LABEL, "state-request", window.label())
        .map_err(|error| error.to_string())
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().config_dir().map_err(|error| error.to_string())?;
    Ok(base.join("hronomancer").join("settings.json"))
}

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<Option<String>, String> {
    let path = settings_path(&app)?;
    match fs::read_to_string(path) {
        Ok(settings) => Ok(Some(settings)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn save_settings(app: AppHandle, json: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&json).map_err(|error| error.to_string())?;
    let path = settings_path(&app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "settings path has no parent".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, json).map_err(|error| error.to_string())?;
    fs::rename(temporary, path).map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable().map_err(|error| error.to_string())
    } else {
        app.autolaunch()
            .disable()
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("only https URLs are allowed".to_string());
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_system_stats(state: State<'_, NativeState>) -> Result<SystemStats, String> {
    let mut system = state
        .system
        .lock()
        .map_err(|_| "system stats lock poisoned".to_string())?;
    system.refresh_cpu_usage();
    system.refresh_memory();
    let total_memory = system.total_memory();
    let used_memory = system.used_memory();
    Ok(SystemStats {
        cpu: system.global_cpu_usage().round() as u32,
        ram: if total_memory > 0 {
            ((used_memory as f64 / total_memory as f64) * 100.0).round() as u32
        } else {
            0
        },
        ram_total: (total_memory as f64 / 1_073_741_824.0).round() as u64,
        uptime: System::uptime(),
    })
}

#[tauri::command]
fn capture_monitor_screen_blocking(bounds: Bounds) -> Result<Vec<u8>, String> {
    let mut monitors = xcap::Monitor::all().map_err(|error| error.to_string())?;
    let exact_index = monitors.iter().position(|monitor| {
        monitor.x().ok() == Some(bounds.x)
            && monitor.y().ok() == Some(bounds.y)
            && monitor.width().ok() == Some(bounds.width)
            && monitor.height().ok() == Some(bounds.height)
    });
    let position_index = monitors.iter().position(|monitor| {
        monitor.x().ok() == Some(bounds.x) && monitor.y().ok() == Some(bounds.y)
    });
    let Some(index) = exact_index.or(position_index) else {
        return Err(format!(
            "no monitor matches {}x{} at {},{}",
            bounds.width, bounds.height, bounds.x, bounds.y
        ));
    };
    let monitor = monitors.swap_remove(index);
    if bounds.width == 0 || bounds.height == 0 {
        return Ok(Vec::new());
    }
    let image = monitor.capture_image().map_err(|error| error.to_string())?;
    let resized =
        image::imageops::resize(&image, CAPTURE_WIDTH, CAPTURE_HEIGHT, FilterType::Triangle);
    Ok(resized.into_raw())
}

#[tauri::command]
async fn capture_monitor_screen(bounds: Bounds) -> Result<tauri::ipc::Response, String> {
    let pixels =
        tauri::async_runtime::spawn_blocking(move || capture_monitor_screen_blocking(bounds))
            .await
            .map_err(|error| error.to_string())??;
    Ok(tauri::ipc::Response::new(pixels))
}

fn start_input_listener(app: AppHandle) {
    thread::spawn(move || {
        let mut cursor = (0.0, 0.0);
        let mut last_mouse_emit = Instant::now() - Duration::from_millis(10);
        let callback = move |event: rdev::Event| {
            let payload = match event.event_type {
                rdev::EventType::MouseMove { x, y } => {
                    cursor = (x, y);
                    Some(NativeInput {
                        kind: "mouse".to_string(),
                        x: Some(x),
                        y: Some(y),
                        button: None,
                        key: None,
                    })
                }
                rdev::EventType::ButtonPress(button) => Some(NativeInput {
                    kind: "click".to_string(),
                    x: Some(cursor.0),
                    y: Some(cursor.1),
                    button: Some(match button {
                        rdev::Button::Left => 1,
                        rdev::Button::Right => 2,
                        rdev::Button::Middle => 3,
                        rdev::Button::Unknown(value) => value.into(),
                    }),
                    key: None,
                }),
                rdev::EventType::KeyPress(key) => Some(NativeInput {
                    kind: "key".to_string(),
                    x: None,
                    y: None,
                    button: None,
                    key: Some(format!("{key:?}")),
                }),
                _ => None,
            };
            if let Some(payload) = payload {
                if payload.kind == "mouse" {
                    if last_mouse_emit.elapsed() < Duration::from_millis(8) {
                        return;
                    }
                    last_mouse_emit = Instant::now();
                }
                let _ = app.emit_to(CONTROLLER_LABEL, "native-input", payload);
            }
        };
        if let Err(error) = rdev::listen(callback) {
            eprintln!("[Hronomancer] Global input listener failed: {error:?}");
        }
    });
}

fn register_shortcuts(app: &AppHandle) -> Result<(), String> {
    let shortcuts = [
        ("Ctrl+Alt+H", "effects-toggle"),
        ("Ctrl+Alt+T", "theme-next"),
        ("Ctrl+Alt+G", "glitch-next"),
        ("Ctrl+Alt+U", "config-toggle"),
        ("Ctrl+Alt+P", "pomodoro-toggle"),
    ];
    for (shortcut, action) in shortcuts {
        let controller = app.clone();
        let action = action.to_string();
        app.global_shortcut()
            .on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = controller.emit_to(CONTROLLER_LABEL, "native-action", &action);
                }
            })
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn start_native_services(app: AppHandle, state: State<'_, NativeState>) -> Result<(), String> {
    if state.services_started.swap(true, Ordering::SeqCst) {
        return Ok(());
    }
    start_input_listener(app.clone());
    register_shortcuts(&app)
}

fn tray_menu(app: &AppHandle, state: &TrayState) -> Result<tauri::menu::Menu<tauri::Wry>, String> {
    let effects = CheckMenuItemBuilder::with_id(
        "effects-toggle",
        if state.effects_enabled {
            "Effects: ON"
        } else {
            "Effects: OFF"
        },
    )
    .checked(state.effects_enabled)
    .build(app)
    .map_err(|error| error.to_string())?;

    let mut themes = SubmenuBuilder::new(app, "Color Theme");
    for (id, label) in [
        ("cyber", "Cyber"),
        ("tron", "TRON"),
        ("synthwave", "Synthwave"),
        ("cyberpunk2077", "Cyberpunk 2077"),
        ("evangelion", "Evangelion"),
        ("amber", "Amber"),
        ("matrix", "Matrix"),
        ("ghost", "Ghost"),
    ] {
        let item = CheckMenuItemBuilder::with_id(format!("theme:{id}"), label)
            .checked(state.color_theme_id == id)
            .build(app)
            .map_err(|error| error.to_string())?;
        themes = themes.item(&item);
    }
    let themes = themes.build().map_err(|error| error.to_string())?;

    let mut glitches = SubmenuBuilder::new(app, "Glitch Style");
    for id in [
        "cyber",
        "tron",
        "synthwave",
        "cyberpunk2077",
        "evangelion",
        "matrix",
        "ghost",
        "terminator",
    ] {
        let item = CheckMenuItemBuilder::with_id(format!("glitch:{id}"), id)
            .checked(state.glitch_theme_id == id)
            .build(app)
            .map_err(|error| error.to_string())?;
        glitches = glitches.item(&item);
    }
    let glitches = glitches.build().map_err(|error| error.to_string())?;

    let mut displays = SubmenuBuilder::new(app, "Displays");
    for display in &state.displays {
        let item = CheckMenuItemBuilder::with_id(format!("display:{}", display.id), &display.label)
            .checked(display.enabled)
            .build(app)
            .map_err(|error| error.to_string())?;
        displays = displays.item(&item);
    }
    let displays = displays.build().map_err(|error| error.to_string())?;

    let intensity = SubmenuBuilder::new(app, "Intensity")
        .text("intensity:0.3", "Low (30%)")
        .text("intensity:0.5", "Medium (50%)")
        .text("intensity:0.7", "High (70%)")
        .text("intensity:1", "MAX (100%)")
        .build()
        .map_err(|error| error.to_string())?;

    let update_label = state
        .update_version
        .as_ref()
        .map(|version| format!("Download Update v{version}"))
        .unwrap_or_else(|| "Download Update".to_string());
    let check_update = MenuItemBuilder::with_id("update-check", "Check for Updates")
        .enabled(state.update_status == "idle")
        .build(app)
        .map_err(|error| error.to_string())?;
    let download_update = MenuItemBuilder::with_id("update-download", update_label)
        .enabled(state.update_status == "available")
        .build(app)
        .map_err(|error| error.to_string())?;
    let restart_update = MenuItemBuilder::with_id("update-restart", "Restart to Install")
        .enabled(state.update_status == "downloaded")
        .build(app)
        .map_err(|error| error.to_string())?;

    MenuBuilder::new(app)
        .text("header", "HRONOMANCER")
        .separator()
        .item(&effects)
        .text("config-open", "Open Config")
        .separator()
        .item(&themes)
        .item(&glitches)
        .item(&displays)
        .item(&intensity)
        .separator()
        .item(&check_update)
        .item(&download_update)
        .item(&restart_update)
        .text("update-releases", "Open Releases")
        .separator()
        .text("quit", "Quit")
        .build()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn update_tray(app: AppHandle, state: TrayState) -> Result<(), String> {
    let menu = tray_menu(&app, &state)?;
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_menu(Some(menu)).map_err(|error| error.to_string())
    } else {
        let icon = app
            .default_window_icon()
            .cloned()
            .unwrap_or_else(|| Image::new_owned(Vec::new(), 0, 0));
        TrayIconBuilder::with_id(TRAY_ID)
            .menu(&menu)
            .icon(icon)
            .tooltip("Hronomancer")
            .on_menu_event(|app, event| {
                let _ = app.emit_to(
                    CONTROLLER_LABEL,
                    "native-action",
                    event.id().as_ref().to_string(),
                );
            })
            .build(&app)
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

#[tauri::command]
async fn check_for_update(app: AppHandle) -> Result<Option<String>, String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;
    Ok(update.map(|update| update.version))
}

#[tauri::command]
async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    let Some(update) = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?
    else {
        return Err("no update available".to_string());
    };
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn restart_app(app: AppHandle) {
    app.restart();
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

fn create_controller(app: &AppHandle) -> Result<(), String> {
    WebviewWindowBuilder::new(
        app,
        CONTROLLER_LABEL,
        WebviewUrl::App("controller/index.html".into()),
    )
    .title("Hronomancer Controller")
    .inner_size(10.0, 10.0)
    .skip_taskbar(true)
    .visible(false)
    .build()
    .map(|_| ())
    .map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(NativeState {
            services_started: AtomicBool::new(false),
            system: Mutex::new(System::new()),
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            app_version,
            capture_monitor_screen,
            check_for_update,
            close_config_window,
            download_and_install_update,
            get_monitors,
            get_system_stats,
            load_settings,
            move_config_window,
            open_external,
            quit_app,
            request_state,
            restart_app,
            save_settings,
            set_autostart,
            show_notification,
            start_native_services,
            sync_overlays,
            toggle_config_window,
            update_tray,
        ])
        .setup(|app| {
            create_controller(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run Hronomancer");
}
