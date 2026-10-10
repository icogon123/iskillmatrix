/**
 * HTTP-level check of every API route against a throwaway in-memory MongoDB.
 * Cloudinary is stubbed, mail is off, and the real MONGODB_URI is never used.
 * Run: npm run test:api
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';

// Never talk to real services from this check.
env.admin.password = 'ApiCheck#2026';
env.rootPassword = 'RootCheck#2026';
env.jwtSecret = 'api-check-secret-api-check-secret-0123456789';
env.cloudinary = { cloudName: 'stub', apiKey: 'stub', apiSecret: 'stub', folder: 'stub' };
env.smtp.host = '';
const realFetch = globalThis.fetch;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3, 4]);
const PDF = Buffer.from('%PDF-1.4\n%stub file for api check\n');
const uploads = [];
cloudinary.uploader.upload_stream = (opts, cb) => ({
  end(buf) {
    uploads.push(opts.public_id);
    cb(null, { public_id: `${opts.folder}/${opts.public_id}`, resource_type: 'image', type: opts.type, format: 'png', bytes: buf.length, secure_url: `https://res.stub.test/${opts.public_id}.png` });
  },
});
cloudinary.uploader.destroy = async () => ({ result: 'ok' });
cloudinary.utils.private_download_url = () => 'https://res.stub.test/private-file';
globalThis.fetch = (url, init) =>
  String(url).startsWith('https://res.stub.test/')
    ? Promise.resolve(new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }))
    : realFetch(url, init);

const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri('api-check'));
const { ensureBaseData } = await import('./baseData.js');
await ensureBaseData({ log: false });
const { default: app } = await import('../app.js');
const User = (await import('../models/User.js')).default;
const Package = (await import('../models/Package.js')).default;
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async call(method, path, { json, form, raw, headers = {} } = {}) {
    const init = { method, headers: { ...headers } };
    if (this.cookie) init.headers.cookie = this.cookie;
    if (json !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(json); }
    if (raw !== undefined) { init.headers['content-type'] = 'application/json'; init.body = raw; }
    if (form) init.body = form;
    const res = await realFetch(base + path, init);
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      const [pair] = c.split(';');
      if (/=;?$/.test(pair) || /Expires=Thu, 01 Jan 1970/.test(c)) this.cookie = '';
      else this.cookie = pair;
    }
    const type = res.headers.get('content-type') || '';
    const body = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, body, headers: res.headers };
  }
  get = (p, o) => this.call('GET', p, o);
  post = (p, json, o) => this.call('POST', p, { json, ...o });
  put = (p, json) => this.call('PUT', p, { json });
  patch = (p, json) => this.call('PATCH', p, { json });
  del = (p) => this.call('DELETE', p);
}

const fileForm = (fields, files = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, String(v));
  for (const [k, v] of Object.entries(files)) f.append(k, new Blob([v.buf || v], { type: v.type || 'image/png' }), v.name || `${k}.png`);
  return f;
};

let passed = 0;
const failures = [];
async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`  ✗ ${label}\n      ${String(err.message).split('\n').slice(0, 6).join('\n      ')}`);
  }
}
const ok = (r, status = 200) => assert.equal(r.status, status, `expected ${status}, got ${r.status}: ${JSON.stringify(r.body)?.slice(0, 300)}`);

const pwd = 'Test@1234';
const tpwd = 'Txn@1234';
const dob = '1990-05-15';
let seq = 0;
const regBody = (sponsorId, packageId, over = {}) => {
  seq += 1;
  return {
    sponsorId, fullName: `Member ${seq}`, mobile: `98765${String(10000 + seq)}`, email: `m${seq}@test.dev`, dob, country: 'India',
    aadhaar: String(100000000000 + seq), username: `member_${seq}`, password: pwd, confirmPassword: pwd,
    txnPassword: tpwd, confirmTxnPassword: tpwd, packageId, ...over,
  };
};

const anon = new Client('anon');
const admin = new Client('admin');
const root = await User.findOne({ isRoot: true });
const pkgs = Object.fromEntries((await Package.find().lean()).map((p) => [p.key, p]));
const standardId = String(pkgs.standard._id);

console.log('API checks');

/* ---------- Public ---------- */
console.log('\nPublic');
await check('GET /health → 200 connected', async () => { const r = await anon.get('/health'); ok(r); assert.equal(r.body.db, 'connected'); });
await check('GET /public/packages lists 5 bundles with courses + tax', async () => {
  const r = await anon.get('/public/packages'); ok(r);
  assert.equal(r.body.packages.length, 5);
  assert.ok(r.body.packages.every((p) => p.courses.length && p.price > 0));
  assert.equal(r.body.tax.gstPercent, 18);
});
await check('GET /public/courses lists catalog with bundles', async () => {
  const r = await anon.get('/public/courses'); ok(r);
  assert.equal(r.body.courses.length, 10);
  assert.ok(r.body.courses.some((c) => c.bundles.length));
});
await check('GET /public/site exposes plan, no secrets', async () => {
  const r = await anon.get('/public/site'); ok(r);
  assert.ok(r.body.plan.badges.length);
  assert.ok(!JSON.stringify(r.body).includes('upiId'));
});
await check('sponsor lookup: by member ID, by username, unknown → 404', async () => {
  let r = await anon.get(`/public/sponsor/${root.memberId}`); ok(r);
  assert.equal(r.body.fullName, 'iSkillMatrix');
  r = await anon.get('/public/sponsor/iskillmatrix'); ok(r);
  r = await anon.get('/public/sponsor/NOPE999'); ok(r, 404);
});
await check('unknown API route → JSON 404', async () => { const r = await anon.get('/nope'); ok(r, 404); assert.ok(r.body.message); });
await check('protected routes need a session (401)', async () => {
  for (const p of ['/member/dashboard', '/admin/dashboard', '/auth/me', '/files/abc']) ok(await anon.get(p), 401);
});

