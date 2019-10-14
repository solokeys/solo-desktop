var hid = require('./hid')
var Util = require('../Util')
const CBOR= require('cbor-sync');
const CBOR2 = require('cbor');
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
        return res.response;
    }

    /** makeCredential
     * Send make credential to authenticator
     * @param {String} rpId name of RP, e.g. 'solokeys.com',
     * @param {Buffer} cdh 32 byte buffer to be signed.
     * @param {Object} user E.g. {id: Uint8Array(...), icon: "...", name: "...", displayName: "..."}
     * @param {Object} opts credId, pinAuth, extensions
    */
    async makeCredential(rpId, cdh, user, opts){
        console.log('id',user.id);
        var req = new Map();

        req.set(1, cdh);
        req.set(2, {id: rpId, name: rpId});
        req.set(3, user);
        req.set(4, [{type:'public-key', alg:-7}]);
        
        var cbor = CBOR2.encode(req);

        console.log(cbor)
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.MAKE_CREDENTIAL], cbor));

        res = new CtapResponse(res);

        // console.log(cbor)
        return res.response;
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
        if (this.error != 0) {
            throw new CtapError(this.error);
        }

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

class CtapError extends Error{
    constructor (...args) {
        var s = 'Unknown error: ' + args[0];
        var code = args[0];
        var keys = Object.keys(ERROR);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if ( ERROR[k] == code ) {
                s = k + ' (0x' + code.toString(16) + ')';
            }
        }

        super(s)

    }

    toString() {

        return 'Unknown error ' + this.code.toString(16);
    }
}

if (require.main === module) {
    async function test(){
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);

        var info = await client.getInfo();
        console.log('info:', (info));

        var cdh = Util.sha256bin('123');
        var rp = 'solokeys.com';


        var mc = await client.makeCredential(rp, cdh, {
            name: 'solokey',
            displayName: 'SoloKey',
            id: Buffer.from([1,2,3,4,5,6,7,8])
        });


        console.log('mc', mc);

    }
    test();
}

