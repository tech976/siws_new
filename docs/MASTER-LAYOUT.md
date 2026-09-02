# Master Layout

The layout language for textual sections on the SIWS sites — statements, pointer
lists and checklists. Written 2026-09-01, after the Primary About page was
rebuilt three times and still read as a stack of bullet lists.

This document is the reference. `FeatureListBlock`'s `panel` layout is its first
implementation.

---

## 1. Why this exists

The four SIWS sites carry a lot of short textual content: ten values, four
goals, seven subjects, nineteen school rules, three staffing notes. Until now
every one of them rendered as the same thing — a centred 36px heading, 80px of
padding, and a column of ticked lines. Correct, accessible, and inert. A page
with four of them in a row stops being read.

The brief was to modernise that without touching the brand. Three reference
components were supplied (a monochrome glass FAQ, twice, and a numbered
"how it works" block). They are not usable here as pasted — see §5 — but the
patterns inside them are, and this document is what was kept.

---

## 2. What the reference components actually contribute

Eight patterns, of which six earn their place on a school site.

| Pattern | Verdict | What it becomes here |
|---|---|---|
| Eyebrow capsule above the heading | **Keep** | A tracked uppercase pill naming the section — `eyebrow` on FeatureListBlock |
| Row as a rounded panel, not a bullet | **Keep** | `rounded-3xl`, hairline border, white on a tinted ground |
| Lift on hover / focus-within | **Keep** | `-translate-y-0.5`, 500ms — the row acknowledges the pointer |
| Ambient glow inside the panel | **Keep, changed** | Brand blue at 6%, centred, fading in on hover. Not cursor-tracked — see §5 |
| Leading disc carrying a mark | **Keep** | The site's existing solid brand disc with a white glyph |
| Meta chip on the right of a row | **Keep** | A category label per item, tracked uppercase |
| Staggered entrance, blur → sharp | **Keep, simplified** | CSS-only rise on load, 60ms apart, reduced-motion respected |
| Expand / collapse per row | **Reject here** | Already `AccordionBlock`'s job. A value or a goal is four words; hiding it behind a click costs a reader more than it saves |
| Night / Day toggle | **Reject** | The site has an accessibility bar with text size and high contrast. A second, conflicting theme control is worse than none |
| Aurora / conic beam backdrop | **Reject** | Belongs to a dark monochrome palette. On SIWS blue it reads as a rendering fault |

---

## 3. The tokens this layout is built from

Nothing new. Every value below already exists in
`src/app/(frontend)/globals.css` and `src/theme/tokens.ts`.

**Colour**

| Role | Token | Value |
|---|---|---|
| Panel ground | `--color-surface` | `#ffffff` |
| Section ground | `--color-sea` | `#dbecff` |
| Structure & emphasis | `--color-brand` | `#2e3192` |
| Depth | `--color-brand-deep` | `#24276f` |
| The one accent | `--color-accent` | `#ffaf2a` |
| Body | `--color-ink-muted` | `#5c5c68` |
| Hairline | `--color-line` | decorative rules only |

The accent is used **once per section at most**. It is the colour of the
highlighted word in a heading; it is not a panel, a border, or a chip.

**Type** — unchanged. Anton for headings, Montserrat for everything else.
The panel layout adds no new face and no new size:

| Role | Size |
|---|---|
| Section heading | 36px Anton, centred, one word in accent |
| Eyebrow / chip | 12.8px Montserrat 600, uppercase, `0.12em` tracking |
| Item title | `card-title`, brand blue, 600 |
| Item body | 14px, `leading-snug`, ink-muted |

**Geometry**

- Panel radius `1.5rem` (`rounded-3xl`) — deliberately larger than the
  `rounded-2xl` used by cards and bento tiles, so a panel row reads as a
  different device rather than a card that lost its picture.
- Gutter between panels `0.75rem`. Padding inside `1.25rem`.
  The gutter is smaller than the padding **on purpose here**: these rows are a
  set, not a row of separate destinations. (Card grids invert this — see the
  note in `FeatureListBlockView` on why a row of cards needs the opposite.)
- Grid: one column on a phone, two from `sm`, three from `lg`.

**Motion**

- Entrance: 520ms, `cubic-bezier(0.16, 1, 0.3, 1)`, `backwards`, staggered
  60ms per item and capped at the twelfth so a nineteen-item list does not take
  a second and a half to arrive.
- Hover: 500ms lift and glow.
- Every one of these sits inside the file's existing
  `@media (prefers-reduced-motion: reduce)` block, which zeroes it.

---

## 4. The layouts, and what each is for

Five ways to set a list. Choosing between them is a content question, not a
taste one.

```
list ─────────────────────────────────────────────────
  ✓  Title
     A sentence or two explaining the point.
  ✓  Title
     A sentence or two explaining the point.

  For rules, curricula, anything long. One column when each
  point carries a paragraph; two-centre for short labels.

compact ──────────────────────────────────────────────
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ ✓ Label  │ │ ✓ Label  │ │ ✓ Label  │
  └──────────┘ └──────────┘ └──────────┘

  A dense grid of short labels. A subject list, a set of methods.

panel ───────────────────────────────────────  ← this document
  ┌───────────────────────┐ ┌───────────────────────┐
  │ ⬤  Title      CHIP    │ │ ⬤  Title      CHIP    │
  │    One line of body   │ │    One line of body   │
  └───────────────────────┘ └───────────────────────┘
       ↑ lifts and glows on hover, rises in on load

  A set that should feel current and answer the pointer.
  Values, goals, benefits — anything a visitor scans rather
  than studies. Takes an optional chip per item.

cards ────────────────────────────────────────────────
  A picture on a tinted card. Facilities a parent scans.

showcase ─────────────────────────────────────────────
  A photograph beside the words. Prizes, events.
```

### When to reach for `panel`

- The items are **peers** — no sequence, no hierarchy.
- Between three and twelve of them.
- Each is a short label, optionally with one line under it.
- The section is one a visitor **scans**, not one they study.

### The entrance without the lift

The two classes are separable. `.siws-panel-rise` gives a row its arrival;
`.siws-panel` adds the hover lift. Use the rise alone wherever the panels are
not interactive — a card that rises under the pointer promises something it
cannot deliver, and a set of figures or dates has nothing to click.

