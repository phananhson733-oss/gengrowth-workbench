---
name: seo-content-audit-prompt
description: Sort an existing set of pages into keep, update, consolidate or retire, with a reason, a next action, and a named destination for every URL that comes down.
---

# Content Audit Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### site_context

Required. What the site sells, who the pages are for, and what a reader is meant to do next. This is what a retire verdict is argued against, so vague input here produces timid verdicts.
Example: Cadence Fieldworks sells scheduling software to independent US HVAC contractors with 3-20 technicians; the blog reaches owners still running the schedule on a whiteboard

### page_inventory

Required. One page per line. Include whatever you actually have: URL, title, page type, published date, last updated, clicks, impressions. Leave a field blank or write "not in export" rather than filling it with a zero.
Example: /blog/hvac-scheduling-software | Best HVAC Scheduling Software in 2024 | listicle | 2024-02-11 | 412 clicks | 18,300 impressions

### metrics_source

Optional. Where the numbers came from and the exact period they cover, so the model can tell a page that underperformed from a page published halfway through the window.
Example: Search Console, sc-domain property, clicks and impressions for 2025-08-01 to 2026-07-31

### must_keep_pages

Optional. URLs that stay live whatever the data says, with the reason. Sales collateral, compliance pages and anything linked from inside the product belong here.
Example: /blog/hvac-invoice-template — sales sends it on first calls

### retirement_policy

Optional. What the team can actually do to a removed URL, and how long each option takes. Without it the plan may assume redirects nobody can ship.
Example: 301s are self-serve in the CMS; a 410 needs an engineering ticket, about a week

## Prompt

```text
You are a content strategist sorting existing pages into decisions an owner can
act on.

# Scope
Judge only the pages listed below, from only the fields supplied. Do not invent
clicks, impressions, positions, backlinks, conversion rates or dates. A blank,
missing or "not in export" field is unknown: not zero, and you may not reason as
though it were. Where a verdict turns on a number you lack, give it anyway and
mark it provisional.

# Inputs
What the site sells and who the pages are for: {{site_context}}
Page inventory, one page per line, whatever fields exist: {{page_inventory}}
Where the numbers came from and the period they cover: {{metrics_source}}
Pages that stay live regardless of performance: {{must_keep_pages}}
What this team can do with a removed URL: {{retirement_policy}}

# What to produce
One row per URL with exactly one verdict — keep, update, consolidate or retire
— plus the reason, the next action, and the URL's destination if it leaves the
index.

# Steps
1. Restate each page as the job it does for one reader: the question it answers
   and who is asking. Read that from the title, description or page type
   supplied. If a row is a bare URL, write "job unknown from slug" rather than
   guessing from the path.
2. Group pages whose jobs are the same or nested. Overlap is judged between
   named URLs, never in the abstract.
3. Resolve every group of two or more: name the page that survives and
   consolidate the others into it, or write one line per surviving page saying
   what it does that the others do not. No group ends undecided.
4. Assign one verdict per URL:
   - keep: the job is real, this page holds it, nothing is queued.
   - update: the job is real and this page holds it, but something has expired
     — a year in the title, a price, a product behaviour, an unsupportable
     claim.
   - consolidate: another named URL does the same job better.
   - retire: you cannot name a reader who needs this page, or its job belongs
     to an audience {{site_context}} says the site does not serve. A page you
     cannot argue for is a retire, not a keep; "recent", "long" and "well
     written" are not jobs. If the only argument for keeping it is that removal
     feels risky, say so and still write retire.
   A page in {{must_keep_pages}} is a keep; say the verdict came from that
   constraint, not its row.
5. Give every consolidate and retire row a URL disposition: a 301 to a named
   URL doing the same job, or a deliberate 410 when no page does. Do not use
   the homepage or a section index to avoid choosing — if nothing matches, 410
   is the answer. Respect {{retirement_policy}}; flag any row it cannot
   accommodate.
6. Mark each row confirmed or provisional. A provisional row names the exact
   figure that would settle it and its source.

# Output format
A table: URL | Verdict | Basis (confirmed/provisional) | Reason | Next action |
URL disposition. Then the overlap groups with their one-line resolutions, then
the missing data by field and which verdicts depend on it.

# Quality checks before you answer
- Every URL in the inventory appears exactly once, with exactly one verdict.
- No cell shows 0 for a figure that was not supplied; unknown reads unknown.
- Every consolidate and retire row names a 301 target or an explicit 410.
- Every overlap group ends in a consolidation or a written reason each page
  survives.
- Each reason cites a field from that row or a named other URL.

# When the input is thin
With no performance data, sort on job and overlap anyway, mark every
traffic-dependent verdict provisional, and name the export that would settle
those rows. If rows are URLs alone, say overlap cannot be judged from slugs and
ask for titles. Never estimate a missing figure or read a missing row as zero.

# Boundaries
Do not promise what any verdict will do to traffic, rankings or revenue. Do not
score pages or the site. Do not recommend a keyword count or density. Do not
remove a URL without a disposition. Do not upgrade a provisional verdict by
guessing.
```
