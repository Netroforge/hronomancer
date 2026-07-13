import { contextBridge, ipcRenderer } from 'electron';
import type { InputMouseData, InputKeyData, InputClickData, DisplayInfoMessage, CyberAPI, SetConfigPayload, OverlayState } from '../../src/renderer/shared/types';

export type { CyberAPI };

contextBridge.exposeInMainWorld('cyberAPI', {
  onStateUpdate: (cb: (state: OverlayState) => void) => {
    ipcRenderer.on('state-update', (_, s) => cb(s));
  },
  onMouseInput: (cb: (data: InputMouseData) => void) => {
    ipcRenderer.on('input-mouse', (_, d) => cb(d));
  },
  onKeyInput: (cb: (data: InputKeyData) => void) => {
    ipcRenderer.on('input-key', (_, d) => cb(d));
  },
  onClickInput: (cb: (data: InputClickData) => void) => {
    ipcRenderer.on('input-click', (_, d) => cb(d));
  },
  onDisplayInfo: (cb: (data: DisplayInfoMessage) => void) => {
    ipcRenderer.on('display-info', (_, d) => cb(d));
  },
  getState: () => ipcRenderer.send('get-state'),
  setConfig: (config: SetConfigPayload) => ipcRenderer.send('set-config', config),
  selectDisplay: (displayId: number) => ipcRenderer.send('select-display', displayId),
  closeWindow: () => ipcRenderer.send('close-window'),
  windowMove: (offsetX: number, offsetY: number) => ipcRenderer.send('window-move', offsetX, offsetY),
  startPomodoro: () => ipcRenderer.send('start-pomodoro'),
  setPomodoroWork: (minutes: number) => ipcRenderer.send('set-pomodoro-work', minutes),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
} satisfies CyberAPI);
