// Only loaded into Playwright's isolated temporary profile, never the user's browser.
globalThis.chrome.runtime.onInstalled.addListener(() => {});
