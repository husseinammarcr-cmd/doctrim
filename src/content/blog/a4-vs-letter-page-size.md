---
title: "A4 vs Letter: why your PDF prints with white edges"
description: "Page size, margins and the difference between cropping and scaling — the measurements behind the white border on your printout, explained in points and inches."
date: "2026-10-11"
category: "Standards"
tags: ["page size", "a4", "printing"]
tool: "crop-pdf"
---

A document that looks perfect on screen prints with a white strip down one side, or tiny, or cut off at the bottom. Nothing about the file is broken: the page is simply a different shape from the paper in the tray.

## PDF pages are measured in points

Every page carries a box whose width and height are stored in *points*, where 1 point = 1/72 inch. That means a page is not "an A4 page" — it is a rectangle of a specific size:

| Size | Points | Inches | Millimetres |
| --- | --- | --- | --- |
| A4 | 595.28 × 841.89 | 8.27 × 11.69 | 210 × 297 |
| US Letter | 612 × 792 | 8.5 × 11 | 215.9 × 279.4 |
| A5 | 419.53 × 595.28 | 5.83 × 8.27 | 148 × 210 |
| Legal | 612 × 1008 | 8.5 × 14 | 215.9 × 355.6 |

The two common sizes differ in both directions: Letter is 0.23 in wider than A4 and 0.69 in shorter. There is no scale factor that makes A4 content fit Letter without either a margin or a crop.

## Why the white edge appears

Three different things produce it, and they need three different fixes.

**1. Page size mismatch.** An A4 page printed on Letter paper leaves a 0.69 in strip at the bottom (or, scaled to fit, a border all round). A Letter page printed on A4 leaves a strip at the right. The fix is to change the page size, or to print with "fit to page" — which shrinks the content by 3–6% and adds a margin.

**2. Printer margins.** Almost no desktop printer can put ink within 3–5 mm of the paper edge. If your design runs to the edge, the printer either clips it or scales the whole page down to preserve it, which is why "borderless" printing often produces an unexpected white frame.

**3. Design margins.** The document itself has a 1-inch white border baked in, because that is what the template did. Cropping the page box fixes the appearance on screen; printing still needs the paper to match.

## Cropping is not resizing

This distinction causes most of the confusion:

- **Cropping** moves the page's visible box inward. The content outside it is clipped from view — but in most PDF tools, including DocTrim's [crop tool](/crop-pdf), the underlying content is not deleted; the page simply stops showing it. Set margins of 0 on a page with a white border and the border disappears from the page.
- **Scaling** changes how large the content is drawn. Shrinking an A4 document to 96% makes it fit a Letter page, but every line of text is now slightly smaller and every measurement in the document is now wrong.
- **Changing the page size** redefines the paper. Content stays at its original size and either gains empty space or overflows.

If a form must print at exactly 1:1 — a medical form, a template for a die-cut, a document you will measure — never scale it. Change the page size or the paper.

## Bleed, and why print shops ask for it

Professional printing needs colour to run 3 mm *past* the trim line, because cutting is never perfectly accurate. That extra strip is the bleed. A print-ready PDF is therefore built on a page 6 mm larger in each dimension than the finished size, with crop marks showing where to cut.

If you send a home-made PDF with no bleed to a print shop, they will either add a white border when trimming or refuse the file. This is a design-time decision, not something a compressor or cropper can repair afterwards.

## Checking and fixing your own file

In any reader, open *File → Properties* (or the document info panel) and look at the page size in millimetres or points. Then:

- **Need the same content on a different paper size?** Rebuild or re-export at the correct size. If that is impossible, print with "fit to page" and accept the small scale, or crop the margin so the scale factor becomes 1:1.
- **Just want the white border gone?** Crop the page box. Keep at least a 5 mm margin so the printer does not clip the text.
- **Submitting to a portal with a size requirement?** Check whether it wants A4 or Letter — immigration forms, for example, are usually specified in one and rejected in the other.
- **Printing at home?** Set the printer driver to the paper actually loaded, and turn off "scale to fit" only when the page size already matches.

## The sizes that trip people up

- **Resumes.** Most applicant tracking systems accept either, but a US employer expects Letter and a European one expects A4. If you do not know, A4 is the safer international default.
- **Book interiors.** A 6 × 9 in trim size is 432 × 648 points. Print-on-demand platforms want the page to match the trim exactly, with bleed only if the design touches the edge.
- **Scanned documents.** Scanners often produce a page 1–2 mm larger than A4 because of edge detection. Cropping 2 mm off each side makes the file match the standard and stops it printing with a white edge.
- **Slides exported to PDF.** They are usually a 16:9 rectangle (960 × 540 points); printed on A4 they will always have a border above and below. That is geometry, not a bug.

[Change the page area with the crop tool →](/crop-pdf)
