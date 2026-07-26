# HRONOMANCER

A cyberpunk desktop overlay for power users. Hronomancer paints a translucent,
click-through layer over your screens — scanlines, glitch bursts, a live
system-stats HUD, a Pomodoro timer, and a set of "ambient intelligence" effects
that quietly react to what's happening on your machine.

Everything runs **100% locally**. No accounts, no telemetry, no network calls,
no recordings — screen/audio analysis happens entirely in memory on your
computer and is never stored or sent anywhere.

## Features

- **Cyberpunk visuals** — scanlines, cursor trail, glitch blocks, vignette,
  edge glow, color flash on bright screens, and per-theme glitch styling.
- **System HUD** — live CPU/RAM readout, clock, session time, and a signal log
  of recent finished tasks and notifications.
- **Ambient intelligence** — uses screen + audio + input analysis to highlight
  completed tasks, radar toward off-screen notifications, a focus spotlight that
  dims your periphery, and a calm "presence dimming" when you step away.
- **Pomodoro timer** — work/break cycles with configurable lengths and a
  focus-ring progress arc.
- **Per-display control** — tune a different look for each monitor, or apply one
  setup to all displays at once.
- **Presets** — one-click starting points (`FULL SPECTRUM`, `FOCUS`, `AMBIENT`,
  `MINIMAL`, `MAXIMUM`) that set a sensible baseline you can tweak from there.
- **Launch at login** — start the overlay automatically (background) on user
  login.
- **Performance profiles** — choose `ECO`, `BALANCED`, or `SMOOTH` to trade
  screen-analysis responsiveness and animation frame rate for lower resource use.
- **Global hotkeys** — toggle effects, switch themes, open config, and start a
  Pomodoro without touching the mouse.

## Requirements

- Windows / macOS / Linux
- A screen with a desktop environment that supports transparent, click-through
  windows (most do).

## Getting started

### Download

Grab the latest installer / binary from the
[Releases](https://github.com/Netroforge/hronomancer/releases) page.

### Run from source

```bash
npm install
npm run dev        # launches Electron + the config window
```

To produce a distributable build:

```bash
npm run build
npm run pack       # or `npm run dist` (distributable installer)
```

> The overlay windows are click-through: you interact with your desktop as
> usual. Open the control panel with `Ctrl+Alt+U` to change anything.

## Hotkeys

| Shortcut        | Action                |
| --------------- | --------------------- |
| `Ctrl+Alt+H`    | Toggle effects        |
| `Ctrl+Alt+T`    | Switch color theme    |
| `Ctrl+Alt+G`    | Switch glitch style   |
| `Ctrl+Alt+U`    | Open config panel     |
| `Ctrl+Alt+P`    | Start / stop Pomodoro |

## Presets

Open the config panel (`Ctrl+Alt+U`) and pick a preset to instantly apply a
coherent look across every display:

- **FULL SPECTRUM** — everything on, maximum cyberpunk.
- **FOCUS** — calm deep-work setup: glitches off, smart assist on.
- **AMBIENT** — a quiet backdrop of only the helpful, glanceable cues.
- **MINIMAL** — just a clock, scanlines, and a glowing frame.
- **MAXIMUM** — overdrive, every effect maxed out.

You can refine any preset afterward — the config saves your changes to disk.

## Configuration

Settings are stored per-display in the app's user-data folder
(`settings.json`) and restored on launch.

- **Launch at login** — toggle in the `PARAMETERS` section; applies to the OS
  login items immediately.
- **Pomodoro** — set work/break lengths (5–90 min work, 1–30 min break) in the
  `POMODORO` section.
- **Performance profile** — `ECO` uses the least CPU/GPU, `BALANCED` is the
  recommended default, and `SMOOTH` raises rendering and screen-analysis rates.
- **Themes** — color themes (`cyber`, `tron`, `synthwave`, `cyberpunk2077`,
  `evangelion`, `amber`, `matrix`, `ghost`) and glitch styles can be mixed and
  their individual glitch parameters tuned.

## Privacy

Hronomancer does not require an account and never connects to the internet.
Screen and audio analysis are performed locally for the visual effects only;
nothing is logged, saved, or transmitted.

## Support

Hronomancer is free and open. If it earns a place on your screen, you can support
development here:

- Ko-fi: https://ko-fi.com/netroforge
- GitHub Sponsors / Patreon / Open Collective: **Netroforge**

## Development

- `npm run dev` — dev mode with hot reload.
- `npm run type-check` — validate renderer, preload, and main-process types.
- `npm run build` — type-check + production build via `electron-vite`.
- `npm run build:unpack` — build an unpacked app for local smoke testing.
- `npm run build:linux` / `build:mac` / `build:win` — create platform packages.
- `electron-builder.yml` — packaging config.

## License

See the repository for license details.
