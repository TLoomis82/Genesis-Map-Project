// The opening of Genesis Map (Gen 1:1-8), seen from the surface of the waters.
// Plain three.js on its own canvas: no globe, no land, and no sun (the sun arrives on day 4).
//
// A handful of numbers drive everything, and each one glides toward its target every frame:
//   light   0 = darkness, 1 = full light                                   (Gen 1:3)
//   haze    1 = mist everywhere, water and sky are one; 0 = clear air      (Gen 1:2, 1:6)
//   wind    scale of the waves                                             (Gen 1:2)
//   divide  0 = light everywhere; 1 = half the sky light, half dark        (Gen 1:4)
//   vault   how far the expanse has opened, from the horizon (0) to overhead (1.2).
//           Where it is open you see clear air and, beyond it, the waters above   (Gen 1:6-8)
// A step can also ask for one sweep of the light/dark boundary across the sky:
// evening, then morning (Gen 1:5).

import * as THREE from "three";

export interface OpeningTargets {
  light: number;
  haze: number;
  wind: number;
  divide: number;
  vault: number;
}

export const VAULT_CLOSED = -0.05;
export const VAULT_OPEN = 1.2;

// Shared by the water and the sky so the two always agree.
const common = /* glsl */ `
  uniform float uTime;
  uniform float uLight;
  uniform float uHaze;
  uniform float uWind;
  uniform float uDivide;
  uniform float uDivideAngle;
  uniform float uVault;
  uniform vec3 uCamera;

  const vec3 DARK = vec3(0.0, 0.002, 0.005);

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // How much light reaches a given direction. With uDivide = 1, one half of the sky is dark.
  float localLight(vec3 dir) {
    vec2 d = normalize(dir.xz + vec2(0.00001));
    vec2 lit = vec2(cos(uDivideAngle), sin(uDivideAngle));
    float side = smoothstep(-0.35, 0.35, dot(d, lit));
    return uLight * mix(1.0, mix(0.04, 1.0, side), uDivide);
  }

  // The mist of day 1: slightly warm, because the light has no source yet.
  vec3 mistColor(float l) {
    return mix(DARK, mix(vec3(0.80, 0.87, 0.95), vec3(0.95, 0.92, 0.86), uHaze), l);
  }

  // 0 where the mist still hangs, 1 where the expanse has opened, by height above the horizon.
  float expanseOpen(float y) {
    return 1.0 - smoothstep(uVault - 0.10, uVault + 0.02, y);
  }

  // Colour at the horizon; also the colour distant water fades into.
  vec3 horizonColor(vec3 dir) {
    float l = localLight(dir);
    vec3 clearHorizon = mix(DARK, vec3(0.80, 0.87, 0.95), l);
    return mix(mistColor(l), clearHorizon, expanseOpen(0.0));
  }

  vec3 skyColor(vec3 dir) {
    float l = localLight(dir);
    float y = clamp(dir.y, 0.0, 1.0);

    // The expanse: clear air, pale at the horizon and deep overhead.
    vec3 clearHorizon = mix(DARK, vec3(0.80, 0.87, 0.95), l);
    vec3 vaultBlue = mix(DARK, vec3(0.08, 0.27, 0.62), l);

    // The waters above, seen through the vault: slow, shifting bands of light,
    // like looking up at the underside of a calm sea.
    vec2 q = dir.xz / max(y, 0.12);
    float w1 = vnoise(q * 1.7 + vec2(uTime * 0.030, uTime * 0.020));
    float w2 = vnoise(q * 3.3 + vec2(-uTime * 0.025, uTime * 0.010) + 7.3);
    float r1 = 1.0 - abs(2.0 * w1 - 1.0);
    float r2 = 1.0 - abs(2.0 * w2 - 1.0);
    float shimmer = pow(r1 * r2, 2.0) * smoothstep(0.04, 0.40, y);
    vec3 above = vaultBlue + vec3(0.40, 0.55, 0.70) * shimmer * 0.6 * l;

    vec3 clear = mix(above, clearHorizon, pow(1.0 - y, 4.0));
    return mix(mistColor(l), clear, expanseOpen(y));
  }

  void addWave(vec2 p, vec2 dir, float len, float amp, float speed, inout float h, inout vec2 slope) {
    float k = 6.2831853 / len;
    float phase = dot(p, dir) * k + uTime * speed;
    h += amp * sin(phase);
    slope += dir * (k * amp * cos(phase));
  }

  // Long swells: these move the mesh.
  void swell(vec2 p, inout float h, inout vec2 slope) {
    addWave(p, vec2(0.96, 0.28), 83.0, 1.10, 0.55, h, slope);
    addWave(p, vec2(-0.37, 0.93), 47.0, 0.62, 0.70, h, slope);
    addWave(p, vec2(0.76, -0.65), 23.0, 0.30, 0.95, h, slope);
    addWave(p, vec2(-0.98, -0.20), 11.0, 0.13, 1.30, h, slope);
  }

  // Small surface texture: irregular, so it never forms stripes. Shading only.
  float chop(vec2 p) {
    return vnoise(p * 0.35 + vec2(uTime * 0.22, uTime * 0.10))
      + 0.45 * vnoise(p * 0.90 + vec2(-uTime * 0.30, uTime * 0.18))
      + 0.20 * vnoise(p * 2.30 + vec2(uTime * 0.35, -uTime * 0.40));
  }

  vec2 chopSlope(vec2 p) {
    float e = 0.15;
    return vec2(
      chop(p + vec2(e, 0.0)) - chop(p - vec2(e, 0.0)),
      chop(p + vec2(0.0, e)) - chop(p - vec2(0.0, e))
    ) / (2.0 * e);
  }
`;

