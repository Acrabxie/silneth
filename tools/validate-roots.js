// Sìlneth 词根音系校验器 —— 与引擎规则一致，供扩库把关。
// 用法：node validate-roots.js            → 自测现有词库（实词应全绿）
//       require 后调用 validateRoot(roman, cls)
'use strict';
const path = require('path');
const E = require(path.join(__dirname, 'silneth-engine.js'));

// 级0 元音（长度降序：双/长优先于短）
const V0 = ['ai', 'au', 'ei', 'oi', 'í', 'ý', 'é', 'ǿ', 'á', 'ó', 'ú', 'i', 'y', 'e', 'ø', 'a', 'o', 'u'];
const VLONG = ['í', 'ý', 'é', 'ǿ', 'á', 'ó', 'ú'];
const VDIPH = ['ai', 'au', 'ei', 'oi'];
const CDIG = ['th', 'sh', 'dh', 'ng'];
const CSINGLE = ['m', 'n', 'ñ', 'p', 't', 'k', 'b', 'd', 'g', 'f', 's', 'h', 'v', 'z', 'l', 'r', 'w', 'j'];
const LEGAL_CODA = ['m', 'n', 'ñ', 'ng', 'l', 'r', 's', 'th'];
// 母语词根声母簇 = 外来词音译修复表 ∪ 现有词库实测（gw hw hl 为母语特有，音译表里没有）。
const LEGAL_ONSET = ['pr', 'pl', 'tr', 'kr', 'kl', 'kw', 'br', 'bl', 'dr', 'gr', 'gl', 'fr', 'fl', 'fj', 'sp', 'st', 'sk', 'thr', 'sw', 'vl', 'kj', 'tj', 'dj', 'sh', 'th', 'dh', 'gw', 'hw', 'hl'];

function match(s, i, list) {
  for (const x of list) if (s.substr(i, x.length) === x) return x;
  return null;
}
// 切分为 [{t:'V'|'C', s}]；含未知字符（如磨蚀形重音）→ null
function tokenize(root) {
  const toks = []; let i = 0;
  while (i < root.length) {
    let m = match(root, i, V0);
    if (m) { toks.push({ t: 'V', s: m }); i += m.length; continue; }
    m = match(root, i, CDIG) || match(root, i, CSINGLE);
    if (m) { toks.push({ t: 'C', s: m }); i += m.length; continue; }
    return null;
  }
  return toks;
}
// 辅音串（音素数组）能否作词内边界：coda?(≤1合法尾) + onset(单辅音 或 合法簇)
function legalMedial(cons) {
  if (cons.length === 1) return true;                       // 单辅音作声母
  if (cons.length === 2) {
    if (LEGAL_ONSET.indexOf(cons.join('')) !== -1) return true;        // 全作合法簇声母
    if (LEGAL_CODA.indexOf(cons[0]) !== -1) return true;              // coda + 单声母
    return false;
  }
  if (cons.length === 3) {                                  // coda + 双簇声母
    return LEGAL_CODA.indexOf(cons[0]) !== -1 && LEGAL_ONSET.indexOf(cons[1] + cons[2]) !== -1;
  }
  return false;
}
function legalOnset(cons) {                                 // 词首辅音串
  if (cons.length === 0) return true;
  if (cons.length === 1) return cons[0] !== 'ng';           // 词首 ng 非法
  if (cons.length === 2) return LEGAL_ONSET.indexOf(cons.join('')) !== -1;
  if (cons.length === 3) return LEGAL_ONSET.indexOf(cons.join('')) !== -1; // thr 等
  return false;
}
function legalCoda(cons) {                                  // 词末辅音串
  if (cons.length === 0) return true;
  if (cons.length === 1) return LEGAL_CODA.indexOf(cons[0]) !== -1;
  if (cons.length === 2) return /^[rl]$/.test(cons[0]) && ['m', 'n', 'ng', 'ñ', 's', 'th'].indexOf(cons[1]) !== -1;
  return false;
}

