---
title: "Merging PDFs: page order, mixed page sizes, and what quietly gets lost"
description: "Combining files looks trivial and usually is — until bookmarks, form fields or a password get in the way. What a merge keeps, what it drops, and how to check the result."
date: "2026-11-03"
category: "How-to"
tags: ["merge", "organise", "bookmarks"]
tool: "merge-pdf"
---

Merging is the most-requested PDF operation there is, and the least discussed. The tool is a button; the interesting part is what the button does to the inside of the file.

## A merge copies pages, it does not concatenate documents

A PDF is a tree: a catalogue, a page tree, and then objects for content, fonts, images and metadata. Merging creates a new, empty document and copies page objects from each source into it, in the order you choose.

That single sentence explains almost every surprise:

- **Each page keeps its own size.** An A4 contract followed by a US Letter appendix produces a file with both, which prints with a step. That is correct behaviour — the alternative (scaling pages to one size) would silently distort signed pages.
- **Interactive form fields do not become one form.** Two copies of the same form will usually end up with colliding field names, and many viewers will show the first value in both places. Merge the *printed* versions if the forms are already filled.
- **Bookmarks and outlines are not merged.** The table of contents you carefully built in each file lives above the page tree, and a naive merge drops it. The pages are all there; the navigation is not.
- **Tags and accessibility structure can be lost.** Reading order, alt text and table headers are document-level structures, so a merged file often fails an accessibility check that both originals passed.
- **File size is roughly the sum**, minus whatever the writer can de-duplicate. Shared fonts are usually stored once; images are not re-compressed.
- **Metadata comes from the first file.** Author, title and creation date are not blended — the output inherits the first document's information dictionary.

None of this is a bug. It is the ceiling of the format: pages are portable, document structure is not.

## The order problem

Most merge tools let you drag files into position, and a surprising number of errors happen right there:

- **Scans arrive in reverse.** A sheet-fed scanner with the pages face up produces 10, 9, 8… unless your scanner's software reverses the batch. Check the first and last page of the batch, not the middle.
- **"Contract" and "contract (1)"** are not necessarily the same document. Open both before merging; the second one is often the version that was actually signed.
- **Signed pages must stay with their text.** If page 4 is the signature page and you insert a new page 3, the signature now attests to different content. Re-check anything with a signature, seal or initial block after inserting pages.

A merge is a good moment to fix order properly: put everything in one list, then read the filenames top to bottom and say out loud what each page is. If you cannot, the reader will not be able to either.

## Password-protected files

If a source file is encrypted, a competent merger will refuse it rather than produce a broken page. Remove the password first (only for documents you have the right to open), then merge. Files with an owner password that only restricts printing or copying may merge but inherit those restrictions, so check the result's security settings before distributing it.

## The no-upload advantage

Merging is also the operation where uploading is least necessary. The tool needs to read bytes and write bytes; it does not need a server. When the merge runs in the browser:

- the documents never leave the device — relevant if one of them is a passport scan, a medical report or a signed NDA
- there is no 10 MB or 25 MB upload cap set by someone else's hosting bill
- it works on a plane, and it works when the vendor is down

The practical limit becomes your machine's memory rather than a server policy. Hundreds of megabytes of scanned pages will make a browser tab work hard; a few dozen normal documents merge in a second or two.

## A five-step check after merging

1. **Count the pages.** The output should equal the sum of the inputs. If it is short, a file failed silently.
2. **Look at the seams.** Page 1 of the second document should follow the last page of the first, with its own header — not a blank page.
3. **Search across the seam.** Search for a word you know is in the second document. If it is missing, that section was scanned rather than typed.
4. **Open the last page.** Truncated merges show up at the end, not the beginning.
5. **Check the file's properties** and clear any author or company metadata that should not travel with the bundle.

Then, if the bundle needs navigation, add a short cover page and a bookmark per section — most readers will thank you, and it is the one thing a merge cannot do for itself.

[Merge PDFs in your browser →](/merge-pdf)
