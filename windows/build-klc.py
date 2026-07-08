#!/usr/bin/env python3
# 生成 Silneth 键盘布局的 MSKLC 源文件 (.klc, UTF-16LE)。US 底 + AltGr 层为 Silneth 字母。
import os
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, "silneth-keyboard.klc")

# US 基础键：SC, VK, CAP, base, shift
BASE = [
 ("02","1","0","1","0021"),("03","2","0","2","0040"),("04","3","0","3","0023"),
 ("05","4","0","4","0024"),("06","5","0","5","0025"),("07","6","0","6","005e"),
 ("08","7","0","7","0026"),("09","8","0","8","002a"),("0a","9","0","9","0028"),
 ("0b","0","0","0","0029"),("0c","OEM_MINUS","0","002d","005f"),("0d","OEM_PLUS","0","003d","002b"),
 ("10","Q","1","q","Q"),("11","W","1","w","W"),("12","E","1","e","E"),("13","R","1","r","R"),
 ("14","T","1","t","T"),("15","Y","1","y","Y"),("16","U","1","u","U"),("17","I","1","i","I"),
 ("18","O","1","o","O"),("19","P","1","p","P"),("1a","OEM_4","0","005b","007b"),
 ("1b","OEM_6","0","005d","007d"),("2b","OEM_5","0","005c","007c"),
 ("1e","A","1","a","A"),("1f","S","1","s","S"),("20","D","1","d","D"),("21","F","1","f","F"),
 ("22","G","1","g","G"),("23","H","1","h","H"),("24","J","1","j","J"),("25","K","1","k","K"),
 ("26","L","1","l","L"),("27","OEM_1","0","003b","003a"),("28","OEM_7","0","0027","0022"),
 ("29","OEM_3","0","0060","007e"),
 ("2c","Z","1","z","Z"),("2d","X","1","x","X"),("2e","C","1","c","C"),("2f","V","1","v","V"),
 ("30","B","1","b","B"),("31","N","1","n","N"),("32","M","1","m","M"),
 ("33","OEM_COMMA","0","002c","003c"),("34","OEM_PERIOD","0","002e","003e"),("35","OEM_2","0","002f","003f"),
 ("39","SPACE","0","0020","0020"),
]

# AltGr(col6) / Shift+AltGr(col7) 覆盖：VK -> (col6, col7)
ALT = {
 "A":("00e1","00e0"),  # á à
 "E":("00e9","00e8"),  # é è
 "I":("00ed","00ec"),  # í ì
 "O":("00f3","00f2"),  # ó ò
 "U":("00fa","00f9"),  # ú ù
 "Y":("00fd","1ef3"),  # ý ỳ
 "N":("00f1","00d1"),  # ñ Ñ
 "OEM_4":("00f8","01ff"),  # ø ǿ  ([ 键)
 "OEM_6":("00eb","00eb"),  # ë    (] 键)
 "OEM_1":("0153","0152"),  # œ Œ  (; 键)
 "SPACE":("0020","0020"),
}

def norm(v):
    # 单字符字面量转 4 位 hex；已是 hex 的原样
    if len(v) == 1:
        return "%04x" % ord(v)
    return v

lines = []
lines.append('KBD\tSILneth\t"Silneth Mirneth"')
lines.append("")
lines.append('COPYRIGHT\t"(c) Acrabxie"')
lines.append("")
lines.append('COMPANY\t"Silneth"')
lines.append("")
lines.append('LOCALENAME\t"en-US"')
lines.append("")
lines.append('LOCALEID\t"00000409"')
lines.append("")
lines.append("VERSION\t1.0")
lines.append("")
lines.append("SHIFTSTATE")
lines.append("")
lines.append("0\t//Column 4")
lines.append("1\t//Column 5 : Shift")
lines.append("6\t//Column 6 : Ctrl Alt")
lines.append("7\t//Column 7 : Shift Ctrl Alt")
lines.append("")
lines.append("LAYOUT\t\t;an '@' at the end of a line is a dead key")
lines.append("")
lines.append("//SC\tVK_\t\tCap\t0\t1\t6\t7")
lines.append("//--\t----\t\t----\t----\t----\t----\t----")
lines.append("")
for sc, vk, cap, c0, c1 in BASE:
    col6, col7 = ALT.get(vk, ("-1", "-1"))
    c0n, c1n = norm(c0), norm(c1)
    lines.append("\t".join([sc, vk, cap, c0n, c1n, col6, col7]))
lines.append("")
lines.append("KEYNAME")
lines.append("")
lines.append("01\tEsc")
lines.append("0e\tBackspace")
lines.append("0f\tTab")
lines.append("1c\tEnter")
lines.append("39\tSpace")
lines.append("")
lines.append("KEYNAME_EXT")
lines.append("")
lines.append("1c\tNum Enter")
lines.append("")
lines.append("DESCRIPTIONS")
lines.append("")
lines.append("0409\tSilneth Mirneth")
lines.append("")
lines.append("LANGUAGENAMES")
lines.append("")
lines.append("0409\tEnglish (United States)")
lines.append("")
lines.append("ENDKBD")

data = "\r\n".join(lines) + "\r\n"
with open(OUT, "w", encoding="utf-16-le") as f:
    f.write("﻿")  # BOM
    f.write(data)
print("已生成:", OUT, "|", len(BASE), "键 +", len(ALT), "AltGr 覆盖")
