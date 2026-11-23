// M0 globe test, part 2: a standalone three.js water and sky scene on its own canvas,
// used to test the crossfade into the Mapbox globe. This is a rough first pass of the
// Genesis 1:2-5 opening (dark water, then light), not the finished M1 scene.

import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;

  // Sum of a few travelling waves. Returns height; fills the slope for the normal.
  float wave(vec2 p, vec2 dir, float freq, float speed, float amp, inout vec2 slope) {
    float phase = dot(p, dir) * freq + uTime * speed;
    slope += dir * (freq * amp * cos(phase));
    return amp * sin(phase);
  }

  void main() {
    vec3 pos = position;
    vec2 slope = vec2(0.0);
    float h = 0.0;
    h += wave(pos.xz, normalize(vec2(1.0, 0.3)), 0.08, 0.6, 1.6, slope);
    h += wave(pos.xz, normalize(vec2(-0.4, 1.0)), 0.13, 0.8, 0.9, slope);
    h += wave(pos.xz, normalize(vec2(0.7, -0.6)), 0.27, 1.1, 0.4, slope);
    h += wave(pos.xz, normalize(vec2(-0.9, -0.2)), 0.55, 1.7, 0.15, slope);
    pos.y += h;
    vNormal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uLight;      // 0 = darkness, 1 = full light
  uniform vec3 uSkyDark;
  uniform vec3 uSkyLight;
  uniform vec3 uCamera;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    vec3 view = normalize(uCamera - vWorld);
    float fresnel = pow(1.0 - max(dot(vNormal, view), 0.0), 3.0);
    vec3 sky = mix(uSkyDark, uSkyLight, uLight);
    vec3 deep = mix(vec3(0.004, 0.006, 0.012), vec3(0.01, 0.07, 0.12), uLight);
    vec3 color = mix(deep, sky, fresnel);

    // A soft sheen from a light with no visible source (there is no sun until day 4).
    vec3 lightDir = normalize(vec3(0.2, 0.55, -1.0));
    float sheen = pow(max(dot(reflect(-lightDir, vNormal), view), 0.0), 60.0);
    color += vec3(1.0, 0.95, 0.85) * sheen * uLight * 0.9;

    // Fade to the sky colour with distance so the horizon is seamless.
    float dist = length(uCamera - vWorld);
    float haze = smoothstep(120.0, 900.0, dist);
    gl_FragColor = vec4(mix(color, sky, haze), 1.0);
  }
`;

export class WaterScene {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;
  private skyDark = new THREE.Color(0x010204);
  private skyLight = new THREE.Color(0xb9cfe6);
  private background = new THREE.Color();
  private frame = 0;
  private running = false;
  private start = performance.now();
  private light = 0; // current value
  private lightTarget = 0; // where it is gliding to

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.position.set(0, 6, 0);
    this.camera.lookAt(0, 4, -100);

    this.geometry = new THREE.PlaneGeometry(2000, 2000, 256, 256);
    this.geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLight: { value: 0 },
        uSkyDark: { value: this.skyDark },
        uSkyLight: { value: this.skyLight },
        uCamera: { value: this.camera.position },
      },
    });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
    this.resize();
  }

  resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** 0 = darkness on the face of the deep, 1 = light. The scene glides toward the target. */
  setLight(target: number) {
    this.lightTarget = THREE.MathUtils.clamp(target, 0, 1);
  }

  play() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Glide toward the target each frame: smooth start and stop, no jumps.
      this.light += (this.lightTarget - this.light) * (1 - Math.exp(-dt * 0.6));
      this.material.uniforms.uTime.value = (now - this.start) / 1000;
      this.material.uniforms.uLight.value = this.light;
      this.background.copy(this.skyDark).lerp(this.skyLight, this.light);
      this.scene.background = this.background;
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
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
