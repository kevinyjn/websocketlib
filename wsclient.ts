
const AgentTypeWeb: number = 0;
const AgentTypeApp: number = 1;
const AgentTypeNWWeb: number = 2;

const MessageCmdPING: number = 100;
const MessageCmdServerTime: number = 101;
const MessageCmdLogin: number = 102;
const MessageCmdLogout: number = 103;
const MessageCmdBiz: number = 200;

const ResultCodeSuccess: number = 0;

/**
 * WebSocket client wrapper
 */
class WSClient {
  private static _instance : WSClient
  private _ws : WebSocket | null = null
  private _url : string = ''
  private _accountInfo : {[key: string]: string} = {
    username: '',
    password: '',
  }
  private _heartbeatTimer : number = 0
  private _heartbeatIntervalSeconds : number = 30
  private _reconnectIntervalSeconds : number = 1
  private _subscribes: { [key: string]: CallbackWrapper[] } = {}
  private _agentType: number = AgentTypeWeb
  private _agentText: string = 'web'
  private _messageCmdLogin: number = MessageCmdLogin
  private _messageCmdLogout: number = MessageCmdLogout
  private _bizCodeLogin: string = 'a1001'
  private _bizCodeLogout: string = 'a1003'
  private _sequenceNumber: number = 0
  private _pendingPackages: ArrayBuffer[] = []
  private _enablePackageHead: boolean = false
  private _skipReconnectingCodes: number[] = []
  private _lastResponseCode: number = 0
  private _subscribingChannelMessageField: string = 'requestId'
  private _onDisconnectedListener: Function|null = null
  private _cleanSubscribesOnOpen: boolean = true
  private _cleanPendingsOnClose: boolean = true
  private _enableDebugLog: boolean = false

  constructor() {
    this._accountInfo = {
      username: '',
      password: '',
    }
    this._heartbeatTimer = 0
    this._heartbeatIntervalSeconds = 30
    this._reconnectIntervalSeconds = 1
    this._subscribes = {}
    this._agentType = AgentTypeWeb
    this._agentText = 'web'
    this._messageCmdLogin = MessageCmdLogin
    this._messageCmdLogout = MessageCmdLogout
    this._bizCodeLogin = 'a1001'
    this._bizCodeLogout = 'a1003'
    this._sequenceNumber = 0
    this._pendingPackages = []
    this._enablePackageHead = false
    this._skipReconnectingCodes = []
    this._lastResponseCode = 0
    this._subscribingChannelMessageField = 'requestId'
    this._onDisconnectedListener = null
    this._cleanSubscribesOnOpen = true
    this._cleanPendingsOnClose = true
    this._enableDebugLog = false
  }

  /**
   * singleton instance
   */
  public static instance(): WSClient {
    if (WSClient._instance) {
      return WSClient._instance
    }
    WSClient._instance = new WSClient()
    return WSClient._instance
  }

  /**
   * initialize WebSocket client with agent type
   * @param agentType agent type
   * @param agentText agent text
   */
  public init(agentType: number, agentText: string) {
    this._agentType = agentType
    this._agentText = agentText
  }

  /**
   * Enabling wrapping package head or not
   * @param enabled boolean
   */
  public enablePackageHead(enabled: boolean) {
    this._enablePackageHead = enabled
  }

  /**
   * Enabling debug log if true
   * @param enabled boolean
   */
  public enableDebugLog(enabled: boolean) {
    this._enableDebugLog = enabled
  }

  /**
   * Set codes got responsed from server that should skip reconnecting on close
   * @param codes array of number
   */
  public setSkipReconnectingCodes(codes: number[]) {
    this._skipReconnectingCodes = codes
  }

  /**
   * Set field name for message to detect callback function subscribed by channel
   * @param channelField 
   */
  public setSubscribingChannelMessageField(channelField: string) {
    this._subscribingChannelMessageField = channelField
  }

  /**
   * Set callback function that could process return to login page when connection closed without reconnecting
   * @param cb function that could process return to login page when connection closed without reconnecting
   */
  public setOnDisconnectedListener(cb: Function) {
    this._onDisconnectedListener = cb
  }

