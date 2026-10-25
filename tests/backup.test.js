const test = require('node:test');
const assert = require('node:assert/strict');
const BACKUP = require('../backup.js');

// An in-memory stand-in for the GitHub REST API: one repository, its files
// (by path, folders included) and the requests made to it. beforePut runs
// before each write, to let another writer in.
function fakeGitHub({ isPrivate = true, empty = true } = {}) {
  const files = new Map(); // path -> { text, sha }
  if (!empty) files.set('README.md', { text: '# backup\n', sha: 'readme' });
  const requests = [];
  let version = 0;
  const gh = { files, requests, beforePut: null };
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
    assert.ok(path.startsWith('/contents/'), path);
    const name = path.replace('/contents/', '').split('/').map(decodeURIComponent).join('/');
    const file = files.get(name);
    if (method === 'GET' && !file) {
      // A folder: what is directly in it.
      if (!files.size) return reply(404, { message: 'This repository is empty.' });
      const prefix = name ? name + '/' : '';
      const inside = [...files].filter(([p]) => p.startsWith(prefix));
      if (!inside.length) return reply(404, { message: 'Not Found' });
      const entries = new Map();
      for (const [p, f] of inside) {
        const [first, ...rest] = p.slice(prefix.length).split('/');
        entries.set(first, rest.length ? { name: first, type: 'dir', sha: 'tree' } : { name: first, type: 'file', sha: f.sha });
      }
      return reply(200, [...entries.values()]);
    }
    if (method === 'GET') {
      if (options.headers.Accept === 'application/vnd.github.raw+json') return reply(200, file.text);
      // Files over 1 MB come without content.
      const big = file.text.length > 1e6;
      return reply(200, { name, sha: file.sha, content: big ? '' : BACKUP.toBase64(file.text), encoding: big ? 'none' : 'base64' });
    }
    if (method === 'PUT') {
      if (gh.beforePut) gh.beforePut();
      const body = JSON.parse(options.body);
      const now = files.get(name);
      if (now && body.sha !== now.sha) return reply(409, { message: 'does not match' });
      if (!now && body.sha) return reply(422, { message: 'sha given for a new file' });
      version += 1;
      const sha = 'sha' + version;
      files.set(name, { text: BACKUP.fromBase64(body.content), sha });
      return reply(now ? 200 : 201, { content: { name, sha } });
    }
    return reply(405, {});
  }
  gh.fetch = fetch;
  gh.write = (name, text) => {
    version += 1;
    files.set(name, { text, sha: 'sha' + version });
  };
  return gh;
}

const remoteOf = (gh, token = 'good', person = 'zosia') =>
  BACKUP.gitHubRemote({ repo: 'jan/maxapki-data', token, path: BACKUP.pathFor(person), fetch: gh.fetch });
const ZOSIA = 'zosia/maxapki.json';
const backupText = (device, extra = {}) => JSON.stringify({ maxapki: 1, saved: 1, device, data: { 'max-apps': { app: 'times' } }, ...extra });

test('repository names', () => {
  assert.equal(BACKUP.parseRepo('jan/maxapki-data'), 'jan/maxapki-data');
  assert.equal(BACKUP.parseRepo(' https://github.com/jan/maxapki-data.git/ '), 'jan/maxapki-data');
  assert.equal(BACKUP.parseRepo('maxapki-data'), null);
  assert.equal(BACKUP.parseRepo('a/b/c'), null);
  assert.equal(BACKUP.parseRepo(''), null);
  assert.equal(BACKUP.parseRepo(undefined), null);
});

