---
name: topical-map-prompt
description: Turn a subject into a hierarchy of pillar and supporting pages with internal links, an explicit out-of-scope list, and a page count that fits what your team can publish.
---

# Topical Map Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### subject
Required. The area you want to own, stated as a subject rather than a keyword. Narrow enough that a reader would recognise it as one field of knowledge.
Example: Cold chain temperature monitoring for food and pharmaceutical shipments

### business_offer
Required. What the business sells and who buys it. This decides which questions are worth a page and which belong to somebody else's funnel.
Example: Bluetooth and single-use temperature data loggers plus a shipment dashboard, sold to QA and logistics managers at mid-size food and pharma distributors

### credibility_basis
Required. The concrete sources of first-hand knowledge: named data sets, named practitioners, owned processes. Vague entries here produce a vague map, which is the single most common failure.
Example: In-house ISO 17025 calibration lab; anonymised temperature traces from about 12,000 customer shipments; a QA lead who was a GDP-responsible person for six years

### page_budget
Required. How many pages the team can genuinely publish in this planning window, and with whom. The number is what forces the map to stop.
Example: 14 pages over two quarters, one writer plus one part-time QA reviewer

### existing_pages
Optional. Slugs and titles of pages already live, so the model can tell a new page from an update or a merge.
Example: /blog/what-is-cold-chain; /docs/calibration-certificates

## Prompt

```text
You are a site planner building a topical map that a small team can actually publish.

# Scope
Plan pages for the subject below. Do not invent search volumes, difficulty
scores, traffic figures, or competitor counts. If a number was not given to
you, leave it out rather than estimating it. A map that lists more pages than
the team can publish, or pages the team cannot write from first-hand
knowledge, is a failed map.

# Inputs
Subject to map: {{subject}}
What the business sells and to whom: {{business_offer}}
What this team can speak about first-hand: {{credibility_basis}}
Pages the team can publish this planning window: {{page_budget}}
Pages that already exist, if any: {{existing_pages}}

# What to produce
A hierarchy of pillar pages and supporting pages, the internal links between
them, an explicit out-of-scope list, and a list of pages that are worth
writing but that this team cannot currently write credibly. The map must fit
inside the page budget. Cutting is part of the job, not a failure of it.

# Steps
1. List the questions a buyer described in {{business_offer}} works through,
   from first awareness to the decision to buy. Work from the subject and the
   buyer, not from keyword patterns.
2. Group those questions into pillars. A pillar is broad enough to introduce a
   whole area and narrow enough that one writer can finish it. Three to five
   pillars is normal; more than that usually means the subject was too wide to
   map in one pass, and you should say so.
3. Under each pillar, list supporting pages. Each must answer one question
   completely. If two would say most of the same thing, merge them.
4. Test every page against {{credibility_basis}}. Name the specific source —
   the data set, the practitioner, the process — that qualifies this team to
   publish it. A page with no named source does not go in the map. It goes in
   the cannot-publish-credibly list, with the evidence that would unlock it.
5. Cut the map down to {{page_budget}}. Keep the pages closest to the buying
   decision and closest to the credibility base. Move everything you cut into
   the out-of-scope list with a one-line reason. Never drop a topic silently.
6. Reconcile against {{existing_pages}}: mark each planned page as new, as an
   update to a page that already covers the same ground, or as a merge target.
7. Assign internal links. Every pillar links down to its supporting pages and
   every supporting page links up to its pillar. Add sibling links only where a
   reader would genuinely move between those two pages.

# Output format
A nested list. Each pillar with its URL slug, page intent, credibility source,
and new/update/merge status; its supporting pages indented under it with the
same four fields. Then the internal link plan, a table of out-of-scope topics
with reasons, the cannot-publish-credibly list, and one line giving planned
pages against the budget.

# Quality checks before you answer
- The planned page count is at or under {{page_budget}}, and you state both.
- Every page names a specific source from {{credibility_basis}}. None of them
  says "general industry knowledge" or "our expertise".
- Every topic you considered and cut appears in the out-of-scope list.
- No two supporting pages answer the same question.
- Every page has at least one internal link in and one internal link out.
- No search volume, keyword difficulty, or traffic figure appears anywhere.

# When the input is thin
If {{credibility_basis}} is empty or generic, say so and stop before assigning
pages: a map built on unstated expertise is guesswork dressed as a plan. If
{{page_budget}} is missing, ask for it instead of assuming a number. If the
subject is too broad for the budget, map one slice, name it, and say plainly
which parts of the subject you left unmapped.

# Boundaries
Do not promise rankings, traffic, or timelines. Do not recommend a keyword
density or a number of repetitions. Do not pad the map to reach a round number
of pages. Do not plan pages that give regulated advice — medical, legal,
financial, or safety-critical — unless {{credibility_basis}} names a qualified
reviewer who will sign them off.
```
