const test = require('node:test');
const assert = require('node:assert/strict');
const BACKUP = require('../backup.js');

// An in-memory stand-in for the GitHub REST API: one repository, its files
// and the requests made to it.
function fakeGitHub({ isPrivate = true, empty = true } = {}) {
  const files = new Map(); // path -> { text, sha }
  if (!empty) files.set('README.md', { text: '# backup\n', sha: 'readme' });
  const requests = [];
  let version = 0;
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  async function fetch(url, options = {}) {
    requests.push({ url, ...options });
    if (options.headers.Authorization !== 'Bearer good') return reply(401, { message: 'Bad credentials' });
    const path = url.replace('https://api.github.com/repos/jan/maxapki-data', '');
    const method = options.method || 'GET';
    if (path === '') return reply(200, { full_name: 'jan/maxapki-data', private: isPrivate });
    if (path === '/contents/') {
      if (!files.size) return reply(404, { message: 'This repository is empty.' });
      return reply(200, [...files].map(([name, f]) => ({ name, type: 'file', sha: f.sha })));
    }
    const name = decodeURIComponent(path.replace('/contents/', ''));
    const file = files.get(name);
    if (method === 'GET') {
      if (!file) return reply(404, { message: 'Not Found' });
      if (options.headers.Accept === 'application/vnd.github.raw+json') return reply(200, file.text);
      // Files over 1 MB come without content.
      const big = file.text.length > 1e6;
      return reply(200, { name, sha: file.sha, content: big ? '' : BACKUP.toBase64(file.text), encoding: big ? 'none' : 'base64' });
    }
    if (method === 'PUT') {
      const body = JSON.parse(options.body);
      if (file && body.sha !== file.sha) return reply(409, { message: 'does not match' });
      if (!file && body.sha) return reply(422, { message: 'sha given for a new file' });
      version += 1;
      const sha = 'sha' + version;
      files.set(name, { text: BACKUP.fromBase64(body.content), sha });
      return reply(file ? 200 : 201, { content: { name, sha } });
    }
    return reply(405, {});
  }
  return { fetch, files, requests };
}

const remoteOf = (gh, token = 'good') => BACKUP.gitHubRemote({ repo: 'jan/maxapki-data', token, fetch: gh.fetch });
const backupText = (device, extra = {}) => JSON.stringify({ maxapki: 1, saved: 1, device, data: { 'max-apps': { app: 'times' } }, ...extra });

test('repository names', () => {
  assert.equal(BACKUP.parseRepo('jan/maxapki-data'), 'jan/maxapki-data');
  assert.equal(BACKUP.parseRepo(' https://github.com/jan/maxapki-data.git/ '), 'jan/maxapki-data');
  assert.equal(BACKUP.parseRepo('maxapki-data'), null);
  assert.equal(BACKUP.parseRepo('a/b/c'), null);
  assert.equal(BACKUP.parseRepo(''), null);
  assert.equal(BACKUP.parseRepo(undefined), null);
});

test('base64 of Polish and Persian text, also over the size of one chunk', () => {
  const text = '{"name":"Mnożenie żółć","fa":"پیشرفت ۷ × ۸"}';
  assert.equal(BACKUP.fromBase64(BACKUP.toBase64(text)), text);
  const long = 'ąę پ'.repeat(30000);
  assert.equal(BACKUP.fromBase64(BACKUP.toBase64(long)), long);
  assert.equal(BACKUP.toBase64('abc'), 'YWJj');
});

test('fingerprints tell texts apart', () => {
  assert.equal(BACKUP.fingerprint('abc'), BACKUP.fingerprint('abc'));
  assert.notEqual(BACKUP.fingerprint('abc'), BACKUP.fingerprint('abd'));
  assert.match(BACKUP.fingerprint(''), /^[0-9a-f]{8}$/);
});

test('the device that wrote a backup', () => {
  assert.equal(BACKUP.deviceOf(backupText('ipad')), 'ipad');
  assert.equal(BACKUP.deviceOf(JSON.stringify({ maxapki: 1, saved: 1, data: {} })), null);
  assert.equal(BACKUP.deviceOf('not json'), null);
});