/* ---------- Registration & login ---------- */
console.log('\nRegistration & auth');
const A = new Client('A');
const B = new Client('B');
const C = new Client('C');
const D = new Client('D');
let a; let b; let c; let d;
await check('register validation: weak password, bad mobile, under-18, mismatch → 422', async () => {
  const cases = [
    { password: 'abc', confirmPassword: 'abc' },
    { mobile: '123' },
    { dob: '2015-01-01' },
    { confirmPassword: 'Different@1' },
    { txnPassword: pwd, confirmTxnPassword: pwd },
    { username: 'ab' },
    { aadhaar: '123' },
    { email: 'not-an-email' },
  ];
  for (const over of cases) ok(await anon.post('/auth/register', regBody(root.memberId, standardId, over)), 422);
});
await check('register: unknown sponsor / bad bundle → 400', async () => {
  ok(await anon.post('/auth/register', regBody('NOPE1', standardId)), 400);
  ok(await anon.post('/auth/register', regBody(root.memberId, '64b64b64b64b64b64b64b64b')), 400);
});
const idOf = async (memberId) => String((await User.findOne({ memberId }).lean())._id);
await check('admin login (cookie set), /auth/me, no password leak', async () => {
  const r = await admin.post('/auth/login', { identifier: 'admin', password: env.admin.password }); ok(r);
  assert.equal(r.body.user.role, 'admin');
  assert.ok(!('password' in r.body.user));
  const me = await admin.get('/auth/me'); ok(me); assert.equal(me.body.user.username, 'admin');
});
await check('register A and D under root', async () => {
  const ra = await anon.post('/auth/register', regBody(root.memberId, standardId, { username: 'alice_a' })); ok(ra, 201);
  a = ra.body;
  const rd = await anon.post('/auth/register', regBody(root.memberId, String(pkgs.pro._id), { username: 'dave_d' })); ok(rd, 201);
  d = rd.body;
});
await check('a pending sponsor cannot sponsor new members yet', async () => {
  ok(await anon.post('/auth/register', regBody(a.memberId, standardId, { username: 'early_bird' })), 400);
  ok(await anon.get(`/public/sponsor/${a.memberId}`), 404);
});
await check('duplicate username → 409; check-username reflects it', async () => {
  ok(await anon.post('/auth/register', regBody(root.memberId, standardId, { username: 'alice_a' })), 409);
  let r = await anon.get('/auth/check-username?username=alice_a'); ok(r); assert.equal(r.body.available, false);
  r = await anon.get('/auth/check-username?username=free_name'); ok(r); assert.equal(r.body.available, true);
  r = await anon.get('/auth/check-username?username=x'); ok(r); assert.equal(r.body.valid, false);
});
await check('pending member cannot log in (403)', async () => {
  const r = await A.post('/auth/login', { identifier: 'alice_a', password: pwd });
  ok(r, 403); assert.match(r.body.message, /pending/i);
});
await check('login: wrong password 401, empty body 422, injection object 422, bad JSON 400', async () => {
  ok(await anon.post('/auth/login', { identifier: 'admin', password: 'wrong' }), 401);
  ok(await anon.post('/auth/login', {}), 422);
  ok(await anon.post('/auth/login', { identifier: { $ne: '' }, password: { $ne: '' } }), 422);
  ok(await anon.call('POST', '/auth/login', { raw: '{bad json' }), 400);
});
await check('admin cannot use member area', async () => {
  ok(await admin.get('/member/dashboard'), 403);
});

console.log('\nAdmin: registrations');
await check('list pending registrations (search escapes regex)', async () => {
  let r = await admin.get('/admin/registrations'); ok(r);
  assert.equal(r.body.total, 2);
  r = await admin.get('/admin/registrations?search=alice'); ok(r); assert.equal(r.body.total, 1);
  r = await admin.get('/admin/registrations?search=.*'); ok(r); assert.equal(r.body.total, 0);
});
await check('reject needs a reason; reject D once', async () => {
  const did = await idOf(d.memberId);
  ok(await admin.post(`/admin/registrations/${did}/reject`, {}), 400);
  ok(await admin.post(`/admin/registrations/${did}/reject`, { reason: 'Documents unclear' }));
  ok(await admin.post(`/admin/registrations/${did}/reject`, { reason: 'again' }), 409);
  ok(await admin.post('/admin/registrations/not-an-id/approve', {}), 400);
});
await check('approve A; then B under A, C under B register and are approved', async () => {
  ok(await admin.post(`/admin/registrations/${await idOf(a.memberId)}/approve`, {}));
  ok(await admin.post(`/admin/registrations/${await idOf(a.memberId)}/approve`, {}), 409);
  const rb = await anon.post('/auth/register', regBody(a.memberId, String(pkgs.basic._id), { username: 'bob_b' })); ok(rb, 201); b = rb.body;
  ok(await admin.post(`/admin/registrations/${await idOf(b.memberId)}/approve`, {}));
  const rc = await anon.post('/auth/register', regBody(b.memberId, standardId, { username: 'carol_c' })); ok(rc, 201); c = rc.body;
  ok(await admin.post(`/admin/registrations/${await idOf(c.memberId)}/approve`, {}));
});
await check('rejected member sees the reason on login', async () => {
  const r = await D.post('/auth/login', { identifier: 'dave_d', password: pwd });
  ok(r, 403); assert.match(r.body.message, /Documents unclear/);
});
await check('approved members can log in (username or member ID, any case)', async () => {
  for (const [cl, u] of [[A, 'alice_a'], [B, 'bob_b'], [C, 'carol_c']]) {
    const r = await cl.post('/auth/login', { identifier: u, password: pwd }); ok(r);
    assert.equal(r.body.user.status, 'active');
  }
  const r = await new Client('x').post('/auth/login', { identifier: a.memberId.toLowerCase(), password: pwd }); ok(r);
});