  /**
   * Opening a websocket connection, if the connection were established or connecting, 
   * it would do the recoonect operation.
   * @param url websocket url
   * @param accountInfo 
   */
  public open(url: string, accountInfo: any) {
    this._url = url
    this._accountInfo = accountInfo
    if (this._ws) {
      if (this._ws.readyState == WebSocket.CONNECTING) {
        return
      }
      return this.reconnect()
    }
    console.log('opening', this._url)
    if (this._cleanSubscribesOnOpen) {
      this.cleanAllSubscribes()
    }
    this._open()
  }

  /**
   * Reconnect the websocket connection
   */
  public reconnect() {
    console.log('reconnecting to', this._url)
    this.close()
    this._open()
  }

  /**
   * Close the websocket connection
   */
  public close() {
    if (this._ws) {
      this._ws.onopen = null
      this._ws.onmessage = null
      this._ws.onclose = null
      this._ws.onerror = null
      this._closeHeartbeat()
      if (this._cleanPendingsOnClose) {
        this._pendingPackages = []
      }
      if (this._ws.readyState == WebSocket.OPEN || this._ws.readyState == WebSocket.CONNECTING) {
        this._ws.close()
      }
      this._ws = null
    }
  }

  /**
   * Subscribe a channel
   * @param channel 
   * @param cb 
   * @param isCallOnce defaults true, if callback once, the subscribed callback function would be unsubscribed
   */
  public subscribe(channel: string, cb: Function, isCallOnce: boolean = true) {
    if (this._subscribes[channel]) {
      if (this._getCallbackIndex(this._subscribes[channel], cb) < 0) {
        this._subscribes[channel].push(new CallbackWrapper(cb, isCallOnce))
      }
    } else {
      this._subscribes[channel] = [new CallbackWrapper(cb, isCallOnce)]
    }
  }

  /**
   * Unsubscribe a channel registered callback
   * @param channel 
   * @param cb 
   */
  public unsubscribe(channel: string, cb: Function) {
    if (this._subscribes[channel]) {
      const idx = this._getCallbackIndex(this._subscribes[channel], cb)
      if (idx >= 0) {
        this._subscribes[channel].splice(idx, 1)
        if (this._subscribes[channel].length <= 0) {
          delete this._subscribes[channel]
        }
      }
    }
  }

  /**
   * Send login data
   * @param accountInfo 
   */
  public login(accountInfo: any) {
    let msg = {
      requestId: 'id-login',
      userAgent: this._agentText,
      bizCode: this._bizCodeLogin,
      data: accountInfo
    }
    this.send(this._messageCmdLogin, msg)
  }

  /**
   * Send logout data
   */
  public logout() {
    let msg = {
      requestId: 'id-logout',
      userAgent: this._agentText,
      bizCode: this._bizCodeLogout,
    }
    this.send(this._messageCmdLogout, msg)
  }

  /**
   * Send biz data
   * @param cmd operation code
   * @param message 
   */
  public send(cmd: number, message: any) {
    if (typeof (message) !== 'string') {
      message = JSON.stringify(message)
    }
    let buf: ArrayBuffer;
    if (this._enablePackageHead) {
      this._sequenceNumber++
      let wspkg = new WsPackage(cmd, this._agentType, this._sequenceNumber, message)
      buf = wspkg.encode()
    } else {
      let msgbuf = new TextEncoder().encode(message)
      buf = msgbuf;
    }
    if (null === this._ws || this._ws.readyState != WebSocket.OPEN) {
      const stateText = null === this._ws ? 'opened' : 'ready'
      console.warn(`websocket were not ${stateText}, pending the message`, message)
      this._pendingPackages.push(buf)
      return
    }
    this._ws.send(buf)
  }

  /**
   * Send a business message using default MessageCmdBiz message cmd and subscribes a callback function for callback once
   * @param message 
   * @param channel 
   * @param cb 
   */
  public sendWithCallback(message: any, channel: string, cb: Function) {
    let cbIdx: number = -1
    if (this._subscribes[channel]) {
      cbIdx = this._getCallbackIndex(this._subscribes[channel], cb)
    }
    if (cbIdx < 0) {
      this.subscribe(channel, cb, true)
    }
    this.send(MessageCmdBiz, message)
  }

