; Sìlneth 输入 — AutoHotkey v2（任意 App / 任意输入法 / 任意布局全局生效）
; 右 Alt + 键。每键双绑：<^>!=AltGr(US-International 布局) 与 >!=纯右 Alt(中文/普通英文布局)。
; 右Alt+元音=长元音；右Alt+Shift+元音=磨蚀元音；其余特殊字母见下。
; th sh dh ng ll 直接连打两字母，Mírneth 字体自动合字。
#SingleInstance Force

; ---- 长元音（级0满元音）----
<^>!a::Send "{U+00E1}"   ; á
>!a::Send "{U+00E1}"
<^>!e::Send "{U+00E9}"   ; é
>!e::Send "{U+00E9}"
<^>!i::Send "{U+00ED}"   ; í
>!i::Send "{U+00ED}"
<^>!o::Send "{U+00F3}"   ; ó
>!o::Send "{U+00F3}"
<^>!u::Send "{U+00FA}"   ; ú
>!u::Send "{U+00FA}"
<^>!y::Send "{U+00FD}"   ; ý
>!y::Send "{U+00FD}"

; ---- 磨蚀元音（远时/祖时）----
<^>!+a::Send "{U+00E0}"  ; à
>!+a::Send "{U+00E0}"
<^>!+e::Send "{U+00E8}"  ; è
>!+e::Send "{U+00E8}"
<^>!+i::Send "{U+00EC}"  ; ì
>!+i::Send "{U+00EC}"
<^>!+o::Send "{U+00F2}"  ; ò
>!+o::Send "{U+00F2}"
<^>!+u::Send "{U+00F9}"  ; ù
>!+u::Send "{U+00F9}"
<^>!+y::Send "{U+1EF3}"  ; ỳ
>!+y::Send "{U+1EF3}"

; ---- 特殊字母（符号键用扫描码，避开 ; 注释与布局歧义）----
<^>!n::Send "{U+00F1}"      ; ñ
>!n::Send "{U+00F1}"
<^>!SC01A::Send "{U+00F8}"  ; ø  ([ 键)
>!SC01A::Send "{U+00F8}"
<^>!+SC01A::Send "{U+01FF}" ; ǿ  (Shift+[)
>!+SC01A::Send "{U+01FF}"
<^>!SC01B::Send "{U+00EB}"  ; ë  (] 键)
>!SC01B::Send "{U+00EB}"
<^>!SC027::Send "{U+0153}"  ; œ  (; 键)
>!SC027::Send "{U+0153}"
