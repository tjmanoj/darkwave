// DarkWave — Content Script
// Runs at document_start for zero-flash dark mode

(async function () {
  const STYLE_ID = '__darkwave_style__';
  const FLASH_ID = '__darkwave_flash__';

  // Immediately inject a flash-prevention style
  injectFlashPrevention();

  // Get settings from storage
  let settings;
  try {
    settings = await chrome.storage.local.get(null);
  } catch (e) {
    return;
  }

  if (!settings || Object.keys(settings).length === 0) {
    removeFlashPrevention();
    return;
  }

  const hostname = location.hostname;
  const enabled = resolveEnabled(settings, hostname);

  if (enabled) {
    // Bug 4 fix: detect if page is already natively dark.
    // We wait for DOMContentLoaded so computed styles are available.
    // If the page is already dark AND has no explicit user override, skip applying.
    const applyWhenReady = () => {
      // Remove flash prevention FIRST so isPageNativelyDark() reads actual
      // page colours, not the injected #1a1a1a placeholder (which would
      // always appear "dark" and prevent dark mode from ever being applied).
      removeFlashPrevention();

      const alreadyDark = isPageNativelyDark();
      const siteOverride = settings.siteSettings?.[hostname];
      const hasExplicitOverride = siteOverride?.overridden;

      if (alreadyDark && !hasExplicitOverride) {
        // Page has its own dark mode — store this so popup can show a hint
        chrome.storage.local.set({ [`nativeDark:${hostname}`]: true });
        return;
      }
      chrome.storage.local.set({ [`nativeDark:${hostname}`]: false });
      applyDarkMode(settings);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyWhenReady, { once: true });
      // Still apply flash prevention immediately
    } else {
      applyWhenReady();
    }
  } else {
    removeFlashPrevention();
  }

  // Listen for live updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'APPLY_DARK') {
      applyDarkMode(msg.settings);
    }
    if (msg.type === 'REMOVE_DARK') {
      removeDarkMode();
    }
    if (msg.type === 'UPDATE_DARK') {
      applyDarkMode(msg.settings);
    }
  });

  // Observe DOM changes for SPAs (Google Sheets/Docs navigate without full reload)
  const observer = new MutationObserver(() => {
    const el = document.getElementById(STYLE_ID);
    if (!el && document.documentElement.hasAttribute('data-darkwave')) {
      applyDarkMode(settings);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: false });

  // ─── Functions ───────────────────────────────────────────────────────────────

  function injectFlashPrevention() {
    const existing = document.getElementById(FLASH_ID);
    if (existing) return;
    const s = document.createElement('style');
    s.id = FLASH_ID;
    // Minimal style to prevent white flash before JS runs
    s.textContent = `
      html { background: #1a1a1a !important; }
    `;
    (document.head || document.documentElement).insertBefore(s, document.head?.firstChild || null);
  }

  function removeFlashPrevention() {
    const el = document.getElementById(FLASH_ID);
    if (el) el.remove();
    document.documentElement.style.removeProperty('background');
  }

  function applyDarkMode(opts) {
    const brightness = (opts.brightness ?? 85) / 100;
    const contrast = (opts.contrast ?? 90) / 100;
    const transition = opts.smoothTransition !== false ? 'filter 0.25s ease' : 'none';

    const css = buildCSS(brightness, contrast, transition, opts.imageProtection !== false);

    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
    document.documentElement.setAttribute('data-darkwave', 'true');

    // Remove flash prevention style once dark mode is applied
    removeFlashPrevention();
  }

  function removeDarkMode() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    document.documentElement.removeAttribute('data-darkwave');
    removeFlashPrevention();
  }

  function buildCSS(brightness, contrast, transition, imageProtection) {
    return `
      html[data-darkwave] {
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast}) !important;
        transition: ${transition} !important;
      }

      /* Re-invert ONLY real media — photos, videos, profile pics */
      html[data-darkwave] img:not([src*="data:image/svg"]),
      html[data-darkwave] video,
      html[data-darkwave] picture > img,
      html[data-darkwave] .docs-header-favicon {
        filter: ${imageProtection ? 'invert(1) hue-rotate(180deg) brightness(1.05)' : 'none'} !important;
      }

      /* Google Sheets & Docs — DO NOT re-invert canvas.
         The html-level inversion already darkens the canvas grid.
         Re-inverting it (as before) was double-inverting it back to white cells.
         Leave canvas alone so Sheets cells stay properly dark. */
      html[data-darkwave] canvas {
        /* intentionally no filter override — inherits html inversion */
      }

      /* Sheets: freeze pane corner box and toolbar icons — re-invert so they look natural */
      html[data-darkwave] .waffle-frozen-corner-bar,
      html[data-darkwave] .docs-gm {
        filter: ${imageProtection ? 'invert(1) hue-rotate(180deg)' : 'none'} !important;
      }

      /* iframes inside the page also get dark mode */
      html[data-darkwave] iframe:not([src*="google.com/recaptcha"]):not([src*="youtube"]) {
        filter: invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast}) !important;
      }

      /* Preserve recaptcha, maps, and YouTube iframes */
      html[data-darkwave] iframe[src*="google.com/recaptcha"],
      html[data-darkwave] iframe[src*="youtube.com"],
      html[data-darkwave] iframe[src*="maps.google"] {
        filter: none !important;
      }

      /* Custom scrollbars */
      html[data-darkwave] {
        scrollbar-color: #4a4a5a #1e1e2e !important;
      }
      html[data-darkwave] ::-webkit-scrollbar {
        background-color: #1e1e2e !important;
        width: 10px !important;
      }
      html[data-darkwave] ::-webkit-scrollbar-thumb {
        background-color: #4a4a5a !important;
        border-radius: 5px !important;
      }
      html[data-darkwave] ::-webkit-scrollbar-thumb:hover {
        background-color: #6a6a7a !important;
      }

      /* Selection color fix */
      html[data-darkwave] ::selection {
        background: rgba(100, 160, 255, 0.35) !important;
      }
    `;
  }

  function resolveEnabled(s, hostname) {
    if (s.blacklist?.includes(hostname)) return false;
    const site = s.siteSettings?.[hostname];
    if (site?.overridden) return site.enabled;
    return s.globalEnabled ?? true;
  }

  // Bug 4: Detect if the page is natively dark (background luminance < 30%)
  // Checks html and body background color after DOMContentLoaded.
  function isPageNativelyDark() {
    const targets = [document.documentElement, document.body];
    for (const el of targets) {
      if (!el) continue;
      const bg = window.getComputedStyle(el).backgroundColor;
      const match = bg.match(/\d+(\.\d+)?/g);
      if (!match || match.length < 3) continue;
      const [r, g, b] = match.map(Number);
      // Skip transparent (alpha=0) or unset backgrounds
      if (match[3] !== undefined && parseFloat(match[3]) < 0.1) continue;
      if (r === 0 && g === 0 && b === 0) continue; // default black = not set
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.25) return true; // dark background found
    }

    // Also check meta color-scheme and media prefers-color-scheme matching
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme?.content?.includes('dark')) {
      // Page explicitly declares dark support and may already be in dark mode
      // Only skip if the page also looks dark (checked above), so we trust the luminance check
    }

    return false;
  }
})();

