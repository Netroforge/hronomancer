# Changelog

## Unreleased

### Fixed

- Restored click-through overlays on Linux so effects no longer block the
  configuration window or other applications.

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
