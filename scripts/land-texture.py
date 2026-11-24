"""Makes the picture of a land model that is draped over the globe.

  python3 scripts/land-texture.py dem  <PaleoDEM.csv|.nc> <out.jpg> Scotese and Wright PaleoDEM (CC BY 4.0)
  python3 scripts/land-texture.py zones <figure.png>  <out.jpg>     a four-colour zone map (deep, shallow, lowland, upland)
  python3 scripts/land-texture.py tiles <PaleoDEM.csv> <out-folder> height tiles for 3D relief (Mapbox Terrain-RGB)

Add a picture size as a last argument to "dem" or "zones" (default 4096; 8192 for the sharp desktop copy).

Needs Python 3 with numpy and Pillow. The output is a square picture in the Web Mercator
projection, covering longitude -180..180 and latitude -85.05..85.05, which is what a Mapbox
image source expects.

"dem" uses the real heights and sea depths in the file for colour and shading.
"tiles" writes <out-folder>/{z}/{x}/{y}.png for zoom 0 to 3, with the sea floor set level at 0.
"zones" has no heights to use: the texture inside the uplands is made up so the land reads as
land. Wherever a "zones" picture is shown, the on-screen note must say so.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SIZE = 4096
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


def to_mercator(picture, size=SIZE):
    """Plain latitude-longitude picture (whole globe) -> square Web Mercator picture."""
    h, w, _ = picture.shape
    v = (np.arange(size) + 0.5) / size
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * v))))
    rows = np.clip(((90 - lat) / 180 * h).astype(int), 0, h - 1)
    cols = np.clip(((np.arange(size) + 0.5) / size * w).astype(int), 0, w - 1)
    return picture[rows][:, cols]


def read_fine(path):
    """A PALEOMAP 6-minute netCDF file -> heights in metres, 1801 x 3601, north at the top.

    These files store the grid as one plain block of little-endian 32-bit numbers, so it can be read
    without a netCDF library: the file's header records the block's position just before its size.
    """
    import struct

    data = open(path, "rb").read()
    rows, cols = 1801, 3601
    at = data.find(struct.pack("<Q", rows * cols * 4))
    if at < 8:
        raise SystemExit(f"{path}: could not find a {rows} x {cols} grid of 32-bit numbers")
    start = struct.unpack("<Q", data[at - 8 : at])[0]
    return np.frombuffer(data, "<f4", rows * cols, start).reshape(rows, cols).astype(float)


def load_dem(path):
    """PaleoDEM file -> smooth height field in metres, whole globe, north at the top.

    Reads either the one-degree text files (.csv) or the 6-minute netCDF files (.nc), which are ten
    times finer.
    """
    if path.endswith(".nc"):
        fine = np.clip(read_fine(path)[:, :3600], -6000, 6000)  # drop the repeated last column
        # A light enlargement, so coasts are smooth lines and not single-cell steps.
        return np.asarray(Image.fromarray(fine.astype(np.float32)).resize((7200, 3602), Image.BICUBIC), float)
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
    return np.asarray(mid.resize((2880, 1448), Image.BICUBIC), float)


def ramp(x, stops):
    """Colour for each value of x from a list of (value, (r, g, b)) stops."""
    xs = [v for v, _ in stops]
    return np.stack([np.interp(x, xs, [c[k] for _, c in stops]) for k in range(3)], -1)


SEA_RAMP = [(-6000, (6, 22, 48)), (-3500, (10, 36, 72)), (-1500, (18, 62, 110)), (-400, (34, 104, 156)), (-60, (58, 140, 184)), (0, (84, 160, 192))]
LAND_RAMP = [(0, (104, 138, 84)), (150, (84, 126, 70)), (500, (116, 138, 82)), (1000, (150, 148, 98)), (1800, (172, 156, 120)), (2800, (196, 186, 166)), (4500, (232, 230, 226))]


def fine_grain(shape, seed=11):
    """Made-up small-scale roughness, -1..1, so the land does not look smooth where the data runs out."""
    h, w = shape
    rng = np.random.default_rng(seed)
    out = np.zeros(shape)
    for cell, weight in ((24, 0.4), (10, 0.3), (4, 0.2), (2, 0.1)):
        n = Image.fromarray((rng.random((h // cell + 2, w // cell + 2)) * 255).astype(np.uint8))
        out += weight * (np.asarray(n.resize((w, h), Image.BICUBIC), float) / 127.5 - 1)
    return out


def from_dem(path):
    big = load_dem(path)
    if path.endswith(".nc"):
        # The data has one height every 11 km or so. Below that, a little made-up roughness is added on
        # land (more in the hills, almost none on the plains) so close views are not a smooth blur.
        # It changes the shading only slightly and never moves a coastline.
        rough = fine_grain(big.shape) * smooth(0, 40, big) * (35 + np.clip(big, 0, 3000) * 0.11)
        big = np.where(big > 0, np.maximum(big + rough, 1), big)
    # Light from the north-west, plus a softer second light so slopes facing away are not black.
    gy, gx = np.gradient(big)
    k = big.shape[1] / 2880  # slopes are measured per pixel, so allow for how fine the grid is
    gy, gx = gy * k, gx * k
    shade = np.clip(0.5 - (gx + gy) / 520, 0, 1) * 0.7 + np.clip(0.5 - (gx - gy) / 900, 0, 1) * 0.3
    land = ramp(big, LAND_RAMP) * (0.62 + 0.62 * shade)[..., None]
    sea = ramp(big, SEA_RAMP) * (0.9 + 0.2 * np.clip(0.5 - (gx + gy) / 900, 0, 1))[..., None]
    a = smooth(-25, 25, big)[..., None]
    return np.clip(sea * (1 - a) + land * a, 0, 255).astype(np.uint8)


def write_tiles(path, folder, max_zoom=3):
    import os

    big = np.clip(load_dem(path), 0, None)  # level sea, so only the land stands up
    h, w = big.shape
    px = (np.arange(256) + 0.5) / 256
    for z in range(max_zoom + 1):
        n = 2**z
        for ty in range(n):
            lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (ty + px) / n))))
            fy = np.clip((90 - lat) / 180 * (h - 1), 0, h - 1)
            y0 = np.floor(fy).astype(int)
            y1 = np.minimum(y0 + 1, h - 1)
            wy = (fy - y0)[:, None]
            for tx in range(n):
                fx = ((tx + px) / n * w - 0.5) % w
                x0 = np.floor(fx).astype(int) % w
                x1 = (x0 + 1) % w
                wx = (fx - np.floor(fx))[None, :]
                top = big[y0][:, x0] * (1 - wx) + big[y0][:, x1] * wx
                bottom = big[y1][:, x0] * (1 - wx) + big[y1][:, x1] * wx
                # Rounded to 20 m: far finer than the source data, and it keeps the files small.
                metres = np.round((top * (1 - wy) + bottom * wy) / 20) * 20
                code = np.round((metres + 10000) * 10).astype(np.int64)  # Mapbox Terrain-RGB
                rgb = np.stack([code // 65536, (code // 256) % 256, code % 256], -1).astype(np.uint8)
                os.makedirs(f"{folder}/{z}/{tx}", exist_ok=True)
                Image.fromarray(rgb).save(f"{folder}/{z}/{tx}/{ty}.png", optimize=True)
    print("wrote tiles to", folder)


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
    size = int(sys.argv.pop()) if len(sys.argv) == 5 else SIZE  # optional last argument: picture size
    if len(sys.argv) != 4 or sys.argv[1] not in ("dem", "zones", "tiles"):
        sys.exit(__doc__)
    if sys.argv[1] == "tiles":
        write_tiles(sys.argv[2], sys.argv[3])
        sys.exit(0)
    picture = from_dem(sys.argv[2]) if sys.argv[1] == "dem" else from_zones(sys.argv[2])
    Image.fromarray(to_mercator(picture, size)).save(sys.argv[3], quality=86)
    print("wrote", sys.argv[3])
