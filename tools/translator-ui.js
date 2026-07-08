(function () {
  'use strict';
  var E = window.SilnethEngine;
  var LEX = window.SILNETH_LEXICON || [];

  /* ---------- 补齐：唤起本机 Claude 造缺词（仅当本机补齐服务在线时启用） ---------- */
  var Coin = (function () {
    var available = false, BASE = '__silneth_coin';
    function check() {
      try {
        fetch(BASE + '/health').then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { available = !!(j && j.ok); })
          .catch(function () { available = false; });
      } catch (e) { available = false; }
    }
    function fill(word, lang, pos, cb) {
      fetch(BASE + '/coin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word, lang: lang || 'zh', pos: pos || null })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.ok && j.entry) {
          if (E.addEntry) E.addEntry(j.entry, j.en || []);
          else { window.SILNETH_LEXICON.push(j.entry); if (j.en) window.SILNETH_EN_GLOSS[j.entry.roman] = j.en; if (E.refresh) E.refresh(); }
          cb(null, j);
        } else cb((j && j.reason) || '补齐失败', null);
      }).catch(function () { cb('无法连接本机补齐服务', null); });
    }
    return { check: check, fill: fill, isAvailable: function () { return available; } };
  })();
  // 只在本机访问时探测补齐服务；公开部署（acrab.dev / Pages）不发请求，零控制台噪音
  if (/^(127\.0\.0\.1|localhost|\[?::1\]?|0\.0\.0\.0)$/.test(location.hostname)) Coin.check();

  /* ---------- Mírneth 字形 ---------- */
  var P = {
    pe: 'M 35 20 L 35 80 M 35 26 Q 68 26 68 41 Q 68 56 35 56',
    be: 'M 35 20 L 35 80 M 35 26 Q 68 26 68 41 Q 68 56 35 56 M 24 68 L 52 68',
    me: 'M 35 20 L 35 80 M 35 26 Q 68 26 68 41 Q 68 56 35 56 M 50 39 L 50 43',
    fe: 'M 35 20 L 35 80 M 35 26 Q 68 30 62 52',
    ve: 'M 35 20 L 35 80 M 35 26 Q 68 30 62 52 M 24 68 L 52 68',
    te: 'M 35 20 L 35 80 M 35 44 Q 68 44 68 59 Q 68 74 35 74',
    de: 'M 35 20 L 35 80 M 35 44 Q 68 44 68 59 Q 68 74 35 74 M 24 32 L 52 32',
    ne: 'M 35 20 L 35 80 M 35 44 Q 68 44 68 59 Q 68 74 35 74 M 50 57 L 50 61',
    se: 'M 35 20 L 35 80 M 35 48 Q 68 52 62 74',
    ze: 'M 35 20 L 35 80 M 35 48 Q 68 52 62 74 M 24 32 L 52 32',
    the: 'M 35 20 L 35 80 M 35 48 L 66 54 L 58 76',
    dhe: 'M 35 20 L 35 80 M 35 48 L 66 54 L 58 76 M 24 32 L 52 32',
    she: 'M 35 20 L 35 80 M 35 25 Q 74 33 64 75',
    nye: 'M 35 20 L 35 80 M 35 25 Q 72 25 72 50 Q 72 75 35 75 M 52 48 L 52 52',
    ke: 'M 65 20 L 65 80 M 65 26 Q 32 26 32 41 Q 32 56 65 56',
    ge: 'M 65 20 L 65 80 M 65 26 Q 32 26 32 41 Q 32 56 65 56 M 48 68 L 76 68',
    nge: 'M 65 20 L 65 80 M 65 26 Q 32 26 32 41 Q 32 56 65 56 M 50 39 L 50 43',
    he: 'M 65 20 L 65 80 M 65 26 Q 32 30 38 52',
    re: 'M 26 60 Q 42 34 54 54 Q 64 70 74 46',
    le: 'M 52 20 Q 34 40 52 52 Q 70 64 48 80',
    lle: 'M 52 20 Q 34 40 52 52 Q 70 64 48 80 M 52 20 Q 66 22 68 34',
    we: 'M 24 40 Q 37 68 50 44 Q 63 68 76 40',
    je: 'M 62 24 Q 34 30 36 52 Q 38 74 64 76',
    i: 'M 25 64 L 75 64 M 38 64 L 38 22',
    y: 'M 25 64 L 75 64 M 38 64 L 38 32 Q 38 20 50 21',
    e: 'M 25 64 L 75 64 M 38 64 L 38 44',
    oe: 'M 25 64 L 75 64 M 38 64 L 38 46 Q 38 34 50 35',
    a: 'M 25 64 L 75 64 M 40 64 Q 50 38 60 64',
    o: 'M 25 64 L 75 64 M 62 64 L 62 46 Q 62 34 50 35',
    u: 'M 25 64 L 75 64 M 62 64 L 62 32 Q 62 20 50 21',
    schwa: 'M 25 64 L 75 64',
    sky: 'M 32 11 L 68 11',
    crack: 'M 44 76 L 56 86',
    fall: 'M 28 34 Q 54 40 70 72',
    hang: 'M 26 52 Q 40 42 50 52 Q 60 62 74 52',
    rise: 'M 28 72 Q 54 66 70 34',
    pause: 'M 50 64 L 50 68',
    clitic: 'M 44 48 L 44 52 M 56 48 L 56 52',
    dot: 'M 50 26 L 50 30',
    voc: 'M 26 40 L 74 40'
  };

  function svgFor(keys) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'glyph-svg');
    keys.forEach(function (k) {
      if (!P[k]) return;
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', P[k]);
      svg.appendChild(p);
    });
    return svg;
  }

  function glyphRow(roman) {
    var box = document.createElement('div');
    box.className = 'r-glyphs';
    if (!roman || !E || typeof E.toGlyphs !== 'function') return box;
    var words = String(roman).split(/\s+/).filter(Boolean);
    words.forEach(function (w, wi) {
      var seq;
      try { seq = E.toGlyphs(w); } catch (err) { seq = null; }
      if (!seq || !Array.isArray(seq) || !seq.length) return;
      var wb = document.createElement('div');
      wb.className = 'wordbox';
      seq.forEach(function (g) {
        if (!g || !g.key || !P[g.key]) return;
        var keys = [g.key].concat(Array.isArray(g.mods) ? g.mods : []);
        wb.appendChild(svgFor(keys));
      });
      if (wb.childNodes.length) {
        box.appendChild(wb);
        if (wi < words.length - 1) {
          var sp = document.createElement('div');
          sp.className = 'wsp';
          box.appendChild(sp);
        }
      }
    });
    return box;
  }

  /* ---------- 通用结果卡 ---------- */
  var LEVEL_LABEL = ['级0 · 近时 nár「新绿」', '级1 · 远时 vèr「银褪」', '级2 · 祖时 vath「磨尽」'];
  var EVID_LABEL = { va: '=va 亲历', dhi: '=dhi 推断', re: '=re 传闻', none: '无示证', '': '无示证' };
  var MOOD_LABEL = { real: '断言 · 下跌调 .', irr: '非现实 · 悬停调 ~', q: '疑问 · 上挑调 ?' };

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function renderResult(container, res, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!res) {
      var c0 = el('div', 'result err');
      c0.appendChild(el('div', 'warn', '引擎未返回结果。'));
      container.appendChild(c0);
      return;
    }
    var card = el('div', 'result' + (res.ok === false ? ' err' : ''));

    if (res.roman) {
      card.appendChild(glyphRow(res.roman));
      card.appendChild(el('div', 'r-roman', res.roman));
    }
    if (res.ipa) card.appendChild(el('div', 'r-ipa', res.ipa));
    if (res.gloss) card.appendChild(el('div', 'r-gloss', res.gloss));
    if (res.trans) card.appendChild(el('div', 'r-trans', '「' + res.trans + '」'));
    else if (opts.zh) card.appendChild(el('div', 'r-trans', '「' + opts.zh + '」'));

    var badges = el('div', 'badges');
    if (typeof res.level === 'number' && LEVEL_LABEL[res.level]) {
      badges.appendChild(el('span', 'badge b' + res.level, LEVEL_LABEL[res.level]));
    }
    if (res.evid != null && EVID_LABEL[res.evid] != null) {
      badges.appendChild(el('span', 'badge', EVID_LABEL[res.evid]));
    }
    if (res.mood && MOOD_LABEL[res.mood]) {
      badges.appendChild(el('span', 'badge', MOOD_LABEL[res.mood]));
    }
    if (badges.childNodes.length) card.appendChild(badges);

    if (res.unmatched && res.unmatched.length) {
      card.appendChild(el('div', 'warn',
        '词库外的词：' + res.unmatched.join('、') +
        ' —— 可到「词典」找近义词根，或专名走「名字音译」。'));
      if (opts.coin && Coin.isAvailable()) {
        var cw = el('div', 'coin-wrap');
        cw.appendChild(el('div', 'coin-hint', '本机 Claude 补齐服务在线 —— 可现造合法词根并即时并入词库：'));
        res.unmatched.forEach(function (w) {
          var b = el('button', 'coin-btn');
          b.textContent = '✦ 补齐「' + w + '」';
          b.addEventListener('click', function () {
            if (b.disabled) return;
            b.disabled = true; b.classList.add('busy'); b.textContent = '造词中「' + w + '」…';
            Coin.fill(w, opts.lang, null, function (err, j) {
              if (err) { b.disabled = false; b.classList.remove('busy'); b.textContent = '✗ ' + err + '，点此重试'; return; }
              b.classList.remove('busy'); b.classList.add('done');
              b.textContent = '✓ ' + (j.entry.roman) + '（' + (j.entry.zh || []).join('/') + '）已入库';
              if (opts.retranslate) setTimeout(opts.retranslate, 350);
            });
          });
          cw.appendChild(b);
        });
        card.appendChild(cw);
      }
    }
    if (res.ok === false && !(res.unmatched && res.unmatched.length)) {
      card.appendChild(el('div', 'warn', res.error || '这句超出当前规则直译的句型范围——试试「构句器」逐件拼装。'));
    }

    if (res.trace && res.trace.length) {
      var det = el('details', 'trace');
      det.appendChild(el('summary', null, '翻译过程 · 十步管线'));
      var ol = el('ul', 'trace-steps');
      res.trace.forEach(function (t, i) {
        var li = el('li');
        li.appendChild(el('span', 'tn', String(i + 1)));
        var body = el('span');
        if (t && t.step) {
          var b = el('b', null, t.step + ' ');
          body.appendChild(b);
          body.appendChild(document.createTextNode(t.detail || ''));
        } else {
          body.textContent = String(t);
        }
        li.appendChild(body);
        ol.appendChild(li);
      });
      det.appendChild(ol);
      card.appendChild(det);
    }
    if (res.steps && res.steps.length) {
      var det2 = el('details', 'trace');
      det2.setAttribute('open', '');
      det2.appendChild(el('summary', null, '适配过程'));
      var ol2 = el('ul', 'trace-steps');
      res.steps.forEach(function (t, i) {
        var li = el('li');
        li.appendChild(el('span', 'tn', String(i + 1)));
        li.appendChild(el('span', null, typeof t === 'string' ? t : (t.step ? t.step + '：' + (t.detail || '') : JSON.stringify(t))));
        ol2.appendChild(li);
      });
      det2.appendChild(ol2);
      card.appendChild(det2);
    }
    container.appendChild(card);
  }

  /* ---------- 页头字形：Sìlneth ---------- */
  var hs = document.getElementById('hScript');
  [['se'], ['i', 'crack'], ['le'], ['ne'], ['e'], ['the']].forEach(function (g) {
    hs.appendChild(svgFor(g));
  });

  /* ---------- Tabs ---------- */
  var tabs = document.getElementById('tabs');
  Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-selected', x === b ? 'true' : 'false');
      });
      Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
        p.classList.toggle('active', p.id === b.dataset.panel);
      });
    });
  });

  /* ---------- 直译（中文 / English） ---------- */
  var zhInput = document.getElementById('zhInput');
  var zhOut = document.getElementById('zhOut');
  var zhChips = document.getElementById('zhChips');
  var langMode = 'zh';  // 'zh' | 'en'
  var UI_TEXT = {
    zh: {
      label: '中文原文', placeholder: '例：父亲以前在这里唱过歌', btn: '翻译 → Sìlneth',
      hint: '时距级与示证会按十步管线自动判定，过程可展开查看。',
      chips: ['我们唱歌', '父亲以前在这里唱过歌', '相传群山在远古屹立', '你叫什么名字',
              '我有一把刀', '明天我们唱歌吧', '别唱', '河比山古老']
    },
    en: {
      label: 'English source', placeholder: 'e.g. father sang a song here before', btn: 'Translate → Sìlneth',
      hint: 'Tense level and evidentiality are inferred by the ten-step pipeline; expand any result to inspect it.',
      chips: ['we sing a song', 'father sang a song', 'the mountains stood in ancient times',
              'what is your name', 'i have a knife', 'the river is older than the mountain',
              "don't sing", 'he is not a singer']
    }
  };
  function renderChips() {
    zhChips.innerHTML = '';
    UI_TEXT[langMode].chips.forEach(function (s) {
      var c = el('button', 'chip', s);
      c.addEventListener('click', function () { zhInput.value = s; doZh(); });
      zhChips.appendChild(c);
    });
  }
  function applyLang() {
    var T = UI_TEXT[langMode];
    document.getElementById('zhLabel').textContent = T.label;
    zhInput.setAttribute('placeholder', T.placeholder);
    document.getElementById('zhGo').textContent = T.btn;
    document.getElementById('zhHint').textContent = T.hint;
    document.getElementById('zhSupportZh').hidden = (langMode !== 'zh');
    document.getElementById('zhSupportEn').hidden = (langMode !== 'en');
    zhOut.innerHTML = '';
    renderChips();
  }
  function doZh() {
    var t = zhInput.value.trim();
    if (!t) return;
    var res;
    try { res = (langMode === 'en') ? E.translateEn(t) : E.translateZh(t); }
    catch (err) { res = { ok: false, error: (langMode === 'en' ? 'Engine error: ' : '引擎异常：') + err.message }; }
    renderResult(zhOut, res, { zh: t, coin: true, lang: langMode, retranslate: doZh });
  }
  Array.prototype.forEach.call(document.querySelectorAll('#zhLang button'), function (b) {
    b.addEventListener('click', function () {
      if (langMode === b.dataset.v) return;
      langMode = b.dataset.v;
      Array.prototype.forEach.call(document.querySelectorAll('#zhLang button'), function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      applyLang();
    });
  });
  document.getElementById('zhGo').addEventListener('click', doZh);
  zhInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doZh(); }
  });
  renderChips();

  /* ---------- 构句器 ---------- */
  function fillDatalist(id, filter) {
    var dl = document.getElementById(id);
    LEX.filter(filter).forEach(function (e2) {
      var o = document.createElement('option');
      var zh0 = (e2.zh && e2.zh[0]) || '';
      o.value = zh0;
      o.label = zh0 + ' — ' + e2.roman;
      dl.appendChild(o);
    });
  }
  fillDatalist('nounList', function (e2) { return e2.pos === 'n' || e2.pos === 'pron'; });
  fillDatalist('verbList', function (e2) { return e2.pos === 'v'; });

  function findEntry(input, posSet) {
    input = (input || '').trim();
    if (!input) return null;
    var lower = input.toLowerCase();
    var exact = LEX.filter(function (e2) {
      return e2.roman === lower || (e2.zh && e2.zh.indexOf(input) !== -1);
    });
    var pool = exact.length ? exact : (function () {
      try { return E.searchLexicon(input) || []; } catch (err) { return []; }
    })();
    var byPos = pool.filter(function (e2) { return !posSet || posSet.indexOf(e2.pos) !== -1; });
    return byPos[0] || pool[0] || null;
  }

  function segVal(id) {
    var b = document.querySelector('#' + id + ' button[aria-pressed="true"]');
    return b ? b.dataset.v : null;
  }
  ['cLevel', 'cEvid', 'cMood'].forEach(function (id) {
    var seg = document.getElementById(id);
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
      });
    });
  });

  var PRONOUN_PERSON = { '我': [1, false], '我们': [1, true], '你': [2, false], '你们': [2, true],
    '他': [3, false], '她': [3, false], '它': [3, false], '他们': [3, true], '她们': [3, true] };

  document.getElementById('cGo').addEventListener('click', function () {
    var cOut = document.getElementById('cOut');
    var subjRaw = document.getElementById('cSubj').value.trim();
    var verbRaw = document.getElementById('cVerb').value.trim();
    var objRaw = document.getElementById('cObj').value.trim();
    if (!verbRaw) {
      renderResult(cOut, { ok: false, error: '动词是必填的——Sìlneth 的句子挂在动词的磨蚀级上。' });
      return;
    }
    var verb = findEntry(verbRaw, ['v']);
    if (!verb) {
      renderResult(cOut, { ok: false, error: '词库里找不到这个动词：「' + verbRaw + '」。到「词典」搜搜近义词根。' });
      return;
    }
    var person = null, subjPlural = document.getElementById('cSPl').checked, subj = null;
    if (subjRaw) {
      if (PRONOUN_PERSON[subjRaw]) {
        person = PRONOUN_PERSON[subjRaw][0];
        subjPlural = subjPlural || PRONOUN_PERSON[subjRaw][1];
      }
      subj = findEntry(subjRaw, ['pron', 'n']);
      if (!subj) {
        renderResult(cOut, { ok: false, error: '词库里找不到主语：「' + subjRaw + '」。专名可先走「名字音译」。' });
        return;
      }
      if (person == null) person = 3;
    }
    var obj = null;
    if (objRaw) {
      obj = findEntry(objRaw, ['n', 'pron']);
      if (!obj) {
        renderResult(cOut, { ok: false, error: '词库里找不到宾语：「' + objRaw + '」。' });
        return;
      }
    }
    var opts = {
      subj: subj ? { roman: subj.roman } : null,
      obj: obj ? { roman: obj.roman } : null,
      verb: { roman: verb.roman },
      level: parseInt(segVal('cLevel'), 10) || 0,
      evid: segVal('cEvid') === 'auto' ? undefined : segVal('cEvid'),
      mood: segVal('cMood'),
      neg: document.getElementById('cNeg').checked,
      pfv: document.getElementById('cPfv').checked,
      subjPlural: subjPlural,
      objPlural: document.getElementById('cOPl').checked
    };
    if (person != null) opts.person = person;
    var res;
    try { res = E.composeSentence(opts); } catch (err) { res = { ok: false, error: '引擎异常：' + err.message }; }
    renderResult(cOut, res);
  });

  /* ---------- 名字音译 ---------- */
  var nameInput = document.getElementById('nameInput');
  var nameOut = document.getElementById('nameOut');
  function doName() {
    var t = nameInput.value.trim();
    if (!t) return;
    var res;
    try { res = E.transliterateName(t); } catch (err) { res = { ok: false, error: '引擎异常：' + err.message }; }
    renderResult(nameOut, res, { zh: t });
  }
  document.getElementById('nameGo').addEventListener('click', doName);
  nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doName(); });
  var nameChips = document.getElementById('nameChips');
  ['Acrab', 'Claude', 'Beijing', 'Shanghai', 'Tokyo', 'Einstein'].forEach(function (s) {
    var c = el('button', 'chip', s);
    c.addEventListener('click', function () { nameInput.value = s; doName(); });
    nameChips.appendChild(c);
  });

  /* ---------- 词典 ---------- */
  var dictInput = document.getElementById('dictInput');
  var dictOut = document.getElementById('dictOut');
  function doDict() {
    var q = dictInput.value.trim();
    dictOut.innerHTML = '';
    if (!q) return;
    var hits;
    try { hits = E.searchLexicon(q) || []; } catch (err) { hits = []; }
    if (!hits.length) {
      dictOut.appendChild(el('div', 'hint', '没有命中。303 词根有限——试试更基本的近义词（如「电脑」查不到,查「想」「器」）。'));
      return;
    }
    hits.slice(0, 40).forEach(function (h) {
      var item = el('div', 'dict-item');
      var dr = el('div', 'dr', h.roman);
      if (h.ipa) dr.appendChild(el('small', null, h.ipa));
      item.appendChild(dr);
      var dz = el('div', 'dz', (h.zh || []).join('；'));
      if (h.field) dz.appendChild(el('small', null, ' · ' + h.field));
      item.appendChild(dz);
      item.appendChild(el('div', 'dc' + (h.cls === 'strong' ? ' strong' : ''),
        (h.pos || '') + (h.cls === 'strong' ? ' · 强类不褪' : h.cls === 'weak' ? ' · 弱类可磨' : '')));
      dictOut.appendChild(item);
    });
    if (hits.length > 40) dictOut.appendChild(el('div', 'hint', '……另有 ' + (hits.length - 40) + ' 条，请缩小检索。'));
  }
  dictInput.addEventListener('input', doDict);

  /* ---------- 常用语 ---------- */
  var phraseOut = document.getElementById('phraseOut');
  var phraseDetail = document.getElementById('phraseDetail');
  var book = (E && E.PHRASEBOOK) || [];
  book.forEach(function (ph) {
    var d = el('div', 'phrase');
    d.appendChild(el('div', 'pr', ph.roman));
    d.appendChild(el('div', 'pz', ph.zh + (ph.note ? ' · ' + ph.note : '')));
    d.addEventListener('click', function () {
      renderResult(phraseDetail, { ok: true, roman: ph.roman, trans: ph.zh, gloss: ph.gloss || '', trace: ph.note ? [{ step: '用法', detail: ph.note }] : [] });
      phraseDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    phraseOut.appendChild(d);
  });
  if (!book.length) phraseOut.appendChild(el('div', 'hint', '短语集未加载。'));
})();