const waterVertex = /* glsl */ `
  ${common}
  varying vec3 vWorld;

  void main() {
    vec3 pos = position;
    float h = 0.0;
    vec2 slope = vec2(0.0);
    swell(pos.xz, h, slope);
    pos.y += h * uWind;
    vWorld = pos;
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragment = /* glsl */ `
  ${common}
  varying vec3 vWorld;

  void main() {
    vec3 toPoint = vWorld - uCamera;
    float dist = length(toPoint);
    vec3 view = -toPoint / dist;

    // The normal is worked out per pixel: swells plus small chop that fades with distance.
    float h = 0.0;
    vec2 slope = vec2(0.0);
    swell(vWorld.xz, h, slope);
    slope += chopSlope(vWorld.xz) * 0.55 * (1.0 - smoothstep(50.0, 350.0, dist));
    vec3 normal = normalize(vec3(-slope.x * uWind, 1.0, -slope.y * uWind));

    vec3 reflected = reflect(-view, normal);
    reflected.y = abs(reflected.y);

    float l = localLight(-view);
    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(normal, view), 0.0), 5.0);
    vec3 deep = mix(vec3(0.0, 0.003, 0.006), vec3(0.01, 0.09, 0.13), l);
    vec3 color = mix(deep, skyColor(reflected), fresnel);

    // Mist: thick when haze is high, so the water melts into the sky with no horizon line.
    float density = mix(0.0012, 0.020, uHaze);
    float fog = 1.0 - exp(-dist * density);
    gl_FragColor = vec4(mix(color, horizonColor(-view), fog), 1.0);
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  ${common}
  varying vec3 vDir;
  void main() {
    gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
  }
