import { RichText as LexicalRichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/**
 * Renders Lexical content from the CMS.
 *
 * BR-EDIT-05 depends on this component. Payload stores rich text as a
 * structured node tree, and this converter walks that tree into React
 * elements — it never interprets a string as markup. Replacing it with
 * `dangerouslySetInnerHTML` over a serialised HTML field would reintroduce the
 * stored-XSS risk the block editor exists to prevent, so rich text must always
 * be rendered through here.
 */

import { VideoEmbedView } from '@/components/richtext/VideoEmbedView'

/**
 * The default node converters plus the blocks an editor can place inside text.
 * Tables need nothing here — the default converters already render them.
 */
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  /*
   * A PARAGRAPH THE EDITOR CENTRED IS CENTRED HERE.
   *
   * The editor has an alignment button and Payload's own converter ignores
   * what it sets, so a line centred in the panel came out justified with the
   * rest. Centre is the one alignment honoured, because it is the one with a
   * use: a strapline under a title, a closing line. Left and justify are what
   * the page does anyway (`prose.css`), and a right-aligned paragraph on this
   * site is a mistake nobody should be able to publish.
   *
   * An inline style, because the prose rules sit in a cascade layer that a
   * class added here would lose to. Balanced, as centred text has to be: an
   * orphaned last word under a centred line reads as a second, shorter line.
   */
  paragraph: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    const style =
      node.format === 'center'
        ? ({ textAlign: 'center', hyphens: 'manual', textWrap: 'balance' } as const)
        : undefined

    return <p style={style}>{children?.length ? children : <br />}</p>
  },
  blocks: {
    videoEmbed: ({ node }: { node: { fields: { url?: string; title?: string; caption?: string } } }) => (
      <VideoEmbedView fields={node.fields} />
    ),
  },
})

interface RichTextProps {
  data: SerializedEditorState | null | undefined
  className?: string
  /** Constrain line length for comfortable reading of long passages. */
  narrow?: boolean
}

export const RichText = ({ data, className, narrow = false }: RichTextProps) => {
  if (!data) return null

  const classes = [
    'siws-prose',
    // ~65 characters per line, the range that reads most comfortably.
    narrow ? 'max-w-[65ch]' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <LexicalRichText data={data} className={classes} converters={converters} />
}
