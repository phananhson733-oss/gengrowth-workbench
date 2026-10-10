// The skills bundled with this workbench. No Harness imports here: this module
// is exercised directly by the unit tests.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const SKILL_NAMES = ['gg-pick-select', 'gg-pick-glossary']
// Same rank as a configured custom skill root. The `gg-` prefix is what keeps
// these names from being shadowed by a skill root an agent preset mounts.
const SKILL_RANK = 300

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u

function frontmatterOf(source, file) {
  const block = FRONTMATTER.exec(source)?.[1]
  if (!block) throw new Error(`${file} has no frontmatter`)
  const fields = {}
  for (const line of block.split(/\r?\n/u)) {
    const match = /^([a-z]+):\s*(.+)$/u.exec(line)
    if (match) fields[match[1]] = match[2].trim()
  }
  return fields
}

/**
 * @param options.packageRoot - URL of the package directory, with a trailing slash
 * @param options.provider - the registering provider's name, required by the registry
 */
export async function loadSkills({ packageRoot, provider }) {
  return Promise.all(SKILL_NAMES.map(async (name) => {
    const locator = new URL(`./skills/${name}/SKILL.md`, packageRoot)
    const fields = frontmatterOf(await readFile(locator, 'utf8'), `skills/${name}/SKILL.md`)
    if (fields.name !== name) throw new Error(`skills/${name}/SKILL.md declares the name "${fields.name}"`)
    if (!fields.description) throw new Error(`skills/${name}/SKILL.md has no description`)
    return {
      name,
      description: fields.description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider,
      source: 'bundled',
      rank: SKILL_RANK,
      locator,
      resourceBase: { kind: 'directory', path: fileURLToPath(new URL('.', locator)) },
    }
  }))
}

/** The skill body the model receives: the file without its frontmatter. */
export async function readBody(candidate) {
  return (await readFile(candidate.locator, 'utf8')).replace(FRONTMATTER, '').trim()
}
