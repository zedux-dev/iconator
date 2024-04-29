const { app, BrowserWindow } = require('electron');
const path = require('path');
// require('electron-reloader')(module);

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 600,
        height: 700,
        minWidth: 600,
        minHeight: 700,
        // maxWidth: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('./index.html');
    
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if(BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
});