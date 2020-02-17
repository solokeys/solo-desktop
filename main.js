// Copyright 2019 SoloKeys Developers
//
// Licensed under MIT license <LICENSE-MIT or
// http://opensource.org/licenses/MIT>. This file may not be copied, modified,
// or distributed except according to those terms.

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
    show: false,
  });

  win.once('ready-to-show', () => {
    win.show()


  });
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

