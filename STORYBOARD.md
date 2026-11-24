# Genesis Map: storyboard

Status: second draft, 2026-11-23. **The storyboard is now interactive:** it is the app's front door (`src/board/`), and
`src/board/board.ts` is the working copy of the scene pages below. Keep the two in step.
Second draft with Tyler's four decisions applied (see "Decisions"). Nothing here is built unless its page says so. Tyler approves or changes each page
before it is built.

## The idea in one paragraph

You see the world as Genesis pictures it. You turn it, tap a part of it, and the view moves in to the event that
happened there. Each event plays once on its own (watch), then stays live with one simple control (touch). A second
layer, "Where on earth?", shows today's globe with the places and land models people have proposed, each labelled
for how well it is supported.

## Why this shape

It is built to suit BibleProject, whose own material sets the direction:

- Their Genesis 1 video is about the chapter's literary design and its ancient setting, not about geography.
- They describe creation as a temple built over seven days, and Eden as a garden-temple at its centre, on a mountain,
  with its entrance to the east and the tree of life in the middle (source `bibleproject-eden-priests`).
- They describe humans as God's image placed in that temple, charged to "work and keep" it (same source).
- Their art is illustration chosen to fit the idea, not realism.

So the main stage is the Bible's own cosmos, and the realistic globe with its land models is the second layer.

## Rules for every page

1. **Watch, then touch.** The verse plays; then one control appears. One control per scene, tied to the verse.
2. **Three labels.** Text (stated in Genesis), Scholarly reading (a named scholar's reading), Illustration or Model
   (ours, or an outside reconstruction). Every scene says which parts are which.
3. **God is never drawn as a figure.** His acts are shown by their effect: light, breath, movement.
4. **People are simple figures of light.** No faces, no skin colour, no nakedness to handle.
   The one exception is the fall, where the text itself turns on their being naked and then clothed: shown by the
   figures' light dimming and then being covered, not by bodies.
5. **Add nothing the text does not give**, unless it is labelled Illustration.
6. **Phone first.** Every control works with one thumb.
7. **One illustrated style everywhere, consistent with BibleProject's illustrations** (Tyler, 2026-11-23): the hub,
   every scene, the cards and the "Where on earth?" layer should feel like one piece of work.
   **Illustrated, not realistic.** Flat shapes, a small set of colours, paper grain, in the spirit of BibleProject's
   explainer art. All artwork is our own: nothing of theirs is copied or imitated closely. The first style frame is
   `docs/style/hub-style-frame-1.png`.
8. **A short line of narration per scene**, on screen under the verse, saying what to notice. It restates the text
   or names a labelled reading; it never adds a claim.

## The hub: the world as Genesis pictures it

One 3D scene, slowly turning, that the viewer can spin and tap.

| Part | From the text | Taps into |
|---|---|---|
| The deep, dark water under everything | Gen 1:2 | In the beginning |
| Light and darkness, as two sides of the sky | Gen 1:3-5 | Day 1 |
| The vault, with water above it | Gen 1:6-8 | Day 2 |
| The land and the gathered seas | Gen 1:9-13 | Day 3 |
| Sun, moon and stars set in the vault | Gen 1:14-19 | Day 4 |
| The sea and the open air | Gen 1:20-23 | Day 5 |
| The land again, now with life | Gen 1:24-31 | Day 6 |
| The whole, at rest | Gen 2:1-3 | Day 7 |
| A garden on a height, a river flowing out | Gen 2:8-14 | Eden |
| East of the garden | Gen 3:24; 4:16 | Exile; Cain |
| The fountains of the deep and the windows of heaven | Gen 7:11 | The flood |
| A mountain region | Gen 8:4 | The ark at rest |

- **Label:** Scholarly reading. The vault with water above follows BibleProject's ancient-cosmology reading (source
  `bibleproject-cosmology`). The garden on a height follows their reading of Eden as a mountain
  (`bibleproject-eden-priests`); Genesis 2 itself does not say "mountain".
- **Order:** parts light up as the story reaches them, so a first-time viewer is led through in order. After one
  full play, everything is open to tap.
- **Reuse:** the water, light, divided sky and vault already exist (days 1 and 2). The valley exists (day 3). The
  sky lights exist (day 4). The hub is these seen together from outside.
- **To design:** the outside view itself. This is the main new piece of art.

## The pages

### In the beginning (Gen 1:1-2)
- **Watch:** black, then dark restless water to every horizon; wind over it. *Built.*
- **Touch:** swipe the water and it moves.
- **Labels:** all Text.

