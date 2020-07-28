(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageCmdLogout = exports.MessageCmdLogin = exports.MessageCmdPING = exports.AgentTypeNWWeb = exports.AgentTypeApp = exports.AgentTypeWeb = exports.WSClient = void 0;
var AgentTypeWeb = 0;
exports.AgentTypeWeb = AgentTypeWeb;
var AgentTypeApp = 1;
exports.AgentTypeApp = AgentTypeApp;
var AgentTypeNWWeb = 2;
exports.AgentTypeNWWeb = AgentTypeNWWeb;
var MessageCmdPING = 100;
exports.MessageCmdPING = MessageCmdPING;
var MessageCmdLogin = 102;
exports.MessageCmdLogin = MessageCmdLogin;
var MessageCmdLogout = 103;
exports.MessageCmdLogout = MessageCmdLogout;
var MessageCmdBiz = 200;
var ResultCodeSuccess = 0;
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
        this._reconnectInteervalSeconds = 1;
        this._subscribes = {};
        this._agentType = AgentTypeWeb;
        this._agentText = 'web';
        this._bizCodeLogin = 'a1001';
        this._bizCodeLogout = 'a1003';
        this._sequenceNumber = 0;
        this._cachedPackages = [];
        this._enablePackageHead = false;
        this._skipReconnectingCodes = [];
        this._lastResponseCode = 0;
        this._subscribingChannelMessageField = 'bizCode';
        this._onCloseListener = null;
        this._accountInfo = {
            username: '',
            password: '',
        };
        this._heartbeatTimer = 0;
        this._heartbeatIntervalSeconds = 30;
        this._reconnectInteervalSeconds = 1;
        this._subscribes = {};
        this._agentType = AgentTypeWeb;
        this._agentText = 'web';
        this._bizCodeLogin = 'a1001';
        this._bizCodeLogout = 'a1003';
        this._sequenceNumber = 0;
        this._cachedPackages = [];
        this._enablePackageHead = false;
        this._skipReconnectingCodes = [];
        this._lastResponseCode = 0;
        this._subscribingChannelMessageField = 'bizCode';
        this._onCloseListener = null;
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
     */
    WSClient.prototype.init = function (agentType, agentText) {
        this._agentType = agentType;
        this._agentText = agentText;
    };
    /**
     * Enabling wrapping package head or not
     * @param enabled boolean
     */
    WSClient.prototype.enablePackageHead = function (enabled) {
        this._enablePackageHead = enabled;
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
    WSClient.prototype.setOnCloseListener = function (cb) {
        this._onCloseListener = cb;
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
        this.send(MessageCmdLogin, msg);
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
        this.send(MessageCmdLogout, msg);
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
            var wspkg = new WsPackage(cmd, this._agentType, this._sequenceNumber, message);
            buf = wspkg.encode();
        }
        else {
            var msgbuf = new TextEncoder().encode(message);
            buf = msgbuf;
        }
        if (null === this._ws || this._ws.readyState != WebSocket.OPEN) {
            console.log('websocket were not ready, caching the message', message);
            this._cachedPackages.push(buf);
            return;
        }
        this._ws.send(buf);
    };
    /**
     * Send a business message using default MessageCmdBiz message cmd and subscribes a callback function for callback once
     * @param message
     * @param channel
     * @param cb
     */
    WSClient.prototype.sendWithCallback = function (message, channel, cb) {
        var cbIdx = -1;
        if (this._subscribes[channel]) {
            cbIdx = this._getCallbackIndex(this._subscribes[channel], cb);
        }
        if (cbIdx < 0) {
            this.subscribe(channel, cb, true);
        }
        this.send(MessageCmdBiz, message);
    };
    /**
     * Send ping data to keepalive from server
     * @param data
     */
    WSClient.prototype.ping = function (data) {
        this.send(MessageCmdPING, 'ping');
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
    WSClient.prototype._open = function () {
        this._ws = new WebSocket(this._url);
        this._ws.onopen = this._onopen;
        this._ws.onmessage = this._onmessage;
        this._ws.onclose = this._onclose;
        this._ws.onerror = this._onerror;
    };
    WSClient.prototype._onopen = function (ev) {
        console.log('websocket connection established.');
        var inst = WSClient.instance();
        inst._sequenceNumber = 0;
        inst.login(inst._accountInfo);
        inst._heartbeatTimer = setInterval(function () {
            inst.ping('ping');
        }, inst._heartbeatIntervalSeconds * 1000);
        if (inst._cachedPackages.length) {
            inst._cachedPackages.forEach(function (buf) {
                var _a;
                (_a = inst._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
            });
        }
    };
    WSClient.prototype._onerror = function (ev) {
        console.log('websocket connection broken with error', ev);
        var inst = WSClient.instance();
        setTimeout(function () {
            inst.reconnect();
        }, inst._reconnectInteervalSeconds * 1000);
    };
    WSClient.prototype._onclose = function (ev) {
        console.log('websocket connection closed with error', ev);
        var inst = WSClient.instance();
        var reconnecting = true;
        inst._skipReconnectingCodes.forEach(function (code) {
            if (code === inst._lastResponseCode) {
                console.log('skip reconnecting.');
                reconnecting = false;
                inst._closeHeartbeat();
                if (null !== inst._onCloseListener) {
                    inst._onCloseListener();
                }
                return;
            }
        });
        if (reconnecting) {
            setTimeout(function () {
                inst.reconnect();
            }, inst._reconnectInteervalSeconds * 1000);
        }
    };
    WSClient.prototype._onmessage = function (ev) {
        // console.log('receiving data', ev.data)
        var inst = WSClient.instance();
        if (ev.data.text) {
            ev.data.text().then(function (data) {
                inst._on_received_data(data);
            }).catch(function (e) {
                console.log('read received message failed with error', e);
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
        console.log('received data', data);
        if ('pong' === data) {
            return;
        }
        var msg = {};
        var inst = WSClient.instance();
        try {
            msg = JSON.parse(data);
        }
        catch (e) {
            console.log('parse received data failed', e);
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
                console.log('received message failed with code', msg.code, msg.message);
            }
            // emmits
            var channelField_1 = inst._subscribingChannelMessageField;
            if (msg[channelField_1] !== undefined && inst._subscribes[msg[channelField_1]]) {
                inst._subscribes[msg[channelField_1]].forEach(function (cbWrapper, idx, cbsArray) {
                    if (cbWrapper.cb) {
                        cbWrapper.cb(msg);
                    }
                    if (cbWrapper.isCallOnce) {
                        cbsArray.splice(idx, 1);
                        if (cbsArray.length <= 0) {
                            delete inst._subscribes[msg[channelField_1]];
                        }
                    }
                });
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
    function WsPackage(cmd, agent, seq, message) {
        this.len = 0;
        this.cmd = 0;
        this.agent = 0;
        this.flag = 0;
        this.seq = 0;
        this.crc = 0;
        this.cmd = cmd;
        this.agent = agent;
        this.seq = seq;
        this.message = message;
    }
    WsPackage.prototype.encode = function () {
        var msgbuf = new TextEncoder().encode(this.message);
        this.len = 16 + msgbuf.length;
        var buf = new Uint8Array(this.len);
        var hdr = new ArrayBuffer(16);
        var view = new DataView(hdr, 0, 16);
        view.setUint32(0, this.len, false);
        view.setUint16(4, this.cmd, false);
        view.setUint8(6, this.agent);
        view.setUint8(7, this.flag);
        view.setUint32(8, this.seq, false);
        view.setUint32(12, this.crc, false);
        buf.set(new Uint8Array(hdr), 0);
        buf.set(msgbuf, 16);
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
        this.message = new TextDecoder('utf-8').decode(payload.slice(16));
        return true;
    };
    return WsPackage;
}());
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
    wsInst.init(AgentTypeWeb, 'yixiaobao')
    wsInst.enablePackageHead(true)
    wsInst.setLoginBizCode('a1001')
    wsInst.setLogoutBizCode('a1003')
    wsInst.setSkipReconnectingCodes([19014])
    wsInst.subscribe('a1001', onLogin)
    wsInst.subscribe('a1003', onLogout)
    wsInst.open('ws://192.168.31.175:8036/ws/index', {username: username, password: password})
    wsInst.ping('ping')

    // WSClient.instance().subscribe('a1005', onServerTime)
    // WSClient.instance().send(200, {
    //     requestId: 'uuid',
    //     userAgent: 'miaozhenadmin',
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
