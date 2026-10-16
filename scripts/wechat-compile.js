// 使用已安装的微信开发者工具自带编译器验证 WXML / WXSS。
// 用法：node scripts/wechat-compile.js "D:/微信web开发者工具"
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const install = process.argv[2];
if (!install) {
  console.error('请提供微信开发者工具安装目录');
  process.exit(1);
}
const root = path.resolve(__dirname, '..', 'miniprogram');
const bin = path.join(install, 'resources', 'app.asar.unpacked', 'node_modules', 'wcc-exec');
const pages = require('../miniprogram/app.json').pages;
let failed = false;
function compile(executable, files, label) {
  const file = path.join(bin, executable);
  if (!fs.existsSync(file)) throw new Error('未找到编译器：' + file);
  const result = cp.spawnSync(file, files, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    failed = true;
    console.error('FAIL ' + label, result.error || result.stderr || result.stdout);
  } else console.log('PASS ' + label);
}
pages.forEach(page => compile('wcc.exe', [page + '.wxml'], page));
compile('wcsc.exe', ['app.wxss', ...pages.map(page => page + '.wxss')], 'WXSS');
process.exitCode = failed ? 1 : 0;
