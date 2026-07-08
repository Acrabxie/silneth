; ============================================================
;  Sìlneth 输入 — AutoHotkey v1 脚本（任意 App 全局生效）
;  用法：装 AutoHotkey v1（autohotkey.com）→ 双击本文件运行。
;  规则：AltGr（右 Alt）+ 元音 = 长元音（磨蚀级0，戴“天”）
;        AltGr + Shift + 元音 = 磨蚀元音（戴“裂”）
;        其余特殊字母见下。托盘图标右键可退出。
;  说明：th sh dh ng ll 直接连打两个字母即可，Mírneth 字体会自动合字。
; ============================================================
#NoEnv
#SingleInstance Force
SendMode Input

; --- 长元音（acute，级0满元音）AltGr + 元音 ---
<^>!a::SendInput, {U+00E1}   ; á
<^>!e::SendInput, {U+00E9}   ; é
<^>!i::SendInput, {U+00ED}   ; í
<^>!o::SendInput, {U+00F3}   ; ó
<^>!u::SendInput, {U+00FA}   ; ú
<^>!y::SendInput, {U+00FD}   ; ý

; --- 磨蚀元音（grave，远时/祖时）AltGr + Shift + 元音 ---
<^>!+a::SendInput, {U+00E0} ; à
<^>!+e::SendInput, {U+00E8} ; è
<^>!+i::SendInput, {U+00EC} ; ì
<^>!+o::SendInput, {U+00F2} ; ò
<^>!+u::SendInput, {U+00F9} ; ù
<^>!+y::SendInput, {U+1EF3} ; ỳ

; --- 特殊字母 ---
<^>!n::SendInput, {U+00F1}   ; ñ
<^>![::SendInput, {U+00F8}   ; ø  （AltGr + [ ）
<^>!+[::SendInput, {U+01FF}  ; ǿ  （AltGr + Shift + [ ）
<^>!']::SendInput, {U+00EB}  ; ë  （AltGr + ] 施瓦）
<^>!;::SendInput, {U+0153}   ; œ  （AltGr + ; ）

; --- 边界调号（可选，用于手写 Mírneth 标点）---
; 句末：. ~ ?  已是普通键；Mírneth 字体会把 . ~ ? 渲染成下跌/悬停/上挑调。
