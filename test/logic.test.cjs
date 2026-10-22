// Unit tests for pure app logic. Run: npm test (in mobile/)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

// Compile a dependency-free TS module to CommonJS and load it.
function loadTs(rel) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fk-')), path.basename(rel).replace(/\.ts$/, '.js'));
  fs.writeFileSync(file, out.outputText);
  return require(file);
}

const c = loadTs('src/customer.ts');
const f = loadTs('src/format.ts');
const m = loadTs('src/money.ts');
const sess = loadTs('src/session.ts');
const nav = loadTs('src/notify.ts');
const upd = loadTs('src/update.ts');

const KISHAN = { id: 'r1', name: 'Kishan Desai', phone: '9800000001' };
const KIRAN = { id: 'r2', name: 'Kiran Joshi', phone: '9800000002' };

describe('customer matching (sell form)', () => {
  it('normalizes pasted mobile numbers', () => {
    assert.equal(c.normalizeMobile('+91 98000 00001'), '9800000001');
    assert.equal(c.normalizeMobile('919800000001'), '9800000001');
    assert.equal(c.normalizeMobile('98000-00001'), '9800000001');
    assert.equal(c.normalizeMobile('98000000019999'), '9800000001');
    assert.equal(c.normalizeMobile('91'), '91');
  });

  it('only searches the phone after 3 digits and the name after 2 chars', () => {
    assert.equal(c.searchTerm('phone', '98'), null);
    assert.equal(c.searchTerm('phone', '980'), '980');
    assert.equal(c.searchTerm('name', 'K'), null);
    assert.equal(c.searchTerm('name', ' Ki '), 'Ki');
  });

  it('finds an exact match only for a full 10 digit number', () => {
    assert.equal(c.exactPhoneMatch([KISHAN, KIRAN], '980000000'), null);
    assert.deepEqual(c.exactPhoneMatch([KISHAN, KIRAN], '9800000002'), KIRAN);
    assert.equal(c.exactPhoneMatch([KISHAN], '9800000009'), null);
  });

  it('picking a registration fills name + phone and links it', () => {
    assert.deepEqual(c.applyRegistration(KIRAN), { phone: KIRAN.phone, name: KIRAN.name, regId: 'r2' });
  });

  it('editing the number unlinks the registration but keeps the typed name', () => {
    const linked = c.applyRegistration(KISHAN);
    const next = c.onPhoneChange(linked, '980000000');
    assert.equal(next.regId, null);
    assert.equal(next.name, KISHAN.name);
    assert.equal(next.phone, '980000000');
  });

  it('re-entering the same number keeps the link', () => {
    const linked = c.applyRegistration(KISHAN);
    assert.equal(c.onPhoneChange(linked, '+91 9800000001').regId, 'r1');
  });

  it('typing without a link just updates the number', () => {
    assert.deepEqual(c.onPhoneChange({ phone: '', name: 'A', regId: null }, '98'), { phone: '98', name: 'A', regId: null });
  });
});

describe('formatting', () => {
  it('uses Indian digit grouping', () => {
    assert.equal(f.num(0), '0');
    assert.equal(f.num(999), '999');
    assert.equal(f.num(1000), '1,000');
    assert.equal(f.num(123456), '1,23,456');
    assert.equal(f.num(12345678), '1,23,45,678');
    assert.equal(f.num(-1500), '-1,500');
    assert.equal(f.num(null), '0');
    assert.equal(f.money(1500), '₹1,500');
  });

  it('formats dates', () => {
    assert.equal(f.dateLabel('2026-10-25'), '25 Oct 2026');
    assert.equal(f.dateLabel(null), '-');
    assert.equal(f.shortDay('2026-10-05'), '5/10');
  });

  it('keeps digits only', () => {
    assert.equal(f.digitsOnly('1a2.3-4 5'), '12345');
  });

  it('labels roles', () => {
    assert.equal(f.roleLabel('super_admin'), 'Super Admin');
    assert.equal(f.roleLabel('team_lead'), 'Team Lead');
  });

  it('timeAgo buckets', () => {
    const now = Date.now();
    assert.equal(f.timeAgo(new Date(now - 10 * 1000).toISOString()), 'just now');
    assert.equal(f.timeAgo(new Date(now - 5 * 60 * 1000).toISOString()), '5m ago');
    assert.equal(f.timeAgo(new Date(now - 3 * 3600 * 1000).toISOString()), '3h ago');
    assert.equal(f.timeAgo(new Date(now - 2 * 86400 * 1000).toISOString()), '2d ago');
  });
});

