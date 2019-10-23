var CtapClient = require('./ctap').Client;
var Util = require('../util');

var cdh = Util.sha256bin('123');
var hid = require('./hid');
var rp = 'solokeys.com';


module.exports ={

    init: async function(){
        var devs = hid.devices();
        var dev = hid.open(devs[0]);
        var client = new CtapClient(dev);
        this.client = client;
    },

    route: async function(cmd, arg, cb){
        try{
            if (cmd == 'register') {
                var res = await this.register(arg);
                cb(res);
            } else if (cmd == 'auth') {
                var res = await this.auth(arg);
                cb(res);
            }
        } catch (e) {
            cb(JSON.stringify({error: e.toString()}));
        }
    },

    findToken: async function(arg){
        try{
            await this.init();
        }
        catch{
            throw 'No token connected'
        }
    },

    list: async function (arg){

    },

    register: async function(arg){
        await this.findToken();

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

        var attest_pk = Util.cert2publickey(mc.x509);
        var valid = mc.verify(cdh, attest_pk);
        if (!valid){
            throw 'Attestion is invalid in makeCredential'
        }
            
        return JSON.stringify(user);

    },

    auth: async function(arg){

        await this.findToken();

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