// Fruit trees for day 3 (Gen 1:11-12): "the fruit tree yielding fruit after his kind".
//
// Each tree rises out of the ground, spreads its leaves, and then bears fruit, timed so it
// happens just ahead of the view as it flies up the valley.
//
// Which fruits, and how fast they grow, is illustration: the text names no fruits and gives no
// speed, only that the earth brought them forth within the third day.
//
// Tree shapes, bark and leaf textures come from the EZ-Tree library (MIT licence, see ASSETS.md).
// A handful of tree shapes are generated once and reused at many places.

import * as THREE from "three";
import { Tree } from "@dgreenheck/ez-tree";
import type { Flight, GroundSample, Terrain } from "./terrain.ts";
import { seededRandom, smoothstep } from "./noise.ts";

interface FruitKind {
  name: string;
  color: number;
  radius: number;
  /** Stretch along the stem: 1 = round, more = longer (a lemon). */
  stretch: number;
}

const FRUITS: FruitKind[] = [
  // Sizes are about one and a half times life size, so the fruit reads from a moving view.
  { name: "apple", color: 0xc8202a, radius: 0.125, stretch: 0.94 },
  { name: "peach", color: 0xf59a62, radius: 0.12, stretch: 1.0 },
  { name: "lemon", color: 0xf4d42a, radius: 0.1, stretch: 1.32 },
  { name: "orange", color: 0xf28c1e, radius: 0.125, stretch: 1.0 },
  { name: "pomegranate", color: 0xa51a30, radius: 0.13, stretch: 1.0 },
  { name: "fig", color: 0x5e2d63, radius: 0.095, stretch: 1.15 },
];

interface Prototype {
  tree: Tree;
  /** Height of the generated tree in its own units. */
  height: number;
  /** Places among the leaves where fruit can hang, in the tree's own units. */
  fruitSpots: THREE.Vector3[];
  shape: Shape;
}

interface Shape {
  preset: string;
  seed: number;
  leafTint: number;
  /** Finished height in metres: lowest and highest. */
  tall: [number, number];
  fruiting: boolean;
}

const TREE_SHAPES: Shape[] = [
  { preset: "Oak Medium", seed: 4101, leafTint: 0xbfd98a, tall: [7, 10], fruiting: true },
  { preset: "Ash Medium", seed: 7203, leafTint: 0xc9e09a, tall: [7, 10], fruiting: true },
  { preset: "Oak Small", seed: 1907, leafTint: 0xd6e6a8, tall: [5, 7.5], fruiting: true },
  { preset: "Ash Small", seed: 5519, leafTint: 0xb9d58c, tall: [5, 7.5], fruiting: true },
];

// "The herb yielding seed": low shrubs between the trees.
const HERB_SHAPES: Shape[] = [
  { preset: "Bush 1", seed: 2203, leafTint: 0xc4dc92, tall: [0.9, 1.7], fruiting: false },
  { preset: "Bush 2", seed: 8801, leafTint: 0xd2e3a2, tall: [0.8, 1.5], fruiting: false },
  { preset: "Bush 3", seed: 6113, leafTint: 0xb6d184, tall: [1.0, 1.9], fruiting: false },
];

function makePrototype(shape: Shape): Prototype {
  const tree = new Tree();
  tree.loadPreset(shape.preset);
  tree.options.seed = shape.seed;
  tree.options.leaves.tint = shape.leafTint;
  tree.generate();

  const box = new THREE.Box3().setFromObject(tree);
  const height = Math.max(box.max.y, 1);

  // Fruit hangs where there are leaves, in the outer two thirds of the tree's height.
  const leafPositions = tree.leavesMesh.geometry.attributes.position as THREE.BufferAttribute;
  const random = seededRandom(shape.seed);
  const fruitSpots: THREE.Vector3[] = [];
  const wanted = 90;
  for (let tries = 0; fruitSpots.length < wanted && tries < wanted * 12 && leafPositions.count > 0; tries++) {
    const i = Math.floor(random() * leafPositions.count);
    const y = leafPositions.getY(i);
    if (y < height * 0.3) continue;
    fruitSpots.push(new THREE.Vector3(leafPositions.getX(i), y - height * 0.015, leafPositions.getZ(i)));
  }
  return { tree, height, fruitSpots, shape };
}

interface Planted {
  group: THREE.Group;
  leaves: THREE.Mesh;
  fruit: THREE.InstancedMesh | null;
  spots: THREE.Vector3[];
  fruitSize: THREE.Vector3;
  scale: number;
  progress: number;
  lead: number;
  span: number;
  lastGrowth: number;
}

export interface Orchard {
  group: THREE.Group;
  /** reach: how far growth has come along the route (the view's own position once plants are called for). */
  update(reach: number, time: number): void;
  dispose(): void;
}

