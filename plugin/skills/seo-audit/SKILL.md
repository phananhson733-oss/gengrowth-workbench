---
name: seo-audit
description: Diagnose one site at one point in time, ordering findings by stated severity rules and marking every check that could not be run as unchecked. Use when someone asks for an SEO audit, a site health check, or what is wrong with their site, including when they supply only a domain and expect findings ordered by what to fix first.
metadata:
  owner: GenGrowth SEO Agent
  source: https://gengrowth.ai/skills/seo-audit
---

# SEO Audit

Your job is to produce a diagnosis of one site as it stands on one date. Every
finding names how it was observed. Every check that could not be run is listed
as unchecked, not as passed. There is no overall score.

## What counts as evidence

Five sources, in descending order of trust:

1. Retrieved — a response you fetched yourself: status code, headers,
   robots.txt, sitemap XML, raw HTML before JavaScript, rendered DOM after it.
   Quote the URL and say which of raw or rendered you read.
2. Measured — the site's own Search Console and analytics data: impressions,
   clicks, indexing status, average position over a named date range.
3. Observed — what live search results show for a query today.
4. Provider-supplied — third-party crawler or metrics output. An estimate,
   labelled as such everywhere it appears.
5. Reported — what the team told you about the CMS, the build, or the redirect
   layer. A claim. Either verify it and promote it to retrieved, or record it
   as unchecked.

A number you did not obtain is unavailable. Write "unavailable" and say what
would produce it. Never write zero in its place: zero is a measurement.

## Severity rules

Assign severity from these definitions, not from judgement:

- Blocking — the page cannot be reached, crawled, or indexed, or its main
  content is absent from what a crawler receives. Requires retrieved evidence:
  a status code, a directive, or a raw-HTML fetch.
- Major — the page is reachable and indexable, but the thing the searcher asked
  for is not on it, or the site competes against itself for the same query.
- Minor — the implementation deviates from convention with no observable effect
  on what a crawler or a searcher receives.
- Unchecked — the check could not be run with the access available.

## Procedure

1. Fix the boundary. Name the hostnames in scope, the sections in scope, the
   date, and the access you have. An audit is a photograph with a timestamp; a
   finding without a date cannot be re-tested later.

2. Take the delivery layer first. Fetch robots.txt and the sitemaps. Sample
   URLs from each sitemap and record the status code, the final URL after
   redirects, the canonical, and the robots directives. Discrepancies here
   invalidate everything measured downstream.

3. Read raw HTML before rendered DOM on the pages that carry measured demand.
   If the main content only exists after JavaScript runs, say so and name the
   URLs you checked.

4. Rank pages by measured impressions, not by your own sense of importance.
   Audit the top pages properly rather than every page shallowly. State how
   many you examined and how you chose them.

5. For the queries those pages already appear for, look at what ranks now and
   what those pages cover. A gap between the two is a Major finding with the
   query named.

6. Order findings by severity band, then within each band by measured demand on
   the affected URLs. Where demand is unavailable, order by internal link depth
   and say you used a proxy. Do not blend severity and demand into one number.

7. Write the unchecked list last, with the access or data that would settle
   each item.

## Output

A findings table: finding, severity and the rule that triggered it, evidence
type and the URL or query it came from, count of affected URLs and how that
count was obtained, and the change to make. Then the unchecked list. Then two
sentences on what the site's current constraint appears to be.

## Refuse to

- Emit an overall SEO score, grade, or percentage.
- Mark a check as passed when it could not be run.
- Present an estimate, a provider metric, or a claim as a measurement.
- Substitute zero for a number that was unavailable.
- Extrapolate an affected-URL count without labelling it an extrapolation.
- Promise a ranking, a traffic figure, revenue, or a timeline.
- Recommend a keyword density or a repetition count.
- Report a finding without naming how it was observed.
