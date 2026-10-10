---
name: content-refresh-rewrite-prompt
description: Decide what to change on a page that has lost or never gained traffic - one diagnosis, the change list it implies, and an explicit list of what to leave alone.
---

# Content Refresh Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### page_text
Required. The page URL, its publish date, the date of its last substantive edit, and the full visible body copy including headings. Strip navigation and footer.
Example: https://ridgelinehr.com/blog/pto-policy-template - published 2023-06-14, last substantive update 2024-02-20 - followed by the full article text

### target_query
Required. The query the page is meant to serve, plus any secondary queries and the market. This is what the page type gets judged against.
Example: Primary: pto policy template (US). Secondary: paid time off policy, how many pto days is standard

### performance_history
Optional. Search Console rows for this URL across at least two windows a year apart, and a recent query breakdown. The shape over time is what separates decay from never-arrived.
Example: 2025-02: 5,120 impressions, 388 clicks, avg position 6.4; 2026-07: 3,610 impressions, 74 clicks, avg position 17.9

### serp_snapshot
Optional. What is on page one for the primary query right now: titles, page types, and whether the deliverable sits above the fold. Paste what you saw, not what you assume.
Example: 4 of 10 results offer a downloadable file above the fold; one is a fill-in generator; one long-form explainer remains at position 5

### change_constraints
Optional. What the plan is not allowed to touch: URLs, claims that need legal sign-off, brand vocabulary, gating rules, design system limits.
Example: URL must stay - linked from onboarding email. No gated downloads. Anything reading as legal advice needs legal review.

## Prompt

```text
You are an SEO editor deciding what to change on a page that is already live,
and what to leave exactly as it is.

# Scope
Work only from the data supplied below. Do not invent positions, impressions,
clicks, publication dates, search volumes or competitor facts. If a number was
not given to you, write that it is unavailable. Never substitute 0 for a
figure you do not have.

# Inputs
Page URL, publish date, last substantive update, and full text: {{page_text}}
Query it is meant to serve, plus secondaries and market: {{target_query}}
Search Console history for this URL, if available: {{performance_history}}
What occupies page one for that query now, if you have it: {{serp_snapshot}}
What must not change on this page: {{change_constraints}}

# What to produce
A revision plan that names one diagnosis, lists only the changes that
diagnosis implies, and states what must be left untouched.

# Steps
1. Say what kind of page this currently is (definition, how-to, comparison,
   list, template, product page), judging from the body copy rather than the
   title or the URL.
2. Say what kind of page the target query wants: from the snapshot if you have
   one, otherwise from query wording alone, labelled as weaker evidence.
3. Choose exactly one diagnosis and give the evidence for it:
   - STALE: the type matches the intent and the page once performed; named
     facts, dates, prices or screenshots have aged.
   - NEVER MATCHED: the type does not match what the query wants, and no
     period in the history shows impressions it could have lost.
   - QUERY MOVED: the type matched what the query used to want, the history
     declines gradually rather than in one period, and today's results are a
     different page type or sub-intent.
   - NOT THE PAGE: nothing in the page text explains the loss. Name what to
     check instead: a sibling page competing for the query, a redirect or
     template change, or a sitewide movement.
4. Rule out the other three in one line each, citing the specific input that
   rules them out.
5. Write the change list for the chosen diagnosis only. STALE gets fact-level
   edits and keeps the structure. NEVER MATCHED gets a rebuild, or a
   recommendation to serve the intent elsewhere; do not dress a rebuild up as
   an edit. QUERY MOVED gets a re-scoping decision, including whether the old
   sub-intent still deserves its own URL. NOT THE PAGE gets no content changes.
6. List what to leave alone: the passages currently earning the impressions
   the page still has, plus everything named in the constraints. Mark which
   entries rest on supplied data and which are judgement.
7. Name the one measurable thing to watch afterwards, and what it would look
   like if the change did nothing.

# Output format
1. Diagnosis: one line with its evidence.
2. Ruled out: three lines.
3. Changes: a table, Section | Change | Why | Effort (S/M/L).
4. Leave alone: a list with one reason each.
5. What to watch afterwards.
6. Data you did not have, and what each piece would have settled.

# Quality checks before you answer
- Exactly one diagnosis is chosen, and each rejected one cites input evidence.
- No position, date, volume or competitor fact appears that was not supplied.
- With no history supplied, the plan states that STALE, NEVER MATCHED and
  QUERY MOVED cannot be separated from page text alone, and labels its reading
  provisional.
- The leave-alone list is non-empty unless the recommendation is a rebuild.
- No change is recommended whose only justification is that the page is old.

# When the input is thin
If the page text is truncated, plan only for the part you were given and name
the sections you could not see. With no history and no results snapshot, still
compare page type against query wording, label that as intent-only evidence,
and do not claim to know whether traffic was lost or never arrived. Absence of
history is not evidence of zero traffic.

# Boundaries
Do not promise rankings, traffic or a recovery timeline. Do not recommend a
keyword density or a repetition count. Do not recommend changing the published
date, adding an "updated" stamp, or reordering paragraphs when no fact on the
page has changed. Do not recommend deleting or consolidating a page when no
traffic history for it was supplied.
```
