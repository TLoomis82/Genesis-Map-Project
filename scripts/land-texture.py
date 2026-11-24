"""Makes the picture of a land model that is draped over the globe.

  python3 scripts/land-texture.py dem  <PaleoDEM.csv> <out.jpg>     Scotese and Wright PaleoDEM (CC BY 4.0)
  python3 scripts/land-texture.py zones <figure.png>  <out.jpg>     a four-colour zone map (deep, shallow, lowland, upland)

Needs Python 3 with numpy and Pillow. The output is a square picture in the Web Mercator
projection, covering longitude -180..180 and latitude -85.05..85.05, which is what a Mapbox
image source expects.

"dem" uses the real heights in the file for colour and shading.
"zones" has no heights to use: the texture inside the uplands is made up so the land reads as
land. Wherever a "zones" picture is shown, the on-screen note must say so.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SIZE = 2048
DEEP, SHALLOW = np.array([12, 42, 78.0]), np.array([52, 138, 190.0])
LOW, UP, PEAK = np.array([78, 122, 72.0]), np.array([150, 160, 104.0]), np.array([205, 196, 172.0])


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def paint(shelf, land, up, height):
    """shelf, land, up: 0..1 fields. height: 0..1, used for peaks and shading."""
    gy, gx = np.gradient(height)
    shade = np.clip(0.5 - (gx + gy) * 14 * (height.shape[1] / 2325), 0, 1)
    sea = DEEP + (SHALLOW - DEEP) * smooth(0.25, 0.75, shelf)[..., None]
    ground = LOW + (UP - LOW) * smooth(0.3, 0.7, up)[..., None]
    ground = ground + (PEAK - ground) * smooth(0.75, 1.0, height)[..., None]
    ground = ground * (0.72 + 0.5 * shade)[..., None]
    a = smooth(0.45, 0.55, land)[..., None]
    return np.clip(sea * (1 - a) + ground * a, 0, 255).astype(np.uint8)


def to_mercator(picture):
    """Plain latitude-longitude picture (whole globe) -> square Web Mercator picture."""
    h, w, _ = picture.shape
    v = (np.arange(SIZE) + 0.5) / SIZE
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * v))))
    rows = np.clip(((90 - lat) / 180 * h).astype(int), 0, h - 1)
    cols = np.clip(((np.arange(SIZE) + 0.5) / SIZE * w).astype(int), 0, w - 1)
    return picture[rows][:, cols]


def from_dem(path):
    grid = np.full((181, 360), -4000.0)
    for line in open(path, newline="").read().replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        parts = line.replace(",", " ").split()
        try:
            lon, lat, elev = float(parts[0]), float(parts[1]), float(parts[2])
        except (ValueError, IndexError):
            continue  # header or blank
        grid[int(round(90 - lat)), int(round(lon + 180)) % 360] = elev
    grid = np.clip(grid, -6000, 6000)  # a few corner points in the files hold stray values
    # Enlarge in two steps so the one-degree grid becomes smooth slopes, not blocks.
    mid = Image.fromarray(grid.astype(np.float32)).resize((720, 362), Image.BICUBIC)
    big = np.asarray(mid.resize((2880, 1448), Image.BICUBIC), float)
    shelf = smooth(-1500, -150, big)
    land = smooth(-60, 60, big)
    up = smooth(300, 1100, big)
    height = np.clip(big / 3200, 0, 1)
    return paint(shelf, land, up, height)


def from_zones(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(int)
    h, w, _ = im.shape
    ref = np.array([[5, 55, 150], [5, 165, 245], [30, 122, 50], [55, 195, 66]])  # deep, shallow, lowland, upland
    d = ((im[:, :, None, :] - ref[None, None, :, :]) ** 2).sum(-1)
    cls, ok = d.argmin(-1), d.min(-1) < 45**2
    # The figure's legend box sits over deep sea.
    y0, y1, x0, x1 = int(h * 0.41), int(h * 0.59), int(w * 0.17), int(w * 0.32)
    cls[y0:y1, x0:x1], ok[y0:y1, x0:x1] = 0, True

    def field(mask):  # blurred share of counted pixels; drawn lines are filled in by the blur
        a = Image.fromarray((mask & ok).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(5))
        b = Image.fromarray(ok.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(5))
        return np.asarray(a, float) / np.maximum(np.asarray(b, float), 1)

    shelf, land, up = field(cls >= 1), field(cls >= 2), field(cls >= 3)
    rng = np.random.default_rng(7)

    def noise(scale):
        n = Image.fromarray((rng.random((h // scale + 2, w // scale + 2)) * 255).astype(np.uint8))
        return np.asarray(n.resize((w, h), Image.BICUBIC), float) / 255

    made_up = 0.5 * noise(48) + 0.3 * noise(20) + 0.2 * noise(8)  # illustrative only
    height = land * (0.25 + 0.5 * up + 0.35 * made_up * (0.4 + up))
    return paint(shelf, land, up, height / height.max())


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("dem", "zones"):
        sys.exit(__doc__)
    picture = from_dem(sys.argv[2]) if sys.argv[1] == "dem" else from_zones(sys.argv[2])
    Image.fromarray(to_mercator(picture)).save(sys.argv[3], quality=88)
    print("wrote", sys.argv[3])
