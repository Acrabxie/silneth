# Sìlneth 工具链

翻译器网页由这些部件确定性组装而成，并含「唤起本机 Claude 补齐缺词」的本地机制。

## 部件
- `silneth-engine.js` — 翻译/形态/字形引擎（`node silneth-engine.test.js` 回归）
- `silneth-lexicon.json` + `silneth-en-gloss.json` — 词库与英文释义
- `translator-head.html` + `translator-ui.js` — 页面结构/样式 + 交互
- `build-translator.js` — 组装成单文件 `silneth-translator.html` → 拷成仓库 `index.html`
- `validate-roots.js` — 确定性音系校验器 + `romanToIpa` 推导

## 补齐机制（唤起本机 Claude）
- `silneth-coin.js` — 调本机 `claude` CLI 为缺词造一个合法词根，经 `validateRoot` + `romanToIpa` + 去重把关（不合格带反馈重试）
- `silneth-coin-server.js` — 本地服务翻译器页 + `/__silneth_coin/{health,coin}` API

### 用法
```sh
./tools/start-coin.sh          # 或 node tools/silneth-coin-server.js
# 打开 http://127.0.0.1:8791/
```
翻译遇到词库外的词时，结果卡出现「✦ 补齐「X」」按钮：点击 → 本机 Claude 现造词 →
过确定性门 → 落盘 `silneth-lexicon.json` 并重建 → 页面热注入即时可用。

- 补齐**仅在本机地址**（127.0.0.1 / localhost）启用；公开部署（acrab.dev / GitHub Pages）
  探测不到本地服务，按钮不出现，站点行为不变。
- CLI 直接造词：`node tools/silneth-coin.js "咖啡" --pos n --merge`
- 造词模型默认 `claude-sonnet-4-6`（标准上下文），可用 `SILNETH_COIN_MODEL` 覆盖。

### 发布本机长出来的新词
补齐只改本机词库。要发布到线上，重建并部署 `index.html`：
```sh
node tools/build-translator.js && cp tools/silneth-translator.html index.html
git add index.html tools/silneth-lexicon.json tools/silneth-en-gloss.json && git commit && git push
```
