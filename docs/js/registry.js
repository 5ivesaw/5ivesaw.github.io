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
import fluidSimDemo from './demos/fluid-sim.js';
import audioVis3dDemo from './demos/audio-visualizer-3d.js';
import particleGalaxyDemo from './demos/particle-galaxy.js';
import voxelSandboxDemo from './demos/voxel-sandbox.js';
import webcamFaceMeshDemo from './demos/webcam-face-mesh.js';
import chiptuneTrackerDemo from './demos/chiptune-tracker.js';
import gameOfLifeDemo from './demos/game-of-life.js';
import rayMarchingDemo from './demos/ray-marching.js';
import sortingVisualizerDemo from './demos/sorting-visualizer.js';
import terminalOsDemo from './demos/terminal-os.js';

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
    tags: ['algorithms', 'simulation', 'pathfinder'],
    runner: pathfinderDemo
  },
  {
    id: 'ascii-player',
    repo: 'Ascii-Media-Player',
    title: 'ASCII Media Player',
    blurb: 'Drop in a local audio file or use your mic and watch it play back as a live ASCII terminal spectrum.',
    icon: 'audio',
    tags: ['audio', 'ascii', 'spectrum'],
    runner: asciiPlayerDemo
  },
  {
    id: 'bad-apple',
    repo: 'a-apple-that-is-bad',
    title: 'Cursed Text Renderer',
    blurb: 'Turns webcam or video into FiveSaw-flavoured cursed text art in real time.',
    icon: 'cam',
    tags: ['webcam', 'vision', 'ascii'],
    runner: badAppleDemo
  },
  {
    id: 'matrix-rain',
    repo: 'matrix-neural-cam',
    title: 'Matrix Digital Rain',
    blurb: 'Downsamples webcam or procedural depth into dripping cyberpunk matrix code and neural ripples.',
    icon: 'cam',
    tags: ['webcam', 'vision', 'matrix'],
    runner: matrixRainDemo
  },
  {
    id: 'audio-synth',
    repo: 'cyber-oscilloscope',
    title: 'Cyber Synth & Oscilloscope',
    blurb: 'Interactive touch Theremin synthesizer with real-time vector CRT Lissajous beam & mic analyzer.',
    icon: 'audio',
    tags: ['audio', 'synth', 'oscilloscope'],
    runner: audioSynthDemo
  },
  {
    id: 'fluid-sim',
    repo: 'fluid-dynamics-lab',
    title: 'Chroma Fluid & Smoke Dynamics',
    blurb: 'Real-time Navier-Stokes fluid grid solver with multi-touch velocity advection & music beat bursts.',
    icon: 'sparkle',
    tags: ['physics', 'fluid', 'simulation'],
    runner: fluidSimDemo
  },
  {
    id: 'audio-visualizer-3d',
    repo: 'synthwave-3d-mountain',
    title: 'Neon 3D Audio Mountain',
    blurb: 'Perspective 3D terrain grid deformed in real time by music telemetry & audio harmonics.',
    icon: 'audio',
    tags: ['audio', '3d', 'synthwave'],
    runner: audioVis3dDemo
  },
  {
    id: 'particle-galaxy',
    repo: 'nbody-gravity-galaxy',
    title: 'N-Body Particle Galaxy',
    blurb: '3,600 orbital star particles subject to multi-body gravitational mechanics and relativistic warp.',
    icon: 'sparkle',
    tags: ['physics', 'particles', 'space'],
    runner: particleGalaxyDemo
  },
  {
    id: 'voxel-sandbox',
    repo: 'Sawbyte',
    title: 'Sawbyte Micro-Voxel 3D Engine',
    blurb: 'Minecraft-style procedural voxel chunk with block placing, breaking, and daylight cycle.',
    icon: 'play2',
    tags: ['3d', 'minecraft', 'voxel'],
    runner: voxelSandboxDemo
  },
  {
    id: 'webcam-face-mesh',
    repo: 'neural-hud-optics',
    title: 'Cyberpunk HUD Face Tracker',
    blurb: 'Real-time facial feature tracking with tactical HUD visor, reticles, and cyber telemetry.',
    icon: 'cam',
    tags: ['webcam', 'vision', 'hud'],
    runner: webcamFaceMeshDemo
  },
  {
    id: 'chiptune-tracker',
    repo: 'ostania-8bit-sequencer',
    title: 'Ostania 8-Bit Step Sequencer',
    blurb: '16-step matrix drum machine & chiptune synth with square wave voice synthesis and presets.',
    icon: 'audio',
    tags: ['audio', 'chiptune', 'sequencer'],
    runner: chiptuneTrackerDemo
  },
  {
    id: 'game-of-life',
    repo: 'quantum-cellular-automata',
    title: 'Quantum Cellular Automata Lab',
    blurb: 'Conway game of life with phosphor age-decay trails, macro presets & cosmic ray mutations.',
    icon: 'pointer',
    tags: ['simulation', 'automata', 'math'],
    runner: gameOfLifeDemo
  },
  {
    id: 'ray-marching',
    repo: 'glsl-raymarcher-fractal',
    title: 'Procedural 3D Fractal Raymarcher',
    blurb: 'Real-time GLSL distance estimators for Julia fractals, infinite gyroids, and specular shading.',
    icon: 'sparkle',
    tags: ['shaders', 'webgl', 'fractal'],
    runner: rayMarchingDemo
  },
  {
    id: 'sorting-visualizer',
    repo: 'sorting-harmonics-engine',
    title: 'Audio Sorting Algorithm Engine',
    blurb: 'Visual and auditory representation of algorithm complexity with WebAudio tone synthesis.',
    icon: 'pointer',
    tags: ['algorithms', 'audio', 'sorting'],
    runner: sortingVisualizerDemo
  },
  {
    id: 'terminal-os',
    repo: '5ivesaw-unix-shell',
    title: '5IVESAW Virtual Unix Shell',
    blurb: 'Authentic interactive CRT terminal emulator with command line tools, telemetry, and system audio.',
    icon: 'text',
    tags: ['terminal', 'cli', 'unix'],
    runner: terminalOsDemo
  }
];
