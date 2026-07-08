// 批量翻译一篇文本：逐句翻译 + 覆盖率统计 + 缺词收集。
// 用法：node translate-text.js <文件> <zh|en> [--show]   （--show 打印逐句译文）
'use strict';
const fs = require('fs');
const path = require('path');
const E = require(path.join(__dirname, 'silneth-engine.js'));

function sentences(text, lang) {
  const parts = lang === 'en'
    ? text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
    : text.split(/[。！？\n]+/);
  return parts.map(s => s.trim()).filter(Boolean);
}

function run(file, lang, show) {
  const text = fs.readFileSync(file, 'utf8');
  const sents = sentences(text, lang);
  let okCount = 0;
  const gapFreq = {};
  const lines = [];
  for (const s of sents) {
    let res;
    try { res = lang === 'en' ? E.translateEn(s) : E.translateZh(s); }
    catch (e) { res = { ok: false, roman: '', unmatched: [], error: e.message }; }
    if (res.ok) okCount++;
    (res.unmatched || []).forEach(w => { gapFreq[w] = (gapFreq[w] || 0) + 1; });
    lines.push({ src: s, roman: res.roman || '(—)', ok: res.ok, um: res.unmatched || [] });
  }
  const gaps = Object.entries(gapFreq).sort((a, b) => b[1] - a[1]);
  console.log('\n===== ' + path.basename(file) + '（' + lang + '）=====');
  console.log('句数 ' + sents.length + ' ｜ 完整翻译 ' + okCount + ' ｜ 部分/超句型 ' + (sents.length - okCount) + ' ｜ 独立缺词 ' + gaps.length);
  if (show) lines.forEach(l => {
    console.log('  · ' + l.src);
    console.log('    → ' + l.roman + (l.um.length ? '   〔缺：' + l.um.join('、') + '〕' : (l.ok ? '' : '   〔超出句型〕')));
  });
  console.log('  缺词（频次）：' + (gaps.length ? gaps.map(g => g[0] + '×' + g[1]).join('  ') : '（无）'));
  return { file: path.basename(file), lang, sents: sents.length, ok: okCount, gaps };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args[0], lang = args[1] || 'zh', show = args.indexOf('--show') !== -1;
  if (!file) { console.error('用法: node translate-text.js <文件> <zh|en> [--show]'); process.exit(1); }
  run(path.resolve(file), lang, show);
}
module.exports = { run, sentences };
