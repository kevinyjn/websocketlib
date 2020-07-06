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
