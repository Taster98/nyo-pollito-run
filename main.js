const { app, BrowserWindow } = require('electron')

const createWindow = () => {
    const win = new BrowserWindow({
        show: false,
        icon: 'build/icons/icon.png'

    })
    win.maximize()
    win.loadFile('index.html')
    win.show()
}


app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
