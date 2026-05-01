(function () {
  const EXT_NAME = "f1-ers-hud";

  function init() {
    if (document.getElementById("f1-hud-root")) return;

    const root = document.createElement("div");
    root.id = "f1-hud-root";

    // initial position (right side)
    root.style.position = "fixed";
    root.style.top = "20px";
    root.style.right = "20px";
    root.style.zIndex = "99999";
    root.style.background = "#111";
    root.style.color = "#0dcfcf";
    root.style.padding = "10px";
    root.style.border = "1px solid #0dcfcf55";
    root.style.fontFamily = "monospace";
    root.style.cursor = "grab";
    root.style.userSelect = "none";

    root.textContent = "F1 HUD DRAG OK";

    document.body.appendChild(root);

    // ── DRAG SYSTEM ──
    let dragging = false;
    let startX, startY, startLeft, startTop;

    function move(e) {
      if (!dragging) return;

      const p = e.touches ? e.touches[0] : e;

      const dx = p.clientX - startX;
      const dy = p.clientY - startY;

      root.style.left = startLeft + dx + "px";
      root.style.top  = startTop  + dy + "px";

      e.preventDefault();
    }

    function end() {
      if (!dragging) return;
      dragging = false;

      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", end);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    }

    function start(e) {
      dragging = true;

      const p = e.touches ? e.touches[0] : e;
      const rect = root.getBoundingClientRect();

      startX = p.clientX;
      startY = p.clientY;

      // capture current position
      startLeft = rect.left;
      startTop  = rect.top;

      // 🔥 switch from right → left positioning
      root.style.right = "auto";
      root.style.left  = startLeft + "px";
      root.style.top   = startTop  + "px";

      document.addEventListener("mousemove", move, { passive: false });
      document.addEventListener("mouseup", end);
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", end);

      e.preventDefault();
    }

    root.addEventListener("mousedown", start, { passive: false });
    root.addEventListener("touchstart", start, { passive: false });

    console.log(`[${EXT_NAME}] DRAG BASELINE OK`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
