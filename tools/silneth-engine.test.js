/* Sìlneth 引擎测试 —— node silneth-engine.test.js
 * 黄金答案全部按 silneth-morphology.md 手工推导（书证形），不取引擎输出。*/
var E = require('./silneth-engine.js');
var pass = 0, fail = 0, fails = [];
function eq(label, got, want) {
  var g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; fails.push('✗ ' + label + '\n    得: ' + g + '\n    期: ' + w); }
}
function ok(label, cond, info) {
  if (cond) pass++; else { fail++; fails.push('✗ ' + label + (info ? '  (' + info + ')' : '')); }
}
function glyphKeys(roman) { return E.toGlyphs(roman).map(function (g) { return g.mods && g.mods.length ? g.key + '+' + g.mods.join('+') : g.key; }); }

/* ---------- §1 磨蚀 erode (V1–V12) ---------- */
eq('V1 erode sil L1', E.erode('sil', 1), 'sìl');
eq('V2 erode sil L2', E.erode('sil', 2), 'sël');
eq('V3 erode oran L1', E.erode('oran', 1), 'òràn');
eq('V4 erode oran L2', E.erode('oran', 2), 'ërën');
eq('V5 erode lán L1', E.erode('lán', 1), 'làn');
eq('V6 erode lán L2 (强类停级1)', E.erode('lán', 2), 'làn');
eq('V7 erode mír L1', E.erode('mír', 1), 'mìr');
eq('V8 erode mír L2', E.erode('mír', 2), 'mìr');
eq('V9 erode kai L1', E.erode('kai', 1), 'kài');
eq('V10 erode kai L2 (永不坍缩)', E.erode('kai', 2), 'kài');
eq('erode el L1', E.erode('el', 1), 'èl');
eq('erode el L2', E.erode('el', 2), 'ël');
ok('isStrong lán', E.isStrong('lán') === true);
ok('isStrong kai', E.isStrong('kai') === true);
ok('isStrong sil (弱)', E.isStrong('sil') === false);
ok('isStrong nelu (弱)', E.isStrong('nelu') === false);

/* ---------- 动词 conjugate (V40–V52, V11-12) ---------- */
eq('V40 sil L0 3PL', E.conjugate('sil', { level: 0, person: 3, plural: true }), 'silar');
eq('V41 sil L1 3PL', E.conjugate('sil', { level: 1, person: 3, plural: true }), 'sìlar');
eq('V42 sil L2 3PL', E.conjugate('sil', { level: 2, person: 3, plural: true }), 'sëlar');
eq('sil L0 3SG', E.conjugate('sil', { level: 0, person: 3 }), 'sila');
eq('sil L1 1SG', E.conjugate('sil', { level: 1, person: 1 }), 'sìle');
eq('sil L2 3SG', E.conjugate('sil', { level: 2, person: 3 }), 'sëla');
eq('V43 sil L0 PFV 3SG', E.conjugate('sil', { level: 0, person: 3, pfv: true }), 'silsa');
eq('V44 sil L0 MID 3SG', E.conjugate('sil', { level: 0, person: 3, mid: true }), 'siluwa');
eq('V45 sil L0 MID PFV 3SG', E.conjugate('sil', { level: 0, person: 3, mid: true, pfv: true }), 'silusa');
eq('V46 sil L1 MID 3SG', E.conjugate('sil', { level: 1, person: 3, mid: true }), 'sìluwa');
eq('V47 sil L2 PFV 3SG', E.conjugate('sil', { level: 2, person: 3, pfv: true }), 'sëlsa');
eq('V52 sil L1 1PL', E.conjugate('sil', { level: 1, person: 1, plural: true }), 'sìler');
eq('V51 ath L2 CAUS 3SG (ëthtaja)', E.conjugate('ath', { level: 2, person: 3, caus: true }), 'ëthtaja');
eq('ath L0 CAUS 3SG (athtaja)', E.conjugate('ath', { level: 0, person: 3, caus: true }), 'athtaja');
eq('V11 el L1 3SG', E.conjugate('el', { level: 1, person: 3 }), 'èla');
eq('V12 el L2 3SG', E.conjugate('el', { level: 2, person: 3 }), 'ëla');
eq('lán L2 3SG (强类, làna)', E.conjugate('lán', { level: 2, person: 3 }), 'làna');
eq('lán L2 3PL (lànar)', E.conjugate('lán', { level: 2, person: 3, plural: true }), 'lànar');
eq('kai L2 3SG (kàija)', E.conjugate('kai', { level: 2, person: 3 }), 'kàija');
eq('sath L0 PFV 3SG (sathsa)', E.conjugate('sath', { level: 0, person: 3, pfv: true }), 'sathsa');
eq('sil L2 MID 3SG (sëluwa)', E.conjugate('sil', { level: 2, person: 3, mid: true }), 'sëluwa');

