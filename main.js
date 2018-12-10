const { app, BrowserWindow } = require('electron')

let win

function createWindow () {
  win = new BrowserWindow({
  	width: 900, 
  	height: 600,
      webPreferences: {
        zoomFactor: 0.8,
        nodeIntegration: false
      }
  })

  // This will remove the menu bar completely
  win.setMenu(null)

  win.loadFile('index.html')

  win.on('closed', () => {
    win = null
  })
}
app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})