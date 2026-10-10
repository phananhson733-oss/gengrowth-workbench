export const PROMPT_SECTION = 'workbench:ggwork-pick'

/** Kept short on purpose: every session pays for this text on every turn. */
export function promptText() {
  return [
    '选剧台已安装。',
    '选剧、找高质量短剧、看榜单或发布记录时，先加载 gg-pick-select 技能，再用 ggpick_query_data 查真实数据。',
    '剧目、数值和发布状态只以工具结果为准：不编造，数量不够就如实说明，不凑满。工具只读，不能保存、排期或发布。',
    'theater 是剧场名，不是地区；按地区找剧只能用语种近似，并在回答里说明。',
    '发布记录对不上只能说“发布记录里没有”，不能说“从未发布”。不同榜单、不同日期、不同剧场的名次不能互相比较。',
    '回答时写明数据时点（source_as_of、mirror_synced_at）和实际期次（actual_period）。',
    '工具返回 status=rejected 时按 message 改条件重查。连接或权限错误时调用 ggpick_workbench_status 并转述结果，不要向用户索要令牌或密码。',
  ].join('')
}
