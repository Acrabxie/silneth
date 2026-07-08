// 唤起本机 Claude 为缺词造一个合法 Sìlneth 词根，经确定性门把关后可合入词库。
// 用法(CLI)：node silneth-coin.js <词> [--lang zh|en] [--pos n|v|adj|adv] [--merge] [--rebuild]
//   require 后：coinWord(word,{lang,pos}) → {ok,entry,tries} ；mergeEntry(entry) 落盘
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const D = __dirname;
const { validateRoot, romanToIpa } = require(path.join(D, 'validate-roots.js'));

// 本机 claude 二进制（官方登录）；显式标准上下文模型，清掉会触发 1M-context 计费的 env
const CLAUDE_BIN = path.join(os.homedir(), '.local/bin/claude');
const COIN_MODEL = process.env.SILNETH_COIN_MODEL || 'claude-sonnet-4-6';
function claudeEnv() {
  const e = Object.assign({}, process.env);
  delete e.ANTHROPIC_BETAS;      // 去掉 context-1m beta，避免额度报错
  delete e.ANTHROPIC_BASE_URL;   // 用官方端点与本机登录凭据
  delete e.ANTHROPIC_API_KEY;
  delete e.ANTHROPIC_AUTH_TOKEN;
  return e;
}

const LEX_PATH = path.join(D, 'silneth-lexicon.json');
const EN_PATH = path.join(D, 'silneth-en-gloss.json');

const RULES = [
  '【Sìlneth 音系规则 —— 造的 roman 必须严格遵守，否则会被确定性校验器拒掉】',
  '· 元音（不得出现其它带重音符的字母）：短 i y e ø a o u；长 í ý é ǿ á ó ú；双元音只有 ai au ei oi（起头必是短 a/e/o）',
  '· 辅音字母：m n ñ p t k b d g f s h v z l r w j；二合辅音 th sh dh ng',
  '· 词根 1–3 音节，音节形如 (C)(C)V(C)(C)',
  '· 合法“词首辅音簇”仅限：pr pl tr kr kl kw br bl dr gr gl fr fl fj sp st sk thr sw vl kj tj dj gw hw hl（单辅音开头都行，但 ng 不作词首）',
  '· 合法“词末辅音”：单个 m n ñ ng l r s th；或二合簇 [r或l]+{m n ng ñ s th}（如 rn lm rs）',
  '· 相邻元音(hiatus)非法，除非正好是 ai au ei oi；绝对禁止 ll、词首 ng、未列出的字母/重音符',
  '· 强弱根：cls=strong 必须含长元音或双元音；cls=weak 只含短元音——须与拼写一致',
  '· 美感：清冷流畅、有“北地”气质，避免与英语/汉语明显撞音',
].join('\n');

function existingRomans() {
  const LEX = JSON.parse(fs.readFileSync(LEX_PATH, 'utf8'));
  return { LEX, set: new Set(LEX.map(e => e.roman.toLowerCase())), romans: LEX.map(e => e.roman) };
}

// 调本机 claude 二进制（headless，prompt 走 stdin）
function callClaude(prompt, timeoutMs) {
  return new Promise((resolve) => {
    // --strict-mcp-config：不加载项目 MCP，避开 blender 等连接拖慢启动（120s→~10s）
    const child = spawn(CLAUDE_BIN, ['-p', '--model', COIN_MODEL, '--strict-mcp-config'], { stdio: ['pipe', 'pipe', 'ignore'], env: claudeEnv() });
    let out = '', done = false;
    const finish = (v) => { if (!done) { done = true; try { child.kill('SIGKILL'); } catch (e) {} resolve(v); } };
    const timer = setTimeout(() => finish({ ok: false, reason: 'claude 超时' }), timeoutMs || 120000);
    child.stdout.on('data', d => { out += d.toString(); });
    child.on('error', e => { clearTimeout(timer); finish({ ok: false, reason: 'claude 无法启动：' + e.message }); });
    child.on('close', () => { clearTimeout(timer); finish({ ok: true, text: out }); });
    child.stdin.write(prompt); child.stdin.end();
  });
}

// 从模型输出里抽出第一个含 roman 的 JSON 对象
function extractCandidate(text) {
  if (!text) return null;
  let s = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = s.indexOf('{');
  for (let i = start; i >= 0 && i < s.length; i = s.indexOf('{', i + 1)) {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) { try { const o = JSON.parse(s.slice(i, j + 1)); if (o && o.roman) return o; } catch (e) {} break; } }
    }
  }
  return null;
}

