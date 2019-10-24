const CBOR= require('cbor-sync');
const CBOR2 = require('cbor');

var Util = require('../util')
var hid = require('./hid')

const CTAPHID = require('../constants').HID;
const CTAP2 = require('../constants').CTAP2;
const CTAP1 = require('../constants').CTAP1;
const ERROR = require('../constants').ERROR;

const EC = require('elliptic').ec;
const createHash= require('sha.js');
const createHmac = require('create-hmac');
const aesjs = require('aes-js');
const assert = require('assert');

var DEBUG = 0;

async function getParam(p){
  if (p instanceof Promise) p = await p;
  return p;
}

class CtapClient {
    constructor(transport){
        this.transport = transport;
    }

    async sendRecv(cmd, data){
        if (DEBUG) console.log('<<', cmd.toString(16), Util.obj2hex(data))
        var res = await this.transport.sendRecv(cmd, data);
        if (DEBUG) console.log('>>', Util.obj2hex(res))
        return res;
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
        opts = opts || {};
        var req = new Map();

        req.set(1, cdh);
        req.set(2, {id: rpId, name: rpId});
        req.set(3, user);
        req.set(4, [{type:'public-key', alg:-7}]);

        if(opts.pin || opts.pinToken){
            var pinAuth = await this._getPinAuth(opts.pin, cdh, {pinToken: opts.pinToken});
            req.set(8, pinAuth);
        }
        
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
        opts = opts || {};
        var req = new Map();
        req.set(1, rpId);
        req.set(2, cdh);

        var allow_list = [{'type': 'public-key', 'id': opts.credId}]
        if (opts.credId){
            req.set(3, allow_list)
        }

        if(opts.pin || opts.pinToken){
            var pinAuth = await this._getPinAuth(opts.pin, cdh, {pinToken: opts.pinToken});
            req.set(6, pinAuth);
        }
 

        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.GET_ASSERTION], cbor));

        return (new GetAssertionResponse(res));
    }

    clientPinRequest(cmd){
        var req = new Map();
        req.set(1,1);   // pin protocol
        req.set(2,cmd);   // sub command
        return req;
    }

    /** getRetries
     * Returns number of attempts remaining for PIN.
    */
    async getRetries()
    {
        var req = this.clientPinRequest(CTAP2.getRetries);
        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.CLIENT_PIN], cbor));
        res = new ClientPinResponse(res);
        return res.retries;
    }

    async getSharedSecret()
    {
        ////
        var req = this.clientPinRequest(CTAP2.getKeyAgreement);
        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.CLIENT_PIN], cbor));
        res = new ClientPinResponse(res);
        ////

        var device_pk = res.pk;
        this.device_pk = device_pk
        device_pk = Util.bin2hex(device_pk)

        var ec = new EC('p256');
        device_pk = ec.keyFromPublic(device_pk,'hex');
        var rng = new Uint8Array(32);
        for (var i = 0; i < 32; i++){
            rng[i] = (Math.random() * 255) | 0;
        }
        this.keypair = await getParam(ec.genKeyPair({
            entropy: Util.bin2str(rng),
            curve: 'p256',
        }));

        this.shared = await getParam(this.keypair.derive(device_pk.getPublic()));
        var s = this.shared.toString(16)
        while(s.length < 64)
        {
            s = '0' + s;
        }

        this.shared = Util.hex2bin(s);

        this.shared = Util.hex2bin(createHash('sha256').update(this.shared).digest('hex'))

        return this.shared;
    }

    async setPin(pin, credId){
        await this.getSharedSecret();

        pin = Util.bin2hex(Util.str2bin(pin));

        var pinL = pin.length;
        for (var i = 0 ; i<(128-pinL); i+=2)
        {
            pin += '00';
        }

        assert(pin.length == 128)
        pin = aesjs.utils.hex.toBytes(pin);
        assert(pin.length == 64)
        assert(this.shared.length == 32)

        const iv = Buffer.alloc(16, 0);
        var aesCbc = new aesjs.ModeOfOperation.cbc(this.shared, iv);
        var pinEnc = aesCbc.encrypt(pin);
        var encryptedHex = aesjs.utils.hex.fromBytes(pinEnc);


        var pinAuth = Util.hex2bin(createHmac('sha256', this.shared).update(pinEnc).digest('hex')).slice(0,16);
        var pk = Util.hex2bin(this.keypair.getPublic().encode('hex'));

        assert(pk.length == 65);
        assert(pinEnc.length == 64);
        assert(pinAuth.length == 16);

        var req = this.clientPinRequest(CTAP2.setPin);
        var coseKey = new Map();
        coseKey.set(1,2);
        coseKey.set(3,-25);
        coseKey.set(-1,1);
        coseKey.set(-2,pk.slice(1,1+32));
        coseKey.set(-3,pk.slice(1+32,1+32+32));
        req.set(3, coseKey);
        req.set(4, pinAuth);
        req.set(5, Buffer.from(pinEnc));
        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.CLIENT_PIN], cbor))
        res = new ClientPinResponse(res);
        return res.dict;
    }

    async changePin(curPin, newPin, credId)
    {
        var ts;
        await this.getSharedSecret();

        newPin = Util.bin2hex(Util.str2bin(newPin));

        var pinL = newPin.length;
        for (var i = 0 ; i<(128-pinL); i+=2)
        {
            newPin += '00';
        }
        var newPinBin = Util.hex2bin(newPin);

        var curPinBin = (Util.str2bin(curPin));
        var curPinHash = Util.hex2bin(createHash('sha256').update(curPinBin).digest('hex')).slice(0,16);

        const iv = Buffer.alloc(16, 0);
        var aesCbc = new aesjs.ModeOfOperation.cbc(this.shared, iv);
        var curPinHashEnc = aesCbc.encrypt(curPinHash);
        var curPinHashEncHex = aesjs.utils.hex.fromBytes(curPinHashEnc);

        aesCbc = new aesjs.ModeOfOperation.cbc(this.shared, iv);
        var newPinEnc = aesCbc.encrypt(newPinBin);
        var newPinEncHex = aesjs.utils.hex.fromBytes(newPinEnc);

        var pinAuthHex = createHmac('sha256', this.shared).update(Util.merge(newPinEnc, curPinHashEnc)).digest('hex')
        var pinAuth = Util.hex2bin(pinAuthHex).slice(0,16);

        var pk = Util.hex2bin(this.keypair.getPublic().encode('hex'));

        assert(pk.length == 65);
        assert(newPinEnc.length == 64);
        assert(curPinHashEnc.length == 16);
        assert(pinAuth.length == 16);

        var req = this.clientPinRequest(CTAP2.changePin);
        var coseKey = new Map();
        coseKey.set(1,2);
        coseKey.set(3,-25);
        coseKey.set(-1,1);
        coseKey.set(-2,pk.slice(1,1+32));
        coseKey.set(-3,pk.slice(1+32,1+32+32));
        req.set(3, coseKey);
        req.set(4, pinAuth);
        req.set(5, Buffer.from(newPinEnc));
        req.set(6, Buffer.from(curPinHashEnc));
        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.CLIENT_PIN], cbor))
        res = new ClientPinResponse(res);
        return res.dict;

    }

    async getPinToken(pin, credId)
    {
        await this.getSharedSecret();

        var curPinBin = (Util.str2bin(pin));
        var curPinHash = Util.hex2bin(createHash('sha256').update(curPinBin).digest('hex')).slice(0,16);

        const iv = Buffer.alloc(16, 0);
        var aesCbc = new aesjs.ModeOfOperation.cbc(this.shared, iv);
        var curPinHashEnc = aesCbc.encrypt(curPinHash);
        var curPinHashEncHex = aesjs.utils.hex.fromBytes(curPinHashEnc);

        var pk = Util.hex2bin(this.keypair.getPublic().encode('hex'));

        assert(pk.length == 65);
        assert(curPinHashEnc.length == 16);

        var req = this.clientPinRequest(CTAP2.getPinToken);
        var coseKey = new Map();
        coseKey.set(1,2);
        coseKey.set(3,-25);
        coseKey.set(-1,1);
        coseKey.set(-2,pk.slice(1,1+32));
        coseKey.set(-3,pk.slice(1+32,1+32+32));
        req.set(3, coseKey);
        req.set(6, Buffer.from(curPinHashEnc));
        var cbor = CBOR2.encode(req);
        var res = await this.sendRecv(CTAPHID.CBOR, Util.merge([CTAP2.CLIENT_PIN], cbor))
        res = new ClientPinResponse(res);

        var pinTokenEnc = res.pinTokenEnc;
        aesCbc = new aesjs.ModeOfOperation.cbc(this.shared, iv);
        var pinToken = aesCbc.decrypt(pinTokenEnc);
        var pinTokenHex = aesjs.utils.hex.fromBytes(pinToken);

        return Util.hex2bin(pinTokenHex);

    }

    async _getPinAuth(pin, cdh, opts){
        opts = opts || {};
        var credId = opts.credId;
        var pinToken = opts.pinToken;
        if (!pinToken) pinToken = await this.getPinToken(pin, credId);
        var pinAuth = Util.hex2bin(createHmac('sha256', pinToken).update(cdh).digest('hex')).slice(0,16);
        return pinAuth;
    }


    async reset(credId)
    {
        var res;
        res = await this.sendRecv(CTAPHID.CBOR, [CTAP2.RESET]);
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

class ClientPinResponse extends CtapResponse {
    constructor(...args){
        super(...args);
    }

    get retries (){
        return this.dict[3];
    }

    get coseKey(){
        return this.dict[1];
    }
    get pk () {
        var key = this.coseKey;
        var b = ('04'+ Util.bin2hex(key[-2]) + Util.bin2hex(key[-3]));
        b = Util.hex2bin(b);
        return b;
    }
    get pinTokenEnc() {
        return this.dict[2];
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

        console.log('reset');
        await client.reset();

        console.log('MakeCredential');
        var mc = await client.makeCredential(rp, cdh, {
            name: 'solokey',
            displayName: 'SoloKey',
            id: Buffer.from([1,2,3,4,5,6,7,8])
        });
        assert(! (mc.flags & (1<<2)));


        console.log('GetAssertion');
        var ga = await client.getAssertion(rp, cdh, {
            credId: mc.credId,
        });
        assert(! (ga.flags & (1<<2)));


        console.log('Verify');
        if (! ga.verify(cdh, mc.pk)){
            throw 'Signature invalid';
        }

        console.log('getRetries', await client.getRetries());
        await client.getRetries();

        console.log('getSharedSecret');
        var r = await client.getSharedSecret();
        console.log(r);


        console.log('setPin');
        var pin1 = '1234';
        var r = await client.setPin(pin1);
        console.log(r);

        console.log('changePin');
        var pin2 = '5678';
        r = await client.changePin(pin1, pin2);
        console.log(r);

        console.log('getPinToken');
        r = await client.getPinToken(pin2);
        console.log(r);

        console.log('getPinAuth');
        r = await client._getPinAuth(pin2, cdh);
        console.log(r);

        console.log('MakeCredential.pin');
        var mc = await client.makeCredential(rp, cdh, {
            name: 'solokey',
            displayName: 'SoloKey',
            id: Buffer.from([1,2,3,4,5,6,7,8]),
        }, {pin: pin2});
        assert(mc.flags & (1<<2));

        console.log('GetAssertion.pin');
        var ga = await client.getAssertion(rp, cdh, {
            credId: mc.credId,
            pin: pin2
        });
        assert(ga.flags & (1<<2));


    }
    test();
}

module.exports = {
    Client: CtapClient,
};