# Privacy Policy — DarkWave Smart Dark Mode

_Last updated: October 9, 2026_

## No Data Collection

DarkWave does not collect, store, transmit, or share any personal data.

## What the Extension Does

- Applies a CSS dark mode filter to websites you visit.
- Saves your preferences (brightness, contrast, blacklist, schedule) **locally on your device** using `chrome.storage.local`. This data never leaves your browser.
- Reads the URL of the current tab solely to apply or remove the dark mode filter. Tab URLs are never logged, stored remotely, or sent to any server.
- Shows site icons in its popup from your browser's own local favicon cache.

## External Requests

**None.** DarkWave makes no network requests of any kind. Opening the report form or the Buy Me a Coffee page (below) is a page you choose to open in a tab, not a request made by the extension.

As of version 1.1.0 this is unconditional. Earlier versions loaded web fonts from Google Fonts and site icons from Google's favicon service; the fonts are now bundled inside the extension, and site icons are read from the browser's own local favicon cache. Nothing about the pages you visit leaves your device.

## Reporting a Problem

From version 1.5.0, the DarkWave popup has a **Report a problem** link. It opens DarkWave's report form, a Google Form, in a new tab. In Chrome and other Chromium browsers, three answers are filled in for you: the DarkWave version, your browser and its version, and your DarkWave settings (on or off, brightness, contrast, which options are enabled, whether DarkWave is on for the current page, and how many sites you have skipped). **The address of the page you are on and the names of the sites you have skipped are never filled in**; add the page address yourself if you want to share it. In Firefox the form opens blank.

These details travel only in the form's link, which Google Forms receives when the page opens, and they reach the developer only if you submit the form. Everything you submit, including any screenshots or recordings you upload, is stored in the developer's Google account and used only to investigate and fix the problem you reported. The form is hosted by Google, so [Google's Privacy Policy](https://policies.google.com/privacy) also applies to it; uploading a file requires signing in to Google, which Google handles.

## Third Parties

DarkWave does not share any data with third parties. There are no analytics, tracking, or advertising SDKs included.

DarkWave links to two third-party pages, and opens them only when you click them: the report form above, and (from version 1.5.0) the developer's [Buy Me a Coffee](https://buymeacoffee.com/tjmanoj) page in the popup and the welcome guide. Nothing is added to the Buy Me a Coffee link, and DarkWave never loads Buy Me a Coffee's scripts; if you choose to support the developer there, Buy Me a Coffee's own privacy policy applies.

## Contact

Questions or problems: use the [DarkWave report form](https://docs.google.com/forms/d/e/1FAIpQLSeeYrpKZQFITYxjzs2mO27Lx_gwhUofB94OqE6hRu4WT2VTHw/viewform), or open an issue at [github.com/tjmanoj/darkwave](https://github.com/tjmanoj/darkwave/issues).
