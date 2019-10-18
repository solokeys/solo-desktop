var CtapClient = require('./main/ctap').Client;
var Util = require('./util');

var cdh = Util.sha256bin('123');
var hid = require('./main/hid');
var rp = 'solokeys.com';



module.exports ={

    init: async function(){
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);
        this.client = client;
    },

    sendEvent: async function(cmd, arg, cb){
        if (cmd == 'register') {
            var res = await this.register(arg);
            cb(res);
        } else if (cmd == 'auth') {
            var res = await this.auth(arg);
            cb(res);

        }
    },

    register: async function(arg){

        var r = (Math.random() * 1000) | 0;
        var r2 = (Math.random() * 1000) | 0;
        console.log('MakeCredential');
        var user = {
            name: 'solokey ' + r,
            displayName: 'SoloKey ' + r,
            id: Buffer.from([1,2,3,4,5,6,7,8, r2 & 0xff])
        };
        var mc = await this.client.makeCredential(rp, cdh, user);
        user.count = mc.count;
        user.credId = Util.bin2hex(mc.credId);

        return JSON.stringify(user);

    },

    auth: async function(arg){

        var user = JSON.parse(arg);

        var r = (Math.random() * 1000) | 0;
        var r2 = (Math.random() * 1000) | 0;

        cdh = Util.sha256bin(r2+ '123' + r);

        console.log('GetAssertion');
        var ga = await this.client.getAssertion(rp, cdh, {
            credId: Util.hex2bin(user.credId),
        });

        var res = {
            count: ga.count,
            signature: Util.bin2hex(ga.signature), 
            lowByte: ga.signature[45],
        }



        return JSON.stringify(res);

    }


};