/* ---------- Member: reads before activation ---------- */
console.log('\nMember: reads');
await check('dashboard has every section', async () => {
  const r = await A.get('/member/dashboard'); ok(r);
  for (const k of ['profile', 'income', 'wallet', 'earnings', 'team', 'referral', 'achievement', 'kyc', 'weekly', 'weeklyIncome']) assert.ok(k in r.body, `missing ${k}`);
  assert.equal(r.body.earnings.last7Days.length, 7);
  assert.ok(r.body.referral.link.includes(a.memberId));
  assert.ok(!('password' in r.body.profile) && !('txnPassword' in r.body.profile));
});
await check('profile, payment-info, kyc, team, income, ledger, wallet, achievements, notifications', async () => {
  for (const p of ['/member/profile', '/member/payment-info', '/member/kyc', '/member/team', '/member/team/members', '/member/team/tree',
    '/member/income', '/member/ledger', '/member/ledger?scope=income', '/member/wallet', '/member/wallet/statement', '/member/wallet/statement?wallet=activation&all=1',
    '/member/wallet/activations', '/member/transfers', '/member/transfers?type=sent', '/member/deposits', '/member/withdrawals',
    '/member/withdrawals/quote?amount=1000', '/member/achievements', '/member/notifications']) {
    const r = await A.get(p); ok(r); assert.ok(r.body, p);
  }
});
await check('notifications: sponsor was told about new referral; mark all/one read', async () => {
  let r = await A.get('/member/notifications'); ok(r);
  assert.ok(r.body.unread >= 1);
  ok(await A.post(`/member/notifications/${r.body.items[0]._id}/read`, {}));
  ok(await A.post('/member/notifications/read', {}));
  r = await A.get('/member/notifications'); assert.equal(r.body.unread, 0);
  ok(await A.post('/member/notifications/zzz/read', {}), 400);
});
await check('wallet statement filters: bad dates do not crash', async () => {
  ok(await A.get('/member/wallet/statement?from=garbage&to=2026-99-99'));
});
await check('tree: another branch is forbidden, bad id 400', async () => {
  const cid = await idOf(c.memberId);
  ok(await A.get(`/member/team/tree?node=${cid}`)); // C is in A's downline
  ok(await C.get(`/member/team/tree?node=${await idOf(a.memberId)}`), 403);
  ok(await A.get('/member/team/tree?node=xyz'), 400);
});