  /**
   * Send ping data to keepalive from server
   * @param data
   */
  public ping(data: string) {
    this.send(MessageCmdPING, 'ping')
  }

  /**
   * Set message cmd field value for login
   * @param cmd 
   */
  public setMessageCmdLogin(cmd: number) {
    this._messageCmdLogin = cmd
  }

  /**
   * Set message cmd field value for logout
   * @param cmd 
   */
  public setMessageCmdLogout(cmd: number) {
    this._messageCmdLogout = cmd
  }

  /**
   * Set bizcode for login package
   * @param bizCode 
   */
  public setLoginBizCode(bizCode: string) {
    this._bizCodeLogin = bizCode
  }
  
  /**
   * Set bizcode for logout package
   * @param bizCode 
   */
  public setLogoutBizCode(bizCode: string) {
    this._bizCodeLogout = bizCode
  }

  /**
   * Clean suscribes on open websocket if true
   * @param enable 
   */
  public setCleanSubscribesOnOpen(enable: boolean) {
    this._cleanSubscribesOnOpen = enable
  }

  /**
   * Clean all subscribes
   */
  public cleanAllSubscribes() {
    this._subscribes = {}
  }

  private _open() {
    this._ws = new WebSocket(this._url)
    this._ws.onopen = this._onopen
    this._ws.onmessage = this._onmessage
    this._ws.onclose = this._onclose
    this._ws.onerror = this._onerror
    if (this._cleanPendingsOnClose) {
      this._pendingPackages = []
    }
  }

  private _onopen(ev: Event) {
    console.log('websocket connection established.')
    const inst = WSClient.instance()
    inst._sequenceNumber = 0;
    inst.login(inst._accountInfo)
    inst._heartbeatTimer = setInterval(() => {
      inst.ping('ping')
    }, inst._heartbeatIntervalSeconds * 1000)
    if (inst._pendingPackages.length) {
      let pendings = inst._pendingPackages
      pendings.forEach((buf) => {
        inst._ws?.send(buf)
      })
      inst._pendingPackages = [];
    }
  }

  private _onerror(ev: Event) {
    console.warn('websocket connection broken with error', ev)
    const inst = WSClient.instance()
    setTimeout(() => {
      inst.reconnect()
    }, inst._reconnectIntervalSeconds * 1000)
  }

  private _onclose(ev: CloseEvent) {
    console.warn('websocket connection closed with error', ev)
    const inst = WSClient.instance()
    let reconnecting: boolean = true
    if (inst._cleanPendingsOnClose) {
      inst._pendingPackages = []
    }
    inst._skipReconnectingCodes.forEach((code) => {
      if (code === inst._lastResponseCode) {
        if (inst._enableDebugLog) {
          console.log('skip reconnecting.')
        }
        reconnecting = false
        inst._closeHeartbeat()
        if (null !== inst._onDisconnectedListener) {
          inst._onDisconnectedListener(code)
        }
        return
      }
    })
    if (reconnecting) {
      setTimeout(() => {
        inst.reconnect()
      }, inst._reconnectIntervalSeconds * 1000)
    } else {
      inst.close()
    }
  }

  private _onmessage(ev: MessageEvent) {
    const inst = WSClient.instance()
    if (ev.data.text) {
      ev.data.text().then((data: any) => {
        inst._on_received_data(data)
      }).catch((e: any) => {
        console.error('read received message failed with error', e)
      })
    } else if (typeof (ev.data) === 'string') {
      inst._on_received_data(ev.data)
    } else {
      let reader: FileReader = new FileReader()
      reader.readAsText(ev.data, 'utf-8')
      reader.onload = function (e) {
        inst._on_received_data(reader.result)
      }
    }
  }

