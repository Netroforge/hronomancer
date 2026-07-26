import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import type {
  CyberAPI,
  DisplayInfoMessage,
  InputClickData,
  InputKeyData,
  InputMouseData,
  OverlayState,
  SetConfigPayload,
} from './types';

const CONTROLLER = 'controller';

function subscribe<T>(event: string, callback: (payload: T) => void): void {
  void listen<T>(event, ({ payload }) => callback(payload));
}

export function installTauriBridge(): CyberAPI {
  const api: CyberAPI = {
    onStateUpdate: (callback: (state: OverlayState) => void) =>
      subscribe('state-update', callback),
    onMouseInput: (callback: (data: InputMouseData) => void) =>
      subscribe('input-mouse', callback),
    onKeyInput: (callback: (data: InputKeyData) => void) =>
      subscribe('input-key', callback),
    onClickInput: (callback: (data: InputClickData) => void) =>
      subscribe('input-click', callback),
    onDisplayInfo: (callback: (data: DisplayInfoMessage) => void) =>
      subscribe('display-info', callback),
    getState: () => {
      void invoke('request_state');
    },
    setConfig: (config: SetConfigPayload) => {
      void emitTo(CONTROLLER, 'set-config', config);
    },
    selectDisplay: (displayId: number) => {
      void emitTo(CONTROLLER, 'select-display', displayId);
    },
    closeWindow: () => {
      void invoke('close_config_window');
    },
    windowMove: (offsetX: number, offsetY: number) => {
      void invoke('move_config_window', { offsetX, offsetY });
    },
    startPomodoro: () => {
      void emitTo(CONTROLLER, 'start-pomodoro');
    },
    setPomodoroWork: (minutes: number) => {
      void emitTo(CONTROLLER, 'set-pomodoro-work', minutes);
    },
    setPomodoroBreak: (minutes: number) => {
      void emitTo(CONTROLLER, 'set-pomodoro-break', minutes);
    },
    openExternal: (url: string) => {
      void invoke('open_external', { url });
    },
  };

  window.cyberAPI = api;
  return api;
}