### When not to

- **One item.** A panel of one is a box around a sentence.
- **A real sequence.** Use `list` with `marker: 'number'`. Numbering is
  information, not decoration — if the order does not matter, do not number it.
- **Nineteen school rules.** Long text in a panel grid produces columns of
  wildly unequal height. Use `list`.
- **Three panel sections in a row.** The lift stops meaning anything when
  everything lifts. One per page, two at the outside.

---

## 5. What was rejected, and why

Being explicit so nobody re-imports it.

**The dark monochrome palette.** `bg-neutral-950`, `rgba(255,255,255,0.08)`
glow, conic-gradient beams. SIWS's palette is four blues, one orange and one
ink. Dropping a black glass panel into it does not read as modern; it reads as
a component from another site that failed to load its theme.

**The Night / Day toggle.** The site already gives readers an accessibility bar
with text size and a high-contrast mode. A second control that writes
`localStorage['bento-theme']` and toggles `.dark` on `<html>` would fight it,
and neither would win predictably.

**Cursor-tracked glow.** `onMouseMove` writing `--faq-x` / `--faq-y` requires
`'use client'`. Every block view in `src/components/blocks` is a server
component except the six that genuinely need state, and turning the most-used
list renderer on all four sites into a client component to move a highlight
under the pointer is a bad trade. The glow is centred and fades in on hover
instead: nearly the same read, no JavaScript, no hydration.

**Runtime `<style>` injection.** The references build a `<style>` element and
append it to `document.head` on mount. Keyframes belong in `globals.css`, where
the existing `prefers-reduced-motion` block can reach them — injected styles sit
outside it and animate regardless of what the reader has asked for.

**`min-h-screen` on a section.** These are page sections in a long document,
not standalone demo pages.

**KNOWN ISSUE, not yet fixed: `StatisticsBlockView` ignores its own
`background` field.** It paints `bg-brand` unconditionally and never reads
`block.background`. Nine of the ten figures bands on the site have been set to
"Sea blue" by an editor and render deep blue regardless, which is why several
near-black slabs stack down the pages. A rebuild honouring the field — light
panels on the chosen ground — was written and reverted on 2026-09-01 by
request; the band stays as it is for now. Recorded here because an option that
does nothing is worse than no option: the editor cannot tell whether they made
a mistake or the site did.

**Text over a photograph, as a way of adding visual interest.** Tried on
`/primary/about` and removed on 2026-09-01. `DividerBlock` guarantees that
white type stays legible over *any* photograph an editor uploads, and it buys
that guarantee with an overlay at 88–92% opacity — so the band arrives as
near-solid dark blue with a faint picture inside it. The guarantee is right and
the block should keep it; the conclusion is that this is not the device to
reach for when a page needs something to look at. `MediaTextBlock` shows a
photograph beside the words at full strength, with no wash over it at all.

**Plain JSX with untyped handlers.** `const toggleQuestion = (index) => …`
fails `tsc --noEmit` here. Anything ported gets typed.

---

## 6. Porting checklist

Any further component brought in from an external library:

1. **Strip the palette.** Every colour comes from `@theme` in `globals.css`.
   No hex in a component.
2. **Strip the theme logic.** No `matchMedia`, no `.dark` toggling, no
   `localStorage`.
3. **Keyframes go in `globals.css`**, inside or above the reduced-motion block,
   never injected at runtime.
4. **Server by default.** Add `'use client'` only for real state.
5. **Type it.** Props, events, the block's own interface in `payload-types.ts`.
6. **Give the editor the choice, not the CSS.** A new look becomes a `layout`
   option on an existing block, so a teacher picks it from a menu and cannot
   introduce an off-brand colour (SRS 2.5).
7. **Check the quality floor**: keyboard focus visible, contrast ≥ 4.5:1 for
   body text, no horizontal overflow at 390px, reduced motion respected.

---

## 7. Where it is used

| Page | Section | Layout | Columns |
|---|---|---|---|
| `/primary/about` | Our Values | `panel` | 3 (default) — ten one-word labels |
| `/primary/about` | Our Goals | `panel`, with chips | 2 — four phrases; three across would strand one on a second row and wrap the titles under their chips |
| `/secondary` | A holistic approach to teaching | `panel`, with chips | 2 — seven titles that each carry a chip and a sentence |

`/secondary` used to carry a second panel, "How we teach", and that was the
"two at the outside" limit in §4 reached. The block has been dropped from the
front page — the nine methods are published on `/secondary/academics`, in the
`compact` layout that suits bare labels — so the page is back to one panel and
has a slot spare. Spend it on something a visitor weighs, not on a list.

`/primary/about` carries no photograph as a result of the removal above. If it
needs one, the block to use is `mediaText`, not `divider`.

Add rows here when the layout spreads, so the "two at the outside" rule in §4
can be checked rather than guessed at.

---
---

# Part II — The Layout Handbook

Part I above is a decision record: what was tried on `/primary/about`, what was
kept, what was thrown out and why. Part II is the reference — the spacing,
radius, shadow, grid and component specification every page inherits.

**Every figure in Part II was measured out of this codebase**, not chosen for
it. Where a value is aspirational rather than current, it is marked
**TARGET**. Where the code disagrees with itself, the deviation is named rather
than smoothed over — a handbook that quietly rounds the numbers is a handbook
nobody can check against the screen.

**Scope.** Layout, spacing, structure, radius, shadow, iconography and reusable
components only. Colour and type live in §3 and in `globals.css`; this part
never restates them. Breakpoints appear only where a column count changes,
because a grid that cannot be described across widths cannot be built.

---

## 8. Spacing scale

One scale. Every margin, padding and gap on every page is one of these
thirteen values — if a design needs 36px, it takes 32 or 40.

