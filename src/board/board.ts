// The interactive storyboard: the hub's tap targets and the scenes behind each one.
//
// This is the working copy of STORYBOARD.md. Each scene says what you watch, the one thing you can
// touch, and which parts are text, a scholar's reading, or our illustration. Verse text is not
// typed here: scenes name verses and the text is read from src/data/kjv.ts.
// "sceneId" links a board scene to the playable story (src/data/scenes.ts) where one exists.

export interface BoardScene {
  id: string;
  title: string;
  /** Verses shown on the card, as keys into the KJV file, e.g. "2:7". */
  verses: string[];
  /** The whole passage, for the heading. */
  passage: string;
  narration: string;
  watch: string;
  /** null where the scene is only watched. */
  touch: string | null;
  text: string;
  reading?: string;
  illustration?: string;
  /** A style frame for this scene (a picture in public/style/), where one has been drawn. */
  frame?: string;
  /** Scene id in the playable story, when some version of it can be played now. */
  sceneId?: string;
  built: "playable" | "playable as a placeholder" | "storyboard only";
}

export interface BoardTarget {
  id: string;
  label: string;
  /** Position on the hub picture (its drawing is 1600 wide and 1000 tall). */
  x: number;
  y: number;
  /**
   * Where the ring sits on the globe front door: [longitude, latitude]. For the days of creation and
   * the flood these are placed for layout only (spread so they can be told apart), not as locations.
   * The garden, the way east and Ararat sit near the map's own pins for those places.
   */
  at: [number, number];
  /** Which side of its ring the name sits on, so neighbours do not cover each other. */
  side: "top" | "bottom" | "left" | "right";
  scenes: BoardScene[];
}

