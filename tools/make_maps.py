#!/usr/bin/env python3
"""Builds the data of MapkiMax: maps.js (the base map) and places.js (the places).

Usage:
    python3 tools/make_maps.py DATA_DIR          writes maps.js and places.js
    python3 tools/make_maps.py DATA_DIR check    lists the places with their
                                                 Wikidata ids and names

DATA_DIR keeps what is downloaded, so a second run works offline:
  - Natural Earth (public domain), https://www.naturalearthdata.com/
  - ETOPO1 elevation (NOAA, public domain), through NOAA's ERDDAP server
  - names and coordinates from Wikidata (CC0), https://www.wikidata.org/
The places are listed in tools/places.txt; names corrected by hand are in
NAME_FIXES below.

Needs Python 3.10+ with pyshp, shapely, numpy, scipy, scikit-image and requests.

The map is stored as longitude and latitude in 1/100 degree, each line or
ring as a string in Google's encoded polyline format (longitude first). The
page projects it for each continent (Lambert azimuthal equal-area, centred
on the continent).
"""
import glob
import json
import math
import os
import re
import sys
import time
import zipfile

import numpy as np
import requests
import shapefile
from scipy.io import netcdf_file
from scipy.ndimage import gaussian_filter
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union
from skimage import measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ['pl', 'en', 'nl', 'es', 'fa']
UA = {'User-Agent': 'MaxApki-data/1.0 (https://grzegorz.chrupala.me/Anki/)'}

NE_LAYERS = [
    '10m/physical/ne_10m_land',
    '10m/physical/ne_10m_lakes',
    '10m/physical/ne_10m_lakes_europe',
    '10m/physical/ne_10m_rivers_lake_centerlines',
    '10m/physical/ne_10m_rivers_europe',
    '10m/physical/ne_10m_geography_regions_polys',
    '10m/physical/ne_10m_geography_marine_polys',
    '10m/physical/ne_10m_geography_regions_elevation_points',
    '10m/cultural/ne_10m_populated_places',
    '50m/physical/ne_50m_lakes',
    '50m/physical/ne_50m_rivers_lake_centerlines',
    '50m/physical/ne_50m_glaciated_areas',
    '50m/physical/ne_50m_antarctic_ice_shelves_polys',
    '50m/cultural/ne_50m_admin_0_boundary_lines_land',
]
ETOPO_URL = ('https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?'
             'altitude%5B(-90):4:(90)%5D%5B(-180):4:(180)%5D')


# ---------- downloads ----------

def download(data):
    os.makedirs(data, exist_ok=True)
    for layer in NE_LAYERS:
        name = os.path.basename(layer)
        folder = os.path.join(data, name)
        if os.path.isdir(folder):
            continue
        print('downloading', name)
        r = requests.get('https://naciscdn.org/naturalearth/' + layer + '.zip', headers=UA, timeout=300)
        r.raise_for_status()
        path = folder + '.zip'
        with open(path, 'wb') as f:
            f.write(r.content)
        with zipfile.ZipFile(path) as z:
            z.extractall(folder)
    etopo = os.path.join(data, 'etopo4.nc')
    if not os.path.exists(etopo):
        print('downloading ETOPO1 (every 4th minute)')
        r = requests.get(ETOPO_URL, headers=UA, timeout=900)
        r.raise_for_status()
        with open(etopo, 'wb') as f:
            f.write(r.content)


def records(data, name):
    """The features of a Natural Earth layer as (fields, geometry) pairs."""
    reader = shapefile.Reader(glob.glob(os.path.join(data, name, '*.shp'))[0])
    out = []
    for rec, shp in zip(reader.records(), reader.shapes()):
        if shp.shapeType == 0:
            continue
        fields = {k.lower(): v for k, v in rec.as_dict().items()}
        out.append((fields, shape(shp.__geo_interface__)))
    return out


# ---------- encoding ----------

def _value(v):
    v = ~(v << 1) if v < 0 else (v << 1)
    out = []
    while v >= 0x20:
        out.append(chr((0x20 | (v & 0x1f)) + 63))
        v >>= 5
    out.append(chr(v + 63))
    return ''.join(out)


