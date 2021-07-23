(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultCodeSuccess = exports.MessageCmdBiz = exports.MessageCmdLogout = exports.MessageCmdLogin = exports.MessageCmdServerTime = exports.MessageCmdPING = exports.AgentTypeNWWeb = exports.AgentTypeApp = exports.AgentTypeWeb = exports.WSClient = void 0;
var AgentTypeWeb = 0;
exports.AgentTypeWeb = AgentTypeWeb;
var AgentTypeApp = 1;
exports.AgentTypeApp = AgentTypeApp;
var AgentTypeNWWeb = 2;
exports.AgentTypeNWWeb = AgentTypeNWWeb;
var MessageCmdPING = 100;
exports.MessageCmdPING = MessageCmdPING;
var MessageCmdServerTime = 101;
exports.MessageCmdServerTime = MessageCmdServerTime;
var MessageCmdLogin = 102;
exports.MessageCmdLogin = MessageCmdLogin;
var MessageCmdLogout = 103;
exports.MessageCmdLogout = MessageCmdLogout;
var MessageCmdBiz = 200;
exports.MessageCmdBiz = MessageCmdBiz;
var ResultCodeSuccess = 0;
exports.ResultCodeSuccess = ResultCodeSuccess;
var MessageHeaderLen = 20;
/**
 * WebSocket client wrapper
 */
var WSClient = /** @class */ (function () {
    function WSClient() {
        this._ws = null;
        this._url = '';
        this._accountInfo = {
            username: '',
            password: '',
        };
        this._heartbeatTimer = 0;
        this._heartbeatIntervalSeconds = 30;
        this._reconnectIntervalSeconds = 1;
        this._subscribes = {};
        this._agentType = AgentTypeWeb;
        this._agentText = 'web';
        this._clientCode = 0;
        this._messageCmdLogin = MessageCmdLogin;
        this._messageCmdLogout = MessageCmdLogout;
        this._bizCodeLogin = 'a1001';
        this._bizCodeLogout = 'a1003';
        this._sequenceNumber = 0;
        this._pendingPackages = [];
        this._enablePackageHead = false;
        this._skipReconnectingCodes = [];
        this._lastResponseCode = 0;
        this._subscribingChannelMessageField = 'requestId';
        this._onDisconnectedListener = null;
        this._cleanSubscribesOnClose = true;
        this._cleanPendingsOnClose = true;
        this._enableDebugLog = false;
        this._keepDurableSubscribesOnClean = true;
        this._keepDurableSubscribesUniqual = true;
        this._accountInfo = {
            username: '',
            password: '',
        };
        this._heartbeatTimer = 0;
        this._heartbeatIntervalSeconds = 30;
        this._reconnectIntervalSeconds = 1;
        this._subscribes = {};
        this._agentType = AgentTypeWeb;
        this._agentText = 'web';
        this._clientCode = 0;
        this._messageCmdLogin = MessageCmdLogin;
        this._messageCmdLogout = MessageCmdLogout;
        this._bizCodeLogin = 'a1001';
        this._bizCodeLogout = 'a1003';
        this._sequenceNumber = 0;
        this._pendingPackages = [];
        this._enablePackageHead = false;
        this._skipReconnectingCodes = [];
        this._lastResponseCode = 0;
        this._subscribingChannelMessageField = 'requestId';
        this._onDisconnectedListener = null;
        this._cleanSubscribesOnClose = true;
        this._cleanPendingsOnClose = true;
        this._enableDebugLog = false;
        this._keepDurableSubscribesOnClean = true;
        this._keepDurableSubscribesUniqual = true;
    }
    /**
     * singleton instance
     */
    WSClient.instance = function () {
        if (WSClient._instance) {
            return WSClient._instance;
        }
        WSClient._instance = new WSClient();
        return WSClient._instance;
    };
    /**
     * initialize WebSocket client with agent type
     * @param agentType agent type
     * @param agentText agent text
     * @param clientCode client type code
     */
    WSClient.prototype.init = function (agentType, agentText, clientCode) {
        if (clientCode === void 0) { clientCode = 0; }
        this._agentType = agentType;
        this._clientCode = clientCode;
    };
    /**
     * Enabling wrapping package head or not
     * @param enabled boolean
     */
    WSClient.prototype.enablePackageHead = function (enabled) {
        this._enablePackageHead = enabled;
    };
    /**
     * Enabling debug log if true
     * @param enabled boolean
     */
    WSClient.prototype.enableDebugLog = function (enabled) {
        this._enableDebugLog = enabled;
    };
    /**
     * Set codes got responsed from server that should skip reconnecting on close
     * @param codes array of number
     */
    WSClient.prototype.setSkipReconnectingCodes = function (codes) {
        this._skipReconnectingCodes = codes;
    };
    /**
     * Set field name for message to detect callback function subscribed by channel
     * @param channelField
     */
    WSClient.prototype.setSubscribingChannelMessageField = function (channelField) {
        this._subscribingChannelMessageField = channelField;
    };
    /**
     * Set callback function that could process return to login page when connection closed without reconnecting
     * @param cb function that could process return to login page when connection closed without reconnecting
     */
    WSClient.prototype.setOnDisconnectedListener = function (cb) {
        this._onDisconnectedListener = cb;
    };
    /**
     * Set heartbeat interval as seconds
     * @param seconds heartbeat interval as seconds
     * @returns
     */
    WSClient.prototype.setHeartbeatIntervalSeconds = function (seconds) {
        if (seconds < 1) {
            return;
        }
        this._heartbeatIntervalSeconds = seconds;
    };
    /**
     * Set if keep durable subscribes on clean all subscribes automatically called
     * @param keepDurableSubscribes boolean
     */
    WSClient.prototype.setKeepDurableSubscribesOnClean = function (keepDurableSubscribes) {
        this._keepDurableSubscribesOnClean = keepDurableSubscribes;
    };
    /**
     * Set if keep durable subscribes uniqually on subscribes
     * @param keepDurableSubscribesUniqual boolean
     */
    WSClient.prototype.setKeepDurableSubscribesUniqual = function (keepDurableSubscribesUniqual) {
        this._keepDurableSubscribesUniqual = keepDurableSubscribesUniqual;
    };
    /**
     * Opening a websocket connection, if the connection were established or connecting,
     * it would do the recoonect operation.
     * @param url websocket url
     * @param accountInfo
     */
    WSClient.prototype.open = function (url, accountInfo) {
        this._url = url;
        this._accountInfo = accountInfo;
        if (this._ws) {
            if (this._ws.readyState == WebSocket.CONNECTING) {
                return;
            }
            return this.reconnect();
        }
        console.log('opening', this._url);
        this._open();
    };
    /**
     * Reconnect the websocket connection
     */
    WSClient.prototype.reconnect = function () {
        console.log('reconnecting to', this._url);
        this.close();
        this._open();
    };
    /**
     * Close the websocket connection
     */
    WSClient.prototype.close = function () {
        if (this._ws) {
            this._ws.onopen = null;
            this._ws.onmessage = null;
            this._ws.onclose = null;
            this._ws.onerror = null;
            this._closeHeartbeat();
            if (this._cleanSubscribesOnClose) {
                this.cleanAllSubscribes(this._keepDurableSubscribesOnClean);
            }
            if (this._cleanPendingsOnClose) {
                this._pendingPackages = [];
            }
            if (this._ws.readyState == WebSocket.OPEN || this._ws.readyState == WebSocket.CONNECTING) {
                this._ws.close();
            }
            this._ws = null;
        }
    };
    /**
     * Subscribe a channel
     * @param channel
     * @param cb
     * @param isCallOnce defaults true, if callback once, the subscribed callback function would be unsubscribed
     */
    WSClient.prototype.subscribe = function (channel, cb, isCallOnce) {
        if (isCallOnce === void 0) { isCallOnce = true; }
        if (false === isCallOnce && this._keepDurableSubscribesUniqual) {
            if (this._subscribes[channel]) {
                var durableFound_1 = false;
                this._subscribes[channel].forEach(function (cb) {
                    if (false === cb.isCallOnce) {
                        durableFound_1 = true;
                    }
                });
                if (durableFound_1) {
                    return;
                }
            }
        }
        if (this._subscribes[channel]) {
            if (this._getCallbackIndex(this._subscribes[channel], cb) < 0) {
                this._subscribes[channel].push(new CallbackWrapper(cb, isCallOnce));
            }
        }
        else {
            this._subscribes[channel] = [new CallbackWrapper(cb, isCallOnce)];
        }
    };
    /**
     * Unsubscribe a channel registered callback
     * @param channel
     * @param cb
     */
    WSClient.prototype.unsubscribe = function (channel, cb) {
        if (this._subscribes[channel]) {
            var idx = this._getCallbackIndex(this._subscribes[channel], cb);
            if (idx >= 0) {
                this._subscribes[channel].splice(idx, 1);
                if (this._subscribes[channel].length <= 0) {
                    delete this._subscribes[channel];
                }
            }
        }
    };
    /**
     * Send login data
     * @param accountInfo
     */
    WSClient.prototype.login = function (accountInfo) {
        var msg = {
            requestId: 'id-login',
            userAgent: this._agentText,
            bizCode: this._bizCodeLogin,
            data: accountInfo
        };
        this.send(this._messageCmdLogin, msg);
    };
    /**
     * Send logout data
     */
    WSClient.prototype.logout = function () {
        var msg = {
            requestId: 'id-logout',
            userAgent: this._agentText,
            bizCode: this._bizCodeLogout,
        };
        this.send(this._messageCmdLogout, msg);
    };
    /**
     * Send biz data
     * @param cmd operation code
     * @param message
     */
    WSClient.prototype.send = function (cmd, message) {
        if (typeof (message) !== 'string') {
            message = JSON.stringify(message);
        }
        var buf;
        if (this._enablePackageHead) {
            this._sequenceNumber++;
            var wspkg = new WsPackage(cmd, this._agentType, this._clientCode, this._sequenceNumber, message);
            buf = wspkg.encode();
        }
        else {
            var msgbuf = new TextEncoder().encode(message);
            buf = msgbuf;
        }
        if (null === this._ws || this._ws.readyState != WebSocket.OPEN) {
            var stateText = null === this._ws ? 'opened' : 'ready';
            console.warn("websocket were not " + stateText + ", pending the message", message);
            this._pendingPackages.push(buf);
            return;
        }
        this._ws.send(buf);
    };
    /**
     * Send a business message using default MessageCmdBiz message cmd and subscribes a callback function for callback once
     * @param message payload message
     * @param channel channel that would be subscribed on callback response
     * @param cb callback function
     * @param cmd biz cmd in header
     */
    WSClient.prototype.sendWithCallback = function (message, channel, cb, cmd) {
        if (cmd === void 0) { cmd = MessageCmdBiz; }
        var cbIdx = -1;
        if (this._subscribes[channel]) {
            cbIdx = this._getCallbackIndex(this._subscribes[channel], cb);
        }
        if (cbIdx < 0) {
            this.subscribe(channel, cb, true);
        }
        this.send(cmd, message);
    };
    /**
     * Send ping data to keepalive from server
     * @param data
     */
    WSClient.prototype.ping = function (data) {
        this.send(MessageCmdPING, 'ping');
    };
    /**
     * Set message cmd field value for login
     * @param cmd
     */
    WSClient.prototype.setMessageCmdLogin = function (cmd) {
        this._messageCmdLogin = cmd;
    };
    /**
     * Set message cmd field value for logout
     * @param cmd
     */
    WSClient.prototype.setMessageCmdLogout = function (cmd) {
        this._messageCmdLogout = cmd;
    };
    /**
     * Set bizcode for login package
     * @param bizCode
     */
    WSClient.prototype.setLoginBizCode = function (bizCode) {
        this._bizCodeLogin = bizCode;
    };
    /**
     * Set bizcode for logout package
     * @param bizCode
     */
    WSClient.prototype.setLogoutBizCode = function (bizCode) {
        this._bizCodeLogout = bizCode;
    };
    /**
     * Clean suscribes on websocket closed if true
     * @param enable
     */
    WSClient.prototype.setCleanSubscribesOnClose = function (enable) {
        this._cleanSubscribesOnClose = enable;
    };
    /**
     * Clean all subscribes
     * @param keepDurableSubscribes default false, will not clean the durable handlers if true
     */
    WSClient.prototype.cleanAllSubscribes = function (keepDurableSubscribes) {
        if (keepDurableSubscribes === void 0) { keepDurableSubscribes = false; }
        var originSubscribes = this._subscribes;
        this._subscribes = {};
        if (keepDurableSubscribes) {
            var _loop_1 = function (k) {
                var curSubscirbes = [];
                originSubscribes[k].forEach(function (cbWrapper, idx, cbsArray) {
                    if (!cbWrapper.isCallOnce) {
                        curSubscirbes.push(cbWrapper);
                    }
                });
                if (curSubscirbes) {
                    this_1._subscribes[k] = curSubscirbes;
                }
            };
            var this_1 = this;
            for (var k in originSubscribes) {
                _loop_1(k);
            }
        }
    };
    WSClient.prototype._open = function () {
        this._ws = new WebSocket(this._url);
        this._ws.onopen = this._onopen;
        this._ws.onmessage = this._onmessage;
        this._ws.onclose = this._onclose;
        this._ws.onerror = this._onerror;
        if (this._cleanPendingsOnClose) {
            this._pendingPackages = [];
        }
    };
    WSClient.prototype._onopen = function (ev) {
        console.log('websocket connection established.');
        var inst = WSClient.instance();
        inst._sequenceNumber = 0;
        inst.login(inst._accountInfo);
        inst._heartbeatTimer = setInterval(function () {
            inst.ping('ping');
        }, inst._heartbeatIntervalSeconds * 1000);
        if (inst._pendingPackages.length) {
            var pendings = inst._pendingPackages;
            pendings.forEach(function (buf) {
                var _a;
                (_a = inst._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
            });
            inst._pendingPackages = [];
        }
    };
    WSClient.prototype._onerror = function (ev) {
        console.warn('websocket connection broken with error', ev);
        var inst = WSClient.instance();
        setTimeout(function () {
            inst.reconnect();
        }, inst._reconnectIntervalSeconds * 1000);
    };
    WSClient.prototype._onclose = function (ev) {
        console.warn('websocket connection closed with error', ev);
        var inst = WSClient.instance();
        var reconnecting = true;
        if (inst._cleanPendingsOnClose) {
            inst._pendingPackages = [];
        }
        if (inst._cleanSubscribesOnClose) {
            inst.cleanAllSubscribes(inst._keepDurableSubscribesOnClean);
        }
        inst._skipReconnectingCodes.forEach(function (code) {
            if (code === inst._lastResponseCode) {
                if (inst._enableDebugLog) {
                    console.log('skip reconnecting.');
                }
                reconnecting = false;
                inst._closeHeartbeat();
                if (null !== inst._onDisconnectedListener) {
                    inst._onDisconnectedListener(code);
                }
                return;
            }
        });
        if (reconnecting) {
            setTimeout(function () {
                inst.reconnect();
            }, inst._reconnectIntervalSeconds * 1000);
        }
        else {
            inst.close();
        }
    };
    WSClient.prototype._onmessage = function (ev) {
        var inst = WSClient.instance();
        if (ev.data.text) {
            ev.data.text().then(function (data) {
                inst._on_received_data(data);
            }).catch(function (e) {
                console.error('read received message failed with error', e);
            });
        }
        else if (typeof (ev.data) === 'string') {
            inst._on_received_data(ev.data);
        }
        else {
            var reader_1 = new FileReader();
            reader_1.readAsText(ev.data, 'utf-8');
            reader_1.onload = function (e) {
                inst._on_received_data(reader_1.result);
            };
        }
    };
    WSClient.prototype._on_received_data = function (data) {
        if (this._enableDebugLog) {
            console.log('received data', data);
        }
        if ('pong' === data) {
            return;
        }
        var msg = {};
        var inst = WSClient.instance();
        try {
            msg = JSON.parse(data);
        }
        catch (e) {
            console.error('parse received data failed', e);
        }
        if (msg.code !== undefined) {
            inst._lastResponseCode = msg.code;
            if (msg.code === 0) {
                if (typeof (msg.data) === 'string') {
                    try {
                        var msgData = JSON.parse(msg.data);
                        msg.data = msgData;
                    }
                    catch (e) {
                        // pass
                    }
                }
            }
            else {
                console.warn('received message failed with code', msg.code, msg.message);
            }
            // emmits
            var channelValue_1 = msg[inst._subscribingChannelMessageField];
            if (channelValue_1 !== undefined && inst._subscribes[channelValue_1]) {
                var currentCallbacks_1 = [];
                inst._subscribes[channelValue_1].forEach(function (cbWrapper, idx, cbsArray) {
                    currentCallbacks_1.push(cbWrapper);
                });
                inst._subscribes[channelValue_1] = [];
                currentCallbacks_1.forEach(function (cbWrapper, idx, cbsArray) {
                    if (cbWrapper.cb) {
                        try {
                            cbWrapper.cb(msg);
                        }
                        catch (e) {
                            console.log("calling subscribe on channel:" + channelValue_1 + " failed with error:", e);
                        }
                        if (!cbWrapper.isCallOnce) {
                            inst._subscribes[channelValue_1].push(cbWrapper);
                        }
                    }
                });
                if (inst._subscribes[channelValue_1].length <= 0) {
                    delete inst._subscribes[channelValue_1];
                }
            }
        }
    };
    WSClient.prototype._closeHeartbeat = function () {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = 0;
        }
    };
    WSClient.prototype._getCallbackIndex = function (subscribes, cb) {
        var idx = -1;
        for (var i = 0; i < subscribes.length; i++) {
            if (subscribes[i].cb === cb) {
                idx = i;
                break;
            }
        }
        return idx;
    };
    return WSClient;
}());
exports.WSClient = WSClient;
var WsPackage = /** @class */ (function () {
    function WsPackage(cmd, agent, clientCode, seq, message) {
        this.len = 0;
        this.cmd = 0;
        this.agent = 0;
        this.flag = 0;
        this.seq = 0;
        this.crc = 0;
        this.client = 0;
        this.cmd = cmd;
        this.agent = agent;
        this.seq = seq;
        this.flag = 0x80;
        this.client = clientCode;
        this.message = message;
    }
    WsPackage.prototype.encode = function () {
        var msgbuf = new TextEncoder().encode(this.message);
        this.len = MessageHeaderLen + msgbuf.length;
        this.crc = crc32(this.message);
        var buf = new Uint8Array(this.len);
        var hdr = new ArrayBuffer(MessageHeaderLen);
        var view = new DataView(hdr, 0, MessageHeaderLen);
        view.setUint32(0, this.len, false);
        view.setUint16(4, this.cmd, false);
        view.setUint8(6, this.agent);
        view.setUint8(7, this.flag);
        view.setUint32(8, this.seq, false);
        view.setUint32(12, this.crc, false);
        view.setUint32(16, this.client, false);
        buf.set(new Uint8Array(hdr), 0);
        buf.set(msgbuf, MessageHeaderLen);
        // console.log('serialized data', this.len, buf)
        return buf.buffer;
    };
    WsPackage.prototype.decode = function (payload) {
        var view = new DataView(payload);
        this.len = view.getUint32(0, false);
        this.cmd = view.getUint16(4, false);
        this.agent = view.getUint8(6);
        this.flag = view.getUint8(7);
        this.seq = view.getUint32(8, false);
        this.crc = view.getUint32(12, false);
        this.client = view.getUint32(16, false);
        this.message = new TextDecoder('utf-8').decode(payload.slice(MessageHeaderLen));
        return true;
    };
    return WsPackage;
}());
var makeCRCTable = function () {
    var c;
    var crcTable = [];
    for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
};
var gCrcTable = makeCRCTable();
var crc32 = function (str) {
    var crcTable = gCrcTable || (gCrcTable = makeCRCTable());
    var crc = 0 ^ (-1);
    for (var i = 0; i < str.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};
var CallbackWrapper = /** @class */ (function () {
    function CallbackWrapper(cb, isCallOnce) {
        if (isCallOnce === void 0) { isCallOnce = true; }
        this.cb = null;
        this.isCallOnce = false;
        this.cb = cb;
        this.isCallOnce = isCallOnce;
    }
    return CallbackWrapper;
}());

},{}],2:[function(require,module,exports){
const { WSClient, AgentTypeWeb } = require('../dist/wsclient')

const testInit = (username, password) => {
    const wsInst = WSClient.instance()
    wsInst.init(AgentTypeWeb, 'testing')
    wsInst.enablePackageHead(true)
    wsInst.setLoginBizCode('a1001')
    wsInst.setLogoutBizCode('a1003')
    wsInst.setSkipReconnectingCodes([19014])
    wsInst.setSubscribingChannelMessageField('bizCode')
    wsInst.subscribe('a1001', onLogin, false)
    wsInst.subscribe('a1003', onLogout)
    wsInst.setHeartbeatIntervalSeconds(170)
    wsInst.open('ws://192.168.0.31:8036/ws/index', {username: username, password: password})
    wsInst.ping('ping')

    // WSClient.instance().subscribe('a1005', onServerTime)
    // WSClient.instance().send(200, {
    //     requestId: 'uuid',
    //     userAgent: 'testing',
    //     bizCode: 'a1005',
    //     data: {time: 0}
    // }, onServertime)
}

const onLogin = (msg) => {
    console.log('login response', msg)
}

const onLogout = (msg) => {
    console.log('logout response', msg)
}

testInit('00000420', '000420')

},{"../dist/wsclient":1}]},{},[2]);
