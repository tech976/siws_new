import {
  BlocksFeature,
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { RichTextField } from 'payload'

import { VideoEmbedBlock } from '@/blocks/inline/VideoEmbed'

/**
 * FR-CMS-02 / BR-EDIT-02 — the WYSIWYG editor.
 *
 * BR-EDIT-05 requires that "the editor shall sanitise pasted and embedded
 * markup so that content entry cannot introduce script into a public page".
 * Lexical satisfies this structurally rather than by filtering: pasted HTML is
 * parsed into a fixed set of known node types and stored as JSON, so there is
 * no raw markup to escape. The public site then renders those nodes through
 * Payload's React converter — never `dangerouslySetInnerHTML` — which closes
 * the loop. Any deviation from that rendering rule would reopen the hole.
 */

interface RichTextOptions {
  name?: string
  label?: string
  required?: boolean
  /** Restrict to inline formatting only — for short intros and captions. */
  simple?: boolean
  admin?: RichTextField['admin']
}

export const richTextField = ({
  name = 'content',
  label,
  required = false,
  simple = false,
  admin,
}: RichTextOptions = {}): RichTextField => ({
  name,
  type: 'richText',
  label,
  required,
  admin,
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => {
      if (simple) {
        // Paragraph, bold/italic/underline, links and lists only. No headings:
        // a heading inside an intro paragraph breaks the document outline that
        // screen-reader users navigate by.
        return [
          ...defaultFeatures.filter(
            (feature) =>
              !['heading', 'upload', 'blockquote', 'horizontalRule', 'blocks'].includes(
                feature.key,
              ),
          ),
          InlineToolbarFeature(),
        ]
      }

      return [
        ...defaultFeatures,
        /**
         * H1 is deliberately excluded. Every page renders exactly one H1 — its
         * title — and a second one in the body would break heading order
         * (WCAG 2.1 SC 1.3.1) without the editor ever being aware.
         */
        HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
        HorizontalRuleFeature(),
        /*
         * BR-EDIT-02 — tables (a fee structure, a timetable, a list of
         * results) and embeds. Payload labels its table support experimental;
         * it is used here for simple grids, which is all a school write-up
         * needs, and renders through the same structured converter as
         * everything else.
         */
        EXPERIMENTAL_TableFeature(),
        BlocksFeature({ blocks: [VideoEmbedBlock] }),
        FixedToolbarFeature(),
        InlineToolbarFeature(),
      ]
    },
  }),
})

/** Re-exported so callers composing their own editors stay on one import. */
export { BlocksFeature, lexicalEditor }
