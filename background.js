// DarkWave — Background Service Worker

const DEFAULT_SETTINGS = {
  globalEnabled: true,
  brightness: 85,
  contrast: 90,
  siteSettings: {},
  blacklist: [],
  scheduleEnabled: false,
  scheduleStart: '20:00',
  scheduleEnd: '07:00',
  imageProtection: true,
  smoothTransition: true,
};

// ── Toolbar icon badge ────────────────────────────────────────────────────────
// Reflects current dark mode state so the icon gives visual feedback.
function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#a78bfa' : '#55556e' });
  chrome.action.setTitle({
    title: enabled ? 'DarkWave — Dark mode ON' : 'DarkWave — Dark mode OFF',
  });
}

// Restore badge when the service worker wakes up after being killed
chrome.runtime.onStartup.addListener(async () => {
  const s = await chrome.storage.local.get('globalEnabled');
  updateBadge(s.globalEnabled ?? true);
});

// Initialize storage with defaults on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  const merged = { ...DEFAULT_SETTINGS, ...existing };
  await chrome.storage.local.set(merged);
  updateBadge(merged.globalEnabled);
  console.log('[DarkWave] Installed and initialized.');

  // Apply dark mode to tabs that were already open when the extension installed,
  // since tabs.onUpdated won't fire again for them.
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    try {
      const hostname = getHostname(tab.url);
      const shouldApply = resolveEnabled(merged, hostname);
      await applyToTab(tab.id, shouldApply, merged, hostname);
    } catch (_) {}
  }
});

// Re-apply dark mode whenever a tab finishes loading
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) return;

  const settings = await chrome.storage.local.get(null);
  const hostname = getHostname(tab.url);
  const shouldApply = resolveEnabled(settings, hostname);

  await applyToTab(tabId, shouldApply, settings, hostname);
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    const settings = await chrome.storage.local.get(null);
    sendResponse({ settings });
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    const current = await chrome.storage.local.get(null);
    const updated = { ...current, ...message.payload };
    await chrome.storage.local.set(updated);
    updateBadge(updated.globalEnabled);

    // Broadcast to all active tabs
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      try {
        const hostname = getHostname(tab.url);
        const shouldApply = resolveEnabled(updated, hostname);
        await applyToTab(tab.id, shouldApply, updated, hostname);
      } catch (_) {}
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'TOGGLE_SITE') {
    const current = await chrome.storage.local.get(null);
    const hostname = message.payload.hostname;
    const siteSettings = current.siteSettings || {};

    if (siteSettings[hostname]?.overridden) {
      // Remove override
      delete siteSettings[hostname];
    } else {
      // Set override opposite to global
      siteSettings[hostname] = {
        overridden: true,
        enabled: !current.globalEnabled,
      };
    }

    const updated = { ...current, siteSettings };
    await chrome.storage.local.set(updated);

    // Apply to current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const shouldApply = resolveEnabled(updated, hostname);
      await applyToTab(tab.id, shouldApply, updated, hostname);
    }
    sendResponse({ success: true, siteSettings });
    return true;
  }

  if (message.type === 'GET_TAB_INFO') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      sendResponse({ url: tab.url, hostname: getHostname(tab.url) });
    }
    return true;
  }

  if (message.type === 'TOGGLE_BLACKLIST') {
    const current = await chrome.storage.local.get(null);
    const hostname = message.payload.hostname;
    const blacklist = current.blacklist ? [...current.blacklist] : [];
    const idx = blacklist.indexOf(hostname);
    const nowBlacklisted = idx === -1;
    if (nowBlacklisted) {
      blacklist.push(hostname);
    } else {
      blacklist.splice(idx, 1);
    }
    const updated = { ...current, blacklist };
    await chrome.storage.local.set(updated);

    // Remove dark mode immediately if we just blacklisted, re-apply if un-blacklisted
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const shouldApply = nowBlacklisted ? false : resolveEnabled(updated, hostname);
      await applyToTab(tab.id, shouldApply, updated, hostname);
    }
    sendResponse({ success: true, blacklist, nowBlacklisted });
    return true;
  }

  if (message.type === 'REMOVE_BLACKLIST_ENTRY') {
    const current = await chrome.storage.local.get(null);
    const hostname = message.payload.hostname;
    const blacklist = (current.blacklist || []).filter(h => h !== hostname);
    const updated = { ...current, blacklist };
    await chrome.storage.local.set(updated);
    // Re-apply to any open tabs for this hostname
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      try {
        if (getHostname(tab.url) === hostname) {
          await applyToTab(tab.id, resolveEnabled(updated, hostname), updated, hostname);
        }
      } catch (_) {}
    }
    sendResponse({ success: true, blacklist });
    return true;
  }
});

