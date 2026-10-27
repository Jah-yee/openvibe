"""Screencast frames -> an optimized GIF (one shared palette, no dithering).
Usage: gif.py <frames dir> <out.gif> [--width 1000] [--fps 12] [--cap 2.5] [--hold 2.0]
              [--crop x,y,w,h] [--skip-start s] [--speed 1.0] [--ramp t:speed,...] [--webp out.webp]
--ramp speeds up the recording from t seconds on (e.g. "40:12,95:1"); sped-up frames get a "×12" badge."""
import argparse
import json
import os

from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument("dir")
p.add_argument("out")
p.add_argument("--width", type=int, default=1000)
p.add_argument("--fps", type=float, default=12)
p.add_argument("--cap", type=float, default=2.5, help="longest time one frame stays")
p.add_argument("--hold", type=float, default=2.0, help="time the last frame stays")
p.add_argument("--crop", default=None)
p.add_argument("--skip-start", type=float, default=0.0)
p.add_argument("--speed", type=float, default=1.0)
p.add_argument("--ramp", default="")
p.add_argument("--colors", type=int, default=255)
p.add_argument("--webp", default=None)
a = p.parse_args()

meta = json.load(open(os.path.join(a.dir, "frames.json")))
frames = meta["frames"]
t0 = frames[0]["t"] + a.skip_start
frames = [f for f in frames if f["t"] >= t0] or frames[-1:]
ramp = sorted((float(t), float(s)) for t, s in (part.split(":") for part in a.ramp.split(",") if part))


def speed_at(t):
    speed = a.speed
    for start, s in ramp:
        if t - t0 >= start:
            speed = s
    return speed


kept = []
for f in frames:
    if kept and f["t"] - kept[-1]["t"] < 1 / a.fps:
        continue
    kept.append(f)
times = [f["t"] for f in kept] + [kept[-1]["t"] + a.hold]
speeds = [speed_at(f["t"]) for f in kept]
durations = [min(a.cap, (times[i + 1] - times[i]) / speeds[i]) for i in range(len(kept))]
durations[-1] = a.hold

crop = tuple(int(v) for v in a.crop.split(",")) if a.crop else None
try:
    badge_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 18)
except OSError:
    badge_font = ImageFont.load_default()


def badge(im, speed):
    """A "▶▶ ×12" pill in the top-right corner, for the sped-up parts."""
    draw = ImageDraw.Draw(im)
    text = f"\u25b6\u25b6 \u00d7{speed:g}"
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=badge_font)
    w, h = x1 - x0 + 24, y1 - y0 + 14
    x, y = im.width - w - 14, 52
    draw.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=(217, 119, 87))
    draw.text((x + 12 - x0, y + 7 - y0), text, font=badge_font, fill=(31, 30, 29))
    return im


def load(f, speed):
    im = Image.open(os.path.join(a.dir, f["file"])).convert("RGB")
    if crop:
        x, y, w, h = crop
        im = im.crop((x, y, x + w, y + h))
    if a.width and im.width != a.width:
        im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
    return badge(im, speed) if speed > 1.5 else im


images = [load(f, s) for f, s in zip(kept, speeds)]
# One palette for every frame: sampled across the whole recording.
step = max(1, len(images) // 12)
sample = images[::step][:12]
w, h = sample[0].size
sheet = Image.new("RGB", (w, h * len(sample)))
for i, im in enumerate(sample):
    sheet.paste(im, (0, h * i))
palette = sheet.quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
indexed = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in images]

ms = [max(20, round(d * 100) * 10) for d in durations]
indexed[0].save(a.out, save_all=True, append_images=indexed[1:], duration=ms, loop=0, optimize=True, disposal=1)
print(a.out, f"{len(indexed)} frames, {sum(ms) / 1000:.1f}s, {os.path.getsize(a.out) / 1e6:.2f} MB, {images[0].size}")
if a.webp:
    images[0].save(a.webp, save_all=True, append_images=images[1:], duration=ms, loop=0, quality=82, method=6)
    print(a.webp, f"{os.path.getsize(a.webp) / 1e6:.2f} MB")
