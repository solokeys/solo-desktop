const base64url = require('base64url');
var createHash= require('sha.js');

function isBin(obj)
{
    return Object.prototype.toString.call(obj).indexOf('Uint8Array') > -1;
};

function isArray(obj)
{
    return Object.prototype.toString.call(obj).indexOf('[object Array]') > -1;
};
function isStr(obj)
{
    return Object.prototype.toString.call(obj).indexOf('[object String]') > -1;
};

module.exports = {
    isBin: isBin,
    isArray: isArray,
    isStr: isStr,

/**
 * Convert a string to a unicode byte array
 * @param {string} str
 * @return {Array} of bytes
 */
str2array: function (str) {
    const utf8 = [];
    for (let ii = 0; ii < str.length; ii++) {
        let charCode = str.charCodeAt(ii);
        if (charCode < 0x80) utf8.push(charCode);
        else if (charCode < 0x800) {
            utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
        } else {
            ii++;
            // Surrogate pair:
            // UTF-16 encodes 0x10000-0x10FFFF by subtracting 0x10000 and
            // splitting the 20 bits of 0x0-0xFFFFF into two halves
            charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(ii) & 0x3ff));
            utf8.push(
                0xf0 | (charCode >> 18),
                0x80 | ((charCode >> 12) & 0x3f),
                0x80 | ((charCode >> 6) & 0x3f),
                0x80 | (charCode & 0x3f),
            );
        }
    }
    return utf8;
},

array2bin: function array2bin(arr)
{
    if (isBin(arr)) return arr;
    return Buffer.from(arr);
},

str2bin: function (str)
{
    if (isBin(str)) return str;
    return this.array2bin(this.str2array(str));
},

bin2str: function (bin)
{
    if (isStr(bin)) return bin;
    return Buffer.from(bin).toString();
},

bin2array: function (bin)
{
    if (isArray(bin)) return bin;
    return this.str2array(this.bin2str(bin));
},

bin2hex: function (bin)
{
    return Buffer.from(bin).toString('hex').toUpperCase();
},

array2hex: function (arr)
{
    return this.array2bin(arr).toString('hex').toUpperCase();
},

str2hex: function (str)
{
    return this.str2bin(str).toString('hex').toUpperCase();
},

obj2bin: function(obj)
{
    if (isBin(obj)) return obj;
    if (isArray(obj)) return this.array2bin(obj);
    if (isStr(obj)) return this.str2bin(obj);
    throw ('Unknown object');
},

obj2hex: function(obj)
{
    if (isBin(obj)) return this.bin2hex(obj);
    if (isArray(obj)) return this.array2hex(obj);
    if (isStr(obj)) return this.str2hex(obj);
    throw ('Unknown object');
},

hex2bin: function(hex){
    if (isBin(hex)) return hex;
    return Buffer.from(hex, 'hex');
},

b64url2b64: function(b64url)
{
    return base64url.toBase64(b64url)
},

b642b64url: function(b64)
{
    return base64url.fromBase64(b64)
},

b642bin: function(b64)
{
    return Buffer.from(b64, 'base64');
},

bin2b64: function(bin)
{
    return Buffer.from(bin).toString('base64');
},

bin2b64url: function(bin)
{
    return this.b642b64url(Buffer.from(bin).toString('base64'));
},

b64url2bin: function(b64url)
{
    var b64 = this.b64url2b64(b64url);
    return Buffer.from(b64, 'base64');
},

imageBuf2Base64URL: function(img){
    var b = this.bin2b64(img);
    var jpg = 'data:image/jpg;base64,' + b;
    return jpg;
},

base64URL2ImageBuf: function(img){
    return Buffer.from(img.split(',')[1], 'base64');
},

sha256: function(bin){
    return (createHash('sha256').update(bin).digest('hex'));
},
sha256bin: function(bin){
    return this.hex2bin(createHash('sha256').update(bin).digest('hex'));
},


}