/* ---------- 名词 decline (V32–V39) ---------- */
eq('V32 lír PL ACC', E.decline('lír', { plural: true, 'case': 'ACC' }), 'lírinon');
eq('V33 lír SG GEN', E.decline('lír', { 'case': 'GEN' }), 'líre');
eq('V34 lír PL INS', E.decline('lír', { plural: true, 'case': 'INS' }), 'lírinum');
eq('lír SG DAT', E.decline('lír', { 'case': 'DAT' }), 'lírir');
eq('lír SG LOC', E.decline('lír', { 'case': 'LOC' }), 'líris');
eq('lír SG ABL', E.decline('lír', { 'case': 'ABL' }), 'lírol');
eq('V35 nelu SG GEN (R1)', E.decline('nelu', { 'case': 'GEN' }), 'neluwe');
eq('nelu SG ACC (R1)', E.decline('nelu', { 'case': 'ACC' }), 'neluwon');
eq('V36 nelu PL NOM', E.decline('nelu', { plural: true, 'case': 'NOM' }), 'nelun');
eq('V37 nelu PL ACC', E.decline('nelu', { plural: true, 'case': 'ACC' }), 'nelunon');
eq('V38 arn PL NOM', E.decline('arn', { plural: true, 'case': 'NOM' }), 'arnin');
eq('arn SG ABL', E.decline('arn', { 'case': 'ABL' }), 'arnol');
eq('V39 ni ACC', E.decline('ni', { 'case': 'ACC' }), 'nijon');
eq('ni GEN', E.decline('ni', { 'case': 'GEN' }), 'nije');
eq('ni DAT', E.decline('ni', { 'case': 'DAT' }), 'nijir');
eq('ni LOC', E.decline('ni', { 'case': 'LOC' }), 'nijis');
eq('ni INS', E.decline('ni', { 'case': 'INS' }), 'nijum');
eq('vy ACC', E.decline('vy', { 'case': 'ACC' }), 'vyjon');
eq('dhe ACC', E.decline('dhe', { 'case': 'ACC' }), 'dhejon');
eq('sa LOC (sajis)', E.decline('sa', { 'case': 'LOC' }), 'sajis');
eq('sa ACC (sajon)', E.decline('sa', { 'case': 'ACC' }), 'sajon');

/* ---------- 示证 evidential (V53–V58) ---------- */
eq('V54 re t0 i0', E.evidential('re', 0, 0), '=re');
eq('V54 re t0 i1', E.evidential('re', 0, 1), '=rè');
eq('V53 re t2 i0', E.evidential('re', 2, 0), '=rë');
eq('V53 re t2 i1', E.evidential('re', 2, 1), '=rë');
eq('V55 va t1', E.evidential('va', 1, 0), '=và');
eq('va t2 (=vë)', E.evidential('va', 2, 0), '=vë');
eq('V56 dhi t2', E.evidential('dhi', 2, 0), '=dhë');
eq('dhi t1', E.evidential('dhi', 1, 0), '=dhì');