| Token | px | Tailwind | What it is for |
|---:|---:|---|---|
| `space-1` | **4** | `1` | Optical nudges only. Gap between a chip's icon and its first letter; the offset under a two-line caption. Never a layout gap. |
| `space-2` | **8** | `2` | Inside a small pill: vertical padding on a chip, gap between a tick and its label in dense text. |
| `space-3` | **12** | `3` | **The panel-grid gutter.** Also the gap between an eyebrow's dot and its rule. Rows that are one *set* sit 12 apart. |
| `space-4` | **16** | `4` | Gap between an icon container and the text beside it. Padding inside a compact tile. Heading→its own sub-label. |
| `space-5` | **20** | `5` | **Page horizontal padding** (`siws-container`). Internal padding of a standard panel. |
| `space-6` | **24** | `6` | **The card-grid gutter.** Internal padding of a standard card. Heading→intro paragraph. |
| `space-8` | **32** | `8` | Large-card internal padding. Card-grid gutter at desktop, where a wider gutter keeps a row reading as separate destinations. |
| `space-10` | **40** | `10` | **Section header→content.** The single most repeated rhythm value on the site. |
| `space-12` | **48** | `12` | Between two content blocks *inside* one section — a grid and the note under it. |
| `space-14` | **56** | `14` | **Section vertical padding, mobile.** |
| `space-20` | **80** | `20` | **Section vertical padding, desktop.** The band-to-band rhythm of every page. |
| `space-24` | **96** | `24` | **TARGET.** Reserved for a page's opening section and its CTA close, where a band should breathe more than a mid-page one. Not yet used. |
| `space-30` | **120** | `30` | **TARGET.** Reserved for a full-bleed feature band. Not yet used. |

### Where each rhythm applies

```
┌─ SECTION ─────────────────────────────────────────────┐
│                                                        │
│   ↕ 56 mobile / 80 desktop   (section padding-top)     │
│                                                        │
│   [EYEBROW PILL]                                       │
│   ↕ 20                                                 │
│   Section Heading                                      │
│   ↕ 24                    (heading → supporting para)  │
│   Supporting paragraph, centred, capped measure.       │
│   ↕ 40                    (header block → content)     │
│   ┌────────┐ ┌────────┐ ┌────────┐                     │
│   │  card  │ │  card  │ │  card  │   ← 12 or 24 gutter │
│   └────────┘ └────────┘ └────────┘                     │
│                                                        │
│   ↕ 56 mobile / 80 desktop   (section padding-bottom)  │
└────────────────────────────────────────────────────────┘
     ↕ 0 — bands butt directly. The colour change IS the
           separator; adding a margin would open a white
           stripe between two coloured sections.
```

| Relationship | Value | Note |
|---|---:|---|
| Between major sections | **0** | Sections carry their own padding and butt directly. Two adjacent sections of the same ground read as one continuous area with two headings — this is allowed and used. |
| Section top / bottom padding | **56 / 80** | Mobile / desktop. Identical for every block. |
| Eyebrow → heading | **20** | |
| Heading → supporting paragraph | **24** | |
| Heading block → content | **40** | Where there is no paragraph, the heading still takes 40 to the content — the gap does not collapse to 16. |
| Between cards (panels) | **12** | Rows that are one set. |
| Between cards (destinations) | **24 → 32** | 24 from `sm`, 32 from `lg`. |
| Card internal padding | **20 / 24 / 32** | Panel / standard / large. |
| Icon container → text | **16** | |
| Chip icon → chip label | **8** | |
| Between chips | **8** | Both axes, because chips wrap. |
| List item → next item | **12** | Panel grid. |
| CTA block → section edge | **40** | |

### The one rule about whitespace

> A gutter between sibling items must never be wider than the padding
> inside them — **unless the items are separate destinations**, in which
> case it must never be narrower.

A row of four cards with 32px padding and a 20px gutter reads as one bar with
lines ruled across it, because the widest space in sight is *inside* a card
rather than between them. The grouping inverts. Panels invert the rule
deliberately: 12 between, 20 inside, because they are a set and should read as
one block. This is the only place in the system where two rules point opposite
ways, and it is the difference between "these things" and "these choices".

---

## 9. Border radius

| Token | px | Tailwind | Applied to |
|---:|---:|---|---|
| `radius-xs` | **4** | `rounded-sm` | Focus-ring inner corners, progress ticks. |
| `radius-sm` | **8** | `rounded-lg` | Inline code, small media thumbnails, the corner cut on a banner. |
| `radius-md` | **12** | `rounded-xl` | **Icon containers** — the square-ish disc behind a glyph. |
| `radius-card` | **16** | `rounded-2xl` | **The default.** Standard cards, image containers, media frames, quote cards. 29 usages — the most-used radius after the pill. |
| `radius-lg` | **24** | `rounded-3xl` | **Panels and large feature cards.** Deliberately one step above `radius-card` so a panel reads as a different device rather than as a card that lost its picture. |
| `radius-pill` | **999** | `rounded-full` | Buttons, badges, chips, eyebrows, icon circles, accent rules. 43 usages — the signature shape of the system. |

### Usage map

| Element | Radius | Why |
|---|---:|---|
| Primary button | **pill** | |
| Secondary button | **pill** | Identical geometry to primary; the difference is fill, never shape. |
| Pill / badge | **pill** | |
| Chip | **pill** | |
| Eyebrow label | **pill** | |
| Standard card | **16** | |
| Large feature card | **24** | |
| Panel (set member) | **24** | |
| Quote card | **16** | |
| Image container | **16** | Matches the card it sits in, so a card with a picture has no corner mismatch. |
| Icon container, square | **12** | |
| Icon container, round | **pill** | Round for a decorative or brand mark; square-ish for a functional one inside a row. Pick one per section and hold it. |
| Section container | **0** | Sections are full-bleed bands. A rounded section leaves slivers of the page ground at its corners. |
| Accent rule | **pill** | A 4px-tall bar with pill radius reads as a drawn stroke, not a rectangle. |

**Consistency rule.** Three radii do 95% of the work: **pill**, **16**, **24**.
If a new element needs a fourth, it is probably an existing element with a
different name.

**Known deviation:** one `rounded-[10px]` survives in the compact tile. It
should be `rounded-xl` (12). Not urgent, but it is the only arbitrary radius in
the codebase.

---

## 10. Shadows

Elevation is **soft, low-contrast and rare**. A shadow says "this is a distinct
surface", not "this is important" — importance is the job of size, ground and
position.

