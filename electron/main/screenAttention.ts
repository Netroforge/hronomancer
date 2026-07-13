import type {
  AttentionAnalysis,
  AttentionRegion,
  AttentionType,
  RegionActivity,
} from '../../src/renderer/shared/types';

// ─── Analysis grid ──────────────────────────────────────────────
// A far finer grid than the old 6×4. At the capture thumbnail's resolution each
// cell is a handful of pixels; grouping *adjacent* interesting cells into a
// connected component (below) lets a highlight trace the real bounding box of a
// popup/dialog instead of snapping to one coarse cell. 32×18 keeps the desktop's
// 16:9 aspect so bounding boxes aren't distorted.
const COLS = 32;
const ROWS = 18;
const CELL_COUNT = COLS * ROWS;

// At most this many regions are tracked/broadcast. Attention is scarce — the
// renderer surfaces even fewer (the top 1–2) as highlights; the rest only feed
// the ambient/assist channels (radar, cinema, task-done).
const MAX_REGIONS = 6;

let nextRegionId = 1;

// Per-cell running brightness baseline (EMA). Scoring reacts to how much a cell
// *changed* against this baseline rather than its absolute brightness, so a
// steady bright window doesn't highlight forever while a popup that suddenly
// appears does — then fades as the baseline catches up.
let baseline: Float32Array | null = null;

// Wall-clock of the previous analysis, so churn/quiet accumulate in real ms
// regardless of the (now adaptive) capture cadence.
let prevAnalyzeTime = 0;

// ─── Per-region tracking state (module-local, never serialised) ──
// Task-done detection needs a short motion history per region; keeping it here
// keeps the broadcast payload to plain serialisable fields.
interface TrackState {
  churnMs: number; // accumulated time the region has spent visibly working
  quietMs: number; // accumulated time it has been quiet since last churn
  everChurned: boolean; // churned long enough to count as a "task"
  completed: boolean; // already fired its done transition
  holdUntil: number; // keep a completed region alive until this ts (for the pulse)
  ageMs: number; // total tracked lifetime
  sustainedMotionMs: number; // time spent with large-area motion (→ video)
}
const tracks = new Map<number, TrackState>();

interface CellStats {
  brightness: Float32Array; // mean luminance 0..255
  motion: Float32Array; // mean per-pixel temporal diff 0..1
  contrast: Float32Array; // (max-min) luminance 0..1
  edges: Float32Array; // fraction of sampled pixels on a strong edge 0..1
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
}

// One connected blob of interesting cells, reduced to the aggregate signals the
// classifier needs.
interface Component {
  minGx: number;
  maxGx: number;
  minGy: number;
  maxGy: number;
  cells: number;
  energy: number; // summed per-cell interest
  motionMean: number;
  motionMax: number;
  brightJump: number; // mean positive brightness delta vs baseline
  edgeMean: number;
  contrastMean: number;
  colorDist: number; // mean distance from surrounding cells
}

/** Compact summary the capture loop uses to decide whether to sample faster. */
export interface AttentionPulse {
  energy: number; // total change energy this frame
  anyNew: boolean; // a region was just born
  anyChurning: boolean; // something is actively working
  anyComplete: boolean; // a task-done transition just fired
}

