
const AgentTypeWeb: number = 0;
const AgentTypeApp: number = 1;
const AgentTypeNWWeb: number = 2;

const MessageCmdPING : number = 100;
const MessageCmdLogin : number = 102;
const MessageCmdLogout : number = 103;

/**
 * WebSocket client wrapper
 */
class WSClient {
  private static _instance : WSClient;
  private _ws : WebSocket | null = null;
  private _url : string = '';
  private _accountInfo : {[key: string]: string} = {
    username: '',
    password: '',
  };
  private _heartbeatTimer : number = 0;
  private _heartbeatIntervalSeconds : number = 30;
  private _reconnectInteervalSeconds : number = 1;
  private _subscribes: { [key: string]: Function[] } = {};
  private _agentType: number = AgentTypeWeb;
  private _agentText: string = 'web';
  private _bizCodeLogin: string = 'a1001';
  private _bizCodeLogout: string = 'a1003';
  private _sequenceNumber: number = 0;
  private _cachedPackages: ArrayBuffer[] = [];
  private _enablePackageHead: boolean = false;
  private _skipReconnectingCodes: number[] = [];
  private _lastResponseCode: number = 0;

  constructor() {
    this._accountInfo = {
      username: '',
      password: '',
    }
    this._heartbeatTimer = 0;
    this._heartbeatIntervalSeconds = 30;
    this._reconnectInteervalSeconds = 1;
    this._subscribes = {};
    this._agentType = AgentTypeWeb;
    this._agentText = 'web'
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
   * Set codes got responsed from server that should skip reconnecting on close
   * @param codes array of number
   */
  public setSkipReconnectingCodes(codes: number[]) {
    this._skipReconnectingCodes = codes
  }

  /**
   * Opening a websocket connection, if the connection were established or connecting, 
   * it would do the recoonect operation.
   * @param url websocket url
   * @param userName 
   * @param password 
   */
  public open(url: string, userName: string, password: string) {
    this._url = url
    if (this._ws) {
      return this.reconnect(userName, password)
    }
    this._accountInfo.username = userName
    this._accountInfo.password = password
    console.log('opening', this._url)
    this._open()
  }

  /**
   * Reconnect the websocket connection
   * @param userName 
   * @param password 
   */
  public reconnect(userName: string, password: string) {
    this._accountInfo.username = userName
    this._accountInfo.password = password
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
      if (this._heartbeatTimer) {
        clearInterval(this._heartbeatTimer)
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
   */
  public subscribe(channel: string, cb: Function) {
    if (this._subscribes[channel]) {
      this._subscribes[channel].push(cb)
    } else {
      this._subscribes[channel] = [cb]
    }
  }

  /**
   * Unsubscribe a channel registered callback
   * @param channel 
   * @param cb 
   */
  public unsubscribe(channel: string, cb: Function) {
    if (this._subscribes[channel]) {
      const idx = this._subscribes[channel].indexOf(cb)
      if (idx >= 0) {
        this._subscribes[channel].splice(idx, 1)
      }
    }
  }

  /**
   * Send login data
   * @param userName 
   * @param password 
   */
  public login(userName: string, password: string) {
    let msg = {
      requestId: 'id-login',
      userAgent: this._agentText,
      bizCode: this._bizCodeLogin,
      data: this._accountInfo
    }
    this.send(MessageCmdLogin, msg)
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
    this.send(MessageCmdLogout, msg)
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
      let wspkg = new WsPackage(cmd, this._agentType, this._sequenceNumber, message)
      buf = wspkg.encode()
    } else {
      let msgbuf = new TextEncoder().encode(message)
      buf = msgbuf;
    }
    if (null === this._ws || this._ws.readyState != WebSocket.OPEN) {
      console.log('websocket were not ready, caching the message', message)
      this._cachedPackages.push(buf)
      return
    }
    this._ws.send(buf)
  }

  /**
   * Send ping data to keepalive from server
   * @param data
   */
  public ping(data: string) {
    this.send(MessageCmdPING, 'ping')
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

  private _open() {
    this._ws = new WebSocket(this._url)
    this._ws.onopen = this._onopen
    this._ws.onmessage = this._onmessage
    this._ws.onclose = this._onclose
    this._ws.onerror = this._onerror
  }

  private _onopen(ev: Event) {
    console.log('websocket connection established.')
    const inst = WSClient.instance()
    inst._sequenceNumber = 0;
    inst.login(inst._accountInfo.username, inst._accountInfo.password)
    inst._heartbeatTimer = setInterval(() => {
      inst.ping('ping')
    }, inst._heartbeatIntervalSeconds * 1000)
    if (inst._cachedPackages.length) {
      inst._cachedPackages.forEach((buf) => {
        inst._ws?.send(buf)
      })
    }
  }

  private _onmessage(ev: MessageEvent) {
    ev.data.text().then((data: any) => {
      console.log('received data', data)
      let msg: any = {}
      const inst = WSClient.instance()
      try {
        msg = JSON.parse(data)
      } catch (e) {
        console.log('parse received data failed', e)
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
          console.log('received message failed with code', msg.code, msg.message)
        }

        // emmits
        if (msg.bizCode !== undefined && inst._subscribes[msg.bizCode]) {
          inst._subscribes[msg.bizCode].forEach(cb => {
            cb(msg)
          });
        }
      }
      
    }).catch((e: any) => {
      console.log('read received message failed with error', e)
    })
  }

  private _onerror(ev: Event) {
    console.log('websocket connection broken with error', ev)
    const inst = WSClient.instance()
    setTimeout(() => {
      inst.reconnect(inst._accountInfo.username, inst._accountInfo.password)
    }, inst._reconnectInteervalSeconds * 1000)
  }

  private _onclose(ev: CloseEvent) {
    console.log('websocket connection closed with error', ev)
    const inst = WSClient.instance()
    inst._skipReconnectingCodes.forEach((code) => {
      if (code === inst._lastResponseCode) {
        console.log('skip reconnecting.')
        return
      }
    })
    setTimeout(() => {
      inst.reconnect(inst._accountInfo.username, inst._accountInfo.password)
    }, inst._reconnectInteervalSeconds * 1000)
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
    this.len = 16 + this.message.length
    let buf = new Uint8Array(this.len)
    let hdr = new ArrayBuffer(16)
    const view = new DataView(hdr, 0, 16)
    view.setUint32(0, this.len, false)
    view.setUint16(4, this.cmd, false)
    view.setUint8(6, this.agent)
    view.setUint8(7, this.flag)
    view.setUint32(8, this.seq, false)
    view.setUint32(12, this.crc, false)
    let msgbuf = new TextEncoder().encode(this.message)
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

export {
  WSClient,
  AgentTypeWeb,
  AgentTypeApp,
  AgentTypeNWWeb,
  MessageCmdPING,
  MessageCmdLogin,
  MessageCmdLogout
}