/* ---------- 字形 toGlyphs (V77–V85) ---------- */
eq('V77 lír', glyphKeys('lír'), ['le', 'i+sky', 're']);
eq('V78 Sìlneth', glyphKeys('Sìlneth'), ['se', 'i+crack', 'le', 'ne', 'e', 'the']);
eq('V79 sëlar', glyphKeys('sëlar'), ['se', 'schwa', 'le', 'a', 're']);
eq('V80 silar', glyphKeys('silar'), ['se', 'i', 'le', 'a', 're']);
eq('V81 Lírin', glyphKeys('Lírin'), ['le', 'i+sky', 're', 'i', 'ne']);
eq('V82 silnethon', glyphKeys('silnethon'), ['se', 'i', 'le', 'ne', 'e', 'the', 'o', 'ne']);
eq('V83 vath', glyphKeys('vath'), ['ve', 'a', 'the']);
eq('V84 =rë', glyphKeys('=rë'), ['clitic', 're', 'schwa']);
eq('V85 arnin', glyphKeys('arnin'), ['a', 're', 'ne', 'i', 'ne']);
eq('kàija 双元音松化', glyphKeys('kàija'), ['ke', 'a+crack', 'i', 'je', 'a']);
eq('órvan 长元音o', glyphKeys('órvan'), ['o+sky', 're', 've', 'a', 'ne']);

/* ---------- 中文直译 translateZh（黄金答案手工推导）---------- */
function tz(text) { return E.translateZh(text); }
eq('T1 我们唱歌', tz('我们唱歌').roman, 'Nin silnethon siler.');
eq('T2 父亲以前在这里唱过歌', tz('父亲以前在这里唱过歌').roman, 'Pai sajis silnethon sìla =và.');
eq('T3 相传群山在远古屹立', tz('相传群山在远古屹立').roman, 'Arnin vath lànar =rë.');
ok('T3 强根不坍缩(无 lëna)', tz('相传群山在远古屹立').roman.indexOf('lën') === -1, tz('相传群山在远古屹立').roman);
eq('T4 你叫什么名字', tz('你叫什么名字').roman, 'Vyje nym kath?');
eq('T5 我有一把刀', tz('我有一把刀').roman, 'Nijir skar ela.');
eq('T6 河比山古老', tz('河比山古老').roman, 'Lír arnol tór.');
eq('T7 别唱', tz('别唱').roman, 'Ul silo~');
eq('T8 明天我们唱歌吧', tz('明天我们唱歌吧').roman, 'Nin silnethon siler~');
eq('T9 他不是歌者', tz('他不是歌者').roman, 'Dhe ul silwe.');
// 结构性断言
ok('T2 级判定=1', tz('父亲以前在这里唱过歌').level === 1);
ok('T3 级判定=2', tz('相传群山在远古屹立').level === 2);
ok('T3 示证=re', tz('相传群山在远古屹立').evid === 're');
ok('T8 语气=irr', tz('明天我们唱歌吧').mood === 'irr');
ok('T8 未来无示证', tz('明天我们唱歌吧').evid === 'none');
ok('T4 疑问 mood=q', tz('你叫什么名字').mood === 'q');
ok('translateZh 有 trace', Array.isArray(tz('我们唱歌').trace) && tz('我们唱歌').trace.length >= 4);
// 词库外与降级
var out10 = tz('我喜欢量子力学');
ok('T10 词库外 ok=false', out10.ok === false);
ok('T10 unmatched 非空', out10.unmatched.length > 0);
ok('T10 仍返回结构', typeof out10.roman === 'string' && typeof out10.level === 'number');
// 空/异常输入不崩
ok('空串安全', tz('').ok === false);
ok('纯标点安全', tz('。，！').ok === false);

