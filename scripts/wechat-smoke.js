// 官方模拟器集成测试。原有本地档案只保存在进程内，finally 中恢复。
// 先用开发者工具 cli auto --project <目录> --auto-port 9420 开启连接。
const assert = require('node:assert/strict');
const automator = require('miniprogram-automator');
const core = require('../miniprogram/lib/core');
const KEY = 'lianshi.v1';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:' + (process.env.WECHAT_AUTO_PORT || '9420') });
  const errors = [];
  mini.on('exception', error => { errors.push(error); console.error('RUNTIME_EXCEPTION', JSON.stringify(error)); });
  const saved = await mini.evaluate(key => wx.getStorageSync(key), KEY);
  if (saved && saved.connected) {
    await mini.disconnect();
    throw Error('请在本地模式副本运行测试，避免改动已连接的云端账户');
  }
  const originalPage = await mini.currentPage();
  await mini.evaluate(() => { getApp().__debugToasts = []; });
  await mini.mockWxMethod('showToast', function (options) {
    getApp().__debugToasts.push(options.title);
    return {};
  });
  // 新版 Electron 开发者工具的 native.confirmModal 未实际关闭弹窗。
  // 默认仅替身原生弹窗返回值；页面、事件、存储和计算均使用实际模拟器。
  const nativeDialogs = process.argv.includes('--native-dialogs');
  if (!nativeDialogs) await mini.mockWxMethod('showModal', { confirm: true, cancel: false, content: '10' });
  async function confirm() { if (nativeDialogs) await mini.native().confirmModal(); }
  let changed = false;
  async function state() { return mini.evaluate(key => wx.getStorageSync(key).state, KEY); }
  async function click(page, selector) {
    await page.waitFor(selector);
    const element = await page.$(selector);
    assert.ok(element, '缺少控件 ' + selector);
    await element.tap();
    await pause(250);
  }
  async function until(predicate, label) {
    for (let i = 0; i < 30; i++) { if (await predicate()) return; await pause(200); }
    const toasts = await mini.evaluate(() => getApp().__debugToasts);
    throw Error('等待超时：' + label + '；页面反馈：' + JSON.stringify(toasts));
  }
  async function open(method, url) {
    await mini[method](url);
    const path = url.split('?')[0].replace(/^\//, '');
    let page;
    await until(async () => {
      page = await mini.currentPage();
      return page && page.path === path;
    }, '页面进入 ' + path);
    return page;
  }
  try {
    await mini.evaluate((key, value) => wx.setStorageSync(key, value), KEY, { state: core.empty(), rev: 0, connected: false, dirty: false, generation: 0 });
    changed = true;
    let page = await open('reLaunch', '/pages/today/index');
    assert.equal(await page.data('demo'), true);
    console.log('PASS 示例首页');

    page = await open('navigateTo', '/pages/profile/index');
    await page.waitFor('input[data-field="age"]');
    for (const [field, value] of Object.entries({ age: '28', height: '170', weight: '65', minutes: '30' })) {
      await (await page.$('input[data-field="' + field + '"]')).input(value);
    }
    const today = core.dateKey();
    // 本次仅安排当天，便于任意日期运行，不依赖用户原档案。
    for (const day of [1, 3, 5]) await click(page, 'text[data-id="' + day + '"]');
    await click(page, 'text[data-id="' + core.weekday(today) + '"]');
    await (await page.$('checkbox-group')).trigger('change', { value: ['yes'] });
    await click(page, 'button.dark');
    if (process.env.DEBUG_CONFIRM) await mini.screenshot({ path: 'docs/debug-profile-confirm.png' });
    await confirm();
    await until(async () => !!(await state()).profile, '建档保存');
    assert.equal(Object.keys((await state()).plans).length, 7);
    console.log('PASS 表单输入与七日计划生成');

    page = await open('navigateTo', '/pages/workout/index?date=' + today);
    await click(page, 'button.dark');
    assert.equal((await state()).sessions[today].status, '进行中');
    await click(page, 'button.dark[data-index="0"]');
    await confirm();
    await until(async () => (await state()).sessions[today].exercises[0].logs.length === 1, '记录首组');
    await click(page, 'button.primary');
    const elapsed = await page.data('elapsed');
    await pause(1200);
    assert.equal(await page.data('elapsed'), elapsed);
    await mini.navigateBack();
    page = await open('navigateTo', '/pages/workout/index?date=' + today);
    assert.equal(await page.data('done'), 1);
    assert.equal((await page.data('session')).runningSince, null);
    const endButtons = await page.$$('button.dark');
    let endButton;
    for (const button of endButtons) if ((await button.text()).includes('结束并保存训练')) endButton = button;
    assert.ok(endButton, '缺少结束训练按钮');
    await endButton.tap();
    await confirm();
    await until(async () => (await state()).sessions[today].status === '部分完成', '提前结束');
    console.log('PASS 逐组记录、暂停、退出恢复与提前结束');

    await open('switchTab', '/pages/today/index');
    page = await open('navigateTo', '/pages/meal/index?date=' + today + '&id=breakfast');
    await page.waitFor('input[data-index="0"]');
    await click(page, '.actions .secondary');
    assert.ok((await state()).meals[today + '|breakfast']);
    await (await page.$('input[data-index="0"]')).input('200');
    await click(page, '.actions .dark');
    assert.equal((await state()).meals[today + '|breakfast'].items[0].grams, 200);
    await click(page, '.actions .dark');
    assert.equal(Object.keys((await state()).meals).length, 1);
    console.log('PASS 饮食记录、份量修改与重复保存');

    page = await open('switchTab', '/pages/records/index');
    await page.waitFor('input');
    await (await page.$('input')).input('64.5');
    await click(page, 'button.dark');
    assert.equal((await state()).weights[today].value, 64.5);
    assert.equal((await page.data('week')).partial, 1);
    assert.equal((await page.data('week')).recorded, 1);
    console.log('PASS 体重录入与周统计');
    for (const name of ['plan', 'me', 'today']) {
      page = await open('switchTab', '/pages/' + name + '/index');
      assert.ok(await page.$(name === 'today' ? '.today-week' : '.title'));
    }
    await open('navigateTo', '/pages/privacy/index');
    assert.ok(await (await mini.currentPage()).$('.title'));
    assert.equal(errors.length, 0, '发生小程序运行异常');
    console.log('PASS 主页面路由与隐私说明；无新运行异常');
  } finally {
    await mini.restoreWxMethod('showToast');
    if (!nativeDialogs) await mini.restoreWxMethod('showModal');
    await mini.evaluate(() => { delete getApp().__debugToasts; });
    if (changed) {
      await mini.evaluate((key, value) => { if (value) wx.setStorageSync(key, value); else wx.removeStorageSync(key); }, KEY, saved || null);
      await open('reLaunch', '/pages/today/index');
      const restored = await mini.evaluate(key => wx.getStorageSync(key), KEY);
      // 首页可能自动补齐新日期计划，但已有档案与历史记录必须保持。
      if (saved) {
        assert.deepEqual(restored.state.profile, saved.state.profile);
        assert.deepEqual(restored.state.sessions, saved.state.sessions);
        assert.deepEqual(restored.state.meals, saved.state.meals);
        assert.deepEqual(restored.state.weights, saved.state.weights);
      }
      console.log('RESTORED 原有档案与执行记录已恢复；测试前页面：' + (originalPage && originalPage.path));
    }
    await mini.disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
