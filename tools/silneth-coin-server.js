// Sìlneth 本机补齐服务：本地服务翻译器页 + /__silneth_coin/health + /__silneth_coin/coin。
// 页面里的「补齐」按钮调 coin → 唤起本机 Claude 造合法词根 → 落盘 + 重建单文件 → 返回词条热注入。
// 启动：node silneth-coin-server.js  （默认 127.0.0.1:8791）
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = __dirname;
const { coinWord, mergeEntry } = require(path.join(D, 'silneth-coin.js'));

const PORT = Number(process.env.SILNETH_COIN_PORT) || 8791;
const HOST = '127.0.0.1';
const PAGE = path.join(D, 'silneth-translator.html');
const LANG_PAGE = path.join(D, 'language.html');
const LEX_PATH = path.join(D, 'silneth-lexicon.json');

function lexCount() { try { return JSON.parse(fs.readFileSync(LEX_PATH, 'utf8')).length; } catch (e) { return 0; } }
function rebuild() { try { execFileSync('node', [path.join(D, 'build-translator.js')], { cwd: D, stdio: 'ignore' }); return true; } catch (e) { return false; } }
function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(function (req, res) {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '');

  if (url === '/__silneth_coin/health') return send(res, 200, 'application/json', JSON.stringify({ ok: true, service: 'silneth-coin', count: lexCount() }));

  if (url === '/__silneth_coin/coin' && req.method === 'POST') {
    let buf = '';
    req.on('data', d => { buf += d; if (buf.length > 4096) req.destroy(); });
    req.on('end', async function () {
      let body; try { body = JSON.parse(buf || '{}'); } catch (e) { return send(res, 400, 'application/json', JSON.stringify({ ok: false, reason: '请求体非 JSON' })); }
      const word = (body.word || '').trim();
      if (!word) return send(res, 400, 'application/json', JSON.stringify({ ok: false, reason: '缺 word' }));
      console.log('[coin] 造词：「' + word + '」(' + (body.lang || 'zh') + ')');
      try {
        const r = await coinWord(word, { lang: body.lang, pos: body.pos, tries: 2, timeoutMs: 170000 });
        if (!r.ok) { console.log('[coin] 失败：' + r.reason); return send(res, 200, 'application/json', JSON.stringify({ ok: false, reason: r.reason, tries: r.tries })); }
        const m = mergeEntry(r.entry);
        if (!m.added) return send(res, 200, 'application/json', JSON.stringify({ ok: false, reason: '合入失败：' + m.reason }));
        rebuild();
        const lex = { roman: r.entry.roman, ipa: r.entry.ipa, pos: r.entry.pos, zh: r.entry.zh, cls: r.entry.cls, field: r.entry.field };
        console.log('[coin] ✓ ' + lex.roman + ' = ' + lex.zh.join('/') + '  (共 ' + m.total + ' 词)');
        return send(res, 200, 'application/json', JSON.stringify({ ok: true, entry: lex, en: r.entry._en || [], total: m.total, tries: r.tries.length }));
      } catch (e) {
        console.log('[coin] 异常：' + e.message);
        return send(res, 500, 'application/json', JSON.stringify({ ok: false, reason: '服务异常：' + e.message }));
      }
    });
    return;
  }

  // 静态：翻译器页与介绍页
  if (url === '/' || url === '/index.html') {
    try { return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(PAGE)); }
    catch (e) { return send(res, 500, 'text/plain', '未找到 silneth-translator.html，请先 node build-translator.js'); }
  }
  if (url === '/language.html') {
    try { return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(LANG_PAGE)); }
    catch (e) { return send(res, 404, 'text/plain', 'not found'); }
  }
  send(res, 404, 'text/plain', 'not found');
});

server.listen(PORT, HOST, function () {
  console.log('Sìlneth 补齐服务 → http://' + HOST + ':' + PORT + '/');
  console.log('  词库当前 ' + lexCount() + ' 词；页面里遇到缺词会出现「补齐」按钮。');
});
server.on('error', function (e) { console.error('启动失败：' + e.message + (e.code === 'EADDRINUSE' ? '（端口被占，设 SILNETH_COIN_PORT 换端口）' : '')); process.exit(1); });