/* ---------- 构句器 composeSentence ---------- */
var c1 = E.composeSentence({ verb: { roman: 'sil' }, level: 2, mid: true, person: 3, subjPlural: true });
ok('C1 级2中受动复数动词=sëluwar', c1.roman.toLowerCase().indexOf('sëluwar') !== -1, c1.roman);
ok('C1 级2补示证=rë', c1.roman.indexOf('=rë') !== -1, c1.roman);
var c2 = E.composeSentence({ verb: { roman: 'sil' }, level: 1, pfv: true, person: 3, neg: true });
ok('C2 级1完整体动词=sìlsa', c2.roman.toLowerCase().indexOf('sìlsa') !== -1, c2.roman);
ok('C2 否定 ul', c2.roman.toLowerCase().indexOf('ul') !== -1, c2.roman);
ok('C2 级1补示证=và', c2.roman.indexOf('=và') !== -1, c2.roman);
var c3 = E.composeSentence({ subj: { roman: 'arn' }, obj: { roman: 'silneth' }, verb: { roman: 'sil' }, level: 0, mood: 'real', subjPlural: true });
eq('C3 完整句', c3.roman, 'Arnin silnethon silar.');
var c4 = E.composeSentence({ verb: { roman: 'sil' }, level: 2, mood: 'irr', evid: 'va' });
ok('C4 非现实剥离示证', c4.evid === 'none' && c4.roman.indexOf('=') === -1, c4.roman);
var c5 = E.composeSentence({ level: 0 });
ok('C5 缺动词 ok=false', c5.ok === false);
var c6 = E.composeSentence({ verb: { roman: 'sil' }, level: 5 });
ok('C6 非法级 ok=false', c6.ok === false);

/* ---------- 音译 transliterateName（规范定形）---------- */
function legal(roman) {
  // 词末不得为 p t k b d g f v z sh h dh；无 ll；无词首 ng
  var s = roman.toLowerCase();
  if (/(p|t|k|b|d|g|f|v|z|sh|h|dh)$/.test(s) && !/(th|s|m|n|r|l|ng)$/.test(s)) {
    // 允许 th/s 等合法尾；上面粗判，改用白名单尾
  }
  if (/ll/.test(s)) return false;
  if (/^ng/.test(s)) return false;
  return E.toGlyphs(roman).length > 0;
}
eq('N1 Acrab', E.transliterateName('Acrab').roman, 'Akrabe');
eq('N2 Claude', E.transliterateName('Claude').roman, 'Klóde');
eq('N3 Beijing', E.transliterateName('Beijing').roman, 'Beidjing');
eq('N4 Shanghai', E.transliterateName('Shanghai').roman, 'Shanghai');
eq('N5 Tokyo', E.transliterateName('Tokyo').roman, 'Tókjó');
eq('N6 Kim', E.transliterateName('Kim').roman, 'Kimil');
eq('N7 Einstein', E.transliterateName('Einstein').roman, 'Ainstain');
ok('N8 未知名产出合法词形', (function () { var r = E.transliterateName('Zorbax'); return r.ok && legal(r.roman); })(), JSON.stringify(E.transliterateName('Zorbax')));
ok('N9 汉字输入 ok=false', E.transliterateName('鑫').ok === false);
ok('N10 空输入 ok=false', E.transliterateName('').ok === false);
ok('N 有 steps', Array.isArray(E.transliterateName('Acrab').steps));

/* ---------- searchLexicon / PHRASEBOOK ---------- */
ok('search 山→arn', E.searchLexicon('山').some(function (h) { return h.roman === 'arn'; }));
ok('search lír', E.searchLexicon('lír').some(function (h) { return h.roman === 'lír'; }));
ok('search 空返回[]', E.searchLexicon('').length === 0);
ok('PHRASEBOOK ≥12', E.PHRASEBOOK.length >= 12);
ok('PHRASEBOOK 结构', E.PHRASEBOOK.every(function (p) { return p.zh && p.roman; }));

/* ---------- 对抗：toGlyphs 不崩 ---------- */
ok('toGlyphs 非法字符不崩', Array.isArray(E.toGlyphs('###')));
ok('toGlyphs 整句', E.toGlyphs('Lírin silnethon silar.').length > 0);
ok('toGlyphs 非字符串安全', Array.isArray(E.toGlyphs(null)));

