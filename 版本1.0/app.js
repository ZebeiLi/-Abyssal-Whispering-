(() => {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Elements & constants                                              */
  /* ------------------------------------------------------------------ */

  const canvas = document.getElementById("ocean");
  const ctx = canvas ? canvas.getContext("2d", { alpha: false, desynchronized: true }) : null;
  if (!ctx) return;

  const els = {
    html: document.documentElement,
    body: document.body,
    hero: document.getElementById("hero"),
    enterBtn: document.getElementById("enterBtn"),
    breatheBtn: document.getElementById("breatheBtn"),
    miniBreatheBtn: document.getElementById("miniBreatheBtn"),
    brandBtn: document.getElementById("brandBtn"),
    soundToggle: document.getElementById("soundToggle"),
    breatheOverlay: document.getElementById("breatheOverlay"),
    closeBreathe: document.getElementById("closeBreathe"),
    exitBreatheBtn: document.getElementById("exitBreatheBtn"),
    breatheOrb: document.getElementById("breatheOrb"),
    breatheProgress: document.getElementById("breatheProgress"),
    breathePhase: document.getElementById("breathePhase"),
    breatheCount: document.getElementById("breatheCount"),
    themeButtons: Array.from(document.querySelectorAll(".theme-option")),
    liveRegion: document.getElementById("liveRegion"),
    interactionHint: document.getElementById("interactionHint"),
  };

  const TAU = Math.PI * 2;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

  const rgba = (rgb, alpha) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${alpha})`;

  /* ------------------------------------------------------------------ */
  /*  Palettes                                                           */
  /* ------------------------------------------------------------------ */

  const THEMES = {
    dawn: {
      bgTop: [7, 48, 58],
      bgMid: [15, 84, 92],
      bgDeep: [2, 18, 25],
      haze: [114, 222, 204],
      light: [255, 223, 170],
      ray: [173, 248, 227],
      sandFar: [54, 104, 95],
      sandNear: [14, 43, 45],
      grass: [25, 71, 62],
      kelp: [41, 106, 89],
      kelpLight: [176, 223, 177],
      coral: [214, 150, 120],
      coralGlow: [255, 207, 158],
      jelly: [225, 180, 255],
      jellyCore: [255, 248, 225],
      fish: [187, 236, 223],
      fishWarm: [248, 202, 146],
      mote: [255, 242, 199],
      bubble: [196, 251, 240],
      whale: [5, 28, 36],
      rim: [171, 247, 229],
      rock: [28, 62, 60],
    },
    moon: {
      bgTop: [6, 20, 43],
      bgMid: [15, 52, 78],
      bgDeep: [2, 9, 20],
      haze: [116, 143, 231],
      light: [210, 220, 255],
      ray: [145, 180, 255],
      sandFar: [49, 78, 98],
      sandNear: [15, 32, 47],
      grass: [29, 66, 80],
      kelp: [44, 85, 99],
      kelpLight: [184, 213, 224],
      coral: [190, 139, 171],
      coralGlow: [239, 182, 227],
      jelly: [190, 196, 255],
      jellyCore: [250, 247, 255],
      fish: [168, 207, 241],
      fishWarm: [241, 191, 195],
      mote: [215, 228, 255],
      bubble: [185, 220, 255],
      whale: [3, 13, 28],
      rim: [179, 207, 255],
      rock: [24, 48, 65],
    },
    abyss: {
      bgTop: [3, 8, 20],
      bgMid: [7, 22, 39],
      bgDeep: [1, 3, 10],
      haze: [54, 114, 155],
      light: [133, 255, 232],
      ray: [88, 233, 212],
      sandFar: [30, 62, 72],
      sandNear: [7, 22, 31],
      grass: [22, 59, 61],
      kelp: [29, 75, 71],
      kelpLight: [147, 240, 192],
      coral: [215, 125, 174],
      coralGlow: [255, 190, 232],
      jelly: [255, 164, 211],
      jellyCore: [222, 255, 242],
      fish: [127, 239, 219],
      fishWarm: [147, 190, 255],
      mote: [157, 255, 230],
      bubble: [137, 255, 237],
      whale: [1, 5, 13],
      rim: [116, 255, 226],
      rock: [14, 33, 42],
    },
  };

  const COLOR_KEYS = Object.keys(THEMES.dawn);

  const cloneTheme = (theme) => {
    const out = {};
    for (const key of COLOR_KEYS) out[key] = theme[key].slice();
    return out;
  };

  let C = cloneTheme(THEMES.dawn);
  let themeFrom = cloneTheme(THEMES.dawn);
  let themeTo = cloneTheme(THEMES.dawn);
  let themeStarted = 0;
  let themeBlend = 1;

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  let W = window.innerWidth;
  let H = window.innerHeight;
  let DPR = 1;

  const state = {
    time: 0,
    env: 0,
    dt: 0,
    themeName: "dawn",
    exploring: false,
    pointer: {
      x: W * 0.5,
      y: H * 0.48,
      tx: W * 0.5,
      ty: H * 0.48,
      active: false,
      down: false,
      touch: false,
      lastTrail: 0,
    },
    whaleEnergy: 0,
    breath: {
      active: false,
      start: 0,
      lastPhase: "",
      previousFocus: null,
    },
  };

  let currentWhale = { x: W * 0.7, y: H * 0.3, scale: 1 };

  let fish = [];
  let motes = [];
  let bubbles = [];
  let sparkles = [];
  let ripples = [];
  let jellies = [];
  let kelpStems = [];
  let grassBlades = [];
  let corals = [];
  let seaFans = [];
  let anemones = [];
  let bokeh = [];
  let sandDots = [];
  let groundLights = [];

  /* ------------------------------------------------------------------ */
  /*  Soft light sprites                                                */
  /* ------------------------------------------------------------------ */

  function makeGlowSprite(core, halo) {
    const size = 128;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext("2d");
    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, rgba(core, 1));
    g.addColorStop(0.16, rgba(core, 0.7));
    g.addColorStop(0.44, rgba(halo, 0.24));
    g.addColorStop(0.72, rgba(halo, 0.065));
    g.addColorStop(1, rgba(halo, 0));
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, size, size);
    return sprite;
  }

  const GLOW = {
    warm: makeGlowSprite([255, 253, 243], [255, 219, 154]),
    aqua: makeGlowSprite([240, 255, 251], [137, 245, 224]),
    lilac: makeGlowSprite([253, 246, 255], [220, 172, 255]),
  };

  /* ------------------------------------------------------------------ */
  /*  Canvas sizing & world building                                    */
  /* ------------------------------------------------------------------ */

  function resizeCanvas() {
    W = Math.max(320, window.innerWidth);
    H = Math.max(420, window.innerHeight);
    DPR = clamp(window.devicePixelRatio || 1, 1, 1.5);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;

    buildFish();
    buildMotes();
    buildBubbles();
    buildJellies();
    buildKelp();
    buildGrass();
    buildCorals();
    buildSeaFans();
    buildAnemones();
    buildBokeh();
    buildSandDots();
    buildGroundLights();

    if (!state.pointer.active) {
      state.pointer.x = W * 0.5;
      state.pointer.y = H * 0.48;
      state.pointer.tx = state.pointer.x;
      state.pointer.ty = state.pointer.y;
    }
  }

  function buildFish() {
    fish = [];
    const count = clamp(Math.round(W / 52), 13, 28);
    const perSchool = Math.max(3, Math.round(count / 3));
    const schools = [
      { baseY: 0.285, spread: 0.06, dir: -1, warm: 0.14, size: [1.2, 2.5], speed: [10, 19], alpha: 0.48 },
      { baseY: 0.535, spread: 0.075, dir: 1, warm: 0.52, size: [2.1, 4.2], speed: [8, 16], alpha: 0.58 },
      { baseY: 0.705, spread: 0.045, dir: -1, warm: 0.24, size: [1.4, 3.0], speed: [7, 14], alpha: 0.42 },
    ];

    schools.forEach((school) => {
      let made = 0;
      while (made < perSchool) {
        const groupSize = Math.min(perSchool - made, 2 + Math.floor(Math.random() * 4));
        const centerX = rand(-W * 0.02, W * 1.02);
        const centerY = H * school.baseY + rand(-H * school.spread, H * school.spread);
        const speed = rand(school.speed[0], school.speed[1]);

        for (let i = 0; i < groupSize; i += 1) {
          fish.push({
            x: centerX + rand(-W * 0.075, W * 0.075),
            baseY: centerY + rand(-H * 0.026, H * 0.026),
            dir: school.dir,
            speed: speed * rand(0.9, 1.1),
            size: rand(school.size[0], school.size[1]),
            phase: rand(0, TAU),
            freq: rand(0.36, 0.82),
            amp: rand(3, 11),
            alpha: rand(school.alpha * 0.72, school.alpha * 1.15),
            warm: Math.random() < school.warm,
            ox: 0,
            oy: 0,
            wobble: rand(0.7, 1.3),
          });
        }
        made += groupSize;
      }
    });
  }

  function buildMotes() {
    motes = [];
    const count = clamp(Math.round((W * H) / 15500), 48, 128);
    for (let i = 0; i < count; i += 1) {
      motes.push({
        x: rand(0, W),
        y: rand(0, H),
        z: rand(0.15, 1),
        r: rand(0.55, 2.4),
        speed: rand(5, 20),
        drift: rand(2, 12),
        phase: rand(0, TAU),
        freq: rand(0.2, 0.7),
        alpha: rand(0.18, 0.62),
        warm: Math.random() < 0.34,
      });
    }
  }

  function makeBaseBubble(initial = false) {
    return {
      x: rand(0, W),
      y: initial ? rand(0, H) : H + rand(6, 90),
      r: rand(1.1, 4.4),
      vx: rand(-6, 6),
      vy: rand(-28, -9),
      rise: -rand(18, 58),
      phase: rand(0, TAU),
      alpha: rand(0.2, 0.52),
      glow: Math.random() < 0.2,
      ephemeral: false,
    };
  }

  function buildBubbles() {
    bubbles = [];
    const count = clamp(Math.round(W / 46), 17, 36);
    for (let i = 0; i < count; i += 1) bubbles.push(makeBaseBubble(true));
  }

  function buildJellies() {
    const small = W < 720;
    const base = Math.min(W, H);
    const definitions = small
      ? [
          { nx: 0.77, ny: 0.225, size: 0.066, phase: 0.7, alpha: 0.95, dir: 1 },
          { nx: 0.56, ny: 0.12, size: 0.032, phase: 3.2, alpha: 0.6, dir: -1 },
          { nx: 0.84, ny: 0.47, size: 0.042, phase: 5.1, alpha: 0.55, dir: 1 },
          { nx: 0.9, ny: 0.36, size: 0.022, phase: 2.2, alpha: 0.38, dir: -1 },
        ]
      : [
          { nx: 0.725, ny: 0.36, size: 0.062, phase: 0.7, alpha: 1, dir: 1 },
          { nx: 0.605, ny: 0.105, size: 0.033, phase: 3.2, alpha: 0.66, dir: -1 },
          { nx: 0.845, ny: 0.555, size: 0.043, phase: 5.1, alpha: 0.56, dir: 1 },
          { nx: 0.91, ny: 0.29, size: 0.021, phase: 2.2, alpha: 0.36, dir: -1 },
        ];

    jellies = definitions.map((definition) => {
      const x = definition.nx * W;
      const y = definition.ny * H;
      return {
        ...definition,
        x,
        y,
        energy: 0,
        r: Math.max(22, base * definition.size * (small ? 1.36 : 1)),
        phaseOffset: rand(0, TAU),
        driftPhase: rand(0, TAU),
      };
    });
  }

  function buildKelp() {
    const mobileScale = W < 720 ? 0.76 : 1;
    const stems = [
      { nx: 0.012, height: 0.47, width: 0.008, phase: 0.5, alpha: 0.86, tone: 0.68 },
      { nx: 0.049, height: 0.36, width: 0.0057, phase: 2.2, alpha: 0.67, tone: 0.5 },
      { nx: 0.087, height: 0.25, width: 0.0047, phase: 4.1, alpha: 0.53, tone: 0.4 },
      { nx: 0.792, height: 0.2, width: 0.0042, phase: 1.4, alpha: 0.4, tone: 0.45 },
      { nx: 0.848, height: 0.28, width: 0.005, phase: 3.7, alpha: 0.48, tone: 0.55 },
      { nx: 0.928, height: 0.43, width: 0.008, phase: 3.1, alpha: 0.75, tone: 0.66 },
      { nx: 0.968, height: 0.51, width: 0.0092, phase: 5.2, alpha: 0.9, tone: 0.74 },
      { nx: 1.002, height: 0.34, width: 0.0062, phase: 2.5, alpha: 0.62, tone: 0.55 },
    ];

    kelpStems = stems.map((stem) => ({
      ...stem,
      x: W * stem.nx,
      baseY: H * 1.018,
      h: H * stem.height * mobileScale,
      w: Math.max(3.2, W * stem.width),
    }));
  }

  function buildGrass() {
    grassBlades = [];
    const count = clamp(Math.round(W / 22), 28, 62);
    for (let i = 0; i < count; i += 1) {
      grassBlades.push({
        x: rand(-W * 0.02, W * 1.02),
        baseY: H * rand(0.955, 1.02),
        h: H * rand(0.025, 0.1),
        sway: rand(4, 22) * (Math.random() < 0.5 ? -1 : 1),
        phase: rand(0, TAU),
        width: rand(0.7, 1.6),
        alpha: rand(0.18, 0.52),
      });
    }

    for (let i = 0; i < 7; i += 1) {
      const left = i < 4;
      const x = left ? rand(-W * 0.01, W * 0.12) : rand(W * 0.9, W * 1.01);
      grassBlades.push({
        x,
        baseY: H * rand(0.99, 1.03),
        h: H * rand(0.11, 0.2),
        sway: rand(24, 52) * (left ? 1 : -1),
        phase: rand(0, TAU),
        width: rand(2.2, 4.4),
        alpha: rand(0.4, 0.7),
      });
    }
  }

  function buildCorals() {
    const base = Math.min(W, H);
    const configs = [
      { x: W * 0.905, y: H * 0.952, size: base * 0.15, phase: 1.2 },
      { x: W * 0.815, y: H * 0.972, size: base * 0.085, phase: 4.4 },
      { x: W * 0.972, y: H * 0.93, size: base * 0.06, phase: 2.6 },
    ];
    corals = configs.map((config) => buildCoral(config));
  }

  function buildCoral(config) {
    const segments = [];
    const tips = [];

    function branch(x, y, angle, length, depth) {
      const bend = rand(-0.22, 0.22);
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      const midX = x + Math.cos(angle + bend) * length * 0.56;
      const midY = y + Math.sin(angle + bend) * length * 0.56;
      segments.push({
        x1: x,
        y1: y,
        cx: midX,
        cy: midY,
        x2: endX,
        y2: endY,
        width: Math.max(0.8, (config.size / 34) * (0.5 + depth * 0.38)),
        alpha: 0.44 + depth * 0.065,
        phase: rand(0, TAU),
      });

      if (depth <= 0) {
        tips.push({ x: endX, y: endY, phase: rand(0, TAU), r: rand(0.7, 2) });
        return;
      }

      const children = depth === 1 ? 2 : 3;
      for (let i = 0; i < children; i += 1) {
        const spread = (i - (children - 1) / 2) * 0.42;
        branch(
          endX,
          endY,
          angle + spread + rand(-0.08, 0.08),
          length * rand(0.6, 0.74),
          depth - 1
        );
      }
    }

    branch(config.x, config.y, -Math.PI / 2, config.size * 0.48, 3);
    return { ...config, segments, tips };
  }

  function buildSeaFans() {
    const base = Math.min(W, H);
    seaFans = [
      { x: W * 0.93, y: H * 0.965, size: base * 0.165, phase: 0.8, flip: 1 },
      { x: W * 0.782, y: H * 0.985, size: base * 0.105, phase: 2.2, flip: -1 },
      { x: W * 0.045, y: H * 0.993, size: base * 0.12, phase: 4.1, flip: 1 },
    ];
  }

  function buildAnemones() {
    const base = Math.min(W, H);
    anemones = [
      { x: W * 0.842, y: H * 0.952, size: base * 0.052, phase: 1.8 },
      { x: W * 0.752, y: H * 0.976, size: base * 0.035, phase: 4.1 },
      { x: W * 0.957, y: H * 0.972, size: base * 0.028, phase: 2.8 },
    ];
  }

  function buildBokeh() {
    bokeh = [
      { nx: 0.08, ny: 0.86, size: Math.min(W, H) * 0.2, alpha: 0.03, kind: "warm" },
      { nx: 0.18, ny: 0.98, size: Math.min(W, H) * 0.13, alpha: 0.035, kind: "aqua" },
      { nx: 0.83, ny: 0.91, size: Math.min(W, H) * 0.24, alpha: 0.028, kind: "warm" },
      { nx: 0.95, ny: 0.76, size: Math.min(W, H) * 0.16, alpha: 0.025, kind: "lilac" },
      { nx: 0.45, ny: 1.02, size: Math.min(W, H) * 0.12, alpha: 0.022, kind: "aqua" },
    ];
  }

  function buildSandDots() {
    sandDots = [];
    for (let i = 0; i < 120; i += 1) {
      sandDots.push({
        nx: Math.random(),
        ny: rand(0.88, 1.01),
        r: rand(0.35, 1.5),
        alpha: rand(0.04, 0.16),
        warm: Math.random() < 0.6,
      });
    }
  }

  function buildGroundLights() {
    groundLights = [];
    const count = W < 720 ? 12 : 20;

    for (let i = 0; i < count; i += 1) {
      const rightSide = i > count * 0.24;
      groundLights.push({
        x: rightSide ? rand(W * 0.58, W * 1.01) : rand(-W * 0.01, W * 0.14),
        y: rand(H * 0.885, H * 0.985),
        r: rand(0.7, 2.3),
        phase: rand(0, TAU),
        warm: Math.random() < 0.32,
        stem: Math.random() < 0.32 ? rand(8, 28) : 0,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Pointer & interaction                                             */
  /* ------------------------------------------------------------------ */

  function updatePointerPosition(event) {
    const pointer = state.pointer;
    pointer.tx = event.clientX;
    pointer.ty = event.clientY;
    pointer.touch = event.pointerType === "touch";
    if (!pointer.active) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      pointer.active = true;
    }
  }

  function handlePointerMove(event) {
    if (state.breath.active) return;
    updatePointerPosition(event);
    if (state.pointer.touch) return;

    const now = performance.now();
    if (now - state.pointer.lastTrail > 32) {
      state.pointer.lastTrail = now;
      spawnTrail(event.clientX, event.clientY);
    }
  }

  function handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (state.breath.active) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, [role='dialog']")) return;

    updatePointerPosition(event);
    state.pointer.down = true;
    state.pointer.touch = event.pointerType === "touch";

    addRipple(event.clientX, event.clientY, 1);
    spawnBubbleBurst(event.clientX, event.clientY, 11);
    spawnSparkBurst(event.clientX, event.clientY, 15, 1);
    scatterFish(event.clientX, event.clientY, 1);

    if (audio.on) playWaterDrop();

    const whaleDistance = Math.hypot(
      event.clientX - currentWhale.x,
      event.clientY - currentWhale.y
    );
    if (whaleDistance < currentWhale.scale * 190) {
      state.whaleEnergy = 1;
      spawnWhaleSparkles(16);
      if (audio.on) playWhaleCall();
      els.liveRegion.textContent = "鲸鱼听见了你的问候。";
    }

    for (const jelly of jellies) {
      const d = Math.hypot(event.clientX - jelly.x, event.clientY - jelly.y);
      if (d < jelly.r * 3.2) {
        jelly.energy = 1;
        spawnSparkBurst(jelly.x, jelly.y + jelly.r * 0.3, 9, 0.55);
        if (audio.on) playChime(523.25 + jellies.indexOf(jelly) * 36, 4.5, 0.028);
      }
    }
  }

  function handlePointerUp() {
    state.pointer.down = false;
    if (state.pointer.touch) {
      window.setTimeout(() => {
        if (!state.pointer.down) state.pointer.active = false;
      }, 1100);
    }
  }

  function scatterFish(x, y, strength) {
    for (const item of fish) {
      const fy = item.baseY + Math.sin(state.env * item.freq + item.phase) * item.amp + item.oy;
      const dx = item.x + item.ox - x;
      const dy = fy - y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 230) {
        const push = (1 - distance / 230) * strength;
        item.ox += (dx / distance) * push * 34;
        item.oy += (dy / distance) * push * 26;
      }
    }
  }

  function spawnTrail(x, y) {
    sparkles.push({
      x: x + rand(-9, 9),
      y: y + rand(-9, 9),
      vx: rand(-9, 9),
      vy: rand(-14, 5),
      life: rand(0.55, 1.4),
      maxLife: 1.4,
      size: rand(0.8, 2.6),
      tint: Math.random() < 0.5 ? "warm" : "aqua",
      glimmer: Math.random() < 0.35,
    });
  }

  function spawnSparkBurst(x, y, count, strength = 1) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, TAU);
      const speed = rand(12, 120) * strength;
      sparkles.push({
        x: x + Math.cos(angle) * rand(0, 12),
        y: y + Math.sin(angle) * rand(0, 12),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(4, 24),
        life: rand(0.7, 1.9),
        maxLife: 1.9,
        size: rand(1, 3.6),
        tint: Math.random() < 0.55 ? "warm" : "aqua",
        glimmer: Math.random() < 0.65,
      });
    }
  }

  function spawnWhaleSparkles(count) {
    for (let i = 0; i < count; i += 1) {
      const localX = rand(-150, 150) * currentWhale.scale;
      const localY = rand(-44, 32) * currentWhale.scale;
      sparkles.push({
        x: currentWhale.x + localX,
        y: currentWhale.y + localY,
        vx: rand(-8, 8),
        vy: rand(-20, -3),
        life: rand(1.2, 2.8),
        maxLife: 2.8,
        size: rand(1, 3),
        tint: "aqua",
        glimmer: true,
      });
    }
  }

  function makeBubbleAt(x, y, burst = true) {
    return {
      x,
      y,
      r: rand(1, 3.8),
      vx: burst ? rand(-65, 65) : rand(-5, 5),
      vy: burst ? rand(-90, -30) : rand(-25, -8),
      rise: -rand(22, 58),
      phase: rand(0, TAU),
      alpha: rand(0.2, 0.52),
      glow: Math.random() < 0.25,
      ephemeral: burst,
    };
  }

  function spawnBubbleBurst(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      if (bubbles.length > 105) break;
      bubbles.push(makeBubbleAt(x + rand(-18, 18), y + rand(-10, 10), true));
    }
  }

  function addRipple(x, y, strength) {
    ripples.push({ x, y, start: state.time, strength });
    if (ripples.length > 7) ripples.shift();
  }

  /* ------------------------------------------------------------------ */
  /*  Ambient audio                                                     */
  /* ------------------------------------------------------------------ */

  const audio = {
    ctx: null,
    master: null,
    oceanGain: null,
    padGain: null,
    reverb: null,
    on: false,
    ready: false,
    chimeTimer: 0,
    lastDrop: 0,
  };

  function makeImpulse(context, seconds, decay) {
    const rate = context.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = context.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  function initAudio() {
    if (audio.ready) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -26;
    compressor.knee.value = 22;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.5;

    master.gain.value = 0.0001;
    master.connect(compressor);
    compressor.connect(context.destination);

    const reverb = context.createConvolver();
    reverb.buffer = makeImpulse(context, 3.4, 2.8);
    const wet = context.createGain();
    wet.gain.value = 0.34;
    reverb.connect(wet);
    wet.connect(master);

    const padFilter = context.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 760;
    padFilter.Q.value = 0.6;

    const padGain = context.createGain();
    padGain.gain.value = 0.12;
    padFilter.connect(padGain);
    padGain.connect(master);
    padGain.connect(reverb);

    const padNotes = [55, 82.41, 110, 138.59, 164.81];
    const padLevels = [0.06, 0.034, 0.025, 0.014, 0.01];
    padNotes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index > 2 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = rand(-4, 4);
      const gain = context.createGain();
      gain.gain.value = padLevels[index];
      oscillator.connect(gain);
      gain.connect(padFilter);
      oscillator.start();

      const shimmer = context.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = frequency * 2.003;
      shimmer.detune.value = rand(-3, 3);
      const shimmerGain = context.createGain();
      shimmerGain.gain.value = padLevels[index] * 0.16;
      shimmer.connect(shimmerGain);
      shimmerGain.connect(padFilter);
      shimmer.start();
    });

    const filterLfo = context.createOscillator();
    filterLfo.frequency.value = 0.045;
    const filterLfoGain = context.createGain();
    filterLfoGain.gain.value = 170;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(padFilter.frequency);
    filterLfo.start();

    const sampleRate = context.sampleRate;
    const oceanBuffer = context.createBuffer(1, sampleRate * 4, sampleRate);
    const oceanData = oceanBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < oceanData.length; i += 1) {
      const white = Math.random() * 2 - 1;
      brown = brown * 0.985 + white * 0.015;
      oceanData[i] = brown * 3.4;
    }

    const oceanSource = context.createBufferSource();
    oceanSource.buffer = oceanBuffer;
    oceanSource.loop = true;

    const oceanFilter = context.createBiquadFilter();
    oceanFilter.type = "lowpass";
    oceanFilter.frequency.value = 410;
    oceanFilter.Q.value = 0.4;

    const oceanGain = context.createGain();
    oceanGain.gain.value = 0.08;
    oceanSource.connect(oceanFilter);
    oceanFilter.connect(oceanGain);
    oceanGain.connect(master);
    oceanGain.connect(reverb);
    oceanSource.start();

    const hissSource = context.createBufferSource();
    hissSource.buffer = oceanBuffer;
    hissSource.loop = true;
    const hissFilter = context.createBiquadFilter();
    hissFilter.type = "highpass";
    hissFilter.frequency.value = 1200;
    const hissGain = context.createGain();
    hissGain.gain.value = 0.012;
    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(master);
    hissSource.start();

    audio.ctx = context;
    audio.master = master;
    audio.oceanGain = oceanGain;
    audio.padGain = padGain;
    audio.reverb = reverb;
    audio.ready = true;
  }

  function playChime(frequency, duration = 5, level = 0.042) {
    if (!audio.on || !audio.ctx || !audio.ready) return;
    const context = audio.ctx;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    let tail = gain;
    if (context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = rand(-0.55, 0.55);
      gain.connect(panner);
      tail = panner;
    }
    oscillator.connect(gain);
    tail.connect(audio.master);
    tail.connect(audio.reverb);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.1);

    const overtone = context.createOscillator();
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2.004;
    const overtoneGain = context.createGain();
    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(level * 0.2, now + 0.05);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);
    overtone.connect(overtoneGain);
    overtoneGain.connect(audio.master);
    overtoneGain.connect(audio.reverb);
    overtone.start(now);
    overtone.stop(now + duration);
  }

  function playWaterDrop() {
    if (!audio.on || !audio.ctx) return;
    const now = audio.ctx.currentTime;
    if (now - audio.lastDrop < 0.16) return;
    audio.lastDrop = now;

    const context = audio.ctx;
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(rand(420, 560), now);
    oscillator.frequency.exponentialRampToValueAtTime(rand(760, 990), now + 0.09);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    oscillator.connect(gain);
    gain.connect(audio.master);
    gain.connect(audio.reverb);
    oscillator.start(now);
    oscillator.stop(now + 0.36);
  }

  function playWhaleCall() {
    if (!audio.on || !audio.ctx) return;
    const context = audio.ctx;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(62, now);
    oscillator.frequency.exponentialRampToValueAtTime(47, now + 2.8);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

    oscillator.connect(gain);
    gain.connect(audio.master);
    gain.connect(audio.reverb);
    oscillator.start(now);
    oscillator.stop(now + 4.3);
  }

  function scheduleChime() {
    window.clearTimeout(audio.chimeTimer);
    const delay = rand(13000, 26000);
    audio.chimeTimer = window.setTimeout(() => {
      if (audio.on) {
        const notes = [220, 246.94, 329.63, 369.99, 440, 554.37];
        playChime(notes[Math.floor(Math.random() * notes.length)], rand(5, 8), 0.032);
        scheduleChime();
      }
    }, delay);
  }

  async function toggleSound() {
    if (!audio.ready) initAudio();
    if (!audio.ctx) {
      els.liveRegion.textContent = "当前浏览器无法播放环境声音。";
      return;
    }

    if (audio.ctx.state === "suspended") {
      try {
        await audio.ctx.resume();
      } catch (error) {
        return;
      }
    }

    audio.on = !audio.on;
    els.soundToggle.classList.toggle("is-on", audio.on);
    els.soundToggle.setAttribute("aria-pressed", String(audio.on));
    els.soundToggle.setAttribute("aria-label", audio.on ? "关闭环境声音" : "开启环境声音");
    els.soundToggle.title = audio.on ? "关闭环境声音" : "开启环境声音";

    const now = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    if (audio.on) {
      audio.master.gain.setValueAtTime(Math.max(0.0001, audio.master.gain.value), now);
      audio.master.gain.exponentialRampToValueAtTime(0.4, now + 1.2);
      playChime(329.63, 5.5, 0.045);
      scheduleChime();
      els.liveRegion.textContent = "环境声音已开启。";
    } else {
      audio.master.gain.setValueAtTime(Math.max(0.0001, audio.master.gain.value), now);
      audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      window.clearTimeout(audio.chimeTimer);
      els.liveRegion.textContent = "环境声音已关闭。";
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Themes                                                            */
  /* ------------------------------------------------------------------ */

  function applyTheme(name) {
    if (!THEMES[name] || name === state.themeName) return;

    themeFrom = cloneTheme(C);
    themeTo = THEMES[name];
    themeStarted = performance.now();
    themeBlend = 0;
    state.themeName = name;
    els.body.dataset.theme = name;

    els.themeButtons.forEach((button) => {
      const active = button.dataset.theme === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (audio.on) {
      const note = name === "dawn" ? 329.63 : name === "moon" ? 392 : 523.25;
      playChime(note, 6, 0.035);
    }
    els.liveRegion.textContent = `已切换至${name === "dawn" ? "晨汐" : name === "moon" ? "月潮" : "星海"}光景。`;
  }

  function updateTheme(now) {
    if (themeBlend >= 1) return;
    themeBlend = clamp((now - themeStarted) / 1800, 0, 1);
    const eased = smoothstep(themeBlend);
    for (const key of COLOR_KEYS) {
      const from = themeFrom[key];
      const to = themeTo[key];
      const mixed = C[key];
      mixed[0] = lerp(from[0], to[0], eased);
      mixed[1] = lerp(from[1], to[1], eased);
      mixed[2] = lerp(from[2], to[2], eased);
    }
    if (themeBlend >= 1) C = cloneTheme(themeTo);
  }

  /* ------------------------------------------------------------------ */
  /*  Breathing exercise                                                */
  /* ------------------------------------------------------------------ */

  function openBreathing() {
    if (state.breath.active) return;
    state.breath.active = true;
    state.breath.start = performance.now();
    state.breath.lastPhase = "";
    state.breath.previousFocus = document.activeElement;

    els.body.classList.add("is-breathing");
    els.breatheOverlay.classList.add("is-open");
    els.breatheOverlay.setAttribute("aria-hidden", "false");
    els.liveRegion.textContent = "静心呼吸开始。跟随圆环，吸气四秒，屏息两秒，呼气六秒。";
    window.setTimeout(() => els.closeBreathe.focus({ preventScroll: true }), 380);
  }

  function closeBreathing() {
    if (!state.breath.active) return;
    state.breath.active = false;
    els.body.classList.remove("is-breathing");
    els.breatheOverlay.classList.remove("is-open");
    els.breatheOverlay.setAttribute("aria-hidden", "true");
    els.breatheOrb.style.transform = "scale(0.84)";
    els.breatheProgress.style.setProperty("--p", "0");
    if (state.breath.previousFocus && typeof state.breath.previousFocus.focus === "function") {
      state.breath.previousFocus.focus({ preventScroll: true });
    }
    els.liveRegion.textContent = "呼吸练习结束。愿你带着这片安静，回到海面。";
  }

  function updateBreathing(now) {
    if (!state.breath.active) return;
    const elapsed = ((now - state.breath.start) / 1000) % 12;
    let phase = "吸气";
    let progress = 0;
    let scale = 0.84;
    let count = 0;

    if (elapsed < 4) {
      phase = "吸气";
      const p = elapsed / 4;
      progress = p;
      scale = lerp(0.84, 1.15, easeInOutSine(p));
      count = Math.max(1, Math.ceil(4 - elapsed));
    } else if (elapsed < 6) {
      phase = "屏息";
      progress = 1;
      scale = 1.15 + Math.sin(elapsed * 3.2) * 0.006;
      count = Math.max(1, Math.ceil(6 - elapsed));
    } else {
      phase = "呼气";
      const p = (elapsed - 6) / 6;
      progress = 1 - p;
      scale = lerp(1.15, 0.84, easeInOutSine(p));
      count = Math.max(1, Math.ceil(12 - elapsed));
    }

    els.breatheOrb.style.transform = `scale(${scale.toFixed(4)})`;
    els.breatheProgress.style.setProperty("--p", progress.toFixed(4));
    els.breatheCount.textContent = String(count);

    if (phase !== state.breath.lastPhase) {
      els.breathePhase.textContent = phase;
      state.breath.lastPhase = phase;
      if (audio.on) {
        if (phase === "吸气") playChime(329.63, 5.2, 0.026);
        if (phase === "呼气") playChime(440, 6.4, 0.02);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Drawing helpers                                                   */
  /* ------------------------------------------------------------------ */

  function drawGlow(sprite, x, y, size, alpha) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  function drawBackground() {
    const background = ctx.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, rgba(C.bgTop, 1));
    background.addColorStop(0.46, rgba(C.bgMid, 1));
    background.addColorStop(1, rgba(C.bgDeep, 1));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    const surface = ctx.createRadialGradient(
      W * 0.68,
      -H * 0.08,
      0,
      W * 0.68,
      H * 0.05,
      Math.max(W, H) * 0.92
    );
    surface.addColorStop(0, rgba(C.haze, 0.25));
    surface.addColorStop(0.3, rgba(C.haze, 0.1));
    surface.addColorStop(0.68, rgba(C.haze, 0.025));
    surface.addColorStop(1, rgba(C.haze, 0));
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, W, H);

    const warmHaze = ctx.createRadialGradient(
      W * 0.18,
      H * 0.02,
      0,
      W * 0.18,
      H * 0.02,
      Math.max(W, H) * 0.55
    );
    warmHaze.addColorStop(0, rgba(C.light, 0.055));
    warmHaze.addColorStop(0.45, rgba(C.light, 0.018));
    warmHaze.addColorStop(1, rgba(C.light, 0));
    ctx.fillStyle = warmHaze;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = H * (0.018 + i * 0.018);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 32) {
        const wy =
          y +
          Math.sin(x * 0.012 + state.env * 0.24 + i * 1.2) * (2.4 + i) +
          Math.sin(x * 0.027 - state.env * 0.15 + i) * 1.2;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.strokeStyle = rgba(C.light, 0.026 - i * 0.003);
      ctx.stroke();
    }
    ctx.restore();

    const depthShade = ctx.createRadialGradient(
      W * 0.5,
      H * 1.08,
      0,
      W * 0.5,
      H * 1.08,
      Math.max(W, H) * 0.92
    );
    depthShade.addColorStop(0, rgba(C.bgDeep, 0.6));
    depthShade.addColorStop(0.55, rgba(C.bgDeep, 0.16));
    depthShade.addColorStop(1, rgba(C.bgDeep, 0));
    ctx.fillStyle = depthShade;
    ctx.fillRect(0, 0, W, H);
  }

  function whalePath() {
    ctx.beginPath();
    ctx.moveTo(-158, 6);
    ctx.bezierCurveTo(-160, -12, -146, -34, -118, -45);
    ctx.bezierCurveTo(-82, -58, -32, -60, 10, -53);
    ctx.bezierCurveTo(46, -46, 80, -34, 103, -19);
    ctx.bezierCurveTo(115, -10, 122, -4, 128, 1);
    ctx.bezierCurveTo(114, 15, 99, 28, 80, 36);
    ctx.bezierCurveTo(45, 51, 0, 55, -42, 48);
    ctx.bezierCurveTo(-86, 41, -126, 35, -146, 22);
    ctx.bezierCurveTo(-155, 16, -158, 12, -158, 6);
    ctx.closePath();
  }

  function whaleTailPath() {
    ctx.beginPath();
    ctx.moveTo(112, 2);
    ctx.bezierCurveTo(128, -7, 143, -20, 152, -34);
    ctx.bezierCurveTo(160, -45, 169, -51, 175, -44);
    ctx.bezierCurveTo(175, -35, 169, -26, 161, -18);
    ctx.bezierCurveTo(153, -10, 142, -3, 135, 2);
    ctx.bezierCurveTo(146, 11, 155, 24, 161, 38);
    ctx.bezierCurveTo(165, 47, 160, 51, 153, 49);
    ctx.bezierCurveTo(144, 44, 133, 33, 123, 20);
    ctx.bezierCurveTo(117, 12, 113, 7, 112, 2);
    ctx.closePath();
  }

  function drawWhale() {
    const cycle = 1.32;
    const progress = (state.env * 0.0105 + 0.355) % cycle;
    const x = W * 1.3 - progress * W * 1.63;
    const y = H * 0.235 + Math.sin(state.env * 0.18) * H * 0.011;
    const scale = clamp(W / 1380, 0.46, 1.12);
    const rotation = -0.025 + Math.sin(state.env * 0.26) * 0.016;
    const energy = state.whaleEnergy;
    currentWhale = { x, y, scale };

    if (energy > 0.01 || state.themeName === "abyss") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const aura = ctx.createRadialGradient(x, y, 0, x, y, scale * 300);
      aura.addColorStop(0, rgba(C.rim, 0.018 + energy * 0.06));
      aura.addColorStop(0.48, rgba(C.rim, 0.008 + energy * 0.025));
      aura.addColorStop(1, rgba(C.rim, 0));
      ctx.fillStyle = aura;
      ctx.fillRect(x - scale * 300, y - scale * 300, scale * 600, scale * 600);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const bodyAlpha = 0.2 + energy * 0.12 + (state.themeName === "abyss" ? 0.13 : 0);
    const bodyGradient = ctx.createLinearGradient(-158, -42, 180, 50);
    bodyGradient.addColorStop(0, rgba(C.whale, bodyAlpha * 1.13));
    bodyGradient.addColorStop(0.62, rgba(C.whale, bodyAlpha));
    bodyGradient.addColorStop(1, rgba(C.whale, bodyAlpha * 0.8));

    ctx.fillStyle = bodyGradient;
    whaleTailPath();
    ctx.fill();
    whalePath();
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(C.rim, 0.022 + energy * 0.04);
    ctx.lineWidth = 7;
    whalePath();
    ctx.stroke();
    whaleTailPath();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = rgba(C.rim, 0.2 + energy * 0.3);
    ctx.lineWidth = 1.25;
    whalePath();
    ctx.stroke();
    ctx.strokeStyle = rgba(C.rim, 0.08 + energy * 0.15);
    ctx.lineWidth = 0.9;
    whaleTailPath();
    ctx.stroke();

    // Long pectoral fin — the quiet signature of a humpback.
    ctx.beginPath();
    ctx.moveTo(-17, 33);
    ctx.bezierCurveTo(-34, 45, -51, 60, -61, 78);
    ctx.bezierCurveTo(-42, 73, -20, 64, -1, 50);
    ctx.bezierCurveTo(-5, 44, -11, 38, -17, 33);
    ctx.closePath();
    ctx.fillStyle = rgba(C.whale, bodyAlpha * 0.78);
    ctx.fill();
    ctx.strokeStyle = rgba(C.rim, 0.075 + energy * 0.16);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Soft reflected light along the belly.
    ctx.beginPath();
    ctx.moveTo(-136, 19);
    ctx.bezierCurveTo(-98, 35, -46, 41, 2, 38);
    ctx.bezierCurveTo(45, 35, 76, 28, 101, 18);
    ctx.bezierCurveTo(72, 41, 25, 47, -8, 43);
    ctx.bezierCurveTo(-61, 38, -111, 31, -136, 19);
    ctx.closePath();
    ctx.fillStyle = rgba(C.rim, 0.04 + energy * 0.08);
    ctx.fill();

    // Ventral grooves.
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-151 + i * 4, 13 + i * 1.5);
      ctx.quadraticCurveTo(-124 + i * 5, 30 + i * 1.5, -100 + i * 8, 31 + i);
      ctx.strokeStyle = rgba(C.rim, 0.035 + energy * 0.035);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(-131, -9, 2.1, 0, TAU);
    ctx.fillStyle = rgba(C.rim, 0.32 + energy * 0.35);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-156, 9);
    ctx.quadraticCurveTo(-143, 16, -128, 14);
    ctx.strokeStyle = rgba(C.rim, 0.1 + energy * 0.2);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    const glimmerCount = 13;
    for (let i = 0; i < glimmerCount; i += 1) {
      const gx = -112 + i * 17.2;
      const gy = -29 + Math.sin(i * 1.5) * 6;
      const flicker = 0.5 + 0.5 * Math.sin(state.env * 1.1 + i * 1.7);
      const lightAlpha =
        (state.themeName === "abyss" ? 0.2 : 0.075) + energy * 0.4 * flicker;
      ctx.beginPath();
      ctx.arc(gx, gy, 0.9 + (i % 3) * 0.25, 0, TAU);
      ctx.fillStyle = rgba(C.rim, lightAlpha);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawRays() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < 6; i += 1) {
      const phase = i * 1.72 + 0.8;
      const xTop = W * (0.03 + i * 0.178) + Math.sin(state.env * 0.05 + phase) * W * 0.04;
      const drift = Math.sin(state.env * 0.073 + phase * 1.8) * W * 0.045;
      const topWidth = W * (0.01 + (i % 3) * 0.012);
      const bottomWidth = W * (0.1 + (i % 4) * 0.035);
      const xBottom = xTop + W * 0.1 + drift - W * 0.018 * i;
      const yBottom = H * (0.72 + (i % 3) * 0.055);
      const strength = 0.7 + 0.3 * Math.sin(state.env * 0.22 + phase);
      const beam = ctx.createLinearGradient(xTop, 0, xBottom, yBottom);
      beam.addColorStop(0, rgba(C.ray, 0.15 * strength));
      beam.addColorStop(0.28, rgba(C.ray, 0.078 * strength));
      beam.addColorStop(0.72, rgba(C.ray, 0.02 * strength));
      beam.addColorStop(1, rgba(C.ray, 0));

      ctx.beginPath();
      ctx.moveTo(xTop - topWidth, -H * 0.04);
      ctx.lineTo(xTop + topWidth, -H * 0.04);
      ctx.lineTo(xBottom + bottomWidth, yBottom);
      ctx.lineTo(xBottom - bottomWidth, yBottom);
      ctx.closePath();
      ctx.fillStyle = beam;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xTop - topWidth * 0.32, -H * 0.04);
      ctx.lineTo(xTop + topWidth * 0.32, -H * 0.04);
      ctx.lineTo(xBottom + bottomWidth * 0.27, yBottom);
      ctx.lineTo(xBottom - bottomWidth * 0.27, yBottom);
      ctx.closePath();
      const core = ctx.createLinearGradient(xTop, 0, xBottom, yBottom);
      core.addColorStop(0, rgba(C.light, 0.075 * strength));
      core.addColorStop(0.5, rgba(C.light, 0.022 * strength));
      core.addColorStop(1, rgba(C.light, 0));
      ctx.fillStyle = core;
      ctx.fill();
    }
    ctx.restore();
  }

  function floorY(x) {
    return (
      H * 0.888 +
      Math.sin(x * 0.0042 + 0.8) * H * 0.026 +
      Math.sin(x * 0.011 + 2.1) * H * 0.013
    );
  }

  function traceFloor() {
    ctx.beginPath();
    ctx.moveTo(0, floorY(0));
    for (let x = 24; x <= W + 24; x += 24) ctx.lineTo(x, floorY(x));
    ctx.lineTo(W, H + 10);
    ctx.lineTo(0, H + 10);
    ctx.closePath();
  }

  function drawRidge(baseY, amplitude, phase, color, alpha) {
    ctx.beginPath();
    ctx.moveTo(0, baseY + Math.sin(phase) * amplitude);
    for (let x = 24; x <= W + 24; x += 24) {
      const y =
        baseY +
        Math.sin(x * 0.0055 + phase) * amplitude +
        Math.sin(x * 0.013 + phase * 1.7) * amplitude * 0.36;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H + 10);
    ctx.lineTo(0, H + 10);
    ctx.closePath();
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
  }

  function drawRock(x, y, rx, ry, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = rgba(C.rock, alpha);
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx * 0.98, -ry * 0.5, -rx * 0.55, -ry, -rx * 0.12, -ry * 0.92);
    ctx.bezierCurveTo(rx * 0.35, -ry * 0.84, rx * 0.85, -ry * 0.62, rx, -ry * 0.12);
    ctx.bezierCurveTo(rx * 1.04, ry * 0.22, rx * 0.55, ry * 0.42, 0, ry * 0.4);
    ctx.bezierCurveTo(-rx * 0.6, ry * 0.38, -rx * 0.96, ry * 0.22, -rx, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-rx * 0.8, -ry * 0.32);
    ctx.bezierCurveTo(-rx * 0.48, -ry * 0.7, -rx * 0.05, -ry * 0.78, rx * 0.36, -ry * 0.6);
    ctx.strokeStyle = rgba(C.rim, 0.075);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawSeabed() {
    drawRidge(H * 0.785, H * 0.012, 0.4, C.sandFar, 0.14);
    drawRidge(H * 0.832, H * 0.016, 2.2, C.sandFar, 0.28);

    traceFloor();
    const floorGradient = ctx.createLinearGradient(0, H * 0.84, 0, H);
    floorGradient.addColorStop(0, rgba(C.sandFar, 0.76));
    floorGradient.addColorStop(0.38, rgba(C.sandNear, 0.88));
    floorGradient.addColorStop(1, rgba(C.sandNear, 0.98));
    ctx.fillStyle = floorGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, floorY(0));
    for (let x = 24; x <= W + 24; x += 24) ctx.lineTo(x, floorY(x));
    ctx.strokeStyle = rgba(C.rim, 0.1);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.save();
    ctx.clip();

    const floorGlow = ctx.createRadialGradient(
      W * 0.66,
      H * 0.9,
      0,
      W * 0.66,
      H * 0.9,
      W * 0.55
    );
    floorGlow.addColorStop(0, rgba(C.light, 0.16));
    floorGlow.addColorStop(0.45, rgba(C.light, 0.06));
    floorGlow.addColorStop(1, rgba(C.light, 0));
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 28) {
        const y =
          H * 0.86 +
          i * H * 0.019 +
          Math.sin(x * 0.008 + state.env * 0.22 + i * 0.95) * 7 +
          Math.sin(x * 0.019 - state.env * 0.16 + i * 1.7) * 3.4;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(C.light, 0.035 + (i % 3) * 0.01);
      ctx.lineWidth = 13;
      ctx.stroke();
      ctx.strokeStyle = rgba(C.light, 0.065 + (i % 2) * 0.02);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    for (const dot of sandDots) {
      ctx.beginPath();
      ctx.arc(dot.nx * W, dot.ny * H, dot.r, 0, TAU);
      ctx.fillStyle = rgba(dot.warm ? C.light : C.bubble, dot.alpha * 1.35);
      ctx.fill();
    }
    ctx.restore();

    drawRock(W * 0.17, H * 0.895, W * 0.04, H * 0.03, 0.52);
    drawRock(W * 0.23, H * 0.9, W * 0.022, H * 0.017, 0.35);
    drawRock(W * 0.73, H * 0.875, W * 0.05, H * 0.026, 0.24);
    drawRock(W * 0.985, H * 0.89, W * 0.055, H * 0.04, 0.55);
    drawRock(W * 0.62, H * 0.918, W * 0.025, H * 0.014, 0.24);

    kelpStems.forEach(drawKelp);
    seaFans.forEach(drawSeaFan);
    corals.forEach(drawCoral);
    drawGroundLights();
    anemones.forEach(drawAnemone);
    grassBlades.forEach(drawGrassBlade);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const bottomMist = ctx.createLinearGradient(0, H * 0.88, 0, H);
    bottomMist.addColorStop(0, rgba(C.haze, 0));
    bottomMist.addColorStop(1, rgba(C.haze, 0.03));
    ctx.fillStyle = bottomMist;
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.restore();
  }

  function drawKelp(stem) {
    const points = [];
    const segments = 12;
    for (let i = 0; i <= segments; i += 1) {
      const p = i / segments;
      const sway =
        Math.sin(state.env * 0.48 + stem.phase + p * 2.7) * stem.w * 2.2 * p * p +
        Math.sin(state.env * 0.18 + stem.phase) * stem.w * 0.6 * p;
      points.push({
        x: stem.x + sway,
        y: stem.baseY - stem.h * p,
        p,
      });
    }

    ctx.save();
    ctx.globalAlpha = stem.alpha;
    ctx.lineCap = "round";

    for (let i = 0; i < segments; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = rgba(C.kelp, 0.42 + (1 - a.p) * 0.24);
      ctx.lineWidth = lerp(stem.w, 0.7, a.p);
      ctx.stroke();
    }

    for (let i = 2; i < segments - 1; i += 1) {
      const point = points[i];
      const p = point.p;
      const side = i % 2 === 0 ? 1 : -1;
      const angle =
        -Math.PI / 2 +
        side * (0.69 + Math.sin(state.env * 0.38 + stem.phase + i * 0.8) * 0.075);
      const length =
        stem.h *
        0.145 *
        (1 - p * 0.5) *
        (0.78 + 0.25 * Math.sin(i * 1.7 + stem.phase));
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const perpX = -dirY;
      const perpY = dirX;
      const bend = side * length * 0.19;

      const tipX = point.x + dirX * length + perpX * bend;
      const tipY = point.y + dirY * length + perpY * bend;
      const c1x = point.x + dirX * length * 0.35 + perpX * length * 0.26;
      const c1y = point.y + dirY * length * 0.35 + perpY * length * 0.26;
      const c2x = point.x + dirX * length * 0.79 + perpX * length * 0.17;
      const c2y = point.y + dirY * length * 0.79 + perpY * length * 0.17;
      const c3x = point.x + dirX * length * 0.76 - perpX * length * 0.12;
      const c3y = point.y + dirY * length * 0.76 - perpY * length * 0.12;
      const c4x = point.x + dirX * length * 0.28 - perpX * length * 0.09;
      const c4y = point.y + dirY * length * 0.28 - perpY * length * 0.09;

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY);
      ctx.bezierCurveTo(c3x, c3y, c4x, c4y, point.x, point.y);
      ctx.fillStyle =
        i % 3 === 0
          ? rgba(C.kelpLight, 0.24 + stem.tone * 0.1)
          : rgba(C.kelp, 0.64 + stem.tone * 0.18);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo(c1x, c1y, tipX, tipY);
      ctx.strokeStyle = rgba(C.kelpLight, 0.16);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawGrassBlade(blade) {
    const sway =
      Math.sin(state.env * 0.65 + blade.phase) * blade.sway +
      Math.sin(state.env * 0.22 + blade.phase * 1.4) * blade.sway * 0.35;
    ctx.beginPath();
    ctx.moveTo(blade.x, blade.baseY);
    ctx.quadraticCurveTo(
      blade.x + sway * 0.22,
      blade.baseY - blade.h * 0.56,
      blade.x + sway,
      blade.baseY - blade.h
    );
    ctx.strokeStyle = rgba(C.grass, blade.alpha);
    ctx.lineWidth = blade.width;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawSeaFan(fan) {
    ctx.save();
    ctx.translate(fan.x, fan.y);
    ctx.rotate(Math.sin(state.env * 0.24 + fan.phase) * 0.018);
    ctx.scale(fan.flip, 1);

    const w = fan.size * 0.92;
    const h = fan.size * 1.16;
    const fanGradient = ctx.createRadialGradient(0, -h * 0.18, 0, 0, -h * 0.38, w * 1.25);
    fanGradient.addColorStop(0, rgba(C.coral, 0.12));
    fanGradient.addColorStop(0.55, rgba(C.coral, 0.05));
    fanGradient.addColorStop(1, rgba(C.coral, 0.012));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w * 0.32, -h * 0.1, -w * 0.92, -h * 0.45, -w * 0.78, -h * 0.83);
    ctx.bezierCurveTo(-w * 0.62, -h * 1.1, -w * 0.17, -h * 1.17, w * 0.12, -h * 1.08);
    ctx.bezierCurveTo(w * 0.66, -h * 0.9, w * 0.9, -h * 0.48, w * 0.28, -h * 0.02);
    ctx.closePath();
    ctx.fillStyle = fanGradient;
    ctx.fill();
    ctx.strokeStyle = rgba(C.coral, 0.22);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    const ribCount = 9;
    for (let i = 0; i < ribCount; i += 1) {
      const t = (i / (ribCount - 1)) * 2 - 1;
      const endX = t * w * 0.76;
      const endY = -h * (1.06 - Math.abs(t) * 0.28);
      const controlX = endX * 0.28 + Math.sin(i * 1.4 + fan.phase) * w * 0.035;
      const controlY = -h * 0.45;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      ctx.strokeStyle = rgba(C.coral, 0.36 + (1 - Math.abs(t)) * 0.14);
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // A few fine side twigs make the fan feel woven rather than skeletal.
      if (i > 0 && i < ribCount - 1) {
        const midX = lerp(0, endX, 0.58);
        const midY = lerp(0, endY, 0.7);
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.quadraticCurveTo(
          midX + t * w * 0.14,
          midY + h * 0.04,
          midX + t * w * 0.23,
          midY - h * 0.06
        );
        ctx.strokeStyle = rgba(C.coral, 0.18);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      const pulse = 0.55 + 0.45 * Math.sin(state.env * 1.05 + i * 0.8 + fan.phase);
      ctx.beginPath();
      ctx.arc(endX, endY, 1.2 + (i % 2) * 0.45, 0, TAU);
      ctx.fillStyle = rgba(C.coralGlow, 0.2 + pulse * 0.3);
      ctx.fill();
      if (i % 2 === 0) drawGlow(GLOW.warm, endX, endY, 13, 0.035 + pulse * 0.035);
    }

    ctx.restore();
  }

  function drawCoral(coral) {
    const swayScale = 0.75;
    for (const segment of coral.segments) {
      const sway = Math.sin(state.env * 0.5 + coral.phase + segment.phase) * swayScale;
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.quadraticCurveTo(segment.cx + sway, segment.cy, segment.x2 + sway, segment.y2);
      ctx.strokeStyle = rgba(C.coral, segment.alpha);
      ctx.lineWidth = segment.width;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const tip of coral.tips) {
      const pulse = 0.65 + 0.35 * Math.sin(state.env * 1.2 + tip.phase);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, tip.r, 0, TAU);
      ctx.fillStyle = rgba(C.coralGlow, 0.22 + pulse * 0.25);
      ctx.fill();
      if (tip.r > 1.35) {
        drawGlow(GLOW.warm, tip.x, tip.y, 14, 0.05 * pulse);
      }
    }
    ctx.restore();
  }

  function drawGroundLights() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const light of groundLights) {
      const pulse = 0.55 + 0.45 * Math.sin(state.env * 1.15 + light.phase);
      if (light.stem > 0) {
        const sway = Math.sin(state.env * 0.6 + light.phase) * 2.2;
        ctx.beginPath();
        ctx.moveTo(light.x, light.y + 10);
        ctx.quadraticCurveTo(light.x + sway * 0.4, light.y + 3, light.x + sway, light.y);
        ctx.strokeStyle = rgba(C.kelpLight, 0.12 + pulse * 0.07);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      drawGlow(
        light.warm ? GLOW.warm : GLOW.aqua,
        light.x,
        light.y - light.stem,
        light.r * 10,
        0.04 + pulse * 0.08
      );
      ctx.beginPath();
      ctx.arc(light.x, light.y - light.stem, light.r, 0, TAU);
      ctx.fillStyle = rgba(light.warm ? C.coralGlow : C.mote, 0.28 + pulse * 0.36);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAnemone(anemone) {    const tentacles = 13;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < tentacles; i += 1) {
      const side = i / (tentacles - 1) - 0.5;
      const angle = -Math.PI / 2 + side * 1.55;
      const length =
        anemone.size *
        (0.7 + 0.35 * Math.sin(i * 1.3 + anemone.phase)) *
        (0.72 + 0.32 * Math.cos(side * Math.PI));
      const sway = Math.sin(state.env * 0.8 + anemone.phase + i * 0.7) * anemone.size * 0.16;
      const tipX = anemone.x + Math.cos(angle) * length + sway;
      const tipY = anemone.y + Math.sin(angle) * length;
      const controlX = anemone.x + Math.cos(angle) * length * 0.48 + sway * 0.45;
      const controlY = anemone.y + Math.sin(angle) * length * 0.55;

      ctx.beginPath();
      ctx.moveTo(anemone.x + side * anemone.size * 0.18, anemone.y);
      ctx.quadraticCurveTo(controlX, controlY, tipX, tipY);
      ctx.strokeStyle = rgba(C.jelly, 0.17);
      ctx.lineWidth = Math.max(0.65, anemone.size * 0.025);
      ctx.stroke();

      const pulse = 0.55 + 0.45 * Math.sin(state.env * 1.1 + i * 0.9 + anemone.phase);
      ctx.beginPath();
      ctx.arc(tipX, tipY, Math.max(0.65, anemone.size * 0.023), 0, TAU);
      ctx.fillStyle = rgba(C.coralGlow, 0.22 + pulse * 0.24);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFishSchool() {
    for (const item of fish) {
      const y =
        item.baseY +
        Math.sin(state.env * item.freq + item.phase) * item.amp +
        item.oy;
      const x = item.x + item.ox;
      const s = item.size * (W < 620 ? 0.9 : 1);
      const wag = Math.sin(state.env * 4.2 + item.phase) * 0.72;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(item.dir, 1);
      ctx.globalAlpha = clamp(item.alpha, 0, 0.9);

      const bodyColor = item.warm ? C.fishWarm : C.fish;
      ctx.fillStyle = rgba(bodyColor, 0.92);

      ctx.beginPath();
      ctx.moveTo(-2.4 * s, 0);
      ctx.bezierCurveTo(-1.7 * s, -1.15 * s, 1.3 * s, -1.08 * s, 3.05 * s, 0);
      ctx.bezierCurveTo(1.3 * s, 1.08 * s, -1.7 * s, 1.15 * s, -2.4 * s, 0);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-2.2 * s, 0);
      ctx.quadraticCurveTo(-3.15 * s, -1.25 * s - wag * 0.38 * s, -4.15 * s, -1.1 * s - wag * 0.5 * s);
      ctx.quadraticCurveTo(-3.45 * s, 0, -4.15 * s, 1.1 * s - wag * 0.5 * s);
      ctx.quadraticCurveTo(-3.15 * s, 1.25 * s - wag * 0.38 * s, -2.2 * s, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-0.4 * s, -0.6 * s);
      ctx.quadraticCurveTo(0.3 * s, -1.65 * s, 0.95 * s, -0.5 * s);
      ctx.closePath();
      ctx.fillStyle = rgba(bodyColor, 0.64);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0.4 * s, 0.18 * s);
      ctx.quadraticCurveTo(1.7 * s, 0.55 * s, 2.82 * s, 0.05 * s);
      ctx.strokeStyle = rgba(C.rim, 0.23);
      ctx.lineWidth = Math.max(0.4, s * 0.2);
      ctx.stroke();

      if (s > 2.7) {
        ctx.beginPath();
        ctx.arc(2.1 * s, -0.18 * s, Math.max(0.35, s * 0.15), 0, TAU);
        ctx.fillStyle = rgba(C.bgDeep, 0.68);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawJellyfish() {
    for (const jelly of jellies) {
      const r = jelly.r;
      const bellPulse = 1 + Math.sin(state.env * 1.35 + jelly.phase) * 0.055 + jelly.energy * 0.12;
      const tilt = Math.sin(state.env * 0.36 + jelly.phase * 1.3) * 0.045;

      drawGlow(GLOW.lilac, jelly.x, jelly.y + r * 0.2, r * 5.8, (0.06 + jelly.energy * 0.1) * jelly.alpha);

      ctx.save();
      ctx.translate(jelly.x, jelly.y + r * 0.08);
      ctx.rotate(tilt);
      ctx.globalAlpha = jelly.alpha;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const innerGlow = ctx.createRadialGradient(0, -r * 0.45, 0, 0, -r * 0.2, r * 1.45);
      innerGlow.addColorStop(0, rgba(C.jellyCore, 0.2 + jelly.energy * 0.1));
      innerGlow.addColorStop(0.4, rgba(C.jelly, 0.07));
      innerGlow.addColorStop(1, rgba(C.jelly, 0));
      ctx.fillStyle = innerGlow;
      ctx.fillRect(-r * 1.5, -r * 1.6, r * 3, r * 3);
      ctx.restore();

      const tentacleCount = 9;
      ctx.lineCap = "round";
      for (let i = 0; i < tentacleCount; i += 1) {
        const spread = i / (tentacleCount - 1) - 0.5;
        const startX = spread * r * 1.35;
        const length =
          r * (2.3 + 1.4 * (0.5 + 0.5 * Math.sin(i * 1.9 + jelly.driftPhase)));
        const wave = Math.sin(state.env * 0.95 + jelly.phase + i * 0.82);
        const wave2 = Math.sin(state.env * 0.55 + jelly.phase * 0.7 + i * 1.1);
        ctx.beginPath();
        ctx.moveTo(startX, r * 0.12);
        ctx.bezierCurveTo(
          startX + wave * r * 0.32,
          r * 0.9,
          startX + wave2 * r * 0.95,
          r * 1.85,
          startX + wave * r * 1.1,
          length
        );
        ctx.strokeStyle = rgba(C.jelly, 0.16 + (i % 3) * 0.025);
        ctx.lineWidth = r * (0.015 + (i % 2) * 0.006);
        ctx.stroke();
      }

      for (let i = 0; i < 3; i += 1) {
        const offset = (i - 1) * r * 0.24;
        const wave = Math.sin(state.env * 0.7 + jelly.phase + i * 1.4);
        ctx.beginPath();
        ctx.moveTo(offset, r * 0.1);
        ctx.bezierCurveTo(
          offset + wave * r * 0.2,
          r * 1.1,
          offset - wave * r * 0.55,
          r * 2.1,
          offset + wave * r * 0.5,
          r * 3.1
        );
        ctx.strokeStyle = rgba(C.jellyCore, 0.055 + jelly.energy * 0.03);
        ctx.lineWidth = r * 0.12;
        ctx.stroke();
      }

      ctx.save();
      ctx.scale(bellPulse, 1 / bellPulse);
      const bell = ctx.createRadialGradient(-r * 0.28, -r * 0.58, r * 0.08, 0, -r * 0.18, r * 1.25);
      bell.addColorStop(0, rgba(C.jellyCore, 0.52 + jelly.energy * 0.1));
      bell.addColorStop(0.34, rgba(C.jelly, 0.25));
      bell.addColorStop(0.8, rgba(C.jelly, 0.09));
      bell.addColorStop(1, rgba(C.jelly, 0.02));

      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r * 1.04, -r * 0.46, -r * 0.73, -r * 1.17, 0, -r * 1.2);
      ctx.bezierCurveTo(r * 0.73, -r * 1.17, r * 1.04, -r * 0.46, r, 0);
      ctx.quadraticCurveTo(r * 0.72, r * 0.22, r * 0.38, r * 0.04);
      ctx.quadraticCurveTo(r * 0.1, r * 0.22, -r * 0.18, r * 0.04);
      ctx.quadraticCurveTo(-r * 0.56, r * 0.23, -r, 0);
      ctx.closePath();
      ctx.fillStyle = bell;
      ctx.fill();

      ctx.strokeStyle = rgba(C.jellyCore, 0.38 + jelly.energy * 0.22);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.48);
      ctx.bezierCurveTo(-r * 0.5, -r * 1.03, r * 0.5, -r * 1.03, r * 0.7, -r * 0.48);
      ctx.strokeStyle = rgba(C.jellyCore, 0.12);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.35, r * 0.28, 0, TAU);
      ctx.arc(r * 0.3, -r * 0.33, r * 0.23, 0, TAU);
      ctx.fillStyle = rgba(C.jellyCore, 0.09);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    }
  }

  function drawBubbles() {
    ctx.save();
    for (const bubble of bubbles) {
      const wobble = Math.sin(state.env * 1.1 + bubble.phase) * 0.9;
      const alpha = bubble.alpha * (0.72 + 0.28 * Math.sin(state.env * 1.4 + bubble.phase));
      if (bubble.glow) {
        ctx.globalCompositeOperation = "lighter";
        drawGlow(GLOW.aqua, bubble.x, bubble.y, bubble.r * 10, alpha * 0.12);
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.beginPath();
      ctx.ellipse(bubble.x + wobble, bubble.y, bubble.r, bubble.r * 1.05, 0, 0, TAU);
      ctx.fillStyle = rgba(C.bubble, 0.024);
      ctx.fill();
      ctx.strokeStyle = rgba(C.bubble, alpha * 0.7);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        bubble.x + wobble - bubble.r * 0.3,
        bubble.y - bubble.r * 0.32,
        Math.max(0.4, bubble.r * 0.19),
        0,
        TAU
      );
      ctx.fillStyle = rgba(C.bubble, alpha * 0.72);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMotes() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const mote of motes) {
      const twinkle = 0.55 + 0.45 * Math.sin(state.env * 0.9 + mote.phase);
      const alpha = mote.alpha * twinkle;
      if (mote.z > 0.68) {
        drawGlow(mote.warm ? GLOW.warm : GLOW.aqua, mote.x, mote.y, mote.r * 9, alpha * 0.34);
      }
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r * (0.7 + mote.z * 0.6), 0, TAU);
      ctx.fillStyle = rgba(mote.warm ? C.mote : C.bubble, alpha * 0.85);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSparkles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const sparkle of sparkles) {
      const lifeRatio = clamp(sparkle.life / sparkle.maxLife, 0, 1);
      const alpha = Math.sin(lifeRatio * Math.PI) * 0.82;
      const sprite = sparkle.tint === "warm" ? GLOW.warm : GLOW.aqua;
      const size = sparkle.size * (sparkle.glimmer ? 7 : 3.5);
      drawGlow(sprite, sparkle.x, sparkle.y, size, alpha * (sparkle.glimmer ? 0.62 : 0.32));
      ctx.beginPath();
      ctx.arc(sparkle.x, sparkle.y, Math.max(0.4, sparkle.size * 0.42), 0, TAU);
      ctx.fillStyle = rgba(C.jellyCore, alpha * 0.82);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRipples() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ripple of ripples) {
      const age = state.time - ripple.start;
      if (age < 0 || age > 2.5) continue;

      for (let i = 0; i < 3; i += 1) {
        const p = clamp((age - i * 0.13) / 1.85, 0, 1);
        if (p <= 0 || p >= 1) continue;
        const radius = (28 + easeOutCubic(p) * 205) * ripple.strength;
        const alpha = Math.pow(1 - p, 2) * 0.22;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, TAU);
        ctx.strokeStyle = rgba(C.bubble, alpha);
        ctx.lineWidth = 1.2 * (1 - p) + 0.25;
        ctx.stroke();
      }

      const bloom = clamp(age / 1.3, 0, 1);
      const bloomRadius = 18 + easeOutCubic(bloom) * 150;
      const bloomGradient = ctx.createRadialGradient(
        ripple.x,
        ripple.y,
        0,
        ripple.x,
        ripple.y,
        bloomRadius
      );
      bloomGradient.addColorStop(0, rgba(C.light, (1 - bloom) * 0.1));
      bloomGradient.addColorStop(0.45, rgba(C.light, (1 - bloom) * 0.025));
      bloomGradient.addColorStop(1, rgba(C.light, 0));
      ctx.fillStyle = bloomGradient;
      ctx.fillRect(
        ripple.x - bloomRadius,
        ripple.y - bloomRadius,
        bloomRadius * 2,
        bloomRadius * 2
      );
    }
    ctx.restore();
  }

  function drawPointerAura() {
    if (!state.pointer.active || state.breath.active) return;
    const pointer = state.pointer;
    const pulse = 0.5 + 0.5 * Math.sin(state.env * 1.7);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
    aura.addColorStop(0, rgba(C.mote, 0.055 + pulse * 0.018));
    aura.addColorStop(0.4, rgba(C.mote, 0.018));
    aura.addColorStop(1, rgba(C.mote, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 18 + pulse * 2.5, 0, TAU);
    ctx.strokeStyle = rgba(C.bubble, 0.15 + pulse * 0.05);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    for (let i = 0; i < 3; i += 1) {
      const angle = state.env * 0.4 + i * (TAU / 3);
      const orbit = 28 + Math.sin(state.env * 0.8 + i) * 4;
      ctx.beginPath();
      ctx.arc(
        pointer.x + Math.cos(angle) * orbit,
        pointer.y + Math.sin(angle) * orbit,
        1.1,
        0,
        TAU
      );
      ctx.fillStyle = rgba(C.mote, 0.32);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBokehLayer() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const blob of bokeh) {
      const x = blob.nx * W + Math.sin(state.env * 0.12 + blob.nx * 9) * 9;
      const y = blob.ny * H + Math.sin(state.env * 0.09 + blob.ny * 7) * 5;
      const sprite =
        blob.kind === "warm" ? GLOW.warm : blob.kind === "lilac" ? GLOW.lilac : GLOW.aqua;
      drawGlow(sprite, x, y, blob.size, blob.alpha);
    }
    ctx.restore();
  }

  function drawWetEdge() {
    const edge = ctx.createLinearGradient(0, H * 0.93, 0, H);
    edge.addColorStop(0, rgba(C.bgDeep, 0));
    edge.addColorStop(1, rgba(C.bgDeep, 0.22));
    ctx.fillStyle = edge;
    ctx.fillRect(0, H * 0.93, W, H * 0.07);
  }

  /* ------------------------------------------------------------------ */
  /*  Scene update                                                      */
  /* ------------------------------------------------------------------ */

  function updateScene(dt) {
    const pointer = state.pointer;
    const smoothing = 1 - Math.pow(0.001, dt);
    pointer.x += (pointer.tx - pointer.x) * smoothing;
    pointer.y += (pointer.ty - pointer.y) * smoothing;

    if (pointer.active) {
      for (const fishItem of fish) {
        const fy =
          fishItem.baseY +
          Math.sin(state.env * fishItem.freq + fishItem.phase) * fishItem.amp +
          fishItem.oy;
        const dx = fishItem.x + fishItem.ox - pointer.x;
        const dy = fy - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 150 && distance > 0.1) {
          const force = (1 - distance / 150) * 34 * dt;
          fishItem.ox += (dx / distance) * force;
          fishItem.oy += (dy / distance) * force * 0.75;
        }
      }
    }

    const fishDamping = Math.pow(0.42, dt);
    for (const fishItem of fish) {
      fishItem.x += fishItem.dir * fishItem.speed * dt;
      fishItem.ox *= fishDamping;
      fishItem.oy *= Math.pow(0.35, dt);
      if (fishItem.x > W + 90) {
        fishItem.x = -90;
        fishItem.baseY = H * rand(0.22, 0.75);
      } else if (fishItem.x < -90) {
        fishItem.x = W + 90;
        fishItem.baseY = H * rand(0.22, 0.75);
      }
    }

    for (const mote of motes) {
      mote.y -= (mote.speed * (0.35 + mote.z)) * dt;
      mote.x += Math.sin(state.env * mote.freq + mote.phase) * mote.drift * dt;
      if (mote.y < -12) {
        mote.y = H + 12;
        mote.x = rand(0, W);
      }
      if (mote.x < -10) mote.x = W + 10;
      if (mote.x > W + 10) mote.x = -10;
    }

    for (let i = bubbles.length - 1; i >= 0; i -= 1) {
      const bubble = bubbles[i];
      bubble.vy += (bubble.rise - bubble.vy) * Math.min(1, dt * 1.15);
      bubble.vx *= Math.pow(0.33, dt);
      bubble.x += (bubble.vx + Math.sin(state.env * 0.9 + bubble.phase) * 7) * dt;
      bubble.y += bubble.vy * dt;

      if (bubble.y < -35 || bubble.x < -45 || bubble.x > W + 45) {
        if (bubble.ephemeral) {
          bubbles.splice(i, 1);
        } else {
          Object.assign(bubble, makeBaseBubble(false));
        }
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i -= 1) {
      const sparkle = sparkles[i];
      sparkle.life -= dt;
      if (sparkle.life <= 0) {
        sparkles.splice(i, 1);
        continue;
      }
      sparkle.x += sparkle.vx * dt;
      sparkle.y += sparkle.vy * dt;
      sparkle.vx *= Math.pow(0.2, dt);
      sparkle.vy = sparkle.vy * Math.pow(0.28, dt) - 5 * dt;
    }

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      if (state.time - ripples[i].start > 2.6) ripples.splice(i, 1);
    }

    for (const jelly of jellies) {
      const targetX = jelly.nx * W + Math.sin(state.env * 0.17 + jelly.phase) * W * 0.018;
      const targetY = jelly.ny * H + Math.sin(state.env * 0.27 + jelly.phase * 1.7) * H * 0.017;
      let pushX = 0;
      let pushY = 0;

      if (pointer.active) {
        const dx = targetX - pointer.x;
        const dy = targetY - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 0.1) {
          const push = Math.pow(1 - distance / 190, 2) * 92;
          pushX = (dx / distance) * push;
          pushY = (dy / distance) * push * 0.65;
          jelly.energy = Math.min(0.45, jelly.energy + dt * 0.28);
        }
      }

      jelly.x += (targetX + pushX - jelly.x) * (1 - Math.pow(0.08, dt));
      jelly.y += (targetY + pushY - jelly.y) * (1 - Math.pow(0.12, dt));
      jelly.energy = Math.max(0, jelly.energy - dt * 0.13);
    }

    if (pointer.active) {
      const whaleDistance = Math.hypot(pointer.x - currentWhale.x, pointer.y - currentWhale.y);
      if (whaleDistance < currentWhale.scale * 210) {
        state.whaleEnergy = Math.min(0.42, state.whaleEnergy + dt * 0.16);
      }
    }
    state.whaleEnergy = Math.max(0, state.whaleEnergy - dt * 0.11);

    for (const blade of grassBlades) {
      blade.phase += dt * 0.002;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Main render loop                                                  */
  /* ------------------------------------------------------------------ */

  function render() {
    drawBackground();
    drawWhale();
    drawRays();
    drawSeabed();
    drawFishSchool();
    drawJellyfish();
    drawMotes();
    drawBubbles();
    drawBokehLayer();
    drawSparkles();
    drawRipples();
    drawPointerAura();
    drawWetEdge();
  }

  let lastFrame = performance.now();

  function frame(now) {
    const rawDt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;
    const sceneSpeed = state.breath.active ? 0.32 : 1;
    state.dt = rawDt * sceneSpeed;
    state.time += rawDt;
    state.env += state.dt;

    updateTheme(now);
    updateScene(state.dt);
    updateBreathing(now);
    render();

    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /*  UI events                                                         */
  /* ------------------------------------------------------------------ */

  function enterOcean() {
    if (state.exploring) return;
    state.exploring = true;
    els.body.classList.add("is-exploring");
    els.brandBtn.title = "回到开篇";
    els.liveRegion.textContent = "已潜入深海。移动指针唤醒微光，点击泛起涟漪。";
    addRipple(W * 0.62, H * 0.42, 1.3);
    spawnBubbleBurst(W * 0.62, H * 0.42, 20);
    spawnSparkBurst(W * 0.62, H * 0.42, 24, 1.2);
    if (audio.on) playChime(392, 6, 0.035);
  }

  function restoreIntro() {
    if (!state.exploring) {
      addRipple(W * 0.5, H * 0.45, 0.7);
      return;
    }
    state.exploring = false;
    els.body.classList.remove("is-exploring");
    els.brandBtn.title = "回到开篇";
    els.liveRegion.textContent = "回到海面。";
    addRipple(W * 0.55, H * 0.45, 0.9);
  }

  els.enterBtn.addEventListener("click", enterOcean);
  els.brandBtn.addEventListener("click", restoreIntro);
  els.breatheBtn.addEventListener("click", openBreathing);
  els.miniBreatheBtn.addEventListener("click", openBreathing);
  els.closeBreathe.addEventListener("click", closeBreathing);
  els.exitBreatheBtn.addEventListener("click", closeBreathing);
  els.soundToggle.addEventListener("click", toggleSound);

  els.themeButtons.forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.theme));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.breath.active) closeBreathing();
      else if (state.exploring) restoreIntro();
    }

    if (event.key === "Tab" && state.breath.active) {
      const focusable = [els.closeBreathe, els.exitBreatheBtn];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
  window.addEventListener("pointerup", handlePointerUp, { passive: true });
  window.addEventListener("pointercancel", handlePointerUp, { passive: true });
  document.addEventListener("pointerleave", () => {
    if (!state.pointer.touch) state.pointer.active = false;
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(resizeCanvas, 160), {
    passive: true,
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) lastFrame = performance.now();
  });

  /* ------------------------------------------------------------------ */
  /*  Boot                                                              */
  /* ------------------------------------------------------------------ */

  resizeCanvas();
  els.body.dataset.theme = state.themeName;
  els.soundToggle.title = "开启环境声音";
  window.requestAnimationFrame(frame);

  function dismissLoader() {
    window.setTimeout(() => {
      els.html.classList.remove("is-loading");
    }, 550);
  }

  if (document.readyState === "complete") dismissLoader();
  else window.addEventListener("load", dismissLoader, { once: true });
  window.setTimeout(() => els.html.classList.remove("is-loading"), 3000);

  if (prefersReduced) {
    state.pointer.active = false;
  }
})();