export function analyzeScreenForAttention(
  pixels: Uint8Array,
  width: number,
  height: number,
  analysis: AttentionAnalysis,
): AttentionPulse {
  const { sensitivity, mode } = analysis;
  const cellW = Math.floor(width / COLS);
  const cellH = Math.floor(height / ROWS);
  const now = Date.now();
  const dt = prevAnalyzeTime ? Math.min(now - prevAnalyzeTime, 2000) : 0;
  prevAnalyzeTime = now;
  const empty: AttentionPulse = { energy: 0, anyNew: false, anyChurning: false, anyComplete: false };
  if (cellW === 0 || cellH === 0) return empty;

  const prevPixels = analysis.prevFrame;
  const prevReady = !!prevPixels && prevPixels.length === pixels.length;

  let priming = false;
  if (!baseline || baseline.length !== CELL_COUNT) {
    baseline = new Float32Array(CELL_COUNT);
    priming = true;
  }

  const stats = computeCellStats(pixels, width, cellW, cellH, prevReady ? prevPixels! : null);
  if (priming) baseline.set(stats.brightness);

  // ── Per-cell interest energy + change mask ──────────────────────
  // Attention reacts to *change*, not steady state: the mask is driven by motion
  // and by how much a cell differs from its own running baseline or its
  // neighbours. A steadily bright, high-contrast text window therefore does NOT
  // light up forever — only when something there actually changes. (Contrast /
  // edge density still feed classification, and the explicit CONTRAST mode opts
  // into surfacing static high-contrast/text blocks regardless of change.)
  const energy = new Float32Array(CELL_COUNT);
  const mask = new Uint8Array(CELL_COUNT);
  let totalEnergy = 0;
  const threshold = 0.12 / Math.max(0.15, sensitivity); // higher sensitivity → lower bar

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const ci = gy * COLS + gx;
      const avgB = stats.brightness[ci];
      const jump = Math.max(0, avgB - baseline[ci]) / 255; // brightened vs steady state
      const drop = Math.max(0, baseline[ci] - avgB) / 255; // content vanished
      const localBright = (avgB - neighborBrightnessMean(gx, gy, stats)) / 255;
      const motion = stats.motion[ci];

      let e = 0;
      if (mode === 'auto' || mode === 'motion') e += Math.min(motion * 2.5, 1.0);
      if (mode === 'auto' || mode === 'notification') {
        e += Math.min(jump * 2.0, 0.8) + Math.min(drop * 1.5, 0.5);
        if (localBright > 0.12) e += Math.min(localBright, 0.5);
      }
      if (mode === 'auto' || mode === 'color') {
        const dist = neighborColorDistance(gx, gy, stats);
        if (dist > 55) e += Math.min((dist - 55) / 160, 0.5);
      }
      // Static high-contrast/text blocks: only surfaced when the user explicitly
      // picks CONTRAST mode, since these don't "change" and would otherwise pin a
      // permanent highlight over an editor/terminal.
      if (mode === 'contrast') {
        if (stats.contrast[ci] > 0.5 && stats.edges[ci] > 0.04) e += 0.5;
        if (stats.contrast[ci] > 0.7) e += 0.3;
      }

      energy[ci] = e;
      totalEnergy += e;
      if (e > threshold) mask[ci] = 1;
    }
  }

  // Advance the baseline AFTER scoring so each frame's jump is measured against
  // the prior steady state; 0.1 lets a lingering popup fade within a couple of s.
  for (let ci = 0; ci < CELL_COUNT; ci++) {
    baseline[ci] = baseline[ci] * 0.9 + stats.brightness[ci] * 0.1;
  }

  // ── Group the mask into connected components ────────────────────
  const components = connectedComponents(mask, energy, stats);

  // Keep the strongest components (by summed energy) — the rest are noise.
  components.sort((a, b) => b.energy - a.energy);
  if (components.length > MAX_REGIONS * 2) components.length = MAX_REGIONS * 2;

  const pulse = reconcileRegions(analysis, components, now, dt, sensitivity);
  pulse.energy = totalEnergy;

  analysis.gridCols = COLS;
  analysis.gridRows = ROWS;
  analysis.frameWidth = width;
  analysis.frameHeight = height;
  return pulse;
}

// First pass: reduce the frame to per-cell aggregates. Samples every 2nd pixel
// for speed. Edge detection is spatial (neighbouring pixel), so — unlike motion —
// it does not depend on a previous frame being available.
function computeCellStats(
  pixels: Uint8Array,
  width: number,
  cellW: number,
  cellH: number,
  prev: Uint8Array | null,
): CellStats {
  const stats: CellStats = {
    brightness: new Float32Array(CELL_COUNT),
    motion: new Float32Array(CELL_COUNT),
    contrast: new Float32Array(CELL_COUNT),
    edges: new Float32Array(CELL_COUNT),
    r: new Float32Array(CELL_COUNT),
    g: new Float32Array(CELL_COUNT),
    b: new Float32Array(CELL_COUNT),
  };

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const ci = gy * COLS + gx;
      const x0 = gx * cellW, y0 = gy * cellH;
      const x1 = x0 + cellW, y1 = y0 + cellH;

      let bSum = 0, mSum = 0, rSum = 0, gSum = 0, bbSum = 0;
      let minB = 255, maxB = 0, edges = 0, count = 0;

      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const idx = (y * width + x) * 4;
          if (idx + 2 >= pixels.length) continue;

          const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
          const lum = r * 0.299 + g * 0.587 + b * 0.114;

          bSum += lum; rSum += r; gSum += g; bbSum += b;
          if (lum < minB) minB = lum;
          if (lum > maxB) maxB = lum;

          if (prev && idx + 2 < prev.length) {
            mSum += (Math.abs(r - prev[idx]) + Math.abs(g - prev[idx + 1]) + Math.abs(b - prev[idx + 2])) / (3 * 255);
          }

          if (x + 2 < x1) {
            const nIdx = (y * width + (x + 2)) * 4;
            if (nIdx + 2 < pixels.length) {
              const d = Math.abs(r - pixels[nIdx]) + Math.abs(g - pixels[nIdx + 1]) + Math.abs(b - pixels[nIdx + 2]);
              if (d > 80) edges++;
            }
          }

          count++;
        }
      }

      if (count === 0) continue;
      stats.brightness[ci] = bSum / count;
      stats.motion[ci] = mSum / count;
      stats.contrast[ci] = (maxB - minB) / 255;
      stats.edges[ci] = edges / count;
      stats.r[ci] = rSum / count;
      stats.g[ci] = gSum / count;
      stats.b[ci] = bbSum / count;
    }
  }

  return stats;
}

