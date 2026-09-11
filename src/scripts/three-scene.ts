import * as THREE from 'three';

// Simplex noise GLSL implementation for organic botanical displacement
const simplexNoiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// Vertex shader for blossoming flora / organic seed pod with scroll-driven bloom
const floraVertexShader = `
${simplexNoiseGLSL}

uniform float uTime;
uniform float uBloom;
uniform float uScroll;
uniform vec2 uWind;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;
varying float vPetalFold;
varying float vBloomFactor;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vBloomFactor = uBloom;

  // Organic 6-fold flower petal harmonics
  float angle = atan(position.z, position.x);
  float radius = length(position.xz);
  
  // As uBloom increases, petals unfold wider
  float petalBase = sin(angle * 6.0 + uTime * 0.35);
  float petalHarmonic = petalBase * (0.2 + uBloom * 0.45);
  
  // Biological breathing noise displacement
  float noise = snoise(position * 0.75 + vec3(uTime * 0.15)) * (0.35 + uBloom * 0.25);
  float verticalGrowth = sin(position.y * 2.8 + uTime * 0.7) * 0.08;
  
  float totalDisp = (petalHarmonic + noise + verticalGrowth) * (0.85 + uBloom * 0.4);
  vPetalFold = totalDisp;

  // Petal outward unfolding bloom deformation
  vec3 newPosition = position + normal * totalDisp;
  
  // Outward petal flare during bloom
  float flare = smoothstep(-1.5, 2.0, position.y) * uBloom * 0.65;
  newPosition.xz += normalize(position.xz + 0.001) * flare;

  // Gentle wind sway & scroll response
  newPosition.x += uWind.x * (position.y + 2.0) * 0.15;
  newPosition.z += uWind.y * (position.y + 2.0) * 0.15;

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader: Subsurface scattering, chlorophyll gradients, and sunlit bloom glow
const floraFragmentShader = `
uniform float uTime;
uniform float uBloom;
uniform vec3 uColorBase;
uniform vec3 uColorLeaf;
uniform vec3 uColorPollen;
uniform vec3 uColorSunlight;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;
varying float vPetalFold;
varying float vBloomFactor;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // Sunlight direction (warm morning sun)
  vec3 sunDir = normalize(vec3(0.8, 1.2, 0.9));
  
  // Diffuse illumination
  float NdotL = max(dot(normal, sunDir), 0.0);
  
  // Translucent Subsurface Scattering (sun shining through tender leaf/petal layers)
  float sssBacklight = pow(max(dot(viewDir, -sunDir), 0.0), 2.2) * (0.65 + uBloom * 0.5);
  
  // Sunlit grazing rim (dew sheen)
  float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.8);

  // Color blending: Deep stem green to fresh matcha to golden pollen nectar
  vec3 chlorophyll = mix(uColorBase, uColorLeaf, clamp(vPosition.y * 0.3 + 0.5, 0.0, 1.0));
  
  // As it blooms, inner golden nectar radiates outwards
  float pollenSpread = clamp(vPetalFold * 1.5 + 0.2 + uBloom * 0.35, 0.0, 1.0);
  vec3 goldenVein = mix(chlorophyll, uColorPollen, pollenSpread);
  
  vec3 finalColor = goldenVein * (NdotL * 0.65 + 0.35);
  finalColor += uColorSunlight * sssBacklight * 0.55;
  finalColor += vec3(1.0, 0.98, 0.92) * rim * 0.55;

  float alpha = clamp(0.92 + rim * 0.08, 0.0, 1.0);
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Shaders for sunlit pollen with scroll-driven vortex
const pollenVertexShader = `
uniform float uTime;
uniform float uDpr;
uniform float uScroll;
uniform float uScrollSpeed;
uniform vec2 uWind;

attribute float aScale;
attribute vec3 aColor;
attribute float aSpeed;
attribute float aPhase;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;

  vec3 pos = position;
  
  // Scroll vortex rotation
  float scrollAngle = uScroll * 3.14159 * 1.5 + (uTime * aSpeed * 0.12 + aPhase);
  float s = sin(scrollAngle);
  float c = cos(scrollAngle);
  
  float x = pos.x * c - pos.z * s;
  float z = pos.x * s + pos.z * c;
  pos.x = x;
  pos.z = z;

  // Thermal updraft accelerated by scroll
  pos.y += sin(uTime * aSpeed * 0.8 + aPhase) * 0.6 + (uScroll * 4.0);
  pos.x += uWind.x * 3.5;
  pos.z += uWind.y * 3.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Perspective size attenuation
  float scaleBoost = 1.0 + uScrollSpeed * 1.5;
  gl_PointSize = aScale * scaleBoost * (130.0 / -mvPosition.z) * uDpr;
  gl_PointSize = clamp(gl_PointSize, 1.5, 36.0);

  // Depth fade
  vAlpha = smoothstep(50.0, 5.0, -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
`;

const pollenFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float glow = exp(-dist * dist * 10.0);
  float core = smoothstep(0.18, 0.0, dist) * 0.7;
  float alpha = (glow + core) * vAlpha * 0.85;

  gl_FragColor = vec4(vColor, alpha);
}
`;

export class WebGLBackground {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private floraMesh!: THREE.Mesh;
  private floraMaterial!: THREE.ShaderMaterial;
  private vineMesh1!: THREE.Mesh;
  private vineMesh2!: THREE.Mesh;
  private pollenSystem!: THREE.Points;
  private pollenMaterial!: THREE.ShaderMaterial;

  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Pointer & Wind tracking
  private mouse = { x: 0, y: 0 };
  private targetMouse = { x: 0, y: 0 };
  private wind = new THREE.Vector2(0, 0);

  // Scroll Tracking & Lerp
  private scrollProgress = 0;
  private targetScroll = 0;
  private lastScrollProgress = 0;
  private scrollVelocity = 0;

  private isReducedMotion = false;
  private isMobile = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.checkCapabilities();
    this.initScene();
    this.createFlora();
    this.createBotanicalTendrils();
    this.createPollenField();
    this.setupEvents();
    this.onResize();
    this.onScroll();
    this.animate();
  }

  private checkCapabilities() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth < 768;
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xfaf7f2, 0.016);

    const fov = this.isMobile ? 55 : 45;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const maxDpr = this.isMobile ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  private createFlora() {
    const geometry = new THREE.IcosahedronGeometry(2.35, this.isMobile ? 36 : 64);

    this.floraMaterial = new THREE.ShaderMaterial({
      vertexShader: floraVertexShader,
      fragmentShader: floraFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uScroll: { value: 0 },
        uWind: { value: new THREE.Vector2(0, 0) },
        uColorBase: { value: new THREE.Color('#193d2c') },
        uColorLeaf: { value: new THREE.Color('#52b788') },
        uColorPollen: { value: new THREE.Color('#e5a02e') },
        uColorSunlight: { value: new THREE.Color('#fff6e0') },
      },
      transparent: true,
    });

    this.floraMesh = new THREE.Mesh(geometry, this.floraMaterial);
    this.scene.add(this.floraMesh);
  }

  private createBotanicalTendrils() {
    const vineGeo1 = new THREE.TorusGeometry(3.5, 0.016, 16, 120);
    const vineMat1 = new THREE.MeshBasicMaterial({
      color: 0x52b788,
      transparent: true,
      opacity: 0.45,
    });
    this.vineMesh1 = new THREE.Mesh(vineGeo1, vineMat1);
    this.vineMesh1.rotation.x = Math.PI * 0.32;
    this.vineMesh1.rotation.y = Math.PI * 0.2;
    this.scene.add(this.vineMesh1);

    const vineGeo2 = new THREE.TorusGeometry(4.2, 0.012, 16, 140);
    const vineMat2 = new THREE.MeshBasicMaterial({
      color: 0xe5a02e,
      transparent: true,
      opacity: 0.35,
    });
    this.vineMesh2 = new THREE.Mesh(vineGeo2, vineMat2);
    this.vineMesh2.rotation.x = -Math.PI * 0.28;
    this.vineMesh2.rotation.z = Math.PI * 0.25;
    this.scene.add(this.vineMesh2);
  }

  private createPollenField() {
    const particleCount = this.isMobile ? 3000 : 10000;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    const palette = [
      new THREE.Color('#e5a02e'),
      new THREE.Color('#52b788'),
      new THREE.Color('#74c69d'),
      new THREE.Color('#f4c2b8'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.5 + Math.pow(Math.random(), 1.6) * 30.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1) * 0.8 + (Math.PI * 0.1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.65;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      scales[i] = Math.random() * 2.2 + 0.7;
      speeds[i] = Math.random() * 0.8 + 0.3;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const maxDpr = this.isMobile ? 1.5 : 2.0;
    this.pollenMaterial = new THREE.ShaderMaterial({
      vertexShader: pollenVertexShader,
      fragmentShader: pollenFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: Math.min(window.devicePixelRatio, maxDpr) },
        uScroll: { value: 0 },
        uScrollSpeed: { value: 0 },
        uWind: { value: new THREE.Vector2(0, 0) },
      },
      transparent: true,
      depthWrite: false,
    });

    this.pollenSystem = new THREE.Points(geometry, this.pollenMaterial);
    this.scene.add(this.pollenSystem);
  }

  private setupEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.initScene();
      this.createFlora();
      this.createBotanicalTendrils();
      this.createPollenField();
      this.animate();
    });
  }

  private onScroll = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScroll = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  };

  private onPointerMove = (e: PointerEvent) => {
    this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  };

  private onResize = () => {
    if (!this.renderer || !this.camera) return;

    this.isMobile = window.innerWidth < 768;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.fov = this.isMobile ? 55 : 45;
    this.camera.updateProjectionMatrix();

    const maxDpr = this.isMobile ? 1.5 : 2.0;
    const dpr = Math.min(window.devicePixelRatio, maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);

    if (this.pollenMaterial) {
      this.pollenMaterial.uniforms.uDpr.value = dpr;
    }
    this.onScroll();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    } else {
      if (!this.animationFrameId) {
        this.clock.start();
        this.animate();
      }
    }
  };

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const timeMultiplier = this.isReducedMotion ? 0.2 : 1.0;
    const elapsedTime = this.clock.getElapsedTime() * timeMultiplier;

    // Smooth Scroll Lerp & Velocity Tracking
    const scrollLerp = this.isReducedMotion ? 1.0 : 0.06;
    this.scrollProgress += (this.targetScroll - this.scrollProgress) * scrollLerp;
    this.scrollVelocity = Math.abs(this.scrollProgress - this.lastScrollProgress) * 20.0;
    this.lastScrollProgress = this.scrollProgress;

    // Calculate Bloom Factor: 0 at top, blooms to 1.0 as you reach Stage 2 & 3
    const bloomFactor = Math.min(1.0, this.scrollProgress * 1.35);

    // Smooth mouse/breeze lerp
    const mouseLerp = this.isReducedMotion ? 0 : 0.04;
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * mouseLerp;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * mouseLerp;

    this.wind.x = this.mouse.x * 0.4 + Math.sin(elapsedTime * 0.5) * 0.15;
    this.wind.y = this.mouse.y * 0.3 + Math.cos(elapsedTime * 0.4) * 0.12;

    // Update Shaders
    if (this.floraMaterial) {
      this.floraMaterial.uniforms.uTime.value = elapsedTime;
      this.floraMaterial.uniforms.uBloom.value = bloomFactor;
      this.floraMaterial.uniforms.uScroll.value = this.scrollProgress;
      this.floraMaterial.uniforms.uWind.value.set(this.wind.x, this.wind.y);
    }

    if (this.pollenMaterial) {
      this.pollenMaterial.uniforms.uTime.value = elapsedTime;
      this.pollenMaterial.uniforms.uScroll.value = this.scrollProgress;
      this.pollenMaterial.uniforms.uScrollSpeed.value = this.scrollVelocity;
      this.pollenMaterial.uniforms.uWind.value.set(this.wind.x, this.wind.y);
    }

    // Organic Rotation with scroll torque
    const scrollSpin = this.scrollProgress * Math.PI * 1.2;
    if (this.floraMesh) {
      this.floraMesh.rotation.y = elapsedTime * 0.09 + scrollSpin;
      this.floraMesh.rotation.x = Math.sin(elapsedTime * 0.06) * 0.12 + this.scrollProgress * 0.4;
      this.floraMesh.rotation.z = Math.cos(elapsedTime * 0.05) * 0.1;
    }

    if (this.vineMesh1) {
      this.vineMesh1.rotation.z = elapsedTime * 0.14 - scrollSpin * 0.8;
      this.vineMesh1.rotation.y = Math.sin(elapsedTime * 0.08) * 0.2 + Math.PI * 0.2;
    }

    if (this.vineMesh2) {
      this.vineMesh2.rotation.z = -elapsedTime * 0.11 + scrollSpin * 0.6;
      this.vineMesh2.rotation.x = Math.cos(elapsedTime * 0.09) * 0.2 - Math.PI * 0.28;
    }

    // Scroll-driven Dynamic Camera Flight
    if (!this.isReducedMotion) {
      // Stage 1 (0): (0, 0, 15)
      // Stage 2 (0.5): (isMobile ? 0 : 2.8, 0.5, 10.2)
      // Stage 3 (1.0): (0, 2.4, 11.5)
      const p = this.scrollProgress;
      let targetCamX = 0;
      let targetCamY = 0;
      let targetCamZ = 15;
      let targetLookX = 0;
      let targetLookY = 0;

      if (p <= 0.5) {
        const t = p / 0.5; // 0 to 1
        const easedT = t * t * (3 - 2 * t);
        targetCamX = (this.isMobile ? 0 : 2.8) * easedT;
        targetCamY = 0.5 * easedT;
        targetCamZ = 15 - 4.8 * easedT;
        targetLookX = (this.isMobile ? 0 : 1.0) * easedT;
      } else {
        const t = (p - 0.5) / 0.5; // 0 to 1
        const easedT = t * t * (3 - 2 * t);
        targetCamX = (this.isMobile ? 0 : 2.8) * (1 - easedT);
        targetCamY = 0.5 + 1.9 * easedT;
        targetCamZ = 10.2 + 1.3 * easedT;
        targetLookX = (this.isMobile ? 0 : 1.0) * (1 - easedT);
        targetLookY = 0.2 * easedT;
      }

      // Add gentle cursor parallax to camera
      targetCamX += this.mouse.x * 1.5;
      targetCamY += this.mouse.y * 1.0;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.05;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.05;
      this.camera.lookAt(targetLookX, targetLookY, 0);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.scene.clear();
    this.renderer.dispose();
  }
}

export function initWebGLScene(): WebGLBackground | null {
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  if (!canvas) return null;

  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      document.documentElement.classList.add('no-webgl');
      return null;
    }

    return new WebGLBackground(canvas);
  } catch (error) {
    console.warn('WebGL initialization failed, falling back to CSS garden gradient.', error);
    document.documentElement.classList.add('no-webgl');
    return null;
  }
}