| Level | Value | Applied to |
|---|---|---|
| **0 — Flat** | none | Sections, panels at rest, chips, badges, eyebrows, anything on a coloured ground. |
| **1 — Card** | `0 6px 15px rgba(0,0,0,0.08)` | Standard cards at rest. The site's `--shadow-card`. |
| **2 — Hover** | `0 18px 40px -28px brand-deep/65` | Panels and cards under pointer or `:focus-within`. A **large blur with a heavy negative spread**: the shadow spreads wide and stays faint, which is what makes it read as lift rather than as a dark edge. |
| **3 — Raised** | `0 12px 30px rgba(46,49,146,0.16)` | Floating elements over content — an open dropdown, a sticky bar. The site's `--shadow-raised`. |
| **4 — Feature** | Level 1 + a 1px hairline | A large feature card. Depth comes from the border; the shadow only lifts it off the ground. |

### Rules

- ✅ **Do** pair every shadow with a hairline border. A shadow alone on a white
  ground has no defined edge at the top, where the light comes from.
- ✅ **Do** use the negative spread for hover. Elevation change reads as motion,
  not as a darker box.
- ✅ **Do** transition shadow and transform together, 500ms, one easing curve.
- ❌ **Don't** put a shadow on anything sitting on a coloured ground. On sea blue
  or deep blue a black shadow turns muddy; a border at the right opacity does
  the whole job.
- ❌ **Don't** shadow a chip, badge or eyebrow. They are labels, not surfaces.
- ❌ **Don't** stack elevations. A card inside a card means one of them should
  not be a card.
- ❌ **Don't** hover-elevate anything non-interactive. A figure that rises under
  the pointer promises a click it cannot honour.

---

## 11. Page layout

### 11.1 Container

| Property | Value |
|---|---|
| Maximum content width | **1200px** (`75rem`) |
| Horizontal padding | **20px**, both sides, every width |
| Safe content width | **1160px** |
| Centring | `margin-inline: auto` |
| Vertical padding | **56px** mobile / **80px** desktop, owned by the section |

Full-bleed bands (photographic dividers, the figures band with a photograph)
break the container for their **background only**. Their text returns inside it,
so a heading in a full-bleed band still aligns with the heading in the ordinary
section above it.

### 11.2 The 12-column grid

```
│←20→│ 1  2  3  4  5  6  7  8  9  10 11 12 │←20→│
     │ ██ ██ ██ ██ ██ ██ ██ ██ ██ ██ ██ ██ │
       └32┘  gutter (desktop) · 24 (tablet) · 12 (panel sets)

  Column width = (1160 − 11 × gutter) ÷ 12
```

| Property | Value |
|---|---|
| Columns | **12** |
| Gutter, card grids | **24** tablet → **32** desktop |
| Gutter, panel sets | **12**, all widths |
| Row gap | Matches the column gutter, except panel sets, which use 12 both ways |

**Common spans**

| Layout | Spans | Used for |
|---|---|---|
| Full width | 12 | Prose bands, section headers |
| Halves | 6 + 6 | Media beside text; two statement cards |
| Thirds | 4 + 4 + 4 | The default card row |
| Quarters | 3 × 4 | A figures row of four |
| Asymmetric | 7 + 5 | Media beside text where the text needs more room |
| Measured prose | 8, centred | A paragraph column inside a 12-column band |

**Nested grids.** A grid inside a grid **inherits the parent's gutter** — it
does not restart at the page value. A 4-column card holding two chips uses the
chip gap (8), not the grid gutter (32).

**Equal-width cards.** Grid children stretch to the tallest in the row by
default; never fight it with a fixed height. A card with less content gets more
internal space, which is correct — a fixed height clips.

**Column counts by tier** (the only breakpoint reference in Part II):

| Content | Phone | Tablet | Desktop |
|---|:-:|:-:|:-:|
| Card grid | 1 | 2 | 3 or 4 |
| Panel set | 1 | 2 | 3 |
| Media + text | 1 (stacked) | 1 | 2 |
| Compact tiles | 1 | 2 | 3 |

A row of six wraps to **two rows of three**, never one row of six.

### 11.3 Vertical rhythm

Every page is the same stack, whatever it contains:

```
  PAGE HEADER          title + standfirst
      ↕ 0 if the first band is white · 40 if coloured
  SECTION              header ↕40 content
      ↕ 0
  SECTION              header ↕40 content
      ↕ 0
  CTA BAND             heading ↕24 text ↕40 buttons
      ↕ 0
  FOOTER
```

The gap under a page header is **conditional**: a white first band shares the
header's ground and the two read as one flow, so they sit close; a coloured
band draws a hard edge, and an edge butted against the standfirst reads as a
banner dropped on top of it.

---

## 12. The section pattern

Every section on every page is this shape. Nothing invents its own.

### 12.1 Section header

```
        ┌──────────────────┐
        │ ◆  EYEBROW LABEL │     pill · 8 gap · 0.12em tracking
        └──────────────────┘
                ↕ 20
          Section Heading           centred · balanced · uncapped
                ↕ 20
              ─────                 accent rule · 40 × 4 · pill
                ↕ 24
     Supporting paragraph, centred and
     capped so it wraps into a block.
                ↕ 40
   ┌─────────────────────────────────────┐
   │            CONTENT                   │
   └─────────────────────────────────────┘
```

| Element | Required | Spacing after |
|---|:-:|---:|
| Eyebrow pill | optional | 20 |
| Heading | optional* | 20 (to rule) or 24 (to paragraph) or 40 (to content) |
| Accent rule | optional | 24 |
| Supporting paragraph | optional | 40 |

\* A section with no heading is legal — a photographic band, a continuation of
the section above. When the heading is absent, the whole header block collapses
and the content takes the section's own top padding.

**Alignment.** The header is **always centred**. The content beneath it is
**always ranged left** unless it is a grid of centred cards. A centred heading
gives a long page a clear rhythm of section starts; centred body copy gives the
eye no fixed left edge to return to on each line.

### 12.2 Content area

| Type | Behaviour |
|---|---|
| Left-aligned prose | 8 columns, centred as a block, text ranged left. Caps the measure at ~75 characters. |
| Full-width | All 12. Grids, figure rows, media bands. |
| Two-column | 6 + 6, or 7 + 5 when one side is a photograph. Gutter 32. Stacks on phone in DOM order. |
| Grid | 12 columns, equal spans, gutter 24→32. |
| Card-based | As grid; cards stretch to equal height. |
| Mixed text + cards | Prose at 8 columns, cards at 12, both inside the same section, separated by 48. |

