Component({
  data: { selected: 0, tabs: [
    { text: '今日', path: '/pages/today/index', icon: 'today' },
    { text: '计划', path: '/pages/plan/index', icon: 'plan' },
    { text: '记录', path: '/pages/records/index', icon: 'records' },
    { text: '我的', path: '/pages/me/index', icon: 'me' }
  ] },
  lifetimes: { attached() {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current) { const index = this.data.tabs.findIndex(tab => tab.path === '/' + current.route); if (index >= 0) this.setData({ selected: index }); }
  } },
  methods: { select(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index === this.data.selected || !this.data.tabs[index]) return;
    wx.switchTab({ url: this.data.tabs[index].path, success: () => this.setData({ selected: index }), fail: () => wx.showToast({ title: '页面打开失败，请重试', icon: 'none' }) });
  } }
});
