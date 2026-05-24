# 🌙 DarkWave — Smart Dark Mode Extension

> Flawless dark mode for every website. Fine-tuned for Google Sheets, Docs, and every browser.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Global Toggle** | One-click master switch for all sites |
| **Per-Site Override** | Enable or disable dark mode per domain |
| **Brightness Control** | Slider from 50–100% to dial in darkness |
| **Contrast Control** | Slider from 50–120% for visual comfort |
| **Image Protection** | Re-inverts images so photos look natural |
| **Smooth Transitions** | CSS animations when toggling |
| **Auto Schedule** | Time-based activation (e.g. 8PM → 7AM) |
| **Quick Presets** | Balanced, Midnight, Soft, Abyss |
| **Zero Flash** | Dark mode applies before page renders |
| **Google Sheets/Docs** | Specially handled for canvas-based rendering |
| **Cross-Browser** | Chrome, Vivaldi, Brave, Edge, Zen (Firefox), Arc |

---

## 🎮 How to Use

### Basic Usage
- Click the DarkWave icon in your toolbar to open the popup
- Toggle the **Global Dark Mode** switch to enable/disable everywhere
- Visit any website — dark mode applies automatically

### Per-Site Control
- When on a website, open the popup
- The **current site card** shows the site name and toggle
- Toggle it to override the global setting for just that site
- A purple dot indicates the site has a custom override

### Adjusting Darkness
- **Brightness slider**: Lower = darker background (default: 85%)
- **Contrast slider**: Higher = sharper text (default: 90%)
- Use **presets** for quick configurations:
  - 🌙 **Balanced** — comfortable for general browsing
  - 🌑 **Midnight** — deep dark, great for late night
  - 🌫️ **Soft** — gentle, easy on the eyes
  - ⬛ **Abyss** — maximum darkness

### Auto Schedule
- Enable **Auto Schedule** in Options
- Set your **From** and **To** times
- DarkWave will automatically turn on/off at those times
- Supports overnight schedules (e.g. 8PM → 7AM)

### Google Sheets & Docs Tips
- DarkWave uses a smart invert + hue-rotate technique that handles the canvas-rendered grid in Sheets
- If you see the canvas grid looking odd, toggle **Image Protection ON** — it re-inverts the canvas element
- For Docs, the technique works seamlessly out of the box

---

## 🌐 Browser Compatibility

| Browser | Engine | Supported | Notes |
|---|---|---|---|
| Chrome 88+ | Chromium | ✅ Full | Primary target |
| Brave | Chromium | ✅ Full | Works identically |
| Vivaldi | Chromium | ✅ Full | Works identically |
| Arc | Chromium | ✅ Full | Works identically |
| Edge (Chromium) | Chromium | ✅ Full | Works identically |
| Firefox 109+ | Gecko | ✅ Full | MV3 supported |
| Zen Browser | Gecko | ✅ Full | Based on Firefox |
| Opera | Chromium | ✅ Full | Works identically |
| Safari | WebKit | ⚠️ Partial | Requires Safari Web Extensions conversion |

---

## 🐛 Troubleshooting

| Issue | Fix |
|---|---|
| Dark mode not applying on a page | Click the extension icon and check if the site toggle is off |
| Images look inverted/wrong | Enable **Image Protection** in the popup |
| Google Sheets grid looks odd | Toggle Image Protection on/off to re-sync |
| White flash on page load | This is a browser limitation; it's minimized by our `document_start` injection |
| Extension not showing in toolbar | Click the puzzle icon → find DarkWave → pin it |
| Firefox: extension removed on restart | You need to sign it via AMO for a permanent install |

---

*Built with 🌙 — DarkWave*
