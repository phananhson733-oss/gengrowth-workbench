export const PROMPT_SECTION = 'workbench:gengrowth'

/** Kept short on purpose: every session pays for this text on every turn. */
export function promptText({ prefix }) {
  return [
    'GenGrowth SEO/GEO workbench is installed.',
    `For SEO or GEO work, load the matching ${prefix}* skill before answering from memory.`,
    'Site tools are named gengrowth_*; they measure live sites, so prefer their output over assumptions, and report a tool failure instead of substituting an estimate.',
    'If a GenGrowth tool reports api_not_configured or api_unreachable, call gengrowth_workbench_status and tell the user what it says. Never ask for an API key or token in conversation.',
  ].join(' ')
}
