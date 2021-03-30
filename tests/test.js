const { WSClient, AgentTypeWeb } = require('../dist/wsclient')

const testInit = (username, password) => {
    const wsInst = WSClient.instance()
    wsInst.init(AgentTypeWeb, 'yixiaobao')
    wsInst.enablePackageHead(true)
    wsInst.setLoginBizCode('a1001')
    wsInst.setLogoutBizCode('a1003')
    wsInst.setSkipReconnectingCodes([19014])
    wsInst.setSubscribingChannelMessageField('bizCode')
    wsInst.subscribe('a1001', onLogin, false)
    wsInst.subscribe('a1003', onLogout)
    wsInst.setHeartbeatIntervalSeconds(170)
    wsInst.open('ws://127.0.0.1:8036/ws/index', {username: username, password: password})
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
