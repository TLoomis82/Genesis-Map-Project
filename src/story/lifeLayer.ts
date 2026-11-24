// Life on the globe for days 5, 6 and 7: flocks over land and sea, shoals in the water, great whales,
// herds on the land, and humankind as two lights. Drawn on a plain canvas laid over the globe; each
// creature lives at a longitude and latitude and is put on the screen by whatever is showing the globe.
//
// Everything here is illustration and far from to scale: a flock that can be seen from this far off
// would be the size of a country. The text gives the kinds and the realms (waters, the open firmament,
// the earth), not places or numbers. Humankind's two lights sit in the middle of the view, which is a
// layout choice and not a location.

export interface Projector {
  /** Where a point on the globe falls on the canvas, and whether it is on the near side. */
  project(lng: number, lat: number): { x: number; y: number; visible: boolean };
  /** The middle of the globe's disc on the canvas, and its radius. */
  disc(): { x: number; y: number; r: number };
}

/** What should be alive on the globe for the verse on screen. */
export interface LifeWant {
  flocks: number;
  shoals: number;
  whales: number;
  /** Herds of each kind: cattle, creeping things, beasts of the earth (Genesis 1:24). */
  herds: [number, number, number];
  people: boolean;
  /** Day 7: everything slows. */
  calm: boolean;
}

export const NO_LIFE: LifeWant = { flocks: 0, shoals: 0, whales: 0, herds: [0, 0, 0], people: false, calm: false };
export const KINDS = ["Cattle", "Creeping things", "Beasts of the earth"];
const KIND_COLOURS = ["#f6ead0", "#d9694d", "#f0b955"];

type Sort = "flock" | "shoal" | "whale" | "herd";
interface Group {
  sort: Sort;
  kind: number;
  lng: number;
  lat: number;
  heading: number;
  /** 0 to 1: fades in when it appears and out when it is no longer wanted. */
  shown: number;
  wanted: boolean;
  seed: number;
  trail: [number, number][];
  /** Whales: seconds until the next spout, and how far through the current one. */
  wait: number;
  spout: number;
}

