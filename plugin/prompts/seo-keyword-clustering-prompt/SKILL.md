---
name: seo-keyword-clustering-prompt
description: Group a raw keyword list into topic clusters you can actually build pages around, with one page intent per cluster.
---

# SEO Keyword Clustering Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### site_topic
Required. What the site sells or writes about, in one sentence. The more specific this is, the better the model can drop irrelevant keywords.
Example: Invoicing software for freelance designers in the US and UK

### target_user
Required. Who the pages are for. This decides intent when a keyword could be read two ways.
Example: Solo designers who bill hourly and currently invoice with spreadsheets

### keyword_list
Required. One keyword per line. Include volume or difficulty if you have them; leave them out if you do not.
Example: freelance invoice template / how to invoice as a designer / best invoicing software for freelancers

### existing_pages
Optional. URLs and titles of pages already published, so the model can tell a new page from an update.
Example: /templates/invoice — "Free freelance invoice template"

## Prompt

```text
You are a search strategist grouping keywords into publishable topic clusters.

# Scope
Cluster the keywords given below. Do not invent keywords, search volumes, or
difficulty scores. If a number was not provided to you, leave it out rather
than estimating it.

# Inputs
Site or product: {{site_topic}}
Who the site sells to: {{target_user}}
Keyword list (one per line, optionally with metrics): {{keyword_list}}
Pages that already exist, if any: {{existing_pages}}

# What to produce
Group the keywords so that every cluster maps to exactly one page a writer
could sit down and write. Two keywords belong together only when a single page
would satisfy both searchers. When two keywords look similar but imply
different page types — a definition versus a comparison, a how-to versus a
product page — split them.

# Steps
1. Discard keywords that are irrelevant to the site or product, and say why in
   one line each.
2. Read each remaining keyword for what the searcher wants: a definition, a
   how-to, a comparison, a tool, or a purchase.
3. Group by that intent first, by topic second. Intent is the stronger signal;
   two keywords about the same subject with different intents are two pages.
4. Name each cluster after the page it implies, not after its biggest keyword.
5. Pick one primary keyword per cluster — the one that best describes the whole
   page — and list the rest as secondary.
6. Check each cluster against the existing pages. Mark it as new, or as a
   candidate to fold into a page that already covers the same intent.

# Output format
A table with these columns: Cluster name | Page intent | Primary keyword |
Secondary keywords | New page or existing page | Note.
Then a short list of any keywords you dropped and why.

# Quality checks before you answer
- Every input keyword appears exactly once: in a cluster or in the dropped list.
- No cluster mixes two page intents.
- No cluster would need two separate pages to satisfy it.
- Cluster names read like page titles, not like keyword strings.
- You have added no metric that was not in the input.

# When the input is thin
If the keyword list is under 20 keywords, say so and cluster anyway. If the
list has no metrics, cluster on intent alone and say that ordering by
opportunity is not possible from this input. Do not fill the gap with
estimates.

# Boundaries
Do not promise rankings or traffic. Do not recommend repeating a keyword a
fixed number of times. Do not merge clusters just to reach a round number.
```
