// Configuration file for API endpoints and WebSocket connections
// This file can be easily modified to change the API URL across the application

// API Configuration
export const API_BASE_URL = 'http://10.80.16.166:8000';

// WebSocket Configuration
// Extract host from API_BASE_URL or set explicitly
const API_HOST = API_BASE_URL.replace(/^https?:\/\//, ''); // Remove protocol
export const WS_HOST = API_HOST; // Use same host as API

// Helper function to get WebSocket URL with correct protocol
export function getWebSocketURL(path = '/ws/caseflow/') {
    // Use wss:// for HTTPS, ws:// for HTTP
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
    return `${wsProtocol}//${WS_HOST}${path}`;
}
