import { loadEnv } from '@/utilities/load-env'

loadEnv()

import fs from 'fs'
import path from 'path'

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { bulletList, richTextNodes } = await import('@/seed/lexical')
const { findMediaId } = await import('@/utilities/media-lookup')

/**
 * Writes the institution's Sports page, and the Fencing page it leads to, from
 * the two documents SIWS sent on 2026-10-13: "SIWS School Sports – Website
 * Intro Page" and "SIWS Fencing Program – Official School Website Content".
 *
 * THE FOURTH VERSION OF THE SPORTS PAGE, and the first that is theirs. The
 * brief came first as a numbered Q&A, and the page went from tick lists to
 * prose to prose rewritten in a higher register, each at SIWS's asking. This
 * time they have sent the page itself — headed sections, a table of fifteen
 * sports, a spotlight on fencing — with one instruction about its form: "I
 * want it to look really good and well designed, modern design, images,
 * banners."
 *
 * So the WORDS ARE THEIRS and the DESIGN IS THE SITE'S. Nothing is rewritten:
 * every sentence, figure and name is as the documents give it. What is ours
 * is which of the site's sections carries each part, and those were chosen so
 * that a section's shape says what its content is:
 *
 *   - a banner over a photograph, with the three figures the page opens on;
 *   - the fifteen sports as a grid of tiles. Their table has three columns
 *     and five rows that are empty in two of them, which on a phone is a
 *     scroll sideways through blanks; a tile says the same thing in a line;
 *   - FENCING AS A BAND OF ITS OWN, across the full width, over a photograph
 *     of a bout. The document calls it the flagship and gives it a spotlight,
 *     and it is the one sport with a page behind it;
 *   - the governing bodies as a list of a name and what it stands for,
 *     because that is what MSSA, DSO and ZP are;
 *   - honours as cards labelled Team or Individual, as their two lists are.
 *
 * THE PHOTOGRAPHS are the schools' own, already in the library with their
 * permission records, and each is of what it sits beside: students at yoga on
 * the Wadala ground under "Healthy Body, Healthy Mind"; the Kindergarten's
 * children beside "every child plays"; the football league line-up beside
 * the teams; the Sports Day podium beside Sports Day.
 *
 * The fencing photograph is the Junior College's, taken at the district-level
 * competition on 3 October 2026 and published by the College with its
 * fencer's result. It is uploaded here as its own record, with a description
 * a blind visitor can use — the College's copy is described as "Acheivements"
 * — and it is the frame in which both fencers are masked, so it shows the
 * sport and no child's face. It is NOT a photograph of the SIWS Fencing
 * Center or of the college team the page describes, and nothing beside it
 * says it is: there is none of either in the library. When SIWS sends one,
 * it replaces this.
 *
 * FOUR THINGS ARE NOT AS THE DOCUMENTS HAVE THEM:
 *   - "the South Indian Welfare Society" is set as the Society's name is on
 *     every other page, the South Indians’ Welfare Society;
 *   - "program" is "programme" on the Fencing page, as the Sports document
 *     itself spells it and the rest of the site does. "SIWS Fencing Center"
 *     is a name, used in both documents, and is left alone;
 *   - the Fencing document ends "Contact your class teacher for more
 *     details:" with nothing after the colon. It is set as a sentence;
 *   - "Link: Learn more about Fencing at SIWS → [Fencing page]" is a note to
 *     us, and is the button it describes.
 *
 * THE FENCING PAGE IS NOT ON THE MENU. It is reached from the Sports page's
 * banner and from the foot of the spotlight. A tab is a change to the header
 * of every page of the main site, and nobody asked for one.
 *
 * REFUSES A PAGE SOMEBODY HAS WRITTEN — each of the two. `--force` is there
 * for a re-run after a change to this script, which for Sports is what this
 * is: the page on the live site is still exactly what the last version wrote.
 *
 * Usage:  npx tsx src/scripts/write-portal-sports-page.ts [--apply] [--force]
 */

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