def encode(coords, least=2):
    """A line as an encoded polyline of longitude and latitude in 1/100 degree;
    None if it has fewer than least points."""
    out = []
    px = py = None
    for x, y in coords:
        ix, iy = round(x * 100), round(y * 100)
        if (ix, iy) == (px, py):
            continue
        out.append(_value(ix - (px or 0)) + _value(iy - (py or 0)))
        px, py = ix, iy
    return ''.join(out) if len(out) >= least else None


def lines_of(g):
    """The rings of polygons, or the lines of line strings, as coordinate lists."""
    if g.is_empty:
        return []
    t = g.geom_type
    if t == 'Polygon':
        return [list(g.exterior.coords)] + [list(r.coords) for r in g.interiors]
    if t in ('LineString', 'LinearRing'):
        return [list(g.coords)]
    if hasattr(g, 'geoms'):
        return [line for part in g.geoms for line in lines_of(part)]
    return []


def encode_all(g, tol=0.0):
    if tol:
        g = g.simplify(tol, preserve_topology=True)
    return [e for e in (encode(line) for line in lines_of(g)) if e]



# ---------- the base map ----------

# Where Europe meets Asia, from the sea south of Rhodes north to the Arctic:
# the Aegean, the Dardanelles, the Bosporus, the Black Sea, the Kerch Strait,
# the Sea of Azov, the Kuma-Manych Depression, the Caspian Sea, the Ural
# river and the Ural Mountains, then the Kara Sea east of Novaya Zemlya.
EUROPE_ASIA = [
    (28.6, 35.6), (27.5, 36.5), (26.9, 37.6), (26.3, 38.3), (26.4, 39.0), (26.0, 39.6), (26.15, 40.05),
    (26.6, 40.35), (27.5, 40.55), (28.95, 40.95), (29.05, 41.15), (29.2, 41.25), (31.0, 42.5), (35.0, 43.2),
    (36.7, 44.9), (36.6, 45.3), (37.5, 46.2), (38.9, 47.1), (39.4, 47.15), (40.4, 47.3), (41.5, 46.9),
    (42.8, 46.4), (44.5, 45.8), (45.5, 45.4), (46.5, 45.0), (47.4, 44.7), (49.5, 45.3), (51.0, 46.6),
    (51.8, 46.95), (51.9, 47.6), (51.6, 48.3), (51.3, 49.5), (51.4, 51.2), (53.0, 51.5), (55.1, 51.77),
    (57.0, 51.4), (58.55, 51.2), (59.0, 53.4), (59.6, 54.5), (59.3, 55.5), (59.3, 57.0), (59.5, 58.5),
    (59.3, 60.0), (59.6, 61.5), (59.5, 63.0), (60.0, 64.5), (61.5, 65.5), (63.5, 66.8), (65.5, 67.6),
    (66.5, 68.7), (66.5, 70.0), (67.0, 72.0), (70.5, 76.5), (69.0, 78.0), (66.0, 81.5), (70.0, 82.0), (70.0, 86.0),
]
# Europe's coast on the Mediterranean, from Gibraltar east to the sea south of Rhodes.
EUROPE_SOUTH = [
    (-5.6, 35.96), (-4.0, 35.95), (-2.0, 36.0), (1.0, 37.5), (5.0, 37.6), (8.5, 38.0), (11.5, 37.4),
    (12.4, 36.5), (14.5, 35.6), (19.0, 35.0), (23.5, 34.6), (26.5, 34.8), (28.6, 35.6),
]
# The Atlantic between Europe and North America, from the Arctic south to the
# Azores (Greenland is in North America, Iceland and the Azores in Europe).
EUROPE_WEST = [(0.0, 86.0), (-4.0, 81.0), (-10.0, 76.0), (-12.0, 72.0), (-20.0, 67.5), (-27.5, 65.5), (-28.0, 63.0), (-35.0, 45.0)]
# Asia and Africa: the Mediterranean east of Rhodes, the Suez Canal, the Red Sea
# and the Gulf of Aden, south of Socotra.
ASIA_AFRICA = [
    (28.6, 35.6), (29.0, 34.0), (32.32, 31.6), (32.32, 31.25), (32.33, 30.6), (32.55, 29.95), (32.8, 29.4),
    (33.6, 28.2), (34.6, 27.4), (36.0, 24.8), (38.0, 21.0), (40.5, 16.5), (42.3, 14.0), (43.35, 12.6),
    (45.0, 11.9), (51.6, 11.9), (53.0, 11.8), (60.0, 10.0),
]
# Asia and Australia and Oceania, from the Pacific south of Japan to the
# Indian Ocean: the Philippines, Halmahera and Timor are in Asia, Palau and
# New Guinea in Oceania.
ASIA_OCEANIA = [
    (147.0, 35.0), (135.0, 20.0), (128.0, 10.0), (127.6, 5.0), (129.3, 2.5), (129.6, -1.2), (129.0, -3.6),
    (131.0, -4.5), (131.2, -6.5), (130.0, -8.2), (127.5, -9.2), (125.0, -10.8), (115.0, -11.5), (100.0, -12.0),
]
# Asia and North America: the Bering Strait, between Chukotka and St Lawrence
# Island, and west of the Aleutians (longitudes past 180 continue east).
ASIA_AMERICA = [(191.0, 86.0), (191.0, 65.75), (188.1, 64.1), (186.5, 62.0), (180.0, 58.0), (170.5, 53.8), (165.0, 52.0)]
# North and South America: the border of Panama and Colombia, and the
# Caribbean north of Colombia, Venezuela, Trinidad and Tobago.
NORTH_SOUTH = [(-87.0, 4.0), (-80.0, 5.0), (-77.9, 7.2), (-77.36, 8.68), (-77.0, 10.0), (-75.0, 12.0), (-71.5, 12.9),
               (-68.0, 12.9), (-63.0, 12.3), (-61.3, 11.75), (-59.0, 12.0), (-50.0, 15.0)]


