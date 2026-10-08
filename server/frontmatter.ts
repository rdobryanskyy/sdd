/**
 * The one YAML-frontmatter parser that the server uses. It is minimal on purpose.
 * The SDD artifacts contain only flat `key: scalar` lines, the same as
 * read_frontmatter in the Python validator. Thus this is a line scanner, not a
 * YAML engine.
 *
 * The parser returns the values RAW, with the inline comments and quotes. If a
 * caller must have config semantics, it normalizes the values with stripComment/unquote.
 */

/** Top-level scalar keys of a leading `---` frontmatter block. */
export function frontmatter(text: string): Record<string, string> {
  if (!text.startsWith('---')) return {}
  const end = text.indexOf('\n---', 3)
  if (end === -1) return {}
  const out: Record<string, string> = {}
  for (const line of text.slice(3, end).split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

/** `[a, b]` or `a, b` → ['a', 'b']. The quotes are removed from each item. */
export function parseList(v: string | undefined): string[] {
  if (!v) return []
  let s = v.trim()
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1)
  return s
    .split(',')
    .map((x) => x.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

/** Normalize a config value: remove an inline `# comment` and the outer quotes. */
export function configValue(raw: string): string {
  return raw.replace(/#.*$/, '').trim().replace(/^["']|["']$/g, '')
}
