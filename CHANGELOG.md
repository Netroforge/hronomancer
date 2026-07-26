# Changelog

## 2.0.0 - 2026-07-26

### Changed

- Replaced the Electron runtime with Tauri 2 and a native Rust controller,
  reducing the app from a Chromium process tree to the operating system's
  WebView plus one Hronomancer process.
- Moved monitor discovery, transparent overlay windows, click-through input,
  global input, shortcuts, tray integration, system stats, autostart,
  notifications, settings, and screen capture into the native controller.
- Replaced Electron Builder packaging with signed Tauri bundles and a
  multi-platform GitHub release pipeline for Linux, macOS Intel/Apple Silicon,
  and Windows.

### Added

- Signed Tauri updater artifacts and cross-platform `latest.json` metadata for
  automatic startup checks and user-controlled installation.
- A reproducible Linux build container and an X11 verifier for monitor geometry
  and click-through input regions.
- Regression coverage ensuring each display keeps an independent screen
  attention baseline.

### Fixed

- Use each monitor's exact physical origin and dimensions, including negative
  coordinates and mixed multi-monitor arrangements.
- Analyze and broadcast screen state independently per display instead of
  applying the primary screen's regions to every overlay.
- Keep Linux overlays outside normal window-manager placement and give them an
  empty X11 input region so they cannot intercept desktop clicks.
- Prevent ordinary editor text and motion from producing large tracking boxes.
- Treat CPU/RAM as visual pressure only above 70% and rate-limit motion-driven
  glitches, preventing normal memory use or overlay feedback from flooding the
  desktop with HUD bars.

## 1.2.0 - 2026-07-26

### Added

- Automatic update checks on packaged-app startup, with native notifications
  and tray actions to download/install supported packages or open the macOS
  release downloads.

### Improved

- Release validation now requires the tag to match `package.json` and passes a
  clean install, tests, build, and production dependency audit before creating
  the draft release.
- Linux Snap packaging now uses electron-builder's supported `snapcraft`
  configuration on the stable core22 base.

### Fixed

- Restored click-through overlays on Linux so effects no longer block the
  configuration window or other applications.
- Restored clean installs and full type-checking by keeping Vite and TypeScript
  on versions supported by the current Electron/Vue toolchain.
- Prevented package-manager-owned update flows from leaving the tray stuck in
  the checking state.
- Avoided offering unsupported in-app installation from unsigned macOS builds;
  update notifications now open the release-download handoff instead.

## 1.1.0 - 2026-07-26

### Added

- One-click Full Spectrum, Focus, Ambient, Minimal, and Maximum presets.
- Eco, Balanced, and Smooth performance profiles for render and screen-analysis cadence.
- Configurable Pomodoro work and break durations.
- Launch-at-login support on Windows, macOS, and Linux.
- Per-display preset editing and improved project documentation.

### Improved

- Resizable settings window for dense or small-screen layouts.
- GPU rasterization and adaptive capture/render cadence for lower idle resource use.
- Local-only settings typography with no remote font request.
- Current Electron, Vue, Pinia, Vue plugin, TypeScript-compatible tooling, and packaging dependencies.

### Fixed

- Removed generated JavaScript and declaration copies that could override newer TypeScript sources.
- Restored strict renderer and main-process type-checking.
- Corrected Hronomancer security-reporting links and release metadata.
- Made release builds deterministic with `npm ci`, Node.js 24, and explicit packaging scripts.