def shifted(points, dx):
    return [(x + dx, y) for x, y in points]


CONTINENT_SHAPES = {
    # centre of the projection, points the first view shows, outline of the land of the continent
    'EU': ((15, 52), [(-24, 64), (-10, 36), (24, 34.6), (27, 33.6), (35, 34.5), (58, 50), (60, 69), (40, 75), (25, 71.5)],
           EUROPE_WEST + [(-33.0, 38.0), (-20.0, 34.0), (-11.0, 35.7)] + EUROPE_SOUTH + EUROPE_ASIA[1:] + [(0.0, 86.0)]),
    'AS': ((90, 42), [(26, 40), (34, 12), (60, 22), (75, 7), (95, -11), (125, -10), (142, 31), (145, 45), (180, 68), (105, 78), (60, 70)],
           list(reversed(EUROPE_ASIA)) + ASIA_AFRICA[1:] + [(73.0, -1.0), (72.0, -8.0), (95.0, -12.0)]
           + list(reversed(ASIA_OCEANIA)) + [(155.0, 45.0)] + list(reversed(ASIA_AMERICA))),
    'AF': ((18, 3), [(-18.5, 14.5), (-10, 36), (11, 37.5), (35, 31.5), (51.5, 12), (58, -21), (50.5, -26), (20, -35), (-17, 22)],
           [(-11.0, 35.7), (-20.0, 34.0), (-25.0, 30.0), (-35.0, 20.0), (-30.0, 10.0), (-20.0, -10.0), (-15.0, -40.0),
            (20.0, -45.0), (60.0, -45.0), (65.0, -20.0)] + list(reversed(ASIA_AFRICA)) + list(reversed(EUROPE_SOUTH))),
    'NA': ((-95, 48), [(-168, 65), (-178, 52), (-160, 58), (-118, 32), (-77, 7), (-60, 14), (-52, 50), (-20, 78), (-60, 83), (-120, 77)],
           shifted(ASIA_AMERICA, -360) + [(-190.0, 50.0), (-170.0, 47.0), (-145.0, 30.0), (-130.0, 15.0), (-115.0, 8.0)]
           + NORTH_SOUTH + [(-40.0, 35.0)] + list(reversed(EUROPE_WEST))),
    'SA': ((-60, -22), [(-92, 0), (-81, -5), (-77, 8), (-60, 12), (-35, -7), (-75, -55), (-65, -56)],
           list(reversed(NORTH_SOUTH)) + [(-95.0, 2.0), (-93.0, -5.0), (-82.0, -30.0), (-84.0, -35.0), (-80.0, -57.0), (-70.0, -60.0),
                                          (-35.0, -60.0), (-25.0, -55.0), (-25.0, -5.0), (-32.0, 2.0), (-45.0, 10.0)]),
    # Oceania reaches east to Hawaii and Tahiti (longitudes past 180 continue east).
    'OC': ((155, -18), [(113, -22), (130, -1), (152, -2), (205, 22), (211, -18), (178, -47), (147, -44), (115, -35)],
           ASIA_OCEANIA + [(110.0, -50.0), (150.0, -60.0), (180.0, -60.0), (230.0, -50.0), (252.0, -32.0), (255.0, -25.0),
                           (215.0, 15.0), (200.0, 32.0), (180.0, 32.0)]),
    'AN': ((0, -90), [(0, -62), (90, -62), (180, -62), (-90, -62)],
           [(lon, -60.0) for lon in range(-180, 181, 5)] + [(180.0, -90.0), (-180.0, -90.0)]),
}