const SPEED: Record<Sort, number> = { flock: 4.2, shoal: 1.3, whale: 0.7, herd: 1.5 }; // degrees a second
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export class Life {
  private ctx: CanvasRenderingContext2D;
  private groups: Group[] = [];
  private want: LifeWant = NO_LIFE;
  private land: Uint8Array | null = null;
  private landW = 0;
  private landH = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private made = 0;
  private people = 0;
  private pace = 1;
  /** Around where new creatures appear: the middle of the view. */
  home: [number, number] = [0, 0];

  constructor(
    private canvas: HTMLCanvasElement,
    private projector: Projector,
    heightsUrl: string,
  ) {
    this.ctx = canvas.getContext("2d")!;
    // The land, read once from the picture of its heights: where shoals may not go and herds may.
    const picture = new Image();
    picture.crossOrigin = "anonymous";
    picture.onload = () => {
      const small = document.createElement("canvas");
      small.width = this.landW = 720;
      small.height = this.landH = 360;
      const c = small.getContext("2d", { willReadFrequently: true })!;
      c.drawImage(picture, 0, 0, 720, 360);
      const data = c.getImageData(0, 0, 720, 360).data;
      this.land = new Uint8Array(720 * 360);
      for (let i = 0; i < this.land.length; i++) this.land[i] = data[i * 4] > 5 ? 1 : 0;
    };
    picture.src = heightsUrl;
  }

  isLand(lng: number, lat: number): boolean {
    if (!this.land) return false;
    const x = Math.floor((((lng + 180) % 360) + 360) % 360 / 360 * this.landW) % this.landW;
    const y = Math.max(0, Math.min(this.landH - 1, Math.floor(((90 - lat) / 180) * this.landH)));
    return this.land[y * this.landW + x] === 1;
  }

  set(want: LifeWant) {
    this.want = want;
  }

  /** A tap on the globe: a shoal where the sea was tapped, a flock or a herd where the land was. Returns what appeared. */
  tap(lng: number, lat: number, herdKind: number | null): Sort | null {
    const land = this.isLand(lng, lat);
    if (herdKind !== null && this.want.herds.some((n) => n > 0)) {
      if (!land) return null;
      this.add("herd", herdKind, lng, lat, true);
      return "herd";
    }
    if (this.want.flocks + this.want.shoals === 0) return null;
    const sort: Sort = land ? "flock" : "shoal";
    this.add(sort, 0, lng, lat, true);
    return sort;
  }

  private add(sort: Sort, kind: number, lng: number, lat: number, byHand = false) {
    this.made += 1;
    this.groups.push({ sort, kind, lng, lat, heading: rand(this.made) * Math.PI * 2, shown: 0, wanted: true, seed: this.made + (byHand ? 0.5 : 0), trail: [], wait: 2 + rand(this.made + 9) * 6, spout: 0 });
    // Keep the page light: the oldest of a sort gives way when there are far too many.
    const same = this.groups.filter((g) => g.sort === sort && g.wanted);
    if (same.length > 70) same[0].wanted = false;
  }

  /** A place for a new group near the middle of the view, in the right realm. */
  private somewhere(needLand: boolean | null): [number, number] {
    for (let tries = 0; tries < 40; tries++) {
      this.made += 1;
      const lng = this.home[0] + (rand(this.made) - 0.5) * 150;
      const lat = Math.max(-62, Math.min(62, this.home[1] + (rand(this.made + 0.3) - 0.5) * 110));
      if (needLand === null || !this.land || this.isLand(lng, lat) === needLand) return [lng, lat];
    }
    return [this.home[0], this.home[1]];
  }

  /** Bring the numbers of each sort toward what the verse asks for. Groups set by hand stay while their sort is wanted. */
  private settle() {
    const count = (sort: Sort, kind = 0) => this.groups.filter((g) => g.wanted && g.sort === sort && g.kind === kind && g.seed % 1 === 0).length;
    const fit = (sort: Sort, kind: number, wanted: number, needLand: boolean | null) => {
      let have = count(sort, kind);
      if (have < wanted && (needLand === null || this.land)) {
        const [lng, lat] = this.somewhere(needLand);
        this.add(sort, kind, lng, lat);
        have += 1;
      }
      if (have > wanted) {
        const extra = this.groups.find((g) => g.wanted && g.sort === sort && g.kind === kind && g.seed % 1 === 0);
        if (extra) extra.wanted = false;
      }
      if (wanted === 0) this.groups.forEach((g) => g.sort === sort && g.kind === kind && (g.wanted = false));
    };
    fit("flock", 0, this.want.flocks, null);
    fit("shoal", 0, this.want.shoals, false);
    fit("whale", 0, this.want.whales, false);
    for (let k = 0; k < 3; k++) fit("herd", k, this.want.herds[k], true);
  }

  private step(dt: number) {
    this.pace += ((this.want.calm ? 0.28 : 1) - this.pace) * (1 - Math.exp(-dt * 0.6));
    const d = dt * this.pace;
    this.time += d;
    this.settle();
    this.people += ((this.want.people ? 1 : 0) - this.people) * (1 - Math.exp(-dt * 0.8));
    for (const g of this.groups) {
      g.shown += ((g.wanted ? 1 : 0) - g.shown) * (1 - Math.exp(-dt * 1.4));
      // Wander: the heading drifts, and turns away from the wrong realm and from the poles.
      g.heading += (rand(g.seed + Math.floor(this.time * 0.7)) - 0.5) * 1.6 * d;
      const move = SPEED[g.sort] * d;
      const lat = g.lat + Math.cos(g.heading) * move;
      const lng = g.lng + (Math.sin(g.heading) * move) / Math.max(0.35, Math.cos((g.lat * Math.PI) / 180));
      const wrongRealm = g.sort !== "flock" && this.land !== null && this.isLand(lng, lat) !== (g.sort === "herd");
      if (wrongRealm || Math.abs(lat) > 66) g.heading += Math.PI * (0.55 + rand(g.seed + this.time) * 0.5);
      else {
        g.lat = lat;
        g.lng = lng;
      }
      if (g.sort === "herd") {
        const lastPoint = g.trail[g.trail.length - 1];
        if (!lastPoint || Math.hypot(lastPoint[0] - g.lng, lastPoint[1] - g.lat) > 0.8) {
          g.trail.push([g.lng, g.lat]);
          if (g.trail.length > 14) g.trail.shift();
        }
      }
      if (g.sort === "whale") {
        if (g.spout > 0) g.spout = g.spout + d / 2.4 >= 1 ? 0 : g.spout + d / 2.4;
        else if ((g.wait -= d) <= 0) {
          g.spout = 0.001;
          g.wait = 5 + rand(g.seed + this.time) * 7;
        }
      }
    }
    this.groups = this.groups.filter((g) => g.wanted || g.shown > 0.02);
  }

  private draw() {
    const { ctx, canvas } = this;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const t = this.time;
    for (const g of this.groups) {
      const at = this.projector.project(g.lng, g.lat);
      if (!at.visible) continue;
      ctx.globalAlpha = g.shown;
      if (g.sort === "flock") {
        // Small white birds, each a shallow V that beats.
        for (let i = 0; i < 7; i++) {
          const p = this.projector.project(g.lng + (rand(g.seed + i) - 0.5) * 7 + Math.sin(t * 0.6 + i) * 0.5, g.lat + (rand(g.seed + i + 0.5) - 0.5) * 5);
          if (!p.visible) continue;
          const beat = Math.sin(t * 9 + i * 1.7) * 2;
          ctx.strokeStyle = "rgba(20, 24, 40, 0.55)";
          ctx.lineWidth = 2.6;
          for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            ctx.moveTo(p.x - 4.5, p.y - beat);
            ctx.lineTo(p.x, p.y + 1);
            ctx.lineTo(p.x + 4.5, p.y - beat);
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.3;
          }
        }
      } else if (g.sort === "shoal") {
        // Silver glints in the water, turning together.
        for (let i = 0; i < 12; i++) {
          const p = this.projector.project(g.lng + (rand(g.seed + i) - 0.5) * 4.4 + Math.sin(t * 1.1 + g.seed) * 0.4, g.lat + (rand(g.seed + i + 0.5) - 0.5) * 3.2 + Math.cos(t * 0.9 + g.seed) * 0.3);
          if (!p.visible) continue;
          const glint = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.4 + i * 0.9 + g.seed));
          ctx.globalAlpha = g.shown * glint;
          ctx.fillStyle = "#e4f6ff";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 2.6, 1.1, g.heading, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (g.sort === "whale") {
        ctx.fillStyle = "rgba(18, 30, 52, 0.85)";
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, 6.5, 2.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        if (g.spout > 0) {
          const k = Math.sin(Math.PI * g.spout);
          ctx.globalAlpha = g.shown * k;
          ctx.strokeStyle = "#e9f7ff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(at.x + 3, at.y - 2);
          ctx.quadraticCurveTo(at.x + 1, at.y - 9 * k - 3, at.x - 3, at.y - 12 * k - 2);
          ctx.moveTo(at.x + 3, at.y - 2);
          ctx.quadraticCurveTo(at.x + 5, at.y - 9 * k - 3, at.x + 8, at.y - 11 * k - 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(at.x, at.y + 1, 7 + g.spout * 12, 3 + g.spout * 5, 0, 0, Math.PI * 2);
          ctx.globalAlpha = g.shown * (1 - g.spout) * 0.7;
          ctx.stroke();
        }
      } else {
        // A herd: its track across the land, and the animals as a loose knot of dots at its head.
        ctx.strokeStyle = KIND_COLOURS[g.kind];
        ctx.lineWidth = 1.4;
        let started = false;
        ctx.beginPath();
        g.trail.forEach(([lng, lat], i) => {
          const p = this.projector.project(lng, lat);
          if (!p.visible) return void (started = false);
          if (!started) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          started = true;
          void i;
        });
        ctx.globalAlpha = g.shown * 0.4;
        ctx.stroke();
        ctx.globalAlpha = g.shown;
        const size = g.kind === 1 ? 1.5 : 2.1;
        for (let i = 0; i < (g.kind === 1 ? 12 : 9); i++) {
          const p = this.projector.project(g.lng + (rand(g.seed + i) - 0.5) * 3.2 + Math.sin(t * 1.3 + i) * 0.25, g.lat + (rand(g.seed + i + 0.5) - 0.5) * 2.4 + Math.cos(t * 1.1 + i) * 0.2);
          if (!p.visible) continue;
          ctx.fillStyle = "rgba(20, 24, 40, 0.6)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, size + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = KIND_COLOURS[g.kind];
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Humankind: two lights, side by side, in the middle of the view.
    if (this.people > 0.02) {
      const disc = this.projector.disc();
      for (const side of [-1, 1]) {
        const x = disc.x + side * 13;
        const y = disc.y - disc.r * 0.08;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 30);
        glow.addColorStop(0, "rgba(255, 246, 216, 0.95)");
        glow.addColorStop(0.35, "rgba(238, 176, 74, 0.5)");
        glow.addColorStop(1, "rgba(238, 176, 74, 0)");
        ctx.globalAlpha = this.people * (0.85 + 0.15 * Math.sin(t * 1.6 + side));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fffbe8";
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = this.people;
      ctx.font = "italic 12px 'Iowan Old Style', Palatino, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fbeecb";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 5;
      ctx.fillText("Humankind (placed for layout, not a location)", disc.x, disc.y - disc.r * 0.08 + 46);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  private frame = (clock: number) => {
    const dt = Math.min(0.05, (clock - this.last) / 1000 || 0);
    this.last = clock;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  /** For checks only: run the life forward without waiting. */
  debugAdvance(seconds: number) {
    for (let i = 0; i < seconds * 20; i++) this.step(0.05);
    this.draw();
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