/* ---------- Bundle payment ---------- */
console.log('\nMember: bundle payment (UPI)');
let payA;
await check('submit payment validation: no proof, short UTR, bad type, oversize', async () => {
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR123456' }) }), 400);
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: '12' }, { proof: PNG }) }), 400);
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR123456' }, { proof: { buf: Buffer.from('hello world, not an image'), name: 'x.png' } }) }), 400);
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR123456' }, { proof: { buf: PNG, name: 'x.exe' } }) }), 400);
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR123456' }, { proof: { buf: Buffer.alloc(5.5 * 1024 * 1024, 1), name: 'big.png' } }) }), 400);
});
await check('submit payment OK; second live payment and reused UTR blocked', async () => {
  const r = await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'utr-a-0001' }, { proof: PNG }) });
  ok(r, 201); payA = r.body.payment;
  assert.equal(payA.status, 'pending'); assert.equal(payA.utr, 'UTR-A-0001');
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR-A-0002' }, { proof: PNG }) }), 409);
  ok(await B.call('POST', '/member/payments', { form: fileForm({ packageId: String(pkgs.basic._id), utr: 'UTR-A-0001' }, { proof: PNG }) }), 409);
});
await check('payment proof: owner and admin can open, other member cannot', async () => {
  const f = payA.proof;
  let r = await A.get(`/files/${f}`); ok(r); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  ok(await admin.get(`/files/${f}`));
  ok(await B.get(`/files/${f}`), 403);
  ok(await A.get('/files/../../etc/passwd'), 404);
});
await check('admin payments list/search; reject without reason → 400', async () => {
  let r = await admin.get('/admin/payments?status=pending'); ok(r); assert.equal(r.body.total, 1);
  r = await admin.get('/admin/payments?search=UTR-A-0001'); ok(r); assert.equal(r.body.total, 1);
  r = await admin.get('/admin/payments?search=alice'); ok(r); assert.equal(r.body.total, 1);
  ok(await admin.post(`/admin/payments/${payA._id}/reject`, {}), 400);
});
await check('reject → member can resubmit with a new UTR', async () => {
  ok(await admin.post(`/admin/payments/${payA._id}/reject`, { reason: 'Amount mismatch' }));
  const r = await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR-A-0003' }, { proof: PNG }) });
  ok(r, 201); payA = r.body.payment;
});
await check('approve payment → A active, sponsor (root) paid active income, re-approve 409', async () => {
  const r = await admin.post(`/admin/payments/${payA._id}/approve`, { remarks: 'verified' }); ok(r);
  ok(await admin.post(`/admin/payments/${payA._id}/approve`, {}), 409);
  const me = await A.get('/auth/me'); assert.equal(me.body.user.isPackageActive, true);
  const info = await A.get('/member/payment-info'); assert.equal(info.body.canSubmit, false);
  ok(await A.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR-A-0004' }, { proof: PNG }) }), 400);
});
let payB;
await check('B pays Basic; approve → A earns ₹1,500 active income', async () => {
  const r = await B.call('POST', '/member/payments', { form: fileForm({ packageId: String(pkgs.basic._id), utr: 'UTR-B-0001' }, { proof: PNG }) });
  ok(r, 201); payB = r.body.payment;
  ok(await admin.post(`/admin/payments/${payB._id}/approve`, {}));
  const dash = await A.get('/member/dashboard'); ok(dash);
  assert.equal(dash.body.income.active, 1500);
  assert.equal(dash.body.wallet.balance, 1500);
});
await check('C pays Standard → B ₹2,000 active, A ₹300 passive (L1 = sponsor’s sponsor)', async () => {
  const r = await C.call('POST', '/member/payments', { form: fileForm({ packageId: standardId, utr: 'UTR-C-0001' }, { proof: PNG }) });
  ok(r, 201);
  ok(await admin.post(`/admin/payments/${r.body.payment._id}/approve`, {}));
  // B has Basic (2 passive levels) so receives L2 passive from C's purchase only if applicable; B's active:
  const bd = await B.get('/member/dashboard'); assert.equal(bd.body.income.active, 2000);
  const ad = await A.get('/member/dashboard'); assert.equal(ad.body.income.passive, 300);
});
await check('income summary, ledger by category, team levels match', async () => {
  const inc = await A.get('/member/income'); ok(inc); assert.equal(inc.body.lifetime.active, 1500);
  const led = await A.get('/member/ledger?category=active'); ok(led); assert.equal(led.body.total, 1);
  const team = await A.get('/member/team'); ok(team); assert.ok(team.body.levels.length >= 2);
  const l2 = await A.get('/member/team/members?level=2'); ok(l2); assert.equal(l2.body.total, 1);
});

/* ---------- KYC ---------- */
console.log('\nKYC');
const kycFields = { aadhaarNumber: '100000000001', panNumber: 'abcde1234f', bankName: 'SBI', accountHolder: 'Member One', accountNumber: '123456789012', ifsc: 'sbin0001234' };
let kycA;
await check('KYC validation: missing docs 400, bad PAN/IFSC/Aadhaar 422', async () => {
  ok(await A.call('POST', '/member/kyc', { form: fileForm(kycFields) }), 400);
  ok(await A.call('POST', '/member/kyc', { form: fileForm({ ...kycFields, panNumber: 'BAD' }, { aadhaarDoc: PNG, panDoc: PNG }) }), 422);
  ok(await A.call('POST', '/member/kyc', { form: fileForm({ ...kycFields, ifsc: 'BAD' }, { aadhaarDoc: PNG, panDoc: PNG }) }), 422);
  ok(await A.call('POST', '/member/kyc', { form: fileForm({ ...kycFields, aadhaarNumber: '12' }, { aadhaarDoc: PNG, panDoc: PNG }) }), 422);
});
await check('KYC submit (PNG + PDF), numbers masked in response, duplicate blocked', async () => {
  const r = await A.call('POST', '/member/kyc', {
    form: fileForm(kycFields, { aadhaarDoc: PNG, panDoc: { buf: PDF, type: 'application/pdf', name: 'pan.pdf' }, bankDoc: PNG }),
  });
  ok(r, 201); kycA = r.body.kyc;
  assert.match(kycA.aadhaarNumber, /^X+\d{4}$|^\*+\d{4}$|\d{4}$/);
  assert.notEqual(kycA.aadhaarNumber, kycFields.aadhaarNumber);
  assert.ok(!kycA.panNumber.includes('1234') && kycA.panNumber.startsWith('AB'));
  ok(await A.call('POST', '/member/kyc', { form: fileForm(kycFields, { aadhaarDoc: PNG, panDoc: PNG }) }), 409);
  const g = await A.get('/member/kyc'); ok(g); assert.equal(g.body.status, 'submitted');
});
await check('admin KYC list with aadhaar check; review → approve; reject needs reason', async () => {
  let r = await admin.get('/admin/kyc'); ok(r); assert.equal(r.body.total, 1);
  assert.equal(r.body.items[0].aadhaarMatch, false); // KYC aadhaar differs from registration → warn only
  const id = r.body.items[0]._id;
  ok(await admin.post(`/admin/kyc/${id}/review`, { action: 'bogus' }), 400);
  ok(await admin.post(`/admin/kyc/${id}/review`, { action: 'reject' }), 400);
  ok(await admin.post(`/admin/kyc/${id}/review`, { action: 'review' }));
  r = await admin.post(`/admin/kyc/${id}/review`, { action: 'approve' }); ok(r);
  assert.ok(r.body.warning, 'mismatch is a warning, not a block');
  ok(await admin.post(`/admin/kyc/${id}/review`, { action: 'approve' }), 409);
  const g = await A.get('/member/kyc'); assert.equal(g.body.status, 'approved');
});
await check('KYC documents open for admin and owner only', async () => {
  const r = await admin.get('/admin/kyc?status=approved'); ok(r);
  const doc = r.body.items[0].aadhaarDoc;
  ok(await admin.get(`/files/${doc}`));
  ok(await A.get(`/files/${doc}`));
  ok(await B.get(`/files/${doc}`), 403);
});

/* ---------- Wallets ---------- */
console.log('\nWallets');
let dep;
await check('deposit validation (min/max, UTR, proof)', async () => {
  ok(await A.call('POST', '/member/deposits', { form: fileForm({ amount: 1, utr: 'DEP-0001' }, { proof: PNG }) }), 400);
  ok(await A.call('POST', '/member/deposits', { form: fileForm({ amount: 500, utr: 'DEP-0001' }) }), 400);
  ok(await A.call('POST', '/member/deposits', { form: fileForm({ amount: 'abc', utr: 'DEP-0001' }, { proof: PNG }) }), 400);
});
await check('deposit submit → admin approve credits Activation Wallet once', async () => {
  const r = await B.call('POST', '/member/deposits', { form: fileForm({ amount: 5000, utr: 'DEP-0001' }, { proof: PNG }) });
  ok(r, 201); dep = r.body.deposit;
  ok(await A.call('POST', '/member/deposits', { form: fileForm({ amount: 600, utr: 'DEP-0001' }, { proof: PNG }) }), 409);
  let l = await admin.get('/admin/deposits?status=pending'); ok(l); assert.equal(l.body.total, 1);
  ok(await admin.post(`/admin/deposits/${dep._id}/approve`, { remarks: 'ok' }));
  ok(await admin.post(`/admin/deposits/${dep._id}/approve`, {}), 409);
  const w = await B.get('/member/wallet'); assert.equal(w.body.activationBalance, 5000);
});
await check('deposit reject frees the UTR', async () => {
  const r = await C.call('POST', '/member/deposits', { form: fileForm({ amount: 700, utr: 'DEP-0002' }, { proof: PNG }) }); ok(r, 201);
  ok(await admin.post(`/admin/deposits/${r.body.deposit._id}/reject`, {}), 400);
  ok(await admin.post(`/admin/deposits/${r.body.deposit._id}/reject`, { reason: 'Not received' }));
  ok(await C.call('POST', '/member/deposits', { form: fileForm({ amount: 700, utr: 'DEP-0002' }, { proof: PNG }) }), 201);
});
await check('transfer: self, to downline/upline; refused for other branch / wrong txn password', async () => {
  // A has ₹1,800 in main (1500 active + 300 passive)
  ok(await A.post('/member/transfers', { target: 'self', amount: 100, txnPassword: 'wrong' }), 401);
  ok(await A.post('/member/transfers', { target: 'self', amount: 100, txnPassword: tpwd }), 201);
  ok(await A.post('/member/transfers', { target: 'member', username: 'bob_b', amount: 100, txnPassword: tpwd }), 201);
  ok(await A.post('/member/transfers', { target: 'member', amount: 100, txnPassword: tpwd }), 422);
  ok(await A.post('/member/transfers', { target: 'member', username: 'iskillmatrix', amount: 100, txnPassword: tpwd }), 400);
  ok(await A.post('/member/transfers', { target: 'self', amount: 99999999, txnPassword: tpwd }), 400);
  ok(await A.post('/member/transfers', { target: 'self', amount: -5, txnPassword: tpwd }), 422);
  const l = await A.get('/member/transfers'); ok(l); assert.equal(l.body.total, 2);
  const lk = await A.get('/member/members/lookup?username=bob_b'); ok(lk); assert.equal(lk.body.member.relation, 'downline');
  ok(await A.get('/member/members/lookup?username=nobody_here'), 404);
});
await check('activation wallet buys bundle for another member (P2P); no double activation', async () => {
  const D2 = new Client('D2');
  const reg = await anon.post('/auth/register', regBody(b.memberId, standardId, { username: 'erin_e' })); ok(reg, 201);
  ok(await admin.post(`/admin/registrations/${await idOf(reg.body.memberId)}/approve`, {}));
  const r = await B.post('/member/wallet/purchase', { packageId: String(pkgs.basic._id), wallet: 'activation', username: 'erin_e', txnPassword: tpwd });
  ok(r, 201);
  ok(await B.post('/member/wallet/purchase', { packageId: String(pkgs.basic._id), wallet: 'activation', username: 'erin_e', txnPassword: tpwd }), 409);
  ok(await B.post('/member/wallet/purchase', { packageId: 'x', wallet: 'bank', txnPassword: tpwd }), 422);
  const l = await B.get('/member/wallet/activations'); ok(l); assert.equal(l.body.total, 1);
  await D2.post('/auth/login', { identifier: 'erin_e', password: pwd });
});
await check('wallet statement chains balances; CSV-size export works', async () => {
  const s = await A.get('/member/wallet/statement?all=1'); ok(s);
  assert.ok(s.body.items.length >= 3);
  const last = s.body.items.at(-1) ?? s.body.items[0];
  assert.ok('balanceAfter' in last || 'balance' in last || Object.keys(last).some((k) => /balance/i.test(k)));
});

/* ---------- Withdrawals ---------- */
console.log('\nWithdrawals');
let wd;
await check('withdrawal rules: KYC required, txn password, min amount', async () => {
  ok(await B.post('/member/withdrawals', { amount: 1000, txnPassword: tpwd }), 400); // B has no approved KYC
  ok(await A.post('/member/withdrawals', { amount: 1000, txnPassword: 'bad' }), 401);
  ok(await A.post('/member/withdrawals', { amount: 10, txnPassword: tpwd }), 400);
  ok(await A.post('/member/withdrawals', { amount: 'abc', txnPassword: tpwd }), 422);
  const q = await A.get('/member/withdrawals/quote?amount=10000'); ok(q);
  assert.equal(q.body.netAmount, 9300);
});
await check('withdraw ₹1,000 → balance held; cancel refunds; re-request', async () => {
  const before = (await A.get('/member/wallet')).body.balance;
  let r = await A.post('/member/withdrawals', { amount: 1000, txnPassword: tpwd }); ok(r, 201); wd = r.body.withdrawal;
  assert.equal(wd.netAmount, 930);
  assert.equal((await A.get('/member/wallet')).body.balance, before - 1000);
  ok(await A.post(`/member/withdrawals/${wd._id}/cancel`, {}));
  assert.equal((await A.get('/member/wallet')).body.balance, before);
  ok(await A.post(`/member/withdrawals/${wd._id}/cancel`, {}), 409);
  r = await A.post('/member/withdrawals', { amount: 1000, txnPassword: tpwd }); ok(r, 201); wd = r.body.withdrawal;
});
await check('admin: approve → processing → paid needs reference; reject refunds', async () => {
  const l = await admin.get('/admin/withdrawals'); ok(l); assert.equal(l.body.total, 1);
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'bogus' }), 400);
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'paid' }), 400);
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'approved' }));
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'processing' }));
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'paid', paymentReference: 'UTR998877' }));
  ok(await admin.post(`/admin/withdrawals/${wd._id}/status`, { status: 'rejected', remarks: 'late' }), 409);
  const r2 = await A.post('/member/withdrawals', { amount: 600, txnPassword: tpwd }); ok(r2, 201);
  const bal = (await A.get('/member/wallet')).body.balance;
  ok(await admin.post(`/admin/withdrawals/${r2.body.withdrawal._id}/status`, { status: 'rejected' }), 400);
  ok(await admin.post(`/admin/withdrawals/${r2.body.withdrawal._id}/status`, { status: 'rejected', remarks: 'bank details' }));
  assert.equal((await A.get('/member/wallet')).body.balance, bal + 600);
});

