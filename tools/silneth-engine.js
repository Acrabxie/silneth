/* ============================================================
 * Sìlneth 翻译引擎  (silneth-engine.js)
 * 依据 silneth-morphology.md（86 测试向量）与 silneth-loanwords.md。
 * 纯浏览器/Node 双兼容：浏览器读 window.SILNETH_LEXICON，Node 读同目录 JSON。
 * ============================================================ */
(function (root) {
  'use strict';

  var LEX = (typeof window !== 'undefined' && window.SILNETH_LEXICON) ||
    (function () {
      try { return require('./silneth-lexicon.json'); } catch (e) { return []; }
    })();

  // 英文释义（roman -> [english...]），供英文输入直译与词典英文标注
  var EN_GLOSS = (typeof window !== 'undefined' && window.SILNETH_EN_GLOSS) ||
    (function () {
      try { return require('./silneth-en-gloss.json'); } catch (e) { return {}; }
    })();

  /* ---------- 元音系统（§1.2） ----------
   * V[level0token] = [级0, 级1, 级2]
   * œ̀ = U+0153 U+0300 ; ǿ = U+01FF ; ỳ = U+1EF3 ; 其余重音符为预组合。 */
  var OE_GRAVE = 'œ̀';   // œ̀
  var Y_GRAVE = 'ỳ';         // ỳ
  var OE_ACUTE = 'ǿ';         // ǿ

  var V = {
    // 短元音：满 → 松 → schwa
    'i': ['i', 'ì', 'ë'], 'y': ['y', Y_GRAVE, 'ë'], 'e': ['e', 'è', 'ë'],
    'ø': ['ø', OE_GRAVE, 'ë'], 'a': ['a', 'à', 'ë'], 'o': ['o', 'ò', 'ë'], 'u': ['u', 'ù', 'ë'],
    // 长元音：满 → 去长松化 → 停级1（永不 ë）
    'í': ['í', 'ì', 'ì'], 'ý': ['ý', Y_GRAVE, Y_GRAVE], 'é': ['é', 'è', 'è'],
    'ǿ': [OE_ACUTE, OE_GRAVE, OE_GRAVE], 'á': ['á', 'à', 'à'], 'ó': ['ó', 'ò', 'ò'], 'ú': ['ú', 'ù', 'ù'],
    // 双元音：首成分松化，永不坍缩
    'ai': ['ai', 'ài', 'ài'], 'au': ['au', 'àu', 'àu'], 'ei': ['ei', 'èi', 'èi'], 'oi': ['oi', 'òi', 'òi']
  };
  // 级0 元音（用于 erode 扫描；长优先于短、双优先于单已由长度保证）
  var LEVEL0_VOWELS = ['ai', 'au', 'ei', 'oi', 'í', 'ý', 'é', OE_ACUTE, 'á', 'ó', 'ú', 'i', 'y', 'e', 'ø', 'a', 'o', 'u'];

  // 全部元音形（含磨蚀形），供 lastVowel / 字形切分 使用（长度降序）
  var ALL_VOWELS = ['ài', 'àu', 'èi', 'òi', 'ai', 'au', 'ei', 'oi', OE_GRAVE, OE_ACUTE,
    'í', 'ý', 'é', 'á', 'ó', 'ú', 'ì', Y_GRAVE, 'è', 'à', 'ò', 'ù', 'ë', 'i', 'y', 'e', 'ø', 'a', 'o', 'u'];

  // 松化形 → 满级短元音基（供 glide 判定）
  var DEERODE = {};
  DEERODE['ì'] = 'i'; DEERODE[Y_GRAVE] = 'y'; DEERODE['è'] = 'e'; DEERODE[OE_GRAVE] = 'ø';
  DEERODE['à'] = 'a'; DEERODE['ò'] = 'o'; DEERODE['ù'] = 'u';
  var LONG2SHORT = { 'í': 'i', 'ý': 'y', 'é': 'e' }; LONG2SHORT[OE_ACUTE] = 'ø'; LONG2SHORT['á'] = 'a'; LONG2SHORT['ó'] = 'o'; LONG2SHORT['ú'] = 'u';

  // 辅音音素（含二合），供 coda 计数与字形切分
  var CONS_DIGRAPH = ['th', 'sh', 'dh', 'ng', 'll'];
  var CONS_SINGLE = ['m', 'n', 'ñ', 'p', 't', 'k', 'b', 'd', 'g', 'f', 's', 'h', 'v', 'z', 'l', 'r', 'w', 'j'];

  function isVowelStr(ch) {
    return ALL_VOWELS.indexOf(ch) !== -1 || 'iyeøaou'.indexOf(ch) !== -1;
  }

  /* ---------- 词根元音磨蚀（erode，§1，V1–V12） ---------- */
  function isStrong(root) {
    var i = 0, s = root;
    while (i < s.length) {
      var m = matchFrom(s, i, LEVEL0_VOWELS);
      if (m) {
        // 强类＝含长元音或双元音
        if (['ai', 'au', 'ei', 'oi', 'í', 'ý', 'é', OE_ACUTE, 'á', 'ó', 'ú'].indexOf(m) !== -1) return true;
        i += m.length;
      } else { i += 1; }
    }
    return false;
  }

  function matchFrom(s, i, list) {
    for (var k = 0; k < list.length; k++) {
      if (s.substr(i, list[k].length) === list[k]) return list[k];
    }
    return null;
  }

  function erode(root, level) {
    if (typeof root !== 'string') return root;
    if (!level) return root;
    var strong = isStrong(root);
    var out = '', i = 0;
    while (i < root.length) {
      var v = matchFrom(root, i, LEVEL0_VOWELS);
      if (v) {
        var forms = V[v];
        var lvl = level;
        // 强类词根级2 停级1（永不 ë）——对全根有效（模糊处 A1 取「全根停级1」）
        if (strong && level === 2) lvl = 1;
        out += forms ? forms[lvl] : v;
        i += v.length;
      } else {
        out += root[i]; i += 1;
      }
    }
    return out;
  }

  /* ---------- 词尾分析：coda / lastVowel ---------- */
  function lastVowelToken(stem) {
    var last = null, i = 0;
    while (i < stem.length) {
      var v = matchFrom(stem, i, ALL_VOWELS);
      if (v) { last = v; i += v.length; } else { i += 1; }
    }
    return last;
  }
  function endsInVowel(stem) {
    // 词尾无辅音音素即为元音收尾
    return trailingConsonants(stem) === '';
  }
  function trailingConsonants(stem) {
    // 返回最后一个元音之后的辅音串
    var i = 0, lastVEnd = 0;
    while (i < stem.length) {
      var v = matchFrom(stem, i, ALL_VOWELS);
      if (v) { i += v.length; lastVEnd = i; }
      else { i += 1; }
    }
    return stem.slice(lastVEnd);
  }
  function consPhonemeCount(cluster) {
    var i = 0, n = 0;
    while (i < cluster.length) {
      var c = matchFrom(cluster, i, CONS_DIGRAPH) || matchFrom(cluster, i, CONS_SINGLE);
      if (c) { n += 1; i += c.length; } else { i += 1; }
    }
    return n;
  }

  /* ---------- 滑音选择（R1，§1.5，V13–V26） ---------- */
  function glide(finalTok) {
    if (finalTok === 'ë') return 'j';
    if (['ai', 'ei', 'oi', 'ài', 'èi', 'òi'].indexOf(finalTok) !== -1) return 'j';
    if (['au', 'àu'].indexOf(finalTok) !== -1) return 'w';
    var base = DEERODE[finalTok] || LONG2SHORT[finalTok] || finalTok;
    return (base === 'o' || base === 'u') ? 'w' : 'j';
  }

  /* ---------- 语素缀接：R1 滑音 / R2 插 e（V27–V31） ---------- */
  function joinMorph(stem, suf) {
    if (!suf) return stem;
    var first = suf.charAt(0);
    if (isVowelStr(first)) {
      // 元音起首：若词干元音收尾则插滑音
      if (endsInVowel(stem)) {
        var fv = lastVowelToken(stem);
        return stem + glide(fv) + suf;
      }
      return stem + suf;
    }
    // 辅音起首：词内非法簇（coda ≥2 音素）则插 e
    var coda = trailingConsonants(stem);
    if (consPhonemeCount(coda) >= 2) return stem + 'e' + suf;
    return stem + suf;
  }

  /* ---------- 名词变格（§2.2，V32–V39） ---------- */
  var CASE_SUFFIX = { NOM: '', ACC: 'on', GEN: 'e', DAT: 'ir', LOC: 'is', ABL: 'ol', INS: 'um' };
  function decline(nounRoman, opts) {
    opts = opts || {};
    if (typeof nounRoman !== 'string' || !nounRoman) return { ok: false, error: '空词根' };
    var stem = nounRoman;
    if (opts.plural) stem = endsInVowel(stem) ? stem + 'n' : stem + 'in';
    var suf = CASE_SUFFIX[(opts['case'] || 'NOM')];
    if (suf == null) return { ok: false, error: '未知格：' + opts['case'] };
    return joinMorph(stem, suf);
  }

  /* ---------- 动词定式（§2.4，V40–V52） ---------- */
  var PERSON = { 1: { sg: 'e', pl: 'er' }, 2: { sg: 'o', pl: 'or' }, 3: { sg: 'a', pl: 'ar' } };
  function conjugate(rootRoman, opts) {
    opts = opts || {};
    if (typeof rootRoman !== 'string' || !rootRoman) return { ok: false, error: '空词根' };
    var level = opts.level || 0;
    var person = opts.person || 3;
    var stem = erode(rootRoman, level);           // ① 磨蚀级词根
    if (opts.caus) stem = joinMorph(stem, 'ta');   // -ta-（不磨）
    if (opts.mid) stem = joinMorph(stem, 'u');    // -u-（中受动）
    if (opts.pfv) stem = joinMorph(stem, 's');    // -s-（完整体）
    var pTable = PERSON[person];
    if (!pTable) return { ok: false, error: '未知人称：' + person };
    var psuf = pTable[opts.plural ? 'pl' : 'sg'];
    return joinMorph(stem, psuf);
  }
  // 非限定形（分词/副动词，供例文与关系化）
  function nonfinite(rootRoman, kind, level) {
    var stem = erode(rootRoman, level || 0);
    var suf = { ptcp: 'an', midptcp: 'un', cvb: 'um', cvbpfv: 'sum' }[kind] || 'an';
    return joinMorph(stem, suf);
  }

  /* ---------- 示证附着词（§2.4.4，V53–V58） ---------- */
  function evidential(kind, t, i) {
    var base = { va: 'va', dhi: 'dhi', re: 're' }[kind];
    if (!base) return '';
    t = t || 0; i = i || 0;
    var lvl = (kind === 're') ? Math.min(t + i, 2) : Math.min(t, 2);
    return '=' + erode(base, lvl);
  }

  /* ---------- 罗马字 → Mírneth 字形序列（第三章，V77–V85） ---------- */
  var CONS_GLYPH = {
    p: 'pe', b: 'be', m: 'me', f: 'fe', v: 've', t: 'te', d: 'de', n: 'ne',
    s: 'se', z: 'ze', th: 'the', dh: 'dhe', sh: 'she', 'ñ': 'nye', k: 'ke',
    g: 'ge', ng: 'nge', h: 'he', r: 're', l: 'le', ll: 'lle', w: 'we', j: 'je'
  };
  var VOWEL_GLYPH = {
    'i': { key: 'i' }, 'y': { key: 'y' }, 'e': { key: 'e' }, 'ø': { key: 'oe' },
    'a': { key: 'a' }, 'o': { key: 'o' }, 'u': { key: 'u' }, 'ë': { key: 'schwa' },
    'í': { key: 'i', mods: ['sky'] }, 'ý': { key: 'y', mods: ['sky'] }, 'é': { key: 'e', mods: ['sky'] },
    'ì': { key: 'i', mods: ['crack'] }, 'è': { key: 'e', mods: ['crack'] },
    'à': { key: 'a', mods: ['crack'] }, 'ò': { key: 'o', mods: ['crack'] }, 'ù': { key: 'u', mods: ['crack'] }
  };
  VOWEL_GLYPH[OE_ACUTE] = { key: 'oe', mods: ['sky'] };
  VOWEL_GLYPH['á'] = { key: 'a', mods: ['sky'] }; VOWEL_GLYPH['ó'] = { key: 'o', mods: ['sky'] }; VOWEL_GLYPH['ú'] = { key: 'u', mods: ['sky'] };
  VOWEL_GLYPH[Y_GRAVE] = { key: 'y', mods: ['crack'] };
  VOWEL_GLYPH[OE_GRAVE] = { key: 'oe', mods: ['crack'] };
  var PUNCT_GLYPH = { '.': 'fall', '~': 'hang', '?': 'rise', '!': 'voc', '—': 'pause', '=': 'clitic', '«': 'pause', '»': 'pause', ':': 'fall' };
  var DIGRAPH_GLYPH = ['th', 'dh', 'sh', 'ng', 'll'];

  function toGlyphs(roman) {
    var out = [];
    if (typeof roman !== 'string') return out;
    var i = 0;
    while (i < roman.length) {
      var ch = roman.charAt(i);
      if (ch === ' ') { i += 1; continue; }
      if (PUNCT_GLYPH[ch]) { out.push({ key: PUNCT_GLYPH[ch], mods: [] }); i += 1; continue; }
      // œ̀ (2 cp)
      if (roman.substr(i, 2) === OE_GRAVE) { out.push({ key: 'oe', mods: ['crack'] }); i += 2; continue; }
      // 二合辅音（大小写不敏感）
      var two = roman.substr(i, 2).toLowerCase();
      if (DIGRAPH_GLYPH.indexOf(two) !== -1) { out.push({ key: CONS_GLYPH[two], mods: [] }); i += 2; continue; }
      // 元音（含带符）
      if (VOWEL_GLYPH[ch]) { var g = VOWEL_GLYPH[ch]; out.push({ key: g.key, mods: (g.mods || []).slice() }); i += 1; continue; }
      // 单辅音
      var lc = ch.toLowerCase();
      if (CONS_GLYPH[lc]) { out.push({ key: CONS_GLYPH[lc], mods: [] }); i += 1; continue; }
      if (ch === 'ñ') { out.push({ key: 'nye', mods: [] }); i += 1; continue; }
      i += 1; // 跳过未知字符（如中点 ·）
    }
    return out;
  }

  /* ---------- 词库检索 ---------- */
  function normalize(x) { return (x == null ? '' : String(x)).trim().toLowerCase(); }
  function searchLexicon(query) {
    var q = normalize(query);
    if (!q) return [];
    var hits = [];
    for (var i = 0; i < LEX.length; i++) {
      var e = LEX[i];
      var rm = normalize(e.roman);
      var zhArr = e.zh || [];
      var zhJoin = zhArr.join(' ');
      var score = -1;
      if (rm === q) score = 100;
      else if (zhArr.indexOf(query) !== -1 || zhArr.indexOf(q) !== -1) score = 90;
      else if (rm.indexOf(q) === 0) score = 70;
      else if (rm.indexOf(q) !== -1) score = 50;
      else if (zhJoin.indexOf(q) !== -1) score = 40;
      if (score >= 0) hits.push({ e: e, s: score });
    }
    hits.sort(function (a, b) { return b.s - a.s; });
    return hits.map(function (h) {
      return { roman: h.e.roman, ipa: h.e.ipa, pos: h.e.pos, zh: h.e.zh, cls: h.e.cls, field: h.e.field };
    });
  }
  // 派生词补充表（303 词根不直接收录的常用派生/复合，供直译分词）
  var SUPPLEMENT = {
    '歌': { roman: 'silneth', pos: 'n', zh: ['歌'] },
    '歌曲': { roman: 'silneth', pos: 'n', zh: ['歌'] },
    '讲述': { roman: 'silneth', pos: 'n', zh: ['讲述'] },
    '歌者': { roman: 'silwe', pos: 'n', zh: ['歌者'] },
    '言说者': { roman: 'silwe', pos: 'n', zh: ['歌者'] },
    '诵厅': { roman: 'silos', pos: 'n', zh: ['诵厅'] },
    '这里': { roman: 'sa', pos: 'pron', zh: ['这里'] },
    '那里': { roman: 'tor', pos: 'pron', zh: ['那里'] },
    '此处': { roman: 'sa', pos: 'pron', zh: ['这里'] }
  };
  // 内部：按精确中文词或罗马字取单个词条
  var ZH_INDEX = null, ZH_INDEX_V = null;
  function buildZhIndex() {
    if (ZH_INDEX) return ZH_INDEX;
    ZH_INDEX = {}; ZH_INDEX_V = {};
    for (var i = 0; i < LEX.length; i++) {
      var e = LEX[i];
      (e.zh || []).forEach(function (z) {
        if (z && !ZH_INDEX[z]) ZH_INDEX[z] = e;
        if (z && e.pos === 'v' && !ZH_INDEX_V[z]) ZH_INDEX_V[z] = e;  // 动词消歧层：名/动同形时的动词候选
      });
    }
    Object.keys(SUPPLEMENT).forEach(function (z) { if (!ZH_INDEX[z]) ZH_INDEX[z] = SUPPLEMENT[z]; });
    return ZH_INDEX;
  }
  function entryByRoman(rm) {
    rm = normalize(rm);
    for (var i = 0; i < LEX.length; i++) if (normalize(LEX[i].roman) === rm) return LEX[i];
    return null;
  }

  /* ============================================================
   * 外来专名音译（silneth-loanwords.md）
   * 规则引擎 + 规范工作示例的权威定形表
   * ============================================================ */
  // 规范第四节 15 例的权威定形（含 §3 美化）
  var LOAN_CANON = {
    'acrab': ['Akrabe', 'ˈa.kra.be', ['a→a, k→k, r→r, a→a, b→b（词末浊塞音非法）', 'L4(iii) 词末补 -e → Akrabe']],
    'claude': ['Klóde', 'ˈkloː.de', ['kl 合法声母簇', 'au→ó（库外双元音取首长元音，入不褪层）', '词末 d 非法 → 补 -e', '含长元音：磨蚀止步级1，永不归 ë']],
    'anthropic': ['Anthropike', 'ˈan.θro.pi.ke', ['th=θ 原生音位', 'thr 合法簇', '词末 k 非法 → 补 -e', 'θ 是「灰烬之音」，名中带 th 自有苍古之感']],
    'beijing': ['Beidjing', 'ˈbei̯.djiŋ', ['b→b, ei→ei', 'j(拼音)→dj', 'ng→ŋ 尾位合法']],
    'shanghai': ['Shanghai', 'ˈʃaŋ.xai̯', ['sh→ʃ, ang→aŋ', 'h→x, ai→ai', 'ŋ 后接 h 非 n+g 串，无需 n·g']],
    'tokyo': ['Tókjó', 'ˈtoː.kjoː', ['长音 ō→ó（两处）', 'kj 拗音＝阻音+滑音合法簇', '双长元音：整名落入不褪层，「东京不磨」']],
    'paris': ['Pari', 'ˈpa.ri', ['原语优先（法 /paʁi/）', 'ʁ→r，词末静音 s 不入折算']],
    'london': ['Landen', 'ˈlan.den', ['ʌ→a, ə→e（借词升格，ə 取 e）', '全短元音弱形，将来可磨作 Lànden→Lënden']],
    'maria': ['Marija', 'ˈma.ri.ja', ['m a r i a 直映', 'i.a 元音相接 → R1 插 j']],
    'maría': ['Marija', 'ˈma.ri.ja', ['同 Maria']],
    'vladimir': ['Vladjimir', 'ˈvla.dji.mir', ['vl 合法簇', 'dʲ 颚化 → dj', '词末 r 合法']],
    'muhammad': ['Muhamade', 'ˈmu.xa.ma.de', ['ħ→h(/x/)', '双写 mm 退单', '词末 d 非法 → 补 -e']],
    'kim': ['Kimil', 'ˈki.mil', ['k i m 直映', '§3.1 单音节人名补 -il（爱称/入籍形），呼语用光杆 Ai, Kim!']],
    'nguyen': ['Newín', 'ˈne.wiːn', ['ŋw→nw 词首（L3d ŋ→n）→ new-（插 e）', 'iə→í（库外双元音取首长元音）', '长 í 送此姓入不褪层']],
    'nguyễn': ['Newín', 'ˈne.wiːn', ['同 Nguyen']],
    'einstein': ['Ainstain', 'ˈai̯n.stai̯n', ['aɪ→ai（两处）', 'nʃt：n 归前尾，ʃt→st 一步简化', '双双元音全落不褪层，「为时空立法者，其名不磨」']]
  };

  // 拼音声母/韵母（简化，用于识别中文拼音输入）
  var PINYIN_INITIAL = { zh: 'dj', ch: 'tj', sh: 'sh', j: 'dj', q: 'tj', x: 'sh', c: 's', z: 'z', r: 'r', b: 'b', p: 'p', m: 'm', f: 'f', d: 'd', t: 't', n: 'n', l: 'l', g: 'g', k: 'k', h: 'h', s: 's' };

  // 通用（英/拉丁）字素折算——粗规则，保证产出合法词形
  function ruleTransliterate(input) {
    var steps = [];
    var s = input.toLowerCase().replace(/[^a-zà-ÿ]/g, '');
    if (!s) return { ok: false, error: '无可识别的拉丁字母', roman: '', ipa: '', steps: [] };
    steps.push({ step: 'L0 预处理', detail: '清理为字母串：' + s });

    // 常见二合/静音（英语向）
    var rules = [
      [/ph/g, 'f'], [/sh/g, 'ş'], [/ch/g, 'ç'], [/tch/g, 'ç'], [/th/g, 'þ'],
      [/qu/g, 'kw'], [/ck/g, 'k'], [/wh/g, 'w'], [/^kn/g, 'n'], [/^wr/g, 'r'], [/^gn/g, 'n'],
      [/ oo/g, 'ú'], [/oo/g, 'ú'], [/ee/g, 'í'], [/ea/g, 'í'],
      [/[^aeiou]?tion/g, 'şen']
    ];
    rules.forEach(function (r) { s = s.replace(r[0], r[1]); });
    // 塞擦音占位符 → 声母折算
    s = s.replace(/ç/g, 'tj').replace(/ş/g, 'sh').replace(/þ/g, 'th');
    // j → dj（拼音/英语通吃：英语 j=dʒ→dj）
    s = s.replace(/j(?![aeiou]?$)/g, 'dj').replace(/j/g, 'dj');
    // x → ks
    s = s.replace(/x/g, 'ks');
    // c 依后元音
    s = s.replace(/c(?=[ei])/g, 's').replace(/c/g, 'k');
    // 游离 q（无 u 相随）→ k；Sìlneth 无 /q/
    s = s.replace(/q/g, 'k');
    // y 作辅音（词首/元音前）→ j，其余作元音 → i
    s = s.replace(/^y(?=[aeiou])/g, 'j').replace(/y/g, 'i');
    steps.push({ step: 'L1 音位折算', detail: '折算辅音丛/塞擦音后：' + s });

    // ll → l（0.3 禁 ll 字位）
    s = s.replace(/ll/g, 'l');
    // 词首 ng → n
    s = s.replace(/^ng/g, 'n');

    // 音节修复：逐字符扫描，拆非法辅音簇（>1 非法），补插 e
    s = repairClusters(s, steps);

    // 词末非法辅音修复
    s = repairFinal(s, steps);

    // 相邻元音插滑音（R1）
    s = insertGlides(s);

    steps.push({ step: 'L8 重音', detail: '主重音自动落首音节，不标写' });
    // 首字母大写
    var out = s.charAt(0).toUpperCase() + s.slice(1);
    return { ok: true, roman: out, ipa: pseudoIpa(out), steps: steps };
  }

  var LEGAL_ONSET_CLUSTERS = ['pr', 'pl', 'tr', 'kr', 'kl', 'kw', 'br', 'bl', 'dr', 'gr', 'gl', 'fr', 'fl', 'fj', 'sp', 'st', 'sk', 'thr', 'sw', 'vl', 'kj', 'tj', 'dj', 'sh', 'th', 'dh'];
  var LEGAL_CODA = ['m', 'n', 'ñ', 'ng', 'l', 'r', 's', 'th'];
  function isVowelC(c) { return 'aeiouyøàèìòùáéíóúýǿ'.indexOf(c) !== -1 || c === OE_GRAVE || c === OE_ACUTE || c === Y_GRAVE; }

  function repairClusters(s, steps) {
    // 在元音之间的辅音串若长度>2，或双簇非法，则插 e 拆分
    var res = '', i = 0, changed = false;
    while (i < s.length) {
      if (isVowelC(s.charAt(i))) { res += s.charAt(i); i++; continue; }
      // 收集辅音串
      var run = '';
      while (i < s.length && !isVowelC(s.charAt(i))) { run += s.charAt(i); i++; }
      var atEnd = (i >= s.length);
      if (atEnd) { res += run; break; }   // 词末辅音由 repairFinal 处理
      // 词内辅音串 run，后接元音：留最多「1 合法尾 + 合法声母簇」
      run = normalizeDigraphsForRepair(run);
      if (run.replace(/[TDSNL]/g, 'x').length <= 1) { res += denormDigraphs(run); continue; }
      // 尝试：末尾双簇作声母
      var lastTwo = run.slice(-2);
      if (LEGAL_ONSET_CLUSTERS.indexOf(denormDigraphs(lastTwo)) !== -1 && run.length >= 2) {
        var head = run.slice(0, -2), onset = run.slice(-2);
        res += spread(head) + denormDigraphs(onset);
        if (head) changed = true;
        continue;
      }
      // 末单辅音作声母，其余各自成音节（插 e）
      var head2 = run.slice(0, -1), onset2 = run.slice(-1);
      res += spread(head2) + denormDigraphs(onset2);
      if (head2) changed = true;
    }
    if (changed && steps) steps.push({ step: 'L3 声母簇修复', detail: '拆非法辅音簇、插连接元音 e：' + res });
    return res;
  }
  // 把二合辅音临时记为单符，避免 coda 计数误判
  function normalizeDigraphsForRepair(run) {
    return run.replace(/th/g, 'T').replace(/dh/g, 'D').replace(/sh/g, 'S').replace(/ng/g, 'N');
  }
  function denormDigraphs(run) {
    return run.replace(/T/g, 'th').replace(/D/g, 'dh').replace(/S/g, 'sh').replace(/N/g, 'ng');
  }
  function spread(consRun) {
    // 把辅音串每个音素后补 e（末尾除外由调用处接声母）
    var d = denormDigraphs(consRun);
    // 逐音素插 e
    var out = '', i = 0;
    while (i < consRun.length) {
      var two = consRun.substr(i, 2);
      var one = consRun.charAt(i);
      if (['th', 'dh', 'sh', 'ng'].indexOf(denormDigraphs(two)) !== -1 && /[TDSN]/.test(one) === false && two.length === 2 && /[a-z]{2}/.test(two)) {
        out += denormDigraphs(two) + 'e'; i += 2;
      } else if (/[TDSN]/.test(one)) {
        out += denormDigraphs(one) + 'e'; i += 1;
      } else {
        out += one + 'e'; i += 1;
      }
    }
    return out;
  }
  function repairFinal(s, steps) {
    // 词末辅音串
    var m = s.match(/([^aeiouyøàèìòùáéíóúýǿ' + OE_GRAVE + OE_ACUTE + Y_GRAVE + ']+)$/);
    var i = s.length; var run = '';
    while (i > 0 && !isVowelC(s.charAt(i - 1))) { run = s.charAt(i - 1) + run; i--; }
    if (!run) return s;
    var head = s.slice(0, i);
    var norm = normalizeDigraphsForRepair(run);
    // 单合法尾
    if (norm.length === 1) {
      var single = denormDigraphs(norm);
      if (LEGAL_CODA.indexOf(single) !== -1) return s;                 // 合法尾照录
      if (steps) steps.push({ step: 'L4 词末修复', detail: '词末非法辅音 ' + single + ' → 补尾元音 e' });
      return s + 'e';
    }
    // 词末特许簇：流音 + {鼻音,s,th}
    var dn = denormDigraphs(norm);
    if (/^[rl](m|n|ng|ñ|s|th)$/.test(dn)) return s;                    // -rn -ln -rs -lth…
    // 响音 + {t,d} → 删 t/d
    if (/^(m|n|ng|ñ|l|r|s)[td]$/.test(dn)) {
      if (steps) steps.push({ step: 'L4 词末修复', detail: '响音+塞音词末簇 ' + dn + ' → 删末塞音' });
      return head + dn.slice(0, -1);
    }
    // 其余：补尾元音 e
    if (steps) steps.push({ step: 'L4 词末修复', detail: '词末非法簇 ' + dn + ' → 补 e' });
    return s + 'e';
  }
  function insertGlides(s) {
    var out = '', i = 0, prevV = null;
    while (i < s.length) {
      var v = matchFrom(s, i, ALL_VOWELS);
      if (v) {
        if (prevV) { out += glide(prevV); }
        out += v; prevV = v; i += v.length;
      } else { out += s.charAt(i); prevV = null; i += 1; }
    }
    return out;
  }
  function pseudoIpa(roman) {
    // 粗略 IPA：仅供展示
    var map = { 'th': 'θ', 'dh': 'ð', 'sh': 'ʃ', 'ng': 'ŋ', 'ñ': 'ɲ', 'h': 'x', 'r': 'ɾ', 'j': 'j', 'í': 'iː', 'á': 'aː', 'ó': 'oː', 'ú': 'uː', 'é': 'eː', 'ý': 'yː' };
    var s = roman.toLowerCase(), out = '', i = 0;
    while (i < s.length) {
      var two = s.substr(i, 2);
      if (map[two]) { out += map[two]; i += 2; continue; }
      var one = s.charAt(i);
      out += map[one] || one; i += 1;
    }
    return 'ˈ' + out;
  }

  function isPinyinLike(s) {
    // 全小写字母、含拼音典型串
    if (!/^[a-z]+$/.test(s)) return false;
    return /(zh|ch|sh|ng|ao|ou|ui|iu|ian|uan|ei|ai)/.test(s) || /^(bei|shang|nan|dong|xi|guang|cheng|jing)/.test(s);
  }

  function transliterateName(input) {
    if (typeof input !== 'string' || !input.trim()) {
      return { ok: false, error: '请输入拉丁字母或汉语拼音的名字', roman: '', ipa: '', steps: [] };
    }
    var raw = input.trim();
    var key = raw.toLowerCase();
    if (LOAN_CANON[key]) {
      var c = LOAN_CANON[key];
      return { ok: true, roman: c[0], ipa: c[1], steps: c[2].map(function (d, i) { return { step: '规范定形', detail: d }; }) };
    }
    if (!/[a-zà-ÿ]/i.test(raw)) {
      return { ok: false, error: '无法从汉字/非拉丁字符音译——请提供拼音或拉丁拼写（如「鑫」→「Xin」）', roman: '', ipa: '', steps: [] };
    }
    var res = ruleTransliterate(raw);
    if (res.ok) {
      // 单音节人名补 -il（§3.1）
      var vowelCount = (res.roman.match(/[aeiouyøàèìòùáéíóúýǿ]/gi) || []).length;
      if (vowelCount <= 1 && !endsInVowel(res.roman.toLowerCase())) {
        var withIl = joinMorph(res.roman, 'il');
        res.steps.push({ step: '§3.1 美化', detail: '单音节人名补 -il（爱称/入籍形）：' + res.roman + ' → ' + withIl + '（呼语用光杆 Ai, ' + res.roman + '!）' });
        res.roman = withIl.charAt(0).toUpperCase() + withIl.slice(1);
        res.ipa = pseudoIpa(res.roman);
      }
    }
    return res;
  }

  /* ============================================================
   * 中文直译（translateZh）与构句器（composeSentence）
   * ============================================================ */
  // 时距词 → 级别（F = 未来 = 级0 + 悬停调）
  var TIME_WORDS = {
    '现在': 0, '此刻': 0, '今天': 0, '如今': 0, '目前': 0, '当下': 0, '正在': 0, '眼下': 0,
    '昨天': 1, '以前': 1, '从前': 1, '过去': 1, '往昔': 1, '当年': 1, '曾经': 1, '以往': 1, '那时': 1, '昔日': 1, '早先': 1,
    '远古': 2, '太初': 2, '上古': 2, '古时': 2, '洪荒': 2, '远古时代': 2, '神话时代': 2, '亘古': 2,
    '明天': 'F', '将来': 'F', '以后': 'F', '将要': 'F', '快要': 'F', '明日': 'F', '不久': 'F', '日后': 'F'
  };
  var EVID_WORDS = {
    '亲眼': 'va', '亲见': 'va', '亲耳': 'va', '亲历': 'va', '亲眼看见': 'va',
    '据说': 're', '听说': 're', '相传': 're', '传说': 're', '据传': 're', '相传道': 're',
    '看来': 'dhi', '大概': 'dhi', '想必': 'dhi', '应该': 'dhi', '多半': 'dhi', '估计': 'dhi', '恐怕': 'dhi', '想来': 'dhi'
  };
  var EVID_LEVEL2_BIAS = { '相传': 1, '传说': 1, '据传': 1 };
  var NUM_ZH = { '零': 'thøn', '一': 'en', '二': 'dy', '两': 'dy', '三': 'thil', '四': 'vor', '五': 'lim', '六': 'zol', '七': 'nau', '八': 'oth', '九': 'gen', '十': 'dhul', '十一': 'mel', '十二': 'lár' };
  var MEASURE = ['把', '个', '条', '只', '碗', '杯', '张', '本', '匹', '头', '座', '支', '根', '片', '块', '位', '名', '棵', '朵', '道'];
  var PLURAL_MARK = ['们', '群', '众', '诸'];
  // 特殊功能字
  var STRUCT = { COP: ['是'], EXIST: ['在'], HAVE: ['有'], CMP: ['比'], GEN: ['的'], NEG: ['不', '没', '没有', '未', '别', '勿', '莫'], PROHIBIT: ['别', '勿', '莫', '不要'], IRR: ['吧', '愿', '请', '让'], Q: ['吗', '呢', '么'], PASSIVE: ['被'] };
  var DROP = ['了', '着', '过', '地', '得', '把', '就', '都', '也', '还', '一', '所', '之', '给', '将', '会', '要', '能', '可以', '很', '太', '更', '最', '叫', '叫做', '名为'];
  // 疑问词中文 → Sìlneth k- 词（§2.5.4）
  var QWORD = { '什么': 'kath', '谁': 'ken', '哪里': 'kis', '哪儿': 'kis', '何处': 'kis', '何时': 'kir', '什么时候': 'kir', '几': 'kem', '多少': 'kem', '哪个': 'kor', '为什么': 'kol', '怎么': 'kum', '如何': 'kum' };
  // 限定词（量词）：前置于名词，合成为量化名词短语（roman＝「量词 名词」，格/复数落末尾名词）
  var DET_TABLE = {
    hol: { roman: 'hol', zh: '所有', en: 'all' }, pan: { roman: 'pan', zh: '每', en: 'each' },
    tei: { roman: 'tei', zh: '某', en: 'a certain' }, anwe: { roman: 'anwe', zh: '任何', en: 'any' },
    mai: { roman: 'mai', zh: '许多', en: 'many' }, lith: { roman: 'lith', zh: '少许', en: 'few' },
    ves: { roman: 'ves', zh: '一些', en: 'some' }, søm: { roman: 'søm', zh: '几个', en: 'several' },
    noim: { roman: 'noim', zh: '无', en: 'no' }
  };
  var QUANT_ZH = { '所有': 'hol', '一切': 'hol', '全部': 'hol', '每': 'pan', '每个': 'pan', '每一': 'pan', '各': 'pan', '某': 'tei', '某个': 'tei', '某些': 'tei', '任何': 'anwe', '任一': 'anwe', '许多': 'mai', '很多': 'mai', '好多': 'mai', '少许': 'lith', '少量': 'lith', '一些': 'ves', '有些': 'ves', '几个': 'søm', '若干': 'søm', '数个': 'søm', '无': 'noim', '毫无': 'noim' };
  // 并列连词：两名词短语间 → 合成并列名词短语
  var CONJ_TABLE = { '=ve': { roman: '=ve', zh: '和', en: 'and' }, vo: { roman: 'vo', zh: '或', en: 'or' } };
  var CONJ_ZH = { '和': '=ve', '与': '=ve', '跟': '=ve', '同': '=ve', '及': '=ve', '以及': '=ve', '或': 'vo', '或者': 'vo' };
  // 从句连词：切分复句，各从句独立装配后拼接。role: sub=从属从句前导 / main=主句关联词前导 / coord=后续并列从句前导
  var CLAUSE_CONN = {
    '因为': { roman: 'fyr', gloss: '因为', role: 'sub' }, '由于': { roman: 'fyr', gloss: '因为', role: 'sub' },
    '如果': { roman: 'hwei', gloss: '如果', role: 'sub' }, '若': { roman: 'hwei', gloss: '如果', role: 'sub' }, '倘若': { roman: 'hwei', gloss: '如果', role: 'sub' }, '要是': { roman: 'hwei', gloss: '如果', role: 'sub' },
    '虽然': { roman: 'glau', gloss: '虽然', role: 'sub' }, '尽管': { roman: 'glau', gloss: '虽然', role: 'sub' },
    '除非': { roman: 'hlei', gloss: '除非', role: 'sub' },
    '为了': { roman: 'hyra', gloss: '为了', role: 'sub' }, '以便': { roman: 'hyra', gloss: '为了', role: 'sub' },
    '所以': { roman: 'sona', gloss: '所以', role: 'main' }, '因此': { roman: 'sona', gloss: '所以', role: 'main' }, '于是': { roman: 'sona', gloss: '所以', role: 'main' }, '故': { roman: 'sona', gloss: '所以', role: 'main' },
    '那么': { roman: 'tho', gloss: '那么', role: 'main' }, '则': { roman: 'tho', gloss: '那么', role: 'main' },
    '但是': { roman: 'nas', gloss: '但是', role: 'main' }, '然而': { roman: 'nas', gloss: '但是', role: 'main' }, '可是': { roman: 'nas', gloss: '但是', role: 'main' }, '不过': { roman: 'nas', gloss: '但是', role: 'main' },
    '而且': { roman: 'jai', gloss: '而且', role: 'coord' }, '并且': { roman: 'jai', gloss: '而且', role: 'coord' },
    '而': { roman: 'jo', gloss: '而', role: 'coord' }, '然后': { roman: 'jo', gloss: '然后', role: 'coord' }, '接着': { roman: 'jo', gloss: '然后', role: 'coord' }
  };

  // 最长匹配分词
  function segmentZh(text) {
    var keys = [];
    // 收集所有可识别 surface：时距、示证、数、结构、词库中文、量词、复数、drop
    var pool = {};
    function add(k) { if (k && k.length) pool[k] = true; }
    Object.keys(TIME_WORDS).forEach(add);
    Object.keys(EVID_WORDS).forEach(add);
    Object.keys(NUM_ZH).forEach(add);
    MEASURE.forEach(add); PLURAL_MARK.forEach(add); DROP.forEach(add);
    Object.keys(STRUCT).forEach(function (k) { STRUCT[k].forEach(add); });
    Object.keys(QWORD).forEach(add);
    Object.keys(QUANT_ZH).forEach(add);
    Object.keys(CONJ_ZH).forEach(add);
    Object.keys(CLAUSE_CONN).forEach(add);
    var zhIdx = buildZhIndex();
    Object.keys(zhIdx).forEach(add);
    keys = Object.keys(pool).sort(function (a, b) { return b.length - a.length; });

    var toks = [], i = 0, buf = '';
    var clean = text.replace(/[，。！？、；：\s]/g, function (m) { return ' ' + m + ' '; });
    // 处理标点作为分隔
    var chars = text.replace(/[。.！!？?：:、]/g, ' ').replace(/[，,；;]/g, ' ¦ ').trim();
    i = 0;
    while (i < chars.length) {
      if (chars.charAt(i) === ' ') { flush(); i++; continue; }
      if (chars.charAt(i) === '¦') { flush(); toks.push({ boundary: true }); i++; continue; }
      var matched = null;
      for (var k = 0; k < keys.length; k++) {
        if (chars.substr(i, keys[k].length) === keys[k]) { matched = keys[k]; break; }
      }
      if (matched) {
        flush();
        toks.push(matched);
        i += matched.length;
      } else {
        buf += chars.charAt(i); i++;
      }
    }
    flush();
    function flush() { if (buf) { toks.push({ unknown: buf }); buf = ''; } }
    return toks;
  }

  function tag(word) {
    if (typeof word === 'object' && word.boundary) return { t: 'boundary' };
    if (typeof word === 'object' && word.unknown) return { t: 'unknown', s: word.unknown };
    if (TIME_WORDS[word] !== undefined) return { t: 'time', s: word, v: TIME_WORDS[word] };
    if (EVID_WORDS[word]) return { t: 'evid', s: word, v: EVID_WORDS[word] };
    if (NUM_ZH[word]) return { t: 'num', s: word, roman: NUM_ZH[word] };
    if (MEASURE.indexOf(word) !== -1) return { t: 'measure', s: word };
    if (PLURAL_MARK.indexOf(word) !== -1) return { t: 'plural', s: word };
    if (STRUCT.COP.indexOf(word) !== -1) return { t: 'cop', s: word };
    if (STRUCT.EXIST.indexOf(word) !== -1) return { t: 'exist', s: word };
    if (STRUCT.HAVE.indexOf(word) !== -1) return { t: 'have', s: word };
    if (STRUCT.CMP.indexOf(word) !== -1) return { t: 'cmp', s: word };
    if (STRUCT.GEN.indexOf(word) !== -1) return { t: 'gen', s: word };
    if (STRUCT.PROHIBIT.indexOf(word) !== -1) return { t: 'prohibit', s: word };
    if (STRUCT.NEG.indexOf(word) !== -1) return { t: 'neg', s: word };
    if (STRUCT.IRR.indexOf(word) !== -1) return { t: 'irr', s: word };
    if (STRUCT.Q.indexOf(word) !== -1) return { t: 'q', s: word };
    if (STRUCT.PASSIVE.indexOf(word) !== -1) return { t: 'passive', s: word };
    if (QWORD[word]) return { t: 'qword', s: word, roman: QWORD[word] };
    if (CLAUSE_CONN[word]) return { t: 'conn', s: word, conn: CLAUSE_CONN[word] };
    if (QUANT_ZH[word]) return { t: 'quant', s: word, det: DET_TABLE[QUANT_ZH[word]] };
    if (CONJ_ZH[word]) return { t: 'conj', s: word, conj: CONJ_TABLE[CONJ_ZH[word]] };
    if (DROP.indexOf(word) !== -1) return { t: 'drop', s: word };
    var e = buildZhIndex()[word];
    if (e) return { t: e.pos, s: word, entry: e, vAlt: (ZH_INDEX_V[word] && ZH_INDEX_V[word] !== e) ? ZH_INDEX_V[word] : null };
    return { t: 'unknown', s: word };
  }

  function gloss(parts) { return parts.join(' '); }

  // 单从句特征收集（中文）→ F
  function buildFZh(toks, unmatched) {
    var level = 0, level2FromTime = false, future = false, evid = null, neg = false, prohibit = false, irr = false, q = false;
    var plural = false, cop = false, have = false, cmp = false, passive = false, passiveAt = -1;
    var nominals = [], verb = null, compVerb = null, adj = null, loc = null, qwordRoman = null;
    var expectLoc = false, pendDet = null, pendConj = null;

    // 量化：det + 名词 → 合成量化短语；并列：名词 + conj + 名词 → 合成并列短语
    function pushNom(entry) {
      var e = entry;
      if (pendDet) { e = synthNom(pendDet, e); pendDet = null; }
      if (pendConj && nominals.length) {
        var prev = nominals.pop();
        e = coordNom(prev, pendConj, e);
        pendConj = null;
        if (nominals.length === 0) plural = true;  // 并列主语 → 谓语复数一致
      }
      nominals.push(e);
    }

    // 预扫描：句中若无显式动词/系词/比较/领有，允许名动同形词升格为动词（「我理解真理」vs「理解需要时间」）
    var hasV = false, hasCop = false, hasCmp = false, hasHave = false, lastNomIdx = -1;
    for (var p0 = 0; p0 < toks.length; p0++) {
      var t0 = toks[p0].t;
      if (t0 === 'v') hasV = true; else if (t0 === 'cop') hasCop = true;
      else if (t0 === 'cmp') hasCmp = true; else if (t0 === 'have') hasHave = true;
      if (t0 === 'n' || t0 === 'pron') lastNomIdx = p0;
    }
    var allowVAlt = !hasV && !hasCop && !hasCmp && !hasHave;

    for (var idx = 0; idx < toks.length; idx++) {
      var tk = toks[idx];
      // 「在」窥视：仅当其后紧跟名词/代词/这里 才作处所；否则（如「在远古」）忽略
      if (expectLoc) {
        expectLoc = false;
        if (tk.t === 'n' || tk.t === 'pron') { loc = tk.entry; continue; }
        // 否则落到下面正常处理该 token
      }
      switch (tk.t) {
        case 'time':
          if (tk.v === 'F') { future = true; } else { level = Math.max(level, tk.v); if (tk.v === 2) level2FromTime = true; }
          break;
        case 'evid': evid = tk.v; if (EVID_LEVEL2_BIAS[tk.s]) { level = Math.max(level, 2); } break;
        case 'neg': neg = true; break;
        case 'prohibit': prohibit = true; neg = true; irr = true; break;
        case 'irr': irr = true; break;
        case 'q': q = true; break;
        case 'plural': plural = true; break;
        case 'cop': cop = true; break;
        case 'exist': expectLoc = true; break;
        case 'have': have = true; break;
        case 'cmp': cmp = true; break;
        case 'passive': passive = true; passiveAt = nominals.length; break;
        case 'quant': pendDet = tk.det; break;
        case 'conj': pendConj = tk.conj; break;
        case 'v': if (!verb) verb = tk.entry; else if (!compVerb) compVerb = tk.entry; else pushNom(tk.entry); break;
        case 'adj': adj = tk.entry; break;
        case 'n': case 'pron':
          if (allowVAlt && !verb && tk.vAlt) { verb = tk.vAlt; }
          else if (verb && !compVerb && tk.vAlt && idx < lastNomIdx && !cop) { compVerb = tk.vAlt; }  // 「需要理解真理」：同形词后仍有名词→补语动词
          else pushNom(tk.entry);
          break;
        case 'qword': qwordRoman = tk.roman; q = true; break;
        case 'unknown': if (unmatched) unmatched.push(tk.s); break;
        default: break; // drop/measure/gen/num/conn(切分层已处理)
      }
    }

    var passiveAgent = (passive && passiveAt >= 0 && nominals.length > passiveAt) ? nominals[passiveAt] : null;
    return {
      level: level, level2FromTime: level2FromTime, future: future, evid: evid,
      neg: neg, prohibit: prohibit, irr: irr, q: q, plural: plural,
      cop: cop, have: have, cmp: cmp, passive: passive, agent: passiveAgent,
      nominals: nominals, verb: verb, compVerb: compVerb, adj: adj, loc: loc, qwordRoman: qwordRoman,
      glossOf: zhOf
    };
  }

  // 复句切分：在从句连词或逗号边界处切段，连词领起其后的从句
  function splitClauses(toks) {
    var segs = [], cur = { lead: null, toks: [] };
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (tk.t === 'boundary') {
        if (cur.toks.length) { segs.push(cur); cur = { lead: null, toks: [] }; }
        continue;  // 空段（如「，那么」的逗号）直接忽略，保留已有 lead
      }
      if (tk.t === 'conn') {
        if (cur.toks.length === 0 && segs.length === 0 && !cur.lead) { cur.lead = tk.conn; }
        else if (cur.toks.length === 0 && cur.lead === null && segs.length) { cur.lead = tk.conn; }  // 逗号后紧跟连词
        else { segs.push(cur); cur = { lead: tk.conn, toks: [] }; }
      } else cur.toks.push(tk);
    }
    segs.push(cur);
    return segs.filter(function (s) { return s.toks.length > 0; });
  }

  // 复句装配：各从句独立装配 → 前置连词 → 逗号拼接 → 末句定终止调
  function assembleCompound(segs, trace, unmatched, text, buildF) {
    var pieces = [], glosses = [], lastMood = 'real', maxLevel = 0, leadNames = [];
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var F = buildF(seg.toks, unmatched);
      var r = assembleSentence(F, [], unmatched, text);
      var body = (r.roman || '').replace(/\s*[.~?!！]+\s*$/, '').trim();
      if ((i > 0 || seg.lead) && body) body = body.charAt(0).toLowerCase() + body.slice(1);
      pieces.push((seg.lead ? seg.lead.roman + ' ' : '') + body);
      var gbody = (r.gloss || '').replace(/\s*(REAL|IRR|Q)\s*$/, '');
      glosses.push((seg.lead ? seg.lead.gloss + ' ' : '') + gbody);
      if (seg.lead) leadNames.push(seg.lead.gloss);
      lastMood = r.mood || lastMood;
      maxLevel = Math.max(maxLevel, r.level || 0);
    }
    var joined = pieces.join(', ');
    joined = joined.charAt(0).toUpperCase() + joined.slice(1);
    joined += (lastMood === 'q') ? '?' : (lastMood === 'irr') ? '~' : '.';
    trace.push({ step: '⑨ 复句拼接', detail: '按连词「' + leadNames.join('／') + '」切为 ' + segs.length + ' 从句：各自定级/示证/装配后，从属连词前置领起从句，逗号拼接，末句承载终止调' });
    return { ok: unmatched.length === 0, roman: joined, gloss: glosses.join('  ┃  '), trans: text, level: maxLevel, evid: 'none', mood: lastMood, trace: trace, unmatched: unmatched, ipa: '' };
  }

  function translateZh(text) {
    var trace = [], unmatched = [];
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, roman: '', gloss: '', trans: '', level: 0, evid: 'none', mood: 'real', trace: [], unmatched: [], error: '请输入中文' };
    }
    var toks = segmentZh(text).map(tag);
    trace.push({ step: '① 语义分解', detail: '分词：' + toks.map(function (t) { return t.s || (t.unknown) || ''; }).filter(Boolean).join(' / ') });

    var segs = splitClauses(toks);
    if (segs.length >= 2) return assembleCompound(segs, trace, unmatched, text, buildFZh);

    var seg0 = segs[0] || { lead: null, toks: toks };
    var F = buildFZh(seg0.toks, unmatched);
    var res = assembleSentence(F, trace, unmatched, text);
    if (seg0.lead && res.roman) {  // 单从句带前导连词（如「因为…」片段）
      res.roman = cap(seg0.lead.roman + ' ' + res.roman.charAt(0).toLowerCase() + res.roman.slice(1));
      res.gloss = seg0.lead.gloss + ' ' + res.gloss;
    }
    return res;
  }

  /* ---------- 特征 → 句子装配（中英共用） ----------
   * F 由各语种分词器填好；glossOf 决定注释语（zhOf / enOf）。 */
  function assembleSentence(F, trace, unmatched, text) {
    var level = F.level, level2FromTime = F.level2FromTime, future = F.future, evid = F.evid;
    var neg = F.neg, prohibit = F.prohibit, irr = F.irr, q = F.q, plural = F.plural;
    var cop = F.cop, have = F.have, cmp = F.cmp, passive = F.passive, agent = F.agent;
    var nominals = F.nominals, verb = F.verb, compVerb = F.compVerb, adj = F.adj, loc = F.loc, qwordRoman = F.qwordRoman;
    var g = F.glossOf;
    function vGloss(v, lvl, person, pl) {
      var lvlTag = lvl === 0 ? 'NEAR' : lvl === 1 ? 'FAR' : 'ANC';
      return g(v) + '\\' + lvlTag + '-' + person + (pl ? 'PL' : 'SG');
    }

    // ② 时距定级
    if (future) { level = 0; irr = true; }
    trace.push({ step: '② 时距定级', detail: '级' + level + (future ? '（未来＝级0＋悬停调，未来无痕可磨）' : '') + '，依时间词/语篇判定' });

    // ③ 示证定值
    if (irr || future) { evid = null; trace.push({ step: '③ 示证定值', detail: '非现实句不带示证——未然之事无证据' }); }
    else if (q) { evid = null; trace.push({ step: '③ 示证定值', detail: '疑问句示证可省' }); }
    else {
      if (!evid && level >= 1) { evid = (level >= 2) ? 're' : 'va'; trace.push({ step: '③ 示证定值', detail: '级' + level + '陈述句必带示证，默认补 =' + evid + '（元音随时态同步磨蚀）' }); }
      else if (evid) { trace.push({ step: '③ 示证定值', detail: '=' + evid + '（元音随时态级同步磨蚀）' }); }
      else trace.push({ step: '③ 示证定值', detail: '级0 默认亲历，可省' });
    }

    // ④ 语气
    var mood = q ? 'q' : (irr ? 'irr' : 'real');
    trace.push({ step: '④ 语气/边界调', detail: mood === 'q' ? '疑问：上挑调 ?' : mood === 'irr' ? '非现实：悬停调 ~' : '断言：下跌调 .' });

    // 主语判定
    var subjEntry = nominals.length ? nominals[0] : null;
    var subjPerson = 3, subjPlural = plural;
    if (subjEntry) { var pr = detectPerson(subjEntry.roman); if (pr) { subjPerson = pr.person; subjPlural = subjPlural || pr.plural; } }
    function subjRoman(e, pl) { return decline(e.roman, { plural: !!pl && !e._coord, 'case': 'NOM' }); }

    // 疑问：X的Y (是) 什么 / 谁…（无动词、无领有）
    if (q && qwordRoman && !verb && !have && !cmp) {
      var np = nominals.map(function (e, k) { return (k < nominals.length - 1) ? decline(e.roman, { 'case': 'GEN' }) : e.roman; });
      var gq = nominals.map(function (e, k) { return g(e) + (k < nominals.length - 1 ? '-GEN' : '[NOM]'); });
      var outq = np.concat([qwordRoman]).join(' ') + '?';
      trace.push({ step: '⑥–⑧ 名词性疑问', detail: '属格链 + 疑问词 ' + qwordRoman + ' 落动前焦点位 + 上挑调' });
      return pack(outq, gq.concat([qwordRoman, 'Q']).join(' '), level, 'none', 'q', trace, unmatched, text);
    }

    // 领有：X有Y → X-DAT Y el
    if (have && nominals.length >= 2) {
      var holder = nominals[0], held = nominals[1];
      var elH = conjugate('el', { level: level, person: 3 });
      var outh = [decline(holder.roman, { 'case': 'DAT' }), held.roman, elH].join(' ');
      var glh = [g(holder) + '-DAT', g(held) + '[NOM]', 'be\\L' + level + '-3SG'];
      trace.push({ step: '⑥–⑧ 领有构式', detail: '无「有」动词：领有者-DAT + el（§3.5，「刀于我而在」）' });
      return finishPunct(outh, glh, level, mood, trace, unmatched, text, (mood === 'real' ? evid : null));
    }

    // 比较：X比Y Adj → X Y-ABL Adj
    if (cmp && adj && nominals.length >= 2) {
      var xEnt = nominals[0], yEnt = nominals[1];
      var outc = [xEnt.roman, decline(yEnt.roman, { 'case': 'ABL' }), adj.roman].join(' ');
      var glc = [g(xEnt) + '[NOM]', g(yEnt) + '-ABL', g(adj)];
      trace.push({ step: '⑥–⑧ 比较构式', detail: '基准-ABL + 形容词（§2.3，「比山更…」）' });
      return finishPunct(outc, glc, level, 'real', trace, unmatched, text, null);
    }

    // 系词/性质谓语：X(不)是Y / X Adj（无动词）
    if ((cop || adj) && !verb && subjEntry) {
      var predEnt = cop ? (nominals[1] || null) : null;
      var predRoman = predEnt ? predEnt.roman : (adj ? adj.roman : null);
      if (predRoman) {
        var needEl = !(level === 0 && mood === 'real');
        var seq2 = [subjRoman(subjEntry, subjPlural)];
        if (neg) seq2.push('ul');
        seq2.push(predRoman);
        if (needEl) seq2.push(conjugate('el', { level: level, person: subjPerson, plural: subjPlural }));
        var gl2 = [g(subjEntry) + (subjPlural ? '-PL' : '') + '[NOM]'].concat(neg ? ['NEG'] : []).concat([g(predEnt || adj)]).concat(needEl ? ['be\\L' + level] : []);
        trace.push({ step: '⑥–⑧ 系词句', detail: needEl ? '非级0/非现实：插 el 承载磨蚀与边界调（§2.4.6）' : '级0 现实：零系词（Dhe silwe.）' });
        return finishPunct(seq2.join(' '), gl2, level, mood, trace, unmatched, text, needEl && mood === 'real' ? evid : null);
      }
    }

    // 处所句：X在Y（无动词） → X Y-LOC (el)
    if (loc && !verb && subjEntry) {
      var needEl2 = !(level === 0 && mood === 'real');
      var seq3 = [subjRoman(subjEntry, subjPlural), decline(loc.roman, { 'case': 'LOC' })];
      if (needEl2) seq3.push(conjugate('el', { level: level, person: subjPerson, plural: subjPlural }));
      var gl3 = [g(subjEntry) + '[NOM]', g(loc) + '-LOC'].concat(needEl2 ? ['be\\L' + level] : []);
      trace.push({ step: '⑥–⑧ 处所句', detail: 'Y-LOC' + (needEl2 ? ' + el' : '（级0 零系词）') });
      return finishPunct(seq3.join(' '), gl3, level, mood, trace, unmatched, text, needEl2 && mood === 'real' ? evid : null);
    }

    // 被动：受事作主格主语 +（施事 INS）+ 中受动动词，与受事一致（§复用 -u- 中受动 + 工具格）
    if (passive && verb && subjEntry) {
      var patient = nominals[0];
      var pPerson = 3, pPlural = plural;
      var ppi = detectPerson(patient.roman); if (ppi) { pPerson = ppi.person; pPlural = pPlural || ppi.plural; }
      var pvform = conjugate(verb.roman, { level: level, person: pPerson, plural: pPlural, mid: true });
      var seqP = [subjRoman(patient, pPlural)];
      var glP = [g(patient) + (pPlural ? '-PL' : '') + '[NOM]'];
      if (level2FromTime) { seqP.push('vath'); glP.push('于远古'); }
      if (agent) { seqP.push(decline(agent.roman, { 'case': 'INS' })); glP.push(g(agent) + '-INS'); }
      if (neg) { seqP.push('ul'); glP.push('NEG'); }
      seqP.push(pvform);
      glP.push(g(verb) + '\\' + (level === 0 ? 'NEAR' : level === 1 ? 'FAR' : 'ANC') + '-' + pPerson + (pPlural ? 'PL' : 'SG') + '.MID');
      trace.push({ step: '⑥ 词汇映射', detail: '被动：受事「' + g(patient) + '」升为主格主语' + (agent ? '，施事「' + g(agent) + '」取工具格 -um（＝“被…”）' : '（施事隐含）') });
      trace.push({ step: '⑦ 形态生成', detail: '动词取中受动 -u- 形并与受事一致：' + pvform });
      trace.push({ step: '⑧ 语序编排', detail: '受事-NOM' + (agent ? ' + 施事-INS' : '') + ' + 中受动动词（SOV）' });
      return finishPunct(seqP.join(' '), glP, level, mood, trace, unmatched, text, (mood === 'real' ? evid : null));
    }

    // 一般 SVO / SV / 祈使
    if (verb) {
      var imperative = F.imperative || (irr && (prohibit || nominals.length === 0 || (subjEntry && detectPerson(subjEntry.roman) && detectPerson(subjEntry.roman).person === 2)));
      var subj1 = imperative ? null : subjEntry;
      var objE = null;
      if (imperative) { objE = nominals[0] || null; }
      else if (nominals.length >= 2) { objE = nominals[nominals.length - 1]; }

      var vperson, vplural;
      if (imperative) { vperson = 2; vplural = plural; }
      else if (subj1) { var pi = detectPerson(subj1.roman); vperson = pi ? pi.person : 3; vplural = pi ? (pi.plural || subjPlural) : subjPlural; }
      else { vperson = 1; vplural = false; } // 省略主语默认 1SG

      var vform = conjugate(verb.roman, { level: level, person: vperson, plural: vplural });

      var seqV = [], gl = [];
      if (subj1) { seqV.push(subjRoman(subj1, vplural)); gl.push(g(subj1) + (vplural ? '-PL' : '') + '[NOM]'); }
      if (level2FromTime && !loc) { seqV.push('vath'); gl.push('于远古'); }  // 化石副词消歧（§2.4.4 修补法a）
      if (loc) { seqV.push(decline(loc.roman, { 'case': 'LOC' })); gl.push(g(loc) + '-LOC'); }
      if (level2FromTime && loc) { seqV.splice(seqV.length - 1, 0, 'vath'); gl.splice(gl.length - 1, 0, '于远古'); }
      if (objE) { seqV.push(decline(objE.roman, { 'case': 'ACC' })); gl.push(g(objE) + '-ACC'); }
      if (neg) { seqV.push('ul'); gl.push('NEG'); }
      if (compVerb) { seqV.push(nonfinite(compVerb.roman, 'cvb', level)); gl.push(g(compVerb) + '-CVB'); }  // 补语动词取副动词 -um（§2.4 非限定形）
      seqV.push(vform);
      gl.push(vGloss(verb, level, vperson, vplural));

      trace.push({ step: '⑥ 词汇映射', detail: '动词 √' + verb.roman.toUpperCase() + '「' + g(verb) + '」' + (objE ? '，宾语「' + g(objE) + '」' : '') });
      trace.push({ step: '⑦ 形态生成', detail: '磨蚀级' + level + ' 词根 → ' + vform + '（一致 ' + vperson + (vplural ? 'PL' : 'SG') + '，后缀不磨）' });
      trace.push({ step: '⑧ 语序编排', detail: imperative ? 'SOV 祈使：第二人称形 + 悬停调' : 'SOV：' + (subj1 ? '主-' : '') + (objE ? '宾-' : '') + '动' });
      return finishPunct(seqV.join(' '), gl, level, mood, trace, unmatched, text, (mood === 'real' ? evid : null));
    }

    // 无动词无结构
    if (nominals.length) {
      return { ok: false, roman: nominals.map(function (e) { return e.roman; }).join(' '), gloss: nominals.map(g).join(' '), trans: text, level: level, evid: 'none', mood: mood, trace: trace, unmatched: unmatched, error: '未找到动词或可识别句型——试试「构句器」逐件拼装。' };
    }
    return { ok: false, roman: '', gloss: '', trans: text, level: level, evid: 'none', mood: mood, trace: trace, unmatched: unmatched, error: '这句超出当前规则直译的句型范围。' };

    // ---- 收尾 ----
    function pack(o, gg, lv, ev, md, tr, um, txt) {
      return { ok: um.length === 0, roman: cap(o), gloss: gg, trans: txt, level: lv, evid: ev, mood: md, trace: tr, unmatched: um, ipa: '' };
    }
    function finishPunct(o, gg, lv, md, tr, um, txt, evKind) {
      var seq = o;
      if (evKind && md === 'real') seq += ' ' + evidential(evKind, lv, 0);
      seq += (md === 'q') ? '?' : (md === 'irr') ? '~' : '.';
      var glStr = gg.join(' ') + (evKind && md === 'real' ? ' =' + evKind.toUpperCase() : '') + ' ' + (md === 'q' ? 'Q' : md === 'irr' ? 'IRR' : 'REAL');
      return { ok: um.length === 0, roman: cap(seq), gloss: glStr, trans: txt, level: lv, evid: (evKind || 'none'), mood: md, trace: tr, unmatched: um, ipa: '' };
    }
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function detectPerson(roman) {
    var map = { ni: { person: 1, plural: false }, nin: { person: 1, plural: true }, vy: { person: 2, plural: false }, vyn: { person: 2, plural: true }, dhe: { person: 3, plural: false }, dhen: { person: 3, plural: true }, tha: { person: 3, plural: false }, than: { person: 3, plural: true } };
    return map[roman] || null;
  }
  // 合成量化短语（det + 名词）：格/复数后缀由 decline 落到末尾名词
  function synthNom(det, entry) {
    if (!det) return entry;
    var nz = (entry.zh && entry.zh[0]) || entry.roman;
    return { roman: det.roman + ' ' + entry.roman, zh: [det.zh + nz], en: [det.en + ' ' + enOf(entry)], pos: entry.pos || 'n', _synthetic: true };
  }
  // 合成并列短语（名词 + 连词 + 名词）
  function coordNom(a, conj, b) {
    var az = (a.zh && a.zh[0]) || a.roman, bz = (b.zh && b.zh[0]) || b.roman;
    return { roman: a.roman + ' ' + conj.roman + ' ' + b.roman, zh: [az + conj.zh + bz], en: [enOf(a) + ' ' + conj.en + ' ' + enOf(b)], pos: 'n', _synthetic: true, _coord: true };
  }
  function zhOf(e) { return (e && e.zh && e.zh[0]) || (e && e.roman) || '?'; }
  function enOf(e) {
    if (!e) return '?';
    if (e.en && e.en[0]) return e.en[0];
    var base = e.roman;
    if (EN_GLOSS[base] && EN_GLOSS[base][0]) return EN_GLOSS[base][0];
    return (e.zh && e.zh[0]) || base || '?';
  }
  function verbGloss(v, level, person, plural) {
    var lvlTag = level === 0 ? 'NEAR' : level === 1 ? 'FAR' : 'ANC';
    return zhOf(v) + '\\' + lvlTag + '-' + person + (plural ? 'PL' : 'SG');
  }

  /* ============================================================
   * 英文输入直译（translateEn）
   * 与 translateZh 共用 assembleSentence；差异仅在分词与特征映射。
   * ============================================================ */
  // 代词 → 基式罗马字（复数由 plural 标志经 decline 生成，避免二次加缀）
  var EN_PRON = {
    i: { r: 'ni' }, me: { r: 'ni' }, we: { r: 'ni', pl: true }, us: { r: 'ni', pl: true },
    you: { r: 'vy' }, he: { r: 'dhe' }, she: { r: 'dhe' }, him: { r: 'dhe' }, her: { r: 'dhe' },
    it: { r: 'tha' }, they: { r: 'dhe', pl: true }, them: { r: 'dhe', pl: true },
    this: { r: 'sa' }, that: { r: 'tor' }, these: { r: 'sa', pl: true }, those: { r: 'tor', pl: true },
    self: { r: 'øs' }, oneself: { r: 'øs' }
  };
  // 物主限定词 → 领有者代词（进属格链）
  var EN_POSS = { my: 'ni', your: 'vy', his: 'dhe', its: 'tha', our: 'ni', their: 'dhe' };
  // 处所指示词 → loc 词条
  var EN_LOCWORD = { here: { roman: 'sa', pos: 'pron', en: ['here'], zh: ['这里'] }, there: { roman: 'tor', pos: 'pron', en: ['there'], zh: ['那里'] } };
  var EN_TIME = {
    now: 0, today: 0, currently: 0, nowadays: 0,
    yesterday: 1, before: 1, ago: 1, previously: 1, once: 1, formerly: 1, earlier: 1, recently: 1,
    anciently: 2,
    tomorrow: 'F', soon: 'F', later: 'F', someday: 'F'
  };
  var EN_EVID = {
    firsthand: 'va',
    reportedly: 're', supposedly: 're', allegedly: 're', purportedly: 're',
    apparently: 'dhi', presumably: 'dhi', probably: 'dhi', seemingly: 'dhi', evidently: 'dhi'
  };
  var EN_QWORD = { what: 'kath', who: 'ken', whom: 'ken', where: 'kis', when: 'kir', why: 'kol', how: 'kum', which: 'kor' };
  var EN_COP = ['is', 'am', 'are', 'was', 'were', 'be'];
  var EN_HAVE = ['have', 'has', 'had'];
  var EN_NEG = ['not', 'no', 'never'];
  var EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  var EN_QUANT = { all: 'hol', every: 'pan', each: 'pan', any: 'anwe', many: 'mai', much: 'mai', some: 'ves', several: 'søm', few: 'lith', certain: 'tei' };
  var EN_CONJ = { and: '=ve', or: 'vo' };
  var EN_LOCPREP = ['in', 'on', 'at', 'inside', 'within'];
  var EN_DROP = ['a', 'an', 'the', 'of', 'to', 'been', 'being', 'got', 'do', 'does'];
  var EN_PASTHINT = ['was', 'were', 'had', 'did'];
  // 多词短语（先于逐词分类）：词序数组 → {type,val}
  var EN_PHRASES = [
    { w: ['in', 'ancient', 'times'], type: 'time', val: 2 },
    { w: ['in', 'the', 'old', 'days'], type: 'time', val: 2 },
    { w: ['long', 'ago'], type: 'time', val: 2 },
    { w: ['of', 'old'], type: 'time', val: 2 },
    { w: ['used', 'to'], type: 'time', val: 1 },
    { w: ['it', 'is', 'said'], type: 'evid', val: 're' },
    { w: ['they', 'say'], type: 'evid', val: 're' },
    { w: ['it', 'seems'], type: 'evid', val: 'dhi' },
    { w: ['it', 'appears'], type: 'evid', val: 'dhi' },
    { w: ['how', 'many'], type: 'qword', val: 'kem' },
    { w: ['how', 'much'], type: 'qword', val: 'kem' },
    { w: ['going', 'to'], type: 'future' }
  ];
  var EN_CONTRACT = {
    "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'], "won't": ['will', 'not'],
    "can't": ['can', 'not'], cannot: ['can', 'not'], "isn't": ['is', 'not'], "aren't": ['are', 'not'],
    "wasn't": ['was', 'not'], "weren't": ['were', 'not'], "i'm": ['i', 'am'], "you're": ['you', 'are'],
    "he's": ['he', 'is'], "she's": ['she', 'is'], "it's": ['it', 'is'], "that's": ['that', 'is'],
    "we're": ['we', 'are'], "they're": ['they', 'are'], "i've": ['i', 'have'], "you've": ['you', 'have'],
    "we've": ['we', 'have'], "they've": ['they', 'have']
  };
  // 不规则屈折 → 词库英文释义键；顺带标注过去式（见 EN_PASTHINT + 此表值域）
  var EN_IRREG = {
    sang: 'sing', sung: 'sing', stood: 'stand', went: 'go', gone: 'go', came: 'come', ran: 'run',
    saw: 'see', seen: 'see', made: 'make', gave: 'give', took: 'take', held: 'hold', threw: 'throw',
    thrown: 'throw', said: 'say', heard: 'hear', knew: 'know', known: 'know', thought: 'think',
    forgot: 'forget', forgotten: 'forget', found: 'find', lost: 'lose', began: 'begin', begun: 'begin',
    ate: 'eat', eaten: 'eat', sat: 'sit', lay: 'lie', slept: 'sleep', died: 'die', grew: 'grow',
    grown: 'grow', fought: 'fight', bound: 'bind', wept: 'weep', broke: 'break', broken: 'break',
    wove: 'weave', blew: 'blow', blown: 'blow', rose: 'rise', risen: 'rise', flew: 'fly', flown: 'fly',
    swam: 'swim', swum: 'swim', fell: 'fall', fallen: 'fall', burnt: 'burn',
    built: 'build', felt: 'feel', ground: 'grind',
    feet: 'foot', teeth: 'tooth', men: 'man', women: 'woman', children: 'child', mice: 'mouse'
  };
  var EN_IRREG_PAST = { sang: 1, sung: 1, stood: 1, went: 1, came: 1, ran: 1, saw: 1, made: 1, gave: 1, took: 1, held: 1, threw: 1, said: 1, heard: 1, knew: 1, thought: 1, forgot: 1, found: 1, lost: 1, began: 1, ate: 1, sat: 1, lay: 1, slept: 1, died: 1, grew: 1, fought: 1, bound: 1, wept: 1, broke: 1, wove: 1, blew: 1, rose: 1, flew: 1, swam: 1, fell: 1, burnt: 1, built: 1, felt: 1 };
  var EN_IRREG_PLURAL = { feet: 1, teeth: 1, men: 1, women: 1, children: 1, mice: 1 };
  // 派生/补充词（镜像中文 SUPPLEMENT）
  var EN_SUPPLEMENT = {
    singer: { roman: 'silwe', pos: 'n', en: ['singer'], zh: ['歌者'] },
    singers: { roman: 'silwe', pos: 'n', en: ['singer'], zh: ['歌者'], pl: true },
    song: { roman: 'silneth', pos: 'n', en: ['song'], zh: ['歌'] },
    songs: { roman: 'silneth', pos: 'n', en: ['song'], zh: ['歌'], pl: true },
    tale: { roman: 'silneth', pos: 'n', en: ['tale'], zh: ['讲述'] },
    story: { roman: 'silneth', pos: 'n', en: ['story'], zh: ['讲述'] },
    place: { roman: 'silos', pos: 'n', en: ['hall'], zh: ['诵厅'] }
  };

  var EN_INDEX = null, EN_INDEX_V = null;
  function buildEnIndex() {
    if (EN_INDEX) return EN_INDEX;
    EN_INDEX = {}; EN_INDEX_V = {};
    function put(word, e) { word = word.toLowerCase(); if (word && word.indexOf('(') === -1 && word.indexOf(' ') === -1 && !EN_INDEX[word]) EN_INDEX[word] = e; }
    // 第一遍：首选义（index 0）
    for (var i = 0; i < LEX.length; i++) { var e = LEX[i]; var g = EN_GLOSS[e.roman]; if (g && g[0]) put(g[0], e); }
    // 第二遍：次选义
    for (var j = 0; j < LEX.length; j++) { var e2 = LEX[j]; var g2 = EN_GLOSS[e2.roman] || []; for (var k = 1; k < g2.length; k++) put(g2[k], e2); }
    // 动词消歧层：零派生名/动同形（plan/judge/name）的动词候选
    for (var m = 0; m < LEX.length; m++) {
      var ev = LEX[m]; if (ev.pos !== 'v') continue;
      var gv = EN_GLOSS[ev.roman] || [];
      for (var n = 0; n < gv.length; n++) { var wv = gv[n].toLowerCase(); if (wv && wv.indexOf('(') === -1 && wv.indexOf(' ') === -1 && !EN_INDEX_V[wv]) EN_INDEX_V[wv] = ev; }
    }
    // 补充词覆盖
    Object.keys(EN_SUPPLEMENT).forEach(function (w) { EN_INDEX[w] = EN_SUPPLEMENT[w]; });
    return EN_INDEX;
  }

  function enLemmas(w) {
    var out = [w];
    if (EN_IRREG[w]) out.push(EN_IRREG[w]);
    if (/ves$/.test(w)) { out.push(w.replace(/ves$/, 'f')); out.push(w.replace(/ves$/, 'fe')); }
    if (/ies$/.test(w)) out.push(w.replace(/ies$/, 'y'));
    if (/(ches|shes|sses|xes|zes)$/.test(w)) out.push(w.replace(/es$/, ''));
    if (/es$/.test(w)) out.push(w.replace(/es$/, ''));
    if (/s$/.test(w)) out.push(w.replace(/s$/, ''));
    if (/ing$/.test(w)) { out.push(w.replace(/ing$/, '')); out.push(w.replace(/ing$/, 'e')); }
    if (/ed$/.test(w)) { out.push(w.replace(/ed$/, '')); out.push(w.replace(/ed$/, 'e')); }
    if (/er$/.test(w)) { out.push(w.slice(0, -2)); out.push(w.slice(0, -1)); }
    var dm = w.match(/^(.*?)([bcdfghjklmnpqrstvwz])\2(ing|ed|er)$/);
    if (dm) out.push(dm[1] + dm[2]);
    return out;
  }
  function enLookup(w) {
    var idx = buildEnIndex(), lem = enLemmas(w);
    for (var i = 0; i < lem.length; i++) if (idx[lem[i]]) {
      var hit = idx[lem[i]];
      var vAlt = (EN_INDEX_V[lem[i]] && EN_INDEX_V[lem[i]] !== hit) ? EN_INDEX_V[lem[i]] : null;
      return { entry: hit, via: lem[i], vAlt: vAlt };
    }
    return null;
  }

  // 英文从句连词
  var EN_CLAUSE_CONN = {
    because: { roman: 'fyr', gloss: '因为', role: 'sub' }, since: { roman: 'fyr', gloss: '因为', role: 'sub' },
    'if': { roman: 'hwei', gloss: '如果', role: 'sub' },
    although: { roman: 'glau', gloss: '虽然', role: 'sub' }, though: { roman: 'glau', gloss: '虽然', role: 'sub' },
    unless: { roman: 'hlei', gloss: '除非', role: 'sub' },
    so: { roman: 'sona', gloss: '所以', role: 'main' }, therefore: { roman: 'sona', gloss: '所以', role: 'main' },
    then: { roman: 'tho', gloss: '那么', role: 'main' },
    but: { roman: 'nas', gloss: '但是', role: 'main' }, however: { roman: 'nas', gloss: '但是', role: 'main' },
    moreover: { roman: 'jai', gloss: '而且', role: 'coord' }
  };
  function splitClausesEn(toks) {
    var segs = [], cur = { lead: null, toks: [] };
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (tk.word === '¦') {
        if (cur.toks.length) { segs.push(cur); cur = { lead: null, toks: [] }; }
        continue;
      }
      var cw = (tk.word && EN_CLAUSE_CONN[tk.word]) ? EN_CLAUSE_CONN[tk.word] : null;
      if (cw) {
        if (cur.toks.length === 0 && segs.length === 0 && !cur.lead) cur.lead = cw;
        else if (cur.toks.length === 0 && cur.lead === null && segs.length) cur.lead = cw;  // 逗号后紧跟连词
        else { segs.push(cur); cur = { lead: cw, toks: [] }; }
      } else cur.toks.push(tk);
    }
    segs.push(cur);
    return segs.filter(function (s) { return s.toks.length > 0; });
  }

  // 单从句特征收集（英文）→ F
  function buildFEn(toks, qmark, exclaim, unmatched) {
    var level = 0, level2FromTime = false, future = false, evid = null, neg = false, prohibit = false, irr = false, q = qmark;
    var plural = false, cop = false, have = false, cmp = false, pastHint = false, please = false;
    var nominals = [], verb = null, compVerb = null, adj = null, loc = null, qwordRoman = null, expectLoc = false;
    var verbFirst = false, hadSubjectPronoun = false, verbSurface = null, sawBy = false;
    var pendDet = null, pendConj = null;

    function pushNominal(entry, isPlural) {
      var e = entry;
      if (pendDet) { e = synthNom(pendDet, e); pendDet = null; }
      if (pendConj && nominals.length) {
        var prev = nominals.pop();
        e = coordNom(prev, pendConj, e);
        pendConj = null;
        if (nominals.length === 0) plural = true;  // 并列主语 → 复数
      }
      if (nominals.length === 0 && isPlural) plural = true;  // 主语复数 → 句级 plural
      nominals.push(e);
    }

    // 预扫描：从句无显式动词/系词/比较/领有时，允许零派生名动同形升格（"i plan the feast" vs "the plan is good"）
    var hasV = false, hasCopW = false, hasCmpW = false, hasHaveW = false;
    for (var p0 = 0; p0 < toks.length; p0++) {
      var w0 = toks[p0].word;
      if (!w0) continue;
      if (EN_COP.indexOf(w0) !== -1) hasCopW = true;
      else if (w0 === 'than') hasCmpW = true;
      else if (EN_HAVE.indexOf(w0) !== -1 || w0 === 'had') hasHaveW = true;
      else { var lk0 = enLookup(w0); if (lk0 && lk0.entry.pos === 'v') hasV = true; }
    }
    var allowVAlt = !hasV && !hasCopW && !hasCmpW && !hasHaveW;

    for (var t = 0; t < toks.length; t++) {
      var tk = toks[t];
      if (tk.meta) {
        var mt = tk.meta;
        if (mt.type === 'time') { if (mt.val === 2) { level = Math.max(level, 2); level2FromTime = true; } else level = Math.max(level, mt.val); }
        else if (mt.type === 'evid') { evid = mt.val; }
        else if (mt.type === 'qword') { qwordRoman = mt.val; q = true; }
        else if (mt.type === 'future') { future = true; }
        continue;
      }
      var w = tk.word;
      if (expectLoc) {
        if (w === 'the' || w === 'a' || w === 'an') continue;  // 冠词不消耗 expectLoc
        expectLoc = false;
        var le = enLookup(w);
        if (le && (le.entry.pos === 'n' || le.entry.pos === 'pron')) { loc = le.entry; continue; }
      }
      if (w === 'please') { please = true; irr = true; continue; }
      if (w === 'will' || w === 'shall') { future = true; continue; }
      if (w === 'than') { cmp = true; continue; }
      if (w === 'by') { sawBy = true; continue; }  // 被动施事标记（后接名词＝施事）
      if (EN_PASTHINT.indexOf(w) !== -1) { pastHint = true; /* was/were→cop; had→have */ if (w === 'was' || w === 'were') cop = true; if (w === 'had') have = true; continue; }
      if (EN_TIME[w] !== undefined) { if (EN_TIME[w] === 'F') future = true; else { level = Math.max(level, EN_TIME[w]); if (EN_TIME[w] === 2) level2FromTime = true; } continue; }
      if (EN_EVID[w]) { evid = EN_EVID[w]; continue; }
      if (EN_QWORD[w]) { qwordRoman = EN_QWORD[w]; q = true; continue; }
      if (EN_NEG.indexOf(w) !== -1) { neg = true; continue; }
      if (EN_COP.indexOf(w) !== -1) { cop = true; continue; }
      if (EN_HAVE.indexOf(w) !== -1) { have = true; continue; }
      if (EN_LOCPREP.indexOf(w) !== -1) { expectLoc = true; continue; }
      if (EN_LOCWORD[w]) { loc = EN_LOCWORD[w]; continue; }
      if (EN_POSS[w]) { var pe = entryByRoman(EN_POSS[w]); if (pe) pushNominal(pe, false); continue; }
      if (EN_PRON[w]) { var pr = EN_PRON[w], ent = entryByRoman(pr.r); if (ent) { if (nominals.length === 0) hadSubjectPronoun = true; pushNominal(ent, !!pr.pl); } continue; }
      if (EN_NUM.indexOf(w) !== -1) { continue; }  // 数词：与中文路径一致，暂不落位
      if (EN_QUANT[w]) { pendDet = DET_TABLE[EN_QUANT[w]]; continue; }
      if (EN_CONJ[w]) { pendConj = CONJ_TABLE[EN_CONJ[w]]; continue; }
      if (EN_DROP.indexOf(w) !== -1) { continue; }
      // 内容词查表（含屈折还原）
      var look = enLookup(w);
      if (look) {
        var e = look.entry, pos = e.pos;
        if (EN_IRREG_PAST[w]) pastHint = true;
        if (pos === 'v') { if (!verb) { verb = e; verbFirst = (nominals.length === 0); verbSurface = w; } else if (!compVerb) { compVerb = e; } else pushNominal(e, false); }
        else if (allowVAlt && !verb && look.vAlt) { verb = look.vAlt; verbFirst = (nominals.length === 0); verbSurface = w; }
        else if (pos === 'adj') { adj = e; }
        else { // n / pron / num / func → 名词性
          var isPl = (EN_IRREG_PLURAL[w] === 1) || (e.pl === true) || (/s$/.test(w) && look.via !== w && pos === 'n');
          pushNominal(e, isPl);
        }
        continue;
      }
      unmatched.push(w);
    }

    // 过去式启示：无显式时间且非未来 → 提升到级1（触发示证）
    if (!future && level === 0 && pastHint) level = 1;
    // 无主语的否定动词 ≈ 否定祈使（don't sing）
    if (neg && verb && nominals.length === 0) { prohibit = true; irr = true; }
    // 英语祈使可靠信号：动词居句首且无代词主语（不影响"the river flows"这类名词主语陈述句）
    var imperative = !!(verb && verbFirst && !hadSubjectPronoun && !cop && !have && !cmp && !q);
    if (imperative || (exclaim || please) && verb) irr = true;

    // 被动：be 动词 + 实义动词（排除 -ing 进行式为主动）→ 受事升主语；"by X" 为施事
    var enPassive = !!(cop && verb && verbSurface && !/ing$/.test(verbSurface));
    var enAgent = (enPassive && sawBy && nominals.length >= 2) ? nominals[nominals.length - 1] : null;

    return {
      level: level, level2FromTime: level2FromTime, future: future, evid: evid,
      neg: neg, prohibit: prohibit, irr: irr, q: q, plural: plural,
      cop: cop && !enPassive, have: have, cmp: cmp, imperative: imperative,
      passive: enPassive, agent: enAgent,
      nominals: nominals, verb: verb, compVerb: compVerb, adj: adj, loc: loc, qwordRoman: qwordRoman,
      glossOf: enOf
    };
  }

  function translateEn(text) {
    var trace = [], unmatched = [];
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, roman: '', gloss: '', trans: '', level: 0, evid: 'none', mood: 'real', trace: [], unmatched: [], error: 'Please enter English.' };
    }
    var qmark = /\?/.test(text), exclaim = /!/.test(text);
    // 小写、去标点（留 ' 与 -）、拆词、展开缩写、剥离所有格 's
    var raw = text.toLowerCase().replace(/[,;]/g, ' ¦ ').replace(/[^a-z0-9'¦\s-]/g, ' ').split(/\s+/).filter(Boolean);
    var words = [];
    raw.forEach(function (w) {
      if (EN_CONTRACT[w]) { EN_CONTRACT[w].forEach(function (x) { words.push(x); }); return; }
      var m = w.match(/^(.+)'s$/); if (m) { words.push(m[1]); return; }  // 所有格：留基词，顺序即属格
      words.push(w);
    });
    // 多词短语预处理 → 生成 meta 记号；其余为普通词串
    var toks = [];
    for (var i = 0; i < words.length;) {
      var hit = null;
      for (var p = 0; p < EN_PHRASES.length; p++) {
        var ph = EN_PHRASES[p], ok = true;
        for (var qq = 0; qq < ph.w.length; qq++) { if (words[i + qq] !== ph.w[qq]) { ok = false; break; } }
        if (ok) { hit = ph; break; }
      }
      if (hit) { toks.push({ meta: hit }); i += hit.w.length; }
      else { toks.push({ word: words[i] }); i += 1; }
    }
    trace.push({ step: '① 语义分解', detail: 'tokenize: ' + words.join(' / ') });

    var segs = splitClausesEn(toks);
    var buildF = function (t, u) { return buildFEn(t, qmark, exclaim, u); };
    if (segs.length >= 2) return assembleCompound(segs, trace, unmatched, text, buildF);

    var seg0 = segs[0] || { lead: null, toks: toks };
    var F = buildF(seg0.toks, unmatched);
    var res = assembleSentence(F, trace, unmatched, text);
    if (seg0.lead && res.roman) {
      res.roman = cap(seg0.lead.roman + ' ' + res.roman.charAt(0).toLowerCase() + res.roman.slice(1));
      res.gloss = seg0.lead.gloss + ' ' + res.gloss;
    }
    return res;
  }

  /* ---------- 构句器（composeSentence） ---------- */
  function composeSentence(opts) {
    opts = opts || {};
    var trace = [];
    if (!opts.verb || !opts.verb.roman) {
      return { ok: false, roman: '', gloss: '', trans: '', level: opts.level || 0, evid: 'none', mood: opts.mood || 'real', trace: [], unmatched: [], error: '缺少动词' };
    }
    var level = (opts.level != null) ? opts.level : 0;
    if (level < 0 || level > 2) return { ok: false, error: '磨蚀级只能是 0/1/2', roman: '', gloss: '', trans: '', level: 0, evid: 'none', mood: 'real', trace: [], unmatched: [] };
    var mood = opts.mood || 'real';
    var person = opts.person || (opts.subj ? 3 : 1);
    var pr = opts.subj ? detectPerson(opts.subj.roman) : null;
    if (pr) { person = pr.person; }
    var plural = !!opts.subjPlural || (pr && pr.plural);

    // 示证：irr 强制无；real 且级≥1 强制补
    var evid = opts.evid;
    if (mood === 'irr') {
      if (evid && evid !== 'none') trace.push({ step: '示证守恒', detail: '非现实句不带示证（§2.4.4-2），已移除 =' + evid });
      evid = 'none';
    } else if (mood === 'real') {
      if ((!evid || evid === 'none' || evid === undefined) && level >= 1) {
        evid = (level >= 2) ? 're' : 'va';
        trace.push({ step: '示证补全', detail: '级' + level + '现实句必带示证，自动补 =' + evid });
      }
    } else if (mood === 'q') {
      if (evid === undefined) evid = 'none';
    }
    if (evid === undefined) evid = 'none';

    var seq = [], gl = [];
    if (opts.subj) {
      if (plural && !(pr)) { seq.push(decline(opts.subj.roman, { plural: true, 'case': 'NOM' })); gl.push(subjZh(opts.subj) + '-PL[NOM]'); }
      else { seq.push(opts.subj.roman); gl.push(subjZh(opts.subj) + '[NOM]'); }
    }
    if (opts.obj) {
      seq.push(decline(opts.obj.roman, { 'case': 'ACC', plural: !!opts.objPlural }));
      gl.push(subjZh(opts.obj) + (opts.objPlural ? '-PL' : '') + '-ACC');
    }
    if (opts.neg) { seq.push('ul'); gl.push('NEG'); }
    var vform = conjugate(opts.verb.roman, { level: level, person: person, plural: plural, pfv: !!opts.pfv, mid: !!opts.mid });
    seq.push(vform);
    var lvlTag = level === 0 ? 'NEAR' : level === 1 ? 'FAR' : 'ANC';
    gl.push(verbRootZh(opts.verb) + '\\' + lvlTag + (opts.mid ? '-MID' : '') + (opts.pfv ? '-PFV' : '') + '-' + person + (plural ? 'PL' : 'SG'));

    var roman = seq.join(' ');
    var evStr = '';
    if (evid && evid !== 'none' && mood === 'real') { evStr = ' ' + evidential(evid, level, 0); roman += evStr; gl.push('=' + evid.toUpperCase()); }
    roman += (mood === 'q') ? '?' : (mood === 'irr') ? '~' : '.';
    gl.push(mood === 'q' ? 'Q' : mood === 'irr' ? 'IRR' : 'REAL');
    trace.push({ step: 'SOV 编排', detail: (opts.subj ? '主-' : '') + (opts.obj ? '宾-' : '') + '动' + (evid !== 'none' ? ' + 示证' : '') + ' + 边界调' });

    return { ok: true, roman: cap(roman), gloss: gl.join(' '), trans: '', level: level, evid: evid, mood: mood, trace: trace, unmatched: [], ipa: '' };
  }
  function subjZh(o) { if (o.zh) return o.zh; var e = entryByRoman(o.roman); return e ? zhOf(e) : o.roman; }
  function verbRootZh(o) { var e = entryByRoman(o.roman); return e ? zhOf(e) : o.roman; }

  /* ---------- 常用语（参考书例文集） ---------- */
  var PHRASEBOOK = [
    { zh: '炉火满吗？', roman: 'Fairn hom?', gloss: '炉火[NOM] 满的 Q', note: '客至门礼。答：Hom. Gweno~「满的，进来吧」' },
    { zh: '你活着（安好）？', roman: 'Vy dheso?', gloss: '你[NOM] 活\\NEAR-2SG Q', note: '雪谷冬日问候。答：Dhese.「我活着」' },
    { zh: '愿你屹立。', roman: 'Láno~', gloss: '屹立\\NEAR-2SG IRR', note: '送别祝词，用不褪的 √LÁN' },
    { zh: '愿你如山。', roman: 'Vy arna elo~', gloss: '你[NOM] 山-ADJZ 在\\NEAR-2SG IRR', note: '送别，愿你长立不磨' },
    { zh: '好好走吧。', roman: 'Jenum weno~', gloss: '好-ADV 走\\NEAR-2SG IRR', note: '道别语' },
    { zh: '我叫米尔维。', roman: 'Ni Mírwe.', gloss: '我[NOM] 铭记者[NOM] REAL', note: '自我介绍，级0 零系词名词句' },
    { zh: '你叫什么名字？', roman: 'Vyje nym kath?', gloss: '你-GEN 名[NOM] 什么 Q', note: '问名' },
    { zh: '你的家在哪里？', roman: 'Vyje hem kis?', gloss: '你-GEN 家[NOM] 何处 Q', note: '问居所' },
    { zh: '我不知道。', roman: 'Ni ul vyse.', gloss: '我[NOM] NEG 知\\NEAR-1SG REAL', note: '谨慎的标准答话（示证诚实律）' },
    { zh: '我把话刻在石上。', roman: 'Ni sethon gránis skire.', gloss: '我[NOM] 词-ACC 石-LOC 刻\\NEAR-1SG REAL', note: '许诺套语：一言既出' },
    { zh: '慢工出细活。', roman: 'Lomum gránon tarna.', gloss: '慢-ADV 石-ACC 劈\\NEAR-3SG REAL', note: '谚语「以缓劈石」' },
    { zh: '话语是烟，铭痕是石。', roman: 'Seth thum, nas mirn grán.', gloss: '词[NOM] 烟[NOM] 但 铭痕[NOM] 石[NOM] REAL', note: '谚语：说出的会散，刻下的长存' },
    { zh: '此一讲述已尽。', roman: 'Silneth sathsa.', gloss: '讲述[NOM] 完结\\NEAR-PFV-3SG REAL', note: '讲史收束语（完整体 -s-）' }
  ];

  // 热添加词条：追加到词库并清空索引缓存，使补齐的词无需重载即可命中
  function addEntry(entry, enGloss) {
    if (!entry || !entry.roman) return false;
    for (var i = 0; i < LEX.length; i++) if (LEX[i].roman.toLowerCase() === entry.roman.toLowerCase()) return false;
    LEX.push(entry);
    if (Array.isArray(enGloss) && enGloss.length) EN_GLOSS[entry.roman] = enGloss;
    refresh();
    return true;
  }
  // 清空所有惰性索引缓存，下次检索按当前 LEX/EN_GLOSS 重建
  function refresh() { ZH_INDEX = null; ZH_INDEX_V = null; EN_INDEX = null; EN_INDEX_V = null; return LEX.length; }

  /* ---------- 导出 ---------- */
  var SilnethEngine = {
    searchLexicon: searchLexicon,
    erode: erode,
    isStrong: isStrong,
    conjugate: conjugate,
    nonfinite: nonfinite,
    decline: decline,
    evidential: evidential,
    translateZh: translateZh,
    translateEn: translateEn,
    composeSentence: composeSentence,
    transliterateName: transliterateName,
    toGlyphs: toGlyphs,
    addEntry: addEntry,
    refresh: refresh,
    PHRASEBOOK: PHRASEBOOK,
    LEXICON: LEX
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SilnethEngine;
  if (typeof window !== 'undefined') window.SilnethEngine = SilnethEngine;
  return SilnethEngine;
})(typeof window !== 'undefined' ? window : this);
