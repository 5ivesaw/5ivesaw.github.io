// 5IVESAW — Tools & Demos Registry.
// Direct static linking guarantees instant, zero-latency mounting on all devices.
import imageStudio from './tools/image.js';
import audioCutter from './tools/audio.js';
import videoCutter from './tools/video.js';
import devToolkit from './tools/dev.js';

import pathfinderDemo from './demos/pathfinder.js';
import asciiPlayerDemo from './demos/ascii-player.js';
import badAppleDemo from './demos/bad-apple.js';
import matrixRainDemo from './demos/matrix-rain.js';
import audioSynthDemo from './demos/audio-synth.js';

export const TOOLS = [
  {
    id: 'image',
    title: 'Image Studio',
    blurb: 'Convert, resize, crop, rotate & filter images. Batch export to PNG, JPEG, WebP or AVIF.',
    icon: 'image',
    tags: ['convert', 'crop', 'resize', 'filters', 'batch'],
    runner: imageStudio
  },
  {
    id: 'audio',
    title: 'Audio Cutter',
    blurb: 'Waveform editor. Trim, fade, normalise, change speed, then export WAV, MP3 or WebM.',
    icon: 'audio',
    tags: ['cut', 'trim', 'fade', 'convert'],
    runner: audioCutter
  },
  {
    id: 'video',
    title: 'Video Cutter',
    blurb: 'Trim, crop, mute and convert video to WebM or audio extract, all inside your browser.',
    icon: 'video',
    tags: ['cut', 'convert', 'audio'],
    runner: videoCutter
  },
  {
    id: 'dev',
    title: 'Dev Toolkit',
    blurb: 'JSON, Base64, URL, hashes, UUIDs, timestamps, colours & text case. The everyday stuff.',
    icon: 'text',
    tags: ['json', 'base64', 'hash', 'color'],
    runner: devToolkit
  }
];

export const DEMOS = [
  {
    id: 'pathfinder',
    repo: 'fivesawUtils',
    title: 'A* Pathfinder',
    blurb: 'The fivesawUtils A* idea on a 2D grid: paint walls, drag endpoints, and watch it search with humanized spline smoothing.',
    icon: 'pointer',
    runner: pathfinderDemo
  },
  {
    id: 'ascii-player',
    repo: 'Ascii-Media-Player',
    title: 'ASCII Media Player',
    blurb: 'Drop in a local audio file or use your mic and watch it play back as a live ASCII terminal spectrum.',
    icon: 'audio',
    runner: asciiPlayerDemo
  },
  {
    id: 'bad-apple',
    repo: 'a-apple-that-is-bad',
    title: 'Cursed Text Renderer',
    blurb: 'Turns webcam or video into FiveSaw-flavoured cursed text art in real time.',
    icon: 'cam',
    runner: badAppleDemo
  },
  {
    id: 'matrix-rain',
    repo: 'matrix-neural-cam',
    title: 'Matrix Digital Rain',
    blurb: 'Downsamples webcam or procedural depth into dripping cyberpunk matrix code and neural ripples.',
    icon: 'cam',
    runner: matrixRainDemo
  },
  {
    id: 'audio-synth',
    repo: 'cyber-oscilloscope',
    title: 'Cyber Synth & Oscilloscope',
    blurb: 'Interactive touch Theremin synthesizer with real-time vector CRT Lissajous beam & mic analyzer.',
    icon: 'audio',
    runner: audioSynthDemo
  }
];
