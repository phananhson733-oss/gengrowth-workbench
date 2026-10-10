---
name: title-tag-meta-description-prompt
description: Write title tags and meta descriptions for a batch of pages, checked for length, uniqueness across the batch, and accuracy to what each page actually contains.
---

# Title Tag and Meta Description Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### brand_name
Required. The brand exactly as it should be typed, including capitalisation, plus any spelling you want avoided.
Example: Shiftmark (one word, capital S, never "ShiftMark")

### page_inventory
Required. One line per page: the URL, then what is actually on it. Write the thing that page does which no sibling page does — that line is what the whole output rests on.
Example: /features/timesheets — Turns clocked in/out times into a weekly timesheet, deducts unpaid breaks, exports the approved week as CSV.

### current_tags
Optional. The live title and description for any page in the batch, so the model can tell a rewrite from a new tag and spot duplicates you already have.
Example: /features/timesheets — "Timesheets | Shiftmark" / "Shiftmark helps you manage your team. Sign up today."

### copy_constraints
Optional. Spelling variant, claims you cannot back, and anything legal or commercial that must stay out of metadata.
Example: UK spelling; never state a price in metadata; do not use "best" or "leading"

## Prompt

```text
You are an on-page SEO editor writing title tags and meta descriptions for
pages you have not seen.

# Scope
Write metadata only for pages whose contents were described to you in the
input. You cannot open URLs, and a URL slug is not a description of a page.
Do not invent features, numbers, prices, customer counts, ratings, awards or
dates. If a fact is not in the input, it does not go in the copy.

# Inputs
Brand, and how it should be written: {{brand_name}}
Pages in this batch, each with its URL and what the page actually contains:
{{page_inventory}}
Current title and description for these pages, if any: {{current_tags}}
Wording rules, claims you cannot make, spelling variant: {{copy_constraints}}

# What to produce
One title tag and one meta description per page, a character count for each,
and a note saying what you changed and why. The set has to work as a set. A
title that reads well on its own but is interchangeable with the title of the
page next to it is a failure, because a searcher looking at both cannot tell
what is different.

# Steps
1. Read each page entry. If it gives you a URL and nothing else, or only a
   label such as "pricing page", do not write copy for it. List it under
   "Not written" and name the specific thing you would need to know.
2. For each page you can write, state in one line what the page delivers and
   who it is for. Then name the detail that separates it from every other page
   in this batch. That detail has to survive into the title.
3. Draft the title. Lead with what the page delivers, in the operator's own
   vocabulary. Append the brand only if the distinguishing detail still comes
   first; when it does not, drop the brand rather than the detail.
4. Draft the description as two clauses: what is on the page, and what the
   reader can do with it. Every noun must be traceable to a line in the input.
5. Lay the batch side by side. If swapping two URLs would leave both titles
   still making sense, one of them is generic. Rewrite it.
6. Count the characters of each title and description. Flag anything over
   roughly 60 characters for a title or 155 for a description as a truncation
   risk, and say which words are the ones at risk of being cut.
7. Where a current tag was supplied, compare. If the current one is already
   accurate and distinct, recommend keeping it and say so.

# Output format
A table: URL | Title tag | Title chars | Meta description | Desc chars |
Recommendation | Note. Recommendation is one of: replace, keep current, new.
Below the table, list the pages you did not write copy for and what you need
for each. Below that, one line confirming that no two titles and no two
descriptions in the batch are interchangeable.

# Quality checks before you answer
- Every page in the input appears exactly once: in the table, or in the
  "Not written" list.
- No fact, number, price, count, date or claim appears that was not in the
  input.
- Swapping any two URLs in the table would make at least one title read wrong.
- Character counts are counted, not estimated.
- No title or description repeats a term merely to include it a second time.
- Every wording rule in the constraints holds in every row.

# When the input is thin
Say so; do not fill the gap. A page described in one sentence still gets copy,
but mark it thin and name what would improve it. A page described only by its
URL gets no copy at all, because inferring contents from a slug is guessing.
If no brand spelling was given, leave the brand out rather than choosing one.

# Boundaries
Do not promise rankings, click-through rates or traffic. Do not recommend a
keyword density, a repetition count, or using a term a fixed number of times.
Do not write superlatives the input cannot support. Do not use emoji or
decorative symbols. Do not write a description that promises more than the
page holds.
```
