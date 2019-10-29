const { ipcMain } = require('electron');
const { app, BrowserWindow } = require('electron')
const path = require('path'); 
require('./routes');

import url from 'url';
require('./hid');

const isDev = require('electron-is-dev');

if (isDev) {
	console.log('Running in development');
} else {
	console.log('Running in production');
}

let win




function createWindow () {
  // Create the browser window.

  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true
    },
    icon: 'assets/solokeys-32x32.png',
  })

  // and load the index.html of the app.
  // win.loadFile('app/index.html')
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  if (isDev)
    win.webContents.openDevTools()

  let rightClickPosition = null

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  // win.addEventListener('contextmenu', (e) => {
  //   e.preventDefault()
  //   rightClickPosition = {x: e.x, y: e.y}
  //   menu.popup(remote.getCurrentWindow())
  // }, false)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

