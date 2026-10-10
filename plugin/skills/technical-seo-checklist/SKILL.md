---
name: technical-seo-checklist
description: Explain why specific URLs are missing from the index, separating blocked from undiscovered from deliberately excluded, using observed responses only. Use when pages are missing from Google, when someone asks about indexing, crawl budget, robots.txt, canonicals, or sitemaps, or when Search Console reports a URL as discovered but not indexed and the cause has not been established.
metadata:
  owner: GenGrowth Tech Agent
  source: https://gengrowth.ai/skills/technical-seo-checklist
---

# Technical SEO

Your job is to explain why specific URLs behave the way they do in search,
using responses you observed rather than causes you assumed. A page missing
from the index has several possible causes, and reporting one cause for all of
them is the most common way a technical review spends a sprint on nothing.

## What counts as evidence

Four sources, in descending order of trust:

1. Observed response — what the server returned when you requested the URL:
   status, headers, body. Reproducible right now, so it is the strongest
   evidence available. Record the user agent you used; the answer can depend
   on it.
2. Search engine report — URL Inspection and the page indexing report. This is
   what the engine did, which no fetch of yours can reveal. It lags by days and
   its example lists are capped, so read it as a state, not as a complete
   inventory.
3. Crawler output — a crawler's own summary across many URLs. Good for finding
   candidates at scale, but it reflects that crawler's settings: user agent,
   whether it executed JavaScript, how fast it went.
4. Inference — what you conclude from the above. Always labelled as inference,
   never merged into the first three.

If you did not observe a cause, do not name one.

## Four states, four kinds of evidence

Never report "not indexed" as a single problem. Split it:

- Blocked. A robots rule prevents the fetch. Evidence: the matching rule and
  the user agent it applies to. A blocked URL can stay indexed, and a noindex
  tag on a blocked URL is never read.
- Not discovered. Nothing points at the URL — no internal link in the crawled
  HTML, no sitemap entry, no redirect target. Evidence: absence from the link
  graph you built, not absence from a report.
- Deliberately excluded. The page is reachable and says not to index it: a
  robots meta tag, an X-Robots-Tag header, or a canonical pointing elsewhere.
  Evidence: the tag or header, quoted.
- Fetched and not selected. The engine retrieved the page and did not index it.
  Evidence: the engine's own report, and nothing else. You cannot observe the
  reason. State what you ruled out, then stop.

## Procedure

1. Read robots.txt and every sitemap it references. Record which rules apply to
   which user agents, and which URL patterns each rule actually matches.
2. Crawl from the homepage and build the internal link graph. Keep the raw
   result for every URL: final status, full redirect chain, response headers.
3. For each template, compare raw HTML with the rendered DOM. Note any link,
   canonical, or main content that exists only after JavaScript runs.
4. Reconcile the sets: sitemap members that nothing links to, linked URLs
   absent from the sitemap, and sitemap members returning anything but 200.
5. Classify every non-indexed URL into one of the four states, evidence
   attached. Leave a URL unclassified rather than guessing at it.
6. Check directives against each other: canonical target status, canonical host
   and protocol, canonicals pointing at noindexed pages, redirect chains longer
   than one hop, and 200 responses whose body is an error message.
7. Validate structured data twice per template — as markup (required
   properties, correct types, resolvable references) and against the page (does
   the page show what the markup asserts).
8. Order fixes by dependency, not by severity. Unblocking a path so its noindex
   becomes readable is a prerequisite, not a preference.

## Output

A table of URL patterns with state, the evidence for that state, and the fix.
Then contradictions, ordered by dependency. Then what you could not determine,
why, and what access would settle it.

## Refuse to

- Name a cause you did not observe.
- Scale a sampled state up into a count.
- Present a crawler's coverage summary as the search index's state.
- Substitute zero for a number you could not obtain.
- Promise a rich result, a ranking, a traffic number, or a timeline.
- Recommend a fix whose prerequisite has not been done first.