// 4-connected flood fill over the change mask, reducing each blob to the
// aggregate signals the classifier reads. Uses an explicit stack (never
// recurses) so a full-screen change can't blow the call stack.
function connectedComponents(mask: Uint8Array, energy: Float32Array, stats: CellStats): Component[] {
  const seen = new Uint8Array(CELL_COUNT);
  const stack: number[] = [];
  const out: Component[] = [];

  for (let start = 0; start < CELL_COUNT; start++) {
    if (!mask[start] || seen[start]) continue;

    let minGx = COLS, maxGx = 0, minGy = ROWS, maxGy = 0;
    let cells = 0, e = 0, mSum = 0, mMax = 0, jSum = 0, edgeSum = 0, cSum = 0, colSum = 0;

    stack.length = 0;
    stack.push(start);
    seen[start] = 1;

    while (stack.length) {
      const ci = stack.pop()!;
      const gx = ci % COLS;
      const gy = (ci / COLS) | 0;

      if (gx < minGx) minGx = gx;
      if (gx > maxGx) maxGx = gx;
      if (gy < minGy) minGy = gy;
      if (gy > maxGy) maxGy = gy;

      cells++;
      e += energy[ci];
      const m = stats.motion[ci];
      mSum += m;
      if (m > mMax) mMax = m;
      jSum += Math.max(0, stats.brightness[ci] - baseline![ci]) / 255;
      edgeSum += stats.edges[ci];
      cSum += stats.contrast[ci];
      colSum += neighborColorDistance(gx, gy, stats);

      if (gx > 0 && mask[ci - 1] && !seen[ci - 1]) { seen[ci - 1] = 1; stack.push(ci - 1); }
      if (gx < COLS - 1 && mask[ci + 1] && !seen[ci + 1]) { seen[ci + 1] = 1; stack.push(ci + 1); }
      if (gy > 0 && mask[ci - COLS] && !seen[ci - COLS]) { seen[ci - COLS] = 1; stack.push(ci - COLS); }
      if (gy < ROWS - 1 && mask[ci + COLS] && !seen[ci + COLS]) { seen[ci + COLS] = 1; stack.push(ci + COLS); }
    }

    out.push({
      minGx, maxGx, minGy, maxGy, cells, energy: e,
      motionMean: mSum / cells,
      motionMax: mMax,
      brightJump: jSum / cells,
      edgeMean: edgeSum / cells,
      contrastMean: cSum / cells,
      colorDist: colSum / cells,
    });
  }

  return out;
}

// Mean brightness of a cell's 4-connected neighbours — tells a localized bright
// popup apart from a screen-wide brightness change.
function neighborBrightnessMean(gx: number, gy: number, stats: CellStats): number {
  let sum = 0, count = 0;
  const consider = (nx: number, ny: number): void => {
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
    sum += stats.brightness[ny * COLS + nx];
    count++;
  };
  consider(gx - 1, gy); consider(gx + 1, gy); consider(gx, gy - 1); consider(gx, gy + 1);
  return count > 0 ? sum / count : 0;
}

