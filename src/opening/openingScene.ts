// The opening of Genesis Map (Gen 1:1-8), seen from the surface of the waters.
// Plain three.js on its own canvas: no globe, no land, and no sun (the sun arrives on day 4).
//
// Three numbers drive everything, and each one glides toward its target every frame:
//   light  0 = darkness, 1 = full light           (Gen 1:3)
//   haze   1 = no horizon, water and sky are one; 0 = the expanse is open   (Gen 1:6-8)
//   wind   scale of the waves                     (Gen 1:2, the Spirit moving on the waters)

import * as THREE from "three";

export interface OpeningTargets {
  light: number;
  haze: number;
  wind: number;
}

// Shared by the water and the sky so the horizon always matches.
const common = /* glsl */ `
  uniform float uTime;
  uniform float uLight;
  uniform float uHaze;
  uniform float uWind;
  uniform vec3 uCamera;

  vec3 horizonColor() {
    return mix(vec3(0.0, 0.002, 0.005), vec3(0.82, 0.87, 0.93), uLight);
  }

  vec3 skyColor(vec3 dir) {
    vec3 horizon = horizonColor();
    vec3 clearZenith = mix(vec3(0.0, 0.002, 0.005), vec3(0.20, 0.42, 0.78), uLight);
    vec3 zenith = mix(clearZenith, horizon, uHaze);
    float t = pow(1.0 - clamp(dir.y, 0.0, 1.0), mix(5.0, 1.5, uHaze));
    return mix(zenith, horizon, t);
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

  // Fine ripples: shading only, so the surface never looks faceted.
  void ripples(vec2 p, inout float h, inout vec2 slope) {
    addWave(p, vec2(0.54, 0.84), 6.1, 0.050, 1.7, h, slope);
    addWave(p, vec2(-0.81, 0.59), 3.3, 0.028, 2.2, h, slope);
    addWave(p, vec2(0.89, -0.45), 1.7, 0.014, 2.9, h, slope);
    addWave(p, vec2(-0.22, -0.97), 0.9, 0.007, 3.6, h, slope);
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
    float dist = length(uCamera - vWorld);

    // The normal is worked out per pixel from the same waves, plus ripples that fade with distance.
    float h = 0.0;
    vec2 slope = vec2(0.0);
    swell(vWorld.xz, h, slope);
    float hr = 0.0;
    vec2 rippleSlope = vec2(0.0);
    ripples(vWorld.xz, hr, rippleSlope);
    slope += rippleSlope * (1.0 - smoothstep(30.0, 220.0, dist));
    vec3 normal = normalize(vec3(-slope.x * uWind, 1.0, -slope.y * uWind));

    vec3 view = normalize(uCamera - vWorld);
    vec3 reflected = reflect(-view, normal);
    reflected.y = abs(reflected.y);

    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(normal, view), 0.0), 5.0);
    vec3 deep = mix(vec3(0.0, 0.003, 0.006), vec3(0.01, 0.09, 0.13), uLight);
    vec3 color = mix(deep, skyColor(reflected), fresnel);

    // Mist: thick when haze is high, so the water melts into the sky with no horizon line.
    float density = mix(0.0012, 0.020, uHaze);
    float fog = 1.0 - exp(-dist * density);
    gl_FragColor = vec4(mix(color, horizonColor(), fog), 1.0);
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

export class OpeningScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
  private uniforms = {
    uTime: { value: 0 },
    uLight: { value: 0 },
    uHaze: { value: 1 },
    uWind: { value: 1 },
    uCamera: { value: new THREE.Vector3(0, 3.2, 0) },
  };
  private disposables: { dispose(): void }[] = [];
  private current: OpeningTargets = { light: 0, haze: 1, wind: 1 };
  private target: OpeningTargets = { light: 0, haze: 1, wind: 1 };
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

    const skyGeometry = new THREE.SphereGeometry(3000, 32, 16);
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

  /** Where the scene should glide to. Changes are never applied instantly. */
  setTargets(t: OpeningTargets) {
    this.target = { ...t };
  }

  /** Jump straight to a state, with no glide. Used only for the very first frame. */
  snapTo(t: OpeningTargets) {
    this.target = { ...t };
    this.current = { ...t };
  }

  play() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const time = (now - this.started) / 1000;

      // Glide each value toward its target: smooth start, smooth stop, no jumps.
      const ease = 1 - Math.exp(-dt * 0.45);
      this.current.light += (this.target.light - this.current.light) * ease;
      this.current.haze += (this.target.haze - this.current.haze) * ease;
      this.current.wind += (this.target.wind - this.current.wind) * ease;

      this.uniforms.uTime.value = time;
      this.uniforms.uLight.value = this.current.light;
      this.uniforms.uHaze.value = this.current.haze;
      this.uniforms.uWind.value = this.current.wind;

      // A slow drift, as if floating: continuous, never re-aimed.
      const cam = this.uniforms.uCamera.value;
      cam.set(0, 3.2 + Math.sin(time * 0.45) * 0.3 * this.current.wind, 0);
      this.camera.position.copy(cam);
      this.camera.lookAt(Math.sin(time * 0.11) * 6, -7, -100);
      this.camera.rotation.z = Math.sin(time * 0.31) * 0.012 * this.current.wind;

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
