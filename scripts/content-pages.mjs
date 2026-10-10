// Pure parsers for the GenGrowth marketing content pages (nevermore
// `apps/marketing/content/{skills,prompts}/<locale>/*.md`). Kept free of I/O so
// the conversion rules are testable without a nevermore checkout.

/** Harness skill-name contract: lowercase kebab-case. */
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/**
 * The standard agent preset prunes `skill` tool results above this size, so a
 * larger body would reach the model truncated.
 */
export const MAX_SKILL_CHARS = 8192

export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { data: {}, body: text }
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (pair) data[pair[1]] = pair[2].trim()
  }
  return { data, body: text.slice(match[0].length) }
}

/** Lines of the `## <heading>` section, up to the next level-2 heading. */
export function section(body, heading) {
  const lines = body.split(/\r?\n/)
  const start = lines.findIndex(line => line.trim() === `## ${heading}`)
  if (start < 0) return null
  let end = lines.length
  let fenced = false
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('```')) fenced = !fenced
    if (!fenced && lines[i].startsWith('## ')) { end = i; break }
  }
  return lines.slice(start + 1, end)
}

/** The first fenced block in a section, without its fence lines. */
export function fencedBlock(lines, label) {
  const open = lines.findIndex(line => line.startsWith('```'))
  const close = lines.findIndex((line, i) => i > open && line.trim() === '```')
  if (open < 0 || close < 0) throw new Error(`${label}: unterminated fenced block`)
  const rest = lines.slice(close + 1).find(line => line.trim() !== '')
  if (rest !== undefined) throw new Error(`${label}: unexpected content after the fenced block: "${rest}"`)
  return lines.slice(open + 1, close).join('\n').trim()
}

function checked(entry, label) {
  if (!SKILL_NAME.test(entry.name)) throw new Error(`${label}: invalid skill name "${entry.name}"`)
  if (!entry.description) throw new Error(`${label}: missing description`)
  if (entry.content.length > MAX_SKILL_CHARS) {
    throw new Error(`${label}: ${entry.content.length} chars exceeds the ${MAX_SKILL_CHARS}-char skill result limit`)
  }
  return entry
}

/**
 * A skill page carries the finished SKILL.md verbatim in a fenced block under
 * `## Skill file`. It is copied as is: the page is the reviewed source.
 */
export function skillFromPage(slug, text) {
  const { data, body } = parseFrontmatter(text)
  if (data.status !== 'published') return null
  const lines = section(body, 'Skill file')
  if (!lines) throw new Error(`${slug}: no "## Skill file" section`)
  const content = fencedBlock(lines, slug) + '\n'
  const inner = parseFrontmatter(content)
  if (inner.data.name !== slug) throw new Error(`${slug}: skill frontmatter name "${inner.data.name}" differs from the page slug`)
  return checked({ kind: 'skill', name: slug, description: inner.data.description, content }, slug)
}

/**
 * A prompt page is a template with `{{variables}}`. It becomes a skill the
 * user invokes by name: the template plus the variable definitions the model
 * needs to fill it. The page's examples, FAQ and how-to prose are for readers
 * of the website and are left out.
 */
export function promptFromPage(slug, text) {
  const { data, body } = parseFrontmatter(text)
  if (data.status !== 'published') return null
  const promptLines = section(body, 'Prompt')
  if (!promptLines) throw new Error(`${slug}: no "## Prompt" section`)
  const template = fencedBlock(promptLines, slug)
  const variables = (section(body, 'Variables') ?? []).join('\n').trim()
  const used = [...new Set([...template.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)].map(m => m[1]))]
  const defined = [...variables.matchAll(/^### ([a-z0-9_]+)\s*$/gm)].map(m => m[1])
  const undefinedVariables = used.filter(name => !defined.includes(name))
  if (undefinedVariables.length) throw new Error(`${slug}: template uses undefined variables: ${undefinedVariables.join(', ')}`)
  const description = data.description
  const content = [
    '---',
    `name: ${slug}`,
    `description: ${description}`,
    '---',
    '',
    `# ${data.title ?? slug}`,
    '',
    'This is a prompt template. Fill every `{{variable}}` from what the user has',
    'already given in this conversation, then carry out the filled prompt as your',
    'instructions for this turn. If a variable marked Required is missing, ask for',
    'all missing ones in a single message and wait. Never invent an input. Leave an',
    'Optional variable empty rather than guessing it.',
    '',
    '## Variables',
    '',
    variables,
    '',
    '## Prompt',
    '',
    '```text',
    template,
    '```',
    '',
  ].join('\n')
  return checked({
    kind: 'prompt', name: slug, description, content,
    relatedSkill: data.relatedSkill || undefined, variables: used,
  }, slug)
}
