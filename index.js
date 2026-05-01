(function () {
  const EXT_NAME = "f1-ers-hud";

  function init() {
    if (document.getElementById("f1-hud-root")) return;

    const root = document.createElement("div");
    root.id = "f1-hud-root";

    root.style.position = "fixed";
    root.style.top = "40px";
    root.style.right = "20px";
    root.style.zIndex = "99999";
    root.style.background = "#111";
    root.style.color = "#0dcfcf";
    root.style.padding = "12px";
    root.style.border = "1px solid #0dcfcf55";
    root.style.fontFamily = "monospace";
    root.style.cursor = "grab";

    // 🔥 CRITICAL FOR MOBILE DRAG
    root.style.touchAction = "none";

    root.textContent = "F1 HUD DRAG MOBILE FIX";

    document.body.appendChild(root);

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

      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", end);
    }

    function start(e) {
      dragging = true;

      const p = e.touches ? e.touches[0] : e;
      const rect = root.getBoundingClientRect();

      startX = p.clientX;
      startY = p.clientY;

      startLeft = rect.left;
      startTop  = rect.top;

      root.style.right = "auto";
      root.style.left  = startLeft + "px";
      root.style.top   = startTop  + "px";

      // 🔥 IMPORTANT: prevent scroll immediately
      e.preventDefault();

      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", end);
      document.addEventListener("mousemove", move, { passive: false });
      document.addEventListener("mouseup", end);
    }

    root.addEventListener("touchstart", start, { passive: false });
    root.addEventListener("mousedown", start, { passive: false });

    console.log(`[${EXT_NAME}] MOBILE DRAG FIX ACTIVE`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
