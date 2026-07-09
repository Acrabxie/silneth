; Sìlneth 输入 — AutoHotkey v2（任意 App 全局生效）
; AltGr(右Alt)+元音=长元音；AltGr+Shift+元音=磨蚀元音；其余特殊字母见下。
; th sh dh ng ll 直接连打两字母，Mírneth 字体自动合字。
#SingleInstance Force

; 长元音（级0满元音）
<^>!a::Send "{U+00E1}"   ; á
<^>!e::Send "{U+00E9}"   ; é
<^>!i::Send "{U+00ED}"   ; í
<^>!o::Send "{U+00F3}"   ; ó
<^>!u::Send "{U+00FA}"   ; ú
<^>!y::Send "{U+00FD}"   ; ý
; 磨蚀元音（远时/祖时）
<^>!+a::Send "{U+00E0}"  ; à
<^>!+e::Send "{U+00E8}"  ; è
<^>!+i::Send "{U+00EC}"  ; ì
<^>!+o::Send "{U+00F2}"  ; ò
<^>!+u::Send "{U+00F9}"  ; ù
<^>!+y::Send "{U+1EF3}"  ; ỳ
; 特殊字母
<^>!n::Send "{U+00F1}"   ; ñ
<^>![::Send "{U+00F8}"   ; ø
<^>!+[::Send "{U+01FF}"  ; ǿ
<^>!]::Send "{U+00EB}"   ; ë
<^>!;::Send "{U+0153}"   ; œ