**The spacing does not change with the content type.** A section holding a
paragraph and a section holding twelve cards have identical top padding,
identical header rhythm and identical bottom padding. Only the middle differs.

### 12.3 The last row is centred, never stranded

Added 2026-09-02, after `/secondary`.

A CSS grid pins its final partial row to the left margin. Ten subjects across
three columns leave one tile alone on an otherwise empty line; nine teaching
methods across two leave the same; a gallery of two photographs in a
three-column grid leaves a third of the band blank. Under a centred heading
that stranded tile is the only thing on the page with no axis, and the set
stops reading as a set — it reads as a set plus an afterthought.

`.siws-flow` in `globals.css` replaces the grid with a wrapping flex row whose
items carry exactly the basis a grid track would have given them, plus
`justify-content: center`. A **full** row is therefore identical to the grid it
replaces — same widths, same gutter, same equal heights. Only a partial row has
slack, and the slack goes on both sides of it instead of all on the right.

| | |
|---|---|
| Classes | `.siws-flow` with `.siws-flow-2` or `.siws-flow-3` |
| Gutter | `--flow-gap`, default `0.75rem`; a card grid sets `[--flow-gap:1.25rem]` |
| Used by | `featureList` `panel` and `compact`, `gallery` `grid`, `GalleryPager` |
| Not used by | `cards` and `showcase` — those already read as separate destinations on a spine, and centring a short last row detaches it from the column above |

The basis is a hundredth of a pixel under the exact fraction. Flex decides
whether an item wraps from its hypothetical main size, before any shrinking
happens, so a basis summing to exactly 100% drops the last item of a **full**
row onto a line of its own the moment sub-pixel rounding goes the wrong way.

### 12.4 A media band with too little text stacks

Added 2026-09-02, after `/secondary`.

`mediaText`'s side-by-side band gives the photograph seven columns and the words
five, and the picture takes its height from the row — which has a floor under it
so a photograph is never reduced to a letterbox strip. Three lines of text
beside that floor is 85px of words centred in 384px of band: an empty pane of
white on one side of the section. It is what "the alignment is not correct" has
meant every time it has been raised, on four different pages.

**Below 300 characters the band stacks and centres instead**: heading,
photograph, paragraph, all on one axis and all on the same 42rem measure. The
frame takes no ratio, so nothing is cropped — the reason the split frames carry
one is that they have a text column to finish level with, and there is no such
column here. No blue wash either, for the same reason and because this is the
frame an award or a certificate lands in.

Three hundred is a floor, not a preference. Measured against the twenty-one of
these bands on the four sites it falls between "Recognised by the State" at 189,
which stranded, and "Beyond the classroom" at 336, which fills its column. An
editor who wants the stacked treatment for **longer** text still chooses
`imagePosition: 'above'` from the menu — this only catches text that cannot hold
a column whatever anybody picks.

---

## 13. Section 1 — Chip / tag layout

For subjects, categories, tags, filters and short labels.

### Structure

```
              Section Heading
                    ↕ 40
   ┌────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐
   │ ◆ Art  │ │ ◆ Marathi│ │ ◆ EVS │ │ ◆ Maths  │
   └────────┘ └──────────┘ └───────┘ └──────────┘
   ┌──────────────┐ ┌────────┐
   │ ◆ Phys. Ed.  │ │ ◆ Work │      ← wraps freely, 8 both axes
   └──────────────┘ └────────┘
```

The container is a **wrapping flex row**, not a grid. Chips are content-sized;
forcing them onto a grid gives a three-letter chip the same width as a
twenty-letter one and the set stops reading as labels.

**Alignment:** centred under a centred heading when the chips are decorative
(a subject list); ranged left when they are interactive (filters), so the first
chip aligns with everything else in the column.

### Chip specification

| Property | Value |
|---|---|
| Height | **32** (small) · **40** (default) |
| Horizontal padding | **12** small · **16** default |
| Vertical padding | **4** small · **8** default |
| Radius | **pill** |
| Border | 1px hairline. No shadow, ever. |
| Icon badge | **20** small · **24** default, leading, vertically centred |
| Icon → label gap | **8** |
| Gap between chips | **8** both axes |
| Wrapping | Free. Chips never truncate and never scroll horizontally. |
| Min touch target | **44 × 44** when interactive — pad the hit area, not the visible chip |

**Hover** (interactive chips only): ground shifts one step, border darkens one
step, **no lift and no shadow**. A chip is a label; lifting it makes it a card.

**Decorative chips take no hover at all.** If it does not do anything, it must
not respond as though it does.

---

## 14. Section 2 — Milestone / roadmap layout

For timelines, learning stages, admission steps, achievement sequences.

**Use this only when the order carries information the reader needs.** Numbering
a set of peers is decoration pretending to be structure — if the items could be
shuffled without loss, use §16 instead.

### Structure

```
   Section Heading                        ┌─────────────┐
                                          │  2026–27    │   ← optional pill,
                                          └─────────────┘     opposite heading
                    ↕ 40
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  ①           │ │  ②           │ │  ③           │
   │  ↕16         │ │              │ │              │
   │  Title       │ │  Title       │ │  Title       │
   │  ↕8          │ │              │ │              │
   │  Description │ │  Description │ │  Description │
   └──────────────┘ └──────────────┘ └──────────────┘
          └──── 24 gutter ────┘
```

### Milestone card

| Property | Value |
|---|---|
| Width | Equal, 12-grid span (4 for three, 3 for four) |
| Height | Content-driven, stretched to the row's tallest |
| Padding | **24** |
| Border | 1px hairline |
| Radius | **24** |
| Shadow | Level 0 at rest; level 2 on hover **only if the card links somewhere** |
| Number badge | **40 × 40**, pill, solid brand fill |
| Badge → title | **16** |
| Title → description | **8** |
| Grid gutter | **24** |

**Markup:** an ordered list. The number must be real structure, so a screen
reader announces "3 of 5" rather than reading a decorative glyph — and then the
visible badge is hidden from assistive tech, because the list already carries
the number.

---

## 15. Section 3 — Feature / teaching-practice grid

