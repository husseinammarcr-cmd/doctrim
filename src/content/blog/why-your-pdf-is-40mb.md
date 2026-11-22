---
title: "Why your PDF is 40 MB — and what compression actually removes"
description: "A PDF's size is almost never the words. It is the images, the fonts and the way the file was saved. Here is how to shrink one without turning your document into a photo."
date: "2026-11-09"
category: "Guides"
tags: ["compress", "file size", "images"]
tool: "compress-pdf"
---

Somebody sends you a 40-page report that is 40 MB. The same report as a Word file was 2 MB. Nothing about the document changed except the container — so where did the bytes come from?

## What is actually inside the file

A PDF holds four kinds of things, and only one of them is text:

**Images.** A dark horse. A single A4 page scanned at 600 dpi is about 4960 × 7016 pixels. Stored uncompressed that is roughly 100 MB; stored as a high-quality JPEG it can still be 3–8 MB, and a scanned document is nothing but images. Twenty of those pages and you are at 80 MB before you have written a word.

**Embedded fonts.** Full font programs can be 300 KB to 2 MB each, and documents often carry five or six faces. Subsetting (embedding only the glyphs used) usually cuts this by 90%.

**Vector content.** Charts, diagrams, logos and rules. Usually small, unless a designer exported a page with thousands of clipping paths.

**Structure and leftovers.** Cross-reference tables, object streams, form data, thumbnails, unused resources from previous edits, and — in files saved incrementally — old versions of objects that are no longer referenced.

Text itself is negligible. A 100-page novel is under 1 MB of characters.

## The two honest ways to make a PDF smaller

Every compressor is doing one of two things, and the difference matters more than any quality slider.

### 1. Re-save and de-duplicate (lossless)

The file is parsed and rewritten: objects are re-packed into compressed object streams, unused resources are dropped, duplicate images are stored once, and the cross-reference table is rebuilt. Text stays text, vectors stay vectors, links and form fields keep working.

This is what DocTrim's **Basic** level does — and it deliberately keeps whichever file is smaller, the original or the re-save, so a "compression" that inflates the file is impossible. Expect modest gains here: 5–25% on a messy file, close to nothing on a file that was already optimised by the producer.

### 2. Rasterise (lossy)

Each page is rendered to an image — typically JPEG at 72–150 dpi — and the new PDF contains only those images. Because the page is now a picture, the compressor can throw away 95% of the detail and the file collapses in size.

This works dramatically well on scanned documents and image-heavy decks, and it destroys the things that made the PDF a document:

- text is no longer selectable, searchable, or copyable
- screen readers see an image and read nothing
- zooming past 150% shows blur and JPEG blocks
- links and form fields disappear
- file size can even go *up* when a page is mostly text

DocTrim's **Recommended** and **Extreme** levels rasterise (1.5× at quality 0.72, and 1× at quality 0.5) and again keep whichever output is smallest. If the rasterised version is bigger than the original, you get the original back, unchanged — a failed compression should never leave you with a worse file.

## Picking a level without guessing

| Your document | Use | Why |
| --- | --- | --- |
| Text report, contract, invoice | Basic | Keeps text, links and forms intact |
| Slides with photos | Recommended | Page images are acceptable; the deck gets much smaller |
| Scanned paperwork, ID copies | Recommended or Extreme | It was already images; the text layer is usually OCR noise |
| Anything you will search, cite or fill later | Basic only | Rasterising removes the text layer permanently |
| A file you must submit to a portal with a 2 MB cap | Extreme, then check legibility at 100% | Only as a last resort |

A practical rule: compress a copy, keep the original, and open the result before you send it. If you can select a sentence and the letters are crisp at 100%, you used the right level.

## Things that make PDFs huge for no reason

Before compressing, check whether the file was built badly:

- **Screenshots of text.** A PNG of a paragraph is 50–200 KB where the same text as text is 2 KB — and it is not searchable. If you can go back to the source, do.
- **Print-to-PDF from a browser** on a page full of full-bleed hero images. The images are often embedded at 2–3× their displayed size.
- **Merging files repeatedly.** Each merge can duplicate shared resources and leave orphaned objects behind.
- **Saving in an editor that appends revisions** instead of rewriting the file. Ten saves of a 5 MB document can produce a 30 MB file.
- **An email thread's worth of history** hiding in attachments.

## When compression can't help

Some files are already optimal and will barely move: a 900 KB text-only PDF, or a file whose images are already 96 dpi JPEGs. In that case the only real reductions come from removing content — deleting pages, dropping attachments, or converting to a different format entirely.

And if the file is large because of a single scanned appendix, the honest fix is to re-scan that appendix at 300 dpi and rebuild the PDF, not to squeeze the whole document until the text stops being text.

[Compress a PDF →](/compress-pdf)