HEIGHTS = [200, 500, 1500, 3000]  # metres; the colours are in index.html


def densify(points, step=1.0):
    """Points every step degrees along each segment, so the outline follows the projection."""
    out = []
    for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1]):
        n = max(1, int(math.ceil(max(abs(x1 - x0), abs(y1 - y0)) / step)))
        out += [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n)]
    return out


def elevation_bands(data):
    """For each height, the outlines of land at least that high (even-odd rings)."""
    f = netcdf_file(os.path.join(data, 'etopo4.nc'), 'r', mmap=False)
    z = f.variables['altitude'][:].astype(np.float32)
    lat = f.variables['latitude'][:].copy()
    lon = f.variables['longitude'][:].copy()
    f.close()
    z[lat < -60, :] = 0  # Antarctica is drawn as ice
    z = np.pad(gaussian_filter(z, 1.0), 1, constant_values=-1000)
    dlat, dlon = lat[1] - lat[0], lon[1] - lon[0]
    bands = []
    for level in HEIGHTS:
        rings = []
        for c in measure.find_contours(z, level):
            xs = np.clip(lon[0] + (c[:, 1] - 1) * dlon, -180, 180)
            ys = np.clip(lat[0] + (c[:, 0] - 1) * dlat, -90, 90)
            if len(xs) < 4 or Polygon(np.column_stack([xs, ys])).area < (0.1 if level < 1000 else 0.05):
                continue
            ring = LineString(np.column_stack([xs, ys])).simplify(0.05)
            e = encode(list(ring.coords))
            if e:
                rings.append(e)
        bands.append([level, rings])
    return bands


def base_map(data, skip_lakes=(), skip_rivers=()):
    """The layers of the base map. Lakes and rivers that are places are drawn from places.js instead."""
    m = {}
    m['continents'] = {
        code: {'center': list(center), 'fit': encode(fit + fit[:1]) if len(fit) > 1 else None, 'mask': encode(densify(mask))}
        for code, (center, fit, mask) in CONTINENT_SHAPES.items()
    }
    m['land'] = [e for _, g in records(data, 'ne_10m_land') for e in encode_all(g, 0.02)]
    m['borders'] = [e for _, g in records(data, 'ne_50m_admin_0_boundary_lines_land') for e in encode_all(g)]
    m['lakes'] = [e for f, g in records(data, 'ne_50m_lakes')
                  if f.get('wikidataid') not in skip_lakes for e in encode_all(g)]
    m['rivers'] = [e for f, g in records(data, 'ne_50m_rivers_lake_centerlines')
                   if f.get('wikidataid') not in skip_rivers for e in encode_all(g)]
    m['ice'] = [e for name in ('ne_50m_glaciated_areas', 'ne_50m_antarctic_ice_shelves_polys')
                for _, g in records(data, name) for e in encode_all(g)]
    m['heights'] = elevation_bands(data)
    return m