/* --- photographs ---------------------------------------------------------- */

/** Already in the library, on the live site as well as here. */
const PHOTOS = {
  ground: 'jc-yoga-meditation-2026.jpg',
  children: 'kg-children-together.jpg',
  football: 'secondary-football-league-teams.jpg',
  hall: 'siws-yoga-meditation.jpg',
  race: 'kg-sports-race.jpg',
  winners: 'primary-sports-day-podium-k.jpg',
  podium: 'primary-sports-day-podium-a.jpg',
  prizes: 'kg-annual-sports-prizes.jpg',
} as const

/** Uploaded by this script, from the repository. */
const BOUT = {
  filename: 'siws-fencing-bout-district-2026.jpg',
  /*
   * Where the two fencers are in the frame: right of centre and low. Every
   * crop of the photograph is taken about this point, so a banner three times
   * as wide as it is tall still has both of them in it and not the ceiling.
   */
  focalX: 58,
  focalY: 66,
  alt: 'Two fencers in white kit and masks in the middle of a bout, one lunging, on a red and blue matted piste in a sports hall, with officials watching from the side.',
  caption: 'A bout at the district-level fencing competition, October 2026.',
}

/* --- Lexical, as much of it as these pages need --------------------------- */

const BOLD = 1

/** Shared shape for every element node. Lexical rejects nodes missing these. */
const element = { format: '' as const, indent: 0, version: 1, direction: 'ltr' as const }

const t = (body: string, format = 0) => ({
  type: 'text',
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: body,
  version: 1,
})
const b = (body: string) => t(body, BOLD)

type Inline = ReturnType<typeof t>

const p = (children: string | Inline[]) => ({
  type: 'paragraph',
  ...element,
  textFormat: 0,
  children: typeof children === 'string' ? [t(children)] : children,
})

const h3 = (body: string) => ({ type: 'heading', tag: 'h3', ...element, children: [t(body)] })

/** A list whose items open on a bold term, as the documents set them. */
const termList = (entries: [term: string, detail: string][]) => ({
  type: 'list',
  listType: 'bullet' as const,
  tag: 'ul' as const,
  start: 1,
  ...element,
  children: entries.map(([term, detail], index) => ({
    type: 'listitem',
    value: index + 1,
    ...element,
    children: [b(term), t(detail)],
  })),
})

const text = (...nodes: unknown[]) => richTextNodes(nodes)

/** A button to one of our own pages. */
const button = (label: string, pageId: number, appearance: 'primary' | 'secondary' = 'primary') => ({
  link: {
    label,
    type: 'internal',
    reference: { relationTo: 'pages', value: pageId },
    appearance,
  },
})

type Ids = Record<keyof typeof PHOTOS | 'bout', number>

/* --- the Sports page ------------------------------------------------------ */

const COACHED = 'Regular coaching.'