function validateRoot(roman, cls) {
  const errs = [];
  if (typeof roman !== 'string' || !roman) return { ok: false, errs: ['空'] };
  if (/[A-Z]/.test(roman)) errs.push('含大写');
  if (/ll/.test(roman)) errs.push('禁止的 ll');
  if (/[^a-zíýéǿáóúøñ]/.test(roman)) errs.push('非法字符（词根只用级0字母）');
  const toks = tokenize(roman);
  if (!toks) { errs.push('无法切分（含未知/磨蚀字符）'); return { ok: false, errs }; }
  if (!toks.some(t => t.t === 'V')) errs.push('无元音');
  // 按元音核切分辅音簇群
  const groups = []; let cur = [];
  for (const t of toks) { if (t.t === 'C') cur.push(t.s); else { groups.push(cur); cur = []; } }
  groups.push(cur); // 词末辅音串
  // groups[0]=词首onset, 中间=medial, 末=coda
  if (!legalOnset(groups[0])) errs.push('非法词首簇 [' + groups[0].join('') + ']');
  for (let k = 1; k < groups.length - 1; k++) {
    if (!legalMedial(groups[k])) errs.push('非法词内簇 [' + groups[k].join('') + ']');
  }
  if (!legalCoda(groups[groups.length - 1])) errs.push('非法词末 [' + groups[groups.length - 1].join('') + ']');
  // 强弱根一致性
  const strong = E.isStrong(roman);
  if (cls === 'strong' && !strong) errs.push('声明 strong 但无长元音/双元音');
  if (cls === 'weak' && strong) errs.push('声明 weak 但含长元音/双元音');
  // 引擎推导不崩
  try {
    E.erode(roman, 1); E.erode(roman, 2);
    E.decline(roman, { case: 'ACC' }); E.decline(roman, { case: 'GEN', plural: true });
    E.conjugate(roman, { level: 2, person: 3 });
    if (!Array.isArray(E.toGlyphs(roman)) || E.toGlyphs(roman).length === 0) errs.push('字形渲染为空');
  } catch (e) { errs.push('引擎推导崩溃：' + e.message); }
  return { ok: errs.length === 0, errs, strong };
}

// ---- 确定性 roman→IPA：复现词库手写风格（无重音标单音节/多音节 ˈ+音节点，r=r，双元音带◌̯）----
const NB = '̯'; // 非成音节符
const IPAC = { th: 'θ', dh: 'ð', sh: 'ʃ', ng: 'ŋ', 'ñ': 'ɲ', h: 'x' };
const IPAV = { 'í': 'iː', 'ý': 'yː', 'é': 'eː', 'ǿ': 'øː', 'á': 'aː', 'ó': 'oː', 'ú': 'uː', ai: 'a' + 'i' + NB, au: 'a' + 'u' + NB, ei: 'e' + 'i' + NB, oi: 'o' + 'i' + NB };
function mapTok(t) { if (t.t === 'V') return IPAV[t.s] !== undefined ? IPAV[t.s] : t.s; return IPAC[t.s] !== undefined ? IPAC[t.s] : t.s; }
function romanToIpa(roman) {
  const toks = tokenize(roman);
  if (!toks) return null;
  const vIdx = []; toks.forEach((t, i) => { if (t.t === 'V') vIdx.push(i); });
  if (vIdx.length <= 1) return toks.map(mapTok).join('');
  const starts = [];
  for (let s = 0; s < vIdx.length; s++) {
    if (s === 0) { starts.push(0); continue; }
    const prevV = vIdx[s - 1], vpos = vIdx[s], cons = [];
    for (let k = prevV + 1; k < vpos; k++) cons.push(k);
    let onset;
    if (cons.length === 0) onset = 0;
    else if (cons.length === 1) onset = 1;
    else { const last2 = toks[cons[cons.length - 2]].s + toks[cons[cons.length - 1]].s; onset = LEGAL_ONSET.indexOf(last2) !== -1 ? 2 : 1; }
    starts.push(vpos - onset);
  }
  const out = [];
  for (let s = 0; s < starts.length; s++) {
    const a = starts[s], b = (s + 1 < starts.length) ? starts[s + 1] : toks.length;
    let str = ''; for (let k = a; k < b; k++) str += mapTok(toks[k]);
    out.push(str);
  }
  return 'ˈ' + out.join('.');
}

module.exports = { validateRoot, tokenize, romanToIpa };

// ---- 自测：现有词库 ----
if (require.main === module) {
  const LEX = require(path.join(__dirname, 'silneth-lexicon.json'));
  // 只校验实词音系（功能词/后缀/数词/代词可能有特殊形，先看它们）
  const CONTENT = ['n', 'v', 'adj', 'adv'];
  // 已知刻意特殊形：磨蚀拼写的词根用级>0元音，属母语固有例外，不作为新词模板。
  const EXEMPT = new Set(['vèr']);
  let contentFail = 0, otherFail = 0;
  const report = { content: [], other: [] };
  for (const e of LEX) {
    if (EXEMPT.has(e.roman)) continue;
    const r = validateRoot(e.roman, e.cls);
    if (!r.ok) {
      const line = `${e.roman} (${e.pos}/${e.cls}/${e.field}): ${r.errs.join('; ')}`;
      if (CONTENT.indexOf(e.pos) !== -1) { contentFail++; report.content.push(line); }
      else { otherFail++; report.other.push(line); }
    }
  }
  console.log('=== 实词（n/v/adj/adv）不通过：' + contentFail + ' ===');
  report.content.forEach(l => console.log('  ✗ ' + l));
  console.log('\n=== 非实词（func/suffix/num/pron）不通过：' + otherFail + ' ===');
  report.other.forEach(l => console.log('  · ' + l));
  console.log('\n实词总数：' + LEX.filter(e => CONTENT.indexOf(e.pos) !== -1).length);
}