# ---------- places ----------

KINDS = ['city', 'peak', 'range', 'lake', 'river', 'sea', 'island', 'desert']
CONTINENTS = ['EU', 'AS', 'AF', 'NA', 'SA', 'OC', 'AN']
FAMILIES = {
    'reg': ['ne_10m_geography_regions_polys'],
    'mar': ['ne_10m_geography_marine_polys'],
    'lak': ['ne_10m_lakes', 'ne_10m_lakes_europe'],
    'riv': ['ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe'],
    'elv': ['ne_10m_geography_regions_elevation_points'],
    'pop': ['ne_10m_populated_places'],
}


def read_places():
    places = []
    with open(os.path.join(ROOT, 'tools', 'places.txt'), encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            pid, number, kind, continent, source = line.split(None, 4)
            assert kind in KINDS and continent in CONTINENTS, line
            qid = None
            m = re.search(r'\s+QID=(Q\d+)$', source)
            if m:
                qid = m.group(1)
                source = source[:m.start()]
            places.append({'id': pid, 'number': int(number), 'kind': kind, 'continent': continent, 'source': source, 'qid': qid})
    for key in ('id', 'number'):
        values = [p[key] for p in places]
        assert len(values) == len(set(values)), 'a place ' + key + ' is used twice'
    return places


class NaturalEarth:
    def __init__(self, data):
        self.data = data
        self.cache = {}

    def layer(self, name):
        if name not in self.cache:
            self.cache[name] = records(self.data, name)
        return self.cache[name]

    def find(self, family, name):
        """The features of a family of layers with one of the names (or English names) NAME|NAME."""
        country = None
        if family == 'pop' and '@' in name:
            name, country = name.split('@')
        wanted = set(name.split('|'))
        found = []
        for layer in FAMILIES[family]:
            for fields, geom in self.layer(layer):
                names = {fields.get('name'), fields.get('name_en'), fields.get('nameascii')}
                if names & wanted and (not country or country in (fields.get('adm0name'), fields.get('sov0name'))):
                    found.append((layer, fields, geom))
        if family in ('pop', 'elv') and len(found) > 1:
            found = [max(found, key=lambda x: x[1].get('pop_max') or x[1].get('elevation') or 0)]
        return found

    def same_id(self, family, qid):
        return [(layer, fields, geom) for layer in FAMILIES[family]
                for fields, geom in self.layer(layer) if fields.get('wikidataid') == qid]


def sparql(query):
    for attempt in range(10):
        r = requests.post('https://query.wikidata.org/sparql', data={'query': query}, timeout=300,
                          headers={**UA, 'Accept': 'application/sparql-results+json'})
        if r.status_code != 429:
            break
        time.sleep(int(r.headers.get('retry-after', 10)) + 1)
    r.raise_for_status()
    return r.json()['results']['bindings']


def wikidata(data, qids):
    """Labels, Wikipedia titles and coordinates of Wikidata items, cached in DATA_DIR/wikidata.json."""
    path = os.path.join(data, 'wikidata.json')
    cache = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    missing = sorted(q for q in set(qids) if q not in cache)
    for i in range(0, len(missing), 100):
        batch = missing[i:i + 100]
        values = ' '.join('wd:' + q for q in batch)
        items = {q: {'labels': {}, 'sitelinks': {}, 'coords': None} for q in batch}
        for b in sparql('SELECT ?item ?label WHERE { VALUES ?item { %s } ?item rdfs:label ?label . '
                        'FILTER(LANG(?label) IN ("%s")) }' % (values, '","'.join(LANGS))):
            items[b['item']['value'].rsplit('/', 1)[1]]['labels'][b['label']['xml:lang']] = b['label']['value']
        for b in sparql('SELECT ?item ?coord WHERE { VALUES ?item { %s } ?item p:P625 ?s . ?s ps:P625 ?coord . '
                        '?s wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank) }' % values):
            item = items[b['item']['value'].rsplit('/', 1)[1]]
            m = re.match(r'Point\(([-\d.eE]+) ([-\d.eE]+)\)', b['coord']['value'])
            if m and item['coords'] is None:
                item['coords'] = [float(m.group(1)), float(m.group(2))]
        for b in sparql('SELECT ?item ?site ?title WHERE { VALUES ?item { %s } ?article schema:about ?item ; '
                        'schema:isPartOf ?site ; schema:name ?title . FILTER(?site IN (%s)) }'
                        % (values, ', '.join('<https://%s.wikipedia.org/>' % l for l in LANGS))):
            lang = b['site']['value'].split('//')[1].split('.')[0]
            items[b['item']['value'].rsplit('/', 1)[1]]['sitelinks'][lang] = b['title']['value']
        cache.update(items)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)
    return cache


