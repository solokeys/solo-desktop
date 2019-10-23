/**
Provide an easy way to communicate between
renderer and main process

Usage:

var res = await Comm.sendRecv('msg', 'ping');
console.log(res);
// pong

*/

const { ipcRenderer } = require('electron');

module.exports = {
    sendRecv: function (cmd, data) {
        return new Promise((resolve, reject) => {
            ipcRenderer.once(cmd, (event, arg) => {
                console.log('>> ', arg);
                resolve(arg);
            });
            ipcRenderer.send(cmd, data);
        });
    }
}