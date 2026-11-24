// Sizes, distances and tilts of the sun, the earth and the moon, for drawing them in their true places.
// Every number is from the NASA NSSDC planetary fact sheets (Sun, Earth and Moon), read 2026-11-24:
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
// Source id in src/data/sources.ts: nasa-factsheets.

/** Earth, volumetric mean radius. */
export const EARTH_RADIUS_KM = 6371.0;
/** Sun, volumetric mean radius. */
export const SUN_RADIUS_KM = 695_700;
/** Sun, mean distance from Earth. */
export const SUN_DISTANCE_KM = 149.6e6;
/** Moon, volumetric mean radius. */
export const MOON_RADIUS_KM = 1737.4;
/** Moon, semimajor axis of its orbit about the Earth. */
export const MOON_DISTANCE_KM = 384_400;
/** Earth, obliquity to orbit: the tilt of the equator to the plane the sun appears to move in. */
export const OBLIQUITY_DEG = 23.44;
/** Moon, inclination of its orbit to that same plane (the ecliptic). */
export const MOON_INCLINATION_DEG = 5.145;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export interface Sky {
  /** The point on the earth that has the sun overhead: [longitude, latitude]. */
  sun: [number, number];
  /** The point on the earth that has the moon overhead. */
  moon: [number, number];
}

/**
 * One arrangement the sun and moon can really take. Genesis gives no date, so the choice of
 * arrangement is illustration; what is kept true is the geometry: the sun on the ecliptic, the moon
 * on its orbit tilted 5.145 degrees to it, both seen against an earth tilted 23.44 degrees.
 *
 *   sunLongitude  where the sun is along the ecliptic, in degrees from the March equinox
 *   elongation    how far the moon is from the sun along the ecliptic (0 new, 180 full)
 *   node          where the moon's orbit crosses the ecliptic going north
 *   subsolarLng   which longitude of the earth is turned to the sun (the time of day)
 */
export function arrange({ sunLongitude, elongation, node, subsolarLng }: { sunLongitude: number; elongation: number; node: number; subsolarLng: number }): Sky {
  const e = rad(OBLIQUITY_DEG);
  const ls = rad(sunLongitude);
  const sunDec = Math.asin(Math.sin(e) * Math.sin(ls));
  const sunRa = Math.atan2(Math.cos(e) * Math.sin(ls), Math.cos(ls));
  const lm = ls + rad(elongation);
  const b = rad(MOON_INCLINATION_DEG) * Math.sin(lm - rad(node));
  const moonDec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(lm));
  const moonRa = Math.atan2(Math.sin(lm) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(lm));
  // The earth's turning sets which longitude faces the sun; the moon's longitude follows from the same turn.
  const turn = deg(sunRa) - subsolarLng;
  return { sun: [wrap(subsolarLng), deg(sunDec)], moon: [wrap(deg(moonRa) - turn), deg(moonDec)] };
}