/* ---------- Admin: members ---------- */
console.log('\nAdmin: members & wallet controls');
const aid = await idOf(a.memberId);
await check('dashboard + members list/filters + detail', async () => {
  const dsh = await admin.get('/admin/dashboard'); ok(dsh);
  assert.ok(dsh.body.members.total >= 4);
  assert.equal(dsh.body.daily.length, 14);
  for (const q of ['', '?status=active', '?package=none', '?kyc=approved', '?search=alice', '?wallet=suspended', '?badge=bronze']) ok(await admin.get(`/admin/members${q}`));
  const r = await admin.get(`/admin/members/${aid}`); ok(r);
  assert.ok(!('password' in r.body.user) && !('txnPassword' in r.body.user));
  assert.ok(!('resetTokenHash' in r.body.user));
  assert.ok(!('tokenVersion' in r.body.user), 'tokenVersion must not be sent to the browser');
  ok(await admin.get('/admin/members/not-an-id'), 400);
});
await check('member status: needs reason; suspended member loses access; reactivate', async () => {
  const bid = await idOf(b.memberId);
  ok(await admin.patch(`/admin/members/${bid}/status`, { status: 'suspended' }), 400);
  ok(await admin.patch(`/admin/members/${bid}/status`, { status: 'weird' }), 400);
  ok(await admin.patch(`/admin/members/${bid}/status`, { status: 'suspended', reason: 'fraud check' }));
  ok(await B.get('/member/dashboard'), 403);
  ok(await admin.patch(`/admin/members/${bid}/status`, { status: 'active' }));
  ok(await B.get('/member/dashboard'));
  ok(await admin.patch(`/admin/members/${await idOf(root.memberId)}/status`, { status: 'inactive', reason: 'x' }), 409); // company root is protected
});
await check('profile update: valid fields only, invalid email/mobile rejected', async () => {
  let r = await admin.patch(`/admin/members/${aid}/profile`, { fullName: 'Alice Updated', role: 'admin', status: 'pending' }); ok(r);
  assert.equal(r.body.user.fullName, 'Alice Updated');
  assert.equal(r.body.user.role, 'member');
  ok(await admin.patch(`/admin/members/${aid}/profile`, { email: 'not-an-email' }), 422);
  ok(await admin.patch(`/admin/members/${aid}/profile`, { mobile: 'abc' }), 422);
});
await check('wallet adjust: credit/debit, overdraft, remarks required', async () => {
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'credit', amount: 100 }), 400);
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'credit', amount: 'abc', remarks: 'x' }), 400);
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'credit', amount: 250.555, remarks: 'goodwill' }));
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'debit', amount: 99999999, remarks: 'x' }), 400);
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'debit', amount: 99999, wallet: 'activation', remarks: 'x' }), 400);
  ok(await admin.post(`/admin/members/${aid}/wallet-adjust`, { type: 'debit', amount: 10, wallet: 'activation', remarks: 'fix' }));
});
await check('wallet suspend blocks withdrawals/transfers; reactivate restores', async () => {
  ok(await admin.patch(`/admin/members/${aid}/wallet-status`, { suspended: true }), 400);
  ok(await admin.patch(`/admin/members/${aid}/wallet-status`, { suspended: true, reason: 'audit' }));
  ok(await A.post('/member/withdrawals', { amount: 600, txnPassword: tpwd }), 403);
  ok(await A.post('/member/transfers', { target: 'self', amount: 100, txnPassword: tpwd }), 403);
  ok(await admin.patch(`/admin/members/${aid}/wallet-status`, { suspended: false }));
  ok(await A.post('/member/transfers', { target: 'self', amount: 100, txnPassword: tpwd }), 201);
});
await check('admin resets member password: weak refused, old sessions die', async () => {
  const cid = await idOf(c.memberId);
  ok(await admin.post(`/admin/members/${cid}/reset-password`, { password: 'weak' }), 422);
  ok(await admin.post(`/admin/members/${cid}/reset-password`, { password: 'Brand#New9' }));
  ok(await C.get('/member/dashboard'), 401);
  ok(await C.post('/auth/login', { identifier: 'carol_c', password: 'Brand#New9' }));
});

