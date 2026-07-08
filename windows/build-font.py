#!/usr/bin/env python3
# 从 Mírneth 单线笔画路径构建 OpenType 字体：shapely 把笔画 buffer 成圆头填充轮廓，
# fonttools 组装 cmap/glyf/hmtx/GSUB(连字)。输出 Silneth-Mirneth.ttf。
# 面向「书写罗马化 Silneth」：打拉丁字母+变音符，即渲染冷冽字形；th/sh/dh/ng/ll 自动连字。
import json, os, math
from shapely.geometry import LineString
from shapely.ops import unary_union
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

D = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(D, "_glyph-paths.json"), encoding="utf-8"))

UPM = 1000
SCALE = 10.0
BASELINE = 82.0        # SVG y=82 作基线
STROKE = 7.2 * SCALE   # 笔画半宽用 STROKE/2
HALF = STROKE / 2.0
ADV = 640

def fx(x): return int(round(x * SCALE))
def fy(y): return int(round((BASELINE - y) * SCALE))

def flatten_q(p0, c, p1, n=14):
    pts = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = mt*mt*p0[0] + 2*mt*t*c[0] + t*t*p1[0]
        y = mt*mt*p0[1] + 2*mt*t*c[1] + t*t*p1[1]
        pts.append((x, y))
    return pts

def subpaths(d):
    toks = d.replace(",", " ").split()
    subs, cur, pos = [], None, (0, 0)
    i = 0
    while i < len(toks):
        c = toks[i]
        if c == "M":
            if cur: subs.append(cur)
            pos = (float(toks[i+1]), float(toks[i+2])); cur = [pos]; i += 3
        elif c == "L":
            pos = (float(toks[i+1]), float(toks[i+2])); cur.append(pos); i += 3
        elif c == "Q":
            cc = (float(toks[i+1]), float(toks[i+2])); pos1 = (float(toks[i+3]), float(toks[i+4]))
            cur.extend(flatten_q(pos, cc, pos1)); pos = pos1; i += 5
        else:
            i += 1
    if cur: subs.append(cur)
    return subs

def glyph_polygon(pathkeys):
    """把若干单线路径 buffer 成圆头轮廓，合并为一个（多）多边形。坐标已转字体坐标系。"""
    polys = []
    for key in pathkeys:
        for sub in subpaths(P[key]):
            pts = [(fx(x), fy(y)) for (x, y) in sub]
            if len(pts) == 1:
                pts = [pts[0], (pts[0][0] + 1, pts[0][1])]  # 单点→极短线，成圆点
            ls = LineString(pts)
            polys.append(ls.buffer(HALF, cap_style=1, join_style=1, resolution=8))
    return unary_union(polys)

def poly_to_glyph(poly, width):
    pen = TTGlyphPen(None)
    geoms = getattr(poly, "geoms", [poly])
    for g in geoms:
        if g.is_empty: continue
        rings = [g.exterior] + list(g.interiors)
        for ring in rings:
            coords = list(ring.coords)
            if len(coords) < 3: continue
            pen.moveTo((int(coords[0][0]), int(coords[0][1])))
            for (x, y) in coords[1:-1]:
                pen.lineTo((int(x), int(y)))
            pen.closePath()
    gl = pen.glyph()
    return gl

# ---- 码位映射 ----
CONS = {'p':'pe','b':'be','m':'me','f':'fe','v':'ve','t':'te','d':'de','n':'ne',
        's':'se','z':'ze','k':'ke','g':'ge','h':'he','r':'re','l':'le','w':'we','j':'je','ñ':'nye'}
VOW  = {'a':'a','e':'e','i':'i','o':'o','u':'u','y':'y','ø':'oe','ë':'schwa','œ':'oe'}
LONG = {'í':('i','sky'),'ý':('y','sky'),'é':('e','sky'),'á':('a','sky'),'ó':('o','sky'),'ú':('u','sky'),'ǿ':('oe','sky')}
EROD = {'ì':('i','crack'),'è':('e','crack'),'à':('a','crack'),'ò':('o','crack'),'ù':('u','crack'),'ỳ':('y','crack')}
PUNCT= {'.':'fall','~':'hang','?':'rise','!':'voc','=':'clitic','-':'pause'}
DIGR = [('t','h','the','thae'),('s','h','she','shae'),('d','h','dhe','dhae'),('n','g','nge','ngae'),('l','l','lle','llae')]

# 组装 glyph 集合：name -> (unicode或None, pathkeys, advance)
glyphs = {}
order = [".notdef", "space"]
glyphs[".notdef"] = (None, [], 0)
glyphs["space"] = (0x20, None, 380)

def add(name, uni, keys, adv=ADV):
    glyphs[name] = (uni, keys, adv)
    order.append(name)

cmap = {}
def gname_for(ch):
    return "g" + format(ord(ch), "04X")

for ch, key in {**CONS, **VOW}.items():
    n = gname_for(ch); add(n, ord(ch), [key]); cmap[ord(ch)] = n
for ch, (v, mk) in {**LONG, **EROD}.items():
    n = gname_for(ch); add(n, ord(ch), [v, mk]); cmap[ord(ch)] = n
for ch, key in PUNCT.items():
    n = gname_for(ch); add(n, ord(ch), [key]); cmap[ord(ch)] = n
# 二合连字字形（无码位）
lig = []
for a, b, key, name in DIGR:
    add(name, None, [key]); lig.append((cmap[ord(a)], cmap[ord(b)], name))

# ---- 构建轮廓 ----
glyph_objs, advances = {}, {}
for name in order:
    uni, keys, adv = glyphs[name]
    if not keys:
        pen = TTGlyphPen(None); glyph_objs[name] = pen.glyph()
    else:
        poly = glyph_polygon(keys)
        glyph_objs[name] = poly_to_glyph(poly, adv)
    advances[name] = adv

# ---- fonttools 组装 ----
fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyph_objs)
metrics = {n: (advances[n], glyph_objs[n].xMin if hasattr(glyph_objs[n], "xMin") and glyph_objs[n].numberOfContours else 0) for n in order}
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=800, descent=-200)
names = dict(familyName="Silneth Mirneth", styleName="Regular", fullName="Silneth Mirneth",
             psName="SilnethMirneth-Regular", version="Version 1.0",
             copyright="Silneth / Mirneth script, generated from engine glyph paths. Acrabxie.")
fb.setupNameTable(names)
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=900, usWinDescent=250)
fb.setupPost()

# GSUB 连字：liga
try:
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
    fea = "feature liga {\n"
    for a, b, name in lig:
        fea += "    sub %s %s by %s;\n" % (a, b, name)
    fea += "} liga;\n"
    addOpenTypeFeaturesFromString(fb.font, fea)
except Exception as e:
    print("连字构建跳过:", e)

TTF = os.path.join(D, "Silneth-Mirneth.ttf")
fb.save(TTF)
print("已生成:", TTF)
print("字形数:", len(order), "| 码位:", len(cmap), "| 连字:", len(lig))