describe('money', () => {
  it('validates send amounts against the available balance', () => {
    assert.equal(m.validAmount('1000', 17000), null);
    assert.equal(m.validAmount('250.50', 300), null);
    assert.equal(m.validAmount('17000', 17000), null);
    assert.match(m.validAmount('17000.01', 17000), /more than/);
    assert.match(m.validAmount('0', 100), /greater than 0/);
    assert.match(m.validAmount('1.234', 100), /valid amount/);
    assert.match(m.validAmount('', 100), /valid amount/);
    assert.match(m.validAmount('-5', 100), /valid amount/);
  });

  it('formats rupees with paise only when present', () => {
    assert.equal(f.rupees(17000), '₹17,000');
    assert.equal(f.rupees(1250.5), '₹1,250.50');
    assert.equal(f.rupees(0.05), '₹0.05');
    assert.equal(f.rupees(-1000), '-₹1,000');
    assert.equal(f.rupees(null), '₹0');
  });

  it('cleans amount input to digits and 2 decimals', () => {
    assert.equal(f.amountInput('1,700'), '1700');
    assert.equal(f.amountInput('12.345'), '12.34');
    assert.equal(f.amountInput('1.2.3'), '1.23');
    assert.equal(f.amountInput('₹ 500'), '500');
  });
});

