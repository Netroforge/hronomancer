import { themeColor, hexToRgb } from '../../shared/colors';
export function updateTrail(trail, x, y, vx, vy, activity, intensity) {
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 2)
        return;
    trail.push({
        x,
        y,
        life: 1,
        size: Math.min(3 + speed * 0.15, 12) * intensity,
    });
    const maxPoints = 30 + Math.floor(activity * 20);
    while (trail.length > maxPoints)
        trail.shift();
    for (const p of trail) {
        p.life -= 0.03 + activity * 0.02;
    }
}
export function drawCursorTrail(ctx, state) {
    if (!state.showCursorTrail)
        return;
    const trail = state.trail;
    if (!trail || trail.length === 0)
        return;
    const { intensity, colorTheme } = state;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
    const [sr, sg, sb] = hexToRgb(themeColor(colorTheme, 'secondary'));
    const [ar, ag, ab] = hexToRgb(themeColor(colorTheme, 'accent'));
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const life = p.life;
        if (life <= 0)
            continue;
        const t = i / trail.length;
        const size = p.size * life * intensity;
        const cr = r + (sr - r) * t;
        const cg = g + (sg - g) * t;
        const cb = b + (sb - b) * t;
        ctx.globalAlpha = life * intensity * 0.7;
        ctx.fillStyle = `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        if (Math.random() < 0.15 * life) {
            const sparkX = p.x + (Math.random() - 0.5) * 20;
            const sparkY = p.y + (Math.random() - 0.5) * 20;
            ctx.fillStyle = `rgba(${ar},${ag},${ab},${life * 0.6})`;
            ctx.fillRect(sparkX, sparkY, 2, 2);
        }
    }
    ctx.restore();
}
