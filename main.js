const { app, BrowserWindow } = require('electron');
const path = require('path');
// require('electron-reloader')(module);

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 925,
        height: 560,
        minWidth: 925,
        minHeight: 560,
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