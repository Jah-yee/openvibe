"""Contact sheet of a GIF: n frames spread over its length. sheet.py <gif> <out.png> [n] [cols]"""
import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1:3]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 9
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
im = Image.open(src)
total = im.n_frames
picks = [round(i * (total - 1) / (n - 1)) for i in range(n)]
thumbs = []
t = 0
times = []
for i in range(total):
    im.seek(i)
    if i in picks:
        thumbs.append((im.convert("RGB").copy(), t))
    t += im.info.get("duration", 0)
w, h = thumbs[0][0].size
s = 0.5
tw, th = int(w * s), int(h * s)
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "white")
for k, (fr, ms) in enumerate(thumbs):
    sheet.paste(fr.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
    ImageDraw.Draw(sheet).text(((k % cols) * tw + 6, (k // cols) * th + 4), f"{ms/1000:.1f}s", fill="yellow")
sheet.save(out)
print(total, "frames")