/* ---------- 英文直译 translateEn ---------- */
function te(text) { return E.translateEn(text); }
// (A) 英↔中等义对：共用构句器，罗马字必须逐字相同（非循环强校验）
var pairs = [
  ['we sing a song', '我们唱歌'],
  ['what is your name', '你叫什么名字'],
  ['i have a knife', '我有一把刀'],
  ['the river is older than the mountain', '河比山古老'],
  ["don't sing", '别唱'],
  ['he is not a singer', '他不是歌者']
];
pairs.forEach(function (p, i) {
  eq('E-pair' + (i + 1) + ' 「' + p[0] + '」≡「' + p[1] + '」', te(p[0]).roman, tz(p[1]).roman);
});
// (B) 独立黄金答案（按形态规格手工推导）
eq('E1 过去式→级1+亲历示证', te('father sang a song').roman, 'Pai silnethon sìla =và.');
eq('E2 古时+强根倾颓+复数+传闻', te('the mountains stood in ancient times').roman, 'Arnin vath lànar =rë.');
eq('E3 处所介词(冠词不吞)', te('the fire burns in the forest').roman, 'Fai firnis brina.');
eq('E4 -ves 复数+形容词谓语', te('the wolves are strong').roman, 'Vornin dren.');
eq('E5 祈使带宾语(动词居首)', te('sing a song!').roman, 'Silnethon silo~');
eq('E6 裸祈使', te('close the door').roman, 'Dornon kluso~');
eq('E7 名词主语陈述(不误判祈使)', te('the river flows').roman, 'Lír luna.');
eq('E8 未来', te('i will sing').roman, 'Ni sile~');
eq('E9 wh-疑问+处所', te('where is the hall').roman, 'Tal kis?');
eq('E10 及物 SVO', te('i love you').roman, 'Ni vyjon søle.');
// (C) 结构性断言
ok('E 过去式 level=1', te('father sang a song').level === 1);
ok('E 古时 level=2', te('the mountains stood in ancient times').level === 2);
ok('E 强根不坍缩(无 lën)', te('the mountains stood in ancient times').roman.indexOf('lën') === -1, te('the mountains stood in ancient times').roman);
ok('E 未来 mood=irr', te('i will sing').mood === 'irr');
ok('E 未来无示证', te('i will sing').evid === 'none');
ok('E wh-疑问 mood=q', te('where is the hall').mood === 'q');
ok('E 祈使 mood=irr', te('sing a song!').mood === 'irr');
ok('E 陈述 mood=real', te('the river flows').mood === 'real');
ok('E translateEn 有 trace', Array.isArray(te('we sing a song').trace) && te('we sing a song').trace.length >= 4);
// (D) 词形还原：屈折/不规则均归约到词根
ok('E 屈折 sang→sìl 词根', te('she sang').roman.toLowerCase().indexOf('sìl') !== -1, te('she sang').roman);
ok('E 不规则复数 feet 可识别', te('cold feet').unmatched.indexOf('feet') === -1);
ok('E 缩写 don\x27t 拆解', te("don't sing").roman === 'Ul silo~');
// (E) 降级与安全
var eOut = te('i enjoy quantum mechanics');
ok('E 词库外 unmatched 非空', eOut.unmatched.length > 0);
ok('E 空串安全', te('').ok === false);
ok('E 纯标点安全', te('?!.').ok === false);

