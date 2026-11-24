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
  /** From Eden to the ark: the garden, its river, and people as lights. Left out: none of these. */
  marks?: Marks;
}

/**
 * The story from Eden to the ark, as marks on the land before the flood. No place on that land can be
 * known, so every position is a layout choice round the middle of the view, and the page says so.
 * People are lights, as in the drawn scenes; God is never drawn.
 */
export interface Marks {
  /** The point on the land the marks are laid out round. A layout choice. */
  anchor: [number, number];
  /** The garden's glow: 0 none, 1 full, less once the way to it is shut. */
  garden: number;
  /** The river going out of Eden and parting into four heads (2:10). */
  rivers: boolean;
  /** The flame at the east of the garden (3:24). */
  flame: boolean;
  /** How many of the first two are there yet: 0, 1 or 2. */
  pair: number;
  /** Where they are: in the garden, or east of it. */
  pairEast: boolean;
  /** How bright they are: 1 before the fall, less after. */
  pairLight: number;
  /** One who goes further east (4:16), and the city he builds (4:17). */
  cain: boolean;
  city: boolean;
  /** How many more lights have spread over the land (6:1). */
  peoples: number;
  /** How far those lights have dulled (6:5, 6:11-12): 0 to 1. */
  dulled: number;
  /** One light that stays bright (6:8). */
  noah: boolean;
  /** Genesis 5, for a chosen year: each of the ten, and whether he is not yet born, alive (with his age), dead, or taken (Enoch, 5:24). */
  lives?: { name: string; state: "unborn" | "alive" | "dead" | "taken"; age: number }[];
}
export const NO_MARKS: Marks = { anchor: [0, 0], garden: 0, rivers: false, flame: false, pair: 0, pairEast: false, pairLight: 1, cain: false, city: false, peoples: 0, dulled: 0, noah: false };

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
  /** The marks as they are now on screen, each gliding toward what the verse asks for. */
  private m = { garden: 0, rivers: 0, flame: 0, pair: 0, east: 0, light: 1, cain: 0, city: 0, peoples: 0, dulled: 0, noah: 0 };
  private spread: [number, number][] = [];
  private anchor: [number, number] = [0, 0];
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
    const w = this.want.marks ?? NO_MARKS;
    const to = (key: keyof Life["m"], target: number, rate = 0.9) => (this.m[key] += (target - this.m[key]) * (1 - Math.exp(-dt * rate)));
    to("garden", w.garden);
    to("rivers", w.rivers ? 1 : 0, 0.45);
    to("flame", w.flame ? 1 : 0);
    to("pair", w.pair);
    to("east", w.pairEast ? 1 : 0, 0.5);
    to("light", w.pairLight);
    to("cain", w.cain ? 1 : 0, 0.5);
    to("city", w.city ? 1 : 0, 0.6);
    to("peoples", w.peoples, 0.35);
    to("dulled", w.dulled, 0.4);
    to("noah", w.noah ? 1 : 0);
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
    this.drawMarks(t);
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

  private light(x: number, y: number, size: number, alpha: number, warm = 1) {
    const { ctx } = this;
    if (alpha < 0.02) return;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 7);
    // Bright and warm, or dulled toward an ashen red.
    glow.addColorStop(0, warm > 0.5 ? "rgba(255, 246, 216, 0.95)" : "rgba(196, 170, 160, 0.8)");
    glow.addColorStop(0.35, warm > 0.5 ? "rgba(238, 176, 74, 0.5)" : "rgba(150, 70, 60, 0.4)");
    glow.addColorStop(1, "rgba(238, 176, 74, 0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = warm > 0.5 ? "#fffbe8" : "#b9a39a";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private label(x: number, y: number, text: string, alpha: number) {
    const { ctx } = this;
    if (alpha < 0.05) return;
    ctx.globalAlpha = alpha;
    ctx.font = "italic 12px 'Iowan Old Style', Palatino, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbeecb";
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 5;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  /** The garden, its river, the flame, and people as lights. Positions are layout only. */
  private drawMarks(t: number) {
    const { ctx, m } = this;
    if (m.garden + m.pair + m.cain + m.peoples + m.noah < 0.02 && !this.want.marks?.lives) return;
    const anchor = this.want.marks?.anchor ?? this.anchor;
    this.anchor = anchor; // kept, so the marks fade out where they were
    const garden: [number, number] = [anchor[0] - 12, anchor[1] + 8];
    const east: [number, number] = [garden[0] + 11, garden[1] - 1];
    const far: [number, number] = [garden[0] + 24, garden[1] - 3];
    const g = this.projector.project(garden[0], garden[1]);
    if (g.visible && m.garden > 0.02) {
      const edge = this.projector.project(garden[0], garden[1] + 4.5);
      const size = Math.max(14, Math.hypot(edge.x - g.x, edge.y - g.y));
      // The river: out of the garden, then four heads.
      if (m.rivers > 0.02) {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#bfe6f7";
        for (let k = 0; k < 4; k++) {
          const bearing = -0.5 + k * 0.95;
          ctx.globalAlpha = 0.85 * m.garden;
          ctx.beginPath();
          let begun = false;
          for (let i = 0; i <= 20 * m.rivers; i++) {
            const far2 = (i / 20) * 15;
            const p = this.projector.project(garden[0] + Math.sin(bearing + Math.sin(i * 0.5 + k) * 0.18) * far2 * 1.2 + 1.5, garden[1] - Math.cos(bearing) * far2 * 0.9 - 2);
            if (!p.visible) break;
            if (begun) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            begun = true;
          }
          ctx.stroke();
        }
      }
      const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, size);
      glow.addColorStop(0, "rgba(214, 240, 150, 0.9)");
      glow.addColorStop(0.55, "rgba(120, 190, 90, 0.5)");
      glow.addColorStop(1, "rgba(120, 190, 90, 0)");
      ctx.globalAlpha = m.garden;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(g.x, g.y, size, 0, Math.PI * 2);
      ctx.fill();
      this.label(g.x, g.y - size - 6, "Eden (placed for layout, not a location)", m.garden);
      if (m.flame > 0.02) {
        const f = this.projector.project(garden[0] + 5, garden[1] - 0.5);
        if (f.visible) {
          const flick = Math.sin(t * 11) * 2;
          ctx.globalAlpha = m.flame;
          ctx.fillStyle = "#f2d24b";
          ctx.strokeStyle = "#d2452f";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(f.x - 4, f.y + 6);
          ctx.quadraticCurveTo(f.x - 7, f.y - 3, f.x + flick * 0.5, f.y - 13 - flick);
          ctx.quadraticCurveTo(f.x + 7, f.y - 3, f.x + 4, f.y + 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    // The first two: in the garden, then east of it.
    for (let k = 0; k < 2; k++) {
      const there = Math.max(0, Math.min(1, m.pair - k));
      if (there < 0.02) continue;
      const lng = garden[0] + (east[0] - garden[0]) * m.east + (k ? 1.3 : -1.3);
      const lat = garden[1] + (east[1] - garden[1]) * m.east;
      const p = this.projector.project(lng, lat);
      if (p.visible) this.light(p.x, p.y, 2.6, there * (0.45 + 0.55 * m.light), m.light);
    }
    if (m.cain > 0.02) {
      const lng = east[0] + (far[0] - east[0]) * m.cain;
      const p = this.projector.project(lng, east[1] + (far[1] - east[1]) * m.cain);
      if (p.visible) this.light(p.x, p.y, 2.4, 0.7 * m.cain, 0.3);
    }
    if (m.city > 0.02) {
      const p = this.projector.project(far[0] + 2.6, far[1] + 0.4);
      if (p.visible) {
        ctx.globalAlpha = m.city;
        ctx.fillStyle = "#d9c08a";
        ctx.strokeStyle = "#1d1a33";
        ctx.lineWidth = 1.2;
        [[-7, 8], [-1, 12], [5, 7]].forEach(([dx, h]) => {
          ctx.fillRect(p.x + dx, p.y - h, 5, h);
          ctx.strokeRect(p.x + dx, p.y - h, 5, h);
        });
        this.label(p.x, p.y + 15, "a city", m.city);
      }
    }
    // More lights, spreading over the land from the east; then dulling.
    if (m.peoples > 0.2) {
      if (this.spread.length === 0 && this.land) {
        const found: [number, number][] = [];
        for (let i = 0; i < 900 && found.length < 90; i++) {
          const lng = east[0] + (rand(i * 2.1 + 5) - 0.5) * 130;
          const lat = Math.max(-58, Math.min(58, east[1] + (rand(i * 3.7 + 1) - 0.5) * 90));
          if (this.isLand(lng, lat)) found.push([lng, lat]);
        }
        this.spread = found.sort((a, b) => Math.hypot(a[0] - east[0], a[1] - east[1]) - Math.hypot(b[0] - east[0], b[1] - east[1]));
      }
      for (let i = 0; i < Math.min(this.spread.length, m.peoples); i++) {
        const p = this.projector.project(this.spread[i][0], this.spread[i][1]);
        if (!p.visible) continue;
        const twinkle = 0.75 + 0.25 * Math.sin(t * 1.3 + i * 2.1);
        this.light(p.x, p.y, 1.7, Math.min(1, m.peoples - i) * twinkle * (0.8 - 0.35 * m.dulled), 1 - m.dulled);
      }
    }
    // The ten of Genesis 5, in a row east of the garden: bright while alive, an ember after, Enoch's lifted away.
    const lives = this.want.marks?.lives;
    if (lives) {
      lives.forEach((life, i) => {
        if (life.state === "unborn") return;
        const p = this.projector.project(east[0] - 16 + Math.floor(i / 2) * 8.5 + (i % 2) * 4.2, east[1] - 9 - (i % 2) * 7);
        if (!p.visible) return;
        if (life.state === "alive") this.light(p.x, p.y, 2.5, 1, 1);
        else if (life.state === "dead") this.light(p.x, p.y, 1.6, 0.4, 0);
        else {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = "#fbeecb";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + 5, p.y - 8, p.x + 2, p.y - 20);
          ctx.stroke();
        }
        this.label(p.x, p.y + 18, life.name, life.state === "alive" ? 1 : 0.55);
        if (life.state === "alive") this.label(p.x, p.y + 31, `${life.age}`, 0.8);
      });
    }
    if (m.noah > 0.02) {
      const p = this.projector.project(anchor[0] + 6, anchor[1] - 9);
      if (p.visible) {
        this.light(p.x, p.y, 3, m.noah, 1);
        this.label(p.x, p.y + 30, "Noah", m.noah);
      }
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

  /** After a skip to another part of the story: show what this verse asks for at once, and nothing left over from the last one. */
  snap() {
    this.groups = this.groups.filter((g) => g.wanted);
    for (let i = 0; i < 120; i++) this.settle();
    this.groups = this.groups.filter((g) => g.wanted);
    this.groups.forEach((g) => (g.shown = 1));
    const w = this.want.marks ?? NO_MARKS;
    this.m = { garden: w.garden, rivers: w.rivers ? 1 : 0, flame: w.flame ? 1 : 0, pair: w.pair, east: w.pairEast ? 1 : 0, light: w.pairLight, cain: w.cain ? 1 : 0, city: w.city ? 1 : 0, peoples: w.peoples, dulled: w.dulled, noah: w.noah ? 1 : 0 };
    this.people = this.want.people ? 1 : 0;
    this.pace = this.want.calm ? 0.28 : 1;
  }

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
