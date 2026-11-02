/**
 * Whether a Lexical rich-text value holds any visible text. An editor that was
 * opened and cleared still stores an empty paragraph, so "has a value" is not
 * the same as "has something to read".
 */
export const richTextHasText = (value: unknown): boolean => {
  const walk = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false
    const { text, children } = node as { text?: unknown; children?: unknown }
    if (typeof text === 'string' && text.trim().length > 0) return true
    return Array.isArray(children) && children.some(walk)
  }
  return walk((value as { root?: unknown } | null | undefined)?.root)
}
