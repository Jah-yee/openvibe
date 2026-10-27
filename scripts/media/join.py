"""Joins two recordings into one frames dir: the first up to `cut` (UTC HH:MM:SS),
timed by file mtime when it has no frames.json, then the second right after.
Usage: join.py <first dir> <cut> <second dir> <out dir>"""
import datetime
import json
import os
import shutil
import sys

first, cut, second, out = sys.argv[1:5]
day = datetime.datetime.now(datetime.timezone.utc).date()
h, m, s = (int(v) for v in cut.split(":"))
cut_t = datetime.datetime(day.year, day.month, day.day, h, m, s, tzinfo=datetime.timezone.utc).timestamp()


def frames_of(d):
    meta = os.path.join(d, "frames.json")
    if os.path.exists(meta):
        return json.load(open(meta))["frames"]
    files = sorted(f for f in os.listdir(d) if f.endswith((".jpg", ".png")))
    return [{"file": f, "t": os.path.getmtime(os.path.join(d, f))} for f in files]


shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)
a = [f for f in frames_of(first) if f["t"] <= cut_t]
b = frames_of(second)
shift = (a[-1]["t"] + 0.3) - b[0]["t"]
joined = []
for src, frames, dt in ((first, a, 0.0), (second, b, shift)):
    for f in frames:
        name = f"f{len(joined):05d}{os.path.splitext(f['file'])[1]}"
        shutil.copy(os.path.join(src, f["file"]), os.path.join(out, name))
        joined.append({"file": name, "t": f["t"] + dt})
json.dump({"frames": joined, "end": joined[-1]["t"], "seam": a[-1]["t"] - joined[0]["t"]}, open(os.path.join(out, "frames.json"), "w"))
print(len(a), "+", len(b), "frames; seam at", round(a[-1]["t"] - joined[0]["t"], 1), "s")
