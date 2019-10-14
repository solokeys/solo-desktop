var hid = require('./hid')
var Util = require('../Util')
const CBOR= require('cbor-sync');
const CTAPHID = require('../constants').HID;
const CTAP2 = require('../constants').CTAP2;
const CTAP1 = require('../constants').CTAP1;
const ERROR = require('../constants').ERROR;
var DEBUG = 1;



class CtapClient {
    constructor(transport){
        this.transport = transport;
    }

    async getInfo(){
        var res = await this.sendRecv(CTAPHID.CBOR, [CTAP2.GET_INFO]);
        res = new CtapResponse(res);
        if (res.error)
            throw new CtapError(res.error);
        return res.response;
    }

    async makeCredential(rpId, cdh, user, opts){

    }

    async getAssertion(rpId, cdh, opts){

    }

    async sendRecv(cmd, data){
        if (DEBUG) console.log('<<', cmd.toString(16), Util.obj2hex(data))
        var res = await this.transport.sendRecv(cmd, data);
        if (DEBUG) console.log('>>', Util.obj2hex(res))
        return res;
    }
}

/** CtapResponse
 *  parse a binary payload for Ctap response.
 *  @param {Uint8Array} bytes the payload
*/
class CtapResponse {
    constructor(bytes){
        this.buffer = bytes;
        this.error = bytes[0];
        this.cbor = bytes.slice(1,bytes.length);
        if (this.cbor.length){
            this.dict = CBOR.decode(this.cbor, 'hex');
        } else {
            this.dict = {};
        }
    }

    get response () {
        return this.dict;
    }
}

if (require.main === module) {
    async function test(){
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);

        var info = await client.getInfo();
        console.log('info:', (info));
    }
    test();
}

class CtapError {
    constructor (errCode) {
        this.code = errCode;
    }

    toString() {
        var keys = Object.keys(ERROR);
        for (var i = 0; i < keys.length; i++) {
            if ( ERROR[i] == this.code ) {
                return i + ': 0x' + this.code.toString(16);
            }
        }
        return 'Unknown error ' + this.code.toString(16);
    }
}