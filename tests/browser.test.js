'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { grab } = require('./helpers');

// Functions under test reference bare `document`/`navigator` globals, so we
// inject fakes as factory parameters (Node 26 also ships a read-only
// builtin `navigator`, which cannot be stubbed via globals).
const UA = {
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  whatsapp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.0',
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0 Mobile/15E148 Safari/604.1',
  telegram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram/11.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
};
const fakeNav = (ua, standalone = false) => ({ userAgent: ua, standalone, platform: 'iPhone', maxTouchPoints: 3 });

function loadDetector(nav) {
  const factory = new Function(
    'document', 'navigator',
    grab('isIosDevice') + grab('isNonSafariIosBrowser') + ';return {isNonSafariIosBrowser};'
  );
  return factory({}, nav).isNonSafariIosBrowser();
}

test('wrong-browser detection across user agents', () => {
  assert.equal(loadDetector(fakeNav(UA.safari)), false);
  assert.equal(loadDetector(fakeNav(UA.whatsapp)), true);
  assert.equal(loadDetector(fakeNav(UA.crios)), true);
  assert.equal(loadDetector(fakeNav(UA.telegram)), true);
  assert.equal(loadDetector(fakeNav(UA.android)), false);
  assert.equal(loadDetector(fakeNav(UA.desktop)), false);
  assert.equal(loadDetector({ ...fakeNav(UA.safari), standalone: true }), false);
});

function loadBanner() {
  let banner = null;
  const el = () => ({
    style: {}, children: [],
    append(...c) { this.children.push(...c); },
    addEventListener() {}, setAttribute() {}, remove() {}, textContent: '',
  });
  const doc = {
    getElementById: () => null,
    createElement: () => el(),
    querySelector: (s) => (s === '.app-container' ? { prepend: (...c) => { banner = c[0]; } } : null),
    body: el(),
  };
  const factory = new Function(
    'document', 'navigator', 'copySyncCode',
    grab('isIosDevice') + grab('isNonSafariIosBrowser') + grab('showNoticeCard') +
    grab('maybeShowWrongBrowserBanner') + grab('maybeShowSafariBridgeNotice') +
    ';return {maybeShowWrongBrowserBanner, maybeShowSafariBridgeNotice};'
  );
  return {
    show: (fn, added, nav) => {
      banner = null;
      factory(doc, nav || fakeNav(UA.whatsapp), () => {})[fn](added);
      return banner;
    },
  };
}

test('wrong-browser banner appears only when data landed', () => {
  const { show } = loadBanner();
  const b = show('maybeShowWrongBrowserBanner', 3);
  assert.ok(b);
  assert.deepEqual(b.children[2].children.map((x) => x.textContent), ['📋 Copia codice', 'Chiudi']);
  assert.equal(show('maybeShowWrongBrowserBanner', 0), null);
  assert.equal(show('maybeShowWrongBrowserBanner', null), null);
});

test('safari bridge notice appears only in real ios safari with new data', () => {
  const { show } = loadBanner();
  const safari = fakeNav(UA.safari);
  const b = show('maybeShowSafariBridgeNotice', 2, safari);
  assert.ok(b);
  assert.match(b.children[0].textContent, /Safari/);
  assert.equal(show('maybeShowSafariBridgeNotice', 0, safari), null);
  // not in wrong browsers (that path has its own banner) nor PWA nor desktop
  assert.equal(show('maybeShowSafariBridgeNotice', 2), null);
  assert.equal(show('maybeShowSafariBridgeNotice', 2, { ...safari, standalone: true }), null);
  assert.equal(show('maybeShowSafariBridgeNotice', 2, fakeNav(UA.desktop)), null);
});
