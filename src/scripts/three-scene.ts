import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  LineSegments,
  LineBasicMaterial,
  Points,
  ShaderMaterial,
  Color,
  FogExp2,
  Vector2,
  SRGBColorSpace,
} from 'three';
import { terrainHeight } from './terrain-math';

type DeviceNavigator = Navigator & { deviceMemory?: number };
/** Owns every GPU resource and listener for one landscape. No global render loop. */
export class HimalayanScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(43, 1, 0.1, 60);
  private readonly group = new Group();
  private readonly events = new AbortController();
  private readonly target = new Vector2();
  private readonly pointer = new Vector2();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: (
    MeshBasicMaterial | LineBasicMaterial | ShaderMaterial
  )[] = [];
  private readonly renderer: WebGLRenderer;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private particles?: Points;
  private frame = 0;
  private visible = true;
  private paused = false;
  private disposed = false;
  private lost = false;
  private elapsed = 0;
  private last = 0;
  private slowFrames = 0;
  private renderCount = 0;
  private dpr: number;
  private readonly weak =
    matchMedia('(pointer: coarse)').matches ||
    (navigator.hardwareConcurrency || 8) <= 4 ||
    ((navigator as DeviceNavigator).deviceMemory || 8) <= 4;

  constructor(
    canvas: HTMLCanvasElement,
    private host: HTMLElement,
  ) {
    this.dpr = Math.min(devicePixelRatio || 1, this.weak ? 1.25 : 1.75);
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !this.weak,
      powerPreference: 'low-power',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x111213, 0);
    this.renderer.setPixelRatio(this.dpr);
    this.scene.fog = new FogExp2(0x111213, 0.036);
    this.camera.position.set(0, 4.3, 12.6);
    this.camera.lookAt(0, 1.0, -1);
    this.group.rotation.y = -0.16;
    this.scene.add(this.group);
    // Construct resources within a guarded block: partial setup must be disposable.
    try {
      this.buildTerrain();
      this.buildParticles();
      this.resize();
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.releaseGPU();
      throw error;
    }
    const { signal } = this.events;
    window.addEventListener('pointermove', this.onPointer, {
      passive: true,
      signal,
    });
    window.addEventListener('scroll', this.onScroll, { passive: true, signal });
    document.addEventListener('visibilitychange', this.updateActivity, {
      signal,
    });
    canvas.addEventListener('webglcontextlost', this.onContextLost, { signal });
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, {
      signal,
    });
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.observer = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? false;
      this.updateActivity();
    });
    this.observer.observe(host);
    this.host.dataset.state = 'ready';
    this.updateActivity();
  }
  private buildTerrain() {
    const rows = this.weak ? 65 : 95;
    const columns = this.weak ? 120 : 180;
    const vertices: number[] = [],
      indices: number[] = [],
      lines: number[] = [],
      colors: number[] = [];
    const color = new Color();
    for (let row = 0; row <= rows; row++) {
      const z = -7 + (row / rows) * 13;
      for (let col = 0; col <= columns; col++) {
        const x = -10 + (col / columns) * 20;
        const y = terrainHeight(x, z);
        vertices.push(x, y, z);
        if (col < columns) {
          const nextX = -10 + ((col + 1) / columns) * 20;
          lines.push(
            x,
            y + 0.016,
            z,
            nextX,
            terrainHeight(nextX, z) + 0.016,
            z,
          );
          const light = Math.max(0.17, Math.min(0.73, 0.26 + (y + 0.8) * 0.12));
          color.setRGB(light * 1.06, light, light * 0.9);
          if (row > rows * 0.7) color.lerp(new Color('#92534a'), 0.32);
          colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
        if (row < rows && col < columns) {
          const a = row * (columns + 1) + col;
          indices.push(
            a,
            a + columns + 1,
            a + 1,
            a + 1,
            a + columns + 1,
            a + columns + 2,
          );
        }
      }
    }
    const surface = new BufferGeometry();
    this.geometries.push(surface);
    surface.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    surface.setIndex(indices);
    const surfaceMaterial = new MeshBasicMaterial({
      color: '#111213',
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.materials.push(surfaceMaterial);
    this.group.add(new Mesh(surface, surfaceMaterial));
    const geometry = new BufferGeometry();
    this.geometries.push(geometry);
    geometry.setAttribute('position', new Float32BufferAttribute(lines, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.materials.push(material);
    this.group.add(new LineSegments(geometry, material));
  }
  private buildParticles() {
    const positions = [];
    const count = this.weak ? 35 : 90;
    for (let i = 0; i < count; i++) {
      // Seeded values keep the scene stable across reloads.
      const rand = (n: number) => {
        const v = Math.sin(n * 127.1) * 43758.5453;
        return v - Math.floor(v);
      };
      positions.push(
        (rand(i + 1) - 0.5) * 22,
        rand(i + 91) * 8,
        -rand(i + 182) * 12,
      );
    }
    const geometry = new BufferGeometry();
    this.geometries.push(geometry);
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader:
        'void main(){ vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=2.0; }',
      fragmentShader:
        'void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.76,.59,.43,a*.42);}',
    });
    this.materials.push(material);
    this.particles = new Points(geometry, material);
    this.scene.add(this.particles);
  }
  private onPointer = (event: PointerEvent) => {
    if (this.weak || this.paused || !this.visible) return;
    this.target.set(
      (event.clientX / innerWidth - 0.5) * 2,
      (event.clientY / innerHeight - 0.5) * 2,
    );
  };
  private onScroll = () => {
    if (this.paused || !this.visible) return;
    this.group.position.y = -Math.min(scrollY / innerHeight, 1) * 0.28;
  };
  private resize = () => {
    if (this.disposed || this.lost) return;
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.fov = width < 600 ? 49 : 43;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.paused) this.renderer.render(this.scene, this.camera);
  };
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.host.dataset.state = 'fallback';
    this.host.querySelector<HTMLElement>('[data-scene-status]')!.textContent =
      'STILL LANDSCAPE';
    this.updateActivity();
  };
  private onContextRestored = () => {
    if (this.disposed) return;
    this.lost = false;
    this.resize();
    this.renderer.render(this.scene, this.camera);
    this.host.dataset.state = 'ready';
    this.host.querySelector<HTMLElement>('[data-scene-status]')!.textContent =
      this.paused ? 'LANDSCAPE PAUSED' : 'LIVE LANDSCAPE';
    this.updateActivity();
  };
  private updateActivity = () => {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    const active =
      !this.disposed &&
      !this.lost &&
      !this.paused &&
      this.visible &&
      !document.hidden;
    this.host.dataset.rendering = String(active);
    if (active) {
      this.last = 0;
      this.frame = requestAnimationFrame(this.render);
    }
  };
  private render = (time: number) => {
    this.frame = requestAnimationFrame(this.render);
    const delta = this.last ? time - this.last : 34;
    if (delta < (this.weak ? 1000 / 30 : 1000 / 45)) return;
    this.last = time;
    this.elapsed += Math.min(delta, 60) / 1000;
    this.pointer.lerp(this.target, 0.055);
    this.group.rotation.y =
      -0.16 + this.pointer.x * 0.075 + Math.sin(this.elapsed * 0.13) * 0.018;
    this.camera.position.y = 4.3 + this.pointer.y * 0.12;
    this.camera.lookAt(0, 1, -1);
    if (this.particles)
      this.particles.position.y = Math.sin(this.elapsed * 0.18) * 0.12;
    const started = performance.now();
    this.renderer.render(this.scene, this.camera);
    if (performance.now() - started > 24 || delta > 65) this.slowFrames++;
    if (++this.renderCount % 100 === 0) {
      if (this.slowFrames > 30 && this.dpr > 1) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
      }
      this.slowFrames = 0;
    }
  };
  public setPaused(paused: boolean) {
    this.paused = paused;
    this.updateActivity();
  }
  private releaseGPU() {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.scene.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
  }
  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.updateActivity();
    this.events.abort();
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    this.releaseGPU();
    this.renderer.forceContextLoss();
  }
}