function coinPrompt(word, lang, posHint, romans, feedback) {
  const langName = lang === 'en' ? '英文' : '中文';
  return [
    '你是 Sìlneth 人造语的造词师。为下面这个' + langName + '词造一个**合法且好听**的 Sìlneth 词根。',
    '目标词（' + langName + '）：「' + word + '」' + (posHint ? '（词性：' + posHint + '）' : ''),
    RULES,
    '',
    '【已占用的 roman（严禁重复）】',
    romans.join(' '),
    feedback ? '\n【上一次尝试被拒，请修正】\n' + feedback : '',
    '',
    '只输出一个 JSON 对象，不要任何解释或代码块围栏，格式：',
    '{"roman":"合法词根,全小写","pos":"n|v|adj|adv","zh":["中文义1","中文义2"],"en":["en1","en2"],"cls":"weak|strong"}',
    '要求：roman 严格合规且不在占用表里；zh 与 en 互为准确对译且贴合目标词义；cls 与拼写一致。',
  ].join('\n');
}

async function coinWord(word, opts) {
  opts = opts || {};
  const lang = opts.lang || (/[a-z]/i.test(word) && !/[一-鿿]/.test(word) ? 'en' : 'zh');
  const maxTries = opts.tries || 3;
  const { set: existSet, romans } = existingRomans();
  const tries = [];
  let feedback = '';
  for (let t = 0; t < maxTries; t++) {
    const prompt = coinPrompt(word, lang, opts.pos, romans, feedback);
    const r = await callClaude(prompt, opts.timeoutMs);
    if (!r.ok) { tries.push({ error: r.reason }); return { ok: false, reason: r.reason, tries }; }
    const cand = extractCandidate(r.text);
    if (!cand) { tries.push({ raw: (r.text || '').slice(0, 120), error: '未解析出 JSON' }); feedback = '上次没有输出可解析的 JSON，请只输出规定格式的 JSON。'; continue; }
    const roman = String(cand.roman || '').trim().toLowerCase();
    const cls = cand.cls === 'strong' ? 'strong' : 'weak';
    const pos = ['n', 'v', 'adj', 'adv'].indexOf(cand.pos) !== -1 ? cand.pos : (opts.pos || 'n');
    const errs = [];
    const v = validateRoot(roman, cls);
    if (!v.ok) errs.push('音系:' + v.errs.join('/'));
    if (existSet.has(roman)) errs.push('roman 撞既有词');
    if (!Array.isArray(cand.zh) || !cand.zh.length) errs.push('缺中文义');
    if (!Array.isArray(cand.en) || !cand.en.length) errs.push('缺英文义');
    if (errs.length) {
      tries.push({ roman, errs });
      feedback = '「' + roman + '」被拒：' + errs.join('；') + '。请换一个。';
      continue;
    }
    const entry = {
      roman, ipa: romanToIpa(roman), pos,
      zh: cand.zh.map(x => String(x).trim()).filter(Boolean),
      cls, field: '补齐',
      _en: cand.en.map(x => String(x).trim()).filter(Boolean),
    };
    tries.push({ roman, ok: true });
    return { ok: true, entry, tries };
  }
  return { ok: false, reason: '连续 ' + maxTries + ' 次未过确定性门', tries };
}

// 落盘：追加到 lexicon + en-gloss（保持缩进风格）；返回 {added}
function mergeEntry(entry) {
  const LEX = JSON.parse(fs.readFileSync(LEX_PATH, 'utf8'));
  const EN = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  if (LEX.some(e => e.roman.toLowerCase() === entry.roman.toLowerCase())) return { added: false, reason: '已存在' };
  const en = entry._en || [];
  const lexEntry = { roman: entry.roman, ipa: entry.ipa, pos: entry.pos, zh: entry.zh, cls: entry.cls, field: entry.field };
  LEX.push(lexEntry);
  if (en.length) EN[entry.roman] = en;
  fs.writeFileSync(LEX_PATH, JSON.stringify(LEX, null, 1), 'utf8');
  fs.writeFileSync(EN_PATH, JSON.stringify(EN, null, 1), 'utf8');
  return { added: true, total: LEX.length };
}

module.exports = { coinWord, mergeEntry, RULES };

// ---- CLI ----
if (require.main === module) {
  const args = process.argv.slice(2);
  const word = args.filter(a => !a.startsWith('--'))[0];
  const flag = (n) => { const i = args.indexOf('--' + n); return i !== -1 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
  if (!word) { console.error('用法: node silneth-coin.js <词> [--lang zh|en] [--pos n|v|adj|adv] [--merge]'); process.exit(1); }
  (async () => {
    console.log('唤起本机 Claude 为「' + word + '」造词…');
    const r = await coinWord(word, { lang: flag('lang'), pos: flag('pos') });
    if (!r.ok) { console.error('✗ 失败:', r.reason); console.error('  尝试:', JSON.stringify(r.tries)); process.exit(2); }
    const e = r.entry;
    console.log('✓ ' + e.roman + ' [' + e.ipa + '] ' + e.pos + '/' + e.cls + '  ' + e.zh.join('/') + ' (' + e._en.join('/') + ')');
    console.log('  尝试次数:', r.tries.length);
    if (flag('merge')) { const m = mergeEntry(e); console.log(m.added ? '  已合入词库，共 ' + m.total + ' 词' : '  未合入：' + m.reason); }
    else console.log('  （加 --merge 落盘）');
  })();
}
