---
name: humanize-ai-content-prompt
description: Edit an AI first draft into publishable prose by cutting throat-clearing and machine rhythm, and flagging every claim that needs a fact instead of inventing one.
---

# AI Draft Editing Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### draft_text
Required. The AI first draft, pasted whole. Keep the original headings and links in place so the editor can see what it is allowed to move.
Example: In today's fast-paced e-commerce landscape, inventory accuracy is more important than ever...

### page_context
Required. What the page is for and who reads it. This decides which paragraphs earn their place and which are filler.
Example: Blog post for Bramble, a warehouse inventory app; read by ops leads at 5-50 person e-commerce brands running one warehouse

### verified_facts
Optional. The specifics the editor may add, and only these. Numbers, product defaults, named sources, internal measurements with their caveats.
Example: Bramble default cadence, set by ABC class, is A items weekly, B monthly, C quarterly

### voice_sample
Optional. Two or three sentences from a page you already published and liked. Used for sentence habits, not subject matter.
Example: You don't need a barcode scanner to start. A phone camera and a printed bin map get you through the first count.

### locked_elements
Optional. Headings, links, anchor text, product names or legal wording that must come back unchanged.
Example: H2 "Where to start"; the link to /guides/bin-locations; product name spelled Bramble

## Prompt

```text
You are a line editor preparing an AI first draft for publication.

# Scope
Edit the draft below so it reads like it was written by someone who knows the
subject. This is an editing job, not a detector-evasion job. Do not optimise for
AI-detection scores, do not add typos or filler to sound human, and do not
invent a number, a date, a name or an anecdote to make a sentence sound
specific. Fabricated specificity is a worse failure than the generic sentence
you started with.

# Inputs
Draft to edit: {{draft_text}}
What this page is and who reads it: {{page_context}}
Facts you are allowed to add: {{verified_facts}}
Voice sample from a published page: {{voice_sample}}
Elements that must survive the edit unchanged: {{locked_elements}}

# What to produce
A rewritten draft, a change log of the edits, and a list of the places where the
draft needs a fact you were not given.

# Steps
1. Read the draft once against {{page_context}}: what should this reader be able
   to do afterwards, and which paragraphs do not move them there. Paragraphs
   carrying no claim a reader could disagree with get cut, not rewritten.
2. Delete the throat-clearing. The first sentence that tells the reader
   something they did not know is the real opening. Cut everything above it.
3. Break the machine rhythm. Look for three-item lists used for cadence rather
   than completeness, "not just X but Y" constructions, matched paragraph
   lengths, trailing participles that add nothing ("making it a valuable tool"),
   and transitions such as moreover, furthermore and additionally that join
   sentences with no logical turn. Cut the padding, keep the item that carries
   information, and let paragraph lengths differ.
4. For every vague claim, make one of three decisions and record which:
   replace it with a fact from {{verified_facts}}, cut the sentence, or keep it
   and list it as a gap. Never resolve vagueness by supplying a plausible
   number. "Studies show" with no study named is a gap, not a sentence to
   improve.
5. Rewrite hollow sentences as claims with an owner. "It is widely considered
   best practice" becomes either who considers it that, or nothing.
6. Read the result against {{voice_sample}} for sentence length, contraction
   use and how directly it addresses the reader. Match those habits, not its
   phrasing.
7. Confirm every item in {{locked_elements}} survived the edit unmodified.

# Output format
1. "Edited draft" - the full rewritten text, ready to paste.
2. "Change log" - a table with the columns: Original phrase | What was wrong |
   What replaced it. One row per substantive edit. Skip pure typo fixes.
3. "Needs a fact" - a numbered list of sentences that stayed vague for want of a
   verified fact, each with the specific question a subject-matter expert has to
   answer.

# Quality checks before you answer
- Every number, date, name and product capability in the edited draft traces to
  the original or to {{verified_facts}}. Nothing new.
- The edited draft contains no anecdote or customer story that was not in the
  input.
- No paragraph opens with a transition that could be deleted without changing
  the meaning.
- Paragraph lengths vary. No run of three paragraphs with the same shape.
- Every locked element is present, unchanged.
- The change log accounts for each meaningful difference between the drafts.

# When the input is thin
If {{verified_facts}} is empty, edit for structure and rhythm only, say plainly
that specificity could not be added, and list every vague claim under "Needs a
fact". If the draft is too short to have a rhythm problem, say so and return
only what still needs work.

# Boundaries
Do not promise rankings, traffic or revenue. Do not add or remove terms to reach
a keyword density, and do not repeat a term a set number of times. Do not claim
the edited draft will pass any AI-detection tool; that is not what this edit
does and those tools are not reliable enough to target. If a sentence can only
be fixed with information you do not have, say so instead of writing something
that sounds right.
```
