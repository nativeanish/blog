/** A deterministic, abstract Himalayan ridge. Shared by the live scene and SVG fallback. */
export function terrainHeight(x: number, z: number): number {
  const peak = (cx: number, cz: number, h: number, spread: number) => {
    const radius = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2 * 1.5);
    return Math.max(0, h - radius * spread);
  };
  const mountains = Math.max(
    peak(-3.5, -2.4, 3.6, 1.02),
    peak(0.5, -3, 5.1, 1.12),
    peak(4.1, -2.4, 3.9, 1.1),
  );
  const ridges =
    0.22 * Math.sin(x * 2.2 + z * 1.7) +
    0.1 * Math.sin(x * 5.1 - z * 2.3) +
    0.06 * Math.cos(x * 9.5 + z * 4);
  const foothills = 0.35 + 0.25 * Math.sin(x * 0.55 + z * 0.6);
  return -0.7 + mountains + ridges * Math.min(mountains, 1.4) + foothills;
}