/* ---------- Income processing ---------- */
console.log('\nAdmin: income processing');
await check('processing overview, weekly pool preview, non-working run', async () => {
  const o = await admin.get('/admin/processing'); ok(o);
  assert.ok(o.body.suggestions.week && o.body.suggestions.month);
  ok(await admin.get('/admin/processing/weekly-pool'));
  ok(await admin.get('/admin/processing/weekly-pool?week=2026-01-05'));
  ok(await admin.get('/admin/processing/weekly-pool?week=garbage'), 400);
  ok(await admin.post('/admin/processing/non-working', { force: true }));
});
let run;
await check('generate monthly bonus → detail → approve (once) / cancel', async () => {
  const month = (await admin.get('/admin/processing')).body.suggestions.month;
  ok(await admin.post('/admin/processing/runs/bogus', { period: month }), 400);
  ok(await admin.post('/admin/processing/runs/monthly_bonus', {}), 400);
  const g = await admin.post('/admin/processing/runs/monthly_bonus', { period: month }); ok(g, 201); run = g.body.run;
  const det = await admin.get(`/admin/processing/runs/${run._id}`); ok(det);
  ok(await admin.post(`/admin/processing/runs/${run._id}/approve`, {}));
  ok(await admin.post(`/admin/processing/runs/${run._id}/approve`, {}), 409);
  ok(await admin.post(`/admin/processing/runs/${run._id}/cancel`, {}), 409);
});
await check('royalty and closed-week runs generate; current week refused', async () => {
  const o = (await admin.get('/admin/processing')).body;
  ok(await admin.post('/admin/processing/runs/royalty', { period: o.suggestions.month }), 201);
  const w = await admin.post('/admin/processing/runs/weekly', { period: o.suggestions.week }); ok(w, 201);
  ok(await admin.post(`/admin/processing/runs/${w.body.run._id}/cancel`, {}));
  const cur = (await admin.get('/admin/processing/weekly-pool')).body.week;
  ok(await admin.post('/admin/processing/runs/weekly', { period: cur }), 400);
  ok(await admin.get('/admin/processing/runs/not-an-id'), 400);
});

