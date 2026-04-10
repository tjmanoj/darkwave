// DarkWave — Popup Script

const $ = id => document.getElementById(id);

const DEFAULTS = {
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

let settings = { ...DEFAULTS };
let currentHostname = '';

// ── Bootstrap ────────────────────────────────────────────────────────────────

(async function init() {
  // Read settings directly from storage — avoids the MV3 async sendResponse bug
  // where an async onMessage listener returns a Promise instead of `true`,
  // causing Chrome to close the channel before sendResponse fires.
  const stored = await chrome.storage.local.get(null);
  settings = { ...DEFAULTS, ...stored };
  settings.siteSettings = settings.siteSettings || {};
  settings.blacklist = settings.blacklist || [];

  // Get active tab directly — no messaging needed
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    currentHostname = tab?.url ? new URL(tab.url).hostname : '';
  } catch (_) {
    currentHostname = '';
  }

  renderAll();
  bindEvents();

  // Stay in sync if keyboard shortcut or schedule changes state while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let needsRender = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key) || key === 'siteSettings') {
        settings[key] = newValue;
        if (key === 'blacklist') settings.blacklist = newValue || [];
        needsRender = true;
      }
    }
    if (needsRender) renderAll();
  });
})();

// ── Render ───────────────────────────────────────────────────────────────────

function renderAll() {
  renderGlobalToggle();
  renderSiteSection(); // async, non-blocking
  renderBlacklist();
  renderSliders();
  renderOptions();
  renderSchedule();
  renderPresets();
}

function renderGlobalToggle() {
  $('globalToggle').checked = settings.globalEnabled;
  $('globalStatus').textContent = settings.globalEnabled
    ? 'Enabled everywhere'
    : 'Disabled — all sites are light';
  document.body.classList.toggle('darkwave-off', !settings.globalEnabled);
}

async function renderSiteSection() {
  if (!currentHostname) {
    $('siteCard').style.display = 'none';
    return;
  }

  $('siteCard').style.display = '';
  $('siteHostname').textContent = currentHostname;
  $('siteName').textContent = formatSiteName(currentHostname);

  // Try to load favicon
  const faviconImg = document.createElement('img');
  faviconImg.src = `https://www.google.com/s2/favicons?sz=32&domain=${currentHostname}`;
  faviconImg.onload = () => {
    $('siteFavicon').innerHTML = '';
    $('siteFavicon').appendChild(faviconImg);
  };

  const siteOverride = settings.siteSettings[currentHostname];
  const isOverridden = siteOverride?.overridden;
  const siteEnabled = isOverridden ? siteOverride.enabled : settings.globalEnabled;

  $('siteToggle').checked = siteEnabled;

  // Show native dark page badge (Bug 4)
  const nativeResult = await chrome.storage.local.get(`nativeDark:${currentHostname}`);
  const isNativeDark = nativeResult[`nativeDark:${currentHostname}`] === true;
  $('nativeDarkBadge').style.display = (isNativeDark && !isOverridden) ? '' : 'none';

  if (isOverridden) {
    $('siteNote').textContent = siteEnabled
      ? `✦ Custom: Dark mode forced ON for this site`
      : `✦ Custom: Dark mode forced OFF for this site`;
    $('siteNote').classList.add('overridden');
  } else if (isNativeDark) {
    $('siteNote').textContent = 'Native dark mode detected — auto-skipped';
    $('siteNote').classList.remove('overridden');
  } else {
    $('siteNote').textContent = 'Following global setting — click to override';
    $('siteNote').classList.remove('overridden');
  }
}

function renderBlacklist() {
  const bl = settings.blacklist || [];
  const blacklistSection = $('blacklistSection');
  const blList = $('blList');
  const blEmpty = $('blEmpty');
  const blCount = $('blCount');

  // Update count badge
  blCount.textContent = bl.length;

  // Update blacklist button for current site
  if (currentHostname) {
    const isBlacklisted = bl.includes(currentHostname);
    const btn = $('blacklistBtn');
    const label = $('blacklistBtnLabel');
    if (isBlacklisted) {
      btn.classList.add('active');
      label.textContent = 'Remove from blacklist';
    } else {
      btn.classList.remove('active');
      label.textContent = 'Blacklist this site';
    }
  }

  // Render the list
  blEmpty.style.display = bl.length === 0 ? '' : 'none';
  blList.innerHTML = '';

  for (const host of bl) {
    const li = document.createElement('li');
    li.className = 'bl-item';

    // Favicon
    const img = document.createElement('img');
    img.className = 'bl-item-favicon';
    img.src = `https://www.google.com/s2/favicons?sz=16&domain=${host}`;
    img.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'bl-item-favicon-placeholder';
      placeholder.innerHTML = `<svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>`;
      img.replaceWith(placeholder);
    };

    // Hostname label
    const span = document.createElement('span');
    span.className = 'bl-item-host';
    span.textContent = host;

    // Remove button
    const rmBtn = document.createElement('button');
    rmBtn.className = 'bl-remove-btn';
    rmBtn.title = `Remove ${host} from blacklist`;
    rmBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;
    rmBtn.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'REMOVE_BLACKLIST_ENTRY', payload: { hostname: host } });
      settings.blacklist = settings.blacklist.filter(h => h !== host);
      renderBlacklist();
      renderSiteSection();
      toast(`✅ Removed ${host} from blacklist`);
    });

    li.appendChild(img);
    li.appendChild(span);
    li.appendChild(rmBtn);
    blList.appendChild(li);
  }
}

