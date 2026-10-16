const store = require('./lib/store');
const config = require('./config');
App({
  onLaunch() {
    if (config.cloudEnv && wx.cloud) wx.cloud.init({ env: config.cloudEnv, traceUser: false });
    wx.onNetworkStatusChange(({ isConnected }) => { if (isConnected) store.sync().catch(() => {}); });
  },
  onShow() { store.sync().catch(() => {}); }
});
