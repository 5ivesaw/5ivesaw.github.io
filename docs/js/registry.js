// Registry of in-site tools and demos.
// Exactly 3 curated flagship repository demos as requested:
// 1. A* Pathfinder (fivesawUtils)
// 2. ASCII Media Player (Ascii-Media-Player)
// 3. Cursed Text Renderer (a-apple-that-is-bad)

export const TOOLS = [
  { id: 'image', title: 'Image Studio', blurb: 'Convert, resize, crop, rotate & filter images. Batch export to PNG, JPEG, WebP or AVIF.', icon: 'image', tags: ['convert', 'crop', 'resize', 'filters', 'batch'], module: './tools/image.js' },
  { id: 'audio', title: 'Audio Cutter', blurb: 'Waveform editor. Trim, fade, normalise, change speed, then export WAV, MP3 or WebM.', icon: 'audio', tags: ['cut', 'trim', 'fade', 'convert'], module: './tools/audio.js' },
  { id: 'video', title: 'Video Cutter', blurb: 'Trim, crop, mute and convert video to WebM or audio extract, all inside your browser.', icon: 'video', tags: ['cut', 'convert', 'audio'], module: './tools/video.js' },
  { id: 'dev', title: 'Dev Toolkit', blurb: 'JSON, Base64, URL, hashes, UUIDs, timestamps, colours & text case. The everyday stuff.', icon: 'text', tags: ['json', 'base64', 'hash', 'color'], module: './tools/dev.js' },
];

export const DEMOS = [
  { id: 'pathfinder', repo: 'fivesawUtils', title: 'A* Pathfinder', blurb: 'The fivesawUtils A* idea on a 2D grid: paint walls, drag endpoints, and watch it search with humanized spline smoothing.', icon: 'pointer', module: './demos/pathfinder.js' },
  { id: 'ascii-player', repo: 'Ascii-Media-Player', title: 'ASCII Media Player', blurb: 'Drop in a local audio file or use your mic and watch it play back as a live ASCII terminal spectrum.', icon: 'audio', module: './demos/ascii-player.js' },
  { id: 'bad-apple', repo: 'a-apple-that-is-bad', title: 'Cursed Text Renderer', blurb: 'Turns webcam or video into FiveSaw-flavoured cursed text art in real time.', icon: 'cam', module: './demos/bad-apple.js' },
];
