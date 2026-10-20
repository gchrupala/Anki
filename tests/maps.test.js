const test = require('node:test');
const assert = require('node:assert/strict');
const GEO = require('../geo.js');
require('../i18n.js');
require('../i18n-maps.js');
require('../places.js');
require('../maps.js');

const { PLACES, PLACE_KINDS, PLACE_CONTINENTS, MAP, I18N } = globalThis;
const ATLASES = ['treasuremap', 'schoolglobe', 'citymap', 'schoolatlas', 'starglobe', 'peutinger', 'idrisi', 'catalan',
  'pirireis', 'mercator', 'blaeu', 'lightglobe', 'behaim', 'jagiellonian', 'goldglobe'];

test('encoded lines decode to the points they were made from', () => {
  // Google's own example, at 1/100 000 degree, read here at 1/100 degree.
  assert.deepEqual(GEO.decode('_p~iF~ps|U_ulLnnqC_mqNvxq`@').map((x) => Math.round(x * 1000)),
    [38500000, -120200000, 40700000, -120950000, 43252000, -126453000]);
});

test('distances along the surface of the Earth', () => {
  // Warsaw to Kraków is about 252 km in a straight line.
  assert.ok(Math.abs(GEO.distance(21.01, 52.23, 19.94, 50.06) - 252) < 2);
  // A quarter of the way round the Earth.
  assert.ok(Math.abs(GEO.distance(0, 0, 90, 0) - (GEO.R * Math.PI) / 2) < 1e-6);
});

test('the projection of each continent goes there and back', () => {
  for (const code of PLACE_CONTINENTS) {
    const proj = GEO.projection(MAP.continents[code].center);
    for (const place of PLACES.filter((p) => p.continent === code)) {
      const [lon, lat] = proj.inverse(...proj.forward(...place.at));
      assert.ok(Math.abs(lat - place.at[1]) < 1e-6 && Math.abs(GEO.wrap(lon - place.at[0])) < 1e-6, place.id);
    }
  }
});

test('the distance to a place: to a point, to a river, and 0 inside an area', () => {
  const area = { type: 'area', lines: [[0, 0, 10, 0, 10, 10, 0, 10, 0, 0]] };
  assert.equal(GEO.toPlace(area, 5, 5).km, 0);
  assert.ok(Math.abs(GEO.toPlace(area, 11, 5).km - GEO.distance(11, 5, 10, 5)) < 1);
  const river = { type: 'line', lines: [[0, 0, 10, 0]] };
  assert.ok(Math.abs(GEO.toPlace(river, 5, 1).km - GEO.distance(5, 1, 5, 0)) < 0.01);
  const point = { type: 'point', lines: [[21.01, 52.23]] };
  assert.ok(Math.abs(GEO.toPlace(point, 19.94, 50.06).km - 252) < 2);
});

test('each place lies at its own shape', () => {
  const byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  const shape = (id) => ({ type: byId[id].type, lines: byId[id].shape.map(GEO.decode) });
  // Inside lakes, seas, islands and deserts.
  assert.equal(GEO.toPlace(shape('baikal'), 108, 53.5).km, 0);
  assert.equal(GEO.toPlace(shape('baltic'), 19, 56).km, 0);
  assert.equal(GEO.toPlace(shape('sicily'), 14, 37.5).km, 0);
  assert.equal(GEO.toPlace(shape('lut'), 58, 31.5).km, 0);
  // Warsaw lies on the Vistula, Tehran close to the Alborz.
  assert.ok(GEO.toPlace(shape('vistula'), 21.03, 52.24).km < 5);
  assert.ok(GEO.toPlace(shape('alborz'), 51.39, 35.69).km < 50);
});

test('every place has an id, a number, a kind, a continent, names and a shape', () => {
  assert.equal(new Set(PLACES.map((p) => p.id)).size, PLACES.length);
  assert.equal(new Set(PLACES.map((p) => p.number)).size, PLACES.length);
  for (const p of PLACES) {
    assert.match(p.id, /^[a-z0-9_]+$/, p.id);
    assert.ok(Number.isInteger(p.number) && p.number > 0, p.id);
    assert.ok(PLACE_KINDS.includes(p.kind), p.id);
    assert.ok(PLACE_CONTINENTS.includes(p.continent), p.id);
    for (const lang of I18N.LANGS) assert.ok(p.name[lang] && p.name[lang].trim() === p.name[lang], `${p.id} ${lang}`);
    assert.ok(!/[A-Za-z]/.test(p.name.fa), `${p.id} fa in Latin letters`);
    assert.ok(['point', 'line', 'area'].includes(p.type), p.id);
    assert.ok(p.shape.length > 0, p.id);
    for (const text of p.shape) {
      const pts = GEO.decode(text);
      assert.ok(pts.length >= (p.type === 'point' ? 2 : 4), p.id);
      for (let i = 0; i < pts.length; i += 2) assert.ok(Math.abs(pts[i]) <= 180 && Math.abs(pts[i + 1]) <= 90, p.id);
    }
  }
});

