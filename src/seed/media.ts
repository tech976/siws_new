import fs from 'fs'
import os from 'os'
import path from 'path'

import sharp from 'sharp'

import { loadEnv } from '@/utilities/load-env'
import { findMediaId } from '@/utilities/media-lookup'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Uploads the Kindergarten photographs into the media library.
 *
 * Source images are the camera originals in `../assets/images` — several are
 * 6000×4000 and up to 19 MB, which is far past what any web page should serve
 * and past the upload ceiling in `Media.ts`. They are therefore resized here,
 * on the fly, rather than being committed to the repository in a pre-shrunk
 * form: the seed stays reproducible from the originals SIWS supplied, and no
 * binaries enter version control.
 *
 * Alt text was written by looking at each photograph, not inferred from the
 * filename. Describing an image you have not seen produces alt text that is
 * worse than none, because a screen-reader user cannot tell it is wrong.
 *
 * Run with:  npm run seed:media
 */

/*
 * IN the repository, not beside it.
 *
 * This pointed at `../assets/images` — a folder on the developer's machine,
 * outside version control. A fresh clone therefore had no source images at
 * all: `seed:media` skipped every photograph with "not found", the library
 * came up empty, and the pages that name a photograph rendered without one.
 *
 * These are the web-sized files the seed actually uploads, not the camera
 * originals — 4 MB in total, against the 1.1 GB of originals that `.gitignore`
 * deliberately keeps out. Small enough to carry, and carrying them is what
 * makes `npm run seed:media` work on a clone with nothing else set up.
 */
const SOURCE_DIR = path.resolve(process.cwd(), 'assets/images')
const MAX_WIDTH = 1800

interface ImageSeed {
  /** Filename in `assets/images`. */
  file: string
  /** Stable name in the media library — also how the page seed refers to it. */
  filename: string
  alt: string
  caption?: string
  /**
   * FR-PRV-11 — true where a student is identifiable. Verifiable parental
   * consent must be recorded before such an image is published.
   */
  depictsChildren: boolean
  /** Noted where the image does not look like SIWS's own photography. */
  needsLicenceCheck?: boolean
  /**
   * Which section the photograph belongs to, by unit slug.
   *
   * Everything used to be filed under Kindergarten, because this script was
   * written when Kindergarten was the only section with photographs and it
   * has hard-coded `unit: kg.id` ever since. The consequence was invisible
   * from here and obvious on the site: `seed:galleries` builds each
   * section's wall from the photographs tagged to it, so the Secondary
   * gallery came out holding one shared picture, while Kindergarten's showed
   * SSC toppers and a Secondary craft class.
   *
   * Kindergarten stays the default, so every row that does not say otherwise
   * behaves exactly as it did.
   */
  unit?: 'kindergarten' | 'primary' | 'secondary' | 'junior-college'
  /**
   * The heading this photograph files under on its section's gallery wall.
   * Two or more sharing a category get a section of their own; a lone one is
   * folded into the rest — see `seed/galleries.ts`.
   */
  category?: string
  /**
   * Set false for a picture that should stay in the library but off the
   * walls — an uncropped original whose crop is also published, a poster, a
   * video thumbnail.
   */
  showInGallery?: boolean
  /** Never cropped — a certificate, a notice, an invitation. */
  showWhole?: boolean
  /**
   * Where the subject sits vertically, as a percentage from the top.
   *
   * Payload stores 50/50 on every upload, and a shallow band cropping to the
   * middle of the file takes the back row's heads off. Set it here for the
   * photographs the design puts in a band, so a fresh clone is framed
   * correctly rather than waiting for someone to notice and drag the marker.
   */
  focalY?: number
}

