/**
 * Error Handler Utility
 * Provides centralized error handling, logging, and user notification
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.setupGlobalHandlers();
    }

    /**
     * Set up global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, 'Uncaught Error', event);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason, 'Unhandled Promise Rejection', event);
        });
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error, context, event) {
        console.error(`[${context}]`, error);
        
        this.logError({
            type: context,
            error: error,
            message: error?.message || String(error),
            stack: error?.stack,
            timestamp: new Date(),
            url: window.location.href
        });

        // Prevent default error handling for known errors
        if (event) {
            event.preventDefault();
        }
    }

    /**
     * Log error to internal log
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }

    /**
     * Wrap a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Error handling options
     * @returns {Function} - Wrapped function
     */
    wrapFunction(fn, options = {}) {
        const {
            context = 'Unknown',
            fallback = null,
            showNotification = false,
            onError = null
        } = options;

        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                console.error(`[Error in ${context}]`, error);
                
                this.logError({
                    type: 'Function Error',
                    context: context,
                    error: error,
                    message: error?.message || String(error),
                    stack: error?.stack,
                    timestamp: new Date()
                });

                if (showNotification) {
                    this.showUserNotification(error, context);
                }

                if (onError) {
                    onError(error);
                }

                return fallback;
            }
        };
    }

    /**
     * Wrap component initialization with error handling
     * @param {Class} ComponentClass - Component class to wrap
     * @param {string} componentName - Name of the component
     * @returns {Object|null} - Component instance or null
     */
    initializeComponent(ComponentClass, componentName) {
        try {
            console.log(`Initializing ${componentName}...`);
            const instance = new ComponentClass();
            console.log(`✓ ${componentName} initialized successfully`);
            return instance;
        } catch (error) {
            console.error(`✗ Failed to initialize ${componentName}:`, error);
            
            this.logError({
                type: 'Component Initialization Error',
                component: componentName,
                error: error,
                message: error?.message || String(error),
                stack: error?.stack,
                timestamp: new Date()
            });

            this.showUserNotification(error, componentName);
            return null;
        }
    }

    /**
     * Show user-friendly error notification
     */
    showUserNotification(error, context = '') {
        const message = this.getUserFriendlyMessage(error, context);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-notification-content">
                <svg class="error-icon" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div class="error-message">${message}</div>
                <button class="error-dismiss">×</button>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Setup dismiss button
        const dismissBtn = notification.querySelector('.error-dismiss');
        dismissBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error, context) {
        // Check for specific error types
        if (error?.message?.includes('Failed to fetch')) {
            return `Cannot connect to server${context ? ` while ${context}` : ''}. Please check your connection.`;
        }
        
        if (error?.message?.includes('NetworkError')) {
            return 'Network error occurred. Please check your internet connection.';
        }

        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
            return 'Your session has expired. Please log in again.';
        }

        if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
            return 'You do not have permission to perform this action.';
        }

        if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
            return 'The requested resource was not found.';
        }

        if (error?.message?.includes('500') || error?.message?.includes('Internal Server Error')) {
            return 'Server error occurred. Please try again later.';
        }

        // Generic message with context
        if (context) {
            return `An error occurred in ${context}. Please try again.`;
        }

        return error?.message || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Get error log
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * Export error log as JSON
     */
    exportErrorLog() {
        const logData = {
            timestamp: new Date().toISOString(),
            errors: this.errorLog,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-log-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler;