test('every continent has places of several kinds, and Iran, Poland and the Netherlands are well covered', () => {
  for (const code of PLACE_CONTINENTS) {
    const kinds = new Set(PLACES.filter((p) => p.continent === code).map((p) => p.kind));
    assert.ok(kinds.size >= 5, code);
  }
  for (const kind of PLACE_KINDS) assert.ok(PLACES.filter((p) => p.kind === kind).length >= 20, kind);
  const near = (lon0, lat0, lon1, lat1) => PLACES.filter((p) => p.at[0] >= lon0 && p.at[0] <= lon1 && p.at[1] >= lat0 && p.at[1] <= lat1);
  assert.ok(near(44, 25, 63, 40).length >= 25, 'Iran');
  assert.ok(near(14, 49, 24.2, 55).length >= 25, 'Poland');
  assert.ok(near(3.3, 50.7, 7.3, 53.6).length >= 10, 'the Netherlands');
});

test('every place can be reached on the map of its continent', () => {
  for (const code of PLACE_CONTINENTS) {
    const cont = MAP.continents[code];
    const proj = GEO.projection(cont.center);
    const fit = GEO.decode(cont.fit);
    const xs = [];
    const ys = [];
    for (let i = 0; i < fit.length; i += 2) {
      const [x, y] = proj.forward(fit[i], fit[i + 1]);
      xs.push(x);
      ys.push(y);
    }
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // The map can be moved 40% of its first view beyond it (see clamp in index.html).
    const mx = (x1 - x0) * 0.4;
    const my = (y1 - y0) * 0.4;
    for (const p of PLACES.filter((q) => q.continent === code)) {
      const [x, y] = proj.forward(...p.at);
      assert.ok(x > x0 - mx && x < x1 + mx && y > y0 - my && y < y1 + my, `${p.id} cannot be reached`);
      // Cities and peaks are in the first view of the map.
      if (p.kind === 'city' || p.kind === 'peak') assert.ok(x > x0 && x < x1 && y > y0 && y < y1, `${p.id} not in the first view`);
      // Less than 90 degrees from the middle of the map, where it is cut off at 100.
      assert.ok(proj.angle(...p.at) > 0, `${p.id} too far from the middle`);
    }
  }
});

test('the base map has every layer and continent', () => {
  for (const key of ['land', 'borders', 'lakes', 'rivers', 'ice']) assert.ok(MAP[key].length > 100, key);
  assert.deepEqual(MAP.heights.map(([h]) => h), [200, 500, 1500, 3000]);
  for (const code of PLACE_CONTINENTS) {
    const c = MAP.continents[code];
    assert.equal(c.center.length, 2, code);
    assert.ok(GEO.decode(c.mask).length >= 6, code);
    assert.ok(GEO.decode(c.fit).length >= 6, code);
  }
  // The outline of Europe takes in Warsaw and leaves out Ankara.
  const europe = GEO.decode(MAP.continents.EU.mask);
  assert.ok(GEO.inRing(21, 52.2, europe));
  assert.ok(!GEO.inRing(32.9, 39.9, europe));
});

test('every language has the MapkiMax text', () => {
  for (const lang of I18N.LANGS) {
    const t = I18N.MAPS[lang];
    assert.equal(t.appName, 'MapkiMax');
    for (const key of ['typeAnswer', 'newOne', 'mapHint', 'pinHint', 'mapAria', 'zoomIn', 'zoomOut', 'zoomHome', 'onTheSpot', 'tooFar',
      'moreNew', 'progressTitle', 'progressSub', 'squareAria', 'continentsAria', 'groupsTitle', 'groupsHint', 'kindsTitle',
      'newPerDay', 'howP1', 'howP2', 'howP3', 'ruleAnswer', 'ruleWrong', 'ruleSlow', 'ruleRight', 'ruleFast', 'coinsRules',
      'shopHint', 'yourTrophies', 'noTrophies']) {
      assert.ok(t[key], `${lang} ${key}`);
    }
    for (const key of ['kmAway', 'typeToGoOn', 'learnedOf', 'trophyName', 'trophyTitle', 'trophiesAria', 'madeIn']) {
      assert.equal(typeof t[key], 'function', `${lang} ${key}`);
    }
    for (const kind of PLACE_KINDS) assert.ok(t.kinds[kind] && t.kindChips[kind], `${lang} ${kind}`);
    for (const code of PLACE_CONTINENTS) assert.ok(t.groups[code], `${lang} ${code}`);
    for (const level of ['easy', 'good', 'hard']) assert.ok(t.praise[level], `${lang} ${level}`);
    for (const id of ATLASES) assert.ok(t.trophyName(id), `${lang} ${id}`);
    assert.ok(t.madeIn('behaim') && t.madeIn('treasuremap') === '', `${lang} madeIn`);
    assert.ok(I18N.STRINGS[lang].appWhat.maps, `${lang} appWhat`);
    assert.ok(I18N.STRINGS[lang].appsIntro.includes('MapkiMax'), `${lang} appsIntro`);
  }
});
