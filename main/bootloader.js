var Util = require('../Util')
var HID = require('./hid')
var CtapClient = require('./ctap').Client;

const CTAPHID = require('../constants').HID;
const CTAP2 = require('../constants').CTAP2;
const CTAP1 = require('../constants').CTAP1;
const ERROR = require('../constants').ERROR;

var DEBUG = 0;

class Programmer extends CtapClient {
    constructor(transport) {
        super(transport)
        this.transport = transport;
        console.log(this.transport);
    }
    async toBootloader(){
        var res = await this.sendRecv(CTAPHID.SOLO_ENTERBOOT);
        console.log('res', res);
    }

    async reboot(){
        var res = await this.sendRecv(CTAPHID.SOLO_BOOT, [0] * 32);
        console.log('res', res);
    }
}

if (require.main === module) {
    var dev = HID.open(HID.devices()[0]);
    console.log('dev', dev);
    var p = new Programmer(dev);
    p.toBootloader();
    p.reboot();
}




