(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageCmdLogout = exports.MessageCmdLogin = exports.MessageCmdPING = exports.AgentTypeNWWeb = exports.AgentTypeApp = exports.AgentTypeWeb = exports.WSClient = void 0;
const AgentTypeWeb = 0;
exports.AgentTypeWeb = AgentTypeWeb;
const AgentTypeApp = 1;
exports.AgentTypeApp = AgentTypeApp;
const AgentTypeNWWeb = 2;
exports.AgentTypeNWWeb = AgentTypeNWWeb;
const MessageCmdPING = 100;
exports.MessageCmdPING = MessageCmdPING;
const MessageCmdLogin = 102;
exports.MessageCmdLogin = MessageCmdLogin;
const MessageCmdLogout = 103;
exports.MessageCmdLogout = MessageCmdLogout;
/**
 * WebSocket client wrapper
 */
class WSClient {
    constructor() {
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
    }
    /**
     * singleton instance
     */
    static instance() {
        if (WSClient._instance) {
            return WSClient._instance;
        }
        WSClient._instance = new WSClient();
        return WSClient._instance;
    }
    /**
     * initialize WebSocket client with agent type
     * @param agentType agent type
     * @param agentText agent text
     */
    init(agentType, agentText) {
        this._agentType = agentType;
        this._agentText = agentText;
    }
    /**
     * Enabling wrapping package head or not
     * @param enabled boolean
     */
    enablePackageHead(enabled) {
        this._enablePackageHead = enabled;
    }
    /**
     * Set codes got responsed from server that should skip reconnecting on close
     * @param codes array of number
     */
    setSkipReconnectingCodes(codes) {
        this._skipReconnectingCodes = codes;
    }
    /**
     * Opening a websocket connection, if the connection were established or connecting,
     * it would do the recoonect operation.
     * @param url websocket url
     * @param userName
     * @param password
     */
    open(url, userName, password) {
        this._url = url;
        if (this._ws) {
            return this.reconnect(userName, password);
        }
        this._accountInfo.username = userName;
        this._accountInfo.password = password;
        console.log('opening', this._url);
        this._open();
    }
    /**
     * Reconnect the websocket connection
     * @param userName
     * @param password
     */
    reconnect(userName, password) {
        this._accountInfo.username = userName;
        this._accountInfo.password = password;
        console.log('reconnecting to', this._url);
        this.close();
        this._open();
    }
    /**
     * Close the websocket connection
     */
    close() {
        if (this._ws) {
            this._ws.onopen = null;
            this._ws.onmessage = null;
            this._ws.onclose = null;
            this._ws.onerror = null;
            if (this._heartbeatTimer) {
                clearInterval(this._heartbeatTimer);
            }
            if (this._ws.readyState == WebSocket.OPEN || this._ws.readyState == WebSocket.CONNECTING) {
                this._ws.close();
            }
            this._ws = null;
        }
    }
    /**
     * Subscribe a channel
     * @param channel
     * @param cb
     */
    subscribe(channel, cb) {
        if (this._subscribes[channel]) {
            this._subscribes[channel].push(cb);
        }
        else {
            this._subscribes[channel] = [cb];
        }
    }
    /**
     * Unsubscribe a channel registered callback
     * @param channel
     * @param cb
     */
    unsubscribe(channel, cb) {
        if (this._subscribes[channel]) {
            const idx = this._subscribes[channel].indexOf(cb);
            if (idx >= 0) {
                this._subscribes[channel].splice(idx, 1);
            }
        }
    }
    /**
     * Send login data
     * @param userName
     * @param password
     */
    login(userName, password) {
        let msg = {
            requestId: 'id-login',
            userAgent: this._agentText,
            bizCode: this._bizCodeLogin,
            data: this._accountInfo
        };
        this.send(MessageCmdLogin, msg);
    }
    /**
     * Send logout data
     */
    logout() {
        let msg = {
            requestId: 'id-logout',
            userAgent: this._agentText,
            bizCode: this._bizCodeLogout,
        };
        this.send(MessageCmdLogout, msg);
    }
    /**
     * Send biz data
     * @param cmd operation code
     * @param message
     */
    send(cmd, message) {
        if (typeof (message) !== 'string') {
            message = JSON.stringify(message);
        }
        let buf;
        if (this._enablePackageHead) {
            let wspkg = new WsPackage(cmd, this._agentType, this._sequenceNumber, message);
            buf = wspkg.encode();
        }
        else {
            let msgbuf = new TextEncoder().encode(message);
            buf = msgbuf;
        }
        if (null === this._ws || this._ws.readyState != WebSocket.OPEN) {
            console.log('websocket were not ready, caching the message', message);
            this._cachedPackages.push(buf);
            return;
        }
        this._ws.send(buf);
    }
    /**
     * Send ping data to keepalive from server
     * @param data
     */
    ping(data) {
        this.send(MessageCmdPING, 'ping');
    }
    /**
     * Set bizcode for login package
     * @param bizCode
     */
    setLoginBizCode(bizCode) {
        this._bizCodeLogin = bizCode;
    }
    /**
     * Set bizcode for logout package
     * @param bizCode
     */
    setLogoutBizCode(bizCode) {
        this._bizCodeLogout = bizCode;
    }
    _open() {
        this._ws = new WebSocket(this._url);
        this._ws.onopen = this._onopen;
        this._ws.onmessage = this._onmessage;
        this._ws.onclose = this._onclose;
        this._ws.onerror = this._onerror;
    }
    _onopen(ev) {
        console.log('websocket connection established.');
        const inst = WSClient.instance();
        inst._sequenceNumber = 0;
        inst.login(inst._accountInfo.username, inst._accountInfo.password);
        inst._heartbeatTimer = setInterval(() => {
            inst.ping('ping');
        }, inst._heartbeatIntervalSeconds * 1000);
        if (inst._cachedPackages.length) {
            inst._cachedPackages.forEach((buf) => {
                var _a;
                (_a = inst._ws) === null || _a === void 0 ? void 0 : _a.send(buf);
            });
        }
    }
    _onmessage(ev) {
        ev.data.text().then((data) => {
            console.log('received data', data);
            let msg = {};
            const inst = WSClient.instance();
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
                            let msgData = JSON.parse(msg.data);
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
                if (msg.bizCode !== undefined && inst._subscribes[msg.bizCode]) {
                    inst._subscribes[msg.bizCode].forEach(cb => {
                        cb(msg);
                    });
                }
            }
        }).catch((e) => {
            console.log('read received message failed with error', e);
        });
    }
    _onerror(ev) {
        console.log('websocket connection broken with error', ev);
        const inst = WSClient.instance();
        setTimeout(() => {
            inst.reconnect(inst._accountInfo.username, inst._accountInfo.password);
        }, inst._reconnectInteervalSeconds * 1000);
    }
    _onclose(ev) {
        console.log('websocket connection closed with error', ev);
        const inst = WSClient.instance();
        inst._skipReconnectingCodes.forEach((code) => {
            if (code === inst._lastResponseCode) {
                console.log('skip reconnecting.');
                return;
            }
        });
        setTimeout(() => {
            inst.reconnect(inst._accountInfo.username, inst._accountInfo.password);
        }, inst._reconnectInteervalSeconds * 1000);
    }
}
exports.WSClient = WSClient;
class WsPackage {
    constructor(cmd, agent, seq, message) {
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
    encode() {
        this.len = 16 + this.message.length;
        let buf = new Uint8Array(this.len);
        let hdr = new ArrayBuffer(16);
        const view = new DataView(hdr, 0, 16);
        view.setUint32(0, this.len, false);
        view.setUint16(4, this.cmd, false);
        view.setUint8(6, this.agent);
        view.setUint8(7, this.flag);
        view.setUint32(8, this.seq, false);
        view.setUint32(12, this.crc, false);
        let msgbuf = new TextEncoder().encode(this.message);
        buf.set(new Uint8Array(hdr), 0);
        buf.set(msgbuf, 16);
        // console.log('serialized data', this.len, buf)
        return buf.buffer;
    }
    decode(payload) {
        const view = new DataView(payload);
        this.len = view.getUint32(0, false);
        this.cmd = view.getUint16(4, false);
        this.agent = view.getUint8(6);
        this.flag = view.getUint8(7);
        this.seq = view.getUint32(8, false);
        this.crc = view.getUint32(12, false);
        this.message = new TextDecoder('utf-8').decode(payload.slice(16));
        return true;
    }
}

},{}],2:[function(require,module,exports){
const { WSClient, AgentTypeWeb } = require('../dist/wsclient')

const test = () => {
    const wsInst = WSClient.instance()
    wsInst.init(AgentTypeWeb, 'web')
    wsInst.enablePackageHead(true)
    wsInst.setLoginBizCode('a1001')
    wsInst.setLogoutBizCode('a1003')
    wsInst.setSkipReconnectingCodes([19014])
    wsInst.subscribe('a1001', onLogin)
    wsInst.subscribe('a1003', onLogout)
    wsInst.open('ws://127.0.0.1:8036/ws/index', '00000420', '000420')
    wsInst.ping('ping')
}

const onLogin = (msg) => {
    console.log('login response', msg)
}

const onLogout = (msg) => {
    console.log('logout response', msg)
}

test()

},{"../dist/wsclient":1}]},{},[2]);
