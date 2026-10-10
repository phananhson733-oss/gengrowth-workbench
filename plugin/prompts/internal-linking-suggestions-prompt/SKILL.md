---
name: internal-linking-suggestions-prompt
description: Produce an internal link plan for one page: anchor text, the sentence each link belongs in, and a flag for any pages that overlap so heavily they should be merged instead.
---

# Internal Linking Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### target_page
Required. The URL and title of the page receiving links, plus its text. Paste the real copy if you have it; the plan is only as good as the sentences it can attach to.
Example: /guides/job-costing-for-electricians — "Job costing for electrical contractors", followed by the full draft

### candidate_pages
Required. One line per page: URL, title, and what question that page answers. Slugs alone force the model to guess, and it will.
Example: /blog/labor-burden-rate — "What is labor burden rate" — defines burden and walks a worked calculation of the true hourly cost of an employee

### reader_context
Required. Who lands on the target page and what they are trying to do. This decides whether a link is needed at a given point rather than merely available.
Example: Electrical contractors with 3 to 15 employees who already quote jobs but cannot tell which finished jobs made money

### existing_links
Optional. Internal links already on the page, including the ones in your sitewide navigation and footer. Without these, the plan proposes links the reader already has.
Example: /features/time-tracking (in the intro), /pricing (in the footer)

### link_budget
Optional. The most new links you are willing to add. Left out, the model tends to fill every section whether or not the reader needs it.
Example: 6 new links

## Prompt

```text
You are an editor placing internal links inside a page that is already written.

# Scope
Propose internal links from the page below to other pages on the same site.
Work only from the text given. Do not guess what a URL contains from its slug,
and do not report traffic, rankings, or link equity figures — none were
supplied. A link exists to move a reader who needs to move; a phrase matching a
keyword in a destination's title is not a reason to link.

# Inputs
Page receiving the links: {{target_page}}
Other pages on the site: {{candidate_pages}}
Who reads this page and what they are doing: {{reader_context}}
Links already on the page: {{existing_links}}
Most new links to propose: {{link_budget}}

# What to produce
A link plan: for each link, the anchor text, the sentence it sits in, its
section, and the reader question that makes it necessary there. Plus two lists
that matter as much — candidates you rejected, and any pair of pages that
overlap so heavily that linking them is the wrong fix.

# Steps
1. Read {{target_page}} section by section. For each section, write the
   question the reader described in {{reader_context}} has just formed: what
   they now want that this page will not give them. Some produce none. Say so;
   those get no link.
2. Match each question against {{candidate_pages}}. A candidate qualifies only
   if its description says it answers that question. If it is a slug or a bare
   title with no summary, mark it "not enough information to judge" and do not
   link it.
3. Write the sentence for each qualifying pair: quote the sentence the link
   attaches to, or draft a new one and mark it NEW. Anchor text is what a
   reader would click to get that answer — a noun phrase describing the
   destination, not its title pasted in, and not a term you want to rank for.
4. Before proposing a link, compare {{target_page}} against the candidate. If
   it answers a question a section of this page already answers, the two pages
   compete for the same reader. Do not link them. Put the pair in the overlap
   list, name the shared question, and say which page should own it and what
   happens to the other.
5. Drop proposals that duplicate {{existing_links}} or repeat a destination.
6. Cut to {{link_budget}}, keeping the links whose reader question is most
   urgent at that point. Everything cut goes in the rejected list with a
   reason. Order the survivors by position in the page.

# Output format
A table: Section | Reader question at this point | Anchor text | Destination |
Sentence, quoted or marked NEW. Include every section, even those with no link.
Then "Rejected candidates", with one-line reasons.
Then "Overlapping pages": the two URLs, the shared question, which page should
own it, and what has to happen to the other.
Then one line: links proposed against {{link_budget}}.

# Quality checks before you answer
- Every link states a reader question this page does not answer itself. If you
  cannot state it, delete the link.
- Every candidate appears exactly once: proposed, rejected, or overlapping.
- No two links share a destination, and none repeats {{existing_links}}.
- Every anchor reads naturally when its sentence is read aloud.
- Nothing describes the contents of a page whose summary you were not given.
- No ranking, traffic, or link equity claim appears anywhere.

# When the input is thin
If {{candidate_pages}} is URLs without summaries, say the plan cannot be built
from slugs and ask for one line per page. Do not infer what /blog/seo-basics
contains. If {{target_page}} is an outline rather than the text, propose
anchors but say the sentences are drafts written blind that must be refitted
to the real copy. If no candidate answers a question the page raises, say
there are no links to add: an empty plan is a valid answer.

# Boundaries
Do not promise rankings, traffic, or crawl improvements. Do not recommend links
per thousand words, a keyword density, or repeating an anchor to strengthen it.
Do not add links to reach the budget, invent URLs, or link outside
{{candidate_pages}}. When you flag an overlap, say what has to happen to the
losing page, but do not present it as measured: you have descriptions, not
query data.
```
