export const CYBER_PINK = '#ff2a6d';
export const CYBER_CYAN = '#05d9e8';
export const CYBER_GREEN = '#00ff41';
export const CYBER_PURPLE = '#d100d1';
export const CYBER_YELLOW = '#faff00';
export const BG_DARK = '#0a0a0a';
export function themeColor(theme, key) {
    return theme.colors[key];
}
export function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}
export function rgbToString(rgb, alpha = 1) {
    return alpha < 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})` : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}
