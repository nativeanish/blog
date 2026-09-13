import { writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3, Euler } from 'three';
import { terrainHeight } from '../src/scripts/terrain-math.ts';

// Use the same ridge function and camera as the WebGL experience.
const camera = new PerspectiveCamera(43, 1000 / 800, 0.1, 60);
camera.position.set(0, 4.3, 12.6);
camera.lookAt(0, 1, -1);
camera.updateMatrixWorld();
const rotation = new Euler(0, -0.16, 0);
const paths: string[] = [];
for (let row = 0; row <= 65; row++) {
  const z = -7 + (row / 65) * 13;
  let path = '';
  for (let col = 0; col <= 130; col++) {
    const x = -10 + (col / 130) * 20;
    const point = new Vector3(x, terrainHeight(x, z), z)
      .applyEuler(rotation)
      .project(camera);
    path += `${col ? 'L' : 'M'}${((point.x * 0.5 + 0.5) * 1000).toFixed(1)},${((-point.y * 0.5 + 0.5) * 800).toFixed(1)}`;
  }
  const color = row > 45 ? '#775b51' : '#797972';
  paths.push(
    `<path d="${path}L1300,1100L-500,1100Z" fill="#111213"/><path d="${path}" fill="none" stroke="${color}" stroke-width=".8" opacity=".7"/>`,
  );
}
writeFileSync(
  'public/terrain.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" viewBox="0 0 1000 800">${paths.join('')}</svg>`,
);
