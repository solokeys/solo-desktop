const CBOR= require('cbor-sync');
const CBOR2 = require('cbor');

var Util = require('../util')
var hid = require('./hid')

const CTAPHID = require('../constants').HID;
const CTAP2 = require('../constants').CTAP2;
const CTAP1 = require('../constants').CTAP1;
const ERROR = require('../constants').ERROR;

const EC = require('elliptic').ec;
var createHash= require('sha.js');

var DEBUG = 0;



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
        var req = new Map();

        req.set(1, cdh);
        req.set(2, {id: rpId, name: rpId});
        req.set(3, user);
        req.set(4, [{type:'public-key', alg:-7}]);
        
        var cbor = CBOR2.encode(req);

        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.MAKE_CREDENTIAL], cbor));

        res = new MakeCredentialResponse(res);

        return res;
    }

    /** getAssertion
     * Send get assertion to authenticator
     * @param {String} rpId name of RP, e.g. 'solokeys.com',
     * @param {Buffer} cdh 32 byte buffer to be signed.
     * @param {Object} opts credId, pinAuth, extensions
    */
    async getAssertion(rpId, cdh, opts){
        var req = new Map();
        req.set(1, rpId);
        req.set(2, cdh);

        var allow_list = [{'type': 'public-key', 'id': opts.credId}]
        if (opts.credId){
            req.set(3, allow_list)
        }

        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.GET_ASSERTION], cbor));

        return (new GetAssertionResponse(res));
    }

    async sendRecv(cmd, data){
        if (DEBUG) console.log('<<', cmd.toString(16), Util.obj2hex(data))
        var res = await this.transport.sendRecv(cmd, data);
        if (DEBUG) console.log('>>', Util.obj2hex(res))
        return res;
    }

    async setPin(){

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
    get authData () {
        return this.dict[2];
    }
    get rpIdHash () {
        return this.authData.slice(0,32);
    }
    get flags () {
        return this.authData[32];
    }
    get count () {
        return this.authData.readUInt32BE(33);
    }
    get response () {
        return this.dict;
    }

    /** Verify signature in either makeCredential or getAssertion
     *  response.  For MC, the pk needs to be extracted from the x509
     *  cert.
     * 
    */
    verify(cdh, pk)
    {
        var ec = new EC('p256');
        var ecckey = ec.keyFromPublic(pk.toString('hex'), 'hex');


        var hash = createHash('sha256');
        hash.update(this.authData)
        hash.update(cdh);
        hash = hash.digest('hex');

        var sig = this.signature.toString('hex');

        return ecckey.verify(hash, sig);
    }
}

class GetAssertionResponse extends CtapResponse {
    constructor(...args){
        super(...args);
        if ((this.flags & (1<<6)) != 0) {
            throw 'Attested credential data in response.'
        }
    }
    get signature () {
        return this.dict[3];
    }
    
}

class MakeCredentialResponse extends CtapResponse {
    constructor(...args){
        super(...args);
        if ((this.flags & (1<<6)) == 0) {
            throw 'No attested credential data in response.'
        }
    }

    get attStmt () {
        return this.dict[3];
    }

    get fmt () {
        return this.dict[1];
    }

    get L () {
        return this.authData.readUInt16BE(37 + 16);
    }

    get credId () {
        return this.authData.slice(37 + 2 + 16, 37 + 2 + 16 + this.L);
    }

    get signature () {
        return this.attStmt.sig;
    }

    get coseKey () {
        var cbor = this.authData.slice(37 + 2 + 16 + this.L, this.authData.length);
        return CBOR.decode(cbor);
    }

    get pk () {
        var key = this.coseKey;
        var b = ('04'+ Util.bin2hex(key[-2]) + Util.bin2hex(key[-3]));
        b = Util.hex2bin(b);
        return b;
    }

    get x509 () {
        return this.attStmt.x5c[0];
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
}

if (require.main === module) {
    async function test(){
        const assert = require('assert');
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);

        var info = await client.getInfo();
        console.log('info:', (info));

        var cdh = Util.sha256bin('123');
        var rp = 'solokeys.com';


        console.log('MakeCredential');
        var mc = await client.makeCredential(rp, cdh, {
            name: 'solokey',
            displayName: 'SoloKey',
            id: Buffer.from([1,2,3,4,5,6,7,8])
        });


        console.log('GetAssertion');
        var ga = await client.getAssertion(rp, cdh, {
            credId: mc.credId,
        });


        console.log('Verify');
        if (! ga.verify(cdh, mc.pk)){
            throw 'Signature invalid';
        }



    }
    test();
}

module.exports = {
    Client: CtapClient,
};