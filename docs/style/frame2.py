"""Draws style frame 2: the man formed from the dust (Genesis 2:7). Original artwork, flat illustration.

  python3 docs/style/frame2.py   ->  docs/style/eden-man-style-frame-2.svg
"""
import math, random

random.seed(11)
W, H = 1600, 1000
o = []
A = o.append
CREAM, GOLD, INK = "#fff3cf", "#f6c35a", "#0b1226"

A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Georgia, \'Iowan Old Style\', serif">')
A('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141a3c"/><stop offset="0.55" stop-color="#3b3564"/><stop offset="0.82" stop-color="#b9694c"/><stop offset="1" stop-color="#f0b56a"/></linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a3c"/><stop offset="1" stop-color="#4a2d22"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff3cf" stop-opacity="0.75"/><stop offset="1" stop-color="#fff3cf" stop-opacity="0"/></radialGradient>
<linearGradient id="breath" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3cf" stop-opacity="0"/><stop offset="0.35" stop-color="#fff3cf" stop-opacity="0.9"/><stop offset="1" stop-color="#f6c35a"/></linearGradient>
<linearGradient id="fade" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff3cf"/><stop offset="0.55" stop-color="#f3d79a"/><stop offset="1" stop-color="#c79a66" stop-opacity="0"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.10 0"/></filter>
</defs>''')
A(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
# a few last stars
for _ in range(46):
    A(f'<circle cx="{random.uniform(40, 1560):.0f}" cy="{random.uniform(30, 380):.0f}" r="{random.choice([1.2, 1.7, 2.3])}" fill="{CREAM}" opacity="{random.uniform(0.35, 0.9):.2f}"/>')
# bare far hills: no plant of the field was yet in the earth (2:5)
A('<path d="M 0 610 Q 220 540 430 600 T 860 590 T 1300 575 T 1600 600 V 720 H 0 Z" fill="#5b3f52"/>')
A('<path d="M 0 650 Q 300 590 620 640 T 1180 630 T 1600 650 V 760 H 0 Z" fill="#6f4a45"/>')
# the mist that went up from the earth (2:6)
for (x, y, rx, ry, op) in [(260, 690, 330, 34, 0.30), (820, 676, 420, 30, 0.22), (1380, 694, 300, 32, 0.28), (560, 716, 260, 22, 0.20)]:
    A(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{CREAM}" opacity="{op}" filter="url(#soft)"/>')
# the ground
A('<path d="M 0 720 Q 400 690 800 708 T 1600 716 V 1000 H 0 Z" fill="url(#ground)"/>')
for k in range(7):
    y = 770 + k * 30
    A(f'<path d="M {60 + k * 40} {y} q 120 -16 240 0 t 240 0 t 240 0 t 240 0 t 240 0" fill="none" stroke="#3b241c" stroke-width="2" opacity="{0.45 - k * 0.04:.2f}"/>')
# glow where life enters
A('<circle cx="1030" cy="640" r="230" fill="url(#glow)"/>')
# the breath: a ribbon of light coming down to the face. No figure: only what happens.
ribbon = "M 1540 60 C 1380 140 1500 300 1330 380 S 1190 520 1080 618"
for wd, op in ((34, 0.16), (16, 0.45), (6, 0.95)):
    A(f'<path d="{ribbon}" fill="none" stroke="url(#breath)" stroke-width="{wd}" stroke-linecap="round" opacity="{op}"/>')
for (x, y, r) in [(1452, 150, 4), (1420, 260, 3), (1318, 372, 5), (1236, 470, 3), (1150, 556, 4), (1100, 598, 3)]:
    A(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{CREAM}"/>')
# the figure of light, lying on the ground: head and chest formed, the rest still gathering from dust
A(f'<path d="M 560 716 C 640 690 720 676 800 668 C 870 660 930 640 968 632 C 990 628 1002 640 996 656 C 986 684 930 700 860 712 C 760 728 660 730 560 716 Z" fill="url(#fade)"/>')
A(f'<circle cx="1034" cy="634" r="40" fill="{CREAM}"/>')
A(f'<path d="M 990 646 q 14 -18 30 -6" fill="none" stroke="{CREAM}" stroke-width="16" stroke-linecap="round"/>')
A(f'<path d="M 930 664 C 900 700 850 716 800 720" fill="none" stroke="{CREAM}" stroke-width="20" stroke-linecap="round" opacity="0.9"/>')
# dust lifting from the ground and drawing into the shape
for i in range(260):
    t = random.random()
    x = 250 + t * 520 + random.uniform(-30, 30)
    lift = math.sin(t * math.pi) * 130 * random.random()
    y = 728 - lift - (1 - t) * random.uniform(0, 26)
    r = random.choice([1.6, 2.2, 3.0, 3.8]) * (0.6 + t * 0.7)
    col = random.choice(["#d9a86c", "#f3d79a", "#c08552", CREAM])
    A(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{col}" opacity="{0.35 + 0.6 * t:.2f}"/>')
for (x0, y0, x1, y1) in [(300, 730, 520, 650), (380, 740, 600, 668), (240, 744, 470, 690), (450, 742, 660, 690)]:
    A(f'<path d="M {x0} {y0} Q {(x0 + x1) / 2} {y1 - 60} {x1} {y1}" fill="none" stroke="#f3d79a" stroke-width="2" stroke-dasharray="2 10" opacity="0.6"/>')
# titles
A(f'<text x="800" y="70" fill="{CREAM}" font-size="34" text-anchor="middle">Formed of the dust of the ground</text>')
A('<text x="800" y="100" fill="#b9bfd6" font-size="15" font-family="Helvetica, Arial, sans-serif" letter-spacing="1.5" text-anchor="middle">STYLE FRAME 2 · EDEN 1 · GENESIS 2:7</text>')

# the four moments, as a strip
def panel(x, n, caption, draw):
    A(f'<g transform="translate({x} 836)"><rect width="250" height="112" rx="12" fill="{INK}" opacity="0.72"/><rect width="250" height="112" rx="12" fill="none" stroke="{CREAM}" stroke-opacity="0.35"/>')
    A('<path d="M 12 84 Q 125 74 238 84 V 100 H 12 Z" fill="#6f4a45"/>')
    draw()
    A(f'<text x="14" y="24" fill="{CREAM}" font-size="15">{n}. {caption}</text></g>')

def p1():
    for i in range(22):
        A(f'<circle cx="{40 + i * 8}" cy="{80 - (i % 5) * 7}" r="2" fill="#f3d79a" opacity="0.8"/>')
def p2():
    A('<path d="M 60 80 C 100 62 150 60 190 66" fill="none" stroke="#f3d79a" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 9"/>')
    A('<circle cx="204" cy="62" r="11" fill="none" stroke="#f3d79a" stroke-width="3" stroke-dasharray="2 5"/>')
def p3():
    A(f'<path d="M 60 80 C 100 64 150 62 190 66" fill="none" stroke="{CREAM}" stroke-width="11" stroke-linecap="round"/><circle cx="204" cy="62" r="11" fill="{CREAM}"/>')
    A(f'<path d="M 244 30 C 226 36 232 52 214 58" fill="none" stroke="{GOLD}" stroke-width="3" stroke-linecap="round"/>')
def p4():
    A(f'<path d="M 96 82 H 150 L 160 52" fill="none" stroke="{CREAM}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="163" cy="38" r="11" fill="{CREAM}"/>')
    A(f'<circle cx="160" cy="52" r="34" fill="{CREAM}" opacity="0.12"/>')

for k, (cap, fn) in enumerate([("Dust lifts", p1), ("It gathers", p2), ("Breath enters", p3), ("He sits up", p4)]):
    panel(245 + k * 285, k + 1, cap, fn)
A('<text x="800" y="982" fill="#d7c9b4" font-size="13" font-family="Helvetica, Arial, sans-serif" text-anchor="middle">Text: dust of the ground, the breath of life, a living soul; bare earth and a rising mist (2:5-6). Illustration: how it looked. God is shown only by what happens.</text>')
A(f'<rect width="{W}" height="{H}" filter="url(#grain)"/>')
A('</svg>')
open(__file__.rsplit("/", 1)[0] + "/eden-man-style-frame-2.svg", "w").write("\n".join(o))