### Day 1: light (Gen 1:3-5)
- **Watch:** light breaks without a sun; it is divided from the dark; evening and morning. *Built.*
- **Touch:** drag to turn light and dark.
- **Labels:** Text. Showing them as two halves of the sky is Illustration.

### Day 2: the vault (Gen 1:6-8)
- **Watch:** the haze lifts into a vault with water above. *Built.*
- **Touch:** tilt to look under the water and above the vault.
- **Labels:** Text for the dividing; Scholarly reading for the vault's form.

### Day 3: land and plants (Gen 1:9-13)
- **Watch:** land rises; flight up the valley as grass, herbs and fruit trees grow ahead. *Built.*
- **Touch:** steer the flight.
- **Labels:** Text for what appears; Illustration for the land's shape, the kinds of fruit and the speed.

### Day 4: lights (Gen 1:14-19)
- **Watch:** sun, then moon and stars; a month of moon phases; a year of sunrises. *Built.*
- **Touch:** season tabs; drag the sun.
- **Labels:** Text for the lights and their purpose; Scholarly reading for "seasons"; Illustration for paths and sizes.

### Day 5: sea and sky (Gen 1:20-23)
- **Watch:** the camera drops through the surface. Shoals turn in the light; something very large passes below
  ("great whales", 1:21). It rises back through the surface into flocks wheeling over the water.
- **Touch:** swipe to scatter a shoal or turn a flock.
- **Labels:** Text for sea creatures, great sea creatures and winged birds. Which animals are drawn is Illustration.
- **Build:** shoals and flocks as many small moving shapes, not modelled animals. Cheap, and reads well.

### Day 6: land animals, then humankind (Gen 1:24-31)
- **Watch:** herds spread through the day-3 valley, seen from the flight path. Then two figures of light stand on the
  height, looking out over all of it. ("Let them have dominion", 1:26.)
- **Touch:** tap a kind (cattle, creeping thing, beast of the earth: the three the verse names) to follow it.
- **Labels:** Text for the three kinds and for male and female in God's image. The figures' look is Illustration.
- **Note:** day 6 gives the wide view. The close view of Adam and Eve is in Eden, where Genesis 2 tells it.

### Day 7: rest (Gen 2:1-3)
- **Watch:** the whole hub, finished, one slow turn. No cuts, no new motion.
- **Touch:** spin it freely. Nothing else responds. The stillness is the point.
- **Labels:** Text. BibleProject reads the seven days as a temple's dedication, with God's presence filling it on the
  seventh (`bibleproject-eden-priests`): offered as a Scholarly reading on the card.

### Eden 1: the man from the dust (Gen 2:7)
- **Watch:** close on bare ground. Dust lifts and draws together into a human shape lying on the earth. Light enters
  at the face. The chest rises. The figure sits up.
- **Touch:** none during the forming. Afterward, turn the view around him.
- **Labels:** Text: formed of the dust of the ground; breath of life breathed into his nostrils; became a living soul.
  Illustration: how the forming looked.

### Eden 2: the garden (Gen 2:8-9, 15-17)
- **Watch:** the camera rises from the man to show where he has been put: a garden on a height, every kind of tree,
  and two trees set apart in the middle.
- **Touch:** walk the view through the garden; tap either tree for its card.
- **Labels:** Text: a garden eastward in Eden; every tree pleasant to the sight and good for food; the tree of life in
  the midst; the tree of the knowledge of good and evil; the charge to dress and keep it. Scholarly reading: the
  height, and "dress and keep" as priestly work (`bibleproject-eden-priests`). Illustration: everything about how the
  two trees look. No walls, buildings or invented landmarks.
- **Build:** the day-3 valley, richer, re-used.

### Eden 3: the river (Gen 2:10-14)
- **Watch:** a river rises in Eden, waters the garden, and below it parts into four.
- **Touch:** follow any of the four. Each ends at its card: Pishon, Gihon, Hiddekel, Euphrates.
- **Labels:** Text for the one river, the four heads and the lands named. Where they ran is not shown here; that is
  the "Where on earth?" layer, with the four readings side by side.

### Eden 4: the naming (Gen 2:18-20)
- **Watch:** animals and birds are brought to the man one after another; none is a match for him.
- **Touch:** tap a creature and it is named (its name appears).
- **Labels:** Text: formed out of the ground, brought to the man, named by him, no helper found.

