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
