module.exports = {
    HID: {
        PING: 0x01,
        MSG: 0x03,
        LOCK: 0x04,
        INIT: 0x06,
        WINK: 0x08,
        CBOR: 0x10,
        CANCEL: 0x11,
        ERROR: 0x3f,
        KEEPALIVE: 0x3b,

        SOLO_BOOT: 0x50,
        SOLO_ENTERBOOT: 0x51,
        SOLO_ENTERSTBOOT: 0x52,
        SOLO_GETRNG: 0x60,
        SOLO_GETVERSION: 0x61,
        SOLO_LOADKEY: 0x62,
    },

    CTAP2: {
        GET_INFO: 0x04,
    },

    CTAP1: {

    },
}