---
title: "Black boxes aren't redaction: how redacted PDFs still leak"
description: "Drawing a rectangle over a name does not remove it. Here is where hidden text, metadata and stale revisions hide in a PDF — and how to check your own file before you send it."
date: "2026-11-14"
category: "Privacy"
tags: ["redaction", "security", "metadata"]
tool: "edit-pdf"
---

Every few years a court filing, a government report or a company disclosure makes the news for the same reason: the sensitive parts were "redacted" with a black rectangle, and the text underneath was still there for anyone who selected it, copied it, or ran it through a text extractor.

It is not a rare mistake. It is the default behaviour of the tools people reach for.

## A black rectangle is a drawing, not a deletion

A PDF is a stack of painting instructions. Drawing a filled rectangle over a paragraph adds one more instruction: paint this box here, on top. The text instruction underneath is untouched, still in the content stream, still in reading order, and still fully recoverable.

Anything that reads the text layer — Select All, copy and paste, Ctrl+F, a screen reader, an accessibility checker, a $20 "PDF unlocker" — bypasses the rectangle entirely.

The same applies to:

- **Cropping.** The crop box hides content outside the visible area. The content is still in the file.
- **White text or a "hidden" layer.** Both are recoverable, and both look like deception if audited.
- **Deleting pages from the viewer.** Depending on the tool, pages can remain as orphaned objects.
- **Screenshotting the page.** That removes the text, and also removes selectable text, accessibility and search — a heavy price for a fix that may be unnecessary.

## Where the leaks actually are

Redaction failures rarely happen on the visible page alone. A document that has been through email, a scanner and an online editor usually carries more than the reader sees:

1. **The text layer** — the obvious one, underneath your box.
2. **The OCR layer** — on scanned documents, OCR adds an invisible text layer positioned over the image. It is frequently forgotten, and it is frequently the thing that leaks.
3. **Document metadata** — author, company, original file path, software version, creation and modification dates, and sometimes the previous title of the file.
4. **Annotations and comments** — sticky notes, highlights with attached comments, and form-field values, all stored separately from the page content.
5. **Incremental updates** — when a PDF is saved by appending rather than rewriting, earlier revisions can remain in the file. Some editors offer a "remove hidden information" or "sanitise" step for exactly this reason.
6. **Embedded files and attachments** — a spreadsheet attached to the back of a report is part of the document.
7. **Image content** — the photo of the ID card whose number you boxed over, still at full resolution under the box.

## The check you can run in thirty seconds

Before sending any redacted file:

1. Open it and press **Ctrl+A** (or **Cmd+A**) then copy. Paste into a plain text editor. Read what comes out.
2. Search for the exact string you redacted — the name, the number, the address. A hit means the redaction failed.
3. Look at *File → Properties* and clear author, company, title and keywords.
4. Check for comments and attachments; delete them if they are not meant to travel.
5. Open the page at 400% and check the box actually covers the glyphs, including descenders and anything that overhangs the margin.
6. If the document came from a scanner, assume there is an OCR layer and verify step 1 specifically.

If copying the page gives you the redacted words, no amount of visual tidying will save the file.

## How to redact so it stays redacted

The reliable method is not "cover", it is "remove, then flatten":

- **Remove the characters** from the page content, not just the pixels.
- **Strip the annotations and metadata** you do not need.
- **Flatten** the page — render the final result to an image or to a content stream with no underlying text — so that whatever remains cannot be peeled back layer by layer.
- **Re-check** the output with the copy-and-search test above, on the exported file, not on your editing canvas.

Flattening has a real cost: the page stops being searchable, selectable and accessible. That is the correct trade for a document whose whole point is that a name must not survive. It is the wrong trade for a document where you only needed to remove a logo.

## What DocTrim's redaction does

The redaction tool in the [PDF editor](/edit-pdf) removes the content under each region and exports the affected pages as flattened 200 dpi images. The area you mark cannot be recovered from the output file, and the text under it cannot be selected or copied — because the page no longer contains text.

Be aware of the trade-off before you use it: any page you redact becomes an image, so it is no longer searchable and its text will not be read by assistive technology. If you need searchable text after redaction, rebuild the document instead of flattening it.

And a note on the workflow itself: the redaction and flattening run in your browser, so the unredacted original never leaves your machine. (Rewriting existing text is the only editor step that uses our server; if you use it, the file is uploaded, the text replaced, and the copy deleted immediately.) For a document sensitive enough to need redaction, that matters as much as the rectangle.

[Open the PDF editor →](/edit-pdf)
