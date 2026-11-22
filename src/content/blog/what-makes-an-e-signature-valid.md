---
title: "What actually makes an electronic signature valid?"
description: "A drawn signature on a PDF is a picture. Whether it binds anyone depends on intent, consent, attribution and the record around it. A plain-English guide."
date: "2026-10-19"
category: "Guides"
tags: ["sign", "e-signature", "legal"]
tool: "sign-pdf"
---

Two documents arrive by email. One has a signature drawn with a finger on a phone screen. The other has a name typed in a script font. Both look signed. Neither, on its own, tells you whether anyone is bound to anything.

Signature validity is not a property of the mark. It is a property of the process around it.

## Two things people call "e-signature"

**An electronic signature** is the legal concept: any electronic sound, symbol or process attached to a record that a person adopts with the intent to sign. A typed name at the bottom of an email can qualify. So can a drawn image placed on a PDF, a click on an "I agree" button, or a scanned ink signature.

**A digital signature** is a specific technical mechanism: a cryptographic signature (usually a certificate over a hash of the document) that proves the file has not changed since signing and identifies the signer's certificate. It is one *kind* of electronic signature, and a much stronger one.

Most PDFs people sign are the first kind. That is fine — and it means the evidence lives in the surrounding workflow, not in the pixels.

## The four questions that decide it

Legal frameworks differ in detail — ESIGN and UETA in the United States, eIDAS in the European Union, and equivalents almost everywhere else — but they converge on the same test:

1. **Intent.** Did this person mean to sign, or did they mean to send a draft? A signature image with no accompanying message is weaker than one sent with "signed, please countersign".
2. **Consent.** Did the parties agree to do business electronically? Usually established in the contract itself, or by the counterparty accepting an e-signature workflow.
3. **Attribution.** Can you connect this mark to this person? An email from their address, an account, a phone number, an audit trail. An anonymous scanned signature file proves nothing.
4. **Record integrity.** Can you show what was signed, and that it has not changed? This is where a plain PDF is weakest: anyone with an editor can alter a page after signing and produce a file that looks pristine.

A signature that fails any of these is decoration.

## What a signature image proves — and what it doesn't

Placing your signature on a PDF with DocTrim's [sign tool](/sign-pdf) does one thing precisely: it draws the signature where you put it, on the page you chose, and saves a file that prints correctly. It does not:

- prove who placed it
- detect later modification
- create a timestamped audit trail
- replace witnessing or notarisation where those are required

That is not a shortcoming of the tool; it is the ceiling of an unsigned document. If the transaction is high-value, regulated, or likely to be disputed, you need a workflow that adds identity verification, a tamper-evident seal and a timestamp — which is what dedicated e-signature platforms sell, and what a cryptographic digital signature provides technically.

## When a drawn or typed signature is genuinely enough

For a great deal of everyday paperwork, it is. Consider what you would accept from a counterparty:

- a supplier confirming a purchase order
- an internal approval on a leave request
- a landlord accepting a minor repair
- a freelance contract between two people who have already agreed by email

In all of these, the email thread, the payment and the relationship carry most of the evidentiary weight. A signature image is the formality that closes the loop.

## When it is not enough

- Anything that must be notarised or witnessed.
- Wills, deeds and documents that a specific statute excludes from e-signature rules in your jurisdiction.
- Regulated filings where the authority specifies a qualified or advanced signature.
- High-value contracts with parties you have never met.
- Documents where the *content* must be provably unaltered after signing — a cryptographic signature is the only technical answer to that.

If in doubt about a specific document, ask a lawyer in the relevant jurisdiction. This article is a map of the concepts, not legal advice.

## Practical habits that make a signature hold up

If you are signing with a simple e-signature, the strength comes from the paper trail:

- **Sign a PDF, not a screenshot.** Keep the file's text layer intact so the document is searchable and the content can be quoted later.
- **Send with a clear statement of intent** — "Signed copy attached; countersign and return" — and keep that message.
- **Keep the original as received**, unedited, alongside the signed copy.
- **Flatten or lock the final file** if your tool allows it, so an accidental edit does not create two different "final" versions.
- **Record the date**, and prefer a workflow that timestamps it independently of your own machine.
- **Sign each page or initial the corners** on multi-page documents, so a page cannot be swapped without leaving a visible seam.
- **Store the signed file where it will not be silently superseded** — not only in a chat thread or a phone gallery.

Two small habits prevent most disputes: never sign a PDF you have not read in full, and never send back a file whose signature block sits on a page you did not check.

[Sign a PDF in your browser →](/sign-pdf)