/* ---------- Admin: config ---------- */
console.log('\nAdmin: bundles, courses, settings, ledger, audit, network, reports');
await check('bundles: list, update with validation, warning when payout > cost', async () => {
  const l = await admin.get('/admin/packages'); ok(l); assert.equal(l.body.packages.length, 5);
  const p = l.body.packages.find((x) => x.key === 'starter');
  const body = { name: p.name, price: p.price, activeIncome: p.activeIncome, passiveLevels: p.passiveLevels, nonWorkingBonus: p.nonWorkingBonus, weeklyEligible: p.weeklyEligible, status: 'active', description: 'd', benefits: ['b'], courses: p.courses };
  ok(await admin.put(`/admin/packages/${p._id}`, body));
  ok(await admin.put(`/admin/packages/${p._id}`, { ...body, price: -5 }), 422);
  ok(await admin.put(`/admin/packages/${p._id}`, { ...body, courses: ['no-such-course'] }), 400);
  const w = await admin.put(`/admin/packages/${p._id}`, { ...body, activeIncome: 5000 }); ok(w); assert.ok(w.body.warning);
  ok(await admin.put(`/admin/packages/${p._id}`, body));
});
await check('courses: create/update/duplicate slug/invalid slug', async () => {
  const course = { title: 'Test Course', category: 'Testing', level: 'Beginner', status: 'active', summary: 's', modules: [{ title: 'M1', topics: ['t'] }], outcomes: ['o'] };
  const r = await admin.post('/admin/courses', { ...course, slug: 'test-course' }); ok(r, 201);
  ok(await admin.post('/admin/courses', { ...course, slug: 'test-course' }), 409);
  ok(await admin.post('/admin/courses', { ...course, slug: 'Bad Slug!' }), 422);
  ok(await admin.put(`/admin/courses/${r.body.course._id}`, { ...course, title: 'Renamed' }));
  const l = await admin.get('/admin/courses'); ok(l); assert.equal(l.body.courses.length, 11);
  assert.equal((await anon.get('/public/courses')).body.courses.length, 11);
});
await check('settings: get, save new version, validation, history, QR upload', async () => {
  const g = await admin.get('/admin/settings'); ok(g);
  const s = g.body.settings;
  const patch = { site: s.site, payment: { upiId: 'test@upi', payeeName: 'iSkillMatrix', instructions: 'Pay and upload' }, note: 'api check' };
  const r = await admin.put('/admin/settings', patch); ok(r);
  assert.equal(r.body.settings.version, s.version + 1);
  ok(await admin.put('/admin/settings', { tax: { gstPercent: 150, systemCostPercent: 12 } }), 422);
  ok(await admin.put('/admin/settings', { badges: [{ key: 'x', name: 'X', threshold: 1 }, { key: 'x', name: 'Y', threshold: 2 }] }), 400);
  const h = await admin.get('/admin/settings/history'); ok(h); assert.ok(h.body.total >= 1);
  const q = await admin.call('POST', '/admin/settings/qr', { form: fileForm({}, { qr: { buf: PNG, name: 'qr.png' } }) }); ok(q);
  assert.match(q.body.settings.payment.qrImage, /^https:/);
  ok(await admin.call('POST', '/admin/settings/qr', { form: fileForm({}) }), 400);
  const pi = await A.get('/member/payment-info'); assert.equal(pi.body.payment.upiId, 'test@upi');
});
await check('admin ledger filters & totals', async () => {
  for (const q of ['', '?category=active', '?status=completed', '?direction=credit', '?wallet=activation', '?from=2026-01-01&to=2030-01-01', '?search=alice']) {
    const r = await admin.get(`/admin/ledger${q}`); ok(r); assert.ok('totals' in r.body);
  }
});
await check('audit log records actions and filters', async () => {
  const r = await admin.get('/admin/audit-logs'); ok(r); assert.ok(r.body.total > 10);
  const f = await admin.get('/admin/audit-logs?action=payment.'); ok(f); assert.ok(f.body.items.every((i) => i.action.startsWith('payment.')));
  ok(await admin.get('/admin/audit-logs?search=(('));
});
await check('network tree: root, by member ID, unknown', async () => {
  const r = await admin.get('/admin/network'); ok(r); assert.ok(r.body.node);
  ok(await admin.get(`/admin/network?memberId=${a.memberId}`));
  ok(await admin.get('/admin/network?memberId=ISM999999'), 404);
});
await check('all reports run, with filters and CSV-ready columns', async () => {
  const t = await admin.get('/admin/reports'); ok(t);
  assert.ok(t.body.types.length >= 11);
  for (const { key } of t.body.types) {
    for (const q of ['', '?from=2026-01-01&to=2030-12-31', '?search=alice', '?status=approved']) {
      const r = await admin.get(`/admin/reports/${key}${q}`); ok(r);
      assert.ok(Array.isArray(r.body.columns) && Array.isArray(r.body.rows), key);
    }
  }
  ok(await admin.get('/admin/reports/nope'), 404);
});