function renderSliders() {
  $('brightnessSlider').value = settings.brightness;
  $('brightnessVal').textContent = settings.brightness + '%';
  $('contrastSlider').value = settings.contrast;
  $('contrastVal').textContent = settings.contrast + '%';
}

function renderOptions() {
  $('imageProtection').checked = settings.imageProtection;
  $('smoothTransition').checked = settings.smoothTransition;
  $('scheduleEnabled').checked = settings.scheduleEnabled;
}

function renderSchedule() {
  $('scheduleStart').value = settings.scheduleStart || '20:00';
  $('scheduleEnd').value = settings.scheduleEnd || '07:00';
  $('scheduleRow').classList.toggle('visible', settings.scheduleEnabled);
}

function renderPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const b = parseInt(btn.dataset.brightness);
    const c = parseInt(btn.dataset.contrast);
    btn.classList.toggle('active', b === settings.brightness && c === settings.contrast);
  });
}

// ── Events ───────────────────────────────────────────────────────────────────

function bindEvents() {
  // Global toggle
  $('globalToggle').addEventListener('change', async (e) => {
    settings.globalEnabled = e.target.checked;
    renderGlobalToggle();
    renderSiteSection();
    await save();
    toast(settings.globalEnabled ? '🌙 Dark mode on' : '☀️ Dark mode off');
  });

  // Blacklist current site button
  $('blacklistBtn').addEventListener('click', async () => {
    if (!currentHostname) return;
    const res = await chrome.runtime.sendMessage({
      type: 'TOGGLE_BLACKLIST',
      payload: { hostname: currentHostname },
    });
    settings.blacklist = res.blacklist || [];
    renderBlacklist();
    renderSiteSection();
    toast(res.nowBlacklisted
      ? `🚫 Blacklisted: ${currentHostname}`
      : `✅ Removed from blacklist: ${currentHostname}`);
  });

  // Site toggle
  $('siteToggle').addEventListener('change', async (e) => {
    const checked = e.target.checked;
    const current = settings.siteSettings[currentHostname];

    // If the desired state matches global, remove override
    if (checked === settings.globalEnabled) {
      delete settings.siteSettings[currentHostname];
    } else {
      settings.siteSettings[currentHostname] = { overridden: true, enabled: checked };
    }

    await save();
    renderSiteSection();
    toast(checked ? `🌙 Dark on for ${currentHostname}` : `☀️ Light on for ${currentHostname}`);
  });

  // Brightness
  $('brightnessSlider').addEventListener('input', debounce(async (e) => {
    settings.brightness = parseInt(e.target.value);
    $('brightnessVal').textContent = settings.brightness + '%';
    renderPresets();
    await save();
  }, 80));

  // Contrast
  $('contrastSlider').addEventListener('input', debounce(async (e) => {
    settings.contrast = parseInt(e.target.value);
    $('contrastVal').textContent = settings.contrast + '%';
    renderPresets();
    await save();
  }, 80));

  // Image protection
  $('imageProtection').addEventListener('change', async (e) => {
    settings.imageProtection = e.target.checked;
    await save();
    toast(e.target.checked ? 'Images protected' : 'Image protection off');
  });

  // Smooth transitions
  $('smoothTransition').addEventListener('change', async (e) => {
    settings.smoothTransition = e.target.checked;
    await save();
  });

  // Schedule toggle
  $('scheduleEnabled').addEventListener('change', async (e) => {
    settings.scheduleEnabled = e.target.checked;
    renderSchedule();
    await save();
    toast(e.target.checked ? '⏰ Schedule enabled' : 'Schedule disabled');
  });

  // Schedule times
  $('scheduleStart').addEventListener('change', async (e) => {
    settings.scheduleStart = e.target.value;
    await save();
  });

  $('scheduleEnd').addEventListener('change', async (e) => {
    settings.scheduleEnd = e.target.value;
    await save();
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      settings.brightness = parseInt(btn.dataset.brightness);
      settings.contrast = parseInt(btn.dataset.contrast);
      renderSliders();
      renderPresets();
      await save();
      toast(`${btn.querySelector('span:last-child').textContent} preset applied`);
    });
  });

  // Reset
  $('resetBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    settings = { ...DEFAULTS, siteSettings: {}, blacklist: [] };
    renderAll();
    await save();
    toast('↺ Settings reset to defaults');
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function save() {
  await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: settings });
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function formatSiteName(hostname) {
  if (!hostname) return 'Unknown';
  const known = {
    'docs.google.com': 'Google Docs',
    'sheets.google.com': 'Google Sheets',
    'drive.google.com': 'Google Drive',
    'mail.google.com': 'Gmail',
    'github.com': 'GitHub',
    'notion.so': 'Notion',
    'twitter.com': 'Twitter / X',
    'x.com': 'X (Twitter)',
    'reddit.com': 'Reddit',
    'youtube.com': 'YouTube',
    'www.youtube.com': 'YouTube',
    'netflix.com': 'Netflix',
    'www.netflix.com': 'Netflix',
    'stackoverflow.com': 'Stack Overflow',
    'figma.com': 'Figma',
    'www.figma.com': 'Figma',
    'linear.app': 'Linear',
    'jira.atlassian.com': 'Jira',
    'confluence.atlassian.com': 'Confluence',
  };
  if (known[hostname]) return known[hostname];

  // Capitalize first part of domain
  const parts = hostname.replace(/^www\./, '').split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