### Eden 5: the woman (Gen 2:21-23)
- **Watch:** the figure sleeps. One line of light lifts from his side and grows into a second figure. He wakes and
  the two stand facing each other.
- **Touch:** none. This one is only watched.
- **Labels:** Text: a deep sleep; one of his ribs taken; the flesh closed; a woman made and brought to the man.
  Illustration: how it looked. The scene adds nothing more.

### Eden 6: the fall (Gen 3:1-21)
- **Watch:** among the trees, a serpent at the tree in the middle. The woman takes the fruit and eats, and gives to
  the man, and he eats. Their light dims. They cover themselves and hide among the trees as a sound moves through
  the garden. They are found, and are clothed.
- **Touch:** none. This one is only watched.
- **Labels:** Text: the serpent, more subtle than any beast of the field; she took of the fruit and ate, and gave to
  her husband, and he ate; their eyes were opened; fig leaves; they hid from the presence of the LORD God among the
  trees; coats of skins. Illustration: the serpent's look, the fruit's look (the text names no kind of fruit), and
  the dimming of the figures' light.
- **Care:** God's voice is shown as moving light and sound through the trees, never a figure. The words spoken in
  3:9-19 appear as verse text only.

### East of Eden (Gen 3:23-24; 4:16-17)
- **Watch:** two figures walk out to the east. Behind them the way in is guarded, shown as a turning flame.
  Later, one figure goes further east and a small settlement appears.
- **Touch:** look back toward the garden from outside.
- **Labels:** Text: sent out; cherubim and a flaming sword that turned every way, to keep the way of the tree of life;
  Cain east of Eden in Nod; a city. Illustration: the look of the guard and the city.

### The generations (Gen 5)
- **Watch:** ten names, each a bar of light for a lifespan, overlapping.
- **Touch:** drag along the bars to see who was alive together; switch between the Hebrew and Greek numbers.
- **Labels:** Text. The data is already in `src/data/chronology.ts`.

### The flood (Gen 6:14-8:14)
- **Watch:** on the hub, the fountains of the deep break open and the windows of heaven open: the water that was
  parted on day 2 comes back together. The ark, to scale, floats on it. Then the water falls and a mountain region
  shows.
- **Touch:** scrub the flood calendar (day 1, 151, 225, 315, 371).
- **Labels:** Text for the sources of the water, the dates, the covering of the high hills, the ark's size and where
  it rested. Showing it as creation coming undone is a reading to confirm in BibleProject's own material before it
  is labelled as theirs.
- **Reuse:** the flood layer built for the globe (water rising by land height, storm sky).

## The second layer: "Where on earth?"

Today's globe, opened from any scene that has a place question. Built already, to different degrees:

- **Eden:** four readings with reasons for and against. *Built as cards and pins.*
- **The resting place:** Mount Ararat, Mount Cudi, the Durupinar claim. *Built as cards.*
- **The pre-flood land:** a Pangaea-like model, with Rodinia and Pannotia as alternatives. *Built as a draped model
  with relief; the flood can be played on it.* All tier Model.

## The timeline

One strip along the bottom, in three sections, each at the scale the text gives: seven days; ten generations; the
flood's 371 days. Dragging it moves through the story.

## Decisions (Tyler, 2026-11-23)

1. **Art direction:** illustration in the manner of BibleProject. The realistic scenes built so far (days 1 to 4,
   the globe) will be restyled or kept for the "Where on earth?" layer.
2. **The fall is in**, complete with the flaming sword guarding the way.
3. **Narration:** yes, a short line per scene.
4. **People as figures of light:** yes.

## Narration: sample lines (draft, for Tyler to edit)

- In the beginning: "Before anything else: darkness, deep water, and the Spirit of God moving over it."
- Day 2: "The waters are divided. Between them, an expanse, and God calls it Heaven."
- Day 6: "The land brings forth living creatures. Then humankind, male and female, in the image of God."
- Eden 1: "Formed from the dust of the ground, and alive by the breath of God."
- Eden 6: "They take what was forbidden. Their eyes are opened, and they hide."
- East of Eden: "The way to the tree of life is guarded. They go out to the east."

## Build order

0. Agree the look from style frames (the hub first, then one of the man from the dust).
1. The hub's outside view in the agreed style, with tap targets that open the scenes already built.
2. Eden 1 and Eden 5 (the man, the woman), finished, as the test of the style.
3. Day 5 and day 6, rough.
4. Eden 2 to 4, the generations, the flood on the hub.
5. "Where on earth?" joined to the scenes that have a place question.
6. Touch controls, scene by scene.
