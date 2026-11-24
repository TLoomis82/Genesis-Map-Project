import type { Source } from './types.ts';

// Source registry. A feature may only cite ids listed here.
// status 'to-read' means it has not been read first-hand yet: cite by page before launch.

export const sources: Source[] = [
  // --- Tier 2: scholars ---
  { id: 'bibleproject-cosmology', author: 'Tim Mackie and Jon Collins', title: 'Ancient Cosmology (podcast series)', url: 'https://bibleproject.com/podcast/series/ancient-cosmology/', status: 'opened' },
  // Summary read first-hand (tyndalebulletin.org/article/30252). Read the full article before launch.
  { id: 'rudolph-festivals', author: 'David J. Rudolph', title: 'Festivals in Genesis 1:14 (Tyndale Bulletin 54.2)', year: 2003, url: 'https://doi.org/10.53751/001c.30252', status: 'to-read' },
  { id: 'bibleproject-lens', author: 'BibleProject', title: 'Creation through the Lens of Ancient Cosmology', url: 'https://bibleproject.com/articles/creation-through-the-lens-of-ancient-cosmology/', status: 'opened' },
  { id: 'walton-interview', author: 'John Walton', title: 'Genesis 1-2: Origins or Identity? (BibleProject interview)', url: 'https://bibleproject.com/podcast/genesis-1-2-origins-or-identity', status: 'opened' },
  { id: 'walton-new-explorations', author: 'John Walton', title: 'New Explorations in the Lost World of Genesis', year: 2025, status: 'to-read' },
  { id: 'wenham-genesis', author: 'Gordon Wenham', title: 'Genesis 1-15 (Word Biblical Commentary)', year: 1987, status: 'to-read' },
  { id: 'hamilton-genesis', author: 'Victor Hamilton', title: 'The Book of Genesis, Chapters 1-17 (NICOT)', year: 1990, status: 'to-read' },
  { id: 'mathews-genesis', author: 'Kenneth Mathews', title: 'Genesis 1-11:26 (New American Commentary)', year: 1996, status: 'to-read' },
  { id: 'collins-genesis', author: 'C. John Collins', title: 'Genesis 1-4: A Linguistic, Literary, and Theological Commentary', year: 2006, status: 'to-read' },
  { id: 'kidner-genesis', author: 'Derek Kidner', title: 'Genesis (Tyndale Old Testament Commentaries)', year: 1967, status: 'to-read' },
  { id: 'morales-ascend', author: 'L. Michael Morales', title: 'Who Shall Ascend the Mountain of the Lord?', year: 2015, status: 'to-read' },
  { id: 'esv-eden-map', author: 'Crossway', title: 'ESV Global Study Bible: The Garden of Eden (map note)', url: 'https://esv.org/resources/esv-global-study-bible/map-01-02', status: 'opened' },
  { id: 'ligonier-eden', author: 'Ligonier Ministries', title: 'Where Was the Garden of Eden?', year: 2026, url: 'https://learn.ligonier.org/articles/where-was-the-garden-of-eden', status: 'opened' },
  { id: 'zarins-gulf', author: 'Juris Zarins', title: 'Persian Gulf proposal for Eden (primary publication to be located)', status: 'to-read' },

  // --- Tier 3: flood-geology models ---
  { id: 'cpt-1994', author: 'Austin, Baumgardner, Humphreys, Snelling, Vardiman, Wise', title: 'Catastrophic Plate Tectonics: A Global Flood Model of Earth History', year: 1994, url: 'https://digitalcommons.cedarville.edu/icc_proceedings/vol3/iss1/56', status: 'opened' },
  { id: 'clarey-werner-2018', author: 'Timothy Clarey and Davis Werner', title: 'Use of Sedimentary Megasequences to Re-create Pre-Flood Geography', year: 2018, url: 'https://digitalcommons.cedarville.edu/icc_proceedings/vol8/iss1/27', status: 'permission-needed' },
  { id: 'snelling-2014', author: 'Andrew Snelling', title: 'Rodinia pre-flood configuration (primary publication to be located)', year: 2014, status: 'to-read' },
  { id: 'baumgardner-2018', author: 'John Baumgardner', title: 'Understanding How the Flood Sediment Record Was Formed', year: 2018, url: 'https://publications.cedarville.edu/icc_proceedings/vol_8_2018/306', status: 'opened' },
  { id: 'cosner-carter-2016', author: 'Lita Cosner and Robert Carter', title: 'Pre-flood geography is largely unknown (primary publication to be located)', year: 2016, status: 'to-read' },

  // --- Data ---
  { id: 'paleomap-dem', author: 'Christopher Scotese and Nicky Wright', title: 'PALEOMAP Paleodigital Elevation Models (PaleoDEMs) for the Phanerozoic', year: 2018, url: 'https://zenodo.org/records/5460860', status: 'opened' }, // Licence read on Zenodo 2026-11-23: CC BY 4.0. Credit required; no permission needed.,
];

export const sourceById = new Map(sources.map((s) => [s.id, s]));