The default **horizontal** feature card: icon on the left, words on the right.

### Grid

```
   ┌────────────────────────┐ ┌────────────────────────┐
   │ ╭───╮                  │ │ ╭───╮                  │
   │ │ ◆ │  Title           │ │ │ ◆ │  Title           │
   │ ╰───╯  ↕8              │ │ ╰───╯                  │
   │  └16┘  Description     │ │        Description     │
   └────────────────────────┘ └────────────────────────┘
              ↕ 24
   ┌────────────────────────┐ ┌────────────────────────┐
   │ ╭───╮                  │ │ ╭───╮                  │
   ...
```

| Property | Value |
|---|---|
| Columns | **2** on desktop, 6 spans each |
| Column gutter | **24** |
| Row gutter | **24** |
| Card height | Equal per row, content-driven |
| Padding | **24** |
| Border | 1px hairline |
| Radius | **24** |
| Icon container | **48 × 48**, radius 12 (or pill — one choice per section) |
| Icon → content gap | **16** |
| Vertical alignment | **Top.** The icon aligns to the title's cap height, not to the card's centre — centring puts the icon beside the second line of a two-line title and the row loses its edge. |
| Title → description | **8** |
| Hover | Level 2 elevation + 2px lift, 500ms — **only if interactive** |

---

## 16. Section 4 — Development / program card grid

Small, equal cards for facilities, programmes, activities, clubs, achievements.
The workhorse.

### Grid

```
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  ╭──╮   │ │  ╭──╮   │ │  ╭──╮   │ │  ╭──╮   │
   │  │◆ │   │ │  │◆ │   │ │  │◆ │   │ │  │◆ │   │
   │  ╰──╯   │ │  ╰──╯   │ │  ╰──╯   │ │  ╰──╯   │
   │  ↕16    │ │         │ │         │ │         │
   │  Title  │ │  Title  │ │  Title  │ │  Title  │
   │  ↕8     │ │         │ │         │ │         │
   │  Descr. │ │  Descr. │ │  Descr. │ │  Descr. │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘
        └── 24 ──┘
```

| Property | Value |
|---|---|
| Cards per row | **3** or **4** on desktop, 2 tablet, 1 phone |
| Aspect ratio | **None.** Content-driven height, equalised by the row. A fixed ratio clips the longest description on the site and leaves the shortest card two-thirds empty. |
| Padding | **20** |
| Radius | **16** |
| Border | 1px hairline |
| Shadow | Level 1 at rest, level 2 on hover if interactive |
| Icon badge | **40 × 40** |
| Badge → title | **16** |
| Title → description | **8** |
| Gutter | **24** |
| Alignment | Centred when the card is icon-led with a short label; left when the description runs past one line |

**Remainders.** A last row with fewer cards than the others is normal and needs
no fix — the cells are the same width wherever they fall. The exception is a
**single** card left alone in a row that would stretch to full width: give that
row one fewer column so it cannot happen.

---

## 17. Iconography

| Property | Value |
|---|---|
| Style | **Outline**, never filled — except a solid mark reversed out of a filled container |
| Stroke width | **1.9** default · **2.4** for small marks needing weight (a tick at 18px) |
| Glyph size | **15** in a chip · **18–19** in a 40–48 container · **21** in a 64 container |
| Container : glyph | Roughly **2.4 : 1**. A 40 container takes an 18 glyph; a 48 takes 19–20; a 64 takes 21–24. |

### Containers

| Size | Radius | Used for |
|---:|---|---|
| **24** | pill | Inside a chip |
| **40** | 12 or pill | Panel rows, development cards, number badges |
| **44** | pill | Standalone interactive icon — meets the touch target with no padding |
| **48** | 12 or pill | Feature cards |
| **64** | pill | Section-level marks, empty states |
| **80–112** | pill | Illustrated cards where the picture is the point |

### Rules

- Every icon sits in a container. A bare glyph floating beside text has no
  consistent optical weight against differently-sized labels.
- **One container shape per section.** Round and square-ish discs in the same
  grid read as two systems.
- Gap from container to text is **16**, or **8** inside a chip.
- Decorative icons are hidden from assistive tech. An icon that is the *only*
  label needs an accessible name.
- A container's fill is solid; the glyph reverses out of it. This is the single
  icon treatment used site-wide.

---

## 18. Buttons, badges and chips

### 18.1 Eyebrow label

```
   ┌─────────────────────────────┐
   │ ◆   WHY PARENTS CHOOSE US   │
   └─────────────────────────────┘
              ↕ 20
        Section Heading
```

| Property | Value |
|---|---|
| Height | **36** |
| Padding | **20** horizontal, **8** vertical |
| Radius | pill |
| Tracking | **0.12em** |
| Case | Uppercase |
| Leading mark | Optional, **15px**, gap **10** |
| Border | 1px hairline |
| Placement | Above the heading, centred with it |
| Space after | **20** |

Decorative — never a link, never a button. If it needs to be clickable it is a
chip.

### 18.2 Badge / pill

| Property | Value |
|---|---|
| Height | **28** small · **36** default |
| Padding | **12** / **20** horizontal · **4** / **8** vertical |
| Radius | pill |
| Alignment | Baseline-aligned with the heading it sits beside; vertically centred inside a card row |
| Placement | Opposite a section heading, or trailing a card title |
| Tracking | **0.12em** when uppercase |

**Use it for state or category** — "2026–27", "Admissions open", "Health".
Never for an action.

**All-or-nothing.** A badge earns its space by distinguishing one item from its
neighbours. Ten items all badged the same word is ten copies of the section
heading.

### 18.3 Chip

See §13 for the full specification. Summary:

| Property | Value |
|---|---|
| Height | 32 / 40 |
| Padding | 12–16 / 4–8 |
| Radius | pill |
| Icon | 20–24, leading, gap 8 |
| Gap between | 8 both axes |
| Wrapping | Free, never truncates |
| Hover | Ground + border shift only. No lift, no shadow. |
| Touch target | 44 × 44 minimum when interactive |

---

## 19. Accessibility

Built into the layout, not applied over it.