const sportsLayout = (photo: Ids, fencingPage: number) => [
  /*
   * The banner. Their opening three lines are the eyebrow, the title and the
   * sentence under it; the three figures are the ones their first two
   * sections turn on.
   */
  {
    blockType: 'hero',
    eyebrow: 'Healthy Body, Healthy Mind',
    title: 'Sports at SIWS School',
    accentWord: 'Sports',
    intro:
      '15 sports including our championship-winning Fencing programme, expert coaching, and a place in the team for every child.',
    image: photo.ground,
    highlights: [
      { value: '15', label: 'sports to choose from' },
      { value: '85%+', label: 'of students from Std 1 to 10 take part' },
      { value: '300+', label: 'students in after-school coaching' },
    ],
    links: [button('Fencing at SIWS', fencingPage)],
  },
  {
    blockType: 'mediaText',
    heading: 'Our philosophy',
    accentWord: 'philosophy',
    headingLevel: 'h2',
    background: 'white',
    imagePosition: 'right',
    imageShape: 'rounded',
    image: photo.children,
    content: text(
      p([
        t('At SIWS School, we believe sport is an integral part of education, not an add-on. Guided by the motto '),
        b('“Healthy Body, Healthy Mind”'),
        t(', we use sport to build discipline, teamwork, leadership and resilience in every student.'),
      ]),
      p([
        t('We follow a '),
        b('“Sports for All”'),
        t(' policy: every child plays. Today more than '),
        b('85% of students from Std 1 to 10'),
        t(' take part in sports, and over '),
        b('300 students'),
        t(' train in our regular after-school coaching programme.'),
      ]),
    ),
  },
  /*
   * Their table, a row to a tile. "Yes" under Regular coaching is the line
   * "Regular coaching."; what is under School team follows it. The five
   * sports with neither say only their name, as the five rows do.
   */
  {
    blockType: 'featureList',
    heading: 'Sports we offer',
    accentWord: 'we offer',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'compact',
    columns: '3',
    intro: text(
      p([
        t('Students can choose from '),
        b('15 sports'),
        t(', with regular coaching in 8 of them. Seven are coached '),
        b('4 days a week after school'),
        t(', and Fencing is coached at the dedicated SIWS Fencing Center with the Elite Fencing Club.'),
      ]),
    ),
    items: [
      {
        title: 'Fencing',
        description:
          'Regular coaching at the SIWS Fencing Center. Women’s team: Mumbai University champions.',
      },
      { title: 'Football', description: `${COACHED} School teams: boys and girls.` },
      { title: 'Cricket', description: `${COACHED} School team.` },
      { title: 'Basketball', description: `${COACHED} School teams: boys and girls.` },
      { title: 'Athletics', description: `${COACHED} School team.` },
      { title: 'Badminton', description: `${COACHED} School team.` },
      { title: 'Table Tennis', description: `${COACHED} School team.` },
      { title: 'Chess', description: `${COACHED} School team.` },
      { title: 'Volleyball', description: 'School team.' },
      { title: 'Kho-Kho', description: 'School team.' },
      { title: 'Kabaddi' },
      { title: 'Carrom' },
      { title: 'Yoga' },
      { title: 'Karate' },
      { title: 'Skating' },
    ],
  },

  /*
   * A row of photographs between the list of sports and the one sport that
   * gets a section to itself. It is the gallery pages' own wall, which shows
   * each photograph whole, in a tile its own shape — and three landscape
   * frames, because those fill one row edge to edge where a fourth, upright
   * one was left alone on a second. Each caption says what the picture is of
   * and no more: these are the schools' own occasions, not illustrations of
   * the fifteen tiles above.
   */
  {
    blockType: 'gallery',
    heading: 'Sport at SIWS',
    accentWord: 'at SIWS',
    headingLevel: 'h2',
    background: 'white',
    layout: 'bento',
    perPage: '0',
    images: [
      { image: photo.hall, caption: 'Yoga in the school hall' },
      { image: photo.race, caption: 'The Kindergarten’s sports day' },
      { image: photo.winners, caption: 'Annual Sports Day 2025–26, Primary School' },
    ],
  },

  /* --- Spotlight: Fencing at SIWS ----------------------------------------- */
  /*
   * THE PHOTOGRAPH IS SHOWN, NOT TINTED. This was a full-width band with the
   * sentence across it, and under the band's blue the two fencers could not
   * be made out — the one picture of the flagship sport, used as a texture.
   * Beside the words it is a photograph of a bout.
   */
  {
    blockType: 'mediaText',
    heading: 'Spotlight: Fencing at SIWS',
    accentWord: 'Fencing at SIWS',
    headingLevel: 'h2',
    background: 'sea',
    imagePosition: 'left',
    imageShape: 'rounded',
    image: photo.bout,
    content: text(
      p([
        b(
          'Fencing is SIWS’s flagship sport, with a dedicated Fencing Center and a University of Mumbai championship title.',
        ),
        t(
          ' The modern art of swordplay combines lightning-fast reflexes, intense physical conditioning and chess-like strategy.',
        ),
      ]),
      termList([
        [
          'Where:',
          ' the SIWS Fencing Center at the SIWS Gymkhana & Sports Complex, Major R. Parameswaran Road, Wadala, Mumbai 400031',
        ],
        [
          'Coaching:',
          ' in exclusive collaboration with the Elite Fencing Club, with professional coaches in physical conditioning, video analysis and tournament preparation',
        ],
        [
          'Equipment:',
          ' electronic scoring pistes, full safety gear and training kit for all three weapons, Épée, Sabre and Foil',
        ],
        [
          'Academic credit:',
          ' at SIWS College, fencing is a 2-credit co-curricular course in B.Com. (Accounting & Finance), B.Sc. (Data Science) and B.Sc. (Artificial Intelligence), with 2 lectures a week',
        ],
      ]),
    ),
  },
  {
    blockType: 'richText',
    heading: 'A legacy of champions',
    accentWord: 'champions',
    headingLevel: 'h3',
    width: 'normal',
    background: 'sea',
    content: text(
      p([
        t('The '),
        b(
          'SIWS Women’s Fencing Team won 1st place overall at the University of Mumbai Inter-Collegiate Fencing Championship',
        ),
        t(
          ', led by Narmatha Ramakrishna Yadav, Anuja Vinod Lad and Raksha. The team went on to represent the University of Mumbai at the All India University Fencing Championship in Jammu, the college’s return to the national university stage after 28 years.',
        ),
      ]),
      termList([
        ['Anuja Vinod Lad:', ' Individual Gold Medal, Girls’ Épée, Khelo India Youth Games'],
        ['Narmatha Ramakrishna Yadav:', ' Silver Medal, Senior State Fencing Championships'],
      ]),
    ),
  },
  {
    blockType: 'callToAction',
    heading: 'Fencing at SIWS',
    background: 'brand',
    text: text(p('The programme, the coaching partnership, our champions and how to join.')),
    links: [button('Learn more about Fencing at SIWS', fencingPage)],
  },

  /* --- Facilities and coaching -------------------------------------------- */
  {
    blockType: 'featureList',
    heading: 'Our facilities',
    accentWord: 'facilities',
    headingLevel: 'h2',
    background: 'white',
    layout: 'compact',
    columns: '3',
    items: [
      { title: '1 football ground' },
      { title: '2 basketball courts' },
      { title: 'Cricket practice nets' },
      { title: 'Indoor badminton hall with 4 courts' },
      { title: 'Table tennis hall with 6 tables' },
      { title: '200 m athletic track' },
      { title: 'Yoga room' },
      { title: 'Fully equipped sports room' },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'Our coaches',
    accentWord: 'coaches',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'cards',
    intro: text(
      p([
        t('Students train under '),
        b('3 full-time Physical Education Teachers'),
        t(' and qualified external coaches:'),
      ]),
    ),
    items: [
      { title: 'Cricket', icon: 'sport', description: 'BCCI-certified coach.' },
      {
        title: 'Football and Basketball',
        icon: 'staff',
        description: 'MSSA-certified coaches.',
      },
      { title: 'Chess', icon: 'thinking', description: 'FIDE-rated coach.' },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'Training programmes',
    accentWord: 'programmes',
    headingLevel: 'h2',
    background: 'white',
    layout: 'list',
    columns: '2',
    items: [
      { title: 'Regular evening coaching' },
      { title: '15-day Summer Sports Camp every April' },
      { title: 'Fitness and conditioning sessions' },
      { title: 'Talent Identification Camp from Std 3 onwards' },
      { title: 'Special training for DSO and MSSA teams' },
    ],
  },

  /* --- Teams and competitions --------------------------------------------- */
  {
    blockType: 'mediaText',
    heading: 'Teams and competitions',
    accentWord: 'competitions',
    headingLevel: 'h2',
    background: 'sea',
    imagePosition: 'left',
    imageShape: 'rounded',
    image: photo.football,
    content: text(
      p([
        t('School teams are formed in '),
        b('U-10, U-12, U-14 and U-16'),
        t(' age categories, and compete at every level:'),
      ]),
      termList([
        ['Inter-House', ' championships within the school'],
        ['MSSA', ' – Mumbai Schools Sports Association'],
        ['DSO', ' – District Sports Office, Raigad'],
        ['ZP', ' inter-school tournaments'],
        ['Private inter-school tournaments', ' in the Navi Mumbai and Panvel region'],
      ]),
    ),
  },

  /* --- Achievements and alumni -------------------------------------------- */
  {
    blockType: 'statistics',
    heading: 'Achievements and alumni',
    accentWord: 'Achievements',
    headingLevel: 'h2',
    background: 'brand',
    image: photo.prizes,
    intro: 'Our students have won 100+ medals at district and inter-school level in the last 3 years.',
    stats: [
      { value: '100+', label: 'medals in the last 3 years' },
      { value: '40+', label: 'individual medals in the last 2 years' },
      { value: '5', label: 'represented Raigad District / Mumbai Division' },
      { value: '2', label: 'represented Maharashtra in Chess, 2024' },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'Honours',
    headingLevel: 'h3',
    background: 'white',
    layout: 'panel',
    items: [
      { chip: 'Team', title: 'Overall Champions', description: 'DSO Athletics 2023-24.' },
      {
        chip: 'Team',
        title: 'Winners',
        description: 'DSO Basketball U-16 Girls, 3 consecutive years.',
      },
      { chip: 'Team', title: 'Runners-up', description: 'MSSA Football U-14, 2024.' },
      {
        chip: 'Individual',
        title: '40+ individual medals in the last 2 years',
        description: 'Including Gold in 100 m and 200 m athletics and Gold in Chess at district level.',
      },
      {
        chip: 'Individual',
        title: 'Best Player Awards',
        description: 'In Football and Basketball at MSSA tournaments.',
      },
      {
        chip: 'Individual',
        title: '5 students represented Raigad District / Mumbai Division',
        description: 'In Football, Basketball and Athletics.',
      },
      {
        chip: 'Individual',
        title: '2 students represented Maharashtra',
        description: 'In Chess at the State Level Championship, 2024.',
      },
    ],
  },
  {
    blockType: 'richText',
    heading: 'Our alumni',
    accentWord: 'alumni',
    headingLevel: 'h3',
    width: 'narrow',
    background: 'sea',
    content: text(
      p(
        'SIWS alumni have represented the district in U-19 Cricket, won state-level medals in Athletics, and earned sports scholarships. Two are now certified sports coaches.',
      ),
    ),
  },

  /* --- Annual events ------------------------------------------------------ */
  {
    blockType: 'mediaText',
    heading: 'Annual events',
    accentWord: 'events',
    headingLevel: 'h2',
    background: 'white',
    imagePosition: 'right',
    imageShape: 'rounded',
    image: photo.podium,
    content: text(
      h3('Annual Sports Day'),
      p([
        t('Our flagship event, held every '),
        b('December'),
        t(', sees 100% participation from students and parents. The day includes:'),
      ]),
      bulletList([
        'March Past, Torch Lighting and Oath Ceremony',
        'Aerobic Dance and Pyramid Formation',
        'Track and field events',
        'Prize Distribution',
      ]),
      h3('Through the year'),
      bulletList([
        'Inter-House Sports Championship',
        'Inter-Class Football League',
        'Cricket Premier League',
        'Chess and Carrom Championship',
        'International Yoga Day celebration',
      ]),
    ),
  },

  /* --- Looking ahead ------------------------------------------------------ */
  {
    blockType: 'featureList',
    heading: 'Looking ahead',
    accentWord: 'ahead',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'cards',
    intro: text(p('This year, the Sports Department plans to:')),
    items: [
      { title: 'Introduce Lawn Tennis', icon: 'sport' },
      { title: 'Host an Inter-School Basketball Tournament', icon: 'trophy' },
      { title: 'Upgrade the cricket nets with a bowling machine', icon: 'premises' },
      { title: 'Compete at the national level in Athletics and Chess', icon: 'medal' },
    ],
  },
]

/* --- the Fencing page ----------------------------------------------------- */

const FENCING = {
  slug: 'fencing',
  title: 'Fencing at SIWS',
  intro:
    'Fencing at SIWS: a 2-credit co-curricular course, the SIWS Fencing Center with the Elite Fencing Club, and a University of Mumbai championship team.',
  metaDescription:
    'Fencing at SIWS: a 2-credit co-curricular course, coaching with the Elite Fencing Club at the SIWS Fencing Center in Wadala, and a University of Mumbai championship team.',
}

const fencingLayout = (photo: Ids, sportsPage: number, contactPage: number | null) => [
  {
    blockType: 'hero',
    eyebrow: 'SIWS Fencing Programme',
    title: FENCING.title,
    accentWord: 'Fencing',
    subtitle: 'Welcome to the Home of Champions',
    intro:
      'The noble art of modern swordplay: lightning-fast reflexes, intense physical conditioning, and tactical chess-like strategy.',
    image: photo.bout,
    highlights: [
      { value: '2 credits', label: 'official co-curricular course' },
      { value: '3 weapons', label: 'Épée, Sabre and Foil' },
      { value: '1st place', label: 'University of Mumbai championship' },
    ],
  },
  {
    blockType: 'richText',
    heading: 'Introduction',
    headingLevel: 'h2',
    width: 'normal',
    background: 'white',
    content: text(
      p(
        'At the South Indians’ Welfare Society (SIWS), we believe in nurturing elite minds and extraordinary athletic talent. Fencing—the noble art of modern swordplay—stands as a premier pillar of our sports and academic ecosystem. Combining lightning-fast reflexes, intense physical conditioning, and tactical chess-like strategy, our fencing programme empowers students to achieve excellence both in the classroom and on the national strip.',
      ),
      p(
        'Whether you are looking to earn academic credits, learn a unique dynamic sport, or train to represent your university and country at the highest competitive levels, SIWS provides the ultimate ecosystem to transform passion into gold medals.',
      ),
    ),
  },
  {
    blockType: 'featureList',
    heading: 'Academic integration and co-curricular credits',
    accentWord: 'co-curricular credits',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'cards',
    intro: text(
      p([
        t(
          'Fencing at SIWS is not just an extracurricular activity; it is seamlessly woven into our formal educational architecture. We proudly offer Fencing as a ',
        ),
        b('2-credit official co-curricular course'),
        t(
          ' across our prominent degree tracks, including B.Com. (Accounting & Finance), B.Sc. (Data Science), and B.Sc. (Artificial Intelligence).',
        ),
      ]),
    ),
    items: [
      {
        title: 'Structured Learning',
        icon: 'study',
        description:
          'Students attend 2 dedicated practical and theoretical lectures per week to master footwork, blade work, and competitive tactics.',
      },
      {
        title: 'Professional Certification',
        icon: 'pass',
        description:
          'To maintain high safety and professional standards, participating students hold active memberships with government-approved fencing organizations.',
      },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'World-class facilities and elite coaching partnership',
    accentWord: 'elite coaching partnership',
    headingLevel: 'h2',
    background: 'white',
    layout: 'cards',
    intro: text(
      p(
        'Our campus hosts the dedicated SIWS Fencing Center at our multi-purpose sports complex located on Major R. Parameswaran Road in Wadala, Mumbai. To deliver top-tier, international-standard training, SIWS operates in exclusive collaboration with the renowned Elite Fencing Club.',
      ),
    ),
    items: [
      {
        title: 'State-of-the-Art Training',
        icon: 'sport',
        description:
          'Equipped with official electronic scoring pistes, safety gear, and specialized target equipment for all three weapon categories (Épée, Sabre, and Foil).',
      },
      {
        title: 'Expert Coaching Pipeline',
        icon: 'staff',
        description:
          'Led by professional coaches specializing in elite physical conditioning, strategic video analysis, and high-performance tournament preparation.',
      },
    ],
  },
  {
    blockType: 'statistics',
    heading: 'Our legacy of champions',
    accentWord: 'champions',
    headingLevel: 'h2',
    background: 'brand',
    intro:
      'SIWS has built an illustrious reputation as a powerhouse in collegiate fencing, consistently sweeping tournaments and producing elite state and national athletes.',
    stats: [
      { value: '1st', label: 'University of Mumbai Inter-Collegiate Fencing Championship' },
      { value: '28 years', label: 'since the college last reached the All India University stage' },
      { value: 'Gold', label: 'Girls’ Épée, Khelo India Youth Games' },
      { value: 'Silver', label: 'Senior State Fencing Championships' },
    ],
  },
  {
    blockType: 'richText',
    heading: 'Historic University Triumph',
    accentWord: 'Triumph',
    headingLevel: 'h3',
    width: 'normal',
    background: 'white',
    content: text(
      p(
        'Our SIWS Women’s Fencing Team recently made history by capturing 1st Place overall at the University of Mumbai Inter-Collegiate Fencing Championship. Led by the exceptional trio of Narmatha Ramakrishna Yadav, Anuja Vinod Lad, and Raksha, the team dominated the individual and team Épée and Sabre brackets. This absolute victory advanced our athletes to represent the University of Mumbai at the All India University Fencing Championship in Jammu—marking the college’s historic return to the pinnacle of national university stages after a 28-year hiatus.',
      ),
    ),
  },
  {
    blockType: 'featureList',
    heading: 'Player highlights',
    accentWord: 'highlights',
    headingLevel: 'h3',
    background: 'white',
    layout: 'cards',
    items: [
      {
        title: 'Anuja Vinod Lad',
        icon: 'trophy',
        description:
          'A decorated national-level dynamic athlete who clinched the prestigious Individual Gold Medal in the Girls’ Épée category at the Khelo India Youth Games, representing the winning momentum of the campus on a grand national stage.',
      },
      {
        title: 'Narmatha Ramakrishna Yadav',
        icon: 'medal',
        description:
          'A top-ranked junior and senior Épée fencer who earned the Silver Medal at the Senior State Fencing Championships and continues to stand strong in rankings governed by the Fencing Association of India.',
      },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'Join the legacy',
    accentWord: 'legacy',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'spec',
    intro: text(
      p(
        'Ready to pick up the blade? Whether your goal is to master a new skill or represent your nation, your journey begins here.',
      ),
    ),
    items: [
      {
        title: 'Location',
        description:
          'SIWS Gymkhana & Sports Complex, Major R. Parameswaran Rd, Wadala, Mumbai - 400031',
      },
      {
        title: 'Enrolment',
        description:
          'Visit the Gymkhana Department or contact the Elite Fencing Club campus representative for batch timings and academic registration details. Contact your class teacher for more details.',
      },
    ],
  },
  {
    blockType: 'callToAction',
    heading: 'Sports at SIWS School',
    background: 'brand',
    text: text(p('Fencing is one of 15 sports. See the rest, the coaching and the teams.')),
    links: [
      button('All sports at SIWS', sportsPage),
      ...(contactPage === null ? [] : [button('Contact SIWS', contactPage, 'secondary')]),
    ],
  },
]

/* --- writing them --------------------------------------------------------- */

type Page = { id: number; title: string; layout?: unknown[] }

const main = async () => {
  const payload = await getPayload({ config })

  const pageBySlug = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { exists: false } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0] as unknown as Page | undefined
  }

  const sports = await pageBySlug('sports')
  if (!sports) throw new Error('The institution-wide Sports page does not exist — create the tab first.')
  const fencing = await pageBySlug(FENCING.slug)
  const contact = await pageBySlug('contact')

  /* The two pages, and whether either is somebody's work. */
  const sportsWritten = (sports.layout ?? []).length
  const fencingWritten = (fencing?.layout ?? []).length
  if ((sportsWritten > 0 || fencingWritten > 0) && !FORCE) {
    console.log(
      `  Left alone: Sports has ${sportsWritten} section(s)` +
        (fencing ? ` and Fencing has ${fencingWritten}` : '') +
        '. Re-run with --force to replace them.',
    )
    process.exit(0)
  }

  /* --- photographs ------------------------------------------------------- */
  const ids: Partial<Ids> = {}
  const missing: string[] = []
  for (const [key, filename] of Object.entries(PHOTOS) as [keyof typeof PHOTOS, string][]) {
    const id = await findMediaId(payload, filename)
    if (id === null) missing.push(filename)
    else ids[key] = id
  }
  if (missing.length > 0) {
    throw new Error(`Not in the media library: ${missing.join(', ')}. Nothing was written.`)
  }

  let bout = await findMediaId(payload, BOUT.filename)
  if (bout === null) {
    const source = path.resolve(process.cwd(), 'assets/images', BOUT.filename)
    if (!fs.existsSync(source)) throw new Error(`The fencing photograph is not at ${source}.`)
    console.log(`  Photograph: ${APPLY ? 'uploading' : 'would upload'} ${BOUT.filename}`)
    if (APPLY) {
      const created = await payload.create({
        collection: 'media',
        data: {
          alt: BOUT.alt,
          caption: BOUT.caption,
          // Page furniture: it belongs to these two pages, not to a gallery.
          showInGallery: false,
          // Both fencers are masked; nobody in the frame can be identified.
          depictsChildren: false,
          focalX: BOUT.focalX,
          focalY: BOUT.focalY,
        } as never,
        filePath: source,
        overrideAccess: true,
      })
      bout = created.id as number
    }
  } else {
    console.log(`  Photograph: ${BOUT.filename} is already in the library.`)
    if (APPLY) {
      await payload.update({
        collection: 'media',
        id: bout,
        data: { focalX: BOUT.focalX, focalY: BOUT.focalY } as never,
        overrideAccess: true,
      })
    }
  }

  /* --- the Fencing page, which the Sports page links to ------------------- */
  let fencingId = fencing?.id ?? null
  if (fencingId === null) {
    console.log(
      `  Fencing: ${APPLY ? 'creating' : 'would create'} the page at /${FENCING.slug} (not on the menu)`,
    )
    if (APPLY) {
      const created = await payload.create({
        collection: 'pages',
        data: {
          title: FENCING.title,
          slug: FENCING.slug,
          intro: FENCING.intro,
          showInNav: false,
          _status: 'published',
          reviewStatus: 'approved',
        } as never,
        overrideAccess: true,
      })
      fencingId = created.id as number
    }
  }

  const describe = (
    name: string,
    layout: { blockType: string; heading?: string; title?: string }[],
  ) => {
    console.log(`\n  ${APPLY ? 'Writing' : 'Would write'} ${layout.length} sections to the ${name} page:`)
    for (const block of layout) {
      console.log(`    ${block.blockType.padEnd(13)} ${block.heading ?? block.title ?? ''}`)
    }
  }

  // In a dry run the photograph and the page may not exist yet; the plan is the same.
  const photo = { ...ids, bout: bout ?? 0 } as Ids
  const fencingBlocks = fencingLayout(photo, sports.id, contact?.id ?? null)
  const sportsBlocks = sportsLayout(photo, fencingId ?? 0)
  describe('Fencing', fencingBlocks)
  describe('Sports', sportsBlocks)

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'pages',
    id: fencingId as number,
    data: {
      title: FENCING.title,
      slug: FENCING.slug,
      intro: FENCING.intro,
      layout: fencingBlocks,
      metaDescription: FENCING.metaDescription,
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
  console.log('\n  Fencing: written.')

  await payload.update({
    collection: 'pages',
    id: sports.id,
    data: {
      intro:
        '15 sports including our championship-winning Fencing programme, expert coaching, and a place in the team for every child.',
      layout: sportsBlocks,
      metaDescription:
        'Sports at SIWS School: 15 sports including championship-winning Fencing, expert coaching, school teams from U-10 to U-16, and 100+ medals in three years.',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
  console.log('  Sports: written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
