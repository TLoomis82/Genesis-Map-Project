"""Style frame 2b: the man formed from the dust (Genesis 2:7), in a hand-drawn manner.

Ink outlines that wobble, flat colour that does not quite fill its lines, hatching and drawn rays in
place of smooth glows. Original artwork.

  python3 docs/style/frame2b.py   ->  docs/style/eden-man-style-frame-2b.svg
"""
import math, random

random.seed(23)
W, H = 1600, 1000
o = []
A = o.append
INK, CREAM, GOLD = "#1d1a33", "#fbeecb", "#eeb04a"

A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Georgia, \'Iowan Old Style\', serif">')
A('''<defs>
<filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="12"/><feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.82  0 0 0 0.16 0"/></filter>
<pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><line x1="0" y1="7" x2="14" y2="7" stroke="#1d1a33" stroke-width="1.6" opacity="0.28"/></pattern>
<pattern id="hatch2" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="5" x2="10" y2="5" stroke="#1d1a33" stroke-width="1.4" opacity="0.22"/></pattern>
</defs>''')
A(f'<rect width="{W}" height="{H}" fill="#2a2752"/>')
A('<g filter="url(#wobble)" stroke-linejoin="round" stroke-linecap="round">')
# sky in flat bands, like cut paper
A('<path d="M -20 300 Q 400 260 800 300 T 1620 280 V 760 H -20 Z" fill="#3a3466"/>')
A('<path d="M -20 470 Q 420 430 860 470 T 1620 450 V 760 H -20 Z" fill="#5a3f6b"/>')
A('<path d="M -20 560 Q 380 530 820 566 T 1620 548 V 760 H -20 Z" fill="#c6704e"/>')
# stars drawn as little crosses and dots
for _ in range(34):
    x, y, s = random.uniform(40, 1560), random.uniform(30, 420), random.choice([4, 6, 8])
    if random.random() < 0.5:
        A(f'<path d="M {x - s:.0f} {y:.0f} h {2 * s} M {x:.0f} {y - s:.0f} v {2 * s}" stroke="{CREAM}" stroke-width="2.2" fill="none"/>')
    else:
        A(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{s / 3:.1f}" fill="{CREAM}"/>')
# bare hills, outlined
A(f'<path d="M -20 640 Q 220 560 440 620 T 880 606 T 1310 590 T 1620 620 V 760 H -20 Z" fill="#6b4762" stroke="{INK}" stroke-width="4"/>')
A('<path d="M -20 640 Q 220 560 440 620 T 880 606 T 1310 590 T 1620 620 V 760 H -20 Z" fill="url(#hatch2)"/>')
# mist: drawn as a few open curls, not a blur
for (x, y) in [(170, 690), (430, 704), (1260, 688), (1470, 706)]:
    A(f'<path d="M {x - 90} {y} q 30 -26 60 0 t 60 0 t 60 0" fill="none" stroke="{CREAM}" stroke-width="4" opacity="0.75"/>')
    A(f'<path d="M {x - 50} {y + 18} q 24 -18 48 0 t 48 0" fill="none" stroke="{CREAM}" stroke-width="3" opacity="0.5"/>')
# the ground
A(f'<path d="M -20 728 Q 400 698 800 716 T 1620 722 V 1020 H -20 Z" fill="#9a6240" stroke="{INK}" stroke-width="5"/>')
A('<path d="M -20 800 Q 400 772 800 792 T 1620 796 V 1020 H -20 Z" fill="url(#hatch)"/>')
for _ in range(60):
    x, y = random.uniform(20, 1580), random.uniform(750, 830)
    A(f'<path d="M {x:.0f} {y:.0f} l {random.uniform(8, 22):.0f} {random.uniform(-3, 3):.0f}" stroke="{INK}" stroke-width="2" opacity="0.4" fill="none"/>')
# rays around the head, drawn, in place of a glow
for k in range(22):
    a = math.radians(k * (360 / 22) + 4)
    r0, r1 = 62 + (k % 2) * 8, 104 + (k % 3) * 22
    A(f'<path d="M {1036 + r0 * math.cos(a):.0f} {634 + r0 * math.sin(a):.0f} L {1036 + r1 * math.cos(a):.0f} {634 + r1 * math.sin(a):.0f}" stroke="{GOLD}" stroke-width="5" fill="none"/>')
# the breath: a drawn ribbon with an ink edge
ribbon = "M 1530 70 C 1370 150 1500 300 1330 384 S 1196 520 1086 612"
A(f'<path d="{ribbon}" fill="none" stroke="{INK}" stroke-width="30"/>')
A(f'<path d="{ribbon}" fill="none" stroke="{CREAM}" stroke-width="21"/>')
A(f'<path d="{ribbon}" fill="none" stroke="{GOLD}" stroke-width="5" stroke-dasharray="26 18" transform="translate(4 3)"/>')
# dust: drawn specks and short flicks lifting off the ground toward the figure
for i in range(170):
    t = random.random()
    x = 250 + t * 500 + random.uniform(-30, 30)
    y = 730 - math.sin(t * math.pi) * 120 * random.random() - (1 - t) * random.uniform(0, 22)
    r = random.choice([2.2, 3, 4, 5]) * (0.6 + 0.6 * t)
    col = random.choice(["#e0b073", "#f3d79a", "#c08552", CREAM])
    if random.random() < 0.25:
        A(f'<path d="M {x:.0f} {y:.0f} l {random.uniform(8, 16):.0f} {random.uniform(-10, -3):.0f}" stroke="{col}" stroke-width="3" fill="none"/>')
    else:
        A(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{col}" stroke="{INK}" stroke-width="1"/>')
# the figure: body still open and dotted where it is not yet formed, solid and outlined where it is
A(f'<path d="M 560 716 C 640 690 720 676 800 668" fill="none" stroke="{CREAM}" stroke-width="7" stroke-dasharray="4 16"/>')
A(f'<path d="M 560 716 C 660 730 760 728 800 722" fill="none" stroke="{CREAM}" stroke-width="7" stroke-dasharray="4 16"/>')
A(f'<path d="M 800 668 C 870 660 930 640 968 632 C 992 628 1004 640 998 656 C 988 684 930 700 860 712 C 840 716 820 720 800 722 Z" fill="{CREAM}" stroke="{INK}" stroke-width="5"/>')
A(f'<path d="M 930 668 C 904 700 860 714 812 720" fill="none" stroke="{INK}" stroke-width="4"/>')
A(f'<circle cx="1036" cy="634" r="42" fill="{CREAM}" stroke="{INK}" stroke-width="5"/>')
A(f'<path d="M 994 648 q 12 -16 28 -6" fill="none" stroke="{INK}" stroke-width="4"/>')
A('</g>')
# titles, set like hand lettering: slightly uneven baseline
A('<g filter="url(#rough)">')
A(f'<text x="800" y="74" fill="{CREAM}" font-size="38" font-style="italic" text-anchor="middle">Formed of the dust of the ground</text>')
A('</g>')
A('<text x="800" y="106" fill="#c9c6dc" font-size="15" font-family="Helvetica, Arial, sans-serif" letter-spacing="1.5" text-anchor="middle">STYLE FRAME 2B · HAND-DRAWN MANNER · GENESIS 2:7</text>')
A('<text x="800" y="978" fill="#f1dfc4" font-size="13" font-family="Helvetica, Arial, sans-serif" text-anchor="middle">Same scene as frame 2, redrawn: ink lines, flat colour, hatching and drawn rays in place of smooth glows.</text>')
A(f'<rect width="{W}" height="{H}" filter="url(#paper)"/>')
A('</svg>')
open(__file__.rsplit("/", 1)[0] + "/eden-man-style-frame-2b.svg", "w").write("\n".join(o))
