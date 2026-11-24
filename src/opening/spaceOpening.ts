import * as THREE from "three";

// The opening, seen from far off: the place in space where the globe will be, before there is a globe.
//
//   Genesis 1:1   only space
//   Genesis 1:2   the deep: a dark body of water, without form, that can be swiped and sloshes
//   Genesis 1:3-5 light on the waters, then divided from the darkness
//   Genesis 1:6-8 the firmament: the mist lifts clear of the waters, the edge sharpens, a sky forms
//
// The water sits exactly where the Mapbox globe sits (same centre, same size), so when the story
// reaches day 3 this picture fades and the globe is already there underneath, still under water.
//
// One full-screen shader. Every value glides toward its target each frame; nothing is re-aimed.
// The viewpoint is illustration: the text gives none.

export interface SpaceTargets {
  /** 0 = nothing there, 1 = the deep. */
  water: number;
  /** 0 = darkness, 1 = light. */
  light: number;
  /** 0 = light all over, 1 = light divided from darkness (a day side and a night side). */
  divide: number;
  /** 0 = no firmament (mist to the edge), 1 = the firmament in place (clear edge, sky, cloud above). */
  vault: number;
  /** How far round the light has gone, in turns. Raising it by one is one evening and morning. */
  turn: number;
}

const RIPPLES = 8;

const fragment = /* glsl */ `
  precision highp float;
  uniform vec2 uCenter;
  uniform float uRadius, uTime, uWater, uLight, uDivide, uVault, uTurn;
  uniform vec4 uRip[${RIPPLES}];

  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

  // The height of the water at a point on the sphere: slow swell, small chop, and the rings the hand has set going.
  float height(vec3 s) {
    float h = (fbm(s * 4.0 + vec3(uTime * 0.06, 0.0, uTime * 0.045)) - 0.5) * 1.1;
    h += (noise(s * 15.0 - vec3(0.0, uTime * 0.2, uTime * 0.12)) - 0.5) * 0.32;
    for (int i = 0; i < ${RIPPLES}; i++) {
      float age = uTime - uRip[i].w;
      if (age < 0.0 || age > 7.0) continue;
      float d = acos(clamp(dot(s, uRip[i].xyz), -1.0, 1.0));
      float front = age * 0.2;
      float band = exp(-pow((d - front) * 4.5, 2.0));
      h += sin((d - front) * 34.0) * band * exp(-age * 0.55) * smoothstep(0.0, 0.08, age) * 2.2;
    }
    return h;
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - uCenter) / uRadius;
    float r = length(p);
    float a = uTurn * 6.2831853;
    vec3 sun = normalize(vec3(-0.86 * cos(a) + 0.40 * sin(a), 0.30, 0.86 * sin(a) + 0.40 * cos(a)));
    vec3 col = vec3(0.0);

    // The sky that the firmament makes: a thin glow outside the edge, on the lit side.
    float edgeDay = mix(1.0, smoothstep(-0.35, 0.5, dot(normalize(vec3(p, 0.15)), sun)), uDivide);
    col += vec3(0.30, 0.56, 1.0) * uVault * uLight * edgeDay * exp(-max(r - 1.0, 0.0) * 24.0) * step(1.0, r) * 0.85;

    // Without a firmament the waters have no clean edge: they trail off into mist.
    float soft = 1.0 - uVault;
    float body = smoothstep(1.0 + 0.07 * soft + 0.003, 1.0 - 0.13 * soft - 0.003, r);
    if (r < 1.08) {
      float z = sqrt(max(1.0 - min(r, 1.0) * min(r, 1.0), 0.0));
      vec3 n = normalize(vec3(p, z + 0.0001));
      vec3 s = n; // the water does not turn; the light does
      vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.0001)));
      vec3 t2 = cross(n, t1);
      float e = 0.014;
      float h0 = height(s);
      vec3 bump = (t1 * (height(normalize(s + t1 * e)) - h0) + t2 * (height(normalize(s + t2 * e)) - h0)) / e;
      vec3 nn = normalize(n - bump * 0.024 * (0.25 + 0.75 * z));
      vec3 ns = normalize(mix(n, nn, 0.3));

      float lam = dot(nn, sun);
      float wrap = mix(0.55 + 0.45 * lam, smoothstep(-0.14, 0.32, lam), uDivide);
      vec3 view = vec3(0.0, 0.0, 1.0);
      vec3 deep = mix(vec3(0.022, 0.075, 0.130), vec3(0.020, 0.200, 0.360), uVault * 0.85);
      vec3 water = deep * (0.9 + h0 * 0.35);
      vec3 lit = water * (0.10 + 2.3 * wrap * uLight);
      // Glints: from the light when there is light; before it, only a faint sheen so the deep can be seen moving.
      lit += vec3(1.0, 0.96, 0.86) * pow(max(dot(reflect(-sun, ns), view), 0.0), 70.0) * uLight * wrap * 0.5;
      lit += vec3(0.50, 0.62, 0.80) * pow(max(dot(nn, normalize(vec3(0.25, 0.45, 1.0))), 0.0), 26.0) * 0.13 * (1.0 - uLight);
      lit += vec3(0.16, 0.24, 0.36) * pow(1.0 - z, 2.5) * (0.10 + 0.5 * uLight * wrap);

      // Mist over the face of the deep, until the firmament lifts it clear as the waters above.
      float fog = smoothstep(0.38, 0.78, fbm(s * 3.2 + vec3(uTime * 0.016, uTime * 0.008, 0.0)));
      vec3 fogCol = vec3(0.72, 0.78, 0.86) * (0.06 + 1.05 * wrap * uLight);
      lit = mix(lit, fogCol, fog * soft * 0.62);
      float cloud = smoothstep(0.50, 0.74, fbm(s * 3.4 + vec3(uTime * 0.012, 0.0, uTime * 0.006) + 9.0));
      lit = mix(lit * (1.0 - cloud * 0.25 * uVault), vec3(1.0) * (0.08 + 1.0 * wrap * uLight), cloud * uVault * 0.8);
      // The sky seen edge-on, inside the limb.
      lit += vec3(0.28, 0.52, 1.0) * uVault * uLight * wrap * pow(1.0 - z, 3.0) * 0.7;

      col = mix(col, lit, body);
    }
    gl_FragColor = vec4(col * uWater, 1.0);
  }
`;