| Requirement | Rule |
|---|---|
| **Touch targets** | **44 × 44** minimum for anything interactive. Where the visible control is smaller — a 32px chip — extend the hit area with padding, not size. |
| **Focus ring** | 2px, 4px offset, never removed, visible on every ground. Focus follows DOM order, and DOM order follows visual order. |
| **`:focus-within`** | Any card treatment that responds to hover responds identically to keyboard focus landing inside it. A hover-only affordance is invisible to a keyboard. |
| **Heading hierarchy** | Never skip a rank. A card title inside an `h2` section is `h3`; inside an `h3` section it is `h4`. Card titles are *visually* one step below a section heading regardless of rank — the size comes from a class, the rank from the outline. |
| **One `h1`** | Per page. A section may carry it when its heading *is* the page title; then the route suppresses its own. |
| **Lists are lists** | A grid of cards is a `ul`. A numbered sequence is an `ol`, and the visible badge is then hidden from assistive tech — the list already carries the number. |
| **Definition pairs** | Figure + caption is `dl` / `dt` / `dd`. The figure leads visually and in the DOM; never invert with `flex-col-reverse`. |
| **Decorative elements** | Accent rules, glow layers, background photographs and icon rings are `aria-hidden`. |
| **Whole-card links** | One real link; the card's clickable area extends from it via a pseudo-element. Never wrap a card in an anchor containing other links. |
| **Reduced motion** | Every entrance, lift and transition sits inside `prefers-reduced-motion: reduce` and is zeroed there. The layout must be complete and correct with all motion removed. |
| **Readability** | Prose caps at ~75 characters. Captions cap at 22 characters where they sit under a figure. Line length is an accessibility property, not a stylistic one. |
| **Interactive state** | Consistent across the site: hover = ground shift, or elevation + 2px lift for cards. One vocabulary, so a reader learns it once. |

**The rule that ties it together:** an element that *looks* interactive must
*be* interactive, and one that is interactive must show it in all four states —
rest, hover, focus, active.

---

## 20. Component inventory

The master reference. Every page is assembled from these twelve.

### 1. Content Container
| | |
|---|---|
| **Purpose** | Holds every section's content on one measure so headings align down the page |
| **Structure** | Centred block, max 1200, 20 horizontal padding |
| **Spacing** | 56 / 80 vertical, owned by the section |
| **Radius** | 0 |
| **Shadow** | None |
| **Reusable** | ground colour, id |
| **Use** | Every section. Full-bleed bands break it for their background only. |

### 2. Section Header
| | |
|---|---|
| **Purpose** | Gives a section a top and a name |
| **Structure** | Eyebrow → heading → accent rule → paragraph, all centred |
| **Spacing** | 20 / 20 / 24, then **40** to content |
| **Radius** | pill on the eyebrow and rule |
| **Shadow** | None |
| **Reusable** | heading, accent word, rank, eyebrow, paragraph |
| **Use** | Every section that has a name. Collapses entirely when it does not. |

### 3. Subject Chip
| | |
|---|---|
| **Purpose** | A short label — subject, category, tag, filter |
| **Structure** | Wrapping flex row; icon + label per chip |
| **Spacing** | 12–16 / 4–8 padding, 8 icon gap, 8 between |
| **Radius** | pill |
| **Shadow** | None |
| **Reusable** | label, icon, interactive flag |
| **Use** | Subject lists, filters, category tags. Never for actions. |

### 4. Badge / Pill
| | |
|---|---|
| **Purpose** | State or category, attached to something else |
| **Structure** | Single label, optional leading mark |
| **Spacing** | 12–20 / 4–8 |
| **Radius** | pill |
| **Shadow** | None |
| **Reusable** | label, tone |
| **Use** | Beside a section heading, trailing a card title. Only when the values differ across items. |

### 5. Icon Badge
| | |
|---|---|
| **Purpose** | Gives an icon consistent optical weight beside text |
| **Structure** | Filled container, glyph reversed out |
| **Spacing** | 16 to adjacent text, 8 inside a chip |
| **Radius** | 12 square-ish, or pill |
| **Shadow** | None |
| **Reusable** | size, shape, glyph |
| **Use** | Every icon on the site. One shape per section. |

### 6. Milestone Card
| | |
|---|---|
| **Purpose** | One step of a real sequence |
| **Structure** | Number badge → title → description |
| **Spacing** | 24 padding, 16 badge→title, 8 title→description |
| **Radius** | 24 |
| **Shadow** | 0 at rest; 2 on hover only if it links |
| **Reusable** | number, title, description, link |
| **Use** | Timelines, admission steps, learning stages. Never for peers. |

### 7. Feature Card
| | |
|---|---|
| **Purpose** | A claim with an icon, in a horizontal row |
| **Structure** | 48 icon container, left; title + description, right |
| **Spacing** | 24 padding, 16 icon gap, 8 title→description |
| **Radius** | 24 |
| **Shadow** | 1 at rest, 2 on hover if interactive |
| **Reusable** | icon, title, description, link |
| **Use** | Teaching practices, benefits, why-choose-us. Two per row. |

### 8. Development Card
| | |
|---|---|
| **Purpose** | One item in an informational collection |
| **Structure** | 40 icon badge → title → short description |
| **Spacing** | 20 padding, 16 badge→title, 8 title→description |
| **Radius** | 16 |
| **Shadow** | 1 at rest, 2 on hover if interactive |
| **Reusable** | icon, title, description, link |
| **Use** | Facilities, programmes, clubs, activities, achievements. |

### 9. Feature Grid
| | |
|---|---|
| **Purpose** | Lays out feature cards |
| **Structure** | 12-column, 6 + 6 |
| **Spacing** | 24 both axes; 40 from the header |
| **Radius** | — |
| **Shadow** | — |
| **Reusable** | column count, gutter |
| **Use** | Wherever feature cards appear. |

### 10. Card Grid
| | |
|---|---|
| **Purpose** | Lays out development cards |
| **Structure** | 12-column, 3 or 4 across; equal spans |
| **Spacing** | 24 → 32 gutter; 40 from the header |
| **Radius** | — |
| **Shadow** | — |
| **Reusable** | column count, gutter, alignment |
| **Use** | The default collection layout. Give a row one fewer column rather than strand a single card. |

