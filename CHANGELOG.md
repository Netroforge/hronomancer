# Changelog

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