export const targets: BoardTarget[] = [
  {
    id: "deep",
    label: "The deep",
    x: 800,
    y: 860,
    at: [72, -18],
    side: "bottom",
    scenes: [
      {
        id: "beginning",
        title: "In the beginning",
        verses: ["1:1", "1:2"],
        passage: "Genesis 1:1-2",
        narration: "Before anything else: darkness, deep water, and the Spirit of God moving over it.",
        watch: "Black, then dark restless water to every horizon. Wind moves over it.",
        touch: "Swipe the water and it moves.",
        text: "The earth without form and void; darkness on the face of the deep; the Spirit of God on the face of the waters.",
        sceneId: "illustrated:beginning",
        built: "playable",
      },
    ],
  },
  {
    id: "light",
    label: "Light and dark",
    x: 330,
    y: 430,
    at: [-2, 34],
    side: "left",
    scenes: [
      {
        id: "day-1",
        title: "Day 1: light",
        verses: ["1:3", "1:4"],
        passage: "Genesis 1:3-5",
        narration: "God speaks, and there is light. He divides it from the darkness and names them Day and Night.",
        watch: "Light breaks without a sun. It is divided from the dark. Evening, then morning.",
        touch: "Drag to turn light and dark.",
        text: "Light; God divides the light from the darkness; Day and Night; evening and morning, the first day.",
        illustration: "Showing light and dark as two halves of the sky. The text does not say how they were divided.",
        sceneId: "illustrated:day-1",
        built: "playable",
      },
    ],
  },
  {
    id: "vault",
    label: "The vault and the waters above",
    x: 1262,
    y: 330,
    at: [48, 68],
    side: "top",
    scenes: [
      {
        id: "day-2",
        title: "Day 2: the vault",
        verses: ["1:6", "1:7"],
        passage: "Genesis 1:6-8",
        narration: "The waters are divided. Between them, an expanse, and God calls it Heaven.",
        watch: "The haze over the water lifts and opens into a vault, with water above it.",
        touch: "Tilt to look under the water and above the vault.",
        text: "A firmament in the midst of the waters, dividing the waters under it from the waters above it; called Heaven.",
        reading: "The firmament drawn as a solid vault follows BibleProject's reading of ancient cosmology.",
        sceneId: "illustrated:day-2",
        built: "playable",
      },
    ],
  },
  {
    id: "land",
    label: "Land and plants",
    x: 690,
    y: 628,
    at: [14, 16],
    side: "left",
    scenes: [
      {
        id: "day-3",
        title: "Day 3: land and plants",
        verses: ["1:9", "1:11"],
        passage: "Genesis 1:9-13",
        narration: "The waters gather and dry land appears. At a word, the earth brings forth grass, herbs and fruit trees.",
        watch: "The sea draws back from a rising land. Grass and herbs are drawn onto it, then fruit trees, each with its fruit.",
        touch: "Drag along the land and the plants are drawn in under your hand. Swipe the sea.",
        text: "The waters gathered to one place; dry land called Earth; grass, herb yielding seed, fruit tree yielding fruit.",
        illustration: "The shape of the land, the kinds of fruit and the speed of growth.",
        sceneId: "illustrated:day-3",
        built: "playable",
      },
    ],
  },
  {
    id: "lights",
    label: "Sun, moon and stars",
    x: 430,
    y: 300,
    at: [98, 36],
    side: "right",
    scenes: [
      {
        id: "day-4",
        title: "Day 4: lights",
        verses: ["1:14", "1:16"],
        passage: "Genesis 1:14-19",
        narration: "Lights are set in the firmament to divide day from night and to mark seasons, days and years.",
        watch: "The sun rises and crosses. The moon and stars come out. A month of moon phases; a year of sunrises.",
        touch: "Season tabs, and drag the sun across the sky.",
        text: "Two great lights and the stars, set in the firmament to give light, to rule day and night, for signs, seasons, days and years.",
        reading: "\"Seasons\" can also be translated \"festivals\" (Rudolph, Tyndale Bulletin, 2003).",
        illustration: "The paths and sizes of the lights and the speed of time.",
        sceneId: "illustrated:day-4",
        built: "playable",
      },
    ],
  },
  {
    id: "sea",
    label: "Sea and sky",
    x: 455,
    y: 690,
    at: [63, 10],
    side: "right",
    scenes: [
      {
        id: "day-5",
        title: "Day 5: sea and sky",
        verses: ["1:20", "1:21"],
        passage: "Genesis 1:20-23",
        narration: "The waters swarm with living creatures, and birds fly across the open sky.",
        watch: "The view drops through the surface. Shoals turn in the light; something very large passes below. It rises back into flocks wheeling over the water.",
        touch: "Swipe the water to scatter a shoal, drag the sky and the birds follow, tap the great creature to see it breach.",
        text: "The moving creature that has life; great whales; every winged fowl; blessed to be fruitful and multiply.",
        illustration: "Which creatures are drawn.",
        sceneId: "illustrated:day-5",
        built: "playable",
      },
    ],
  },
  {
    id: "life",
    label: "Animals and humankind",
    x: 938,
    y: 656,
    at: [33, -6],
    side: "bottom",
    scenes: [
      {
        id: "day-6",
        title: "Day 6: land animals, then humankind",
        verses: ["1:24", "1:27"],
        passage: "Genesis 1:24-31",
        narration: "The land brings forth living creatures. Then humankind, male and female, in the image of God.",
        watch: "Herds spread through the valley. Then two figures of light stand on the height, looking out over all of it.",
        touch: "Drag along the land and the animals follow; tap one and it leaps; swipe the sea.",
        text: "Cattle, creeping thing and beast of the earth; man in God's image, male and female; dominion; every green herb for food.",
        illustration: "The look of the animals and of the two figures.",
        sceneId: "illustrated:day-6",
        built: "playable",
      },
    ],
  },
  {
    id: "rest",
    label: "The whole, at rest",
    x: 800,
    y: 150,
    at: [84, 56],
    side: "right",
    scenes: [
      {
        id: "day-7",
        title: "Day 7: rest",
        verses: ["2:2", "2:3"],
        passage: "Genesis 2:1-3",
        narration: "The heavens and the earth are finished. God rests, and blesses the seventh day.",
        watch: "The whole world, finished, in one slow turn. No cuts and no new motion.",
        touch: "Drag to turn the heavens. Nothing else responds; the stillness is the point.",
        text: "Heaven and earth finished; God ended his work and rested on the seventh day, blessed it and sanctified it.",
        reading: "BibleProject reads the seven days as the dedication of a temple, with God's presence filling it on the seventh.",
        sceneId: "illustrated:day-7",
        built: "playable",
      },
    ],
  },
  {
    id: "garden",
    label: "The garden",
    x: 800,
    y: 520,
    at: [47.5, 30.5],
    side: "bottom",
    scenes: [
      {
        id: "eden-man",
        title: "Eden 1: the man from the dust",
        verses: ["2:7"],
        passage: "Genesis 2:7",
        narration: "Formed from the dust of the ground, and alive by the breath of God.",
        watch: "Close on bare ground. Dust lifts and draws together into a human shape. Light enters at the face. The chest rises. The figure sits up.",
        touch: "Afterward, turn the view around him.",
        text: "Formed of the dust of the ground; the breath of life breathed into his nostrils; man became a living soul.",
        illustration: "How the forming looked. God is shown only by what happens: no figure.",
        frame: "eden-man.jpg",
        sceneId: "illustrated:eden-man",
        built: "playable",
      },
      {
        id: "eden-garden",
        title: "Eden 2: the garden",
        verses: ["2:8", "2:9", "2:15"],
        passage: "Genesis 2:8-9, 15-17",
        narration: "A garden, planted in Eden, with every tree good for food, and two trees named in its midst.",
        watch: "The view rises from the man to show where he has been put: a garden on a height, and two trees set apart in the middle.",
        touch: "Tap either tree in the midst for its name; drag along the garden and the man walks with you.",
        text: "A garden eastward in Eden; every tree pleasant to the sight and good for food; the tree of life in the midst; the tree of knowledge of good and evil; to dress it and keep it.",
        reading: "The garden on a height, and \"dress and keep\" as priestly work, follow BibleProject (Were Adam and Eve Priests in Eden?).",
        illustration: "How the two trees look. No walls, buildings or invented landmarks.",
        sceneId: "illustrated:eden-garden",
        built: "playable",
      },
      {
        id: "eden-river",
        title: "Eden 3: the river",
        verses: ["2:10"],
        passage: "Genesis 2:10-14",
        narration: "One river waters the garden, and from there it parts into four.",
        watch: "A river rises in Eden, waters the garden, and below it parts into four heads.",
        touch: "Tap any of the four rivers for its name and verse.",
        text: "One river out of Eden; four heads; the lands of Havilah, Ethiopia and Assyria.",
        illustration: "Where the rivers run on the hub. Where they ran on earth is the \"Where on earth?\" layer, with four readings side by side.",
        sceneId: "illustrated:eden-river",
        built: "playable",
      },
      {
        id: "eden-naming",
        title: "Eden 4: the naming",
        verses: ["2:19", "2:20"],
        passage: "Genesis 2:18-20",
        narration: "Every creature is brought to the man, and he names them. None is a match for him.",
        watch: "Animals and birds are brought to the man one after another.",
        touch: "Tap a creature and the man names it.",
        text: "Formed out of the ground; brought to Adam; whatever he called each creature was its name; no help meet for him found.",
        illustration: "Which creatures are drawn.",
        sceneId: "illustrated:eden-naming",
        built: "playable",
      },
      {
        id: "eden-woman",
        title: "Eden 5: the woman",
        verses: ["2:21", "2:22"],
        passage: "Genesis 2:21-23",
        narration: "A deep sleep; a rib taken; a woman made and brought to the man.",
        watch: "The figure sleeps. One line of light lifts from his side and grows into a second figure. He wakes and the two stand facing each other.",
        touch: null,
        text: "A deep sleep; one of his ribs taken and the flesh closed; a woman made and brought to the man.",
        illustration: "How it looked. The scene adds nothing more.",
        sceneId: "illustrated:eden-woman",
        built: "playable",
      },
      {
        id: "eden-fall",
        title: "Eden 6: the fall",
        verses: ["3:6", "3:7", "3:8"],
        passage: "Genesis 3:1-21",
        narration: "They take what was forbidden. Their eyes are opened, and they hide.",
        watch: "A serpent at the tree in the middle. She takes the fruit and eats, and gives to him, and he eats. Their light dims. They cover themselves and hide among the trees. They are found, and are clothed.",
        touch: null,
        text: "The serpent; she took of the fruit and ate, and gave to her husband; their eyes were opened; fig leaves; they hid among the trees; coats of skins.",
        illustration: "The serpent's look, the fruit (the text names no kind), and the dimming of their light. God's voice is moving light and sound, never a figure.",
        sceneId: "illustrated:eden-fall",
        built: "playable",
      },
    ],
  },
  {
    id: "east",
    label: "The way east",
    x: 940,
    y: 574,
    at: [60, 32],
    side: "right",
    scenes: [
      {
        id: "exile",
        title: "East of Eden",
        verses: ["3:24", "4:16"],
        passage: "Genesis 3:23-24; 4:16-17",
        narration: "The way to the tree of life is guarded. They go out to the east.",
        watch: "Two figures walk out to the east. Behind them a flame turns every way across the way in. Later, one figure goes further east and a small settlement appears.",
        touch: "Swipe the flaming sword to turn it; on a phone, drag to look back toward the garden.",
        text: "Sent out of the garden; cherubim and a flaming sword that turned every way, at the east; Cain in the land of Nod, east of Eden; a city.",
        illustration: "The look of the guard and of the city.",
        sceneId: "illustrated:exile",
        built: "playable",
      },
      {
        id: "generations",
        title: "The generations",
        verses: ["5:1"],
        passage: "Genesis 5",
        narration: "Ten generations from Adam to Noah, each life overlapping the next.",
        watch: "Ten names, each a bar of light as long as a lifespan.",
        touch: "Drag along the years to see who was alive together; switch between the Hebrew and Greek counts.",
        text: "The ages given for each father at his son's birth and at his death.",
        sceneId: "illustrated:generations",
        built: "playable",
      },
    ],
  },
  {
    id: "flood",
    label: "The flood and the ark",
    x: 352,
    y: 620,
    at: [-5, 5],
    side: "left",
    scenes: [
      {
        id: "ark",
        title: "The ark",
        verses: ["6:15", "7:9"],
        passage: "Genesis 6:14-7:10",
        narration: "Noah builds as he is told: three hundred cubits long, fifty wide, thirty high.",
        watch: "The ark is drawn frame, planks and pitch, to the text's own measures, side view and end view at one scale. The creatures go in two and two. The rain begins, and the scene hands over to the globe.",
        touch: "Tap a number or a part of the ark for its verse; drag left or right to build or unbuild it; then follow the ark across the waters.",
        text: "Gopher wood and pitch; 300 by 50 by 30 cubits; the window, the door in the side, three stories; two and two.",
        illustration: "The box shape, the door's place and size, the ramp, which animals; animals and man are not to scale.",
        sceneId: "illustrated:ark",
        built: "playable",
      },
      {
        id: "flood",
        title: "The flood",
        verses: ["7:11", "7:19"],
        passage: "Genesis 6:14-8:3",
        narration: "The fountains of the deep break open and the windows of heaven are opened. The waters cover everything.",
        watch: "The water that was parted on day 2 comes back together. On the globe the ark is carried across the waters and comes to rest in the mountains of Ararat.",
        touch: "Scrub the flood calendar: day 1, 151, 225, 315, 371.",
        text: "The ark's size; the fountains of the great deep and the windows of heaven; the dates; all the high hills covered.",
        illustration: "How high the water stands at each verse.",
        sceneId: "flood",
        built: "playable",
      },
    ],
  },
  {
    id: "ararat",
    label: "The mountains of Ararat",
    x: 1076,
    y: 580,
    at: [43.5, 39.5],
    side: "top",
    scenes: [
      {
        id: "rest-of-ark",
        title: "The ark at rest",
        verses: ["8:4", "8:14"],
        passage: "Genesis 8:4-14",
        narration: "The ark comes to rest on the mountains of Ararat. The waters fall, and the earth dries.",
        watch: "The water falls. Mountain tops show. The ark sits on dry ground.",
        touch: "Open \"Where on earth?\" to see the places proposed, with reasons for and against each.",
        text: "The ark rested on the mountains of Ararat; the tops of the mountains seen; the earth dried.",
        illustration: "The exact spot. The text names a mountain region, not a peak.",
        sceneId: "end-grounding",
        built: "playable",
      },
    ],
  },
];

