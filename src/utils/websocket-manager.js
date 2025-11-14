/**
 * WebSocket Manager Utility
 * Provides centralized WebSocket connection management with authentication
 */

import { getWebSocketURL } from '../../config.js';

class WebSocketManager {
    constructor() {
        this.connections = new Map(); // Store connections by channel name
        this.reconnectAttempts = new Map(); // Track reconnection attempts
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
    }

    /**
     * Create or get an existing WebSocket connection
     * @param {string} channel - Channel name (e.g., 'caseflow')
     * @param {Object} options - Connection options
     * @returns {WebSocket} - WebSocket instance
     */
    connect(channel, options = {}) {
        const {
            path = `/ws/${channel}/`,
            onOpen = null,
            onMessage = null,
            onClose = null,
            onError = null,
            authenticate = true,
            reconnect = true
        } = options;

        // Check if connection already exists
        if (this.connections.has(channel)) {
            const existing = this.connections.get(channel);
            if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
                console.log(`WebSocket connection to ${channel} already exists`);
                return existing;
            }
        }

        // Create new WebSocket connection
        const wsURL = getWebSocketURL(path);
        console.log(`Connecting to WebSocket: ${wsURL}`);
        
        const ws = new WebSocket(wsURL);
        this.connections.set(channel, ws);

        // Handle connection open
        ws.onopen = (event) => {
            console.log(`✓ WebSocket connected to ${channel}`);
            this.reconnectAttempts.set(channel, 0); // Reset reconnect attempts
            
            // Send authentication message if enabled
            if (authenticate) {
                this.authenticate(ws, channel);
            }
            
            if (onOpen) {
                onOpen(event);
            }
        };

        // Handle incoming messages
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle authentication response
                if (data.type === 'auth') {
                    this.handleAuthResponse(data, channel);
                }
                
                if (onMessage) {
                    onMessage(event, data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        // Handle connection close
        ws.onclose = (event) => {
            console.log(`WebSocket disconnected from ${channel}:`, event.code, event.reason);
            this.connections.delete(channel);
            
            if (onClose) {
                onClose(event);
            }
            
            // Attempt to reconnect if enabled
            if (reconnect && !event.wasClean) {
                this.attemptReconnect(channel, options);
            }
        };

        // Handle errors
        ws.onerror = (error) => {
            console.error(`WebSocket error on ${channel}:`, error);
            
            if (onError) {
                onError(error);
            }
        };

        return ws;
    }

    /**
     * Authenticate WebSocket connection
     */
    authenticate(ws, channel) {
        const token = localStorage.getItem('authToken');
        const username = localStorage.getItem('username');
        
        if (!token) {
            console.warn('No auth token available for WebSocket authentication');
            return;
        }

        // Send authentication message
        const authMessage = {
            type: 'auth',
            token: token,
            username: username
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(authMessage));
            console.log(`Sent authentication for ${channel}`);
        } else {
            // Wait for connection to open
            ws.addEventListener('open', () => {
                ws.send(JSON.stringify(authMessage));
                console.log(`Sent authentication for ${channel}`);
            }, { once: true });
        }
    }

    /**
     * Handle authentication response
     */
    handleAuthResponse(data, channel) {
        if (data.status === 'success') {
            console.log(`✓ WebSocket ${channel} authenticated successfully`);
        } else {
            console.error(`✗ WebSocket ${channel} authentication failed:`, data.message);
            
            // Close connection if auth fails
            const ws = this.connections.get(channel);
            if (ws) {
                ws.close(4000, 'Authentication failed');
            }
        }
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    attemptReconnect(channel, options) {
        const attempts = this.reconnectAttempts.get(channel) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts reached for ${channel}`);
            return;
        }

        this.reconnectAttempts.set(channel, attempts + 1);
        console.log(`Attempting to reconnect to ${channel} (attempt ${attempts + 1}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect(channel, options);
        }, this.reconnectDelay);
    }

    /**
     * Send message through WebSocket
     * @param {string} channel - Channel name
     * @param {Object} data - Data to send
     * @returns {boolean} - Success status
     */
    send(channel, data) {
        const ws = this.connections.get(channel);
        
        if (!ws) {
            console.error(`No WebSocket connection found for ${channel}`);
            return false;
        }
        
        if (ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket ${channel} is not open (state: ${ws.readyState})`);
            return false;
        }
        
        try {
            ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error sending message to ${channel}:`, error);
            return false;
        }
    }

    /**
     * Close WebSocket connection
     * @param {string} channel - Channel name
     */
    disconnect(channel) {
        const ws = this.connections.get(channel);
        
        if (ws) {
            console.log(`Closing WebSocket connection to ${channel}`);
            ws.close(1000, 'Client disconnect');
            this.connections.delete(channel);
            this.reconnectAttempts.delete(channel);
        }
    }

    /**
     * Close all WebSocket connections
     */
    disconnectAll() {
        console.log('Closing all WebSocket connections');
        
        for (const [channel, ws] of this.connections.entries()) {
            ws.close(1000, 'Client disconnect all');
        }
        
        this.connections.clear();
        this.reconnectAttempts.clear();
    }

    /**
     * Get WebSocket connection by channel
     * @param {string} channel - Channel name
     * @returns {WebSocket|null} - WebSocket instance or null
     */
    getConnection(channel) {
        return this.connections.get(channel) || null;
    }

    /**
     * Check if connected to a channel
     * @param {string} channel - Channel name
     * @returns {boolean} - Connection status
     */
    isConnected(channel) {
        const ws = this.connections.get(channel);
        return ws && ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get all active connections
     * @returns {Array} - Array of [channel, websocket] pairs
     */
    getActiveConnections() {
        return Array.from(this.connections.entries())
            .filter(([_, ws]) => ws.readyState === WebSocket.OPEN);
    }
}

// Create and export singleton instance
const websocketManager = new WebSocketManager();
export default websocketManager;

