process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 't'; process.env.DEV_AUTH = 'true'; process.env.CLIENT_URL = 'http://x';
const test = require('node:test'); const assert = require('node:assert');
const { PASSWORD_REGEX: R } = require('../src/utils/password');
test('password regex', () => {
  for (const ok of ['Abcdef1!x', 'Strong#Pass99', 'aaaaaaaA!']) assert.ok(R.test(ok), ok);
  for (const bad of ['Abcdef1!', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh12', 'short1A!', '']) assert.ok(!R.test(bad), bad);
});
const mongoose = require('mongoose');
const run = process.env.MONGO_URI ? test : test.skip;
run('auth flow (needs MONGO_URI)', async (t) => {
  await mongoose.connect(process.env.MONGO_URI);
  const app = require('../src/app'); const srv = app.listen(0); const base = `http://localhost:${srv.address().port}/api`;
  const post = (p, body, h = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });
  const email = `t${Date.now()}@x.com`, pw = 'Strong#Pass99';
  assert.equal((await post('/auth/register', { email, password: 'weak' })).status, 400);
  const r = await post('/auth/register', { email, password: pw }); assert.equal(r.status, 201);
  const { token, user } = await r.json(); assert.equal(user.role, 'customer');
  assert.equal((await post('/auth/register', { email: email.toUpperCase(), password: pw })).status, 409);
  assert.equal((await post('/auth/login', { email, password: 'Wrong#Pass99' })).status, 401);
  assert.equal((await post('/staff', { email: 'a' + email, password: pw }, { authorization: 'Bearer ' + token })).status, 403);
  const f1 = await (await post('/auth/forgot-password', { email })).json(), f2 = await (await post('/auth/forgot-password', { email: 'no@x.com' })).json();
  assert.deepEqual(f1, f2);
  assert.equal((await post('/auth/reset-password/badtoken', { password: pw })).status, 400);
  await mongoose.model('User').deleteOne({ email }); srv.close(); await mongoose.disconnect();
});