// Mean RGB distance from a cell to its 4-connected neighbours. Large distances
// mark a region standing out from its surroundings (a coloured badge/banner).
function neighborColorDistance(gx: number, gy: number, stats: CellStats): number {
  const ci = gy * COLS + gx;
  const r = stats.r[ci], g = stats.g[ci], b = stats.b[ci];
  let sum = 0, count = 0;
  const consider = (nx: number, ny: number): void => {
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
    const ni = ny * COLS + nx;
    sum += Math.sqrt((r - stats.r[ni]) ** 2 + (g - stats.g[ni]) ** 2 + (b - stats.b[ni]) ** 2);
    count++;
  };
  consider(gx - 1, gy); consider(gx + 1, gy); consider(gx, gy - 1); consider(gx, gy + 1);
  return count > 0 ? sum / count : 0;
}

// Match components to live regions by bounding-box overlap, smooth their boxes,
// evolve each region's lifecycle (which is what powers task-done detection),
// classify it, spawn regions for unmatched components and expire stale ones.
function reconcileRegions(
  analysis: AttentionAnalysis,
  components: Component[],
  now: number,
  dt: number,
  sensitivity: number,
): AttentionPulse {
  const pulse: AttentionPulse = { energy: 0, anyNew: false, anyChurning: false, anyComplete: false };
  const matched = new Set<number>();

  for (const c of components) {
    const nx = c.minGx / COLS;
    const ny = c.minGy / ROWS;
    const nw = (c.maxGx - c.minGx + 1) / COLS;
    const nh = (c.maxGy - c.minGy + 1) / ROWS;

    // Best-overlapping live region.
    let best: AttentionRegion | null = null;
    let bestIoU = 0;
    for (const r of analysis.regions) {
      if (r.dismissed || matched.has(r.id)) continue;
      const iou = boxIoU(nx, ny, nw, nh, r.x, r.y, r.w, r.h);
      if (iou > bestIoU) { bestIoU = iou; best = r; }
    }

    let region = bestIoU > 0.15 ? best : null;
    let track: TrackState;

    if (region) {
      // Ease the box toward the new detection so it follows moving elements
      // without jittering.
      region.x += (nx - region.x) * 0.5;
      region.y += (ny - region.y) * 0.5;
      region.w += (nw - region.w) * 0.5;
      region.h += (nh - region.h) * 0.5;
      region.lastSeen = now;
      track = tracks.get(region.id) ?? freshTrack();
    } else {
      region = {
        id: nextRegionId++,
        x: nx, y: ny, w: nw, h: nh,
        score: 0,
        type: 'motion',
        label: '',
        activity: 'new',
        peakMotion: 0,
        born: now,
        lastSeen: now,
        settledAt: 0,
        dismissed: false,
      };
      analysis.regions.push(region);
      track = freshTrack();
      pulse.anyNew = true;
    }
    matched.add(region.id);
    tracks.set(region.id, track);

    const areaFrac = (c.maxGx - c.minGx + 1) * (c.maxGy - c.minGy + 1) / CELL_COUNT;
    advanceLifecycle(region, track, c, areaFrac, now, dt, sensitivity, pulse);
  }

  // Advance regions that weren't detected this frame but are still alive. This is
  // what makes task-done work: a churning region leaves the change mask the
  // instant it stops moving, so it stops being "matched" — yet that's exactly the
  // moment we need to keep counting its quiet time to fire the completion pulse.
  for (const r of analysis.regions) {
    if (matched.has(r.id) || r.dismissed) continue;
    const track = tracks.get(r.id);
    if (!track) continue;
    advanceLifecycle(r, track, null, r.w * r.h, now, dt, sensitivity, pulse);
  }

  // Expire regions unseen for a while — but keep a just-completed region until
  // its hold window elapses so its done-pulse isn't cut off the instant it stops
  // moving (a completed region is, by definition, no longer changing).
  analysis.regions = analysis.regions.filter((r) => {
    if (matched.has(r.id)) return true;
    const track = tracks.get(r.id);
    if (track?.completed && now < track.holdUntil) return true;
    if (now - r.lastSeen < 1200) return true;
    tracks.delete(r.id);
    return false;
  });

  // Enforce the tracked cap by score (completed/video already floored high).
  if (analysis.regions.length > MAX_REGIONS) {
    analysis.regions.sort((a, b) => b.score - a.score);
    for (const r of analysis.regions.slice(MAX_REGIONS)) tracks.delete(r.id);
    analysis.regions.length = MAX_REGIONS;
  }

  return pulse;
}

