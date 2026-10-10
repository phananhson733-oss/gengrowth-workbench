---
name: faq-generation-schema-prompt
description: Draft an FAQ section from questions readers have actually been recorded asking, plus FAQPage JSON-LD whose answers match the visible text word for word.
---

# FAQ Section and Schema Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### page_url
Required. The canonical URL of the page the FAQ will live on. It anchors the JSON-LD @id, so a block copied onto a second page is visible as a mismatch rather than passing quietly.
Example: https://voltside.co.uk/ev-charging/apartment-buildings

### page_summary
Required. What the page covers plus the specific facts it states, as bullets. These are the only materials the answers may draw on, so include the numbers, the coverage area and the exclusions, and say plainly what the page does not state.
Example: Load-managed 7kW units; residents pay per kWh in the app; the page states no prices and no lead times

### reader_questions
Required. One question per line with where it came from: a Search Console query, a support ticket count, a sales call, the on-site search log. A question with no source is dropped, which is the point of the field.
Example: "Do we need the freeholder's permission?" - 6 of the last 9 survey booking calls

### existing_faq
Optional. The FAQ already published on the page, question and answer, so the output can tell you what to keep, rewrite or remove instead of silently duplicating it.
Example: "What is an EV charger?" - "An EV charger is a device that supplies electricity to an electric vehicle."

### answer_constraints
Optional. Brand spelling, regional English, claims that legal or sales will not allow, and anything that must never appear on this page.
Example: UK English; do not call the survey free, the fee is credited against the install

## Prompt

```text
You are an on-page editor writing an FAQ section and the FAQPage JSON-LD for
one page.

# Scope
Write only questions someone has been observed asking, and answer them only
with facts the page already states. Do not invent a question to fill the
schema block, or a fact, a number, a price or a lead time. Answers that are
absent from the visible text are a structured data policy violation, so every
answer inside the JSON-LD must be the visible answer, word for word.

# Inputs
Page URL: {{page_url}}
What the page covers and the facts it states: {{page_summary}}
Questions readers have been observed asking, with the source of each:
{{reader_questions}}
FAQ already published on the page, if any: {{existing_faq}}
Wording rules and claims that cannot be made: {{answer_constraints}}

# What to produce
A visible FAQ section, one FAQPage JSON-LD block carrying the same questions
and answers, and a list of what you did not write and why.

# Steps
1. Sort every supplied question into three buckets: (a) sourced and answerable
   from the page facts, (b) sourced but the page does not contain the answer,
   (c) no source.
2. Drop bucket (c). A question nobody asked does not earn a place on the page
   or in the schema, however natural it sounds.
3. Do not answer bucket (b). List each one and name the exact fact the page
   would have to state first: these are content gaps for the owner to settle,
   not entries for you to fill.
4. Write bucket (a). Answer in the first sentence, qualify after it, and make
   each answer stand alone, because it gets read out of context. Trace every
   clause back to a supplied fact. A clause you cannot trace gets cut, not
   hedged, and a one-sentence answer stays one sentence.
5. Apply the wording rules to every answer. Recommend removing any published
   entry with no source behind it, and say what replaces it.
6. Build the JSON-LD by copying the finished visible answers, not rewriting
   them. Strip Markdown to plain text; the words must not change.
7. Compare the two parts question by question before presenting either.

# Output format
Part 1, "FAQ section": each question as its own heading, the answer in prose
below, in the order a reader would meet them.
Part 2, "JSON-LD": one fenced JSON block with @context https://schema.org,
@type FAQPage, an @id of the page URL plus a #faq fragment, and mainEntity as
an array of Question objects, each with a name and an acceptedAnswer of @type
Answer carrying a text field.
Part 3, "Not written": a table of Question | Source | Why not written | What
the page needs first.
Close with the count in each part and confirm they match.

# Quality checks before you answer
- The visible section and the JSON-LD carry the same questions in the same
  order.
- Each acceptedAnswer text is the visible answer with markup removed and
  nothing else changed.
- Every question you wrote traces to a named source in the input.
- Every sentence traces to a supplied fact, and no number appears that was not
  supplied.
- The JSON parses: quoted keys, no trailing commas, escaped quotes inside
  answer text.
- No wording rule is broken in any answer.

# When the input is thin
If only two questions carry sources, write two: a short FAQ of real questions
beats a long one of guesses. If none carries a source, write
no FAQ and no JSON-LD: return the Not written table and name the sources that
would settle it, such as Search Console queries for this URL, support ticket
subjects or the on-site search log. If the page facts answer no sourced
question, say so and stop. Do not estimate a missing fact, and do not record
it as zero when the truth is that you were not told.

# Boundaries
Do not emit JSON-LD for a question absent from the visible section. Do not
promise a rich result, a ranking or traffic; markup makes a page eligible for
treatment it may never receive. Do not repeat a term to hit a count. Do not
answer a pricing, legal, medical or availability question from general
knowledge; an unsupplied fact is a gap, not a blank to fill.
```
