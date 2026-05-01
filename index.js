// ═══════════════════════════════════════════════════════════════
// F1 2026 ERS HUD — FIXED VERSION
// ═══════════════════════════════════════════════════════════════

(function () {
  const EXT_NAME = 'f1-ers-hud';

  // ── SAFE ST ACCESS ──
  function getSTContext() {
    return {
      chat: window.chat || [],
      name2:
        window.name2 ||
        window.characters?.[window.this_chid]?.name ||
        '',
    };
  }

  async function quietPrompt(prompt) {
    if (typeof window.generateQuietPrompt === 'function') {
      return await window.generateQuietPrompt(prompt, false, false);
    }
    throw new Error('[f1-ers-hud] generateQuietPrompt missing');
  }

  function registerSTEvents(callback) {
    if (window.eventSource && window.event_types) {
      window.eventSource.on(window.event_types.MESSAGE_RECEIVED, callback);
      window.eventSource.on(window.event_types.MESSAGE_SENT, callback);
      return;
    }

    const chatEl = document.getElementById('chat');
    if (chatEl) {
      new MutationObserver(callback).observe(chatEl, { childList: true });
    }
  }

  // ── STATE ──
  const state = {
    kmh: 0,
    gear: 'N',
    mode: 'NORMAL',
    aero: 'X',
    deploy: 0,
    recharge: 0,
    energy: 85,
    brake: 0,
    throttle: 0,
    turn: 1,
    driver: 'DRIVER',
    open: true, // 👈 visible by default
  };

  const MODE_COLORS = {
    NORMAL: { arc: '#0dcfcf', short: 'NRM' },
    BOOST: { arc: '#FFB800', short: 'BST' },
    OVERTAKE: { arc: '#00ff88', short: 'OT' },
  };

  function driverCode(name) {
    return name.replace(/[\s\-]/g, '').slice(0, 3).toUpperCase();
  }

  function energyColor(e) {
    return e > 50 ? '#00ff88' : e > 25 ? '#FFB800' : '#FF4444';
  }

  // ── BUILD ──
  function buildWidget() {
    const root = document.createElement('div');
    root.id = 'f1-hud-root';

    root.innerHTML = `
      <div id="f1-hud-panel"></div>
      <div id="f1-hud-handle">HUD</div>
    `;

    document.body.appendChild(root);

    return root;
  }

  // ── DRAG (SAFE + SCOPED) ──
  function enableDrag(root) {
    const handle = root.querySelector('#f1-hud-handle');

    let dragging = false;
    let startX, startY, startLeft, startTop;

    function move(e) {
      if (!dragging) return;

      const p = e.touches ? e.touches[0] : e;

      const dx = p.clientX - startX;
      const dy = p.clientY - startY;

      root.style.left = startLeft + dx + 'px';
      root.style.top = startTop + dy + 'px';

      e.preventDefault();
    }

    function end() {
      dragging = false;

      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
    }

    function start(e) {
      dragging = true;

      const p = e.touches ? e.touches[0] : e;

      const rect = root.getBoundingClientRect();

      startX = p.clientX;
      startY = p.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      root.style.right = 'auto';

      document.addEventListener('mousemove', move, { passive: false });
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', end);

      e.preventDefault();
    }

    handle.addEventListener('mousedown', start, { passive: false });
    handle.addEventListener('touchstart', start, { passive: false });
  }

  // ── RENDER (MINIMAL SAFE) ──
  function render() {
    const kmhEl = document.getElementById('f1-hud-handle');
    if (!kmhEl) return;

    kmhEl.textContent =
      state.kmh + ' ' + MODE_COLORS[state.mode].short;
  }

  // ── PARSER ──
  async function parseContext() {
    const ctx = getSTContext();
    if (!ctx.chat.length) return;

    try {
      const raw = await quietPrompt("Return {\"kmh\":120}");

      const json = raw.match(/\{.*\}/);
      if (!json) return;

      const data = JSON.parse(json[0]);

      if (data.kmh) state.kmh = data.kmh;

      render();
    } catch (e) {
      console.warn('[f1-ers-hud] parse failed');
    }
  }

  // ── INIT ──
  function init() {
    if (document.getElementById('f1-hud-root')) return;

    const root = buildWidget();

    enableDrag(root);

    registerSTEvents(() => setTimeout(parseContext, 200));

    render();

    console.log('[f1-ers-hud] loaded safely');
  }

  // SAFER THAN jQuery INIT
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
