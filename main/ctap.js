var hid = require('./hid')
var Util = require('../Util')
const cbor = require('cbor-sync');
const CTAPHID = require('../constants').HID;
const CTAP2 = require('../constants').CTAP2;
const CTAP1 = require('../constants').CTAP1;
var DEBUG = 1;



class CtapClient {
    constructor(transport){
        this.transport = transport;
    }

    async getInfo(){
        var req = new hid.Request(CTAPHID.CBOR, [CTAP2.GET_INFO])
        var res = await this.sendRecvAll(req.toPackets());
        return res;
    }

    async makeCredential(rpId, cdh, user, opts){

    }

    async getAssertion(rpId, cdh, opts){

    }

    async sendRecvAll(pkts){
        if (DEBUG){
            for (var i = 0; i < pkts.length; i++){
                console.log('<<', Util.obj2hex(pkts[i]))
            }
        }
        var res = await this.transport.sendRecvAll(pkts);
        if (DEBUG) console.log('>>', Util.obj2hex(res))
        return res;

    }
    async sendRecv(data){
        if (DEBUG) console.log('<<', Util.obj2hex(data))
        var res = await this.transport.sendRecv(data);
        if (DEBUG) console.log('>>', Util.obj2hex(res))
        return res;
    }
}

if (require.main === module) {
    async function test(){
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);

        var info = await client.getInfo();
        console.log('info:', info);
    }
    test();
}