// ── Keyboard shortcut handler ────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'blacklist-site') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url) return;
    const hostname = getHostname(activeTab.url);
    if (!hostname) return;

    const current = await chrome.storage.local.get(null);
    const blacklist = current.blacklist ? [...current.blacklist] : [];
    const idx = blacklist.indexOf(hostname);
    const nowBlacklisted = idx === -1;
    if (nowBlacklisted) blacklist.push(hostname);
    else blacklist.splice(idx, 1);

    const updated = { ...current, blacklist };
    await chrome.storage.local.set(updated);

    const shouldApply = nowBlacklisted ? false : resolveEnabled(updated, hostname);
    await applyToTab(activeTab.id, shouldApply, updated, hostname);

    // Toast on page
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (label) => {
          const e = document.getElementById('__darkwave_toast__');
          if (e) e.remove();
          const t = document.createElement('div');
          t.id = '__darkwave_toast__';
          t.textContent = label;
          Object.assign(t.style, {
            position: 'fixed', bottom: '24px', right: '24px',
            background: '#13131c', color: '#e8e8f0',
            fontFamily: 'system-ui, sans-serif', fontSize: '13px',
            fontWeight: '600', padding: '10px 18px',
            borderRadius: '999px', zIndex: '2147483647',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            opacity: '0', transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
          });
          document.body.appendChild(t);
          requestAnimationFrame(() => { t.style.opacity = '1'; });
          setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
        },
        args: [nowBlacklisted ? `🚫 Blacklisted: ${hostname}` : `✅ Un-blacklisted: ${hostname}`],
      });
    } catch (_) {}
    return;
  }

  if (command !== 'toggle-darkwave') return;

  const settings = await chrome.storage.local.get(null);
  const newState = !settings.globalEnabled;
  await chrome.storage.local.set({ globalEnabled: newState });
  updateBadge(newState);

  // Apply to all tabs
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    try {
      const hostname = getHostname(tab.url);
      const resolved = resolveEnabled({ ...settings, globalEnabled: newState }, hostname);
      await applyToTab(tab.id, resolved, { ...settings, globalEnabled: newState }, hostname);
    } catch (_) {}
  }

  // Show a brief on-screen notification in the active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (enabled) => {
          const existing = document.getElementById('__darkwave_toast__');
          if (existing) existing.remove();
          const toast = document.createElement('div');
          toast.id = '__darkwave_toast__';
          toast.textContent = enabled ? '🌙 DarkWave ON' : '☀️ DarkWave OFF';
          Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', right: '24px',
            background: '#13131c', color: '#e8e8f0',
            fontFamily: 'system-ui, sans-serif', fontSize: '13px',
            fontWeight: '600', padding: '10px 18px',
            borderRadius: '999px', zIndex: '2147483647',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            opacity: '0', transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
          });
          document.body.appendChild(toast);
          requestAnimationFrame(() => { toast.style.opacity = '1'; });
          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
          }, 2000);
        },
        args: [newState],
      });
    } catch (_) {}
  }
});

async function applyToTab(tabId, enabled, settings, hostname) {
  // Determine if the user has explicitly overridden this site —
  // if so, skip auto-detection and force their choice.
  const siteOverride = hostname && settings.siteSettings?.[hostname];
  const isExplicit = !!(siteOverride?.overridden) || (settings.blacklist || []).includes(hostname);

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: applyDarkMode,
      args: [enabled, {
        brightness: settings.brightness,
        contrast: settings.contrast,
        imageProtection: settings.imageProtection,
        smoothTransition: settings.smoothTransition,
        skipDetection: isExplicit,
      }],
    });
  } catch (_) {}
}

