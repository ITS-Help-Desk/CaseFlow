// Configuration file for API endpoints and WebSocket connections

// Detect if running inside Electron or in a regular browser
const isElectron = typeof window !== 'undefined' && typeof window.process !== 'undefined';

// In Electron, use the direct Pi address. In a browser, use relative URLs
// (Nginx proxies /api/ and /ws/ to Django automatically)
const PI_ADDRESS = 'http://10.80.16.166:8000';
export const API_BASE_URL = isElectron ? PI_ADDRESS : '';

// WebSocket Configuration
export function getWebSocketURL(path = '/ws/caseflow/') {
    if (isElectron) {
        const host = PI_ADDRESS.replace(/^https?:\/\//, '');
        return `ws://${host}${path}`;
    }
    // Browser mode: derive from current page location
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${path}`;
}
