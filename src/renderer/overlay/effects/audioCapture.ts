import type { AudioAnalysis } from '../../shared/types';

// Must match the bar count the audio visualizer renders.
const BAR_COUNT = 32;

function avgRange(data: Uint8Array<ArrayBuffer>, from: number, to: number): number {
  const lo = Math.max(0, from);
  const hi = Math.min(data.length, to);
  if (hi <= lo) return 0;
  let sum = 0;
  for (let i = lo; i < hi; i++) sum += data[i];
  return sum / (hi - lo);
}

/**
 * Captures the default microphone via getUserMedia and exposes a live
 * {@link AudioAnalysis} derived from an FFT. Everything stays in the renderer;
 * `update()` is meant to be called once per rendered frame.
 *
 * The `audio` object instance is stable — its fields are mutated in place — so
 * callers can hold the reference and read updated values each frame.
 */
export class AudioCapture {
  readonly audio: AudioAnalysis = { bass: 0, mid: 0, treble: 0, volume: 0, waveform: new Array(BAR_COUNT).fill(0) };

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[Hronomancer] getUserMedia unavailable — audio visualizer disabled');
      this.started = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Raw signal makes for a livelier visualizer than the processed voice path.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      // If audio was disabled after we requested the mic but before it resolved,
      // release the stream immediately instead of holding it open.
      if (!this.started) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.ctx = new AudioContext();
      // The overlay is click-through and never receives a user gesture, so the
      // context can start suspended under the autoplay policy — resume it.
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256; // → 128 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      console.log('[Hronomancer] Audio capture started');
    } catch (err) {
      // No mic / permission denied / no device — leave audio at zero so the
      // visualizer simply stays hidden.
      this.started = false;
      console.warn('[Hronomancer] Audio capture unavailable:', err);
    }
  }

  update(): void {
    const analyser = this.analyser;
    const data = this.freqData;
    if (!analyser || !data) return;

    analyser.getByteFrequencyData(data);
    const bins = data.length;
    const a = this.audio;
    const perBar = Math.max(1, Math.floor(bins / BAR_COUNT));

    let volumeSum = 0;
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < perBar; j++) sum += data[i * perBar + j];
      const v = sum / perBar / 255;
      a.waveform[i] = v;
      volumeSum += v;
    }

    a.volume = volumeSum / BAR_COUNT;
    a.bass = avgRange(data, 0, Math.floor(bins * 0.08)) / 255;
    a.mid = avgRange(data, Math.floor(bins * 0.08), Math.floor(bins * 0.35)) / 255;
    a.treble = avgRange(data, Math.floor(bins * 0.35), bins) / 255;
  }

  stop(): void {
    this.analyser?.disconnect();
    this.ctx?.close().catch(() => {});
    // Stop the underlying mic tracks so the OS "in use" indicator clears and
    // the microphone is genuinely released — closing the AudioContext alone
    // leaves the capture stream live.
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser = null;
    this.ctx = null;
    this.freqData = null;
    this.stream = null;
    this.started = false;

    // Zero the analysis so a stale waveform doesn't keep the visualizer drawing.
    const a = this.audio;
    a.bass = a.mid = a.treble = a.volume = 0;
    a.waveform.fill(0);
  }
}
