---
name: internal-linking
description: Audit a site's internal link graph and decide, per page, whether to link, merge, retire, or leave it alone — with the evidence for each verdict attached. Use when someone asks about internal links, orphan pages, site structure, anchor text, or link equity, and when a site has indexed pages that get no traffic and nobody has decided which of them deserve the links.
metadata:
  owner: GenGrowth Tech Agent
  source: https://gengrowth.ai/skills/internal-linking
---

# Internal Linking

Your job is to change the link graph, not to add links. Adding a link is one of
four possible verdicts, and often the wrong one. Every change you propose
carries the reader-facing reason it exists and the evidence behind it.

## What counts as evidence

Four sources, in descending order of trust:

1. Crawled — the link graph as a crawler sees it after rendering. An edge only
   counts if the source page returns 2xx, is indexable, and the link is in body
   content. This is the only source that proves a link exists.
2. Measured — Search Console. Which queries each URL actually appears for, and
   with what impressions. This is how you tell which of two overlapping pages
   search engines have already chosen.
3. Declared — sitemaps, navigation config, CMS taxonomy. Proves intent, not
   reachability. A page in the sitemap with no body link pointing at it is an
   orphan regardless of what the CMS thinks.
4. Inferred — topical similarity read from page content. Use it to propose
   candidate links. Never use it alone to assert that two pages duplicate each
   other; that claim needs measured query overlap.

Templated links — global navigation, footers, sidebars, related-post widgets —
are counted separately from contextual body links, and never reported as the
same number. A page linked from every footer on the site is not linked to; it
is boilerplate.

When the crawl could not reach a page, its inbound count is unavailable. Do not
report it as zero. Zero inbound links is a finding; a failed request is not.

## Procedure

1. Crawl and build the graph. For each URL record: status code, indexability,
   canonical target, click depth from the homepage, contextual inbound links,
   templated inbound links, and outbound contextual links.

2. Split boilerplate from context. Compute inbound counts twice, with and
   without templated edges. The contextual count is the one that describes
   whether anyone chose to link to the page.

3. Find orphans and near-orphans. List pages with zero contextual inbound
   links, then pages reachable only through deep pagination. Group them by
   topic — orphans usually arrive in clusters, and the cluster tells you which
   hub page failed to link out.

4. Find intent collisions. For each pair of pages with substantially
   overlapping Search Console query sets and the same page type, name the
   incumbent: the URL that already receives the impressions. Two pages
   splitting one intent do not need links between them.

5. Audit anchors. Read the anchor and the sentence containing it. Flag anchors
   that promise something the destination does not cover, bare URLs, "read
   more" and "click here", and any link whose destination is noindex,
   redirecting, or returning an error.

6. Assign one verdict per page: promote (add contextual inbound links from
   pages that genuinely reference it), consolidate (merge into the incumbent
   and redirect), retire (remove and redirect, with no replacement), or leave.
   State the verdict before proposing any edge.

7. Write the edges last, and only for pages with a promote verdict. Each
   proposed link names the source URL, the destination, the anchor, and the
   sentence it sits in. If you cannot write the sentence, the link does not
   belong there.

## Output

An edge-change list: source, destination, anchor, surrounding sentence, reason.
A consolidation table: page, verdict, incumbent URL, redirect target, evidence.
An orphan list grouped by topic, with the hub that should have linked out.
An anchor-repair list. Finally, what you could not determine and what data
would settle it.

## Refuse to

- Propose a link because a phrase matched a page title, with no reader-facing
  reason for the link.
- Count navigation, footer, or widget links as evidence a page is linked.
- Recommend a number of links per page, an anchor repetition count, or a
  keyword density.
- Report an inbound count of zero when the crawl failed to reach the page.
- Recommend a merge without naming the incumbent and the measured evidence for
  it.
- Add a reciprocal link between two pages that compete for the same intent.
- Link to a URL that is noindex, redirecting, or returning an error.
- Promise a ranking movement, a traffic figure, or a timeline.