`;

/** A square grid stretched so cells are tiny near the camera and large far away. */
function buildWaterGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(2, 2, 220, 220);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getZ(i);
    const r = Math.max(Math.abs(u), Math.abs(v));
    const stretch = r > 0 ? (Math.pow(r, 3) * 1500) / r : 0;
    pos.setXYZ(i, u * stretch, 0, v * stretch);
  }
  pos.needsUpdate = true;
  return geometry;
}

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// With the camera looking toward -z: at angle 0 the boundary runs straight ahead
// (dark on the left, light on the right); at PI/2 the view ahead is dark; at 3PI/2 it is light.
const SWEEP_FROM = 0;
const SWEEP_TO = Math.PI * 1.5;

export class OpeningScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
  private uniforms = {
    uTime: { value: 0 },
    uLight: { value: 0 },
    uHaze: { value: 1 },
    uWind: { value: 1 },
    uDivide: { value: 0 },
    uDivideAngle: { value: SWEEP_FROM },
    uVault: { value: VAULT_CLOSED },
    uCamera: { value: new THREE.Vector3(0, 3.2, 0) },
  };
  private disposables: { dispose(): void }[] = [];
  private current: OpeningTargets = { light: 0, haze: 1, wind: 1, divide: 0, vault: VAULT_CLOSED };
  private target: OpeningTargets = { ...this.current };
  private angle = SWEEP_FROM;
  private sweep: { start: number; seconds: number } | null = null;
  private time = 0;
  private running = false;
  private frame = 0;
  private started = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const waterGeometry = buildWaterGeometry();
    const waterMaterial = new THREE.ShaderMaterial({ vertexShader: waterVertex, fragmentShader: waterFragment, uniforms: this.uniforms });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.frustumCulled = false;

    const skyGeometry = new THREE.SphereGeometry(3000, 48, 24);
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.frustumCulled = false;
    sky.renderOrder = -1;

    this.scene.add(sky, water);
    this.disposables.push(waterGeometry, waterMaterial, skyGeometry, skyMaterial);
    this.resize();
  }

  resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /**
   * Where the scene should glide to. Changes are never applied instantly.
   * sweepSeconds asks for one pass of the light/dark boundary across the sky
   * (evening, then morning), after which the whole sky is light.
   */
  setTargets(t: OpeningTargets, sweepSeconds?: number) {
    this.target = { ...t };
    if (sweepSeconds) {
      this.angle = SWEEP_FROM;
      this.sweep = { start: this.time, seconds: sweepSeconds };
    } else {
      this.sweep = null;
      // Outside a sweep the boundary rests straight ahead. Only reset it while it cannot be seen.
      if (this.current.divide < 0.05) this.angle = SWEEP_FROM;
    }
  }

  /** Jump straight to a state, with no glide. Used only for the very first frame. */
  snapTo(t: OpeningTargets) {
    this.target = { ...t };
    this.current = { ...t };
    this.sweep = null;
    this.angle = SWEEP_FROM;
  }

  play() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      this.time = (now - this.started) / 1000;
      const time = this.time;

      // One eased pass of the boundary; when it ends, the sky becomes fully light.
      if (this.sweep) {
        const t = Math.min((time - this.sweep.start) / this.sweep.seconds, 1);
        this.angle = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * smoother(t);
        if (t >= 1) {
          this.sweep = null;
          this.target.divide = 0;
        }
      }

      // Glide each value toward its target: smooth start, smooth stop, no jumps.
      const ease = 1 - Math.exp(-dt * 0.45);
      const c = this.current;
      const g = this.target;
      c.light += (g.light - c.light) * ease;
      c.haze += (g.haze - c.haze) * ease;
      c.wind += (g.wind - c.wind) * ease;
      c.divide += (g.divide - c.divide) * ease;
      c.vault += (g.vault - c.vault) * ease;

      const u = this.uniforms;
      u.uTime.value = time;
      u.uLight.value = c.light;
      u.uHaze.value = c.haze;
      u.uWind.value = c.wind;
      u.uDivide.value = c.divide;
      u.uDivideAngle.value = this.angle;
      u.uVault.value = c.vault;

      // A slow drift, as if floating: continuous, never re-aimed. The view tilts up a little
      // as the expanse opens, so the vault is in frame.
      const cam = u.uCamera.value;
      cam.set(0, 3.2 + Math.sin(time * 0.45) * 0.3 * c.wind, 0);
      this.camera.position.copy(cam);
      const opened = THREE.MathUtils.clamp((c.vault - VAULT_CLOSED) / (VAULT_OPEN - VAULT_CLOSED), 0, 1);
      this.camera.lookAt(Math.sin(time * 0.11) * 6, -7 + 26 * opened, -100);
      this.camera.rotation.z = Math.sin(time * 0.31) * 0.012 * c.wind;

      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.pause();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}
