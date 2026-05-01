// ═══════════════════════════════════════════════════════════════════════════════
// F1 2026 ERS HUD — SillyTavern Extension  
// index.js
// ═══════════════════════════════════════════════════════════════════════════════

import { getContext }            from '../../../../src/extensions.js';
import { generateQuietPrompt }   from '../../../../script.js';
import { eventSource, event_types } from '../../../../script.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const EXT_NAME = 'f1-ers-hud';

const MODE_COLORS = {
  NORMAL:   { arc: '#0dcfcf', glow: 'rgba(13,207,207,0.32)',  short: 'NRM' },
  BOOST:    { arc: '#FFB800', glow: 'rgba(255,184,0,0.42)',   short: 'BST' },
  OVERTAKE: { arc: '#00ff88', glow: 'rgba(0,255,136,0.45)',   short: 'OT'  },
};

const DEPLOY_CLR   = '#FF8C00';
const RECHARGE_CLR = '#00D4FF';
const RAMP_LO = 290;
const RAMP_HI = 355;

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  kmh:      0,
  gear:     'N',
  mode:     'NORMAL',
  aero:     'X',
  deploy:   0,
  recharge: 0,
  energy:   85,
  brake:    0,
  throttle: 0,
  turn:     1,
  driver:   'DRIVER',
  open:     false,
  parsing:  false,
};

// ── ST API helpers ─────────────────────────────────────────────────────────────