// This runs inside the page context
function applyDarkMode(enabled, opts) {
  const STYLE_ID = '__darkwave_style__';
  let el = document.getElementById(STYLE_ID);

  if (!enabled) {
    if (el) el.remove();
    document.documentElement.removeAttribute('data-darkwave');
    return;
  }

  // Inline detection function (must be inside applyDarkMode since
  // chrome.scripting.executeScript only injects this single function)
  function isPageNativelyDark() {
    const html = document.documentElement;
    const body = document.body;
    // Meta color-scheme
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      const v = meta.content.toLowerCase();
      if (v === 'dark' || v.startsWith('dark')) return true;
    }
    // HTML / body attributes (YouTube [dark], GitHub data-color-mode, etc.)
    if (html.hasAttribute('dark')) return true;
    const attrs = [
      html.getAttribute('data-theme'), html.getAttribute('data-color-mode'),
      html.getAttribute('data-dark'), html.getAttribute('class'),
      body?.getAttribute('data-theme'), body?.getAttribute('data-color-mode'),
      body?.getAttribute('class'),
    ];
    const pat = /\b(dark|night|dim|black)\b/i;
    for (const a of attrs) { if (a && pat.test(a)) return true; }
    // CSS color-scheme on root
    try {
      const cs = window.getComputedStyle(html).colorScheme;
      if (cs && /dark/i.test(cs)) return true;
    } catch (_) {}
    // Background luminance
    const targets = [html, body];
    const fd = body?.querySelector(':scope > div');
    if (fd) targets.push(fd);
    for (const t of targets) {
      if (!t) continue;
      try {
        const bg = window.getComputedStyle(t).backgroundColor;
        const m = bg.match(/[\d.]+/g);
        if (!m || m.length < 3) continue;
        const [r, g, b] = m.map(Number);
        if (m[3] !== undefined && parseFloat(m[3]) < 0.1) continue;
        if (r === 0 && g === 0 && b === 0 && m[3] === undefined) continue;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum < 0.22) return true;
      } catch (_) {}
    }
    return false;
  }

  // ── Auto-detect natively dark pages ──────────────────────────────────
  // If the page is already dark, applying invert() will turn it light.
  // Skip unless the user explicitly overrode via site toggle or blacklist.
  if (!opts.skipDetection && !document.documentElement.hasAttribute('data-darkwave')) {
    if (isPageNativelyDark()) {
      try {
        const host = location.hostname;
        if (host && typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ [`nativeDark:${host}`]: true });
          // Auto-add to blacklist so it persists
          chrome.storage.local.get('blacklist', (res) => {
            const bl = res.blacklist || [];
            if (!bl.includes(host)) {
              bl.push(host);
              chrome.storage.local.set({ blacklist: bl });
            }
          });
        }
      } catch (_) {}
      return; // skip applying
    }
  }

  const brightness = opts.brightness / 100;
  const contrast = opts.contrast / 100;
  const transition = opts.smoothTransition ? 'filter 0.3s ease, background-color 0.3s ease' : 'none';

  const css = `
    html[data-darkwave] {
      filter: invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast}) !important;
      transition: ${transition} !important;
    }
    /* Re-invert real media so photos/videos look natural.
       canvas is intentionally excluded — it inherits the html-level inversion
       which is exactly what Google Sheets / Docs cells need to appear dark.
       Re-inverting canvas would double-invert the cells back to white. */
    html[data-darkwave] img,
    html[data-darkwave] video,
    html[data-darkwave] picture,
    html[data-darkwave] [style*="background-image"],
    html[data-darkwave] .docs-gm img,
    html[data-darkwave] .waffle-icon-img {
      filter: ${opts.imageProtection ? 'invert(1) hue-rotate(180deg)' : 'none'} !important;
    }
    html[data-darkwave] iframe {
      filter: invert(1) hue-rotate(180deg) brightness(${brightness}) contrast(${contrast}) !important;
    }
    html[data-darkwave] * {
      scrollbar-color: #555 #222 !important;
    }
  `;

  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = css;
  document.documentElement.setAttribute('data-darkwave', 'true');
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function resolveEnabled(settings, hostname) {
  if (settings.blacklist?.includes(hostname)) return false;
  const site = settings.siteSettings?.[hostname];
  if (site?.overridden) return site.enabled;
  return settings.globalEnabled;
}

// Schedule checker — runs every minute
setInterval(async () => {
  const settings = await chrome.storage.local.get(null);
  if (!settings.scheduleEnabled) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = settings.scheduleStart.split(':').map(Number);
  const [eh, em] = settings.scheduleEnd.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  let shouldBeOn;
  if (startMinutes > endMinutes) {
    // Overnight schedule (e.g. 20:00 → 07:00)
    shouldBeOn = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    shouldBeOn = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  if (shouldBeOn !== settings.globalEnabled) {
    await chrome.storage.local.set({ globalEnabled: shouldBeOn });
    updateBadge(shouldBeOn);
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      try {
        const hostname = getHostname(tab.url);
        const resolved = resolveEnabled({ ...settings, globalEnabled: shouldBeOn }, hostname);
        await applyToTab(tab.id, resolved, settings, hostname);
      } catch (_) {}
    }
  }
}, 60000);
