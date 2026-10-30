# Generates the Android launcher icons from the Gradient PDF logo.
# Run: python scripts/icons.py   (needs Pillow)
from PIL import Image, ImageDraw

RES = 'android/app/src/main/res'
BLUE = (59, 73, 240)
SS = 4  # supersampling for smooth edges

# Logo geometry in the site's 24-unit SVG viewBox.
PAGE = [(7, 4), (13.5, 4), (17, 7.5), (17, 20), (7, 20)]
FOLD = [(13.5, 4), (13.5, 7.5), (17, 7.5)]
WEDGE = [(7, 13.5), (17, 10), (17, 20), (7, 20)]


def glyph(size, box, offset):
    """Draw the logo glyph onto a transparent RGBA canvas; `box` px per 24 units."""
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    k = box * SS / 24
    o = offset * SS
    pt = lambda p: (o + p[0] * k, o + p[1] * k)

    # white → mint gradient wedge
    grad = Image.new('RGBA', (big, big))
    gd = ImageDraw.Draw(grad)
    x0, y0, x1, y1 = pt((7, 10)) + pt((17, 20))
    for i in range(int(y1 - y0) + int(x1 - x0) + 1):
        t = i / max(1, (y1 - y0) + (x1 - x0))
        c = tuple(round(a + (b - a) * t) for a, b in zip((255, 255, 255), (92, 242, 192))) + (255,)
        gd.line([(x0 + i, y0), (x0, y0 + i)], fill=c, width=2)
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).polygon([pt(p) for p in WEDGE], fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    w = round(1.8 * k)
    d.line([pt(p) for p in PAGE + PAGE[:2]], fill='white', width=w, joint='curve')
    d.line([pt(p) for p in FOLD], fill='white', width=w, joint='curve')
    return img.resize((size, size), Image.LANCZOS)


def legacy(size, round_):
    """Pre-Android-8 icon: blue tile (rounded square or circle) with the glyph."""
    big = size * SS
    bg = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    if round_:
        d.ellipse([0, 0, big - 1, big - 1], fill=BLUE)
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=BLUE)
    bg = bg.resize((size, size), Image.LANCZOS)
    g = glyph(size, size * 0.72, size * 0.14)
    bg.alpha_composite(g)
    return bg


DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, scale in DENSITIES.items():
    folder = f'{RES}/mipmap-{name}'
    # Adaptive foreground: 108dp canvas, glyph inside the 66dp safe zone.
    fg = round(108 * scale)
    glyph(fg, fg * 0.62, fg * 0.19).save(f'{folder}/ic_launcher_foreground.png')
    leg = round(48 * scale)
    legacy(leg, False).save(f'{folder}/ic_launcher.png')
    legacy(leg, True).save(f'{folder}/ic_launcher_round.png')

with open(f'{RES}/values/ic_launcher_background.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#3B49F0</color>\n</resources>\n')
print('icons written')
