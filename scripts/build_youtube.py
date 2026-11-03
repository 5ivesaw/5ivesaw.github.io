#!/usr/bin/env python3
"""Build docs/data/youtube.json: @5ivesaw uploads + shorts METADATA via `yt-dlp --flat-playlist`.
Nothing is downloaded; videos are watched through the embedded YouTube player."""
import json, subprocess, datetime
def flat(url, n=24):
    try:
        out = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "--no-warnings", "--playlist-end", str(n), url],
                             check=True, capture_output=True, text=True, timeout=180).stdout
        return json.loads(out).get("entries") or []
    except Exception as e:
        print("warn", url, e); return []
items = []
for kind, url in (("video", "https://www.youtube.com/@5ivesaw/videos"), ("short", "https://www.youtube.com/@5ivesaw/shorts"), ("live", "https://www.youtube.com/@5ivesaw/streams")):
    for e in flat(url):
        if not e.get("id"): continue
        items.append({"id": e["id"], "t": e.get("title") or "", "k": kind, "d": e.get("duration") or 0,
                      "v": e.get("view_count"), "live": e.get("live_status") == "is_live"})
json.dump({"channel": "@5ivesaw", "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "items": items},
          open("docs/data/youtube.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(items), "items")
