# 在 Windows 上「系统级」用 Sìlneth

> 说明：把整个 Windows **显示语言**换成 Sìlneth 做不到（微软只认官方语言包 MUI/LIP，
> 自造语言无合法通道）。但下面两样是真正的系统级、跨所有 App 生效。

## 1. Mírneth 字体（任何 App 里都渲染 Sìlneth 字形）

`Silneth-Mirneth.ttf` — 由翻译器引擎的字形路径生成的真正 OpenType 字体。

**安装**：右键 `Silneth-Mirneth.ttf` →「为所有用户安装」（或双击 →「安装」）。

**使用**：在 Word / 记事本 / 浏览器把字体选成 **“Silneth Mirneth”**，
打**罗马化 Sìlneth**（拉丁字母 + 变音符）即渲染成冷冽字形：
- `th sh dh ng ll` 自动合字成单字形（OpenType 连字）
- 长元音 `í á ó…` 自动戴「天」标；磨蚀元音 `ì à ò…` 戴「裂」标
- 句末 `. ~ ?` 渲染成下跌/悬停/上挑三种边界调号

## 2. Sìlneth 键盘（在任何地方打出特殊字母）

两条路，任选其一：

### A. AutoHotkey（最省事，装完即用）
1. 装 **AutoHotkey v1**（autohotkey.com）
2. 双击 `silneth-keyboard.ahk` 运行（托盘出现绿 H 图标）
3. 全局生效：`AltGr(右Alt) + 元音` = 长元音（á é í ó ú ý）；
   `AltGr+Shift+元音` = 磨蚀元音（à è ì ò ù ỳ）；
   `AltGr+n` = ñ，`AltGr+[` = ø，`AltGr+Shift+[` = ǿ，`AltGr+]` = ë，`AltGr+;` = œ

### B. 正经系统输入语言（MSKLC，会出现在 Win+空格 切换里）
1. 装微软 **Keyboard Layout Creator (MSKLC)**（免费）
2. MSKLC 里 `File → Load Existing Keyboard...` 打开 `silneth-keyboard.klc`
3. `Project → Build DLL and Setup Package` → 运行生成的 `setup.exe`
4. 到「设置 → 时间和语言 → 语言 → 键盘」添加 **“Silneth Mirneth”**，
   `Win+空格` 切换。AltGr 层同上（á à é è í ì ó ò ú ù ý ỳ ñ ø ǿ ë œ）。

> `th sh dh ng ll` 无需特殊键，直接连打两个字母，Mírneth 字体会自动合字。

## 重新生成（可选）
`build-font.py`（需 `pip install shapely fonttools`）与 `build-klc.py` 从
`_glyph-paths.json`（引擎字形路径）确定性重建字体与键盘源，改字形/加键位后重跑即可。
