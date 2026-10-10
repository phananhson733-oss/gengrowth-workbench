// The bundled skills and prompts, read from the generated manifest. No Harness
// imports here: this module is exercised directly by the unit tests.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Harness sorts same-name skills inside one registry layer by rank, lowest
 * first: user roots are 400 ($DSH_HOME/skills) and 500 (~/.agents/skills),
 * packaged skills default to 600. 300 is the rank of a configured custom root,
 * which is what this bundle is to the user.
 *
 * Rank does not help across layers: a skill root mounted by an agent preset
 * shadows a same-name global skill whatever its rank. That is what the name
 * prefix is for.
 */
export const SKILL_RANK = 300

export async function loadManifest(packageRoot) {
  const manifest = JSON.parse(await readFile(new URL('./content.manifest.json', packageRoot), 'utf8'))
  if (!Array.isArray(manifest?.entries)) throw new Error('content.manifest.json has no entries')
  return manifest
}

/**
 * @param manifest - parsed content.manifest.json
 * @param options.packageRoot - URL of the package directory, with a trailing slash
 * @param options.prefix - prepended to every name; '' keeps the source names
 * @param options.provider - the registering provider's name, required by the registry
 */
export function candidatesFrom(manifest, { packageRoot, prefix = '', provider }) {
  if (prefix !== '' && !/^[a-z0-9]+-$/.test(prefix)) {
    throw new Error(`skillPrefix must be empty or lowercase letters and digits followed by "-", got "${prefix}"`)
  }
  const seen = new Set()
  return manifest.entries.map((entry) => {
    const name = `${prefix}${entry.name}`
    if (!SKILL_NAME.test(name)) throw new Error(`invalid skill name "${name}"`)
    if (seen.has(name)) throw new Error(`duplicate skill name "${name}"`)
    seen.add(name)
    const locator = new URL(`./${entry.file}`, packageRoot)
    return {
      name,
      description: entry.description,
      // A prompt template is something the user reaches for by name. Offering
      // sixteen of them to the model on every turn would spend catalog tokens
      // on entries it should not pick by itself.
      invocation: { modelInvocable: entry.kind === 'skill', userInvocable: true },
      provider,
      source: 'bundled',
      rank: SKILL_RANK,
      locator,
      resourceBase: { kind: 'directory', path: fileURLToPath(new URL('.', locator)) },
    }
  })
}

/** The skill body the model receives: the file without its frontmatter. */
export async function readBody(candidate) {
  const text = await readFile(candidate.locator, 'utf8')
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim()
}

export function summarize(manifest, prefix = '') {
  // An absent link is left out, not set to `undefined`: this summary is returned
  // by a tool, and Harness rejects a tool result that is not lossless JSON.
  const of = kind => manifest.entries.filter(entry => entry.kind === kind).map(entry => ({
    name: `${prefix}${entry.name}`,
    description: entry.description,
    ...(entry.relatedSkill ? { relatedSkill: `${prefix}${entry.relatedSkill}` } : {}),
  }))
  return { source: manifest.source, skills: of('skill'), prompts: of('prompt') }
}
