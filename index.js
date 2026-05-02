// ═══════════════════════════════════════════════════════════════════════════════
// F1 2026 ERS HUD — SillyTavern Extension v2
// index.js — no ES module imports, window-global only
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const ID = 'f1-ers-hud';

  // ── Palette ─────────────────────────────────────────────────────────────────

  const MODE_COLORS = {
    NORMAL:   { arc: '#0dcfcf', glow: 'rgba(13,207,207,0.32)',  short: 'NRM' },
    BOOST:    { arc: '#FFB800', glow: 'rgba(255,184,0,0.42)',   short: 'BST' },
    OVERTAKE: { arc: '#00ff88', glow: 'rgba(0,255,136,0.45)',   short: 'OT'  },
  };
  const DEPLOY_CLR   = '#FF8C00';
  const RECHARGE_CLR = '#00D4FF';
  const RAMP_LO = 290, RAMP_HI = 355;

  // ── State ────────────────────────────────────────────────────────────────────

  const state = {
    kmh: 0, gear: 'N', mode: 'NORMAL', aero: 'X',
    deploy: 0, recharge: 0, energy: 85,
    brake: 0, throttle: 0, turn: 1,
    driver: 'DRIVER', open: false,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function energyColor(e) {
    return e > 50 ? '#00ff88' : e > 25 ? '#FFB800' : '#FF4444';
  }
  function mguKPct(kmh) {
    if (kmh <= RAMP_LO) return 100;
    if (kmh >= RAMP_HI) return 0;
    return Math.round((1 - (kmh - RAMP_LO) / (RAMP_HI - RAMP_LO)) * 100);
  }
  function driverCode(name) {
    return name.replace(/[\s\-]/g, '').slice(0, 3).toUpperCase();
  }
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  }

  // ── ST context access ────────────────────────────────────────────────────────

  function getChat() {
    try {
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const ctx = window.SillyTavern.getContext();
        return { chat: ctx.chat || [], name2: ctx.name2 || '' };
      }
    } catch (e) {}
    return {
      chat:  window.chat  || [],
      name2: window.name2 || '',
    };
  }

  async function runQuietPrompt(prompt) {
    if (typeof window.generateQuietPrompt === 'function') {
      return await window.generateQuietPrompt(prompt, false, false);
    }
    throw new Error('generateQuietPrompt not found on window');
  }

  // ── Widget HTML ──────────────────────────────────────────────────────────────

  function buildHTML() {
    const R = 50, C = (2 * Math.PI * R).toFixed(1);
    const trackDash = `${(2*Math.PI*R*0.8).toFixed(1)} ${(2*Math.PI*R*0.2).toFixed(1)}`;
    return `
<div id="f1-hud-panel">
  <div id="f1-parse-indicator"></div>
  <div id="f1-collapse-btn">▶</div>

  <!-- MGU-K + Aero -->
  <div style="display:flex;gap:5px;margin-bottom:6px;">
    <div id="f1-mguk-panel" style="display:flex;flex-direction:column;gap:4px;padding:5px 7px;border:1px solid #0a1a1a;border-radius:3px;background:rgba(0,6,8,.9);min-width:108px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:#0a4545;">MGU-K</span>
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span id="f1-ramp-label" style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a3a3a;">FULL</span>
          <span id="f1-ramp-pct" style="font-family:'Share Tech Mono',monospace;font-size:8px;color:#00D4FF;">100%</span>
        </div>
        <div style="height:4px;background:#041010;border-radius:1px;overflow:hidden;border:1px solid #0a1414;position:relative;">
          <div id="f1-ramp-glow" style="position:absolute;top:0;left:0;height:100%;filter:blur(3px);opacity:.3;background:#00D4FF;width:100%;transition:width .3s,background .5s;"></div>
          <div id="f1-ramp-fill" style="position:absolute;top:0;left:0;height:100%;background:#00D4FF;width:100%;transition:width .3s,background .5s;"></div>
        </div>
      </div>
      <div id="f1-derating-box" style="display:flex;align-items:center;gap:3px;padding:2px 4px;border-radius:2px;border:1px solid #0a1414;background:transparent;transition:all .3s;">
        <div id="f1-derating-dot" style="width:4px;height:4px;border-radius:50%;flex-shrink:0;background:#0a1c1c;transition:background .3s,box-shadow .3s;"></div>
        <span id="f1-derating-label" style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a2a2a;">NOMINAL</span>
      </div>
    </div>

    <div id="f1-aero-panel" style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 6px;border:1px solid #0dcfcf28;border-radius:3px;background:rgba(0,6,8,.9);min-width:70px;transition:border-color .4s,box-shadow .4s;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:#0a5050;">AERO</span>
      <svg width="52" height="38" viewBox="0 0 52 38">
        <defs>
          <filter id="ag3" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="0.6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <style>.f1-rw-flap{transform-box:fill-box;transform-origin:0% 50%;transition:transform .4s cubic-bezier(.4,0,.2,1)}.f1-fw-flap{transform-box:fill-box;transform-origin:0% 50%;transition:transform .4s cubic-bezier(.4,0,.2,1)}</style>
        </defs>
        <text x="1" y="6" font-family="'Barlow Condensed',sans-serif" font-size="4.5" font-weight="700" fill="#0a4040">RW</text>
        <path id="f1-rw-main" d="M 7 8.5 C 10 6.2 27 6.2 36 8 L 36 11 C 27 11 10 11 7 10.5 Z" fill="#0dcfcf33" stroke="#0dcfcf" stroke-width="0.7"/>
        <line x1="20" y1="11" x2="20" y2="15" stroke="#0dcfcf" stroke-width="0.8" stroke-opacity="0.35"/>
        <circle id="f1-rw-pivot" cx="36" cy="9.5" r="1.1" fill="#0dcfcf" opacity="0.8"/>
        <g class="f1-rw-flap" id="f1-rw-flap">
          <rect id="f1-rw-rect" x="36" y="8" width="12" height="3" rx="0.5" fill="#0dcfcf" stroke="#0dcfcf" stroke-width="0.4" opacity="0.9" filter="url(#ag3)"/>
        </g>
        <line x1="1" y1="17.5" x2="51" y2="17.5" stroke="#0a2020" stroke-width="0.5" stroke-dasharray="2 2"/>
        <text x="1" y="24" font-family="'Barlow Condensed',sans-serif" font-size="4.5" font-weight="700" fill="#0a4040">FW</text>
        <path id="f1-fw-main" d="M 7 26 C 9 24.2 23 24.2 30 25.2 L 30 28 C 23 28 9 28 7 27 Z" fill="#0dcfcf33" stroke="#0dcfcf" stroke-width="0.7"/>
        <circle id="f1-fw-pivot" cx="30" cy="26.6" r="1" fill="#0dcfcf" opacity="0.8"/>
        <g class="f1-fw-flap" id="f1-fw-flap">
          <rect id="f1-fw-rect" x="30" y="25.2" width="10" height="2.8" rx="0.5" fill="#0dcfcf" stroke="#0dcfcf" stroke-width="0.4" opacity="0.9" filter="url(#ag3)"/>
        </g>
        <text id="f1-aero-state-label" x="1" y="37" font-family="'Barlow Condensed',sans-serif" font-size="3.8" font-weight="700" fill="#0dcfcf99">FLAT · LOW DRAG</text>
      </svg>
      <span id="f1-aero-mode-label" style="font-family:'Barlow Condensed',sans-serif;font-size:8px;font-weight:900;letter-spacing:2px;color:#0dcfcf;text-shadow:0 0 8px #0dcfcf;transition:color .4s,text-shadow .4s;">X-MODE</span>
    </div>
  </div>

  <!-- Driver nameplate -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid #0dcfcf1a;">
    <span id="f1-driver-nameplate" style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;letter-spacing:5px;color:#0dcfcf;text-shadow:0 0 10px #0dcfcf;transition:color .5s,text-shadow .5s;">DRIVER</span>
    <div style="display:flex;align-items:center;gap:3px;">
      <div id="f1-live-dot" style="width:4px;height:4px;border-radius:50%;background:#0dcfcf;box-shadow:0 0 6px #0dcfcf;animation:f1-blink 1.4s ease-in-out infinite;transition:background .5s,box-shadow .5s;"></div>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:#0a4040;">LIVE</span>
    </div>
  </div>

  <!-- Middle row -->
  <div style="display:flex;align-items:center;gap:4px;">
    <!-- Recharge -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:20px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:rgba(0,212,255,.55);writing-mode:vertical-rl;transform:rotate(180deg);margin-bottom:1px;">RECHARGE</span>
      <div id="f1-recharge-segs" style="display:flex;flex-direction:column-reverse;gap:2px;"></div>
    </div>

    <!-- Circle -->
    <div style="position:relative;width:120px;height:120px;flex-shrink:0;">
      <svg width="120" height="120" style="position:absolute;top:0;left:0;">
        <defs>
          <filter id="tg2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="cbg2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#080818"/>
            <stop offset="100%" stop-color="#040410"/>
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="55" fill="none" stroke="#030c0c" stroke-width="8"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="#041212" stroke-width="6"
          stroke-dasharray="${trackDash}" transform="rotate(126 60 60)"/>
        <circle id="f1-arc-glow" cx="60" cy="60" r="50" fill="none"
          stroke="#0dcfcf" stroke-width="12" stroke-opacity=".10" stroke-linecap="round"
          stroke-dasharray="0 ${C}" transform="rotate(126 60 60)"
          style="transition:stroke-dasharray .3s,stroke .5s;"/>
        <circle id="f1-arc-main" cx="60" cy="60" r="50" fill="none"
          stroke="#0dcfcf" stroke-width="5" stroke-linecap="round"
          stroke-dasharray="0 ${C}" transform="rotate(126 60 60)"
          filter="url(#tg2)" style="transition:stroke-dasharray .3s,stroke .5s;"/>
        <circle cx="60" cy="60" r="43" fill="url(#cbg2)"/>
        <circle cx="60" cy="60" r="43" fill="none" stroke="#041010" stroke-width="1"/>
      </svg>
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding-top:2px;">
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:7px;font-weight:700;letter-spacing:3px;color:#0dcfcf;">KM/H</span>
        <span id="f1-kmh" style="font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:900;line-height:1;color:#fff;text-shadow:0 0 12px rgba(255,255,255,.2);">0</span>
        <div id="f1-boost-label-box" style="padding:1px 8px;border-radius:1px;border:1px solid transparent;transition:all .3s;margin-top:1px;">
          <span id="f1-boost-label" style="font-family:'Barlow Condensed',sans-serif;font-size:7px;font-weight:900;letter-spacing:4px;color:#0a2a1a;transition:all .3s;">BOOST</span>
        </div>
        <div id="f1-overtake-label-box" style="padding:1px 3px;border-radius:1px;border:1px solid transparent;transition:all .3s;">
          <span id="f1-overtake-label" style="font-family:'Barlow Condensed',sans-serif;font-size:7px;font-weight:900;letter-spacing:4px;color:#0a2a1a;transition:all .3s;">OVERTAKE</span>
        </div>
        <span id="f1-mph" style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;line-height:1;color:#ccc;margin-top:1px;">0</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:7px;font-weight:700;letter-spacing:3px;color:#0dcfcf;">MPH</span>
        <svg width="22" height="10" viewBox="0 0 22 10" style="margin-top:3px;">
          <rect x="0" y="1" width="18" height="8" rx="2" fill="none" stroke="#0dcfcf" stroke-width="1"/>
          <rect x="18" y="3" width="3" height="4" rx="1" fill="#0dcfcf"/>
          <rect id="f1-battery-fill" x="1.5" y="2.5" width="0" height="5" rx="1" fill="#00ff88" style="transition:width .25s,fill .5s;"/>
        </svg>
      </div>
    </div>

    <!-- Deploy -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:20px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:rgba(255,140,0,.55);writing-mode:vertical-rl;margin-bottom:1px;">DEPLOY</span>
      <div id="f1-deploy-segs" style="display:flex;flex-direction:column-reverse;gap:2px;"></div>
    </div>

    <!-- Gear strip -->
    <div style="display:flex;flex-direction:column;gap:1px;margin-left:3px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a4040;margin-bottom:2px;">GR</span>
      <div id="f1-gear-strip"></div>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;letter-spacing:1px;color:#0a3030;margin-top:2px;">RPM</span>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;letter-spacing:1px;color:#0a3030;">×1k</span>
    </div>
  </div>

  <!-- Bottom row -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px;padding-top:5px;border-top:1px solid #060f0f;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <span id="f1-brake-label" style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a1818;">BRAKE</span>
      <div style="width:28px;height:4px;background:#040c0c;border:1px solid #0a1212;border-radius:1px;overflow:hidden;">
        <div id="f1-brake-fill" style="height:100%;background:#ff6644;width:0%;transition:width .2s;"></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a3a3a;">TURN</span>
      <span id="f1-turn" style="font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;color:#0dcfcf;">1</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <span id="f1-throttle-label" style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:2px;color:#0a1818;">THROTTLE</span>
      <div style="width:28px;height:4px;background:#040c0c;border:1px solid #0a1212;border-radius:1px;overflow:hidden;">
        <div id="f1-throttle-fill" style="height:100%;background:#0dcfcf;width:0%;transition:width .2s,background .5s;"></div>
      </div>
    </div>
  </div>

  <!-- Energy store -->
  <div style="margin-top:6px;padding-top:5px;border-top:1px solid #060f0f;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:6px;font-weight:700;letter-spacing:3px;color:#0a3535;">ENERGY STORE</span>
      <span id="f1-energy-pct" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#00ff88;transition:color .5s;">85%</span>
    </div>
    <div style="height:5px;background:#040c0c;border-radius:1px;overflow:hidden;border:1px solid #0a1212;position:relative;">
      <div id="f1-energy-bar-glow" style="position:absolute;top:0;left:0;height:100%;filter:blur(4px);opacity:.28;background:#00ff88;width:85%;transition:width .15s,background .5s;"></div>
      <div id="f1-energy-bar-fill" style="position:absolute;top:0;left:0;height:100%;background:linear-gradient(90deg,#00ff8888,#00ff88);width:85%;transition:width .15s,background .5s;"></div>
    </div>
    <div id="f1-energy-pips" style="display:flex;justify-content:space-between;margin-top:3px;"></div>
  </div>
</div>

<!-- Handle -->
<div id="f1-hud-handle">
  <div class="f1-handle-dot" id="f1-handle-dot"></div>
  <span class="f1-handle-kmh" id="f1-handle-kmh">0</span>
  <span class="f1-handle-mode" id="f1-handle-mode">NRM</span>
  <span class="f1-handle-driver" id="f1-handle-driver">DRV</span>
  <div>
    <div class="f1-handle-energy-bar">
      <div class="f1-handle-energy-fill" id="f1-handle-energy-fill"></div>
    </div>
    <span class="f1-handle-energy-pct" id="f1-handle-energy-pct">85%</span>
  </div>
  <span class="f1-handle-arrow">◀</span>
</div>`;
  }

  // ── Inject ───────────────────────────────────────────────────────────────────

  function inject() {
    if (document.getElementById('f1-hud-root')) return;

    const root = document.createElement('div');
    root.id = 'f1-hud-root';
    root.innerHTML = buildHTML();
    document.body.appendChild(root);

    buildSegs();
    buildGears();
    buildPips();

    // Drag
    let dragging = false, dragMoved = false;
    let sx, sy, sl, st;
    const handle = document.getElementById('f1-hud-handle');

    function onDragStart(e) {
      dragging = true; dragMoved = false;
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY;
      const r = root.getBoundingClientRect();
      sl = r.left; st = r.top;
      root.style.right = 'auto';
      root.style.left = sl + 'px';
      root.style.top  = st + 'px';
      root.classList.add('dragging');
      e.preventDefault();
    }
    function onDragMove(e) {
      if (!dragging) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      root.style.left = Math.max(0, Math.min(window.innerWidth  - root.offsetWidth,  sl + dx)) + 'px';
      root.style.top  = Math.max(0, Math.min(window.innerHeight - root.offsetHeight, st + dy)) + 'px';
      e.preventDefault();
    }
    function onDragEnd() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('dragging');
    }

    handle.addEventListener('mousedown',  onDragStart, { passive: false });
    handle.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove',  onDragMove, { passive: false });
    document.addEventListener('touchmove',  onDragMove, { passive: false });
    document.addEventListener('mouseup',  onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    handle.addEventListener('click', function () {
      if (dragMoved) return;
      state.open = !state.open;
      render();
    });
    document.getElementById('f1-collapse-btn').addEventListener('click', function () {
      state.open = false;
      render();
    });

    render();
    console.log('[' + ID + '] Widget injected.');
  }

  function buildSegs() {
    ['f1-deploy-segs','f1-recharge-segs'].forEach(function (id) {
      const wrap = document.getElementById(id);
      if (!wrap) return;
      wrap.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('div');
        s.className = 'f1-seg off';
        s.id = id + '-' + i;
        wrap.appendChild(s);
      }
    });
  }

  function buildGears() {
    const strip = document.getElementById('f1-gear-strip');
    if (!strip) return;
    strip.innerHTML = '';
    ['N','1','2','3','4','5','6','7','8'].forEach(function (g) {
      const el = document.createElement('div');
      el.className = 'f1-gear-item inactive';
      el.id = 'f1-gear-' + g;
      el.innerHTML = '<span class="f1-gear-text" style="color:#163030">' + g + '</span>';
      strip.appendChild(el);
    });
  }

  function buildPips() {
    const pips = document.getElementById('f1-energy-pips');
    if (!pips) return;
    pips.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.id = 'f1-pip-' + i;
      p.style.cssText = 'width:12px;height:3px;border-radius:1px;background:#040c0c;border:1px solid #0a1212;transition:background .2s,border-color .2s;';
      pips.appendChild(p);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function render() {
    const mc   = MODE_COLORS[state.mode] || MODE_COLORS.NORMAL;
    const eClr = energyColor(state.energy);
    const mph  = Math.round(state.kmh * 0.621371);
    const R = 50, C = 2 * Math.PI * R;
    const arcFill  = C * Math.min(state.kmh / 370, 1);
    const rampPct  = mguKPct(state.kmh);
    const rampClr  = rampPct > 66 ? '#00D4FF' : rampPct > 33 ? '#FFB800' : '#FF4444';
    const derating = state.energy < 25 && state.aero === 'X';
    const straight = state.aero === 'X';
    const flapAng  = straight ? 0 : 14;
    const aeroClr  = straight ? '#0dcfcf' : '#FF8C00';

    // Panel open/close + mode class
    const panel = document.getElementById('f1-hud-panel');
    if (panel) panel.className = (state.open ? 'open ' : '') + 'mode-' + state.mode;

    // Arc
    const arcM = document.getElementById('f1-arc-main');
    const arcG = document.getElementById('f1-arc-glow');
    if (arcM) { arcM.style.strokeDasharray = (arcFill * .8) + ' ' + C; arcM.setAttribute('stroke', mc.arc); }
    if (arcG && arcFill > 0.5) { arcG.style.strokeDasharray = (arcFill * .8) + ' ' + C; arcG.setAttribute('stroke', mc.arc); }

    setText('f1-kmh', Math.round(state.kmh));
    setText('f1-mph', mph);

    // Mode labels
    const boostOn = state.mode === 'BOOST', ovOn = state.mode === 'OVERTAKE';
    const bb = document.getElementById('f1-boost-label-box'),    bl = document.getElementById('f1-boost-label');
    const ob = document.getElementById('f1-overtake-label-box'), ol = document.getElementById('f1-overtake-label');
    if (bb) { bb.style.background = boostOn ? 'rgba(255,184,0,0.12)' : 'transparent'; bb.style.borderColor = boostOn ? 'rgba(255,184,0,0.28)' : 'transparent'; }
    if (bl) { bl.style.color = boostOn ? MODE_COLORS.BOOST.arc : '#0a2a1a'; bl.style.textShadow = boostOn ? '0 0 10px ' + MODE_COLORS.BOOST.arc : 'none'; }
    if (ob) { ob.style.background = ovOn ? 'rgba(0,255,136,0.12)' : 'transparent'; ob.style.borderColor = ovOn ? 'rgba(0,255,136,0.28)' : 'transparent'; }
    if (ol) { ol.style.color = ovOn ? MODE_COLORS.OVERTAKE.arc : '#0a2a1a'; ol.style.textShadow = ovOn ? '0 0 10px ' + MODE_COLORS.OVERTAKE.arc : 'none'; }

    // Driver
    const code = driverCode(state.driver);
    setText('f1-driver-nameplate', state.driver.toUpperCase());
    setText('f1-handle-driver', code);
    setStyle('f1-driver-nameplate', 'color', mc.arc);
    setStyle('f1-driver-nameplate', 'textShadow', '0 0 10px ' + mc.arc);
    setStyle('f1-handle-driver', 'color', mc.arc);
    setStyle('f1-handle-driver', 'textShadow', '0 0 6px ' + mc.arc);
    setStyle('f1-live-dot', 'background', mc.arc);
    setStyle('f1-live-dot', 'boxShadow', '0 0 6px ' + mc.arc);

    // Battery
    const batt = document.getElementById('f1-battery-fill');
    if (batt) { batt.setAttribute('width', Math.round((state.energy / 100) * 15)); batt.setAttribute('fill', eClr); }

    // Handle
    setText('f1-handle-kmh', Math.round(state.kmh));
    setText('f1-handle-mode', mc.short);
    setStyle('f1-handle-dot',  'background', mc.arc);
    setStyle('f1-handle-dot',  'boxShadow',  '0 0 8px ' + mc.arc);
    setStyle('f1-handle-mode', 'color', mc.arc);
    setStyle('f1-handle-mode', 'textShadow', '0 0 8px ' + mc.arc);
    setStyle('f1-hud-handle',  'borderColor', mc.arc + '28');
    setStyle('f1-hud-handle',  'boxShadow', '-3px 3px 16px ' + mc.glow);
    const hef = document.getElementById('f1-handle-energy-fill');
    if (hef) { hef.style.height = state.energy + '%'; hef.style.background = eClr; }
    setText('f1-handle-energy-pct', Math.round(state.energy) + '%');
    setStyle('f1-handle-energy-pct', 'color', eClr);

    // Segs
    renderSegs('f1-deploy-segs',   state.deploy,   DEPLOY_CLR,   '255,140,0');
    renderSegs('f1-recharge-segs', state.recharge, RECHARGE_CLR, '0,212,255');

    // Gears
    ['N','1','2','3','4','5','6','7','8'].forEach(function (g) {
      const el = document.getElementById('f1-gear-' + g);
      if (!el) return;
      const on = g === String(state.gear);
      el.className = 'f1-gear-item ' + (on ? 'active' : 'inactive');
      el.querySelector('.f1-gear-text').style.color = on ? '#000' : '#163030';
    });

    // Energy bar
    setStyle('f1-energy-bar-fill', 'width', state.energy + '%');
    setStyle('f1-energy-bar-fill', 'background', 'linear-gradient(90deg,' + eClr + '88,' + eClr + ')');
    setStyle('f1-energy-bar-glow', 'width', state.energy + '%');
    setStyle('f1-energy-bar-glow', 'background', eClr);
    setText('f1-energy-pct', Math.round(state.energy) + '%');
    setStyle('f1-energy-pct', 'color', eClr);
    for (let i = 0; i < 10; i++) {
      const pip = document.getElementById('f1-pip-' + i);
      if (!pip) continue;
      const on = i < Math.ceil(state.energy / 10);
      pip.style.background   = on ? eClr : '#040c0c';
      pip.style.borderColor  = on ? eClr + '44' : '#0a1212';
    }

    // Brake / throttle
    setStyle('f1-brake-fill',    'width', state.brake    + '%');
    setStyle('f1-throttle-fill', 'width', state.throttle + '%');
    setStyle('f1-throttle-fill', 'background', mc.arc);
    setStyle('f1-brake-label',    'color', state.brake    > 10 ? '#ff6644' : '#0a1818');
    setStyle('f1-throttle-label', 'color', state.throttle > 10 ? mc.arc    : '#0a1818');
    setText('f1-turn', state.turn);

    // MGU-K
    const rampLbl = document.getElementById('f1-ramp-label');
    const rampPctEl = document.getElementById('f1-ramp-pct');
    if (rampLbl) { rampLbl.textContent = state.kmh > RAMP_LO ? 'RAMP↓' : 'FULL'; rampLbl.style.color = state.kmh > RAMP_LO ? rampClr : '#0a4040'; }
    if (rampPctEl) { rampPctEl.textContent = rampPct + '%'; rampPctEl.style.color = rampClr; }
    setStyle('f1-ramp-fill', 'width', rampPct + '%');
    setStyle('f1-ramp-fill', 'background', 'linear-gradient(90deg,' + rampClr + '88,' + rampClr + ')');
    setStyle('f1-ramp-glow', 'width', rampPct + '%');
    setStyle('f1-ramp-glow', 'background', rampClr);
    const dBox = document.getElementById('f1-derating-box');
    const dDot = document.getElementById('f1-derating-dot');
    const dLbl = document.getElementById('f1-derating-label');
    if (dBox) { dBox.style.borderColor = derating ? '#FF444460' : '#0a1414'; dBox.style.background = derating ? 'rgba(255,68,68,0.08)' : 'transparent'; }
    if (dDot) { dDot.style.background = derating ? '#FF4444' : '#0a1c1c'; dDot.style.boxShadow = derating ? '0 0 6px #FF4444' : 'none'; }
    if (dLbl) { dLbl.textContent = derating ? 'DERATING' : 'NOMINAL'; dLbl.style.color = derating ? '#FF4444' : '#0a2a2a'; }

    // Aero
    const aeroPanel = document.getElementById('f1-aero-panel');
    if (aeroPanel) { aeroPanel.style.borderColor = aeroClr + '28'; aeroPanel.style.boxShadow = '0 0 10px ' + aeroClr + '10'; }
    ['f1-rw-main','f1-fw-main'].forEach(function (id) { const el = document.getElementById(id); if (el) { el.setAttribute('fill', aeroClr + '33'); el.setAttribute('stroke', aeroClr); } });
    ['f1-rw-pivot','f1-fw-pivot'].forEach(function (id) { const el = document.getElementById(id); if (el) el.setAttribute('fill', aeroClr); });
    ['f1-rw-rect','f1-fw-rect'].forEach(function (id) { const el = document.getElementById(id); if (el) { el.setAttribute('fill', aeroClr); el.setAttribute('stroke', aeroClr); } });
    const rwF = document.getElementById('f1-rw-flap'), fwF = document.getElementById('f1-fw-flap');
    if (rwF) rwF.style.transform = 'rotate(' + flapAng + 'deg)';
    if (fwF) fwF.style.transform = 'rotate(' + flapAng + 'deg)';
    const asl = document.getElementById('f1-aero-state-label'), aml = document.getElementById('f1-aero-mode-label');
    if (asl) { asl.textContent = straight ? 'FLAT · LOW DRAG' : 'ANGLED · DOWNFORCE'; asl.setAttribute('fill', aeroClr + '99'); }
    if (aml) { aml.textContent = straight ? 'X-MODE' : 'Z-MODE'; aml.style.color = aeroClr; aml.style.textShadow = '0 0 8px ' + aeroClr; }
  }

  function renderSegs(id, count, color, rgb) {
    for (let i = 0; i < 5; i++) {
      const seg = document.getElementById(id + '-' + i);
      if (!seg) continue;
      const on = i < count;
      seg.style.background = on ? 'linear-gradient(180deg,' + color + 'dd,' + color + '99)' : '#041410';
      seg.style.border      = '1px solid ' + (on ? color + '44' : '#042010');
      seg.style.boxShadow   = on ? '0 0 5px rgba(' + rgb + ',.45),inset 0 1px 0 rgba(255,255,255,.07)' : 'none';
    }
  }

  // ── Parse prompt ─────────────────────────────────────────────────────────────

  const PARSE_PROMPT = `You are a telemetry parser for a Formula 1 racing roleplay.

Read the chat excerpt and extract driving telemetry for the POV driver. Return ONLY a valid JSON object — no explanation, no markdown, no extra text.

FIELD RULES:
"driver": Surname of whoever is at the wheel / POV character. Use surname as written. Return "DRIVER" if unclear.
"kmh": Speed in km/h (0-370). Infer from context: hairpin=60-120, slow corner=100-160, medium corner=160-220, fast corner=220-270, straight=270-330, top speed=330-370.
"mph": kmh * 0.621 rounded.
"gear": Integer 1-8 or "N". Gear 1=0-80kmh, 2=80-130, 3=130-175, 4=175-215, 5=215-260, 6=260-295, 7=295-330, 8=330-370.
"mode": "NORMAL", "BOOST", or "OVERTAKE". OVERTAKE=within 1s of car ahead and button pressed. BOOST=defending/pushing hard. NORMAL=default.
"aero": "X"=straight (flat wings), "Z"=corner (angled wings).
"deploy": 0-5 ERS segments deploying (energy out). 5=max attack, 0=harvesting only.
"recharge": 0-5 ERS segments harvesting (energy in). High under braking.
"energy": 0-100% energy store. Drains when deploy>recharge.
"brake": 0-100% brake pressure. 0 on straights, 90-100 in heavy braking zones.
"throttle": 0-100% throttle. 95-100 on straights, 20-60 mid-corner.
"turn": Corner number (integer). Keep previous if not mentioned.

Return ONLY this JSON:
{"driver":"SURNAME","kmh":267,"mph":166,"gear":7,"mode":"OVERTAKE","aero":"X","deploy":4,"recharge":1,"energy":62,"brake":0,"throttle":95,"turn":7}`;

  async function parseContext() {
    const ctx = getChat();
    if (!ctx.chat || ctx.chat.length === 0) return;

    const recent   = ctx.chat.slice(-6).map(function (m) { return (m.name || '') + ': ' + (m.mes || ''); }).join('\n\n');
    const charHint = ctx.name2 ? 'Current character: ' + ctx.name2 : '';
    const prompt   = PARSE_PROMPT + '\n\n' + charHint + '\n\nCHAT:\n' + recent;

    const ind = document.getElementById('f1-parse-indicator');
    if (ind) ind.className = 'parsing';

    try {
      const raw   = await runQuietPrompt(prompt);
      const match = raw.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error('No JSON found');
      const p = JSON.parse(match[0]);

      if (typeof p.driver   === 'string' && p.driver.length > 0) state.driver   = p.driver;
      if (typeof p.kmh      === 'number') state.kmh      = Math.min(370, Math.max(0, Math.round(p.kmh)));
      if (p.gear !== undefined)           state.gear     = p.gear;
      if (['NORMAL','BOOST','OVERTAKE'].includes(p.mode)) state.mode = p.mode;
      if (['X','Z'].includes(p.aero))     state.aero     = p.aero;
      if (typeof p.deploy   === 'number') state.deploy   = Math.min(5, Math.max(0, Math.round(p.deploy)));
      if (typeof p.recharge === 'number') state.recharge = Math.min(5, Math.max(0, Math.round(p.recharge)));
      if (typeof p.energy   === 'number') state.energy   = Math.min(100, Math.max(0, Math.round(p.energy)));
      if (typeof p.brake    === 'number') state.brake    = Math.min(100, Math.max(0, Math.round(p.brake)));
      if (typeof p.throttle === 'number') state.throttle = Math.min(100, Math.max(0, Math.round(p.throttle)));
      if (typeof p.turn     === 'number') state.turn     = p.turn;

      render();
      if (ind) { ind.className = 'done'; setTimeout(function () { ind.className = ''; }, 1500); }
      console.log('[' + ID + '] Telemetry updated:', p);
    } catch (err) {
      console.warn('[' + ID + '] Parse failed:', err.message);
      if (ind) ind.className = '';
    }
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  function hookEvents() {
    const cb = function () { setTimeout(parseContext, 400); };
    if (window.eventSource && window.event_types) {
      window.eventSource.on(window.event_types.MESSAGE_RECEIVED, cb);
      window.eventSource.on(window.event_types.MESSAGE_SENT,     cb);
      console.log('[' + ID + '] Hooked via eventSource.');
      return;
    }
    // Fallback: watch ST chat div for new messages
    const chat = document.getElementById('chat');
    if (chat) {
      new MutationObserver(cb).observe(chat, { childList: true });
      console.log('[' + ID + '] Hooked via MutationObserver.');
    }
  }

  // ── Init — try immediately, retry if ST not ready yet ────────────────────────

  function tryInit() {
    if (!document.body) {
      setTimeout(tryInit, 100);
      return;
    }
    try {
      inject();
      hookEvents();
      console.log('[' + ID + '] Loaded OK.');
    } catch (e) {
      console.error('[' + ID + '] Init failed:', e);
    }
  }

  // Run as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }

})();
