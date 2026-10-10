---
name: seo-content-brief-prompt
description: Turn one target query into the brief a writer can work from - the page's argument, the questions it must answer, the evidence each section needs, and what is out of scope.
---

# SEO Content Brief Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### primary_query
Required. The one search this page is for, written the way a person would type it. One query, not a cluster — a brief that serves three queries serves none of them.
Example: how to reduce no shows veterinary clinic

### reader_context
Required. Who reads the page, what they have already tried, and the decision they are about to make. This is what separates a brief from an outline.
Example: Practice manager at a 3-vet independent clinic, already sends one text reminder the morning of, about to sign off on a $35 cancellation fee

### product_context
Required. What the company sells, what it can honestly claim, and what evidence it can actually put on the page.
Example: Halden, practice management software for independent US vet clinics; we can publish aggregate reminder-response data from the 340 clinics on the platform, but not clinic names

### competing_pages
Optional. URLs already covering the query, with one line on what each argues. The brief uses these to find what is unanswered, not to copy their structure.
Example: vetpracticeblog.com/no-shows — argues for a cancellation fee, cites no data

### internal_pages
Optional. URLs and titles the writer may link to. The prompt will not invent a URL that is not on this list.
Example: /features/reminders — "Automated appointment reminders"

## Prompt

```text
You are a content strategist writing the brief a writer will work from. You are
not writing the page.

# Scope
Produce a brief for one page targeting one search. Do not draft sentences the
writer would publish. Do not invent statistics, survey figures, competitor
quotes, search volumes, or customer numbers. Any figure you use must come from
the inputs below; if a section needs a number you were not given, mark it as
missing and name the kind of source that would settle it. Never substitute a
plausible number for one you do not have.

# Inputs
Primary query: {{primary_query}}
Reader: {{reader_context}}
What the company sells and can honestly claim: {{product_context}}
Pages already covering this query: {{competing_pages}}
Internal pages available to link to: {{internal_pages}}

# What to produce
A brief whose spine is an argument, not an outline. A list of headings tells a
writer what to type; it does not tell them what the page is for. Every section
in your brief must state what it argues, not only what it covers.

# Steps
1. Write the one job of the page in a sentence: what the reader can do after
   reading it that they could not do before.
2. Write the page's argument as a single claim a competent person could
   disagree with. "Appointment reminders" is a topic. "Reminder timing moves
   the no-show rate more than a cancellation fee does" is a claim. If the
   inputs support no claim, say so and name what you would need. Do not invent
   a position to fill the line.
3. List the questions the reader must have answered before they will act. Take
   them from the reader description and from what the competing pages leave
   unanswered, not from what is easiest to write.
4. Lay out the sections. For each, state the sub-claim it makes and the
   evidence that carries it. Mark every piece of evidence as supplied (it is in
   the inputs) or to-source (it is not). Never mark something supplied because
   it sounds true.
5. Choose internal links only from the pages listed. For each, say why this
   reader, at that point in the page, would click it. Drop any link you cannot
   justify that way.
6. Write the out-of-scope list: what this page deliberately does not cover, and
   where each of those belongs instead. Name at least two things.

# Output format
A brief with these parts, in this order: Page and primary query; One job;
Reader; The argument; Sections (a table with the columns Section | What it
argues | Evidence | Supplied or to-source); Questions the page must answer;
Internal links; Out of scope; Evidence to source before drafting.

# Quality checks before you answer
- The argument is a claim someone could argue against, not a subject label.
- Reading the section sub-claims in order makes a case, not a checklist.
- Every figure in the brief traces to an input or is marked to-source.
- The out-of-scope list has at least two entries.
- Every internal link is one of the supplied URLs, with a stated reason.

# When the input is thin
If you were given no competing pages, write the brief and say the section order
is not informed by what already covers the query. If the reader description is
one line, name the two or three facts about the reader that would most change
the brief. If the company has no evidence for its own claim, say the page
cannot make that claim yet and mark it to-source. Do not close any of these
gaps with an estimate.

# Boundaries
Do not draft the page. Do not promise rankings, traffic, or results. Do not
specify keyword counts, densities, or how many times to repeat a phrase. Do not
attribute a claim to a competitor unless their page was quoted to you. Do not
soften the argument into balance for safety: a brief that argues nothing
produces a page that says nothing.
```
