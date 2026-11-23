import LegalPage, { type LegalSection } from '../components/LegalPage'
import { usePageMeta } from '../lib/usePageMeta'

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          DocTrim (“DocTrim”, “we”, “us”) is an independent website that provides free tools for
          working with PDF files. It is operated by an individual developer based in Iraq. This
          policy explains what happens to information when you use the site.
        </p>
        <p>
          The short version: you do not need an account, most tools never send your file anywhere,
          and we do not sell personal data.
        </p>
      </>
    ),
  },
  {
    id: 'files',
    title: 'Your files',
    body: (
      <>
        <p>
          <strong className="text-ink">Browser tools.</strong> Merge, Split, Rotate, Organize, Delete
          pages, Extract pages, JPG to PDF, PNG to PDF, PDF to JPG, PDF to PNG, Compress, Crop,
          Watermark, Number pages, Sign and PDF Reader run entirely inside your browser. The file is
          read from your device, processed in memory by JavaScript on your own machine, and saved
          back to your downloads folder. It is not uploaded to us and we have no way to access it.
        </p>
        <p>
          <strong className="text-ink">Server-backed tools.</strong> A small number of tools (for
          example Office conversion, OCR, password protection and text editing) need processing on our server
          because browsers cannot do that work reliably. When you use one of those tools, the file is
          uploaded over HTTPS, processed, returned to you, and deleted from the server disk
          immediately afterwards — a text-editing session that is abandoned is swept within 30
          minutes. We do not open, inspect, index, or share these files, and they are
          never used to train anything.
        </p>
        <p>
          We do not keep a history of your files and there is no document storage or “recent files”
          list on the site.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <p>We collect as little as possible:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">No account data</strong> — there is no sign-up, so we hold no
            name, email address, or password for you.
          </li>
          <li>
            <strong className="text-ink">Technical data from our host</strong> — like almost any
            website, our hosting provider (Cloudflare) processes request data such as your IP
            address, browser type, and the page requested, in order to deliver the site and defend it
            against abuse. Those logs are short-lived and are not used to build profiles.
          </li>
          <li>
            <strong className="text-ink">Emails you send us</strong> — if you write to{' '}
            <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
              Support@doctrim.com
            </a>
            , we keep the message so we can answer it and fix whatever you reported.
          </li>
          <li>
            <strong className="text-ink">Aggregate usage</strong> — if we later add privacy-friendly
            analytics, it will be aggregate and cookie-free; we do not run cross-site behavioural
            tracking.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies-and-ads',
    title: 'Cookies and advertising',
    body: (
      <>
        <p>
          DocTrim is free and is supported by advertising. We use <strong className="text-ink">Google
          AdSense</strong> to display ads on some pages, and advertising is how the site pays for
          itself.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Third-party vendors, including Google, use cookies to serve ads based on your prior visits
            to this and other websites.
          </li>
          <li>
            Google’s use of advertising cookies (including the DoubleClick cookie) enables it and its
            partners to serve ads to you based on your visit to this site and/or other sites on the
            internet.
          </li>
          <li>
            You can opt out of personalised advertising by visiting{' '}
            <a
              href="https://www.google.com/settings/ads"
              className="font-semibold text-brand hover:underline"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Google Ads Settings
            </a>
            , or opt out of third-party vendors’ use of cookies for personalised advertising at{' '}
            <a
              href="https://www.aboutads.info/choices/"
              className="font-semibold text-brand hover:underline"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              aboutads.info
            </a>
            .
          </li>
          <li>
            If you are in the European Economic Area, the United Kingdom, or Switzerland, you will be
            asked for consent before personalised advertising cookies are set, and you can change or
            withdraw that choice at any time.
          </li>
          <li>
            Ad providers may set their own cookies when an ad loads. We do not control those cookies
            and cannot read them; blocking them in your browser does not break any DocTrim tool.
          </li>
        </ul>
        <p>
          We do not place our own tracking cookies, and we do not use cookies to identify you as a
          person across other websites.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services',
    body: (
      <>
        <p>The site relies on a small number of providers, each of which processes data under its own policy:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Cloudflare</strong> — hosting and delivery of the website
            (Cloudflare Pages), including security filtering and short-lived request logs.
          </li>
          <li>
            <strong className="text-ink">Google AdSense</strong> — advertising, as described above.
          </li>
          <li>
            <strong className="text-ink">Google Fonts</strong> — the site’s typeface is loaded from
            Google’s font service, which receives your IP address as part of the request.
          </li>
        </ul>
        <p>
          We do not sell, rent, or trade personal data, and we do not share your files with any of
          these providers.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep things',
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Files</strong> — browser tools produce nothing for us to
            keep. Server-processed files are deleted immediately after the response is sent.
          </li>
          <li>
            <strong className="text-ink">Host logs</strong> — retained briefly by Cloudflare for
            security and troubleshooting, then discarded.
          </li>
          <li>
            <strong className="text-ink">Support emails</strong> — kept while the issue is open and
            for a reasonable period afterwards so we recognise repeat reports.
          </li>
          <li>
            <strong className="text-ink">Ad cookies</strong> — set and expired by the ad provider, not
            by us; see the opt-out links above.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, restrict, or
          object to the processing of your personal data, and to lodge a complaint with a data
          protection authority. Because the site has no accounts, we usually hold nothing that
          identifies you beyond an email you chose to send.
        </p>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
            Support@doctrim.com
          </a>{' '}
          and we will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        DocTrim is not directed at children under 13. We do not knowingly collect personal data from
        children, and we do not serve personalised advertising to users we know to be under 13. If you
        believe a child has sent us personal information, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <p>
        Our hosting and advertising providers operate globally, so technical data such as request logs
        and ad cookies may be processed outside the country where you live, including in the United
        States. Those providers maintain their own transfer safeguards under their published terms.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        The site is served over HTTPS. Because most processing happens on your own device, the
        strongest protection in the design is that your documents never travel at all. For the
        server-backed tools, files are transferred over encrypted connections and deleted immediately
        after processing. No system is perfectly secure, but we do not store documents, so there is no
        document archive to breach.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If the way the site handles data changes — for example when a new server-backed tool or a new
        advertising feature goes live — this page will be updated first, and the “last updated” date at
        the top will change. Material changes will be described here rather than made silently.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        DocTrim is operated from Iraq. For any privacy question or request, write to{' '}
        <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
          Support@doctrim.com
        </a>
        .
      </p>
    ),
  },
]

export default function Privacy() {
  usePageMeta(
    'Privacy Policy — DocTrim',
    'How DocTrim handles your files and data: browser-side processing, no accounts, short-lived server logs, and the cookies used by Google AdSense advertising.'
  )
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What DocTrim does with your files, your data, and the cookies that come with advertising — in plain language."
      updated="November 22, 2026"
      sections={SECTIONS}
    />
  )
}