def resolve(data, places, ne):
    """Finds the Wikidata id and the shape of each place."""
    land = None
    errors = []
    for p in places:
        family, _, name = p['source'].partition(':')
        p['geom'] = None
        p['ne_qid'] = None
        if family in FAMILIES:
            found = ne.find(family, name)
            if not found:
                errors.append('not in Natural Earth: ' + p['id'] + ' ' + p['source'])
                continue
            ne_ids = {f.get('wikidataid') for _, f, _ in found if f.get('wikidataid')}
            if family in ('pop', 'elv'):
                p['qid'] = p['qid'] or (ne_ids.pop() if ne_ids else None)
                p['geom'] = found[0][2]
                continue
            if p['qid'] in ne_ids:
                # All parts with the id of the place, whatever their name.
                parts = [g for _, _, g in ne.same_id(family, p['qid'])]
            elif p['qid']:
                # Natural Earth has another id (or none): the parts with the name.
                parts = [g for _, _, g in found]
            elif len(ne_ids) == 1:
                p['qid'] = ne_ids.pop()
                parts = [g for _, _, g in ne.same_id(family, p['qid'])]
            else:
                errors.append('more than one or no Wikidata id in Natural Earth: ' + p['id'] + ' ' + ' '.join(sorted(ne_ids)))
                continue
            p['ne_qid'] = p['qid'] if p['qid'] in ne_ids else None
            p['geom'] = unary_union(parts)
        elif family == 'land':
            qid, _, radius = name.partition('~')
            p['qid'] = p['qid'] or qid
            p['land'] = float(radius or 0)
        elif family == 'trace':
            p['geom'] = LineString([tuple(map(float, xy.split(','))) for xy in name.split(';')])
        else:
            p['qid'] = p['qid'] or p['source']
    wd = wikidata(data, [p['qid'] for p in places if p['qid']])
    for p in places:
        item = wd.get(p['qid'])
        if not item or not item['labels']:
            errors.append('not in Wikidata: ' + p['id'] + ' ' + str(p['qid']))
            continue
        p['wd'] = item
        if p['geom'] is not None:
            continue
        if not item['coords']:
            errors.append('no coordinates in Wikidata: ' + p['id'] + ' ' + p['qid'])
            continue
        point = Point(item['coords'])
        if 'land' not in p:
            p['geom'] = point
            continue
        if land is None:
            land = [part for _, g in ne.layer('ne_10m_land') for part in getattr(g, 'geoms', [g])]
        near = [g for g in land if g.distance(point) <= p['land']] or [min(land, key=lambda g: g.distance(point))]
        if min(g.distance(point) for g in near) > 0.3:
            errors.append('no land near ' + p['id'])
            continue
        p['geom'] = unary_union(near)
    if errors:
        raise SystemExit('\n'.join(errors))
    return wd


