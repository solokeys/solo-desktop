const ipcMain = require('electron').ipcMain;
var CtapClient = require('./ctap').Client;
var Util = require('../util');
var Constants = require('./../constants');

var cdh = Util.sha256bin('123');
var hid = require('./hid');
var rp = 'solokeys.com';

// routes.init();

// async function routeFunc(cmd, arg, event){
//   routes.route(cmd, arg, (res)=>{
//     event.reply(cmd, res);
//   });
// }

// for (var i in ['msg','register','auth','list']){
//   ipcMain.on(i, (event, arg) => {routeFunc(i, arg, event);});
// }
(()=>{
    var cmd = 'list';
    ipcMain.on(cmd, async (event, arg) => {
        console.log('list');
        var devs = hid.devices();
        for (var i = 0; i < devs.length; i++){
            var serial = devs[i].serialNumber || devs[i].path;
            devs[i].id = serial;
            var dev = hid.open(devs[i]);
            var client = new CtapClient(dev);
            try {
                var info = await client.getInfo();
                devs[i].info = info;
            } catch (e) {
                console.log('Error getting CTAP2 info.', e);
            }

            if (devs[i].manufacturer.toLowerCase() == 'solokeys'){
                var res = [0,0,0];
                try{
                    res = await dev.sendRecv(0x61, [0, 0, 0, 0]);
                } catch (e) {
                    console.log('error', e);
                }
                if (res && res[0] > 0) {
                    devs[i].isSolo = true;
                    devs[i].version = res;
                    console.log('Solo version is ', res);
                }
            }
            dev.close();
        }
        console.log('reply to ', cmd);
        event.reply(cmd, devs);
    });
})();
(()=>{
    var cmd = 'register';
    ipcMain.on(cmd, async (event, device) => {


        var r = (Math.random() * 1000) | 0;
        var r2 = (Math.random() * 1000) | 0;
        console.log('MakeCredential', event);
        var user = {
            name: 'solokey ' + r,
            displayName: 'SoloKey ' + r,
            id: Buffer.from([1,2,3,4,5,6,7,8, r2 & 0xff])
        };
        try{
            var dev = hid.open(device);
            var client = new CtapClient(dev);
            console.log('got options:', device.opts);
            var mc = await client.makeCredential(rp, cdh, user, device.opts);
            user.count = mc.count;
            user.credId = Util.bin2hex(mc.credId);

            var certhash = Util.sha256(mc.x509);
            if (certhash == Constants.SOLO_SECURE_CERT_HASH){
                user.variant = 'solokeys';
            }
            else if (certhash == Constants.SOLO_HACKER_CERT_HASH){
                user.variant = 'hacker';
            } else {
                user.variant = 'unknown';
            }

            var attest_pk = Util.cert2publickey(mc.x509);
            var valid = mc.verify(cdh, attest_pk);
            if (!valid){
                throw 'Attestation is invalid in makeCredential'
            }
        } catch(e) {
            event.reply(cmd, {error: e.toString(), code: e.code});
            return;
        }
            
        event.reply(cmd, user);

    });
})();

(()=>{
    var cmd = 'authenticate';
    ipcMain.on(cmd, async (event, device) => {

        try {
            var dev = hid.open(device);
            var client = new CtapClient(dev);

            var user = device.user;

            var r = (Math.random() * 1000) | 0;
            var r2 = (Math.random() * 1000) | 0;

            cdh = Util.sha256bin(r2 + '123' + r);

            var opts = device.opts || {};
            opts.credId = Util.hex2bin(user.credId);

            console.log('GetAssertion', user);
            var ga = await client.getAssertion(rp, cdh, opts);

            var res = {
                count: ga.count,
                signature: Util.bin2hex(ga.signature),
                cdh: cdh,
                user: user,
            }
        } catch (e) {
            event.reply(cmd, { error: e.toString(), code: e.code });
            return;
        }
        
        event.reply(cmd,res);

    });
})();

(()=>{
    var cmd = 'setPin';
    ipcMain.on(cmd, async (event, device) => {

        try {
            var dev = hid.open(device);
            var client = new CtapClient(dev);

            var pin = device.pin;

            await client.setPin(pin);

        } catch (e) {
            event.reply(cmd, { error: e.toString(), code: e.code });
            return;
        }
        
        event.reply(cmd,{status: 'success'});

    });
})();

(()=>{
    var cmd = 'changePin';
    ipcMain.on(cmd, async (event, device) => {

        try {
            var dev = hid.open(device);
            var client = new CtapClient(dev);

            var pin = device.pin;
            var newPin = device.newPin;

            await client.changePin(pin, newPin);

        } catch (e) {
            event.reply(cmd, { error: e.toString(), code: e.code });
            return;
        }
        
        event.reply(cmd,{status: 'success'});

    });
})();

(()=>{
    var cmd = 'getPinToken';
    ipcMain.on(cmd, async (event, device) => {
        console.log(cmd);

        try {
            var dev = hid.open(device);
            var client = new CtapClient(dev);

            var pin = device.pin;

            var p = await client.getPinToken(pin);


        } catch (e) {
            event.reply(cmd, { error: e.toString(), code: e.code });
            return;
        }
        
        event.reply(cmd,{status: 'success', pinToken: p});

    });
})();



(()=>{
    var cmd = 'reset';
    ipcMain.on(cmd, async (event, device) => {

        try {
            var dev = hid.open(device);
            var client = new CtapClient(dev);

            await client.reset();

        } catch (e) {
            event.reply(cmd, { error: e.toString(), code: e.code});
            return;
        }
        
        event.reply(cmd,{status: 'success'});

    });
})();

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