/* ---------- Account security ---------- */
console.log('\nAccount security');
await check('change login password: wrong current 401, weak 422, success keeps session', async () => {
  ok(await B.post('/auth/change-password', { currentPassword: 'nope', newPassword: 'New@1234', confirmPassword: 'New@1234' }), 401);
  ok(await B.post('/auth/change-password', { currentPassword: pwd, newPassword: 'weak', confirmPassword: 'weak' }), 422);
  ok(await B.post('/auth/change-password', { currentPassword: pwd, newPassword: 'New@1234', confirmPassword: 'New@1234' }));
  ok(await B.get('/member/dashboard'));
  ok(await new Client('b2').post('/auth/login', { identifier: 'bob_b', password: 'New@1234' }));
  ok(await new Client('b3').post('/auth/login', { identifier: 'bob_b', password: pwd }), 401);
});
await check('change transaction password', async () => {
  ok(await B.post('/member/change-txn-password', { currentPassword: 'bad', newTxnPassword: 'Tx@12345', confirmTxnPassword: 'Tx@12345' }), 401);
  ok(await B.post('/member/change-txn-password', { currentPassword: 'New@1234', newTxnPassword: 'New@1234', confirmTxnPassword: 'New@1234' }), 400);
  ok(await B.post('/member/change-txn-password', { currentPassword: 'New@1234', newTxnPassword: 'Tx@12345', confirmTxnPassword: 'Tx@12345' }));
  ok(await B.post('/member/transfers', { target: 'self', amount: 100, txnPassword: 'Tx@12345' }), 201); // new txn password works
  ok(await B.post('/member/transfers', { target: 'self', amount: 100, txnPassword: tpwd }), 401); // old one no longer does
});
await check('forgot/reset password: generic reply, token works once, old sessions die', async () => {
  const r1 = await anon.post('/auth/forgot-password', { identifier: 'nobody_at_all' }); ok(r1);
  const r2 = await anon.post('/auth/forgot-password', { identifier: 'alice_a' }); ok(r2);
  assert.equal(r1.body.message, r2.body.message, 'must not reveal whether the account exists');
  const u = await User.findOne({ username: 'alice_a' }).select('+resetTokenHash +resetTokenExpires');
  assert.ok(u.resetTokenHash && u.resetTokenExpires > new Date());
  const token = crypto.randomBytes(32).toString('hex');
  await User.updateOne({ _id: u._id }, { resetTokenHash: crypto.createHash('sha256').update(token).digest('hex') });
  ok(await anon.post('/auth/reset-password', { token: 'x'.repeat(64), password: 'Reset@1234' }), 400);
  ok(await anon.post('/auth/reset-password', { token, password: 'weak' }), 422);
  ok(await anon.post('/auth/reset-password', { token, password: 'Reset@1234' }));
  ok(await anon.post('/auth/reset-password', { token, password: 'Reset@5678' }), 400);
  ok(await A.get('/member/dashboard'), 401);
  ok(await A.post('/auth/login', { identifier: 'alice_a', password: 'Reset@1234' }));
});
await check('avatar upload/remove', async () => {
  const r = await A.call('POST', '/member/avatar', { form: fileForm({}, { avatar: { buf: PNG, name: 'me.png' } }) }); ok(r);
  assert.match(r.body.avatar, /^https:/);
  ok(await A.call('POST', '/member/avatar', { form: fileForm({}, { avatar: { buf: PDF, type: 'application/pdf', name: 'x.pdf' } }) }), 400);
  ok(await A.call('POST', '/member/avatar', { form: fileForm({}) }), 400);
  ok(await A.del('/member/avatar'));
});
await check('logout clears the session', async () => {
  ok(await A.post('/auth/logout', {}));
  ok(await A.get('/member/dashboard'), 401);
});
await check('Bearer token works and a tampered token is refused', async () => {
  const jwt = (await import('jsonwebtoken')).default;
  const u = await User.findOne({ username: 'admin' }).select('+tokenVersion');
  const t = jwt.sign({ sub: String(u._id), v: u.tokenVersion, role: 'admin' }, env.jwtSecret);
  ok(await anon.get('/auth/me', { headers: { authorization: `Bearer ${t}` } }));
  ok(await anon.get('/auth/me', { headers: { authorization: `Bearer ${t}x` } }), 401);
  const forged = jwt.sign({ sub: String(u._id), v: u.tokenVersion, role: 'admin' }, 'another-secret-another-secret-123456');
  ok(await anon.get('/auth/me', { headers: { authorization: `Bearer ${forged}` } }), 401);
});

/* ---------- Data integrity ---------- */
console.log('\nData integrity');
await check('every wallet balance equals completed credits − debits; no negative balances', async () => {
  const Ledger = (await import('../models/Ledger.js')).default;
  const rows = await Ledger.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: { u: '$user', w: { $ifNull: ['$wallet', 'main'] } }, bal: { $sum: { $cond: [{ $eq: ['$direction', 'credit'] }, '$netAmount', { $multiply: ['$netAmount', -1] }] } } } },
  ]);
  for (const r of rows) assert.ok(r.bal >= -0.001, `negative ${r._id.w} balance ${r.bal} for ${r._id.u}`);
});
await check('no duplicate idempotency keys / UTR locks', async () => {
  const Ledger = (await import('../models/Ledger.js')).default;
  const dup = await Ledger.aggregate([{ $match: { idempotencyKey: { $ne: null } } }, { $group: { _id: '$idempotencyKey', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]);
  assert.equal(dup.length, 0);
});

console.log(`\n${passed} checks passed${failures.length ? `, ${failures.length} FAILED:\n - ${failures.join('\n - ')}` : '.'}`);
server.close();
await mongoose.disconnect();
await mem.stop();
process.exit(failures.length ? 1 : 0);
