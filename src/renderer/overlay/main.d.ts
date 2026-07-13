import type { CyberAPI } from '../shared/types';
declare global {
    interface Window {
        cyberAPI: CyberAPI;
    }
}
