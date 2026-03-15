// =============================================================================
// interactive.js — Portfolio interactive layer
// Shantanu Parab | Robotics & ML Engineer
// =============================================================================
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Custom Cursor (desktop only) ──────────────────────────────────────────
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (!isTouch) {
    const dot  = document.createElement('div'); dot.className  = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = -200, my = -200, rx = -200, ry = -200;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });

    (function trackRing() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(trackRing);
    })();

    const HOVER_SEL = 'a,button,.project-card,.blog-card,.skill-card,.contact-item,.worktag,.tag-list li,.resume-button,#terminal-toggle,#scroll-top-btn';
    document.addEventListener('mouseover', e => { if (e.target.closest(HOVER_SEL)) ring.classList.add('hover'); });
    document.addEventListener('mouseout',  e => { if (e.target.closest(HOVER_SEL)) ring.classList.remove('hover'); });
  }

  // ── Neural Network Canvas (hero background) ───────────────────────────────
  const aboutSection = document.getElementById('about');
  if (aboutSection) {
    const canvas = document.createElement('canvas');
    canvas.id = 'neural-canvas';
    aboutSection.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width  = aboutSection.offsetWidth;
      canvas.height = aboutSection.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const NODE_COUNT = 60;
    let mouse = { x: -9999, y: -9999 };

    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * (aboutSection.offsetWidth  || 800),
      y:  Math.random() * (aboutSection.offsetHeight || 600),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r:  Math.random() * 1.5 + 1,
      phase: Math.random() * Math.PI * 2,
    }));

    aboutSection.addEventListener('mousemove', e => {
      const r = aboutSection.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    aboutSection.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    const CONNECT = 145, MOUSE_R = 185;

    function drawNetwork() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() * 0.001;

      nodes.forEach(n => {
        // Mouse repulsion
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 130 && d > 0) { n.vx += (dx / d) * 0.28; n.vy += (dy / d) * 0.28; }

        // Speed clamp
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > 1.5) { n.vx *= 1.5 / spd; n.vy *= 1.5 / spd; }

        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  { n.vx *= -1; n.x = Math.max(0, Math.min(canvas.width, n.x)); }
        if (n.y < 0 || n.y > canvas.height) { n.vy *= -1; n.y = Math.max(0, Math.min(canvas.height, n.y)); }
        n.phase += 0.014;
      });

      // Connections between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < CONNECT) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0,255,255,${(1 - d / CONNECT) * 0.45})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
        // Connection to mouse — neon pink
        const dm = Math.hypot(nodes[i].x - mouse.x, nodes[i].y - mouse.y);
        if (dm < MOUSE_R) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(255,105,180,${(1 - dm / MOUSE_R) * 0.85})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      // Nodes — pulsing cyan dots
      nodes.forEach(n => {
        const glow = Math.sin(n.phase + t) * 0.28 + 0.72;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,255,${0.5 + glow * 0.35})`;
        ctx.fill();
      });

      // Mouse node — pink dot
      if (mouse.x > -100) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,105,180,0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,105,180,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      requestAnimationFrame(drawNetwork);
    }
    drawNetwork();
  }

  // ── 3D Card Tilt ──────────────────────────────────────────────────────────
  const TILT_SEL = '.project-card,.blog-card,.skill-card';

  document.addEventListener('mousemove', e => {
    const card = e.target.closest(TILT_SEL);
    if (!card) return;
    const r  = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    card.style.transform = `perspective(900px) rotateX(${-dy * 9}deg) rotateY(${dx * 13}deg) translateZ(6px)`;
    card.style.setProperty('--shine-x', ((e.clientX - r.left) / r.width  * 100) + '%');
    card.style.setProperty('--shine-y', ((e.clientY - r.top)  / r.height * 100) + '%');
  });

  document.addEventListener('mouseover', e => {
    const card = e.target.closest(TILT_SEL);
    if (!card) return;
    card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.5s ease';
    if (!card.querySelector('.tilt-shine')) {
      const s = document.createElement('div');
      s.className = 'tilt-shine';
      card.appendChild(s);
    }
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest(TILT_SEL);
    if (!card || card.contains(e.relatedTarget)) return;
    card.style.transform = '';
    card.style.transition = '';
  });

  // ── Click Ripple ──────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:34px;height:34px;border:1.5px solid rgba(0,255,255,0.6);box-shadow:0 0 8px rgba(0,255,255,0.2);`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 620);
  });

  // ── Scroll-to-top Button ──────────────────────────────────────────────────
  const scrollTopBtn = document.createElement('button');
  scrollTopBtn.id    = 'scroll-top-btn';
  scrollTopBtn.title = 'Back to top';
  scrollTopBtn.textContent = '↑';
  document.body.appendChild(scrollTopBtn);

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ── Section Scan Line ─────────────────────────────────────────────────────
  const scanObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.scanned) {
        entry.target.dataset.scanned = '1';
        entry.target.classList.add('section-scan', 'scanning');
        setTimeout(() => entry.target.classList.remove('scanning'), 1200);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('section').forEach(s => scanObs.observe(s));

  // ── Heading data-text (for CSS glitch hover) ──────────────────────────────
  document.querySelectorAll('section h2').forEach(h => { h.dataset.text = h.textContent.trim(); });

  // ── Terminal Widget ───────────────────────────────────────────────────────
  const terminal = document.createElement('div');
  terminal.id = 'terminal-widget';
  terminal.innerHTML = `
    <div class="terminal-titlebar">
      <div class="terminal-dots">
        <span class="dot-red"   title="Close"></span>
        <span class="dot-yellow" title="Clear"></span>
        <span class="dot-green"  title="Minimize"></span>
      </div>
      <span class="terminal-titlebar-text">shantanu@portfolio:~</span>
      <span></span>
    </div>
    <div class="terminal-output" id="terminal-output"></div>
    <div class="terminal-input-row">
      <span class="terminal-prompt-sym">$</span>
      <input type="text" id="terminal-input-el" placeholder="type 'help'" autocomplete="off" spellcheck="false" />
    </div>`;

  const toggleBtn = document.createElement('button');
  toggleBtn.id    = 'terminal-toggle';
  toggleBtn.title = 'Open terminal';
  toggleBtn.innerHTML = '<i class="fas fa-terminal"></i>';

  document.body.appendChild(terminal);
  document.body.appendChild(toggleBtn);

  const termOut   = $('terminal-output');
  const termInput = $('terminal-input-el');
  let termOpen    = false;
  let isTraining  = false;
  const history   = [];
  let histIdx     = -1;

  function toggleTerminal() {
    termOpen = !termOpen;
    terminal.classList.toggle('open', termOpen);
    if (termOpen) {
      termInput.focus();
      if (termOut.children.length === 0) printWelcome();
    }
  }

  toggleBtn.addEventListener('click', toggleTerminal);
  terminal.querySelector('.dot-red').addEventListener('click', toggleTerminal);
  terminal.querySelector('.dot-yellow').addEventListener('click', () => { termOut.innerHTML = ''; });

  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      if (!cmd) return;
      history.unshift(cmd); histIdx = -1;
      termInput.value = '';
      printLine('shantanu@portfolio:~$ ' + cmd, 't-prompt');
      runCommand(cmd.toLowerCase());
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < history.length - 1) termInput.value = history[++histIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx > 0 ? (termInput.value = history[--histIdx]) : (histIdx = -1, termInput.value = '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const all = ['help','whoami','ls','skills','projects','contact','neofetch','git log','train','clear','pwd','hire','sudo','vim'];
      const partial = termInput.value.trim().toLowerCase();
      const match = all.find(c => c.startsWith(partial) && c !== partial);
      if (match) termInput.value = match;
    }
  });

  function printLine(text, cls = '') {
    const d = document.createElement('div');
    d.className = 't-line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
    return d;
  }

  function printRaw(html, cls = '') {
    const d = document.createElement('div');
    d.className = 't-line' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  }

  function blank() { printLine(''); }

  function printWelcome() {
    printLine('╔═══════════════════════════════════════╗', 't-cyan');
    printLine('║   shantanu@portfolio — Terminal v3.0  ║', 't-cyan');
    printLine('╚═══════════════════════════════════════╝', 't-cyan');
    blank();
    printLine("  Welcome! I'm Shantanu — Robotics & ML Engineer.", 't-dim');
    printLine("  Type 'help' to explore. Try the Konami code 🎮", 't-dim');
    blank();
  }

  async function runCommand(input) {
    const [cmd] = input.split(' ');

    if (cmd === 'clear') { termOut.innerHTML = ''; return; }

    // ── help ────────────────────────────────────────────────────────────────
    if (cmd === 'help') {
      blank();
      printLine('  Command        Description', 't-cyan');
      printLine('  ─────────────────────────────────────────');
      [
        ['whoami   ', 'About Shantanu'],
        ['ls       ', 'List portfolio sections'],
        ['skills   ', 'Skill proficiency chart'],
        ['projects ', 'Recent projects'],
        ['contact  ', 'Get in touch'],
        ['neofetch ', 'System info (robot edition)'],
        ['git log  ', 'Career timeline'],
        ['train    ', 'Train ShantanuNet 🤖'],
        ['hire     ', "Best decision you'll make"],
        ['clear    ', 'Clear terminal'],
      ].forEach(([c, d]) => printLine(`  ${c}  ${d}`));
      blank();
      return;
    }

    // ── whoami ───────────────────────────────────────────────────────────────
    if (cmd === 'whoami') {
      blank();
      printLine('  Shantanu Parab', 't-pink');
      printLine('  ─────────────────────────────────────');
      printLine('  Role    :  Robotics & ML Engineer');
      printLine('  Focus   :  Robot Learning · ROS2 · PyTorch');
      printLine('  Degree  :  M.Eng Robotics, UMD (GPA 3.97)');
      printLine('  Base    :  United States 🇺🇸');
      printLine('  GitHub  :  github.com/shantanuparabumd', 't-cyan');
      blank();
      return;
    }

    // ── ls ───────────────────────────────────────────────────────────────────
    if (cmd === 'ls') {
      blank();
      printLine('  total 7', 't-dim');
      [
        ['drwxr-xr-x', 'about/           (hero · bio · video)'],
        ['drwxr-xr-x', 'work-experience/ (4 roles)'],
        ['drwxr-xr-x', 'education/       (2 degrees)'],
        ['drwxr-xr-x', 'projects/        (14 projects)'],
        ['drwxr-xr-x', 'blogs/           (19 articles & videos)'],
        ['drwxr-xr-x', 'skills/          (13 skills)'],
        ['drwxr-xr-x', 'contact/'],
      ].forEach(([p, n]) => printRaw(`  <span class="t-dim">${p}</span>  <span class="t-cyan">${n}</span>`));
      blank();
      return;
    }

    // ── pwd ──────────────────────────────────────────────────────────────────
    if (cmd === 'pwd') {
      printLine('  /portfolio/shantanu/awesome-roboticist');
      return;
    }

    // ── skills ───────────────────────────────────────────────────────────────
    if (cmd === 'skills') {
      blank();
      printLine('  Skill Proficiency', 't-cyan');
      printLine('  ──────────────────────────────────────');
      [
        ['Python    ', 1.00], ['C++       ', 1.00], ['ROS2      ', 1.00],
        ['Linux     ', 1.00], ['Git       ', 1.00], ['PyTorch   ', 0.95],
        ['OpenCV    ', 0.80], ['RaspberryPi', 0.80],['Arduino   ', 0.80],
        ['MATLAB    ', 0.60], ['Java      ', 0.50],
      ].forEach(([name, lvl]) => {
        const filled = Math.round(lvl * 20);
        const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
        const pct = String(Math.round(lvl * 100)).padStart(3, ' ') + '%';
        printRaw(`  <span>${name.padEnd(12)}</span><span class="t-cyan">${bar}</span>  <span class="t-pink">${pct}</span>`);
      });
      blank();
      return;
    }

    // ── projects ─────────────────────────────────────────────────────────────
    if (cmd === 'projects') {
      blank();
      printLine('  Recent Projects', 't-cyan');
      printLine('  ──────────────────────────────────────────────────────');
      [
        ['2024', 'ALOHA Imitation Learning    ', 'PyTorch · HuggingFace · ROS2'],
        ['2024', 'Quadruped RL Locomotion     ', 'PPO · IsaacGym · ROS2'],
        ['2023', 'ARIAC Manufacturing         ', 'MoveIt2 · Python · C++'],
        ['2023', 'Grand Challenge Robot       ', 'SLAM · Nav2 · ROS2'],
        ['2022', 'Autonomous Navigation       ', 'A* · RRT* · OpenCV'],
      ].forEach(([yr, name, tech]) => {
        printRaw(`  <span class="t-warn">[${yr}]</span>  ${name}  <span class="t-dim">${tech}</span>`);
      });
      blank();
      printLine("  → Scroll to Projects section for full details & demos.", 't-dim');
      blank();
      return;
    }

    // ── contact ──────────────────────────────────────────────────────────────
    if (cmd === 'contact') {
      blank();
      printLine('  Contact Shantanu', 't-cyan');
      printLine('  ──────────────────────────────────────────');
      printLine('  Email    :  shantanuparab99@gmail.com', 't-pink');
      printLine('  Phone    :  +1 (301) 905-7946');
      printLine('  LinkedIn :  linkedin.com/in/shantanu-parab', 't-cyan');
      printLine('  GitHub   :  github.com/shantanuparabumd',   't-cyan');
      blank();
      return;
    }

    // ── neofetch ─────────────────────────────────────────────────────────────
    if (cmd === 'neofetch') {
      blank();
      const rows = [
        ['    ╔══════════╗    ', 'shantanu@portfolio',             't-cyan', 't-pink'],
        ['    ║  ◉    ◉  ║    ', '──────────────────────────',     't-cyan', 't-dim'],
        ['    ║     ▲    ║    ', 'OS: Robotics Engineer v3.0',     't-cyan', ''],
        ['    ║  ══════  ║    ', 'Kernel: PyTorch 2.x + ROS2',     't-cyan', ''],
        ['    ╚══════════╝    ', 'CPU: Human Brain™ (max clock)',  't-cyan', ''],
        ['   ╔════════════╗   ', 'GPU: NVIDIA RTX (RL training)',  't-cyan', ''],
        ['   ║  ROS2 · ML ║   ', 'Memory: ∞ curiosity + caffeine', 't-cyan', ''],
        ['   ╚════════════╝   ', 'Shell: bash | python3',          't-cyan', ''],
        ['  ╔══╗       ╔══╗  ',  'DE: Ubuntu 22.04 LTS',           't-cyan', ''],
        ['  ╚══╝       ╚══╝  ',  'Uptime: 5+ years in robotics',   't-cyan', ''],
      ];
      rows.forEach(([art, info, ac, ic]) => {
        printRaw(`<span class="${ac}">${art}</span><span class="${ic}">${info}</span>`);
      });
      blank();
      return;
    }

    // ── git log ───────────────────────────────────────────────────────────────
    if (input === 'git log' || input === 'git log --oneline') {
      blank();
      printLine('  git log --oneline --graph', 't-dim');
      printLine('  ──────────────────────────────────────────────────────');
      [
        ['HEAD→main', 'feat: ML Intern @ Trossen Robotics         Jun 2024'],
        ['a3f2b1c  ', 'grad: M.Eng Robotics @ UMD · GPA 3.97     May 2024'],
        ['8b1c3d2  ', 'feat: TA — Path Planning & Modeling        Jul 2023'],
        ['3e9d4f1  ', 'feat: Enroll M.Eng Robotics @ UMD          Aug 2022'],
        ['7c2a8b0  ', 'feat: Assoc. Developer @ Accenture/Intel   Jul 2021'],
        ['2f1d9e3  ', 'feat: Team Captain · ROBOCON CRCE          Jun 2019'],
        ['1b3e7d0  ', 'init: First commit · Mumbai, India 🤖      2000    '],
      ].forEach(([hash, msg]) => {
        printRaw(`  * <span class="t-warn">${hash}</span>  ${msg}`);
      });
      blank();
      return;
    }

    // ── train ─────────────────────────────────────────────────────────────────
    if (cmd === 'train') {
      if (isTraining) { printLine('  Already training! Please wait...', 't-warn'); return; }
      isTraining = true;
      blank();
      printLine('  Initializing training pipeline...', 't-dim');
      await sleep(380);
      printLine('  Loading dataset: experience.pkl  (5 years, 10k+ commits)', 't-dim');
      await sleep(480);
      printLine('  Model: ShantanuNet-v3  (Robotics Transformer + RL head)', 't-dim');
      await sleep(350);
      printLine('  Optimizer: AdamW · lr=3e-4 · device: NVIDIA RTX', 't-dim');
      await sleep(280);
      blank();
      printLine('  Training...', 't-cyan');
      blank();

      for (let ep = 1; ep <= 10; ep++) {
        const p    = ep / 10;
        const loss = (3.6 * Math.exp(-p * 3.8) + 0.028 + Math.random() * 0.04).toFixed(4);
        const acc  = Math.min(0.994, 0.05 + p * 0.97 + (Math.random() * 0.015 - 0.007)).toFixed(3);
        const bar  = '▓'.repeat(Math.round(p * 16)) + '░'.repeat(16 - Math.round(p * 16));
        const padEp = String(ep).padStart(2, ' ');
        printRaw(`  Epoch <span class="t-warn">${padEp}/10</span>  loss: <span class="t-pink">${loss}</span>  acc: <span class="t-success">${acc}</span>  [<span class="t-cyan">${bar}</span>]`);
        await sleep(240);
      }

      blank();
      printLine('  ✓  Training complete!',                         't-success');
      printLine('  ✓  Validation accuracy: 99.4%',                 't-success');
      printLine('  ✓  Model saved: shantanu_v3.pth (production)',  't-success');
      blank();
      printLine('  Capabilities unlocked:', 't-cyan');
      printLine('    · Robot Learning    · Reinforcement Learning');
      printLine('    · Imitation Learning· ROS2 System Design');
      printLine('    · C++ Performance   · ML Research & Deployment');
      blank();
      printLine("  Try: hire  →  best decision you'll make today", 't-dim');
      blank();
      isTraining = false;
      return;
    }

    // ── hire ──────────────────────────────────────────────────────────────────
    if (cmd === 'hire') {
      blank();
      printLine('  Connecting to hiring pipeline...', 't-dim');
      await sleep(400);
      printLine('  ✓  Candidate: Shantanu Parab (ShantanuNet v3.0)', 't-success');
      await sleep(280);
      printLine('  ✓  Skills verified  ✓✓✓', 't-success');
      await sleep(280);
      printLine('  ✓  GPA 3.97 — top 5%', 't-success');
      await sleep(280);
      printLine('  ✓  5+ years robotics experience', 't-success');
      await sleep(300);
      blank();
      printLine('  → Email    : shantanuparab99@gmail.com',        't-pink');
      printLine('  → LinkedIn : linkedin.com/in/shantanu-parab',   't-cyan');
      blank();
      printLine("  Best decision you'll make today 🚀", 't-success');
      blank();
      return;
    }

    // ── Fun fallbacks ─────────────────────────────────────────────────────────
    if (cmd === 'sudo') {
      printLine('  [sudo] password for shantanu: ···', 't-warn');
      await sleep(700);
      printLine('  shantanu is not in the sudoers file.', 't-error');
      printLine('  This incident will be reported. 👀', 't-error');
      return;
    }
    if (cmd === 'rm') {
      printLine('  rm: refusing to remove portfolio.', 't-error');
      printLine('  This took way too long to build!', 't-error');
      return;
    }
    if (cmd === 'vim' || cmd === 'nano' || cmd === 'emacs') {
      printLine(`  Opening ${cmd}...`, 't-dim');
      await sleep(300);
      printLine('  Just kidding. Use VS Code like a normal person.', 't-warn');
      return;
    }
    if (input.startsWith('echo ')) { printLine('  ' + input.slice(5)); return; }
    if (cmd === 'exit' || cmd === 'quit') { toggleTerminal(); return; }
    if (!cmd) return;

    printLine(`  command not found: ${cmd}`, 't-error');
    printLine("  Type 'help' to see available commands.", 't-dim');
    blank();
  }

  // ── Konami Code → auto-open terminal + run train ──────────────────────────
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  document.addEventListener('keydown', e => {
    if (e.key === KONAMI[ki]) {
      ki++;
      if (ki === KONAMI.length) {
        ki = 0;
        if (!termOpen) toggleTerminal();
        setTimeout(() => {
          printLine('shantanu@portfolio:~$ train  # 🕹️ Konami code unlocked!', 't-prompt');
          runCommand('train');
        }, 300);
      }
    } else {
      ki = e.key === KONAMI[0] ? 1 : 0;
    }
  });

})();