/**
 * The moments of each scene, in order: the small steps the scene moves through. On a built scene these
 * are tappable drawings (see src/illustrated/EdenMan.tsx); on the board they are the scene's outline.
 */
export const moments: Record<string, string[]> = {
  beginning: ["Darkness", "The deep", "Wind over the water"],
  "day-1": ["Let there be light", "Light divided from dark", "Evening and morning"],
  "day-2": ["The waters", "A vault opens", "Waters above and below"],
  "day-3": ["The waters gather", "Dry land", "Grass and herbs", "Fruit trees"],
  "day-4": ["The sun", "Moon and stars", "A month", "A year"],
  "day-5": ["The waters swarm", "Birds above", "Great whales", "Be fruitful"],
  "day-6": ["Cattle", "Creeping things", "Beasts of the earth", "Humankind"],
  "day-7": ["Finished", "Rest", "Blessed"],
  "eden-man": ["Dust lifts", "It gathers", "Breath enters", "He sits up"],
  "eden-garden": ["A garden planted", "Every tree", "Two trees in the midst", "To dress and keep it"],
  "eden-river": ["A river rises", "It waters the garden", "It parts into four"],
  "eden-naming": ["Brought to the man", "He names them", "No match found"],
  "eden-woman": ["A deep sleep", "From his side", "A woman", "Brought to the man"],
  "eden-fall": ["The serpent", "She eats, he eats", "Eyes opened", "Hiding", "Clothed"],
  exile: ["Sent out", "The way guarded", "East to Nod", "A city"],
  generations: ["Adam to Seth", "Ten generations", "Noah"],
  ark: ["Gopher wood and pitch", "300 by 50 by 30", "Window, door, three stories", "Two and two", "The flood comes"],
  flood: ["The deep breaks open", "The waters rise", "All covered", "The ark afloat"],
  "rest-of-ark": ["The ark rests", "Mountain tops seen", "The earth dries"],
};

/** Every scene in story order, with the target it belongs to. */
export const storyOrder: { target: BoardTarget; scene: BoardScene }[] = [
  "deep", "light", "vault", "land", "lights", "sea", "life", "rest", "garden", "east", "flood", "ararat",
].flatMap((id) => {
  const target = targets.find((t) => t.id === id)!;
  return target.scenes.map((scene) => ({ target, scene }));
});