def check(data):
    """Prints each place with its Wikidata id, names and shape, to check them by eye."""
    places = read_places()
    try:
        resolve(data, places, NaturalEarth(data))
    except SystemExit as e:
        print(e)
    for p in places:
        if not p.get('wd') or p.get('geom') is None:
            continue
        g = p['geom']
        c = g.representative_point()
        print('\t'.join([p['id'], p['kind'], p['continent'], p['qid'], g.geom_type, '%.1f,%.1f' % (c.x, c.y)] + names_of(p)))


# Names from Wikidata that are corrected by hand, by place and language:
# missing names (Wikidata had only the English one), names of something else
# (a city for an island), and long official names.
NAME_FIXES = {
    'mamry': {'pl': 'Mamry', 'fa': 'مامری'},
    'bieszczady': {'nl': 'Bieszczady', 'fa': 'بیشچادی'},
    'iceland': {'fa': 'ایسلند'},
    'texel': {'fa': 'تکسل'},
    'brussels': {'fa': 'بروکسل'},
    'rasht': {'nl': 'Rasht'},
    'sabalan': {'nl': 'Sabalan'},
    'zayandeh': {'pl': 'Zajande Rud', 'en': 'Zayanderud'},
    'mumbai': {'fa': 'بمبئی'},
    'dubai': {'fa': 'دبی'},
    'taiwan': {'en': 'Taiwan'},
    'cyprus': {'fa': 'قبرس'},
    'zanzibar': {'en': 'Zanzibar'},
    'victoria': {'es': 'Lago Victoria'},
    'orange': {'fa': 'رود اورنج'},
    'denali': {'nl': 'Denali', 'fa': 'دنالی'},
    'orizaba': {'en': 'Pico de Orizaba', 'es': 'Pico de Orizaba'},
    'logan': {'pl': 'Mount Logan'},
    'alaskarange': {'pl': 'Góry Alaska'},
    'erie': {'es': 'Lago Erie'},
    'titicaca': {'en': 'Lake Titicaca', 'es': 'Lago Titicaca'},
    'chihuahuan': {'es': 'Desierto de Chihuahua'},
    'hispaniola': {'pl': 'Haiti (Hispaniola)'},
    'vancouverisland': {'pl': 'Wyspa Vancouver'},
    'mojave': {'pl': 'Pustynia Mojave'},
    'cotopaxi': {'en': 'Cotopaxi'},
    'fitzroy': {'nl': 'Fitz Roy'},
    'tierradelfuego': {'pl': 'Ziemia Ognista', 'en': 'Tierra del Fuego', 'nl': 'Vuurland', 'fa': 'تیرا دل فوئگو'},
    'sechura': {'pl': 'Pustynia Sechura'},
    'puncakjaya': {'pl': 'Puncak Jaya', 'es': 'Puncak Jaya'},
    'southernalps': {'en': 'Southern Alps'},
    'newguineahighlands': {'nl': 'Centraal Gebergte', 'fa': 'ارتفاعات گینه نو'},
    'eyre': {'pl': 'Jezioro Eyre', 'en': 'Lake Eyre'},
    'newcaledonia': {'pl': 'Nowa Kaledonia', 'en': 'New Caledonia', 'nl': 'Nieuw-Caledonië', 'es': 'Nueva Caledonia', 'fa': 'کالدونیای جدید'},
    'hawaii': {'pl': 'Hawaje'},
    'kinggeorge': {'nl': 'Koning George-eiland'},
    'vostok': {'pl': 'Jezioro Wostok'},
    'dryvalleys': {'pl': 'Suche Doliny McMurdo'},
    'rossisland': {'nl': 'Rosseiland'},
    'alexanderisland': {'pl': 'Wyspa Aleksandra I'},
}


def label_point(g):
    """Where the name of a place is written: inside an area, halfway along a river."""
    from shapely.ops import polylabel
    if g.geom_type == 'Point':
        return g
    if g.geom_type in ('LineString', 'MultiLineString'):
        longest = max(getattr(g, 'geoms', [g]), key=lambda x: x.length)
        return longest.interpolate(0.5, normalized=True)
    biggest = max(getattr(g, 'geoms', [g]), key=lambda x: x.area)
    return polylabel(biggest, 0.05)