### 11. CTA Banner
| | |
|---|---|
| **Purpose** | Closes a page with one action |
| **Structure** | Full-bleed band; centred heading → text → buttons |
| **Spacing** | 80 vertical, 24 heading→text, 40 text→buttons, 16 between buttons |
| **Radius** | 0 (band) · pill (buttons) |
| **Shadow** | None on the band |
| **Reusable** | heading, text, up to two links |
| **Use** | Last section of a page. **One per page.** Two CTAs is no CTA. |

### 12. Image Container
| | |
|---|---|
| **Purpose** | Holds a photograph at a predictable shape |
| **Structure** | Fixed ratio, cover fit, focal point honoured |
| **Spacing** | 24 to adjacent content |
| **Radius** | 16, matching the card it sits in |
| **Shadow** | None — the picture is its own edge |
| **Reusable** | ratio, fit, focal point, whole-image flag |
| **Use** | Cards, media-and-text bands, galleries. **Set a focal point on any photograph of people**; a centred crop takes heads off in any band shallower than the source. |

---

## 21. Build checklist

Before a page is considered done:

- [ ] Every gap is a value from §8. No 36, no 18, no 52.
- [ ] Section padding is 56 / 80. No section sets its own.
- [ ] Header → content is 40 everywhere, including where there is no paragraph.
- [ ] Three radii only: pill, 16, 24. Icon containers may use 12.
- [ ] No shadow on a coloured ground.
- [ ] No hover elevation on anything that is not interactive.
- [ ] Every icon is in a container; one container shape per section.
- [ ] Heading ranks descend without skipping; exactly one `h1`.
- [ ] Grids are lists; sequences are ordered lists; figure + caption is a `dl`.
- [ ] Focus ring visible on every ground; `:focus-within` mirrors every hover.
- [ ] 44 × 44 minimum on every interactive target.
- [ ] The page is complete and correct with all motion disabled.
- [ ] No horizontal overflow at 390px.
- [ ] At most **two** panel sections; at most **one** CTA banner.

---

## 22. The type scale — the parent that governs the site

Added 2026-09-02, after an audit found **33 different text sizes** across
`src/components`, 22 of them arbitrary one-offs (`text-[0.9375rem]`,
`text-[1.02rem]`, `text-[2.9rem]`). That is not a scale; it is 33 separate
decisions taken at 33 moments, and it was the whole reason the site read as
inconsistent page to page.

### The rule

> **A component picks a ROLE, never a size.**
> `.t-body`, never `text-[0.95rem]`.

One edit in `globals.css` now changes the whole website. It is also what makes
the accessibility bar's text-size control work uniformly — anything hardcoded
was previously immune to it.

### The roles

| Role | Size | For |
|---|---|---|
| `.t-display` | clamp 40 → 64 | Page and banner titles |
| `.t-h1` | clamp 34 → 48 | Page heading |
| `.t-h2` | clamp 28 → 36 | Section heading |
| `.t-h3` | clamp 20 → 24 | Sub-heading |
| `.t-h4` | 18 | Card title |
| `.t-lead` | clamp 17 → 20 | Standfirst |
| `.t-body` | 16 | Body copy |
| `.t-small` | 14 | Secondary text |
| `.t-caption` | 13 | Captions |
| `.t-label` | 12, tracked, uppercase | Eyebrows, chips |
| `.t-figure` | clamp 40 → 60, tabular | Statistics |
| `.t-index` | 13, tabular | Step numbers |

Every size is `rem` and clamped, so it scales with the viewport without a media
query and honours the reader's own font setting (WCAG 2.1 SC 1.4.4).

### Alignment: centred headings, justified body

The brief asked for both. **They cannot apply to the same element** —
justification stretches word-spacing until both edges are flush; centring
deliberately leaves both ragged. So the rule splits by role:

| | Alignment |
|---|---|
| Headings | Centred, `text-wrap: balance`, never justified |
| Body (`.t-prose`, `.siws-prose`) | Justified with `hyphens: auto`, capped at 68ch |
| Body below 640px | Falls back to ranged left |
| Body in a column under ~50 characters | Ranged left — add `.siws-ranged` |

**Justification without hyphenation is the failure to avoid.** On a narrow
measure the justifier stretches three words across the full width and opens
rivers of white down the paragraph, so the two are always set together. Below
640px justification is switched off entirely — the measure is too narrow for
good break points and the result is worse than a ragged edge.

**The rule is a measure, not a device width** (corrected 2026-09-02). The 640px
line is a proxy for "too few word spaces on a line to spread the slack over",
and two columns on the site are that narrow while the viewport is not:

| Column | Measure | Was | Now |
|---|---:|---|---|
| `mediaText`, the text half of a 7 + 5 split | ~43 ch | justified — rivers, and a hyphen break on most lines | ranged left |
| `richText` `narrow`, a statement set at 24px in 46rem | ~46 ch | justified — word gaps wide enough to read as tabs | ranged left |
| `mediaText` stacked, `richText` full, block intros | 63–72 ch | justified | justified |

`.siws-ranged` is the opt-out, and it lives in **`prose.css`**, beside the rule
it overrides, not in `globals.css` beside `.siws-centre`. Cascade layers outrank
specificity: `.siws-prose` is declared in the components layer, so a two-class
selector written in the base layer loses to it however specific it looks.
`.siws-centre` gets away with being written there only because its `> *` half
still reaches the paragraphs — the element itself keeps the alignment it was
told to drop. Anything new of this kind goes in `prose.css`.

**`.siws-prose` never had the 640px fallback at all** until 2026-09-02, so every
rich-text block on all four sites justified on a phone — the one width at which
the handbook says not to. `.t-prose` has carried the rule since the type scale
landed; the CMS prose it was written to govern did not.

### Migration record

| | Before | After |
|---|---|---|
| Distinct sizes in components | 33 | **0 arbitrary** |
| Sizes per rendered page | ~20 | **8–11, all from the scale** |
| Files converted | — | 19 |

**One automated attempt was reverted.** A regex sweep stripped the sizes but
did not insert the replacement roles, leaving 18 files rendering at browser
default. It was caught in verification and rolled back. The conversion has to
place the role inside the right `className` — it cannot be done by deletion
alone. Anyone repeating this work should convert file by file and check the
computed `font-size` in the browser afterwards, not just that the build passes.