test('names of people', () => {
  assert.equal(BACKUP.parsePerson('Zosia'), 'zosia');
  assert.equal(BACKUP.parsePerson(' Grzegorz  Chrupała '), 'grzegorz-chrupała');
  assert.equal(BACKUP.parsePerson('Jan-Piet de Vries!'), 'jan-piet-de-vries');
  assert.equal(BACKUP.parsePerson('a/b'), 'a-b');
  assert.equal(BACKUP.parsePerson('مریم'), 'مریم');
  assert.equal(BACKUP.parsePerson('Zoe\u0301'), BACKUP.parsePerson('Zoé'));
  assert.equal(BACKUP.parsePerson('x'.repeat(60)).length, 40);
  assert.equal(BACKUP.parsePerson(' - / '), null);
  assert.equal(BACKUP.parsePerson(undefined), null);
  assert.equal(BACKUP.pathFor('zosia'), 'zosia/maxapki.json');
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
  const offline = BACKUP.gitHubRemote({ repo: 'jan/maxapki-data', token: 'good', path: BACKUP.pathFor('zosia'), fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(offline.checkRepo(), { kind: 'network' });
});

test('requests carry the token and skip the browser cache', async () => {
  const gh = fakeGitHub();
  await remoteOf(gh).push(backupText('ipad'), null, 'MaxApki: test');
  const put = gh.requests.find((r) => r.method === 'PUT');
  assert.equal(put.url, 'https://api.github.com/repos/jan/maxapki-data/contents/zosia/maxapki.json');
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
  assert.equal(JSON.parse(gh.files.get(ZOSIA).text).saved, 2);
  // Nothing was downloaded: the sha comes from the list of files in the folder.
  assert.ok(!gh.requests.some((r) => !r.method && r.url.endsWith('/maxapki.json')));
  assert.ok(gh.requests.some((r) => r.url.endsWith('/contents/zosia')));
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
  assert.equal(BACKUP.deviceOf(gh.files.get(ZOSIA).text), 'ipad');
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
  gh.files.set(ZOSIA, { text: JSON.stringify({ maxapki: 1, saved: 5, data: {} }), sha: 'byhand' });
  const r = await BACKUP.backupOnce({ remote: remoteOf(gh), text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  assert.equal(r.conflict.sha, 'byhand');
});

test('a backup over 1 MB is fetched raw', async () => {
  const gh = fakeGitHub();
  const big = backupText('ipad', { pad: 'x'.repeat(1.2e6) });
  gh.files.set(ZOSIA, { text: big, sha: 'big' });
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

test('people and apps sharing a repository keep to their own files', async () => {
  const gh = fakeGitHub();
  gh.write('zosia/myo.json', '{"myo":true}');
  gh.write('grzegorz/myo.json', '{"myo":true}');
  const zosia = await BACKUP.backupOnce({ remote: remoteOf(gh, 'good', 'zosia'), text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  // Another person, on another device, is not asked about Zosia's backup.
  const max = await BACKUP.backupOnce({ remote: remoteOf(gh, 'good', 'max'), text: backupText('phone'), device: 'phone', known: null, message: 'm' });
  assert.ok(zosia.sha && max.sha);
  assert.deepEqual([...gh.files.keys()].sort(), ['grzegorz/myo.json', 'max/maxapki.json', 'zosia/maxapki.json', 'zosia/myo.json']);
  assert.equal(BACKUP.deviceOf(gh.files.get('zosia/maxapki.json').text), 'ipad');
  assert.equal(gh.files.get('zosia/myo.json').text, '{"myo":true}');
});

test('a folder with letters outside ASCII', async () => {
  const gh = fakeGitHub();
  const person = BACKUP.parsePerson('Łucja');
  await BACKUP.backupOnce({ remote: remoteOf(gh, 'good', person), text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  assert.ok(gh.files.has('łucja/maxapki.json'));
  assert.ok(gh.requests.some((r) => r.url.endsWith('/contents/%C5%82ucja/maxapki.json')));
});

test('a write by someone else at the same moment is tried again', async () => {
  const gh = fakeGitHub();
  const remote = remoteOf(gh);
  const first = await BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: null, message: 'm' });
  // The same device's lost answer, then a write that slips in once between
  // reading the sha and writing (as another app writing at that moment).
  let once = true;
  gh.beforePut = () => {
    if (once) gh.write(ZOSIA, backupText('ipad', { saved: 3 }));
    once = false;
  };
  const r = await BACKUP.backupOnce({ remote, text: backupText('ipad', { saved: 4 }), device: 'ipad', known: first.sha, message: 'm' });
  assert.ok(r.sha);
  assert.equal(JSON.parse(gh.files.get(ZOSIA).text).saved, 4);
  // Always in the way: it gives up after three tries.
  gh.beforePut = () => gh.write(ZOSIA, backupText('ipad'));
  const puts = gh.requests.filter((q) => q.method === 'PUT').length;
  await assert.rejects(BACKUP.backupOnce({ remote, text: backupText('ipad'), device: 'ipad', known: null, message: 'm' }), { kind: 'conflict' });
  assert.equal(gh.requests.filter((q) => q.method === 'PUT').length - puts, 3);
});
