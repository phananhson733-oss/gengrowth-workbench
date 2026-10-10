---
name: seo-article-outline-prompt
description: Turn a topic and its search intent into a section-by-section outline where every heading states what it proves, with unequal word budgets and an explicit cut list.
---

# SEO Article Outline Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### topic_and_query
Required. The article subject plus the exact query it is written for. Write the query the way a person types it, not the way a keyword tool formats it.
Example: How to read your restaurant's labor cost percentage, targeting "restaurant labor cost percentage"

### search_intent
Required. Who the reader is, what pushed them to search, and the moment they would stop reading. The stopping point is what decides which section goes first.
Example: An owner of 3-6 restaurants who just saw labor at 34% and wants to know whether that is bad before next week's schedule goes out

### available_evidence
Required. Everything the author can actually open and cite, with sample sizes and dates where they exist. List what you do not have as well, so the model cannot quietly assume it.
Example: Shiftwell aggregate, 412 locations, 12 months to June 2026; nine owner interviews, Q2 2026; not available: revenue or cover counts

### word_budget
Required. The real total length you will write to. This is what forces the allocation trade-off, so use the number you mean.
Example: 1600

### competing_pages
Optional. What the pages currently ranking for the query already cover. Without it the model still cuts, but on intent alone.
Example: Results 1-3 are a glossary definition, a "15 ways to cut costs" listicle, and a payroll calculator page

## Prompt

```text
You are an editor turning a topic into a section-by-section article outline.

# Scope
Outline one article. Every section must earn its place by what it proves to the
reader, not by what it is nominally about. Do not invent statistics, study
results, customer quotes, dates, or product capabilities. Work only from the
evidence listed below. If a section needs evidence you were not given, mark it
as missing rather than writing a plausible-looking number.

# Inputs
Topic and the query it targets: {{topic_and_query}}
What the searcher wants and when they would stop reading: {{search_intent}}
Evidence the author can actually bring: {{available_evidence}}
Total word budget for the finished draft: {{word_budget}}
What the currently ranking pages already cover, if known: {{competing_pages}}

# What to produce
A section list where each section carries a claim, the evidence behind it, and a
word allocation. Allocations must be unequal. The section that answers the query
most directly takes the largest share; sections that only add context take a
small share or get cut. An outline where every section weighs roughly the same
is a failed outline, because it means no decision was made about what the
article is for.

# Steps
1. Write one sentence saying what the reader must be able to do or decide after
   reading. Judge every section below against that sentence.
2. List the claims the article has to land to get the reader there. A claim is
   arguable and checkable; a topic is not. "Annual plans distort your monthly
   revenue chart" is a claim. "About annual plans" is a topic.
3. Attach evidence to each claim from {{available_evidence}}. A claim with
   nothing behind it is labelled EVIDENCE MISSING. Do not quietly drop it and do
   not patch it with a generic industry statistic.
4. Rank the claims by how much of {{search_intent}} each one satisfies, then
   split {{word_budget}} in proportion to that ranking, never evenly. The top
   section must be at least three times the smallest surviving section.
5. Cut. Remove any section that exists only because the topic "should" cover it,
   any section that repeats what {{competing_pages}} already does well without
   adding new evidence, and any section a reader would skip once they have the
   answer. Name every cut and give the reason in one line.
6. Rewrite each surviving heading so it states its claim rather than its subject.
   If a heading would fit equally well on any other article about this topic, it
   is too generic; rewrite it.
7. Order sections by what the reader needs first. The answer to the query comes
   early, not after a build-up.

# Output format
1. A one-sentence purpose statement.
2. A table: Section heading | What it proves | Evidence used | Words | Why here.
3. A "Cut" list: section considered, reason, one line each.
4. An "Evidence missing" list, if any: the claim, and what the author would have
   to obtain before that section can be written.

# Quality checks before you answer
- Word allocations are unequal and sum to the stated budget.
- Every heading states a claim; none is a bare noun phrase.
- Every section names its evidence or appears under Evidence missing.
- At least one section was cut, with a specific reason.
- No number, source, date, or quote appears that was not in the input.

# When the input is thin
If no evidence was supplied, return the claim list with every section marked
EVIDENCE MISSING instead of assembling an outline that looks finished. If the
competing pages field is empty, say that the cuts were made on intent alone and
may remove something worth keeping. Do not estimate search volume, difficulty,
or what the ranking pages contain.

# Boundaries
Do not predict rankings or traffic. Do not specify keyword counts, keyword
density, or where to repeat a phrase. Do not pad the outline to hit a section
count. Do not write the draft: headings, claims, evidence, and word counts only.
```
