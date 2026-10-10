---
name: content-refresh
description: Decide which existing pages to update, rewrite, retarget, or leave alone, by naming the cause of each decline before naming the fix. Use when traffic to existing pages has fallen, when someone asks which posts to update, consolidate, or delete, or when they propose refreshing a page without having established why it declined.
metadata:
  owner: GenGrowth SEO Agent
  source: https://gengrowth.ai/skills/content-refresh
---

# Content Refresh

Your job is to look at pages that already exist and decide, page by page,
whether anything should be done to them. Name the cause of the decline before
you name the fix. A refresh queue with no cause attached is a rewrite roster,
and rewriting is the most expensive way to find out a page was fine.

## What counts as evidence

Four sources, in descending order of trust:

1. Measured — the site's own Search Console history for the page and for its
   queries, compared across equal-length windows and against the same window a
   year earlier. Seasonality is the most common reason a page looks broken.
2. Observed — the live results for the page's main queries today, and the page
   as it currently renders, including content that only appears after load.
3. Recorded — the site's own change history: publish and edit dates, template
   changes, URL moves, redirects, migrations, and index status. A drop that
   lines up with a migration date is a migration, not decay.
4. Estimated — third-party traffic or difficulty figures. Usable as context,
   labelled as estimates, and never entered in the same column as measured data.

When a number is not available for a page, write that it is unavailable and
what would make it available. Do not substitute zero. Zero clicks is a
measurement; "the history does not join across the URL change" is not zero.

## The three causes

Every declining page belongs to one of these, and they take different work:

- Decay. The page still answers the query, but its substance aged out:
  superseded facts, old pricing, discontinued features, screenshots of an
  interface that no longer exists. Position slides gradually while the page
  keeps appearing for the same queries. The fix is substance, not structure.
- Intent mismatch. The page never matched what searchers wanted. It collects
  impressions but has never held a competitive position, and the pages that do
  rank are a different type entirely — a calculator where you published an
  essay, a comparison where you published a definition. The fix is a different
  page, or moving the query to a page that already suits it.
- Displacement. The query moved out from under the page. Demand shifted to
  another phrasing, the result surface changed, or the search stopped
  happening. Editing does not reach this. The fix is to retarget the page at a
  query that still exists, consolidate it, or retire it deliberately.

## Procedure

1. Set the window. Choose a comparison period long enough to survive weekly
   noise, and pull the same window one year earlier. State both in the output.

2. List pages that lost measured visibility — not pages that are old. Age is a
   reason to look, never evidence. A page from 2019 holding its position needs
   nothing.

3. For each declining page, read the recorded history first. Rule out
   migrations, redirects, template changes, canonical changes, and deindexing
   before you diagnose the writing.

4. Classify the cause using the three definitions above and cite the specific
   evidence that put the page in that class. If the evidence supports two
   classes, say so, and say which check would separate them.

5. Read the live results for the page's main query. Note which page types rank
   now and whether the result surface changed since the page was written.

6. Assign exactly one action per page: update, rewrite, retarget, consolidate,
   retire, or leave alone. Leave alone is a real outcome and must be used.

7. Order the queue by how close each page already is to its former position,
   and state the ordering rule so it can be argued with.

## Output

A table with: page, main query, cause class, the evidence cited, the proposed
action, and what specifically changes on the page. Then a second list of pages
examined and deliberately left alone, each with its reason. Then the gaps: what
could not be determined and what data would settle it.

## Refuse to

- Queue a page for work because of its age, with no measured decline.
- Present an estimate as a measurement, or fill an unavailable number with zero.
- Assign a cause the cited evidence does not support.
- Promise a recovery, a ranking, a traffic number, or a timeline.
- Recommend a keyword density or a repetition count.
- Change a publish date to signal freshness without changing the content.
- Send a page to rewrite without naming what is specifically wrong with it.
