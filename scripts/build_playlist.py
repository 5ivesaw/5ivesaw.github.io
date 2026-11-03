#!/usr/bin/env python3
"""Build docs/data/playlist.json from a public YouTube playlist.
METADATA ONLY (id, title, author, thumbnail, duration) via `yt-dlp --flat-playlist`.
No media is downloaded; the site streams songs online through the YouTube IFrame player."""
import json, subprocess, sys, datetime
PLAYLIST = sys.argv[1] if len(sys.argv) > 1 else "PLeic_kDFOLY8"
raw = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "--no-warnings",
                      f"https://www.youtube.com/playlist?list={PLAYLIST}"],
                     check=True, capture_output=True, text=True).stdout
d = json.loads(raw)
tracks = []
for e in d.get("entries") or []:
    vid, title = e.get("id"), e.get("title") or ""
    if not vid or title in ("[Private video]", "[Deleted video]"):
        continue
    author = (e.get("channel") or e.get("uploader") or "").removesuffix(" - Topic")
    tracks.append({"id": vid, "t": title, "a": author, "d": e.get("duration") or 0})
out = {"id": PLAYLIST, "title": d.get("title"), "owner": d.get("uploader"),
       "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "tracks": tracks}
json.dump(out, open("docs/data/playlist.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(tracks)} tracks")
