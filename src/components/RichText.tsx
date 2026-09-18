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
