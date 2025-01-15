const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Create the browser window
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false,
            sandbox: false
        }
    });

    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Create window when app is ready
app.whenReady().then(() => {
    createWindow();
    
    // On macOS, create a new window when clicking the dock icon if no windows are open
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