function getChat() {
  try {
    const ctx = getContext();
    return {
      chat:  ctx.chat  || [],
      name2: ctx.name2 || ctx.characters?.[ctx.characterId]?.name || '',
    };
  } catch {
    return {
      chat:  window.chat  || [],
      name2: window.name2 || '',
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function modeColor() { return MODE_COLORS[state.mode] || MODE_COLORS.NORMAL; }

// ── Build widget HTML ─────────────────────────────────────────────────────────

function buildWidgetHTML() {
  return `
  <div id="f1-hud-panel">
    <div id="f1-parse-indicator"></div>
    <div id="f1-collapse-btn" title="Collapse">▶</div>

    <!-- MGU-K + Aero row -->
    <div style="display:flex;gap:6px;margin-bottom:8px;">

      <!-- MGU-K panel -->
      <div id="f1-mguk-panel" style="
        display:flex;flex-direction:column;gap:5px;padding:6px 8px;
        border:1px solid #0a1a1a;border-radius:3px;background:rgba(0,6,8,0.9);
        min-width:120px;
      ">
        <span class="f1-section-label">MGU-K</span>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span id="f1-ramp-label" class="f1-section-label" style="font-size:7px;"></span>
            <span id="f1-ramp-pct" class="f1-mono" style="font-size:9px;"></span>
          </div>
          <div style="height:5px;background:#041010;border-radius:1px;overflow:hidden;border:1px solid #0a1414;position:relative;">
            <div id="f1-ramp-glow" style="position:absolute;top:0;left:0;height:100%;filter:blur(3px);opacity:.3;transition:width .3s,background .5s;"></div>
            <div id="f1-ramp-fill" style="position:absolute;top:0;left:0;height:100%;transition:width .3s,background .5s;"></div>
            <div style="position:absolute;top:0;left:${((RAMP_LO/370)*100).toFixed(1)}%;height:100%;width:1px;background:#ffffff18;"></div>
          </div>
        </div>
        <div id="f1-derating-box" style="
          display:flex;align-items:center;gap:4px;padding:3px 5px;border-radius:2px;
          border:1px solid #0a1414;background:transparent;transition:all .3s;
        ">
          <div id="f1-derating-dot" style="
            width:4px;height:4px;border-radius:50%;flex-shrink:0;
            background:#0a1c1c;transition:background .3s,box-shadow .3s;
          "></div>
          <span id="f1-derating-label" class="f1-section-label" style="font-size:7px;letter-spacing:2px;">NOMINAL</span>
        </div>
      </div>

      <!-- Active Aero panel -->
      <div id="f1-aero-panel" style="
        display:flex;flex-direction:column;align-items:center;gap:3px;
        padding:5px 7px;border:1px solid #0dcfcf28;border-radius:3px;
        background:rgba(0,6,8,0.9);min-width:78px;
        box-shadow:0 0 10px #0dcfcf10;transition:border-color .4s,box-shadow .4s;
      ">
        <span class="f1-section-label" style="letter-spacing:3px;">AERO</span>
        <svg width="58" height="42" viewBox="0 0 58 42" id="f1-aero-svg">
          <defs>
            <filter id="ag3" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="0.6" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <text x="1" y="6.5" font-family="'Barlow Condensed',sans-serif" font-size="4.5" font-weight="700" letter-spacing="1" fill="#0a4040">RW</text>
          <path id="f1-rw-main" d="M 8 9 C 11 6.5 30 6.5 40 8.5 L 40 12 C 30 12 11 12 8 11.5 Z" fill="#0dcfcf33" stroke="#0dcfcf" stroke-width="0.7"/>
          <line x1="22" y1="12" x2="22" y2="17" stroke="#0dcfcf" stroke-width="0.8" stroke-opacity="0.35"/>
          <circle id="f1-rw-pivot" cx="40" cy="10.25" r="1.2" fill="#0dcfcf" opacity="0.8"/>
          <g id="f1-rw-flap" style="transform-box:fill-box;transform-origin:0% 50%;transition:transform .4s cubic-bezier(.4,0,.2,1);">
            <rect x="40" y="8.5" width="13" height="3.5" rx="0.5" id="f1-rw-rect"
              fill="#0dcfcf" stroke="#0dcfcf" stroke-width="0.4" opacity="0.9" filter="url(#ag3)"/>
          </g>
          <line x1="1" y1="19.5" x2="57" y2="19.5" stroke="#0a2020" stroke-width="0.5" stroke-dasharray="2 2"/>
          <text x="1" y="26.5" font-family="'Barlow Condensed',sans-serif" font-size="4.5" font-weight="700" letter-spacing="1" fill="#0a4040">FW</text>
          <path id="f1-fw-main" d="M 8 28.5 C 10 26.5 26 26.5 34 27.5 L 34 30.5 C 26 30.5 10 30.5 8 29.5 Z" fill="#0dcfcf33" stroke="#0dcfcf" stroke-width="0.7"/>
          <circle id="f1-fw-pivot" cx="34" cy="29" r="1.1" fill="#0dcfcf" opacity="0.8"/>
          <g id="f1-fw-flap" style="transform-box:fill-box;transform-origin:0% 50%;transition:transform .4s cubic-bezier(.4,0,.2,1);">
            <rect x="34" y="27.5" width="11" height="3" rx="0.5" id="f1-fw-rect"
              fill="#0dcfcf" stroke="#0dcfcf" stroke-width="0.4" opacity="0.9" filter="url(#ag3)"/>
          </g>
          <text id="f1-aero-state-label" x="1" y="40.5" font-family="'Barlow Condensed',sans-serif"
            font-size="4" font-weight="700" letter-spacing="0.5" fill="#0dcfcf99">FLAT · LOW DRAG</text>
        </svg>
        <span id="f1-aero-mode-label" style="
          font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:900;
          letter-spacing:2px;color:#0dcfcf;text-shadow:0 0 8px #0dcfcf;
          transition:color .4s,text-shadow .4s;
        ">X-MODE</span>
      </div>
    </div>

    <!-- Driver nameplate -->
    <div style="
      display:flex;justify-content:space-between;align-items:center;
      margin-bottom:7px;padding-bottom:6px;border-bottom:1px solid #0dcfcf22;
    ">
      <span id="f1-driver-nameplate" style="
        font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:900;
        letter-spacing:5px;color:#0dcfcf;text-shadow:0 0 12px #0dcfcf;
        transition:color .5s,text-shadow .5s;
      ">DRIVER</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <div id="f1-live-dot" style="
          width:5px;height:5px;border-radius:50%;
          background:#0dcfcf;box-shadow:0 0 7px #0dcfcf;
          animation:f1-blink 1.4s ease-in-out infinite;
          transition:background .5s,box-shadow .5s;
        "></div>
        <span class="f1-section-label" style="letter-spacing:3px;">LIVE</span>
      </div>
    </div>

    <!-- Middle row: recharge | circle | deploy | gears -->
    <div style="display:flex;align-items:center;gap:5px;">

      <!-- Recharge bar -->
      <div class="f1-segbar-wrap">
        <span class="f1-segbar-label" style="color:rgba(0,212,255,.6);transform:rotate(180deg);">RECHARGE</span>
        <div id="f1-recharge-segs" style="display:flex;flex-direction:column-reverse;gap:2px;"></div>
      </div>

      <!-- Speed circle -->
      <div style="position:relative;width:120px;height:120px;flex-shrink:0;">
        <svg width="120" height="120" style="position:absolute;top:0;left:0;" id="f1-circle-svg">
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
          <circle cx="60" cy="60" r="50" fill="none" stroke="#061010" stroke-width="1"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#041212" stroke-width="6"
            stroke-dasharray="${(2*Math.PI*50*.8).toFixed(1)} ${(2*Math.PI*50*.2).toFixed(1)}"
            transform="rotate(126 60 60)"/>
          <circle id="f1-arc-glow" cx="60" cy="60" r="50" fill="none"
            stroke="#0dcfcf" stroke-width="12" stroke-opacity=".10" stroke-linecap="round"
            stroke-dasharray="0 ${(2*Math.PI*50).toFixed(1)}"
            transform="rotate(126 60 60)" style="transition:stroke-dasharray .3s,stroke .5s;"/>
          <circle id="f1-arc-main" cx="60" cy="60" r="50" fill="none"
            stroke="#0dcfcf" stroke-width="5" stroke-linecap="round"
            stroke-dasharray="0 ${(2*Math.PI*50).toFixed(1)}"
            transform="rotate(126 60 60)" filter="url(#tg2)"
            style="transition:stroke-dasharray .3s,stroke .5s;"/>
          <circle cx="60" cy="60" r="43" fill="url(#cbg2)"/>
          <circle cx="60" cy="60" r="43" fill="none" stroke="#041010" stroke-width="1"/>
        </svg>
        <div style="
          position:absolute;top:0;left:0;width:100%;height:100%;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding-top:2px;
        ">
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
          <svg id="f1-battery-svg" width="22" height="10" viewBox="0 0 22 10" style="margin-top:3px;">
            <rect x="0" y="1" width="18" height="8" rx="2" fill="none" stroke="#0dcfcf" stroke-width="1"/>
            <rect x="18" y="3" width="3" height="4" rx="1" fill="#0dcfcf"/>
            <rect id="f1-battery-fill" x="1.5" y="2.5" width="0" height="5" rx="1" fill="#00ff88" style="transition:width .25s,fill .5s;"/>
          </svg>
        </div>
      </div>

      <!-- Deploy bar -->
      <div class="f1-segbar-wrap">
        <span class="f1-segbar-label" style="color:rgba(255,140,0,.6);">DEPLOY</span>
        <div id="f1-deploy-segs" style="display:flex;flex-direction:column-reverse;gap:2px;"></div>
      </div>

      <!-- Gear strip -->
      <div class="f1-gear-wrap">
        <span class="f1-section-label" style="font-size:6px;letter-spacing:2px;margin-bottom:2px;">GR</span>
        <div id="f1-gear-strip"></div>
        <span class="f1-section-label" style="font-size:6px;letter-spacing:1px;margin-top:2px;">RPM</span>
        <span class="f1-section-label" style="font-size:6px;letter-spacing:1px;">×1k</span>
      </div>
    </div>

    <!-- Bottom row: brake / turn / throttle -->
    <div style="
      display:flex;justify-content:space-between;align-items:flex-end;
      margin-top:7px;padding-top:6px;border-top:1px solid #060f0f;
    ">
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span id="f1-brake-label" class="f1-section-label" style="letter-spacing:2px;">BRAKE</span>
        <div style="width:30px;height:4px;background:#040c0c;border:1px solid #0a1212;border-radius:1px;overflow:hidden;">
          <div id="f1-brake-fill" class="f1-input-bar-fill" style="background:#ff6644;width:0%;"></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <span class="f1-section-label" style="letter-spacing:2px;">TURN</span>
        <span id="f1-turn" class="f1-mono" style="font-size:16px;font-weight:700;color:#0dcfcf;">1</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span id="f1-throttle-label" class="f1-section-label" style="letter-spacing:2px;">THROTTLE</span>
        <div style="width:30px;height:4px;background:#040c0c;border:1px solid #0a1212;border-radius:1px;overflow:hidden;">
          <div id="f1-throttle-fill" class="f1-input-bar-fill" style="background:#0dcfcf;width:0%;"></div>
        </div>
      </div>
    </div>

    <!-- Energy store -->
    <div style="margin-top:7px;padding-top:6px;border-top:1px solid #060f0f;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span class="f1-section-label" style="letter-spacing:3px;">ENERGY STORE</span>
        <span id="f1-energy-pct" class="f1-mono" style="font-size:11px;color:#00ff88;transition:color .5s;">85%</span>
      </div>
      <div style="height:6px;background:#040c0c;border-radius:1px;overflow:hidden;border:1px solid #0a1212;position:relative;">
        <div id="f1-energy-bar-glow" style="position:absolute;top:0;left:0;height:100%;filter:blur(4px);opacity:.28;transition:width .15s,background .5s;background:#00ff88;width:85%;"></div>
        <div id="f1-energy-bar-fill" style="position:absolute;top:0;left:0;height:100%;background:linear-gradient(90deg,#00ff8888,#00ff88);transition:width .15s,background .5s;width:85%;"></div>
        ${Array.from({length:9},(_,i)=>`<div style="position:absolute;top:0;left:${(i+1)*10}%;height:100%;width:1px;background:#040c0c;"></div>`).join('')}
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
  </div>
  `;
}

// ── Inject widget ─────────────────────────────────────────────────────────────

function injectWidget() {
  if (document.getElementById('f1-hud-root')) return;

  const hudRoot = document.createElement('div');
  hudRoot.id = 'f1-hud-root';
  hudRoot.innerHTML = buildWidgetHTML();
  document.body.appendChild(hudRoot);

  buildSegBars();
  buildGearStrip();
  buildEnergyPips();

  // ── Toggle open/close ──────────────────────────────────────────────────────
  let dragMoved = false;

  document.getElementById('f1-hud-handle').addEventListener('click', () => {
    if (dragMoved) return;
    state.open = !state.open;
    renderWidget();
  });

  document.getElementById('f1-collapse-btn').addEventListener('click', () => {
    state.open = false;
    renderWidget();
  });

  // ── Drag logic ─────────────────────────────────────────────────────────────
  const handle  = document.getElementById('f1-hud-handle');
  let dragging  = false;
  let startX, startY, startLeft, startTop;

  function dragStart(e) {
    dragging  = true;
    dragMoved = false;

    const touch = e.touches ? e.touches[0] : e;

    // Snapshot current visual position BEFORE changing any styles
    const rect  = hudRoot.getBoundingClientRect();
    startLeft   = rect.left;
    startTop    = rect.top;
    startX      = touch.clientX;
    startY      = touch.clientY;

    // Switch from right-anchored to left/top so translate works predictably
    hudRoot.style.transition = 'none';
    hudRoot.style.right      = 'auto';
    hudRoot.style.left       = startLeft + 'px';
    hudRoot.style.top        = startTop  + 'px';

    hudRoot.classList.add('dragging');
    e.preventDefault();
    e.stopPropagation();
  }

  function dragMove(e) {
    if (!dragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx    = touch.clientX - startX;
    const dy    = touch.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;

    const maxLeft = window.innerWidth  - hudRoot.offsetWidth;
    const maxTop  = window.innerHeight - hudRoot.offsetHeight;
    hudRoot.style.left = Math.max(0, Math.min(maxLeft, startLeft + dx)) + 'px';
    hudRoot.style.top  = Math.max(0, Math.min(maxTop,  startTop  + dy)) + 'px';

    e.preventDefault();
  }

  function dragEnd() {
    if (!dragging) return;
    dragging = false;
    hudRoot.classList.remove('dragging');
    // Re-enable transitions after drag ends
    hudRoot.style.transition = '';
  }

  handle.addEventListener('mousedown',  dragStart, { passive: false });
  handle.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('mousemove', dragMove, { passive: false });
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('mouseup',   dragEnd);
  document.addEventListener('touchend',  dragEnd);

  renderWidget();
  console.log(`[${EXT_NAME}] Widget injected.`);
}

// ── Seg / gear / pip builders ─────────────────────────────────────────────────

function buildSegBars() {
  ['f1-deploy-segs', 'f1-recharge-segs'].forEach(id => {
    const wrap = document.getElementById(id);
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const seg = document.createElement('div');
      seg.className = 'f1-seg off';
      seg.id = `${id}-${i}`;
      wrap.appendChild(seg);
    }
  });
}

function buildGearStrip() {
  const strip = document.getElementById('f1-gear-strip');
  if (!strip) return;
  strip.innerHTML = '';
  ['N','1','2','3','4','5','6','7','8'].forEach(g => {
    const item = document.createElement('div');
    item.className = 'f1-gear-item inactive';
    item.id = `f1-gear-${g}`;
    item.innerHTML = `<span class="f1-gear-text" style="color:#163030">${g}</span>`;
    strip.appendChild(item);
  });
}

function buildEnergyPips() {
  const pips = document.getElementById('f1-energy-pips');
  if (!pips) return;
  pips.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const pip = document.createElement('div');
    pip.id = `f1-pip-${i}`;
    pip.style.cssText = 'width:14px;height:3px;border-radius:1px;background:#040c0c;border:1px solid #0a1212;transition:background .2s,border-color .2s;';
    pips.appendChild(pip);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderWidget() {
  const mc      = MODE_COLORS[state.mode] || MODE_COLORS.NORMAL;
  const eClr    = energyColor(state.energy);
  const mph     = Math.round(state.kmh * 0.621371);
  const C       = 2 * Math.PI * 50;
  const arcFill = C * Math.min(state.kmh / 370, 1);
  const rampPct = mguKPct(state.kmh);
  const rampClr = rampPct > 66 ? '#00D4FF' : rampPct > 33 ? '#FFB800' : '#FF4444';
  const derating = state.energy < 25 && state.aero === 'X';
  const straight  = state.aero === 'X';
  const flapAngle = straight ? 0 : 14;

  // Panel open/close
  const panel = document.getElementById('f1-hud-panel');
  if (panel) panel.className = `${state.open ? 'open' : ''} mode-${state.mode}`;

  // Speed circle
  const arcMain = document.getElementById('f1-arc-main');
  const arcGlow = document.getElementById('f1-arc-glow');
  if (arcMain) { arcMain.style.strokeDasharray = `${arcFill * .8} ${C}`; arcMain.setAttribute('stroke', mc.arc); }
  if (arcGlow && arcFill > 0.5) { arcGlow.style.strokeDasharray = `${arcFill * .8} ${C}`; arcGlow.setAttribute('stroke', mc.arc); }
  setText('f1-kmh', Math.round(state.kmh));
  setText('f1-mph', mph);

  // Mode labels
  styleBoostLabel(state.mode === 'BOOST');
  styleOvertakeLabel(state.mode === 'OVERTAKE');

  // Driver nameplate
  const code = driverCode(state.driver);
  setText('f1-driver-nameplate', state.driver.toUpperCase());
  setText('f1-handle-driver',    code);
  setStyle('f1-driver-nameplate', 'color',      mc.arc);
  setStyle('f1-driver-nameplate', 'textShadow', `0 0 12px ${mc.arc}`);
  setStyle('f1-handle-driver',    'color',      mc.arc);
  setStyle('f1-handle-driver',    'textShadow', `0 0 6px ${mc.arc}`);
  setStyle('f1-live-dot',         'background', mc.arc);
  setStyle('f1-live-dot',         'boxShadow',  `0 0 7px ${mc.arc}`);

  // Battery
  const bw   = Math.round((state.energy / 100) * 15);
  const batt = document.getElementById('f1-battery-fill');
  if (batt) { batt.setAttribute('width', bw); batt.setAttribute('fill', eClr); }

  // Handle
  setText('f1-handle-kmh',  Math.round(state.kmh));
  setText('f1-handle-mode', mc.short);
  setStyle('f1-handle-dot',  'background', mc.arc);
  setStyle('f1-handle-dot',  'boxShadow',  `0 0 8px ${mc.arc}`);
  setStyle('f1-handle-mode', 'color',      mc.arc);
  setStyle('f1-handle-mode', 'textShadow', `0 0 8px ${mc.arc}`);
  setStyle('f1-hud-handle',  'borderColor', `${mc.arc}28`);
  setStyle('f1-hud-handle',  'boxShadow',   `-3px 3px 20px ${mc.glow}`);

  const hef = document.getElementById('f1-handle-energy-fill');
  if (hef) { hef.style.height = `${state.energy}%`; hef.style.background = eClr; }
  setText('f1-handle-energy-pct',  `${Math.round(state.energy)}%`);
  setStyle('f1-handle-energy-pct', 'color', eClr);

  // Seg bars
  renderSegs('f1-deploy-segs',   state.deploy,   DEPLOY_CLR,   '255,140,0');
  renderSegs('f1-recharge-segs', state.recharge, RECHARGE_CLR, '0,212,255');

  // Gear strip
  ['N','1','2','3','4','5','6','7','8'].forEach(g => {
    const el = document.getElementById(`f1-gear-${g}`);
    if (!el) return;
    const on = g === String(state.gear);
    el.className = `f1-gear-item ${on ? 'active' : 'inactive'}`;
    el.querySelector('.f1-gear-text').style.color = on ? '#000' : '#163030';
  });

  // Energy bar
  setStyle('f1-energy-bar-fill', 'width',      `${state.energy}%`);
  setStyle('f1-energy-bar-fill', 'background', `linear-gradient(90deg,${eClr}88,${eClr})`);
  setStyle('f1-energy-bar-glow', 'width',      `${state.energy}%`);
  setStyle('f1-energy-bar-glow', 'background', eClr);
  setText('f1-energy-pct',  `${Math.round(state.energy)}%`);
  setStyle('f1-energy-pct', 'color', eClr);

  for (let i = 0; i < 10; i++) {
    const pip = document.getElementById(`f1-pip-${i}`);
    if (!pip) continue;
    const on = i < Math.ceil(state.energy / 10);
    pip.style.background  = on ? eClr      : '#040c0c';
    pip.style.borderColor = on ? `${eClr}44` : '#0a1212';
  }

  // Brake / throttle
  setStyle('f1-brake-fill',    'width',      `${state.brake}%`);
  setStyle('f1-throttle-fill', 'width',      `${state.throttle}%`);
  setStyle('f1-throttle-fill', 'background', mc.arc);
  setStyle('f1-brake-label',    'color', state.brake    > 10 ? '#ff6644' : '#0a1c1c');
  setStyle('f1-throttle-label', 'color', state.throttle > 10 ? mc.arc   : '#0a1c1c');
  setText('f1-turn', state.turn);

  // MGU-K
  const rampLabel = document.getElementById('f1-ramp-label');
  const rampPctEl = document.getElementById('f1-ramp-pct');
  if (rampLabel) { rampLabel.textContent = state.kmh > RAMP_LO ? 'RAMP↓' : 'FULL'; rampLabel.style.color = state.kmh > RAMP_LO ? rampClr : '#0a4040'; }
  if (rampPctEl) { rampPctEl.textContent = `${rampPct}%`; rampPctEl.style.color = rampClr; }
  setStyle('f1-ramp-fill', 'width',      `${rampPct}%`);
  setStyle('f1-ramp-fill', 'background', `linear-gradient(90deg,${rampClr}88,${rampClr})`);
  setStyle('f1-ramp-glow', 'width',      `${rampPct}%`);
  setStyle('f1-ramp-glow', 'background', rampClr);

  const deratingBox = document.getElementById('f1-derating-box');
  const deratingDot = document.getElementById('f1-derating-dot');
  const deratingLbl = document.getElementById('f1-derating-label');
  if (deratingBox) { deratingBox.style.borderColor = derating ? '#FF444460' : '#0a1414'; deratingBox.style.background = derating ? 'rgba(255,68,68,0.08)' : 'transparent'; }
  if (deratingDot) { deratingDot.style.background = derating ? '#FF4444' : '#0a1c1c'; deratingDot.style.boxShadow = derating ? '0 0 6px #FF4444' : 'none'; deratingDot.style.animation = derating ? 'f1-blink .9s ease-in-out infinite' : 'none'; }
  if (deratingLbl) { deratingLbl.textContent = derating ? 'DERATING' : 'NOMINAL'; deratingLbl.style.color = derating ? '#FF4444' : '#0a2a2a'; }

  // Active Aero
  const aeroColor = straight ? '#0dcfcf' : '#FF8C00';
  const aeroPanel = document.getElementById('f1-aero-panel');
  if (aeroPanel) { aeroPanel.style.borderColor = `${aeroColor}28`; aeroPanel.style.boxShadow = `0 0 10px ${aeroColor}10`; }
  ['f1-rw-main','f1-fw-main'].forEach(id => { const el = document.getElementById(id); if (el) { el.setAttribute('fill', `${aeroColor}33`); el.setAttribute('stroke', aeroColor); }});
  ['f1-rw-pivot','f1-fw-pivot'].forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('fill', aeroColor); });
  ['f1-rw-rect','f1-fw-rect'].forEach(id => { const el = document.getElementById(id); if (el) { el.setAttribute('fill', aeroColor); el.setAttribute('stroke', aeroColor); }});
  const rwFlap = document.getElementById('f1-rw-flap');
  const fwFlap = document.getElementById('f1-fw-flap');
  if (rwFlap) rwFlap.style.transform = `rotate(${flapAngle}deg)`;
  if (fwFlap) fwFlap.style.transform = `rotate(${flapAngle}deg)`;
  const aeroStateLabel = document.getElementById('f1-aero-state-label');
  const aeroModeLabel  = document.getElementById('f1-aero-mode-label');
  if (aeroStateLabel) { aeroStateLabel.textContent = straight ? 'FLAT · LOW DRAG' : 'ANGLED · DOWNFORCE'; aeroStateLabel.setAttribute('fill', `${aeroColor}99`); }
  if (aeroModeLabel)  { aeroModeLabel.textContent = straight ? 'X-MODE' : 'Z-MODE'; aeroModeLabel.style.color = aeroColor; aeroModeLabel.style.textShadow = `0 0 8px ${aeroColor}`; }
}

function renderSegs(id, count, color, rgb) {
  for (let i = 0; i < 5; i++) {
    const seg = document.getElementById(`${id}-${i}`);
    if (!seg) continue;
    const on = i < count;
    seg.style.background = on ? `linear-gradient(180deg,${color}dd,${color}99)` : '#041410';
    seg.style.border      = `1px solid ${on ? color + '44' : '#042010'}`;
    seg.style.boxShadow   = on ? `0 0 6px rgba(${rgb},.5),inset 0 1px 0 rgba(255,255,255,.08)` : 'none';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}

function styleBoostLabel(on) {
  const box = document.getElementById('f1-boost-label-box');
  const lbl = document.getElementById('f1-boost-label');
  if (!box || !lbl) return;
  box.style.background  = on ? 'rgba(255,184,0,0.12)' : 'transparent';
  box.style.borderColor = on ? 'rgba(255,184,0,0.28)' : 'transparent';
  lbl.style.color       = on ? MODE_COLORS.BOOST.arc  : '#0a2a1a';
  lbl.style.textShadow  = on ? `0 0 10px ${MODE_COLORS.BOOST.arc}` : 'none';
}

function styleOvertakeLabel(on) {
  const box = document.getElementById('f1-overtake-label-box');
  const lbl = document.getElementById('f1-overtake-label');
  if (!box || !lbl) return;
  box.style.background  = on ? 'rgba(0,255,136,0.12)'   : 'transparent';
  box.style.borderColor = on ? 'rgba(0,255,136,0.28)'   : 'transparent';
  lbl.style.color       = on ? MODE_COLORS.OVERTAKE.arc : '#0a2a1a';
  lbl.style.textShadow  = on ? `0 0 10px ${MODE_COLORS.OVERTAKE.arc}` : 'none';
}

// ── Context parser ────────────────────────────────────────────────────────────

const PARSE_PROMPT = `You are a telemetry parser for a Formula 1 racing roleplay.

Read the chat excerpt below and extract the current driving telemetry for whichever F1 driver is the point-of-view character. Return ONLY a valid JSON object — no explanation, no markdown, no extra text whatsoever.

--- FIELD RULES ---

"driver"
  The surname of the POV character — whoever the scene is written from the perspective of, or whoever is actively at the wheel. Use the surname exactly as it appears in the text. If a first name is used, infer the surname from context. If completely unclear, return "DRIVER".

"kmh"
  Estimated speed in km/h (integer, 0–370). Infer from narrative context:
  - Pit lane / standing start: 0–80
  - Hairpin / tight chicane: 60–120
  - Slow corner: 100–160
  - Medium corner: 160–220
  - Fast corner: 220–270
  - Beginning of straight / acceleration zone: 240–290
  - Full straight cruising: 280–320
  - Maximum attack straight / slipstream: 320–355
  - Absolute top speed (rare): 355–370

"mph"
  kmh × 0.621, rounded to nearest integer.

"gear"
  Current gear as integer 1–8, or the string "N" for neutral.

"mode"
  One of: "NORMAL", "BOOST", "OVERTAKE".

"aero"
  "X" if on a straight (wings flat, low drag).
  "Z" if in a corner or braking zone (wings angled, high downforce).

"deploy"
  Integer 0–5. ERS segments being deployed (energy going OUT).

"recharge"
  Integer 0–5. ERS segments being harvested (energy coming IN).
  Set this HIGH (3–5) when the text mentions harvesting, lift-and-coast, or braking.

"energy"
  Integer 0–100. Percentage of energy store remaining.

"brake"
  Integer 0–100. Brake pressure percentage.

"throttle"
  Integer 0–100. Throttle percentage.

"turn"
  Integer. The corner number currently being navigated.

Return exactly this JSON structure, no other text:
{"driver":"SURNAME","kmh":267,"mph":166,"gear":7,"mode":"OVERTAKE","aero":"X","deploy":4,"recharge":1,"energy":62,"brake":0,"throttle":95,"turn":7}`;

async function parseContext() {
  if (state.parsing) return;
  state.parsing = true;

  // ── 1. Get fresh context ──────────────────────────────────────────────────
  const ctx = getChat();

  // ── 2. Pre-populate driver name from ST character immediately ─────────────
  if (ctx.name2 && ctx.name2 !== '' && state.driver === 'DRIVER') {
    // Pull just the surname (last word) as default until LLM confirms
    const parts = ctx.name2.trim().split(/\s+/);
    state.driver = parts[parts.length - 1];
    renderWidget();
  }

  if (!ctx.chat || ctx.chat.length === 0) { state.parsing = false; return; }

  // ── 3. Build prompt ────────────────────────────────────────────────────────
  const recent   = ctx.chat.slice(-6).map(m => `${m.name}: ${m.mes}`).join('\n\n');
  const charHint = ctx.name2 ? `The POV driver's character name is: ${ctx.name2}` : '';
  const prompt   = `${PARSE_PROMPT}\n\n${charHint}\n\nCHAT EXCERPT:\n${recent}`;

  // ── 4. Show parsing indicator ─────────────────────────────────────────────
  const indicator = document.getElementById('f1-parse-indicator');
  if (indicator) indicator.className = 'parsing';

  try {
    const raw = await generateQuietPrompt(prompt, false, false);

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.driver   === 'string' && parsed.driver.length > 0 && parsed.driver !== 'DRIVER') state.driver   = parsed.driver;
    if (typeof parsed.kmh      === 'number' && parsed.kmh >= 0)           state.kmh      = Math.min(370, Math.round(parsed.kmh));
    if (parsed.gear !== undefined)                                          state.gear     = parsed.gear;
    if (['NORMAL','BOOST','OVERTAKE'].includes(parsed.mode))               state.mode     = parsed.mode;
    if (['X','Z'].includes(parsed.aero))                                   state.aero     = parsed.aero;
    if (typeof parsed.deploy   === 'number') state.deploy   = Math.min(5, Math.max(0, Math.round(parsed.deploy)));
    if (typeof parsed.recharge === 'number') state.recharge = Math.min(5, Math.max(0, Math.round(parsed.recharge)));
    if (typeof parsed.energy   === 'number') state.energy   = Math.min(100, Math.max(0, Math.round(parsed.energy)));
    if (typeof parsed.brake    === 'number') state.brake    = Math.min(100, Math.max(0, Math.round(parsed.brake)));
    if (typeof parsed.throttle === 'number') state.throttle = Math.min(100, Math.max(0, Math.round(parsed.throttle)));
    if (typeof parsed.turn     === 'number') state.turn     = parsed.turn;

    renderWidget();
    if (indicator) { indicator.className = 'done'; setTimeout(() => { indicator.className = ''; }, 1500); }
    console.log(`[${EXT_NAME}] Parsed:`, parsed);
  } catch (err) {
    console.warn(`[${EXT_NAME}] Parse failed:`, err.message);
    if (indicator) indicator.className = '';
  } finally {
    state.parsing = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function init() {
  try {
    injectWidget();

    // Pre-load driver name as soon as possible
    const ctx = getChat();
    if (ctx.name2) {
      const parts = ctx.name2.trim().split(/\s+/);
      state.driver = parts[parts.length - 1];
      renderWidget();
    }

    // Listen for new messages
    eventSource.on(event_types.MESSAGE_RECEIVED, () => setTimeout(parseContext, 400));
    eventSource.on(event_types.MESSAGE_SENT,     () => setTimeout(parseContext, 400));

    // Also re-check when the character changes
    eventSource.on(event_types.CHAT_CHANGED, () => {
      const c = getChat();
      if (c.name2) {
        const parts = c.name2.trim().split(/\s+/);
        state.driver = parts[parts.length - 1];
        renderWidget();
      }
    });

    console.log(`[${EXT_NAME}] Loaded.`);
  } catch (err) {
    console.error(`[${EXT_NAME}] Init error:`, err);
  }
}
```