def names_of(p):
    """The names in LANGS: the Wikidata label, or the title of the Wikipedia
    article, without a note in brackets at the end, starting with a capital
    (Spanish labels start in lower case: "mar del Norte")."""
    item = p['wd']
    out = []
    for lang in LANGS:
        name = item['labels'].get(lang) or item['sitelinks'].get(lang) or item['labels'].get('en')
        name = re.sub(r'\s*\(.*\)$', '', name)
        name = NAME_FIXES.get(p['id'], {}).get(lang) or name[:1].upper() + name[1:]
        out.append(name)
    return out


def place_rows(places):
    rows = []
    for p in places:
        g = p['geom']
        if g.geom_type == 'Point':
            kind, lines = 'point', [encode([(g.x, g.y)], least=1)]
        elif 'LineString' in g.geom_type:
            kind, lines = 'line', encode_all(g, 0.01)
        else:
            kind, lines = 'area', encode_all(g, 0.02)
        at = label_point(g)
        rows.append([p['id'], p['number'], p['kind'], p['continent'], kind, [round(at.x, 2), round(at.y, 2)], names_of(p), lines])
    return rows


def js_rows(rows):
    return ',\n'.join('    ' + json.dumps(r, ensure_ascii=False) for r in rows)


def write_places(rows):
    text = '''/*
 * The places of MapkiMax, made by tools/make_maps.py from tools/places.txt:
 * shapes from Natural Earth (public domain), names and coordinates from
 * Wikidata (CC0), names corrected by hand where needed. Do not edit by hand.
 *
 * Each row: id, number (card_id in the review log), kind, continent,
 * type ('point', 'line' or 'area'), where the name is written [lon, lat],
 * the names in Polish, English, Dutch, Spanish and Persian (the order of
 * LANGS), and the shape as encoded lines (see geo.js).
 */
(function (root) {
  'use strict';

  const LANGS = ['pl', 'en', 'nl', 'es', 'fa'];
  const ROWS = [
%s,
  ];

  root.PLACES = ROWS.map(([id, number, kind, continent, type, at, names, shape]) => ({
    id,
    number,
    kind,
    continent,
    type,
    at,
    name: Object.fromEntries(LANGS.map((l, i) => [l, names[i]])),
    shape,
  }));
  root.PLACE_KINDS = %s;
  root.PLACE_CONTINENTS = %s;
})(typeof globalThis !== 'undefined' ? globalThis : this);
''' % (js_rows(rows), json.dumps(KINDS), json.dumps(CONTINENTS))
    with open(os.path.join(ROOT, 'places.js'), 'w', encoding='utf-8') as f:
        f.write(text)


def write_map(m):
    text = '''/*
 * The base map of MapkiMax, made by tools/make_maps.py. Do not edit by hand.
 *
 * Land, lakes, rivers, ice and borders from Natural Earth (public domain);
 * heights from ETOPO1 (NOAA, public domain), as the outlines of land higher
 * than each height. Every line or ring is an encoded line (see geo.js).
 * continents: for each continent the centre of its map, the points its
 * first view shows, and the outline of the land coloured as that continent.
 */
(function (root) {
  'use strict';

  root.MAP = %s;
})(typeof globalThis !== 'undefined' ? globalThis : this);
''' % json.dumps(m, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(ROOT, 'maps.js'), 'w', encoding='utf-8') as f:
        f.write(text)


def main(data):
    download(data)
    places = read_places()
    ne = NaturalEarth(data)
    resolve(data, places, ne)
    rows = place_rows(places)
    write_places(rows)
    skip_lakes = {p['ne_qid'] for p in places if p['kind'] == 'lake' and p.get('ne_qid')}
    skip_rivers = {p['ne_qid'] for p in places if p['kind'] == 'river' and p.get('ne_qid')}
    write_map(base_map(data, skip_lakes, skip_rivers))
    for name in ('places.js', 'maps.js'):
        print(name, os.path.getsize(os.path.join(ROOT, name)) // 1024, 'KB')


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[2] == 'check':
        check(sys.argv[1])
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        raise SystemExit(__doc__)
