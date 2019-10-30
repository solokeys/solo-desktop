var Util = require('./util')
var HID = require('./hid')
var CtapClient = require('./ctap').Client;
var CtapError = require('./ctap').CtapError;

const CTAPHID = require('./constants').HID;
const BOOT = require('./constants').BOOT;
const MemoryMap = require('nrf-intel-hex');
const CTAP2 = require('./constants').CTAP2;
const CTAP1 = require('./constants').CTAP1;
const ERROR = require('./constants').ERROR;

var DEBUG = 0;

function sleep (ms) {
    return new Promise((resolve, reject) => {
        setTimeout(()=>{
            resolve();
        },ms);
    });
}

/** BootReq.  Return a bytearray to send to bootloader mode.
 *
typedef struct {
    uint8_t op;
    uint8_t addr[3];
    uint8_t tag[4];
    uint8_t lenh;
    uint8_t lenl;
    uint8_t payload[255 - 10];
} __attribute__((packed)) BootloaderReq;

 * @param {Byte} cmd 
 * @param {U32} addr 
 * @param {Uint8Array} data 
 */
function BootReq(cmd, addr, data){
    addr = addr || 0;
    data = data || [];
    var req = new Uint8Array(10 + data.length);

    req[0] = cmd;
    // LE
    req[1] = addr & 0xff;
    req[2] = (addr>>8) & 0xff;
    req[3] = (addr>>16) & 0xff;

    // deprecated "tag"
    req[4] = 0;
    req[5] = 0;
    req[6] = 0;
    req[7] = 0;

    // BE
    req[8] = (data.length >> 8) & 0xff;
    req[9] = (data.length >> 0) & 0xff;

    for (var i = 0; i < data.length; i++){
        req[10 + i] = data[i];
    }
    // if (req.length > 255) throw 'Max size for boot packet is 255'
    return req;
}

class Programmer extends CtapClient {
    constructor(transport) {
        super(transport);
        this.transport = transport;
    }

    async reconnectUntil(event){
        while (1) {
            await sleep(100);
            try {

                this.transport = HID.reopen(this.transport);
                if (await event(this)){
                    break;
                }

            } catch (e) {
                console.log('not yet in bootloader,',);
            }
        }
    }

    async toBootloader(){
        var res;
        try{
            res = await this.sendRecv(CTAPHID.SOLO_BOOT, BootReq(BOOT.VERSION));
            console.log('Already in bootloader mode.');
            return;
        } catch (e) {

        }
        try {
            res = await this.sendRecv(CTAPHID.SOLO_ENTERBOOT);
        } catch (e) {
            if (typeof e == 'number')
                throw new CtapError(e);
            throw e;
        }
        await this.reconnectUntil(async () => {
            var res = await this.sendRecv(CTAPHID.SOLO_BOOT, BootReq(BOOT.VERSION));
            console.log('check version: ', res);
            return true;
        });
        console.log('res tobootloader', res);
    }

    async reboot(){
        await sleep(1000);
        this.transport = HID.reopen(this.transport);
        var res = await this.sendRecv(CTAPHID.SOLO_BOOT,BootReq(BOOT.REBOOT));
        console.log('res reboot', res);
    }

    async writeBlock(addr, data){
        // console.log('<<',addr.toString(16), Util.bin2hex(data));
        var res = await this.sendRecv(CTAPHID.SOLO_BOOT, BootReq(BOOT.WRITE, addr, data));
        if (res[0] != 0){
            throw new CtapError(res[0]);
        }
        if (this.writeEvent){
            this.writeEvent(data.length);
        }
    }

    on(event, func){
        if (event == 'write'){
            this.writeEvent = func;
        }
    }

    /** Write data to flash on bootloader device.
     * 
     * @param {U32} addr 
     * @param {Uint8Array} data 
     */
    async write(addr, data){
        var offset = addr;
        var chunkSize = 1024;
        for (var i = 0; i < data.length; i+=chunkSize){
            await this.writeBlock(offset, data.slice(i,chunkSize+i));
            offset += chunkSize;
        }
    }

    /** Check signature of new application and boot it.
     * @param {Uint8Array} signature optional
    */
    async verifyAndReboot(signature){
        var res = await this.sendRecv(CTAPHID.SOLO_BOOT, BootReq(BOOT.DONE, 0, signature));
        if (res[0] == 3){
            throw 'Boot requires signature or it was denied.'
        }
        if (res[0] != 0){
            throw new CtapError(res[0]);
        }
        console.log(res);
    }

    /** Check version of bootloader
     * @param {Uint8Array} signature optional
     * @return {Array} 3 byte version and 1 byte lock indicator
    */
    async getVersion(signature){
        var res;
        try{
            res = await this.sendRecv(CTAPHID.SOLO_GETVERSION, []);
        } catch (e) {
            if (e == ERROR.CTAP1_ERR_INVALID_COMMAND)
                return [0,0,0,0];
            throw new CtapError(e);
        }
        return res.slice(0,4)
    }
}

async function runTests(){
    const fs = require('fs');

    var dev = HID.open(HID.devices()[0]);
    var p = new Programmer(dev);
    console.log('to bootloader');
    try{
        await p.toBootloader();
    } catch (e) {
        if (typeof e == 'number'){
        }
    }

    console.log('load hex file');
    var hexFile = Util.bin2str(fs.readFileSync(process.argv[2]));
    let memMap = MemoryMap.fromHex(hexFile);
    // console.log(memMap);

    console.log('updating...');
    for (const [addr, data] of (memMap._blocks.entries())) {
        await p.write(addr, data);
    }
    await p.verifyAndReboot();

    // console.log('reboot');
    // await p.reboot();

}

if (require.main === module) {
    runTests();
}


module.exports = {
    Programmer: Programmer,
    sleep: sleep,
};

