// 5IVESAW Virtual Unix Shell & Cyber Terminal — by 5IVESAW
// Authentic retro CRT terminal emulator with interactive CLI, sound effects, and repository tools.
import {
  $, $$, icon, download, copyText, toast, onThemeChange
} from '../core/util.js';
import { sfx } from '../core/sfx.js';
import { music } from '../core/music.js';

export default {
  mount(root, api) {
    const style = document.createElement('style');
    style.id = 'demo-terminal-style';
    style.textContent = `
      .tm-wrap { display: flex; flex-direction: column; gap: 16px; }
      .tm-screen { width: 100%; height: 480px; background: #080A0D; border-radius: var(--r); border: 1px solid var(--line); overflow-y: auto; padding: 16px; font-family: var(--font-mono); font-size: 13px; color: #22C55E; line-height: 1.5; box-shadow: inset 0 0 20px rgba(0,0,0,0.6); display: flex; flex-direction: column; }
      .tm-amber { color: #FFB300 !important; }
      .tm-cyan { color: #00E5FF !important; }
      .tm-white { color: #F3F4F6 !important; }
      .tm-input-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
      .tm-prompt { color: var(--accent); font-weight: 700; white-space: nowrap; flex-shrink: 0; }
      .tm-input { flex: 1; background: transparent; border: none; outline: none; font-family: var(--font-mono); font-size: 13px; color: inherit; caret-color: currentColor; }
    `;
    document.head.appendChild(style);

    const history = [];
    let historyIdx = -1;

    root.innerHTML = `
      <div class="tl tm-wrap">
        <div class="row between wrap">
          <div>
            <div class="row" style="gap:8px;">
              <span class="badge" style="background:#22C55E;color:#000;font-weight:700;">UNIX EMULATOR</span>
              <span class="eyebrow">OSTANIA OS SHELL // CLI</span>
            </div>
            <h2 class="serif" style="font-size:28px;margin-top:4px;">5IVESAW Virtual Unix Shell</h2>
            <p class="faint sm mono">Authentic interactive CRT terminal emulator with command line tools, telemetry, and system audio.</p>
          </div>
          <div class="row">
            <a href="https://github.com/5ivesaw" target="_blank" rel="noopener noreferrer" class="btn sm ghost">
              ${icon('github')} @5ivesaw Repos ↗
            </a>
          </div>
        </div>

        <div class="card pad" style="padding:16px;">
          <!-- CRT Terminal Window -->
          <div id="tmTerminalScreen" class="tm-screen">
            <div id="tmOutputArea">
              <div class="tm-white" style="margin-bottom:8px;">
╔═══════════════════════════════════════════════════════════════╗
║  5IVESAW NEURAL_OS v4.19.0-ostania-x86_64                     ║
║  Type 'help' to inspect command directory.                    ║
╚═══════════════════════════════════════════════════════════════╝
              </div>
            </div>
            <div class="tm-input-row">
              <span class="tm-prompt">5ivesaw@ostania:~$</span>
              <input type="text" id="tmCmdInput" class="tm-input" autocomplete="off" spellcheck="false" autofocus />
            </div>
          </div>
        </div>
      </div>
    `;

    const screen = $('#tmTerminalScreen', root);
    const output = $('#tmOutputArea', root);
    const input = $('#tmCmdInput', root);

    function print(text, cls = '') {
      const line = document.createElement('div');
      line.className = cls;
      line.style.whiteSpace = 'pre-wrap';
      line.textContent = text;
      output.appendChild(line);
      screen.scrollTop = screen.scrollHeight;
    }

    function execute(cmdStr) {
      const trimmed = cmdStr.trim();
      if (!trimmed) return;

      history.push(trimmed);
      historyIdx = history.length;

      print(`5ivesaw@ostania:~$ ${trimmed}`, 'tm-white');
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      sfx('tick');

      switch (cmd) {
        case 'help':
        case '?':
          print(`AVAILABLE COMMANDS:
  help               Show this directory
  neofetch           System telemetry banner
  whoami             Display user and node identity
  ls                 List workspaces and repos
  cat <name>         Read repository information
  theme <name>       Switch palette (latte/cream/readme/chainsaw/ostania/cyber)
  music <cmd>        Control radio (play, pause, next, prev)
  cowsay <text>      Speaking ASCII bovine
  matrix             Run falling code pulse
  clear              Clear CRT display
  easteregg          Trigger secret retro payload`);
          break;

        case 'whoami':
        case 'id':
          print(`uid=1000(5ivesaw) gid=1000(5ivesaw) groups=1000(5ivesaw),4(adm),27(sudo)
Node: Ostania Neutral Gateway Node
Aliases: 5IVESAW / FIVESAW (5 ≡ S)
Discord: @fivesaw · GitHub: github.com/5ivesaw · YouTube: @5ivesaw`);
          break;

        case 'neofetch':
          print(`       .---.          5ivesaw@ostania
      /     \\         ---------------
     | () () |        OS: 5IVESAW Ostania Kernel 6.11
      \\  -  /         Host: GitHub Pages Static CDN
       \`---\`          Uptime: 296 Tracks In Stream
      /|   |\\         Shell: zsh / 5tube CLI
     /_|___|_\\        Terminal: WebGL Phosphor CRT
                      Memory: Client-side RAM Only
                      Identity: 5 stands for S`);
          break;

        case 'ls':
        case 'dir':
          print(`Sawbyte/              fivesawUtils/         Ascii-Media-Player/
a-apple-that-is-bad/  my-room/              ink-game/
5Tube/                ImageStudio/          AudioCutter/
README.md             playlist.json         repos.json`);
          break;

        case 'cat':
          if (!args.length) print('Usage: cat <filename>');
          else if (args[0].toLowerCase().includes('readme')) {
            print(`5IVESAW — Multi-disciplinary software developer & creative technologist.
Rust · TypeScript · Python · Lua · Java.
Official site: https://5ivesaw.github.io/`);
          } else {
            print(`cat: ${args[0]}: No such file or directory`);
          }
          break;

        case 'theme':
          if (!args.length) print('Usage: theme <latte|cream|readme|chainsaw|ostania|cyber>');
          else {
            const t = args[0].toLowerCase();
            const btn = document.querySelector(`button[data-set-tone="${t}"]`);
            if (btn) {
              btn.click();
              print(`Theme set to ${t.toUpperCase()}!`);
            } else {
              print(`Unknown theme '${t}'. Available: latte, cream, readme, chainsaw, ostania, cyber`);
            }
          }
          break;

        case 'music':
          const sub = args[0]?.toLowerCase();
          if (sub === 'play') { music.play(); print('Radio stream resumed.'); }
          else if (sub === 'pause') { music.pause(); print('Radio stream paused.'); }
          else if (sub === 'next') { music.next(); print('Skipped to next transmission.'); }
          else if (sub === 'prev') { music.prev(); print('Rewound to previous transmission.'); }
          else print('Usage: music <play|pause|next|prev>');
          break;

        case 'clear':
        case 'cls':
          output.innerHTML = '';
          break;

        case 'cowsay':
          const msg = args.join(' ') || '5 stands in for S!';
          const bar = '-'.repeat(msg.length + 2);
          print(`
  ${bar}
< ${msg} >
  ${bar}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`);
          break;

        case 'matrix':
          print('Entering Matrix stream...');
          location.hash = '#/demos/matrix-rain';
          break;

        case 'easteregg':
          print(`
   _____ _____ _    _ ______  _____  ______       __
  | ____|_   _| |  | |  ____|/ ____|/ __ \\ \\    / /
  | |__   | | | |  | | |__  | (___ | |  | \\ \\  / / 
  |___ \\  | | \\ \\  / /  __|  \\___ \\| |  | |\\ \\/ /  
   ___) |_| |_ \\ \\/ /| |____ ____) | |__| | \\  /   
  |____/|_____| \\__/ |______|_____/ \\____/   \\/    
  ⚡ Chainsaw Man Ripcord Pulled!`);
          sfx('pulse');
          break;

        default:
          print(`zsh: command not found: ${cmd}. Type 'help' for available commands.`);
      }
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        execute(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        if (history.length > 0 && historyIdx > 0) {
          historyIdx--;
          input.value = history[historyIdx];
        }
      } else if (e.key === 'ArrowDown') {
        if (historyIdx < history.length - 1) {
          historyIdx++;
          input.value = history[historyIdx];
        } else {
          historyIdx = history.length;
          input.value = '';
        }
      }
    });

    screen.addEventListener('click', () => {
      input.focus();
    });

    return () => {
      const s = document.getElementById('demo-terminal-style');
      if (s) s.remove();
    };
  }
};
