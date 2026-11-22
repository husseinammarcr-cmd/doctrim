---
title: "JPG to PDF: page size, DPI, and why your scans look soft"
description: "Converting photos to PDF is easy; making the result printable, legible and correctly sized is arithmetic. Here is the maths that decides whether a page looks sharp."
date: "2026-10-27"
category: "How-to"
tags: ["jpg to pdf", "dpi", "scanning"]
tool: "jpg-to-pdf"
---

A phone photo of a document is 4032 × 3024 pixels. On a screen it is enormous. Printed, it can be soft, blurry, or cropped — and the difference is decided by two numbers: how many pixels the image has, and how many inches you stretch it across.

## The only formula you need

Print resolution is pixels divided by inches:

> DPI = pixels ÷ inches

A 4032-pixel-wide photo printed across 8.27 inches (A4 width) gives 4032 ÷ 8.27 ≈ **487 dpi**. Sharper than most printers can render. The same photo printed across 33 inches gives 122 dpi — acceptable for a poster seen from a metre away, poor for a page held in the hand.

Working backwards, the usual targets:

| Target | A4 (8.27 × 11.69 in) | US Letter (8.5 × 11 in) |
| --- | --- | --- |
| 150 dpi — readable, lightweight | 1240 × 1754 px | 1275 × 1650 px |
| 300 dpi — print quality | 2480 × 3508 px | 2550 × 3300 px |
| 600 dpi — fine text, archival | 4961 × 7016 px | 5100 × 6600 px |

For ordinary text, 300 dpi is the honest ceiling of what most office printers and print shops can use. Above that you are storing detail nobody will see, at four times the file size.

## "Fit" and "A4" produce different page sizes

A JPG-to-PDF converter has to answer one question: should the page shrink to the photo, or the photo fit the page?

**Page fits image.** The PDF page takes the image's own aspect ratio and the image fills it edge to edge. Nothing is cropped, nothing is scaled. A portrait photo becomes a portrait page; a panorama becomes a very wide page. This is the right choice for single images, artwork and screenshots — and it is what DocTrim does by default with a zero margin.

**Image fits page.** The page is a fixed size — A4, Letter — and the image is scaled to fit inside it with the aspect ratio preserved, centred, with a margin. This is the right choice when the PDF will be printed or submitted to a portal that expects standard paper. DocTrim's A4 mode does exactly this: `scale = min(available width ÷ image width, available height ÷ image height)`, then centres the result. No stretching, no cropping.

What no converter should do is stretch an image to fill a page. If you ever see a document where the faces look wide, that is the bug.

## Why scans look soft even at 300 dpi

Resolution is only half of sharpness. The other half is optical:

- **The camera is too close and the lens is wide.** Phone cameras at 20 cm produce edge distortion and focus falloff. Step back and crop.
- **The light is a desk lamp at 45°.** It casts a shadow gradient that the scanner software reads as detail. Diffuse, overhead light beats a bright lamp every time.
- **The paper is not flat.** Curl at the spine throws half a page out of focus. Photograph a book with the spine pressed flat, or scan it.
- **JPEG compression was too aggressive.** A photo saved at quality 0.5 has ringing artefacts around every letter; re-saving it at 0.95 will not bring them back. Start from the original.
- **Digital zoom.** It is interpolation, not resolution. Never use it for documents.

There is also the resampling trap in reverse: a 600 dpi scan displayed at 100% on a 96 dpi screen looks the same as a 150 dpi scan. Judge the print, not the preview.

## Colour, file size and format

- **JPEG** is the right default for photographs: small files, invisible loss at high quality, universal support.
- **PNG** is right for screenshots, diagrams, line art and anything with text on a flat background — JPEG puts a halo around black text on white.
- **Multi-page from a phone** produces a 2–5 MB file per photo at full resolution. Twelve photos is a 40 MB PDF. Resizing to 300 dpi *before* conversion is far more effective than compressing afterwards, because it throws away detail you were never going to print.

If the document will be emailed or uploaded to a portal with a size cap, downscale to 150 dpi first: text stays readable on screen, and the file drops by roughly 75%.

## A quick recipe

1. Photograph straight-on, top-down, with even light and the whole page in frame.
2. Crop to the paper edge — no desk, no fingers.
3. Convert with *image fits page* if it must print on A4; *page fits image* if it is a single figure.
4. Add a small margin (5–8 mm) so home printers do not clip the edge.
5. Check the output at 100% zoom: letters should have hard edges, not grey halos.

[Convert images to PDF →](/jpg-to-pdf)
