(function () {
  const EXT_NAME = "f1-ers-hud";

  function init() {
    if (document.getElementById("f1-hud-root")) return;

    const root = document.createElement("div");
    root.id = "f1-hud-root";

    // Start with LEFT/TOP (no 'right' at all)
    root.style.position = "fixed";
    root.style.left = "20px";
    root.style.top = "80px";
    root.style.zIndex = "99999";
    root.style.background = "#111";
    root.style.color = "#0dcfcf";
    root.style.padding = "12px";
    root.style.border = "1px solid #0dcfcf55";
    root.style.fontFamily = "monospace";
    root.style.cursor = "grab";
    root.style.userSelect = "none";
    root.style.touchAction = "none"; // critical

    root.textContent = "F1 HUD DRAG (WINDOW POINTER)";

    document.body.appendChild(root);

    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    let activePointerId = null;

    function onPointerDown(e) {
      dragging = true;
      activePointerId = e.pointerId;

      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop  = rect.top;

      // capture so we keep receiving moves even if ST overlays intercept
      try { root.setPointerCapture(activePointerId); } catch {}

      // listen on window (not document/root) to bypass ST layers
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging || e.pointerId !== activePointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      root.style.left = (startLeft + dx) + "px";
      root.style.top  = (startTop  + dy) + "px";

      e.preventDefault();
    }

    function onPointerUp(e) {
      if (e.pointerId !== activePointerId) return;

      dragging = false;
      activePointerId = null;

      try { root.releasePointerCapture(e.pointerId); } catch {}

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    // use capture phase to beat other handlers
    root.addEventListener("pointerdown", onPointerDown, { passive: false, capture: true });

    console.log(`[${EXT_NAME}] POINTER DRAG (WINDOW) ACTIVE`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
