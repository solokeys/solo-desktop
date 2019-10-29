const ipcMain = require('electron').ipcMain;
const MemoryMap = require('nrf-intel-hex');
const CtapClient = require('./ctap').Client;
const Programmer = require('./bootloader').Programmer;
const sleep = require('./bootloader').sleep;
const Util = require('../util');
const Constants = require('./../constants');

var cdh = Util.sha256bin('123');
var hid = require('./hid');
var rp = 'solokeys.com';

/** isCorrectSignature
 * @param {Array} current 3 byte version e.g. [1,2,0]
 * @param {String} target version requirement e.g. "<=2.5.3"
 * @return {boolean} indicating if current satisfies target
*/
function isCorrectSignature(current, target){
    var current_num = (current[0] << 16) | (current[1] << 8) | current[2];
    var target_num;
    var comp;
    if (target.indexOf('=') >= 0){
        var parts = target.split('=');
        target_num = parts[1].split('.');
        if (parts[0] == '>')
            comp = '>=';
        else if (parts[0] == '<')
            comp = '<=';
        else 
            throw 'Invalid version string'
    }
    else {
        target_num = target.slice(1,target.length).split('.');
        if (target[0] == '>')
            comp = '>';
        else if (target[0] == '<')
            comp = '<';
        else 
            throw 'Invalid version string'
    }
    target_num = target_num.map(i => parseInt(i));
    target_num = (target[0] << 16) | (target[1] << 8) | target[2];
    return eval(current_num + comp + target_num);
}

/** loadJsonFirmware
 * @param {Object} json the parsed JSON firmware file
 * @return {Object} Same object but websafe strings converted to raw types.
*/
function loadJsonFirmware(json){
    var hex = Util.websafe2string(json.firmware);
    var versions = {};
    for (var k in json.versions){
        versions[k] = {signature: Util.websafe2array(json.versions[k].signature)};
    }
    return {firmware: hex, versions: versions};
}

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
                    // For older devices, this 61 command didn't exist.  So parse it from device name.
                    var parts = devs[i].product.split(' ');
                    if (parts.length>=2){
                        var version_str = parts[parts.length - 1]
                        var version_parts = version_str.split('.');
                        if (version_parts.length == 3){
                            res = version_parts.map(x => parseInt(x));
                        }
                    }
                }
                devs[i].isSolo = true;
                devs[i].version = res;
                // if (res && res[0] > 0) {
                //     devs[i].version = res;
                //     console.log('Solo version is ', res);
                // }
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

(()=>{
    var cmd = 'update';
    ipcMain.on(cmd, async (event, device) => {


        var dev = hid.open(device);
        var p = new Programmer(dev);
        var current_version;
        console.log('to bootloader');
        try{

            await p.toBootloader();
            current_version = await p.getVersion();
        }catch(e){
            if (e.code == Constants.ERROR.CTAP1_ERR_INVALID_COMMAND)
            {
                console.log('need to boot into bootloader mode...');
            }
            event.reply(cmd,{error: e.toString(), code: e.code});
            return;
        }

        console.log('load hex file');
        var hexFile;
        var signature = null;
        if (device.json){
            var fw = loadJsonFirmware(device.json);
            hexFile = fw.firmware;

            for (var v in fw.versions){
                if (isCorrectSignature(current_version, v)) {
                    signature = fw.versions[v].signature;
                    break;
                }
            }
            if (!signature)
                throw 'Could not find valid signature version in firmware file'

        } else {
            hexFile = fw.hexFile;
        }
        let memMap = MemoryMap.fromHex(hexFile);

        console.log('updating...');
        var totalSize = 0;
        for (const [addr, data] of (memMap._blocks.entries())) {
            totalSize += data.length;
        }

        var writtenSize = 0;

        p.on('write', (count)=>{
            writtenSize+=count;
            event.reply('progress', writtenSize/totalSize);
        });
        try{

            for (const [addr, data] of (memMap._blocks.entries())) {
                await p.write(addr, data);
            }
            p.on('write', null);

            var sig = null
            await p.verifyAndReboot(signature);
        } catch(e) {
            event.reply(cmd, {error: e.toString(), code: e.code});
            return;
        }

        event.reply(cmd, { status: 'success' });

    });
})();

(()=>{
    var cmd = 'bootloader-mode';
    ipcMain.on(cmd, async (event, device) => {


        console.log('to bootloader');
        for (var i = 0; i < 10*20; i++){
            try {
                var dev = hid.open(device);
                var p = new Programmer(dev);
                await p.toBootloader();
                i = -1;
                break;
            } catch (e) {
                console.log('need to boot into bootloader mode...', );
                await sleep(100);
            }
        }

        if (i >= 0){
            console.log('Timeout');
            event.reply(cmd, { error: 'Timeout' });
        }
        else {
            console.log('Success');
            event.reply(cmd, { status: 'success' });
        }



    });
})();