test('the repository must be reachable with the token and private', async () => {
  await remoteOf(fakeGitHub()).checkRepo();
  await assert.rejects(remoteOf(fakeGitHub({ isPrivate: false })).checkRepo(), { kind: 'public' });
  await assert.rejects(remoteOf(fakeGitHub(), 'expired').checkRepo(), { kind: 'auth', status: 401 });
  const offline = BACKUP.gitHubRemote({ repo: 'jan/maxapki-data', token: 'good', fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(offline.checkRepo(), { kind: 'network' });
});

test('requests carry the token and skip the browser cache', async () => {
  const gh = fakeGitHub();
  await remoteOf(gh).push(backupText('ipad'), null, 'MaxApki: test');
  const put = gh.requests.find((r) => r.method === 'PUT');
  assert.equal(put.url, 'https://api.github.com/repos/jan/maxapki-data/contents/maxapki.json');
  assert.equal(put.headers.Authorization, 'Bearer good');
  assert.equal(put.cache, 'no-store');
  assert.equal(JSON.parse(put.body).message, 'MaxApki: test');
});

test('the first backup goes into an empty repository, the next ones replace it', async () => {
  const gh = fakeGitHub();
  const remote = remoteOf(gh);
  assert.equal(await remote.sha(), null);
  const first = await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  assert.equal(first.sha, 'sha1');
  const second = await BACKUP.backupOnce({ remote, text: backupText('ipad', { saved: 2 }), device: 'ipad', known: first.sha, message: 'm' });
  assert.equal(second.sha, 'sha2');
  assert.equal(JSON.parse(gh.files.get('maxapki.json').text).saved, 2);
  // Nothing was downloaded: the sha comes from the list of files.
  assert.ok(!gh.requests.some((r) => !r.method && r.url.endsWith('/maxapki.json')));
});

test('a repository with a README gets the backup next to it', async () => {
  const gh = fakeGitHub({ empty: false });
  const r = await BACKUP.backupOnce({ remote: remoteOf(gh), text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  assert.equal(r.sha, 'sha1');
  assert.ok(gh.files.has('README.md'));
});

test('a backup written by another device is not replaced without asking', async () => {
  const gh = fakeGitHub();
  const remote = remoteOf(gh);
  const ipad = await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  // The phone, connected later, has its own progress.
  const phone = await BACKUP.backupOnce({ remote, text: backupText('phone'), device: 'phone', known: null, message: 'm' });
  assert.equal(phone.conflict.sha, ipad.sha);
  assert.equal(BACKUP.deviceOf(phone.conflict.text), 'ipad');
  assert.equal(BACKUP.deviceOf(gh.files.get('maxapki.json').text), 'ipad');
  // Told to, it replaces it.
  const replaced = await BACKUP.backupOnce({ remote, text: backupText('phone'), device: 'phone', known: null, overwrite: true, message: 'm' });
  assert.equal(replaced.sha, 'sha2');
  // Now the iPad, which knows only its own sha, is asked in turn.
  const back = await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: ipad.sha, message: 'm' });
  assert.equal(BACKUP.deviceOf(back.conflict.text), 'phone');
  // After restoring the phone's backup, the iPad knows its sha and replaces it.
  const restored = await remote.pull();
  const after = await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: restored.sha, message: 'm' });
  assert.equal(after.sha, 'sha3');
});

test('a backup this device wrote without hearing back is replaced', async () => {
  const gh = fakeGitHub();
  const remote = remoteOf(gh);
  await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  // The answer got lost, so this device still knows no sha.
  const r = await BACKUP.backupOnce({ remote, text: backupText('ipad', { saved: 2 }), device: 'ipad', known: null, message: 'm' });
  assert.equal(r.sha, 'sha2');
});

test('a progress file put in the repository by hand waits to be restored', async () => {
  const gh = fakeGitHub();
  gh.files.set('maxapki.json', { text: JSON.stringify({ maxapki: 1, saved: 5, data: {} }), sha: 'byhand' });
  const r = await BACKUP.backupOnce({ remote: remoteOf(gh), text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  assert.equal(r.conflict.sha, 'byhand');
});

test('a backup over 1 MB is fetched raw', async () => {
  const gh = fakeGitHub();
  const big = backupText('ipad', { pad: 'x'.repeat(1.2e6) });
  gh.files.set('maxapki.json', { text: big, sha: 'big' });
  const pulled = await remoteOf(gh).pull();
  assert.equal(pulled.sha, 'big');
  assert.equal(pulled.text, big);
});

test('a backup changed between reading and writing fails as a conflict', async () => {
  const gh = fakeGitHub();
  const remote = remoteOf(gh);
  await remote.push(backupText('ipad'), null, 'm');
  await assert.rejects(remote.push(backupText('ipad'), 'old', 'm'), { kind: 'conflict', status: 409 });
  assert.equal(await remoteOf(gh).pull().then((p) => p.sha), 'sha1');
  assert.equal(await remoteOf(fakeGitHub()).pull(), null);
});
