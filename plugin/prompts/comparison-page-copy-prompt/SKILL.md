---
name: comparison-page-copy-prompt
description: Write an X vs Y comparison page from dated, observed competitor facts, including the cases where the competitor is the better choice and a ledger of what could not be verified.
---

# Comparison Page Prompt

This is a prompt template. Fill every `{{variable}}` from what the user has
already given in this conversation, then carry out the filled prompt as your
instructions for this turn. If a variable marked Required is missing, ask for
all missing ones in a single message and wait. Never invent an input. Leave an
Optional variable empty rather than guessing it.

## Variables

### our_product
Required. What we sell and who for, in one or two sentences. This sets which axes are relevant and stops the page drifting into a category tour.
Example: Ferrule - hosted outbound webhook delivery for API teams: signs, retries and logs every delivery, and gives your customers their own delivery log

### our_facts
Required. Our own current, checkable facts: list pricing as it reads on our pricing page today, plan limits, and what ships today rather than what is planned. Date them the same way you date the competitor.
Example: Pricing page 12 Aug 2026: $0.40 per 1,000 delivery attempts, no seat charge, $99/month Team floor. Retries: 8 attempts over 24 hours, configurable per endpoint. Regions: us-east only.

### competitor_facts
Required. Facts you personally observed, each with the date and the page you saw it on. Also list what you looked for and could not find, marked clearly, so the model puts it in the ledger instead of guessing.
Example: Relaypoint. relaypoint.example/pricing, 13 Aug 2026: Starter $79/month including 100,000 attempts, then $0.90 per additional 1,000. Log retention: searched docs 13 Aug 2026, not stated - NOT VERIFIED.

### buyer_context
Required. Who lands on this page, what they use now, and the numbers that decide the price comparison. Without a volume or a seat count the pricing section stays abstract and helps nobody.
Example: Platform engineer at a 20 to 60 person B2B SaaS, currently sending webhooks from their own job queue, roughly 200,000 delivery attempts a month, deciding whether to buy or keep maintaining it

### page_constraints
Optional. Length, CTA, internal links, and the rules your legal or brand reviewer applies to competitor claims.
Example: 700 to 1000 words. Every competitor claim carries its observed date and links to the page it came from. No superlatives. CTA: start a trial. Internal links: /pricing, /docs/replay

## Prompt

```text
You are writing a head-to-head comparison page for a buyer choosing between two
products today. You compare what you were shown. You do not compare what you
remember.

# Scope
Write one comparison page from the evidence below. Every statement about the
competitor must trace to a dated observation in the inputs. You have no prior
knowledge of this competitor: any price, limit, feature or policy you recall
from training is not evidence and must not reach the page. Where the evidence
is silent, the page says the fact was not verified. Silence is never absence.

# Inputs
Our product and positioning: {{our_product}}
Verified facts about us: {{our_facts}}
Verified facts about the competitor, each with a date and where it was seen:
{{competitor_facts}}
Who reads this page and what they are deciding: {{buyer_context}}
Constraints on the page: {{page_constraints}}

# What to produce
A page a sceptical buyer can act on, containing a plain statement of the cases
where the competitor is the better purchase, and a ledger of everything that
could not be verified.

# Steps
1. Split the competitor evidence into two piles: facts carrying both a date and
   a place they were observed, and everything else. Only the first pile may
   become a claim. The second pile goes to the ledger.
2. Choose five to eight comparison axes from the buyer's decision, not from our
   feature list. Drop any axis you picked only because we win it. Keep any axis
   the buyer weighs even when we lose it.
3. Fill both sides of every axis. Where one side has no verified fact, write
   "Not verified" and name the page a reader could open to check. Never write
   "No", "None", or "Not supported" because the evidence was quiet.
4. Put prices on one basis: same tier, same billing period, same currency, and
   the buyer's own volume or seat count from the inputs. Show the arithmetic,
   carry the observation date, and name the volume at which the cheaper product
   changes. Where a plan's included volume is not published, state that the
   comparison cannot be made past that point.
5. Write "Choose [competitor] when" before you write "Choose us when". It needs
   at least two situations, each built on a verified competitor strength and
   each describing a buyer who plausibly exists. A situation nobody is in is a
   worse concession than none.
6. Write the differences as behaviour, not verdicts. Say what each product does
   at the moments the buyer asked about: the failure, the limit, the invoice.
   Describe; do not score or rate.
7. Compile the ledger: every unverified item, with the exact page someone must
   open to close it.

# Output format
1. Title and a meta description under 155 characters.
2. A summary paragraph naming the one difference that decides most of these
   purchases.
3. Comparison table: Axis | Us | Competitor | Basis and date observed.
4. "Choose [competitor] when", then "Choose us when", as short lists.
5. Two to four short sections on the differences that carry the decision.
6. "Not verified before publishing" - each item with where to check it.

# Quality checks before you answer
- Every competitor cell traces to a dated line in the inputs, and no cell
  infers absence from missing input.
- The competitor section names at least two situations a real buyer is in, each
  resting on a strength rather than a weakness rewritten as one.
- Every price statement carries tier, period, currency, volume and date.
- No sentence describes the competitor's company, team, motives, or future.
- Every axis would still belong on the page if we lost it.

# When the input is thin
If fewer than five competitor facts carry both a date and a source, say so at
the top, build the table from the rows you can support, and list the exact
pages someone must open. Do not fill gaps from memory of the vendor, do not
infer a limit from a plan's name, and do not estimate. Four verified rows with
an honest ledger is publishable; twelve invented ones is not.

# Boundaries
Refuse to state a competitor price, limit, or policy you were not given. Refuse
to claim the competitor lacks a feature. Do not compare against their beta,
their roadmap, or a version you were not shown. Do not use superlatives - "the
only", "the best", "the fastest" - without a supplied basis. Do not promise
rankings, traffic, revenue, or a timeline. Do not state a keyword density or a
repetition count. Do not write quotes, testimonials, or review text.
```
