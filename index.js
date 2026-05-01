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

    // 🔥 critical
    root.style.touchAction = "none";

    root.textContent = "F1 HUD POINTER DRAG";

    document.body.appendChild(root);

    let dragging = false;
    let startX, startY, startLeft, startTop;

    root.addEventListener("pointerdown", (e) => {
      dragging = true;

      const rect = root.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop  = rect.top;

      // switch positioning
      root.style.right = "auto";
      root.style.left  = startLeft + "px";
      root.style.top   = startTop  + "px";

      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      root.style.left = startLeft + dx + "px";
      root.style.top  = startTop  + dy + "px";
    });

    root.addEventListener("pointerup", (e) => {
      dragging = false;
      root.releasePointerCapture(e.pointerId);
    });

    root.addEventListener("pointercancel", () => {
      dragging = false;
    });

    console.log(`[${EXT_NAME}] POINTER DRAG ACTIVE`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