describe('session tokens', () => {
  const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`;

  it('reads the expiry from a JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(sess.jwtExpiry(jwt({ sub: 'u-1', exp, name: 'Ravi Pāṭel ' + 'x'.repeat(200) })), exp * 1000);
    assert.equal(sess.jwtExpiry('not.a.jwt'), null);
    assert.equal(sess.jwtExpiry(''), null);
    assert.equal(sess.jwtExpiry(null), null);
    assert.equal(sess.jwtExpiry(jwt({ sub: 'x' })), null);
  });

  it('refreshes only when close to expiry', () => {
    const now = Date.now();
    const soon = jwt({ exp: Math.floor((now + 5 * 60 * 1000) / 1000) });
    const later = jwt({ exp: Math.floor((now + 6 * 3600 * 1000) / 1000) });
    const past = jwt({ exp: Math.floor((now - 1000) / 1000) });
    assert.equal(sess.needsRefresh(soon, now), true);
    assert.equal(sess.needsRefresh(past, now), true);
    assert.equal(sess.needsRefresh(later, now), false);
    assert.equal(sess.needsRefresh('garbage', now), false);
  });

  it('only a disabled account ends the session directly; other 401s try a refresh', () => {
    assert.equal(sess.on401('ACCOUNT_DISABLED'), 'end');
    assert.equal(sess.on401('TOKEN_EXPIRED'), 'refresh');
    assert.equal(sess.on401('TOKEN_INVALID'), 'refresh');
    assert.equal(sess.on401(undefined), 'refresh');
  });
});

describe('notification taps', () => {
  it('money notifications open the wallet for everyone', () => {
    for (const t of ['money_request', 'money_accepted', 'money_rejected']) {
      assert.equal(nav.notificationRoute(t, true), '/wallet');
      assert.equal(nav.notificationRoute(t, false), '/wallet');
    }
  });
  it('kit requests open admin requests; members go to their own screens', () => {
    assert.equal(nav.notificationRoute('kit_request', true), '/admin/requests');
    assert.equal(nav.notificationRoute('kit_return', true), '/admin/requests');
    assert.equal(nav.notificationRoute('kit_received', false), '/user/activity');
    assert.equal(nav.notificationRoute('request_rejected', false), '/user/request');
    assert.equal(nav.notificationRoute('admin_granted', false), null);
  });
  it('sale edited / deleted open the history', () => {
    assert.equal(nav.notificationRoute('sale_edited', false), '/user/activity');
    assert.equal(nav.notificationRoute('sale_deleted', true), '/admin/activity');
  });
  it('kit transfer requests open the screen where they can be answered', () => {
    assert.equal(nav.notificationRoute('kit_transfer_request', false), '/user');
    assert.equal(nav.notificationRoute('kit_transfer_request', true), '/admin');
    assert.equal(nav.notificationRoute('kit_transfer_accepted', false), '/user/activity');
    assert.equal(nav.notificationRoute('kit_transfer_rejected', true), '/admin/transfer');
    assert.equal(nav.notificationRoute('kit_transfer_cancelled', false), '/user/transfer');
  });
});

describe('app update & maintenance (Firestore)', () => {
  const doc = { fields: {
    androidVersion: { stringValue: '1.0.2' }, androidBuildNumber: { integerValue: '3' },
    androidDownloadUrl: { stringValue: 'https://x/app.apk' }, iosBuildNumber: { integerValue: '0' },
    forceUpdate: { booleanValue: false }, UpdateLog: { stringValue: 'Fixes' },
    is_maintenance: { booleanValue: false }, maintenance_message: { stringValue: '' },
  } };

  it('parses Firestore REST typed values', () => {
    const v = upd.parseFirestoreDoc(doc);
    assert.equal(v.androidBuildNumber, 3);
    assert.equal(v.androidVersion, '1.0.2');
    assert.equal(v.forceUpdate, false);
    assert.deepEqual(upd.parseFirestoreDoc(null), {});
  });

  it('decides none / optional / force from the build number', () => {
    const v = upd.parseFirestoreDoc(doc);
    assert.equal(upd.decideUpdate(v, 'android', 3), 'none');
    assert.equal(upd.decideUpdate(v, 'android', 2), 'optional');
    assert.equal(upd.decideUpdate({ ...v, forceUpdate: true }, 'android', 2), 'force');
    assert.equal(upd.decideUpdate({ ...v, androidDownloadUrl: '' }, 'android', 1), 'none');
    assert.equal(upd.decideUpdate(v, 'android', 0), 'none'); // unknown own build (Expo Go)
    assert.equal(upd.decideUpdate(v, 'ios', 1), 'none'); // iOS build 0 = not published
  });

  it('compares dotted versions numerically', () => {
    assert.equal(upd.compareVersions('1.0', '1.0.0'), 0);
    assert.ok(upd.compareVersions('1.0.1', '1.0') > 0);
    assert.ok(upd.compareVersions('1.10', '1.9') > 0);
    assert.ok(upd.compareVersions('1.0', '1.1') < 0);
  });

  it('iOS: version decides first, then build number within the same version', () => {
    const links = { ios: 'https://testflight.apple.com/join/x' };
    const ios = (iosVersion, iosBuildNumber) => ({ iosVersion, iosBuildNumber });
    assert.equal(upd.decideUpdate(ios('1.0', 30), 'ios', 29, links, '1.0'), 'optional'); // build bump
    assert.equal(upd.decideUpdate(ios('1.0', 29), 'ios', 29, links, '1.0'), 'none');
    assert.equal(upd.decideUpdate(ios('1.0.0', 30), 'ios', 29, links, '1.0'), 'optional'); // 1.0 == 1.0.0
    assert.equal(upd.decideUpdate(ios('1.1', 1), 'ios', 29, links, '1.0'), 'optional'); // new version restarts builds
    assert.equal(upd.decideUpdate(ios('1.0', 30), 'ios', 2, links, '1.1'), 'none'); // installed is newer
    assert.equal(upd.decideUpdate(ios('', 30), 'ios', 29, links, '1.0'), 'optional'); // no version: build only
    assert.equal(upd.decideUpdate(ios('2.0', 0), 'ios', 29, links, '1.0'), 'none'); // build 0 = not published
  });

  it('sends iOS to TestFlight and Android to the admin link or the default folder', () => {
    const links = { ios: 'https://testflight.apple.com/join/x', android: 'https://drive.google.com/x' };
    const v = upd.parseFirestoreDoc(doc);
    assert.equal(upd.updateUrl(v, 'android', links), 'https://x/app.apk');
    assert.equal(upd.updateUrl({ ...v, androidDownloadUrl: ' ' }, 'android', links), links.android);
    assert.equal(upd.updateUrl(v, 'ios', links), links.ios);
    assert.equal(upd.updateUrl(v, 'ios', {}), null);
    // A default link is enough to offer the update.
    assert.equal(upd.decideUpdate({ ...v, androidDownloadUrl: '' }, 'android', 1, links), 'optional');
    assert.equal(upd.decideUpdate({ ...v, iosBuildNumber: 2 }, 'ios', 1, links), 'optional');
    assert.equal(upd.decideUpdate({ ...v, iosBuildNumber: 2 }, 'ios', 1), 'none');
  });

  it('maintenance blocks members but not admins', () => {
    const on = { is_maintenance: true };
    assert.equal(upd.inMaintenance(on, false), true);
    assert.equal(upd.inMaintenance(on, true), false);
    assert.equal(upd.inMaintenance({ is_maintenance: false }, false), false);
  });
});

describe('kits with users: zone > sabha > team grouping', () => {
  const { groupTeams } = loadTs('src/teamGroups.ts');
  const t = (key, zone, sabha, holding, sold) => ({ key, name: key, zone, sabha, holding, sold });
  const rows = [
    t('a', 'Bopal', 'Sanand', 5, 0),
    t('b', 'Naroda', 'Nilkanth', 100, 4),
    t('c', 'Bopal', 'Bopal', 30, 2),
    t('d', 'Bopal', 'Bopal', 40, 0),
    t('e', null, 'No sabha', 999, 0),
    t('f', 'Naroda', 'Nilkanth', 1, 9),
  ];
  const g = groupTeams(rows);

  it('nests zones, sabhas and teams with totals', () => {
    assert.deepEqual(g.map((z) => [z.zone, z.holding, z.sold]), [['Naroda', 101, 13], ['Bopal', 75, 2], ['No zone', 999, 0]]);
    const bopal = g.find((z) => z.zone === 'Bopal');
    assert.deepEqual(bopal.sabhas.map((s) => [s.sabha, s.holding]), [['Bopal', 70], ['Sanand', 5]]);
    assert.deepEqual(bopal.sabhas[0].teams.map((x) => x.key), ['d', 'c'], 'most kits first');
  });

  it('keeps users without a zone last even with the most kits', () => {
    assert.equal(g[g.length - 1].zone, 'No zone');
  });

  it('empty input gives no groups', () => {
    assert.deepEqual(groupTeams([]), []);
  });

  it('the Sabha Admin row comes first in its sabha, even with fewer kits', () => {
    const rows2 = [t('team1', 'Z', 'S', 90, 0), { ...t('sa', 'Z', 'S', 5, 0), kind: 'admin', adminRole: 'Sabha Admin' }, t('team2', 'Z', 'S', 40, 0)];
    assert.deepEqual(groupTeams(rows2)[0].sabhas[0].teams.map((x) => x.key), ['sa', 'team1', 'team2']);
  });
});

describe('kits with users: active filter keeps the Sabha Admin', () => {
  const { activeRows } = loadTs('src/teamGroups.ts');
  const r = (key, sabha, holding, sold, kind) => ({ key, name: key, zone: 'Z', sabha, holding, sold, kind, adminRole: kind === 'admin' ? 'Sabha Admin' : null });
  const rows = [
    r('sa1', 'S1', 0, 0, 'admin'), r('team1', 'S1', 10, 0, 'team'), r('team2', 'S1', 0, 0, 'team'),
    r('sa2', 'S2', 0, 0, 'admin'), r('team3', 'S2', 0, 0, 'team'),
    r('sa3', 'S3', 5, 0, 'admin'),
  ];
  it('shows the 0-kit Sabha Admin of a shown sabha, hides empty teams and empty sabhas', () => {
    assert.deepEqual(activeRows(rows).map((x) => x.key), ['sa1', 'team1', 'sa3']);
  });
});

describe('kits with users: zone admins in the header, hidden rows', () => {
  const { groupTeams } = loadTs('src/teamGroups.ts');
  const r = (key, sabha, holding, kind, adminRole, person) => ({ key, name: person ? `${person} (${adminRole})` : key, zone: 'Z', sabha, holding, sold: 0, kind, adminRole, person });
  const rows = [
    r('t1', 'S1', 10, 'team'),
    r('sa', 'S1', 0, 'admin', 'Sabha Admin', 'Srinath'),
    r('za', 'S1', 60, 'admin', 'Zone Admin', 'Nimit'),
    r('pa', 'S2', 0, 'admin', 'Pradesh Admin', 'Swamiji'),
    r('none', 'S3', 5, 'none'),
  ];
  const [z] = groupTeams(rows);

  it('puts the Zone Admin on the zone, not in a sabha', () => {
    assert.deepEqual(z.zoneAdmins, [{ name: 'Nimit', holding: 60, sold: 0 }]);
    assert.deepEqual(z.sabhas.map((s) => [s.sabha, s.teams.map((t) => t.key)]), [['S1', ['sa', 't1']]]);
  });

  it('hides Pradesh Admin and Without team rows but zone totals still count them', () => {
    assert.ok(!z.sabhas.some((s) => s.teams.some((t) => t.key === 'pa' || t.key === 'none')));
    assert.equal(z.holding, 75);
    assert.equal(z.sabhas[0].holding, 10, 'sabha total = listed rows');
  });
});

describe('dashboard central stock tile', () => {
  const { centralStockTile } = loadTs('src/centralStock.ts');
  it('subtracts kits on hold for pending transfers', () => {
    assert.deepEqual(centralStockTile({ centralStock: 634, onHold: 50, onHoldCount: 2, requested: 0, requestCount: 0 }), { minus: 50, left: 584, sub: '584 left after 2 transfers' });
  });
  it('adds pending requests to the minus', () => {
    const r = centralStockTile({ centralStock: 634, onHold: 50, onHoldCount: 2, requested: 100, requestCount: 1 });
    assert.deepEqual([r.minus, r.left, r.sub], [150, 484, '484 left after 2 transfers & 1 request']);
  });
  it('nothing pending', () => {
    assert.deepEqual(centralStockTile({ centralStock: 10, onHold: 0, onHoldCount: 0, requested: 0, requestCount: 0 }), { minus: 0, left: 10, sub: 'Nothing pending' });
  });
});
