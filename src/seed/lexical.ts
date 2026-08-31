/**
 * Builds a minimal Lexical document.
 *
 * Payload stores rich text as a node tree rather than HTML or Markdown, so seed
 * content has to be expressed in that shape. Shared here rather than copied into
 * each seed script — there were three near-identical copies drifting apart.
 */

/** Shared shape for every element node. Lexical rejects nodes missing these. */
const common = {
  format: '' as const,
  indent: 0,
  version: 1,
  direction: 'ltr' as const,
}

/** `format: 1` is Lexical's bold bit. */
const text = (body: string, bold = false) => ({
  type: 'text',
  detail: 0,
  format: bold ? 1 : 0,
  mode: 'normal',
  style: '',
  text: body,
  version: 1,
})

const paragraph = (children: unknown[]) => ({
  type: 'paragraph',
  ...common,
  textFormat: 0,
  children,
})

/** Wraps any set of block-level nodes in a root, ready to store. */
export const richTextNodes = (children: unknown[]) => ({
  root: { type: 'root', ...common, children },
})

/**
 * A rich-text document built from plain strings.
 *
 * Each entry is one paragraph. Pass an ARRAY of strings where a paragraph is
 * broken across several lines: a statement written as two or three short
 * lines is a single thought, and giving each line its own paragraph pushes a
 * blank line between the parts and turns it into two or three.
 */
export const richText = (paragraphs: (string | string[])[]) =>
  richTextNodes(
    paragraphs.map((entry) =>
      paragraph(
        (Array.isArray(entry) ? entry : [entry]).flatMap((body, index) =>
          index === 0 ? [text(body)] : [{ type: 'linebreak', version: 1 }, text(body)],
        ),
      ),
    ),
  )

/** One paragraph broken across several lines. `richText([lines])` exactly. */
export const richTextLines = (lines: string[]) => richText([lines])

export interface ListEntry {
  /** Rendered bold, e.g. the name of a scholarship fund. */
  term: string
  /** Rendered plain after an em dash. Omit for a plain item. */
  detail?: string
}

/**
 * A real `<ol>` rather than paragraphs that merely start with "1.".
 *
 * The scholarship register runs to 144 funds, and a screen reader announcing
 * "list, 84 items" is the difference between a navigable reference and a wall
 * of prose. Lexical's `listitem.value` carries the visible number, so an entry
 * can never drift out of step with its position.
 */
export const orderedList = (entries: ListEntry[]) =>
  ({
    type: 'list',
    listType: 'number' as const,
    tag: 'ol' as const,
    start: 1,
    ...common,
    children: entries.map((entry, index) => ({
      type: 'listitem',
      value: index + 1,
      ...common,
      children: [
        text(entry.term, true),
        ...(entry.detail ? [text(` — ${entry.detail}`)] : []),
      ],
    })),
  }) as unknown

/** A standalone paragraph node, for mixing with lists in `richTextNodes`. */
export const para = (body: string) => paragraph([text(body)])