const IMAGES: ImageSeed[] = [
  {
    file: 'g1.jpeg',
    filename: 'kg-classroom-activity.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'Kindergarten children in SIWS uniform sitting at curved group tables, colouring in activity books with crayons.',
    caption: 'Spacious, well-ventilated classrooms with group seating',
    depictsChildren: true,
  },
  {
    file: 'kg-classroom-tables.jpg',
    filename: 'kg-classroom-tables.jpg',
    /*
     * The Kindergarten banner photograph.
     *
     * A whole class rather than a corner of one, which is what the top of the
     * page is being asked to say: this is the size of a year group and this is
     * the room it sits in. It goes behind the brand gradient at a 3px blur, so
     * what has to survive is the shape of the room and the mass of colour —
     * both of which it has, and neither of which depends on a single face.
     */
    alt: 'A full kindergarten class in yellow and green SIWS uniform, seated around two large curved white tables and turning to face the camera.',
    caption: 'A full class around the curved group tables',
    /*
     * The faces run in a band from roughly a third of the way down to just
     * past the middle. Left at 50 the banner crop cut through the back row;
     * 45 keeps every row inside the strip.
     */
    focalY: 45,
    depictsChildren: true,
    unit: 'kindergarten',
    category: 'In the classroom',
  },
  {
    file: 'g2.jpeg',
    filename: 'kg-classroom-group.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    // Thirteen children stacked front to back over half the frame, and the
    // band shows a quarter of it. Placed on the two boys nearest the camera,
    // who are the subject: the rows behind fall outside the strip entirely
    // rather than being sliced through the chin.
    focalY: 64,
    alt: 'A kindergarten class seated around a large curved table, smiling towards the camera.',
    caption: 'Small groups and plenty of room to move',
    depictsChildren: true,
  },
  {
    file: '12.JPG',
    filename: 'kg-classroom-seated.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'Young children in SIWS uniform seated at classroom tables, listening to their teacher.',
    caption: 'Bright, child-height classroom furniture',
    depictsChildren: true,
  },
  {
    file: '3.JPG',
    filename: 'kg-play-area.jpg',
    unit: 'kindergarten',
    category: 'Play and activity',
    // A tall portrait in a wide band shows about a tenth of its height. The
    // children stand across its middle, so the strip sits on them — higher and
    // it lands on the empty wall behind, lower and it is all artificial turf.
    focalY: 49,
    alt: 'Kindergarten children in sports uniform standing in rows on the green artificial-turf play area during a physical activity session.',
    caption: 'Safe play and activity area',
    depictsChildren: true,
  },
  {
    file: 'i4.png',
    filename: 'kg-teacher-with-children.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'A SIWS teacher surrounded by a group of kindergarten children hugging her on the school play area.',
    caption: 'Supportive and trained school staff',
    depictsChildren: true,
  },
  {
    file: 'ss.jpeg',
    filename: 'kg-children-together.jpg',
    unit: 'kindergarten',
    category: 'Play and activity',
    alt: 'A close group of kindergarten girls in SIWS sports uniform with red headbands, arms around each other, smiling.',
    caption: 'Friendships that start in the earliest years',
    depictsChildren: true,
  },
  {
    file: '1.jpg',
    filename: 'kg-canteen-meal.jpg',
    /*
     * OFF THE GALLERY WALL (SIWS, 2026-08-29).
     *
     * This is one of the two pictures in the library carrying
     * `needsLicenceCheck` — neither looks like SIWS’s own photography, and
     * both show a child who is not one of ours. A gallery is the school
     * showing you the school, so a stock photograph is the one thing on that
     * wall that should not be there.
     *
     * Kept in the library rather than deleted: it is still the illustration
     * on a facilities card, where it is doing a different job.
     */
    showInGallery: false,
    alt: 'A young child at a dining table eating a school meal from a sectioned metal tray.',
    caption: 'Pure vegetarian canteen',
    depictsChildren: true,
    needsLicenceCheck: true,
  },
  {
    file: '6.jpeg',
    filename: 'kg-handwashing.jpg',
    /*
     * OFF THE GALLERY WALL (SIWS, 2026-08-29).
     *
     * This is one of the two pictures in the library carrying
     * `needsLicenceCheck` — neither looks like SIWS’s own photography, and
     * both show a child who is not one of ours. A gallery is the school
     * showing you the school, so a stock photograph is the one thing on that
     * wall that should not be there.
     *
     * Kept in the library rather than deleted: it is still the illustration
     * on a facilities card, where it is doing a different job.
     */
    showInGallery: false,
    alt: 'A school student washing their hands at an outdoor tap.',
    caption: 'Clean and hygienic washrooms',
    depictsChildren: true,
    needsLicenceCheck: true,
  },
  /*
   * Two photographs SIWS chose for the "Life at SIWS" wall on the portal home
   * page. Both show identifiable children, so both need a permission record
   * before the page carrying them will publish (FR-PRV-11).
   */
  {
    file: 'fancy-dress-environment.jpg',
    filename: 'siws-fancy-dress-environment.jpg',
    unit: 'kindergarten',
    focalY: 62,
    category: 'Events and outings',
    alt: 'Two young students in a fancy-dress competition, one wearing a painted globe costume and the other holding a model of the Earth.',
    caption: 'Showcasing creativity and environmental awareness',
    depictsChildren: true,
  },
  /*
   * The portal's banner photograph. A full stage of children mid-performance
   * carries a front page in a way a tidy classroom cannot — and it is wide,
   * which the banner needs.
   */
  /*
   * The three the Kindergarten programme cards name. `media/` already ships
   * these as `kindergarten-activities-photos-1/2/7`, but only as FILES —
   * that set came in through `photos:import` on another machine and its
   * library rows were never part of the repository, so nothing could
   * reference them and two of the five cards rendered with no picture.
   *
   * Seeded here under their own names rather than the originals, because a
   * name already taken on disk makes Payload write `-1` and the library ends
   * up pointing somewhere nobody expects.
   */
  /*
   * The three the Secondary pages name. Same story as the Kindergarten set:
   * `media/` ships them, but the `photos:import` rows never reached the
   * repository, so `seed:secondary` failed validation on three required
   * image fields and every page after "Contact us" — the teachers roster
   * among them — was never written at all.
   */
  {
    file: 'secondary-toppers-2026.jpeg',
    filename: 'secondary-toppers-2026.jpg',
    unit: 'secondary',
    category: 'Recognition',
    showInGallery: false,
    alt: 'Three SIWS High School students standing together in the school hall, each holding a bouquet and an award after the 2026 SSC results.',
    caption: 'Toppers of 2026',
    /*
     * The three of them stand across the lower two-thirds of a 1200x1600
     * frame, under a lot of hall ceiling. Anchoring at 60% keeps the whole
     * group when a square or wide frame crops the picture, and it is the
     * ceiling that goes rather than heads and feet.
     */
    focalY: 60,
    depictsChildren: true,
  },
  /*
   * The same photograph, cropped to the three of them.
   *
   * The original is a 1200x1600 frame of the sports hall with the toppers
   * standing in the middle of it — ceiling, noticeboards and a lot of floor.
   * Placing it well is not a focal-point problem: `object-cover` can choose
   * WHICH part of a picture a frame shows, but it cannot make the subject any
   * larger within it. So the subject is cropped in the file: a 960x960 square
   * taken from (60, 512), which is the group with a little air above the
   * heads and below the feet.
   *
   * Kept as a second file rather than written over the first. The seed never
   * rewrites the binary of a picture already in the library — see the update
   * path below for the damage that did — and the uncropped original is worth
   * having anyway.
   */
  {
    file: 'secondary-toppers-2026-close.jpg',
    filename: 'secondary-toppers-2026-close.jpg',
    unit: 'secondary',
    category: 'Recognition',
    /*
     * ANCHORED NEAR THE TOP, because the faces are.
     *
     * A 960x960 square, and the three of them stand in the upper two-thirds
     * of it with an empty sports-hall floor below. The gallery feature tile
     * is about 570x372, so a cover crop keeps only 65% of the height — and
     * centred, that band ran from 17% to 82% and took the tops of all three
     * heads off while carefully preserving the floor.
     *
     * At 10% the band starts just above the hair and the floor is what goes,
     * which is the right way round. `Media` reads this off the upload, so it
     * holds wherever the picture is cropped, not just on the gallery wall.
     */
    focalY: 10,
    alt: 'Three SIWS High School students standing together in the school hall, each holding a bouquet and an award after the 2026 SSC results.',
    caption: 'Toppers of 2026',
    depictsChildren: true,
  },
  /*
   * The #SwachhtaMonitor 2023 certificate, straightened and unframed.
   *
   * SIWS sent it as a photograph of the framed original lying on its side,
   * so it is rotated a quarter turn anticlockwise and cropped to the paper —
   * the wooden frame around it was most of the picture and none of the
   * information. Replaces the earlier photograph of the same certificate.
   *
   * RETIRED 2026-09-01, and off every wall from that date. The school sent a
   * square-on photograph of the framed award and asked for that one instead;
   * it is the entry below, and it now holds all three placements this crop
   * used to hold — "Recognised by the State" on the Secondary home page, the
   * recognition card on Secondary news, and the portal's Prizes and honours
   * wall. The row is kept rather than deleted because published versions of
   * those pages still point at it, and a deleted row would empty the picture
   * out of its own history.
   */
  {
    file: 'secondary-swachhta-2023.jpg',
    filename: 'secondary-swachhta-2023.jpg',
    showWhole: true,
    unit: 'secondary',
    category: 'Recognition',
    showInGallery: false,
    alt: 'A Government of Maharashtra certificate naming S.I.W.S. High School amongst the 100 Best Schools in Maharashtra under #SwachhtaMonitor 2023, signed by the Department of School Education and Sports.',
    caption: 'Amongst the 100 Best Schools in Maharashtra — #SwachhtaMonitor 2023',
    // A framed certificate on a wall. There is nobody in it.
    depictsChildren: false,
  },
  /*
   * The photograph of the #SwachhtaMonitor award the school sent on
   * 2026-09-01, and the one the site now shows in place of the straightened
   * crop above.
   *
   * It is the framed original on the wall, photographed square-on, so the
   * frame is part of the picture rather than something to crop away — the
   * school asked for this shot specifically.
   *
   * NOTE ON THE YEAR. The crop above reads "#SwachhtaMonitor 2023"; in this
   * photograph the "2023" is a foil stamp that has not caught the light, so
   * only "#SwachhtaMonitor" is legible. The alt text below therefore does not
   * claim a year the reader of this image cannot see. The award IS the 2023
   * one — the other photograph of the same certificate shows it — so the page
   * copy around it still says 2023, which is accurate and separately sourced.
   *
   * A new library row rather than new bytes behind the old one: the upsert
   * further down deliberately never re-uploads a file for a record that
   * already exists, so swapping `file` alone would change nothing on any
   * machine whose library is already seeded.
   */
  {
    file: 'secondary-swachhta-framed.jpg',
    filename: 'secondary-swachhta-framed.jpg',
    showWhole: true,
    unit: 'secondary',
    category: 'Recognition',
    // 250 characters is the ceiling the Media collection enforces on alt text.
    alt: 'A framed Government of Maharashtra certificate on a wall, awarded to S.I.W.S. High School as amongst the 100 Best Schools in Maharashtra under #SwachhtaMonitor, signed by the Department of School Education and Sports.',
    caption: 'Amongst the 100 Best Schools in Maharashtra — #SwachhtaMonitor 2023',
    // A framed certificate on a wall. There is nobody in it.
    depictsChildren: false,
  },
  {
    file: 'secondary-craft-class.jpg',
    filename: 'secondary-craft-class.jpg',
    unit: 'secondary',
    category: 'In the classroom',
    alt: 'A full Secondary classroom of students in house-colour shirts working with coloured paper and scissors at wooden desks.',
    caption: 'Craft work in a Secondary classroom',
    depictsChildren: true,
  },
  {
    file: 'secondary-activity-class.jpg',
    filename: 'secondary-activity-class.jpg',
    unit: 'secondary',
    category: 'In the classroom',
    alt: 'Secondary students at their desks during an activity session, writing and cutting coloured paper.',
    caption: 'An activity session in progress',
    depictsChildren: true,
  },
  {
    /*
     * The one photograph in this file with no child in it: a framed award on
     * a wall. `depictsChildren` is false, so the consent hook does not gate
     * the page that carries it.
     */
    file: 'secondary-swachhta-certificate.jpg',
    filename: 'secondary-swachhta-certificate.jpg',
    showWhole: true,
    unit: 'secondary',
    category: 'Recognition',
    showInGallery: false,
    alt: 'A framed Government of Maharashtra certificate awarded to S.I.W.S. High School, naming it amongst the 100 best schools in Maharashtra in the Swachhta Monitor 2023.',
    caption: 'Swachhta Monitor 2023 — amongst the 100 best schools in Maharashtra',
    depictsChildren: false,
  },
  {
    file: 'award-andhra.jpg',
    filename: 'siws-award-andhra.jpg',
    focalY: 56,
    category: 'Achievements',
    alt: 'A kindergarten student in costume being handed a certificate on stage by a teacher, with three staff members alongside and a sunflower backdrop behind.',
    caption: 'Receiving a prize at an interschool competition',
    depictsChildren: true,
  },
  /*
   * THE KINDERGARTEN PRIZE PHOTOGRAPHS.
   *
   * Everything a four- or five-year-old at SIWS has been photographed winning.
   * Each caption says only what is legible in the picture itself — the banner
   * behind the children, or the certificate in their hands — because a school
   * inventing the name of a prize is a worse failure than a vague caption.
   *
   * `dance-competition.jpeg` was already in the library and already used by
   * `galleries.ts`, but it had never been written down here: it arrived
   * through `photos:import`, whose manifest is not in version control. A
   * rebuild from a clean database would have lost it. It is described here now
   * so it survives one.
   */
  {
    file: 'dance-competition.jpeg',
    filename: 'siws-dance-competition.jpg',
    focalY: 56,
    unit: 'kindergarten',
    category: 'Events and outings',
    alt: 'Seven Kindergarten girls in orange, white and green dance costumes holding Indian flags, in front of a blackboard reading “Inter School Dance Competition, 14-08-2024”.',
    caption: 'Inter-school dance competition',
    depictsChildren: true,
  },
  {
    file: 'kg-dance-trophy-2024.jpg',
    filename: 'kg-dance-trophy-2024.jpg',
    focalY: 58,
    unit: 'kindergarten',
    category: 'Achievements',
    alt: 'The same group of Kindergarten dancers in tricolour costume holding a trophy and a certificate from The Andhra Education Society’s Pre-Primary School, in a corridor decorated with paper peacocks.',
    caption: 'The trophy and certificate that came back with them',
    depictsChildren: true,
  },
  {
    file: 'kg-dance-ourladys-garden.jpg',
    filename: 'kg-dance-ourladys-garden.jpg',
    focalY: 60,
    unit: 'kindergarten',
    category: 'Achievements',
    alt: 'Thirteen Kindergarten children in regional Indian costume on stage with three teachers, one child holding a trophy and another a certificate, beneath an Our Lady’s Garden banner.',
    caption: 'Our Lady’s Garden — a trophy and a certificate for the group dance',
    depictsChildren: true,
  },
  {
    file: 'kg-fancy-dress-entrants.jpg',
    filename: 'kg-fancy-dress-entrants.jpg',
    focalY: 58,
    unit: 'kindergarten',
    category: 'Events and outings',
    alt: 'Six Kindergarten children in fancy dress with numbered cards pinned to them — a fruit seller, a pilot, a beauty queen, a campaigner, Spider-Man and a bunch of grapes — with three teachers behind and a cardboard aeroplane at their feet.',
    caption: 'Six entrants, six costumes made at home',
    depictsChildren: true,
  },
  {
    file: 'kg-prize-distribution-2025.jpg',
    filename: 'kg-prize-distribution-2025.jpg',
    unit: 'kindergarten',
    category: 'Achievements',
    /* Portrait, and the faces are in the lower half — see the focal point. */
    focalY: 62,
    alt: 'Kindergarten children in yellow and green uniform holding Certificates of Honour and wrapped prizes, under paper lanterns and a banner reading “Annual Prize Distribution 2024-25”.',
    caption: 'Annual prize distribution',
    depictsChildren: true,
  },
  {
    file: 'kg-prize-distribution-2025-group.jpg',
    filename: 'kg-prize-distribution-2025-group.jpg',
    unit: 'kindergarten',
    category: 'Achievements',
    alt: 'Sixteen Kindergarten children kneeling and standing with wrapped prizes and Inter Class Competition certificates of honour, in front of a gold and white prize-day backdrop.',
    caption: 'Certificates of honour from the inter-class competition',
    depictsChildren: true,
  },
  {
    file: 'kg-annual-sports-prizes.jpg',
    filename: 'kg-annual-sports-prizes.jpg',
    focalY: 60,
    unit: 'kindergarten',
    category: 'Sports',
    alt: 'Fifteen Kindergarten children in red and black sports kit holding trophies and Annual School Sports certificates, in a classroom painted with a yellow submarine, beneath a banner reading “Annual Prize Distribution — SIWS KG Section”.',
    caption: 'Annual school sports — the Kindergarten prize day',
    depictsChildren: true,
  },
  {
    file: 'kg-stage-regional-dance.jpg',
    filename: 'kg-stage-regional-dance.jpg',
    unit: 'kindergarten',
    category: 'Events and outings',
    alt: 'A long line of Kindergarten children in green and pink Maharashtrian costume standing across a stage at the end of a performance.',
    caption: 'The whole line, at the end of the dance',
    depictsChildren: true,
  },
  {
    file: 'kg-dance-rehearsal.jpg',
    filename: 'kg-dance-rehearsal.jpg',
    unit: 'kindergarten',
    category: 'Events and outings',
    /*
     * "In costume" was wrong — they are in ordinary school uniform, barefoot,
     * on floor marks. Checked against the photograph on 2026-09-02, because
     * alt text is the whole of what a blind reader gets and a detail nobody
     * verified is a detail invented.
     */
    alt: 'Kindergarten children rehearsing a dance in the school hall, barefoot and in school uniform with yellow headbands, spread across floor markings mid-step.',
    caption: 'Rehearsing in the hall, the week before',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-literacy.jpg',
    filename: 'kg-activity-literacy.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'Kindergarten children seated at curved tables working through printed worksheets, with a number line on the blackboard behind them.',
    caption: 'Worksheets and number work in the early years',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-creative.jpg',
    filename: 'kg-activity-creative.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'Kindergarten children gathered around a table making a finger-painting in orange and green on yellow paper.',
    caption: 'Finger painting and activity-based learning',
    depictsChildren: true,
  },
  {
    file: 'kg-activity-motor.jpg',
    filename: 'kg-activity-motor.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'A full kindergarten class standing around a curved table, one child holding up a handprint flag they have made together.',
    caption: 'Hands-on work the whole class makes together',
    depictsChildren: true,
  },
  {
    file: 'smart-board.jpg',
    filename: 'kg-smart-board.jpg',
    alt: 'A young student in school uniform reaching up to draw on an interactive smart board with a stylus.',
    caption: 'Interactive smart boards in every classroom',
    depictsChildren: true,
  },
  {
    file: 'drawing-class.jpg',
    filename: 'kg-drawing-class.jpg',
    alt: 'Students at wooden desks in a classroom, each colouring a drawing with crayons.',
    caption: 'Quiet, focused work at every desk',
    depictsChildren: true,
  },
  {
    file: 'green-skills.jpg',
    filename: 'siws-green-skills.jpg',
    unit: 'secondary',
    category: 'Beyond the classroom',
    alt: 'Sixteen Secondary School students in two rows on a school veranda, each holding a potted plant or sapling they have grown.',
    caption: 'Nurturing nature and building green skills together.',
    depictsChildren: true,
  },
  {
    file: 'natya-tarang.jpg',
    filename: 'siws-natya-tarang.jpg',
    unit: 'kindergarten',
    category: 'Events and outings',
    alt: 'A stage full of young SIWS students in bright regional costume, arms raised mid-performance, at the Natya Tarang inter-school dance competition.',
    caption: 'Natya Tarang — our inter-school dance and music competition',
    depictsChildren: true,
  },
  {
    file: 'yoga-meditation.jpeg',
    filename: 'siws-yoga-meditation.jpg',
    unit: 'secondary',
    category: 'Beyond the classroom',
    alt: 'Rows of Secondary students in house-colour sports shirts seated cross-legged on mats in the school hall, eyes closed, during a guided meditation session.',
    caption: 'Practicing mindfulness and focus together.',
    depictsChildren: true,
  },
  /*
   * JUNIOR COLLEGE, three occasions from 2026.
   *
   * The section's first photographs of its own — until these arrived every
   * Junior College page was text and its gallery was unpublished for having
   * nothing to show.
   *
   * All three show identifiable students, so all three need a permission
   * record before the pages carrying them will publish (FR-PRV-11).
   */
  {
    file: 'jc-independence-day-2026.jpeg',
    filename: 'jc-independence-day-2026.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students in ceremonial white uniform and maroon berets kneeling and standing in rows on the college ground beneath an unfurled national flag, with staff and families behind them.',
    caption: 'Independence Day on the college ground, 15 August 2026',
    /*
     * CROPPED, and then anchored.
     *
     * The camera caught a thumb over the top-left corner of the original. A
     * corner cannot be cropped out by taking a little off two sides — a
     * rectangle has to lose a whole band — so the top 250 rows went, which
     * also took the empty sky and the roof and tightened the frame onto the
     * people. The hoisted flag on the pole went with it; the large tricolour
     * draped on the wall behind the group did not, and it is the one that
     * reads at any size.
     *
     * 1600x950 now. The group sits across the middle with bare pitch below,
     * so the crop is still anchored high enough to keep the faces.
     */
    focalY: 38,
    depictsChildren: true,
  },
  {
    file: 'jc-orientation-2026.jpeg',
    filename: 'jc-orientation-2026.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The college hall filled with seated students listening to a speaker addressing them with a microphone, with staff standing along the sides.',
    caption: 'The orientation programme for new students, 15 July 2026',
    depictsChildren: true,
  },
  {
    file: 'jc-yoga-meditation-2026.jpeg',
    filename: 'jc-yoga-meditation-2026.jpg',
    unit: 'junior-college',
    category: 'Wellbeing',
    alt: 'Junior College students seated cross-legged in rows on the open ground with their eyes closed and hands resting on their knees, during a guided meditation.',
    caption: 'Yoga and meditation on the college ground',
    depictsChildren: true,
  },
  {
    file: 'jc-independence-day-2025.jpeg',
    filename: 'jc-independence-day-2025.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students in white kurtas with tricolour sashes standing in formation in the college hall during a patriotic performance, one of them holding up a picture of an Indian Navy fleet.',
    caption: 'A patriotic performance in the hall, Independence Day 2025',
    depictsChildren: true,
  },
  {
    file: 'jc-pongal-celebration.jpeg',
    filename: 'jc-pongal-celebration.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    /*
     * A 1600x739 panorama — the widest picture in the library by some way.
     * It is a room-length line of people, so any crop tighter than about
     * 2:1 loses somebody off one end. Best used at full width.
     */
    alt: 'Staff of the college standing in a long line across the hall in bright silk sarees, beneath Tamil banners and bunting, with sugarcane framing a Pongal Thiruvizha backdrop.',
    caption: 'Pongal Thiruvizha in the college hall',
    // Staff, not students.
    depictsChildren: false,
  },
  {
    file: 'jc-evs-field-visit.jpeg',
    filename: 'jc-evs-field-visit.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A group of college students and their teachers standing among trees on a woodland trail, one photographing a sapling closely while the others look on.',
    caption: 'An environmental studies field visit',
    depictsChildren: true,
  },
  {
    file: 'jc-library.jpeg',
    filename: 'jc-library.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'The college library on an ordinary afternoon — students reading and working at long tables by a row of windows, with book stacks, computers and a globe on the counter.',
    caption: 'The college library',
    depictsChildren: true,
  },
  {
    file: 'jc-physics-laboratory.jpeg',
    filename: 'jc-physics-laboratory.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A member of the physics department at a laboratory bench setting up a measuring cylinder and apparatus, with a resistance box and a case of instruments laid out beside him.',
    caption: 'Setting up an experiment in the physics laboratory',
    depictsChildren: false,
  },
  {
    file: 'jc-physics-charts.jpeg',
    filename: 'jc-physics-charts.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A hand-made physics chart on units and physical quantities, with coloured panels on errors, dimensions and measurement around a table of formulae and SI units.',
    caption: 'Units and physical quantities — a chart made by students',
    // Written work, no one in the frame.
    depictsChildren: false,
    // Read rather than admired: never cropped.
    showWhole: true,
  },

  /*
   * Supplied by SIWS on 2026-09-01 for the Kindergarten campus row.
   *
   * All four show identifiable children, so all four are `depictsChildren` and
   * none of them publishes until `npm run record:consent` has covered them.
   *
   * The alt text was written from the photographs themselves rather than from
   * their filenames — the note at the top of this file explains why that
   * distinction matters, and it is the only way "a child at the back holding
   * up a handmade tricolour" gets said at all.
   */
  {
    file: 'kg-play-slide.jpg',
    filename: 'kg-play-slide.jpg',
    category: 'Play and activity',
    alt: 'Kindergarten children playing on a red slide and climbing frame under a canopy, on the green artificial-turf play area, one child mid-slide and others waiting their turn on the platform above.',
    caption: 'The covered play area',
    depictsChildren: true,
  },
  {
    file: 'kg-classroom-full-class.jpg',
    filename: 'kg-classroom-full-class.jpg',
    unit: 'kindergarten',
    category: 'In the classroom',
    alt: 'A full kindergarten class in yellow and green SIWS uniform standing all the way around a large curved white table, with a child at the back holding up a handmade Indian flag made from painted handprints.',
    caption: 'A full class around the curved group table',
    depictsChildren: true,
  },
  {
    /*
     * An OUTING, not a facility — the venue is a commercial play centre and its
     * branding is the largest thing in the frame. Filed under "Beyond the
     * classroom" for that reason, and the caption says outing in as many
     * words, so nothing here can be read as something the campus has.
     */
    file: 'kg-outing-play-space.jpg',
    filename: 'kg-outing-play-space.jpg',
    unit: 'kindergarten',
    category: 'Events and outings',
    alt: 'A kindergarten class posing together on a low round stage in front of a brightly lit space-themed backdrop at an indoor play centre, during a class outing.',
    caption: 'A class outing to an indoor play space',
    depictsChildren: true,
  },
  {
    file: 'kg-sports-day-winners.jpg',
    filename: 'kg-sports-day-winners.jpg',
    unit: 'kindergarten',
    category: 'Sports',
    alt: 'Thirteen kindergarten children holding certificates and trophies, seated and standing in two rows beneath a banner reading “Welcome to SIWS KG Section Sport’s Day”.',
    caption: 'Prize day at the Kindergarten annual sports',
    depictsChildren: true,
  },
  {
    file: 'kg-sports-day-podium.jpg',
    filename: 'kg-sports-day-podium.jpg',
    unit: 'kindergarten',
    category: 'Sports',
    alt: 'Four kindergarten children in red and navy sports kit on a winners’ podium numbered 1, 2 and 3, each holding a gold trophy, with a table of further trophies behind them on the turf pitch.',
    caption: 'On the podium at the Kindergarten sports day',
    depictsChildren: true,
  },
  /*
   * THE JUNIOR COLLEGE'S OWN PHOTOGRAPHS, sent by SIWS on 2026-09-02.
   *
   * Fifty-three, from the section's working folders — the classrooms, the four
   * laboratories and the library, department activities, career guidance, the
   * year's occasions, and the health and safety programmes. They are filed
   * into six categories, which is what the gallery seed groups the wall by.
   *
   * ALT TEXT HERE DESCRIBES THE SUBJECT, not the frame. It was written from
   * the folder each photograph came in and the name it was sent under rather
   * than from a reading of every one of the fifty-three, so it is accurate
   * about WHAT is shown and says nothing about how many people are in it or
   * what they are wearing. Anybody correcting one is correcting a description
   * that was deliberately general, not a guess that went wrong.
   *
   * `depictsChildren` is set wherever the photograph has people in it, which
   * is most of them. `record:consent` runs at step 3 of the refresh and covers
   * them; the flag is deliberately generous, since the cost of missing one is
   * publishing an identifiable student without a permission record.
   */
  {
    file: 'jc-classroom.jpg',
    filename: 'jc-classroom.jpg',
    unit: 'junior-college',
    category: 'In the classroom',
    alt: 'A Junior College lecture room with rows of wooden bench desks, ceiling fans and tube lights, empty between classes.',
    caption: 'Lecture rooms for Standards XI and XII',
    depictsChildren: false,
  },
  {
    file: 'jc-classroom-2.jpg',
    filename: 'jc-classroom-2.jpg',
    unit: 'junior-college',
    category: 'In the classroom',
    alt: 'A second Junior College lecture room, its bench desks in rows facing the teaching wall.',
    depictsChildren: false,
  },
  {
    file: 'jc-classroom-lecture.jpg',
    filename: 'jc-classroom-lecture.jpg',
    unit: 'junior-college',
    category: 'In the classroom',
    alt: 'A lecture in progress in a Junior College classroom, students at their desks facing the front.',
    depictsChildren: true,
  },
  {
    file: 'jc-classroom-session.jpg',
    filename: 'jc-classroom-session.jpg',
    unit: 'junior-college',
    category: 'In the classroom',
    alt: 'Students seated at bench desks during a class session in the Junior College.',
    depictsChildren: true,
  },
  {
    file: 'jc-canteen.jpg',
    filename: 'jc-canteen.jpg',
    unit: 'junior-college',
    category: 'In the classroom',
    alt: 'The college canteen, with seating for students between lectures.',
    caption: 'The canteen on the Wadala campus',
    depictsChildren: false,
  },
  {
    file: 'jc-physics-lab.jpg',
    filename: 'jc-physics-lab.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'Students and teaching staff of the Physics department standing together along the laboratory benches.',
    caption: 'The Physics laboratory',
    depictsChildren: true,
  },
  {
    file: 'jc-physics-lab-charts.jpg',
    filename: 'jc-physics-lab-charts.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'Physics laboratory wall charts above the working benches.',
    depictsChildren: false,
  },
  {
    file: 'jc-physics-practical.jpg',
    filename: 'jc-physics-practical.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'A Physics practical session at the laboratory benches.',
    depictsChildren: true,
  },
  {
    file: 'jc-chemistry-lab.jpg',
    filename: 'jc-chemistry-lab.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'The Chemistry laboratory, with benches laid out for practical work.',
    caption: 'The Chemistry laboratory',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-lab.jpg',
    filename: 'jc-biology-lab.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'The Biology laboratory, set up for a practical class.',
    caption: 'The Biology laboratory',
    depictsChildren: true,
  },
  {
    file: 'jc-computer-lab.jpg',
    filename: 'jc-computer-lab.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'The computer laboratory, used for Information Technology and Computer Science practicals.',
    caption: 'Information Technology and Computer Science practicals',
    depictsChildren: true,
  },
  {
    file: 'jc-library-shelves.jpg',
    filename: 'jc-library-shelves.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'The college library, its shelves stocked for the Commerce and Science streams.',
    caption: 'The library',
    depictsChildren: false,
  },
  {
    file: 'jc-library-reading.jpg',
    filename: 'jc-library-reading.jpg',
    unit: 'junior-college',
    category: 'Laboratories and library',
    alt: 'Reading space in the college library.',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-activity-1.jpg',
    filename: 'jc-biology-activity-1.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A Biology department activity, students working on their displays.',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-activity-2.jpg',
    filename: 'jc-biology-activity-2.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'Students presenting their work during a Biology department activity.',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-activity-3.jpg',
    filename: 'jc-biology-activity-3.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A Biology department activity in progress.',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-activity-4.jpg',
    filename: 'jc-biology-activity-4.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'Students at a Biology department activity, August 2026.',
    depictsChildren: true,
  },
  {
    file: 'jc-biology-activity-display.jpg',
    filename: 'jc-biology-activity-display.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A Biology activity display prepared by students.',
    depictsChildren: true,
  },
  {
    file: 'jc-maths-activity.jpg',
    filename: 'jc-maths-activity.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A Mathematics activity, students working through it together.',
    depictsChildren: true,
  },
  {
    file: 'jc-evs-activity.jpg',
    filename: 'jc-evs-activity.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'An Environmental Science activity session.',
    depictsChildren: true,
  },
  {
    file: 'jc-career-guidance-it.jpg',
    filename: 'jc-career-guidance-it.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A career guidance session on Information Technology, students seated for the talk.',
    caption: 'Career guidance for the Information Technology stream',
    depictsChildren: true,
  },
  {
    file: 'jc-career-guidance-commerce.jpg',
    filename: 'jc-career-guidance-commerce.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A career guidance session run by the Economics and Commerce departments.',
    caption: 'Career guidance from the Economics and Commerce departments',
    depictsChildren: true,
  },
  {
    file: 'jc-career-counselling-1.jpg',
    filename: 'jc-career-counselling-1.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A career counselling session for Commerce students.',
    depictsChildren: true,
  },
  {
    file: 'jc-career-counselling-2.jpg',
    filename: 'jc-career-counselling-2.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'Students at a career counselling session, September 2026.',
    depictsChildren: true,
  },
  {
    file: 'jc-orientation-programme.jpg',
    filename: 'jc-orientation-programme.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'The orientation programme for new students entering Standard XI.',
    caption: 'Orientation for the incoming Standard XI year',
    depictsChildren: true,
  },
  {
    file: 'jc-pta-meeting.jpg',
    filename: 'jc-pta-meeting.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A parent-teacher association meeting at the college.',
    caption: 'Parents and teachers meeting',
    depictsChildren: true,
  },
  {
    file: 'jc-staff-meeting.jpg',
    filename: 'jc-staff-meeting.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A staff meeting of the Junior College teaching team.',
    depictsChildren: true,
  },
  {
    file: 'jc-teachers-training-nep.jpg',
    filename: 'jc-teachers-training-nep.jpg',
    unit: 'junior-college',
    category: 'Careers and guidance',
    alt: 'A teacher training programme on the National Education Policy.',
    caption: 'Teacher training on the National Education Policy',
    depictsChildren: true,
  },
  {
    file: 'jc-independence-day-2025-flag.jpg',
    filename: 'jc-independence-day-2025-flag.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Independence Day at the college in 2025, students assembled beneath the national flag.',
    caption: 'Independence Day, 2025',
    depictsChildren: true,
  },
  {
    file: 'jc-independence-day-2025-2.jpg',
    filename: 'jc-independence-day-2025-2.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students at the Independence Day assembly, 2025.',
    depictsChildren: true,
  },
  {
    file: 'jc-independence-day-2025-3.jpg',
    filename: 'jc-independence-day-2025-3.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Independence Day programme on the college ground, 2025.',
    depictsChildren: true,
  },
  {
    file: 'jc-independence-day-2026-assembly.jpg',
    filename: 'jc-independence-day-2026-assembly.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Independence Day assembly on 15 August 2026.',
    caption: 'Independence Day, 15 August 2026',
    depictsChildren: true,
  },
  {
    file: 'jc-pongal-stage.jpg',
    filename: 'jc-pongal-stage.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Pongal day celebration at the college.',
    caption: 'Pongal at the college',
    depictsChildren: true,
  },
  {
    file: 'jc-pongal-day.jpg',
    filename: 'jc-pongal-day.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students taking part in the Pongal day programme.',
    depictsChildren: true,
  },
  {
    file: 'jc-pongal-rangoli.jpg',
    filename: 'jc-pongal-rangoli.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'A rangoli laid for the Pongal celebration.',
    depictsChildren: false,
  },
  {
    file: 'jc-pongal-pot.jpg',
    filename: 'jc-pongal-pot.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The traditional Pongal pot prepared for the celebration.',
    depictsChildren: false,
  },
  {
    file: 'jc-rangoli.jpg',
    filename: 'jc-rangoli.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'A rangoli made by students on the college floor.',
    caption: 'Rangoli by the students',
    depictsChildren: false,
  },
  {
    file: 'jc-rangoli-2.jpg',
    filename: 'jc-rangoli-2.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'A second rangoli design laid by students.',
    depictsChildren: false,
  },
  {
    file: 'jc-mehendi-competition.jpg',
    filename: 'jc-mehendi-competition.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The mehendi competition, students at work on their designs.',
    caption: 'The mehendi competition',
    depictsChildren: true,
  },
  {
    file: 'jc-cultural-day.jpg',
    filename: 'jc-cultural-day.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The college cultural day programme.',
    caption: 'Cultural day',
    depictsChildren: true,
  },
  {
    file: 'jc-cultural-performance.jpg',
    filename: 'jc-cultural-performance.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'A student performance on cultural day.',
    depictsChildren: true,
  },
  {
    file: 'jc-cultural-performance-2.jpg',
    filename: 'jc-cultural-performance-2.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students performing at the cultural programme.',
    depictsChildren: true,
  },
  {
    file: 'jc-cultural-performance-3.jpg',
    filename: 'jc-cultural-performance-3.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'A group performance at the college cultural programme.',
    depictsChildren: true,
  },
  {
    file: 'jc-guru-poornima.jpg',
    filename: 'jc-guru-poornima.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Guru Poornima observance at the college.',
    caption: 'Guru Poornima',
    depictsChildren: true,
  },
  {
    file: 'jc-guru-poornima-2.jpg',
    filename: 'jc-guru-poornima-2.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Students and staff at the Guru Poornima programme.',
    depictsChildren: true,
  },
  {
    file: 'jc-ashadhi-ekadashi.jpg',
    filename: 'jc-ashadhi-ekadashi.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Ashadhi Ekadashi observance at the college.',
    caption: 'Ashadhi Ekadashi',
    depictsChildren: true,
  },
  {
    file: 'jc-samvidhan-day.jpg',
    filename: 'jc-samvidhan-day.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'Samvidhan Day, marking the adoption of the Constitution.',
    caption: 'Samvidhan Day',
    depictsChildren: true,
  },
  {
    file: 'jc-saurya-day.jpg',
    filename: 'jc-saurya-day.jpg',
    unit: 'junior-college',
    category: 'Occasions',
    alt: 'The Saurya day programme at the college.',
    depictsChildren: true,
  },
  {
    file: 'jc-vision-health-camp.jpg',
    filename: 'jc-vision-health-camp.jpg',
    unit: 'junior-college',
    category: 'Wellbeing',
    alt: 'A vision and health camp held at the college for students.',
    caption: 'A vision and health camp for students',
    depictsChildren: true,
  },
  {
    file: 'jc-rabies-awareness.jpg',
    filename: 'jc-rabies-awareness.jpg',
    unit: 'junior-college',
    category: 'Wellbeing',
    alt: 'A rabies awareness session for students.',
    caption: 'Rabies awareness session',
    depictsChildren: true,
  },
  {
    file: 'jc-fire-safety-training.jpg',
    filename: 'jc-fire-safety-training.jpg',
    unit: 'junior-college',
    category: 'Wellbeing',
    alt: 'A fire management and safety training programme on the campus.',
    caption: 'Fire safety training',
    depictsChildren: true,
  },
  {
    file: 'jc-student-activity.jpg',
    filename: 'jc-student-activity.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'Students taking part in a college activity session.',
    depictsChildren: true,
  },
  {
    file: 'jc-student-activity-2.jpg',
    filename: 'jc-student-activity-2.jpg',
    unit: 'junior-college',
    category: 'Learning',
    alt: 'A second view of students at a college activity session.',
    depictsChildren: true,
  },
  /*
   * THE PRIMARY SECTION'S OWN PHOTOGRAPHS, sent by SIWS on 2026-09-02.
   *
   * Thirteen, from the section's working folders. Two pairs in those folders
   * were the same file under two names — one smart-board picture filed under
   * both "around the campus" and "why parents choose", and one classroom
   * picture filed as both "individual care" and "experienced teachers" — so
   * fifteen files are thirteen photographs here.
   *
   * THE CAMPUS NAMES ARE GONE FROM THE FILENAMES. Four arrived as "wadala
   * banner" and "matunga banner"; the Primary Section has since merged into
   * one school, so a library name carrying a campus would outlive the thing it
   * names. They are numbered instead.
   *
   * `campus under cctv.heif` was converted to JPEG on the way in — nothing in
   * the pipeline reads HEIF.
   */
  {
    file: 'primary-classroom-full.jpg',
    filename: 'primary-classroom-full.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A full Primary class in striped uniform at their bench desks, turning towards the camera with their teacher’s room around them.',
    caption: 'A full class at work',
    depictsChildren: true,
  },
  {
    file: 'primary-classroom-group-1.jpg',
    filename: 'primary-classroom-group-1.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'Primary children at their desks during a lesson.',
    depictsChildren: true,
  },
  {
    file: 'primary-classroom-group-2.jpg',
    filename: 'primary-classroom-group-2.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A Primary classroom mid-lesson, children at bench desks with their bags beside them.',
    depictsChildren: true,
  },
  {
    file: 'primary-classroom-desks.jpg',
    filename: 'primary-classroom-desks.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'Primary pupils seated at their desks in class.',
    depictsChildren: true,
  },
  {
    file: 'primary-smart-board.jpg',
    filename: 'primary-smart-board.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A Primary pupil at the interactive smart board, writing on it with a stylus.',
    caption: 'Smart boards in every classroom',
    depictsChildren: true,
  },
  {
    file: 'primary-academics.jpg',
    filename: 'primary-academics.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A Primary academic session in progress.',
    depictsChildren: true,
  },
  {
    file: 'primary-individual-care.jpg',
    filename: 'primary-individual-care.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A teacher working with a pupil one to one.',
    caption: 'Individual attention for every child',
    depictsChildren: true,
  },
  {
    file: 'primary-teachers-dedicated.jpg',
    filename: 'primary-teachers-dedicated.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A Primary teacher with her class.',
    caption: 'Teachers of twenty years’ standing and more',
    depictsChildren: true,
  },
  {
    /*
     * SENT AS "campus under cctv.heif" AND IT IS NEITHER.
     *
     * It is a full class writing at their desks — no camera in the frame, and
     * nothing of the campus outside the room. Filed by what it shows rather
     * than by the name it arrived under, which would have put a classroom
     * alone under "Around the campus" and left it as a category of one at the
     * foot of the wall.
     *
     * It also arrived on its side. HEIF records rotation as metadata and the
     * conversion to JPEG dropped it, so the photograph was ninety degrees out
     * until it was turned and written back upright.
     */
    file: 'primary-classroom-writing.jpg',
    filename: 'primary-classroom-writing.jpg',
    unit: 'primary',
    category: 'In the classroom',
    alt: 'A full Primary class at their bench desks, writing in exercise books, with subject charts on the wall behind them.',
    caption: 'A full class at work',
    depictsChildren: true,
  },
  {
    file: 'primary-holistic-development.jpg',
    filename: 'primary-holistic-development.jpg',
    unit: 'primary',
    category: 'Beyond the classroom',
    alt: 'Primary children taking part in an activity beyond the timetable.',
    caption: 'Learning beyond the syllabus',
    depictsChildren: true,
  },
  {
    file: 'primary-moving-up.jpg',
    filename: 'primary-moving-up.jpg',
    unit: 'primary',
    category: 'Beyond the classroom',
    alt: 'Primary pupils on the path up through the SIWS Group, from Grade 1 onwards.',
    caption: 'A pathway from Kindergarten to Junior College',
    depictsChildren: true,
  },
  {
    file: 'primary-student-life.jpg',
    filename: 'primary-student-life.jpg',
    unit: 'primary',
    category: 'Beyond the classroom',
    alt: 'Primary children during a school activity.',
    depictsChildren: true,
  },
  {
    file: 'primary-cultural-dress.jpg',
    filename: 'primary-cultural-dress.jpg',
    unit: 'primary',
    /*
     * With the other things that happen outside a lesson, rather than alone
     * under 'Occasions'. Primary has one photograph of an occasion, and a
     * category of one is folded into "More photographs" at the foot of the
     * wall — which is a worse place for it than beside the activities.
     */
    category: 'Beyond the classroom',
    alt: 'Primary children in traditional Maharashtrian dress holding saffron flags on the school ground, with their teacher beside them.',
    caption: 'In traditional dress for the occasion',
    depictsChildren: true,
  },
]

