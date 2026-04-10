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

## 🚀 Installation (Load Unpacked — Developer Mode)

### Chrome / Brave / Vivaldi / Arc / Edge

1. Open your browser and go to:
   ```
   chrome://extensions
   ```
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `darkwave-extension` folder
5. The 🌙 DarkWave icon will appear in your toolbar

> **Pin it**: Click the puzzle icon in your toolbar → Pin DarkWave for quick access.

---

### Firefox / Zen Browser

Firefox uses Manifest V3 with slight differences. To load temporarily:

1. Go to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click **"Load Temporary Add-on"**
3. Select the `manifest.json` file inside the `darkwave-extension` folder
4. The extension loads until you restart Firefox

> For a permanent install in Firefox, you'll need to sign the extension via [addons.mozilla.org](https://addons.mozilla.org) — see the Publishing section below.

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

## 🛠️ File Structure

```
darkwave-extension/
├── manifest.json        # Extension config (Manifest V3)
├── background.js        # Service worker — settings sync, tab events
├── content.js           # Injected into every page — applies dark mode
├── content.css          # Flash-prevention CSS (loaded at document_start)
├── popup.html           # Extension popup UI
├── popup.css            # Popup styles
├── popup.js             # Popup interaction logic
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

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

## 📦 Publishing / Deployment

### Chrome Web Store

1. Zip the `darkwave-extension` folder:
   ```bash
   cd darkwave-extension
   zip -r ../darkwave-v1.0.zip . --exclude "*.DS_Store" --exclude "__MACOSX"
   ```
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
3. Pay the one-time $5 developer fee (if not already done)
4. Click **"Add new item"** → upload the `.zip`
5. Fill in description, screenshots, category: **"Productivity"**
6. Submit for review (usually 1–3 business days)

### Firefox Add-ons (for Zen browser permanent install)

1. Create an account at [addons.mozilla.org](https://addons.mozilla.org)
2. Go to [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/agreement)
3. Upload the same `.zip` file
4. Firefox may ask you to add a `browser_specific_settings` block to manifest.json:
   ```json
   "browser_specific_settings": {
     "gecko": {
       "id": "darkwave@youremail.com",
       "strict_min_version": "109.0"
     }
   }
   ```

### Edge Add-ons

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge)
2. Upload the same `.zip` — Edge accepts Chrome extensions natively

---

## 🔧 Customization & Development

### Modifying the Dark Mode Algorithm

The core algorithm is in `content.js` inside `buildCSS()`:

```js
filter: invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast})
```

- `invert(1)` — flips all colors (white→black, black→white)
- `hue-rotate(180deg)` — rotates hues back to correct colors after inversion
- `brightness()` — controls overall lightness
- `contrast()` — controls color separation

### Adding Site-Specific Rules

To add special handling for a specific site, edit `content.js` in `buildCSS()`:

```js
// Example: special rule for Notion
html[data-darkwave] .notion-page-content {
  background: #1a1a24 !important;
}
```

### Testing Changes

After editing any file:
1. Go to `chrome://extensions`
2. Click the **refresh icon** on the DarkWave card
3. Reload your test page — changes apply immediately

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

## 📜 License

MIT — free to use, modify, and distribute.

---

*Built with 🌙 — DarkWave*
