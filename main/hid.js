const { ipcMain } = require('electron');
var HID = require('node-hid');
const usb = require('usb');
const Util = require('../util');
var devices = HID.devices();

var DEBUG = 1;

/** toWindowsPkt
 *  @desc Windows has a bug where you need to prepend zero to packets.
 *  @param {Uint8Array} pkt
 *  @return {Uint8Array} The same array prepended with a 0.
*/
function toWindowsPkt(pkt){
    var win = new Uint8Array(pkt.length + 1);
    win.set(pkt, 1);
    win[0] = 0;
    return win;
}

/** HidRequest
 *  Create packets to send to FIDO HID device.
*/
class HidRequest {
    constructor (cmd, payload) {
        this.cmd = cmd;
        this.data = payload;
    }

    /** toInit
     *  @param {Integer} cid Optional CID
     *  @return {Uint8Array} 64 byte init HID packet.
    */
    toInit(cid) {
        cid = cid || 0x11223344;
        var pkt = new Uint8Array(64);
        pkt[0] = (cid & 0xff000000) >> 24;
        pkt[1] = (cid & 0x00ff0000) >> 16;
        pkt[2] = (cid & 0x0000ff00) >> 8;
        pkt[3] = (cid & 0x000000ff) >> 0;
        pkt[4] = this.cmd | 0x80;
        pkt[5] = (this.data.length & 0xff00) >> 8;
        pkt[6] = (this.data.length & 0x00ff) >> 0;

        // Send (64-7) bytes of payload.
        for (var i = 7; i < pkt.length; i++)
        {
            if (i - 7 >= this.data.length)
            {
                break;
            }
            pkt[i] = this.data[i-7];
        }
        return pkt;
    }

    /** toPackets
     *  @param {Integer} cid Optional CID
     *  @return {Array[Uint8Array]} Array of 64 byte packets to write to FIDO device.
    */
    toPackets(cid) {
        var init = this.toInit(cid);
        var arr = [init];
        // Offset starting at 64-7 for rest of data.
        var offset = 64 - 7;
        var seq = 0;
        while (offset < this.data.length)
        {
            var pkt = init.slice(0);
            pkt[5] = seq++;
            for (var i = 5; i < 64; i++){
                if (offset + i >= this.data.length)
                {
                    break;
                }
                pkt[i] = this.data[offset + i];
            }
            offset += (64 - 5);
            arr.push(pkt);
        }
        return arr;
    }
}

// Return list of HID devices matching usagePage and usage.
function getHIDDevicesByUsage(usagePage, usage){
    var devices = HID.devices();
    return devices.filter((d) => (d.usagePage == usagePage && d.usage == usage));
}

/** sendRecv
 * @desc Send a HID packet and return response.  Async/await compatible.
 * @param {Uint8Array} data
 * @return {Promise} Resolves to response data.  Rejects if error.
*/
HID.HID.prototype.sendRecv = function sendRecv(data) {
    return new Promise((resolve, reject) => {
        if (DEBUG) console.log('<<', Util.obj2hex(data))
        var r = this.write(Array.from(data));
        this.read((err, data) => {
            if (err) reject(err)
            else {
                if (DEBUG) console.log('>>', Util.obj2hex(data))
                resolve(data);
            }
        });
    });
}

if (require.main === module) {
    async function testHid(){

        var usb_devices = usb.getDeviceList();
        var devs = getHIDDevicesByUsage(0xf1d0, 1);

        if (devs.length == 0) {
            throw 'No devices found'
        }

        var dev = new HID.HID(devs[0].path);
        dev.on('error', function(error) {
            console.log('ERROR: ', error);
        } );

        console.log("waiting for read");
        var req = new HidRequest(0x61, [0,0,0,0]);
        var pkt = toWindowsPkt(req.toInit());

        console.log(Util.bin2hex(pkt), pkt.length);

        var res = await dev.sendRecv(pkt);
        console.log('Solo version is ', );

        process.exit()
    }
    testHid();
}


module.exports = {
    devices: function(){
        return getHIDDevicesByUsage(0xf1d0, 1);
    },
    open: function(device){
        return new HID.HID(device.path);
    }
};



// ipcMain.on('msg', (event, arg) => {
//   console.log(arg) // prints "ping"
//   event.reply('msg', 'pong')
// });
