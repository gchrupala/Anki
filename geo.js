/*
 * Geometry for MapkiMax: the map projection, the encoded lines of maps.js
 * and places.js, and the distance from a point to a place.
 *
 * Lines are stored as Google's encoded polylines of longitude and latitude
 * in 1/100 degree (longitude first). The map of each continent uses the
 * Lambert azimuthal equal-area projection centred on the continent, so areas
 * keep their size; x and y are in kilometres, y to the north.
 *
 * Distances are along the surface of the Earth, taken as a sphere. The
 * distance to a lake, sea or other area is 0 inside it, and otherwise to its
 * nearest edge; the distance to a river is to its nearest bend or stretch.
 *
 * Works in the browser (window.GEO) and in Node (require('./geo.js')).
 */
(function (root) {
  'use strict';

  const R = 6371; // km
  const RAD = Math.PI / 180;

  // An encoded polyline as a flat array [lon, lat, lon, lat, ...] in degrees.
  function decode(text) {
    const out = [];
    let i = 0;
    let lon = 0;
    let lat = 0;
    const next = () => {
      let result = 0;
      let shift = 0;
      let b;
      do {
        b = text.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      return result & 1 ? ~(result >> 1) : result >> 1;
    };
    while (i < text.length) {
      lon += next();
      lat += next();
      out.push(lon / 100, lat / 100);
    }
    return out;
  }

  // The Lambert azimuthal equal-area projection centred on [lon, lat].
  function projection([lon0, lat0]) {
    const l0 = lon0 * RAD;
    const sin0 = Math.sin(lat0 * RAD);
    const cos0 = Math.cos(lat0 * RAD);
    return {
      // [x, y] in km; angle: the cosine of the angle from the centre, for
      // leaving out what lies on the far side of the Earth.
      forward(lon, lat) {
        const l = lon * RAD - l0;
        const sin = Math.sin(lat * RAD);
        const cos = Math.cos(lat * RAD);
        const c = sin0 * sin + cos0 * cos * Math.cos(l);
        const k = Math.sqrt(2 / Math.max(1e-12, 1 + c));
        return [R * k * cos * Math.sin(l), R * k * (cos0 * sin - sin0 * cos * Math.cos(l))];
      },
      angle(lon, lat) {
        return sin0 * Math.sin(lat * RAD) + cos0 * Math.cos(lat * RAD) * Math.cos(lon * RAD - l0);
      },
      inverse(x, y) {
        const rho = Math.hypot(x, y);
        if (rho < 1e-9) return [lon0, lat0];
        const c = 2 * Math.asin(Math.min(1, rho / (2 * R)));
        const sinc = Math.sin(c);
        const cosc = Math.cos(c);
        const lat = Math.asin(Math.max(-1, Math.min(1, cosc * sin0 + (y * sinc * cos0) / rho)));
        const lon = l0 + Math.atan2(x * sinc, rho * cos0 * cosc - y * sin0 * sinc);
        return [wrap(lon / RAD), lat / RAD];
      },
    };
  }

  // A longitude between -180 and 180.
  const wrap = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

  // ---------- distances on the sphere ----------

  const vec = (lon, lat) => {
    const c = Math.cos(lat * RAD);
    return [c * Math.cos(lon * RAD), c * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const angleBetween = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
  const toLonLat = ([x, y, z]) => [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];

  function distance(lon1, lat1, lon2, lat2) {
    return R * angleBetween(vec(lon1, lat1), vec(lon2, lat2));
  }

  // The point of the arc a-b nearest to p (all unit vectors), and the angle to it.
  function nearestOnArc(p, a, b) {
    const n = cross(a, b);
    const nn = Math.hypot(...n);
    if (nn > 1e-12) {
      const s = dot(p, n) / (nn * nn);
      const q = [p[0] - n[0] * s, p[1] - n[1] * s, p[2] - n[2] * s];
      const qn = Math.hypot(...q);
      if (qn > 1e-12 && dot(cross(a, q), n) >= 0 && dot(cross(q, b), n) >= 0) {
        const u = [q[0] / qn, q[1] / qn, q[2] / qn];
        return [angleBetween(p, u), u];
      }
    }
    const da = angleBetween(p, a);
    const db = angleBetween(p, b);
    return da <= db ? [da, a] : [db, b];
  }

  // Whether a point lies inside a ring of [lon, lat, ...] (crossing rule).
  // The rings of Natural Earth are cut at 180 degrees, so none crosses it.
  function inRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i];
      const yi = ring[i + 1];
      const xj = ring[j];
      const yj = ring[j + 1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // The distance in km from [lon, lat] to a place, and the nearest point of
  // the place: { km, at: [lon, lat] }. A place has type 'point', 'line' or
  // 'area', and lines: decoded rings or lines (for a point, one pair).
  function toPlace(place, lon, lat) {
    lon = wrap(lon);
    if (place.type === 'area') {
      // Inside an odd number of rings: inside the area (rings inside rings are holes).
      let inside = false;
      for (const ring of place.lines) if (inRing(lon, lat, ring)) inside = !inside;
      if (inside) return { km: 0, at: [lon, lat] };
    }
    const p = vec(lon, lat);
    let best = Infinity;
    let at = null;
    for (const line of place.lines) {
      let a = vec(line[0], line[1]);
      if (line.length === 2) {
        const d = angleBetween(p, a);
        if (d < best) [best, at] = [d, a];
      }
      for (let i = 2; i < line.length; i += 2) {
        const b = vec(line[i], line[i + 1]);
        const [d, q] = nearestOnArc(p, a, b);
        if (d < best) [best, at] = [d, q];
        a = b;
      }
    }
    return { km: R * best, at: toLonLat(at) };
  }

  const api = { R, decode, projection, wrap, distance, toPlace, inRing };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GEO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