  private _on_received_data(data: any) {
    if (this._enableDebugLog) {
      console.log('received data', data)
    }
    if ('pong' === data) {
      return
    }
    let msg: any = {}
    const inst = WSClient.instance()
    try {
      msg = JSON.parse(data)
    } catch (e) {
      console.error('parse received data failed', e)
    }
    
    if (msg.code !== undefined) {
      inst._lastResponseCode = msg.code
      if (msg.code === 0) {
        if (typeof (msg.data) === 'string') {
          try {
            let msgData = JSON.parse(msg.data)
            msg.data = msgData
          } catch (e) {
            // pass
          }
        }
      } else {
        console.warn('received message failed with code', msg.code, msg.message)
      }

      // emmits
      let channelValue = msg[inst._subscribingChannelMessageField]
      if (channelValue !== undefined && inst._subscribes[channelValue]) {
        let currentCallbacks: CallbackWrapper[] = []
        inst._subscribes[channelValue].forEach((cbWrapper: CallbackWrapper, idx: number, cbsArray: CallbackWrapper[]) => {
          currentCallbacks.push(cbWrapper)
        })
        inst._subscribes[channelValue] = []
        currentCallbacks.forEach((cbWrapper: CallbackWrapper, idx: number, cbsArray: CallbackWrapper[]) => {
          if (cbWrapper.cb) {
            cbWrapper.cb(msg)
            if (!cbWrapper.isCallOnce) {
              inst._subscribes[channelValue].push(cbWrapper)
            }
          }
        });
        if (inst._subscribes[channelValue].length <= 0) {
          delete inst._subscribes[channelValue]
        }
      }
    }
  }

  private _closeHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer)
      this._heartbeatTimer = 0
    }
  }

  private _getCallbackIndex(subscribes: CallbackWrapper[], cb: Function): number {
    let idx: number = -1
    for (let i: number = 0; i < subscribes.length; i++) {
      if (subscribes[i].cb === cb) {
        idx = i
        break
      }
    }
    return idx
  }

}

class WsPackage {
  public len: number = 0;
  public cmd: number = 0;
  public agent: number = 0;
  public flag: number = 0;
  public seq: number = 0;
  public crc: number = 0;
  public message: string;

  public constructor(cmd: number, agent: number, seq: number, message: any) {
    this.cmd = cmd
    this.agent = agent
    this.seq = seq
    this.message = message
  }

  public encode(): ArrayBuffer {
    let msgbuf = new TextEncoder().encode(this.message)
    this.len = 16 + msgbuf.length
    this.crc = crc32(this.message)
    let buf = new Uint8Array(this.len)
    let hdr = new ArrayBuffer(16)
    const view = new DataView(hdr, 0, 16)
    view.setUint32(0, this.len, false)
    view.setUint16(4, this.cmd, false)
    view.setUint8(6, this.agent)
    view.setUint8(7, this.flag)
    view.setUint32(8, this.seq, false)
    view.setUint32(12, this.crc, false)
    buf.set(new Uint8Array(hdr), 0)
    buf.set(msgbuf, 16)
    // console.log('serialized data', this.len, buf)
    return buf.buffer
  }

  public decode(payload: ArrayBuffer): boolean {
    const view = new DataView(payload)
    this.len = view.getUint32(0, false)
    this.cmd = view.getUint16(4, false)
    this.agent = view.getUint8(6)
    this.flag = view.getUint8(7)
    this.seq = view.getUint32(8, false)
    this.crc = view.getUint32(12, false)
    this.message = new TextDecoder('utf-8').decode(payload.slice(16))
    return true
  }
}

const makeCRCTable = function(): number[] {
  let c: number;
  let crcTable: number[] = [];
  for(let n: number = 0; n < 256; n++){
      c = n;
      for(let k: number = 0; k < 8; k++){
          c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
  }
  return crcTable
}

let gCrcTable: number[] = makeCRCTable()

const crc32 = function(str: string): number {
  let crcTable: number[] = gCrcTable || (gCrcTable = makeCRCTable());
  let crc: number = 0 ^ (-1);

  for (let i: number = 0; i < str.length; i++ ) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
  }

  return (crc ^ (-1)) >>> 0;
}

class CallbackWrapper {
  public cb: Function | null = null;
  public isCallOnce: boolean = false;

  constructor(cb: Function, isCallOnce: boolean = true) {
    this.cb = cb
    this.isCallOnce = isCallOnce
  }
}

export {
  WSClient,
  AgentTypeWeb,
  AgentTypeApp,
  AgentTypeNWWeb,
  MessageCmdPING,
  MessageCmdServerTime,
  MessageCmdLogin,
  MessageCmdLogout,
  MessageCmdBiz,
  ResultCodeSuccess
}
