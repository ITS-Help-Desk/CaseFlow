const { contextBridge, ipcRenderer } = require('electron');

// Suppress IPC error logging
const originalConsoleError = console.error;
console.error = (...args) => {
    if (!args[0]?.includes?.('Error occurred in handler for')) {
        originalConsoleError(...args);
    }
};

contextBridge.exposeInMainWorld('electron', {
    getDatabaseStatus: () => ipcRenderer.invoke('get-database-status'),
    onDatabaseStatus: (callback) => {
        ipcRenderer.on('database-status', (event, ...args) => callback(...args));
    },
    invoke: (channel, data) => {
        const validChannels = [
            'add-case',
            'get-active-cases',
            'complete-case',
            'unclaim-case'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data)
                .catch(error => {
                    throw typeof error === 'string' ? JSON.parse(error) : error;
                });
        }
    }
}); 