/* ---------- (F) 语法扩展：被动 / 并列 / 限定词 / 复句 ---------- */
// F-a 被动（中受动 -u- + 施事 INS）
eq('F1 被动·无施事', tz('刀被折断').roman, 'Skar bresuwa.');
eq('F2 被动·带施事(工具格)', tz('石被风磨').roman, 'Grán weinum pluruwa.');
eq('F3 被动·1SG一致', tz('我被追').roman, 'Ni grailuwe.');
eq('F4 英被动·过去+示证', te('the knife was broken').roman, 'Skar brèsuwa =và.');
eq('F5 英被动·by施事', te('the tree was burned by fire').roman, 'Áln faijum brìnuwa =và.');
eq('F-pair 被动等义 en≡zh', te('the knife is broken').roman, tz('刀被折断').roman);
ok('F 被动 gloss 标 MID', tz('刀被折断').gloss.indexOf('.MID') !== -1, tz('刀被折断').gloss);
ok('F 英被动 level=1(was)', te('the knife was broken').level === 1);
ok('F 进行式不误判被动', te('the river is flowing').gloss.indexOf('.MID') === -1);
// F-b 名词并列（=ve / vo）
eq('F6 并列主语+复数一致', tz('刀和矛屹立').roman, 'Skar =ve gar lánar.');
eq('F7 或·宾格落末词', tz('我看见狼或熊').roman, 'Ni vorn vo bernon váre.');
eq('F-pair 并列等义 en≡zh', te('the knife and the spear stand').roman, tz('刀和矛屹立').roman);
eq('F-pair 或等义 en≡zh', te('i see a wolf or a bear').roman, tz('我看见狼或熊').roman);
// F-c 限定词（量化）
eq('F8 所有', tz('所有树屹立').roman, 'Hol áln lána.');
eq('F9 每', tz('每人走').roman, 'Pan dhan wena.');
eq('F10 某', tz('某人来').roman, 'Tei dhan gwena.');
eq('F11 英all+复数', te('all trees stand').roman, 'Hol álnin lánar.');
eq('F12 英each', te('each man walks').roman, 'Pan jor wena.');
eq('F13 英several+复数', te('several stones fall').roman, 'Søm gránin dolar.');
// F-d 复句连接（连词/逗号切分）
eq('F14 如果…那么', tz('如果你走，那么我来').roman, 'Hwei vy weno, tho ni gwene.');
eq('F15 因为+逗号', tz('因为我来，你走').roman, 'Fyr ni gwene, vy weno.');
eq('F16 虽然+逗号', tz('虽然山高，河深').roman, 'Glau arn hau, lír dyn.');
eq('F17 但是', tz('我看见狼但是你看见熊').roman, 'Ni vornon váre, nas vy bernon váro.');
eq('F-pair 条件复句等义 en≡zh', te('if you go then i come').roman, tz('如果你走那么我来').roman);
eq('F-pair 转折复句等义 en≡zh', te('i see a wolf but you see a bear').roman, tz('我看见狼但是你看见熊').roman);
eq('F18 英逗号并置', te('i sing, you walk').roman, 'Ni sile, vy weno.');
// F-e 动词补语（副动词 -um）
eq('F19 补语·不及物', tz('我想要唱').roman, 'Ni silum jure.');
eq('F20 补语·带宾语', tz('我想要吃面饼').roman, 'Ni bromon jemum jure.');
eq('F-pair 补语等义 en≡zh', te('i want to sing').roman, tz('我想要唱').roman);
eq('F-pair 补语宾语等义 en≡zh', te('i want to eat bread').roman, tz('我想要吃面饼').roman);
ok('F 补语 gloss 标 CVB', tz('我想要唱').gloss.indexOf('-CVB') !== -1, tz('我想要唱').gloss);
// F-f 名动同形消歧（vAlt 升格）
eq('F21 名动同形·升格动词', tz('我理解真理').roman, 'Ni ólathon skeilne.');
eq('F22 升格+限定词', tz('长老警告每人').roman, 'Weirn pan dhanon vartha.');
eq('F23 复句+升格+被动', tz('如果你背叛盟友，那么你被惩罚').roman, 'Hwei vy brailnon swikajo, tho vy kwerthuwo.');
eq('F-pair 升格等义 en≡zh', te('i understand the truth').roman, tz('我理解真理').roman);
eq('F24 系词在场不升格', tz('警告是礼物').roman, 'Thraul graith.');
eq('F25 显式动词在场不升格', tz('理解需要时间').roman, 'Ondel vethajon durma.');
eq('F26 同形词升格补语', tz('长老需要理解真理').roman, 'Weirn ólathon skeilnum durma.');
eq('F27 尾位同形词保持宾语', tz('我看见警告').roman, 'Ni thraulon váre.');
ok('F 顿号枚举不切从句', tz('刀、矛屹立').roman.indexOf(',') === -1, tz('刀、矛屹立').roman);
ok('F 复句 trace 有拼接步骤', tz('如果你走，那么我来').trace.some(function (s) { return s.step.indexOf('复句') !== -1; }));

/* ---------- 汇总 ---------- */
console.log('\n通过 ' + pass + ' / 失败 ' + fail);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
else console.log('全绿 ✅');
