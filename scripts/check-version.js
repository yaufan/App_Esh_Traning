#!/usr/bin/env node
/**
 * 版本號要三處一致才可以發布：
 *   app.json 的 expo.version、package.json 的 version、CHANGELOG.md 最上面一段「## X.Y.Z …」。
 * 發布工作流程和 `npm run check` 都會跑這支。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');

const top = changelog.match(/^## (\d+\.\d+\.\d+) /m);
const errors = [];
if (!/^\d+\.\d+\.\d+$/.test(app.version)) errors.push(`app.json expo.version 格式不對：${app.version}`);
if (pkg.version !== app.version) errors.push(`package.json version ${pkg.version} 和 app.json ${app.version} 不一致`);
if (!top) errors.push('CHANGELOG.md 找不到「## X.Y.Z …」段落');
else if (top[1] !== app.version) errors.push(`CHANGELOG.md 最上面一段是 ${top[1]}，app.json 是 ${app.version}`);

if (errors.length) {
  for (const e of errors) console.error('✗ ' + e);
  process.exit(1);
}
console.log(`✓ 版本 ${app.version}：app.json、package.json、CHANGELOG.md 一致`);
