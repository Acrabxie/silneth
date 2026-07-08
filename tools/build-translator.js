// 确定性组装 silneth-translator.html —— 由 5 个部件重建单文件翻译器。
// 部件：translator-head.html + 词库 JSON + 英文释义 JSON + 引擎 JS + UI JS。
// 关键：注入 window.SILNETH_EN_GLOSS，否则浏览器里英文直译会退化。
'use strict';
const fs = require('fs');
const path = require('path');
const D = __dirname;
const rd = (f) => fs.readFileSync(path.join(D, f), 'utf8');
const guard = (s) => s.replace(/<\/script>/gi, '<\\/script>'); // 防脚本闭合被 JSON/JS 里的字面量截断

const head = rd('translator-head.html').replace(/\s+$/, '');
const lex = guard(rd('silneth-lexicon.json').trim());
const eng = guard(rd('silneth-en-gloss.json').trim());
const engine = guard(rd('silneth-engine.js').replace(/\s+$/, ''));
const ui = guard(rd('translator-ui.js').replace(/\s+$/, ''));

const out = [
  '<meta charset="utf-8">',
  head,
  '',
  '<script>',
  'window.SILNETH_LEXICON = ' + lex + ';',
  '</script>',
  '',
  '<script>',
  'window.SILNETH_EN_GLOSS = ' + eng + ';',
  '</script>',
  '',
  '<script>',
  engine,
  '</script>',
  '',
  '<script>',
  ui,
  '</script>',
  ''
].join('\n');

fs.writeFileSync(path.join(D, 'silneth-translator.html'), out, 'utf8');
console.log('已组装 silneth-translator.html:', out.length, '字节 /', out.split('\n').length, '行');
console.log('含 SILNETH_EN_GLOSS:', /window\.SILNETH_EN_GLOSS/.test(out));
console.log('含 translateEn:', /translateEn/.test(out));
console.log('含 English 切换:', /data-v="en"/.test(out));