// Advance one region's lifecycle by `dt` using this frame's motion (0 when the
// region wasn't detected this frame). Detects the churning→quiet "task done"
// transition, updates activity, (re)classifies + rescores when we have a fresh
// component, and gently decays regions that have gone missing. Shared by matched
// and unmatched-but-alive regions.
function advanceLifecycle(
  region: AttentionRegion,
  track: TrackState,
  c: Component | null,
  areaFrac: number,
  now: number,
  dt: number,
  sensitivity: number,
  pulse: AttentionPulse,
): void {
  track.ageMs += dt;
  const motion = c ? c.motionMean : 0;
  region.peakMotion = Math.max(region.peakMotion, motion);

  if (motion > 0.05) {
    track.churnMs += dt;
    track.quietMs = 0;
    if (track.churnMs > 1200) track.everChurned = true; // sustained work, not a blink
    if (areaFrac > 0.05) track.sustainedMotionMs += dt;
  } else if (motion < 0.02) {
    track.quietMs += dt;
  }

  // Churning region that has now gone quiet for long enough → task done. Fire
  // once; the caller holds the region alive briefly so the renderer can pulse.
  if (track.everChurned && !track.completed && track.quietMs > 700) {
    track.completed = true;
    region.settledAt = now;
    region.activity = 'settled';
    track.holdUntil = now + 3200;
    pulse.anyComplete = true;
  }

  if (track.completed) {
    region.type = 'complete';
    region.score = Math.max(region.score, 0.8);
  } else {
    region.activity = track.churnMs > 300 ? 'churning' : track.ageMs > 1200 ? 'steady' : 'new';
    if (region.activity === 'churning') pulse.anyChurning = true;
    if (c) {
      region.type = classify(c, region, track, areaFrac, now);
      // Energy density, boosted for the types that carry real signal, scaled by
      // sensitivity, smoothed so a highlight doesn't flicker on/off.
      let score = Math.min(1, c.energy / (c.cells + 3));
      if (region.type === 'notification' || region.type === 'alert') score = Math.min(1, score + 0.25);
      if (region.type === 'video') score = Math.max(score * 0.6, 0.35);
      region.score = region.score * 0.6 + score * sensitivity * 0.4;
    } else {
      region.score *= 0.9; // fade an undetected region out of the highlight budget
    }
  }
  region.label = labelFor(region.type);
}

function freshTrack(): TrackState {
  return { churnMs: 0, quietMs: 0, everChurned: false, completed: false, holdUntil: 0, ageMs: 0, sustainedMotionMs: 0 };
}

// Type from priors: position, size, motion persistence, contrast, edges. This is
// what turns "a bright cell" into "a notification", which is what the assist
// effects key off.
function classify(c: Component, region: AttentionRegion, track: TrackState, areaFrac: number, now: number): AttentionType {
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  const inCorner = (cx < 0.3 || cx > 0.7) && (cy < 0.28 || cy > 0.72);
  const aspect = (region.w * 16) / (region.h * 9); // screen-space aspect ratio

  // Large area + sustained motion over time → media playback.
  if (areaFrac > 0.06 && track.sustainedMotionMs > 1400 && c.motionMean > 0.04) return 'video';

  // Young, localized, brightened, text-bearing block in a corner → toast/popup.
  const ageMs = now - region.born;
  if (inCorner && areaFrac < 0.16 && c.brightJump > 0.06 && c.edgeMean > 0.02 && ageMs < 4000) {
    return 'notification';
  }

  // Big, central, very high contrast → dialog / modal.
  if (areaFrac > 0.1 && c.contrastMean > 0.55 && c.brightJump > 0.03 && aspect > 0.8) return 'alert';

  // Dense high-contrast, barely moving → text / UI.
  if (c.contrastMean > 0.5 && c.edgeMean > 0.05 && c.motionMean < 0.03) return 'text';

  return 'motion';
}

function labelFor(type: AttentionType): string {
  switch (type) {
    case 'notification': return 'NOTIFICATION';
    case 'alert': return 'ALERT';
    case 'video': return 'PLAYBACK';
    case 'text': return 'TEXT';
    case 'complete': return 'COMPLETE';
    default: return 'MOTION';
  }
}

// Intersection-over-union of two normalised boxes.
function boxIoU(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  const ix = Math.max(ax, bx);
  const iy = Math.max(ay, by);
  const ix2 = Math.min(ax + aw, bx + bw);
  const iy2 = Math.min(ay + ah, by + bh);
  const iw = ix2 - ix;
  const ih = iy2 - iy;
  if (iw <= 0 || ih <= 0) return 0;
  const inter = iw * ih;
  return inter / (aw * ah + bw * bh - inter);
}
