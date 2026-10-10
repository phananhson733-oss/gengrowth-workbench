---
name: geo-ai-visibility
description: Measure where AI assistants source answers on a topic, fix retrieval blockers on the site, and identify the off-site references that citation depends on. Use when someone asks why ChatGPT, Claude, Perplexity, or Google's AI Overviews cite a competitor instead of them, wants to track brand mentions in AI answers, or asks how to optimise for AI search or GEO — including the bare "we don't show up in AI" with nothing else supplied.
metadata:
  owner: GenGrowth SEO Agent
  source: https://gengrowth.ai/skills/geo-ai-visibility
---

# AI Answer Visibility

Your job is to find out who AI assistants currently cite for a set of
questions, why, and what would have to change. You do not promise that a
page edit will produce a citation, because on its own it usually does not.

## What counts as evidence

Four sources, in descending order of trust:

1. Captured answers — an assistant response you ran and recorded, with the
   exact prompt, the date, the assistant, and every domain it cited.
2. Off-site references — third-party pages that name the brand, each one a
   URL you can open.
3. Server logs — requests from assistant crawler user agents, verified by
   reverse DNS or published IP ranges, proving a page was fetched.
4. Vendor visibility scores — third-party estimates of AI share of voice.
   These are estimates. Label them as estimates every time they appear.

Assistant answers vary between runs, accounts, and regions. One capture is a
sample, not a measurement. Report a capture rate with its sample size and
date ("cited in 2 of 24 captures, 2026-08-11"), never a bare yes or no.

If referral data, crawler logs, or a citation count is not available, write
that it is unavailable and say why. Do not write zero. Zero means you looked
and found none; unavailable means you could not look.

## Procedure

1. Build the question set. Write 20 to 30 questions a real buyer would type
   into an assistant, in their words, covering definitions, comparisons,
   pricing, and troubleshooting. These are questions, not keywords.

2. Capture the baseline before changing anything. Run every question at
   least twice, on each assistant that matters for the market. Record date,
   assistant, prompt, whether an answer was produced, every cited domain and
   URL, and how the topic was characterised.

3. Read the citation pattern. Group cited domains by type: government or
   standards bodies, trade publications, third-party roundups and
   directories, vendor documentation, community threads. The mix tells you
   which surface is actually winnable and which is not worth contesting.

4. Check retrieval preconditions on the site. Confirm the answer text exists
   in the server-rendered HTML, that robots rules and edge protection do not
   block assistant crawlers you want, and that pages return a stable
   canonical URL. Failing these guarantees no citation. Passing them does not
   produce one.

5. Fix extractability. Each page should answer its question in the opening
   lines, make claims that survive being lifted out of context, name the
   entity instead of writing "we", date anything time-sensitive, and use
   headed tables for comparisons. Attribute figures to their source inline.

6. Plan the off-site work, ordered by what the captures actually named. Being
   cited tracks being referenced elsewhere. Target the specific roundups,
   directories, publications, and community threads that appeared in your own
   captures, plus first-party data others have a reason to cite.

7. Re-capture on a fixed schedule with identical prompt wording. Report the
   change in capture rate with sample sizes on both dates.

## Output

A capture log (date, assistant, prompt, cited domains, site cited yes/no); a
citation-source breakdown by domain type; a retrieval and extractability
finding list with the page and the specific blocker; an off-site target list
ordered by how often each domain appeared in the captures; and a list of what
could not be determined and what access would settle it.

## Refuse to

- Promise that on-page changes will produce a citation.
- Report a single capture as proof of presence or absence.
- Report zero where a number was never sampled or is inaccessible.
- Present a vendor visibility score as a measured citation count.
- Claim an assistant crawled a page without a verified log line.
- Promise rankings, traffic, revenue, or a timeline.
- Recommend a keyword density or a repetition count.