// Timing, as shares of the route (1 = about 1,500 metres). A plant starts to rise when the view
// is `lead` away from it and is finished `span` later.
// Plants beside the route rise late, right in front of the view. Those further off rise early,
// so the valley ahead is already filling with trees.
const NEAR_LEAD = 0.08;
const NEAR_SPAN = 0.062;
const FAR_LEAD = 0.24;
const FAR_SPAN = 0.11;

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export function buildOrchard(flight: Flight, terrain: Terrain, treeCount: number, herbCount: number): Orchard {
  const group = new THREE.Group();
  const trees = TREE_SHAPES.map(makePrototype);
  const herbs = HERB_SHAPES.map(makePrototype);
  const prototypes = [...trees, ...herbs];
  const fruitGeometry = new THREE.IcosahedronGeometry(1, 1);
  const fruitMaterials = FRUITS.map((f) => new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.45, metalness: 0 }));

  const random = seededRandom(3301);
  const planted: Planted[] = [];
  const taken: { x: number; z: number; r: number }[] = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const ground: GroundSample = { y: 0, flat: 0 };

  const plant = (kinds: Prototype[], count: number, room: number, nearest: number, furthest: number) => {
    let done = 0;
    for (let tries = 0; done < count && tries < count * 50; tries++) {
      // Along the valley: some close beside the route, others further up the slopes.
      const t = 0.29 + 0.69 * random();
      flight.curve.getPointAt(t, point);
      flight.curve.getTangentAt(t, tangent);
      const close = random() < 0.5;
      const side = (random() < 0.5 ? -1 : 1) * (close ? nearest + random() * 6 : nearest + 6 + random() * furthest);
      const x = point.x - tangent.z * side;
      const z = point.z + tangent.x * side;
      if (!terrain.sample(x, z, ground)) continue;
      if (ground.y < 2.2 || ground.flat < 0.86) continue;
      if (taken.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + room)) continue;
      taken.push({ x, z, r: room });

      const prototype = kinds[Math.floor(random() * kinds.length)];
      const [low, high] = prototype.shape.tall;
      const scale = (low + random() * (high - low)) / prototype.height;

      const tree = new THREE.Group();
      tree.position.set(x, ground.y - 0.08, z);
      tree.rotation.y = random() * Math.PI * 2;
      const branches = new THREE.Mesh(prototype.tree.branchesMesh.geometry, prototype.tree.branchesMesh.material);
      const leaves = new THREE.Mesh(prototype.tree.leavesMesh.geometry, prototype.tree.leavesMesh.material);
      tree.add(branches, leaves);

      let fruit: THREE.InstancedMesh | null = null;
      let spots: THREE.Vector3[] = [];
      const fruitSize = new THREE.Vector3();
      if (prototype.shape.fruiting) {
        const kindIndex = Math.floor(random() * FRUITS.length);
        const kind = FRUITS[kindIndex];
        spots = prototype.fruitSpots.filter(() => random() < 0.8);
        fruit = new THREE.InstancedMesh(fruitGeometry, fruitMaterials[kindIndex], spots.length);
        fruit.frustumCulled = false;
        // Fruit sizes are given in metres; undo the tree's scale so they come out right.
        const r = kind.radius / scale;
        fruitSize.set(r, r * kind.stretch, r);
        tree.add(fruit);
      }

      tree.visible = false;
      group.add(tree);
      const near = Math.abs(side) < nearest + 9;
      planted.push({
        group: tree,
        leaves,
        fruit,
        spots,
        fruitSize,
        scale,
        progress: flight.progressAtZ(z),
        lead: near ? NEAR_LEAD : FAR_LEAD,
        span: near ? NEAR_SPAN : FAR_SPAN,
        lastGrowth: -1,
      });
      done++;
    }
  };
  plant(trees, treeCount, 3.6, 9.5, 44); // trees stand clear of the route, so the view passes between them
  plant(herbs, herbCount, 1.2, 3.5, 30);

  const noTurn = new THREE.Quaternion();
  const size = new THREE.Vector3();

  return {
    group,
    update(reach: number, time: number) {
      for (const p of prototypes) p.tree.update(time); // the leaves' own wind sway

      for (const t of planted) {
        const growth = Math.min(Math.max((reach + t.lead - t.progress) / t.span, 0), 1);
        if (growth === t.lastGrowth) continue;
        t.lastGrowth = growth;
        if (growth <= 0) {
          t.group.visible = false;
          continue;
        }
        t.group.visible = true;

        // Trunk and branches push up first, thin, and fill out as they rise.
        const rise = easeOut(growth / 0.45);
        const girth = Math.pow(rise, 1.6);
        t.group.scale.set(t.scale * girth, t.scale * rise, t.scale * girth);

        // Leaves open once the branches are mostly up.
        const leaf = smoothstep(0.2, 0.6, growth);
        t.leaves.visible = leaf > 0.001;
        t.leaves.scale.setScalar(Math.max(leaf, 0.001));

        // Fruit swells last, with a slight overshoot as it fills.
        if (!t.fruit) continue;
        const ripe = smoothstep(0.55, 1.0, growth);
        t.fruit.visible = ripe > 0.001;
        if (t.fruit.visible) {
          size.copy(t.fruitSize).multiplyScalar(ripe * (1 + 0.18 * Math.sin(ripe * Math.PI)));
          for (let i = 0; i < t.spots.length; i++) {
            matrix.compose(t.spots[i], noTurn, size);
            t.fruit.setMatrixAt(i, matrix);
          }
          t.fruit.instanceMatrix.needsUpdate = true;
        }
      }
    },
    dispose() {
      fruitGeometry.dispose();
      for (const m of fruitMaterials) m.dispose();
      for (const p of prototypes) {
        p.tree.branchesMesh.geometry.dispose();
        p.tree.leavesMesh.geometry.dispose();
        for (const mesh of [p.tree.branchesMesh, p.tree.leavesMesh]) {
          const mat = mesh.material;
          for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose();
        }
      }
    },
  };
}
