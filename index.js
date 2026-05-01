(function () {
  const EXT_NAME = "f1-ers-hud";

  function init() {
    // prevent duplicate injection
    if (document.getElementById("f1-hud-root")) return;

    const root = document.createElement("div");
    root.id = "f1-hud-root";

    root.style.position = "fixed";
    root.style.top = "20px";
    root.style.right = "20px";
    root.style.zIndex = "99999";
    root.style.background = "#111";
    root.style.color = "#0dcfcf";
    root.style.padding = "10px";
    root.style.border = "1px solid #0dcfcf55";
    root.style.fontFamily = "monospace";

    root.textContent = "F1 HUD LOADED";

    document.body.appendChild(root);

    console.log(`[${EXT_NAME}] SAFE LOAD`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