/*
 * The name-matching lives in `@/utilities/media-lookup` now.
 *
 * It was two one-line helpers here, and one of them was wrong: `/-d+(.[^.]+)$/`
 * matches a literal letter "d", not a digit, so it never stripped Payload's
 * collision counter and never recognised a photograph this script had already
 * uploaded. Every run therefore uploaded the whole set again — `-1`, then `-2`,
 * then `-3` — while the pages went on pointing at whichever copy was written
 * last. The seed written to stop duplicates was the thing making them.
 *
 * Three other seeds had their own copies of the same idea, two of them
 * exact-match only. One shared implementation is the fix.
 */

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const unitId = new Map(units.map((u) => [String(u.slug), u.id]))
  const kg = unitId.get('kindergarten')
  if (!kg) throw new Error('Kindergarten unit not found. Run `npm run seed` first.')

  /*
   * A row naming a section that is not in the database is a typo, and filing
   * its photograph under Kindergarten instead would hide the mistake on a
   * wall where somebody would eventually have to find it by eye.
   */
  const unitFor = (image: ImageSeed) => {
    if (!image.unit) return kg
    const id = unitId.get(image.unit)
    if (!id) throw new Error(`${image.filename}: no unit with the slug "${image.unit}"`)
    return id
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siws-media-'))
  let created = 0
  let updated = 0
  const flagged: string[] = []

  try {
    for (const image of IMAGES) {
      const source = path.join(SOURCE_DIR, image.file)
      if (!fs.existsSync(source)) {
        payload.logger.warn(`Skipping ${image.file} — not found in ${SOURCE_DIR}`)
        continue
      }

      // `rotate()` with no argument applies the EXIF orientation, so portrait
      // photographs off a phone are not served on their side.
      const resized = path.join(workDir, image.filename)
      await sharp(source)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(resized)

      /*
       * Matched on the base name, not the exact one.
       *
       * Payload appends `-1`, `-2`… when the name it wants is taken on disk,
       * and this repository commits `media/`, so every name here is taken
       * before the first run. An exact match therefore stopped finding the
       * rows this script had written itself and uploaded the whole library
       * again: eight photographs became sixteen, and the focal points and
       * consent records stayed on the copies nothing pointed at any more.
       */
      const existingId = await findMediaId(payload, image.filename)

      const data = {
        alt: image.alt,
        caption: image.caption,
        unit: unitFor(image),
        ...(image.category === undefined ? {} : { category: image.category }),
        ...(image.showInGallery === undefined ? {} : { showInGallery: image.showInGallery }),
        ...(image.showWhole === undefined ? {} : { showWhole: image.showWhole }),
        depictsChildren: image.depictsChildren,
        ...(image.focalY === undefined ? {} : { focalX: 50, focalY: image.focalY }),
      }

      if (existingId !== null) {
        /*
         * No `filePath` on the update path. Passing one made Payload write
         * the binary again on every run, and because the name was already
         * taken it landed as `kg-play-area-2.jpg` — so a re-run renamed the
         * library out from under `photo('kg-play-area.jpg')` and the banner,
         * both photographic bands and the History picture vanished from the
         * home page. The picture has not changed between runs; only the words
         * and the focal point can, so only those are written.
         */
        await payload.update({
          collection: 'media',
          id: existingId,
          data: data as never,
          overrideAccess: true,
        })
        updated += 1
        payload.logger.info(`Updated media: ${image.filename}`)
      } else {
        await payload.create({
          collection: 'media',
          data: data as never,
          filePath: resized,
          overrideAccess: true,
        })
        created += 1
        payload.logger.info(`Uploaded media: ${image.filename}`)
      }

      if (image.needsLicenceCheck) flagged.push(image.filename)
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }

  payload.logger.info(`Media seed complete — ${created} uploaded, ${updated} updated.`)

  const childImages = IMAGES.filter((image) => image.depictsChildren).length
  payload.logger.warn(
    `${childImages} images are marked as showing identifiable students. Verifiable parental consent must be recorded for each before go-live.`,
  )

  if (flagged.length > 0) {
    payload.logger.warn(
      `These do not appear to be SIWS's own photography — please confirm the licence: ${flagged.join(', ')}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Media seed failed:', error)
    process.exit(1)
  })
