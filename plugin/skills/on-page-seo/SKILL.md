---
name: on-page-seo
description: Revise a single page so its title, outline, naming, markup, and links all state the same thing, using only what the delivered page and its measured data show. Use when someone asks to optimise a page, rewrite its title or meta description, add schema, or fix its headings — and when a page ranks below what its content deserves and nobody has checked whether the page says one consistent thing.
metadata:
  owner: GenGrowth SEO Agent
  source: https://gengrowth.ai/skills/on-page-seo
---

# On-Page SEO

Your job is to make one page say clearly what it is — to a person scanning a
result list and to a crawler parsing the HTML — without adding claims the page
does not support.

## What counts as evidence

Four sources, in descending order of trust:

1. The delivered page — the HTML served at that URL, plus the text a reader
   actually sees. This is the only authority on what the page says today.
2. Measured — Search Console rows for this URL: the queries it appears for,
   impressions, clicks, and impression-weighted average position.
3. Observed — what the pages currently ranking for the same query family cover,
   read from live results.
4. Tool output — readability figures, page scores, generic linters. Advisory
   only. A score is never a finding on its own; name the element it points at.

Search Console withholds queries below its reporting threshold, so the query
rows for a URL rarely account for all of its impressions. Report the share they
do cover. When a metric is unavailable, write that it is unavailable. Do not
substitute zero: zero clicks is a measurement, and no data is not zero.

## Procedure

1. Write the page's job in one sentence: which reader, which question, which
   next step. If it takes two sentences, the page is serving two query families
   and the first decision is split or refocus, not tags.

2. Fetch the page as delivered and compare it against the rendered view. Record
   any main content that exists only after client-side scripting, and say its
   indexing is not guaranteed rather than assuming either outcome.

3. Read the title alone, out of context, as it would sit in a result list beside
   nine others. It must name the subject and separate this page from the rest of
   the site. Judge the description separately: it is the click argument, not a
   ranking input.

4. Strip the body and read the headings on their own. The outline should read as
   the page's argument. Headings such as Overview, Details, and Conclusion carry
   no information; replace them with the actual claims or comparison axes. Check
   that the h1 and the title agree with each other.

5. Check naming. Every subject the page is about should appear with its full
   name on first use, together with the version, unit, region, or size range
   that bounds it. Replace "most models" and "recently" with the real scope.
   This is what makes the page resolvable to a reader who arrived cold.

6. Validate structured data field by field against the visible page. Every
   marked-up value must correspond to something a reader can see. Remove or
   render anything that does not, including FAQ markup for questions the page
   never asks.

7. Review the links leaving the body. Each should lead to a page that answers a
   question this page raises, with anchor text that names the destination rather
   than the act of clicking.

8. Reconcile with measured queries. If the URL takes impressions for a query
   family the page does not address, say so, and recommend split, refocus, or
   leave alone with the reason attached.

## Output

An ordered change list. For each item: the element, what it says now, the
proposed change, the evidence behind it, and the risk of making it. State the
ordering rule you used so it can be argued with. Close with what you could not
determine and what data would settle it.

## Refuse to

- Recommend a keyword density, a repetition count, or a target word count.
- Add structured data for content that is not visible on the page.
- Rewrite a title to match a query the page does not actually serve.
- Report a tool score or an estimate as a measurement.
- Replace an unavailable metric with zero or with a guess.
- Promise a ranking, a traffic number, or a timeline.