export class SpaceOpening {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private uniforms = {
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 100 },
    uTime: { value: 0 },
    uWater: { value: 0 },
    uLight: { value: 0 },
    uDivide: { value: 0 },
    uVault: { value: 0 },
    uTurn: { value: 0 },
    uRip: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, 1, -100)) },
  };
  private now: SpaceTargets = { water: 0, light: 0, divide: 0, vault: 0, turn: 0 };
  private want: SpaceTargets = { ...this.now };
  /** True while the hand has moved the light or the sky: the picture then follows the hand more closely. */
  private byHand = false;
  private raf = 0;
  private last = 0;
  private nextRipple = 0;
  private lastRipple = 0;
  private down = false;
  private lastX = 0;
  private lastY = 0;
  /**
   * What a drag does besides setting rings going on the water:
   *   swipe  nothing more
   *   light  a sideways drag carries the light round (evening and morning, by hand)
   *   vault  a drag up lifts the mist off the waters, and a drag down lets it settle again
   */
  mode: "swipe" | "light" | "vault" = "swipe";
  /** Called when the viewer does what the current mode offers. */
  onTouch: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: "void main() { gl_Position = vec4(position, 1.0); }", fragmentShader: fragment, depthTest: false }));
    this.scene.add(quad);
    this.resize();
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
  }

  /** The waters sit where the globe sits: the same sum the globe stage uses for a whole-globe view. */
  resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    // A phone has plenty of pixels; this shader does not need them all.
    const ratio = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.25);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    const lift = h * 0.26;
    const diameter = 0.86 * Math.min(w, h - lift);
    this.uniforms.uRadius.value = (diameter / 2) * ratio;
    this.uniforms.uCenter.value.set((w / 2) * ratio, (h - (h - lift) / 2) * ratio);
  };

  setTargets(t: SpaceTargets) {
    this.want = { ...t };
    this.byHand = false;
  }

  snapTo(t: SpaceTargets) {
    this.want = { ...t };
    this.now = { ...t };
  }

  private onDown = (e: PointerEvent) => {
    this.down = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.ripple(e);
  };
  private onUp = () => {
    this.down = false;
  };
  private onMove = (e: PointerEvent) => {
    if (!this.down) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const across = (this.uniforms.uRadius.value / this.renderer.getPixelRatio()) * 2; // the width of the waters on screen
    if (this.mode === "light" && Math.abs(dx) > 0) {
      this.want.turn -= dx / (across * 1.6);
      this.byHand = true;
      this.onTouch?.();
    }
    if (this.mode === "vault" && Math.abs(dy) > 0) {
      this.want.vault = Math.max(0, Math.min(1, this.want.vault - dy / (across * 0.7)));
      this.byHand = true;
      this.onTouch?.();
    }
    this.ripple(e);
  };

  /** A swipe sets a ring going from the point on the water under the hand. */
  private ripple(e: PointerEvent) {
    const time = this.uniforms.uTime.value;
    if (time - this.lastRipple < 0.09 || this.now.water < 0.4) return;
    const box = this.canvas.getBoundingClientRect();
    const ratio = this.renderer.getPixelRatio();
    const x = ((e.clientX - box.left) * ratio - this.uniforms.uCenter.value.x) / this.uniforms.uRadius.value;
    const y = ((box.height - (e.clientY - box.top)) * ratio - this.uniforms.uCenter.value.y) / this.uniforms.uRadius.value;
    const r2 = x * x + y * y;
    if (r2 >= 1) return;
    this.lastRipple = time;
    this.uniforms.uRip.value[this.nextRipple].set(x, y, Math.sqrt(1 - r2), time);
    this.nextRipple = (this.nextRipple + 1) % RIPPLES;
    if (this.mode === "swipe") this.onTouch?.();
  }

  private frame = (clock: number) => {
    const dt = Math.min(0.05, (clock - this.last) / 1000 || 0);
    this.last = clock;
    this.step(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    const k = 1 - Math.exp(-dt * 0.7);
    this.now.water += (this.want.water - this.now.water) * k;
    this.now.light += (this.want.light - this.now.light) * k;
    this.now.divide += (this.want.divide - this.now.divide) * k;
    this.now.vault += (this.want.vault - this.now.vault) * (1 - Math.exp(-dt * (this.byHand ? 3.5 : 0.45)));
    this.now.turn += (this.want.turn - this.now.turn) * (1 - Math.exp(-dt * (this.byHand ? 5 : 0.38)));
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uWater.value = this.now.water;
    u.uLight.value = this.now.light;
    u.uDivide.value = this.now.divide;
    u.uVault.value = this.now.vault;
    u.uTurn.value = this.now.turn;
    this.renderer.render(this.scene, this.camera);
  }

  /** For checks only: run the picture forward without waiting. */
  debugAdvance(seconds: number) {
    for (let i = 0; i < seconds * 20; i++) this.step(0.05);
  }

  play() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.pause();
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.renderer.dispose();
  }
}
