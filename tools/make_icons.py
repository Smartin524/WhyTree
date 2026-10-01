"""由 icons/favicon.svg 的几何数据生成各尺寸透明底 PNG 和 macOS .icns。
用法：python3 tools/make_icons.py [输出 .icns 路径]
只用 Pillow；几何参数与 favicon.svg 保持一致（改图形时两处一起改）。"""
import math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

RED, GREEN, LINE = (217, 87, 58), (31, 138, 110), (138, 133, 118)
CIRCLES = [((11, 32), 9, RED), ((34, 16), 7.5, GREEN), ((34, 48), 7.5, GREEN), ((54, 48), 6, RED)]
CURVES = [[(11, 32), (27, 32), (21, 16), (34, 16)], [(11, 32), (27, 32), (21, 48), (34, 48)], None]
STROKE = 4.5

def bezier(p, n=80):
    return [tuple((1-t)**3*p[0][i] + 3*(1-t)**2*t*p[1][i] + 3*(1-t)*t*t*p[2][i] + t**3*p[3][i] for i in (0, 1))
            for t in (k/n for k in range(n+1))]

def render(size, fill=0.84):
    """glyph 占画布 fill 比例并居中；4x 超采样抗锯齿"""
    ss = 4; S = size*ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    xs = [c[0][0]-c[1] for c in CIRCLES] + [c[0][0]+c[1] for c in CIRCLES]
    ys = [c[0][1]-c[1] for c in CIRCLES] + [c[0][1]+c[1] for c in CIRCLES]
    w, h = max(xs)-min(xs), max(ys)-min(ys); k = S*fill/max(w, h)
    ox, oy = (S-w*k)/2 - min(xs)*k, (S-h*k)/2 - min(ys)*k
    T = lambda p: (p[0]*k+ox, p[1]*k+oy)
    def dot(p, r, col): x, y = T(p); d.ellipse([x-r*k, y-r*k, x+r*k, y+r*k], fill=col)
    for c in CURVES:
        pts = bezier(c) if c else [(34, 48), (53, 48)]
        for a in pts[:: 1 if c else 2]: dot(a, STROKE/2, LINE)
        if not c:
            for i in range(60): dot((34+19*i/59, 48), STROKE/2, LINE)
    for p, r, col in CIRCLES: dot(p, r, col)
    return img.resize((size, size), Image.LANCZOS)

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for s in (16, 32, 48, 180, 512):
        render(s, 0.9 if s <= 48 else 0.84).save(f"{root}/icons/icon-{s}.png")
    if len(sys.argv) > 1:
        with tempfile.TemporaryDirectory() as tmp:
            iconset = f"{tmp}/WhyTree.iconset"; os.mkdir(iconset)
            for s in (16, 32, 128, 256, 512):
                render(s).save(f"{iconset}/icon_{s}x{s}.png"); render(s*2).save(f"{iconset}/icon_{s}x{s}@2x.png")
            subprocess.run(["iconutil", "-c", "icns", iconset, "-o", sys.argv[1]], check=True)
