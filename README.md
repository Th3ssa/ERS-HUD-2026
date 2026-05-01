# F1 2026 ERS HUD

A live telemetry HUD extension for SillyTavern. Works with any F1 racing roleplay — reads chat context after every message and updates the widget automatically.

---

## What it does

After each message, the extension reads the last 6 messages from your chat and extracts telemetry using your existing ST API connection. No separate API key needed. No hardcoded driver list — it detects whoever is at the wheel from context and adapts the widget accordingly.

**Updates automatically:**
- Driver surname + 3-letter code (any F1 driver, real or fictional)
- Speed (KM/H + MPH)
- Gear (inferred from speed and context)
- ERS mode — NORMAL / BOOST / OVERTAKE
- Active Aero — X-MODE (straight) / Z-MODE (corner)
- Deploy and Recharge bars (energy flow)
- Energy Store %
- Brake pressure
- Throttle %
- Turn number

**Live energy simulation:** deploy drains the store, recharge refills it. MGU-K rampdown activates above 290 km/h. Derating warning fires when battery drops critically low on a straight.

**Works with your existing lorebook** — no lorebook included. The parser reads whatever F1 context your lorebook and character cards already provide.

---

## Install

1. Open SillyTavern
2. Go to **Extensions** → **Install extension**
3. Enter:
   ```
   Th3ssa/f1-ers-hud
   ```
4. Click **Install**
5. Toggle the extension **ON**
6. Reload SillyTavern

The widget handle appears pinned top-right immediately.

---

## Repo structure

```
f1-ers-hud/
├── manifest.json   ← ST extension registration
├── index.js        ← widget + context parser + ST event hooks
├── widget.css      ← Shape C corner widget styles
├── README.md
└── INSTALL.md
```

---

*Built for F1 alternate universe roleplay in SillyTavern.*
