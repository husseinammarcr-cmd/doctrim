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
          the tools that do use our own server delete the file as soon as the job finishes, and we
          do not sell personal data.
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
          The layout, annotation, signature and redaction features inside the PDF editor also run
          locally.
        </p>
        <p>
          <strong className="text-ink">Server-backed tools.</strong> Ten tools — PDF to Word, PDF to
          Excel, PDF to PPT, PDF OCR, Word to PDF, Excel to PDF, PPT to PDF, Protect PDF, Unlock PDF
          and Flatten PDF — need processing on our own server, because browsers cannot do that work
          reliably. The same applies to the step in the PDF editor that rewrites existing text so the
          old words are truly replaced. When you use one of those tools, the file is uploaded over
          HTTPS, processed, returned to you, and deleted from the server disk immediately afterwards.
        </p>
        <p>
          Text rewrites are handled one request at a time; the server keeps no copy afterwards, and
          any temporary working file expires within 30 minutes at the latest. Server uploads are
          limited to 50 MB per file. We do not open, inspect, index, or share these files, and they
          are never used to train anything.
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
            <strong className="text-ink">First-party usage statistics</strong> — the site records
            aggregate events through our own API, not a third-party analytics service: the page
            opened, the tool used, whether a run succeeded or failed, processing time, download
            events, a short error message, the referring site’s host, and a coarse device type. No
            file names, file contents, or document text are ever recorded, and there are no
            analytics cookies or cross-site identifiers. To count unique visitors, your IP address
            and browser user-agent are converted into a keyed hash using a secret that changes every
            day; the raw IP address is not written to the statistics database. Those records are kept
            for up to 180 days.
          </li>
          <li>
            <strong className="text-ink">Technical data from our host</strong> — like almost any
            website, our hosting provider (Cloudflare) processes request data such as your IP
            address, browser type, and the page requested, in order to deliver the site and defend it
            against abuse. Those logs are short-lived and are not used to build profiles. IP
            addresses are also used in memory, for a few minutes at most, to apply rate limits and
            keep the service available.
          </li>
          <li>
            <strong className="text-ink">Emails you send us</strong> — if you write to{' '}
            <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
              Support@doctrim.com
            </a>
            , we keep the message so we can answer it and fix whatever you reported.
          </li>
        </ul>
        <p>
          You can switch analytics off completely by enabling “Do Not Track” in your browser. The
          site respects that setting, and all tools keep working normally.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-and-ads',
    title: 'Cookies and advertising',
    body: (
      <>
        <p>
          DocTrim is free and is supported by advertising. Advertising covers the cost of running the
          site and its processing server, so basic PDF tasks do not have to sit behind a paywall.
          Ads, where they are shown, are served by <strong className="text-ink">Google AdSense</strong>.
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
            and cannot read them; blocking them in your browser does not break any DocTrim tool. When
            no ad is loaded, no advertising cookie is set.
          </li>
        </ul>
        <p>
          We do not place our own tracking cookies, and we do not use cookies to identify you as a
          person across other websites. The only things DocTrim stores in your browser are your
          language choice and, if analytics is available, the fact that you asked it not to be
          recorded.
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
          File processing happens on our own server, not on a third-party conversion service. We do
          not sell, rent, or trade personal data, and we do not share your files with any of these
          providers.
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
            keep. Server-processed files are deleted immediately after the response is sent. Any
            temporary file created by the PDF editor expires within 30 minutes at the latest.
          </li>
          <li>
            <strong className="text-ink">Usage statistics</strong> — aggregate events, with no raw IP
            addresses, are kept for up to 180 days and then deleted automatically.
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
          protection authority. Because the site has no accounts and stores no raw IP addresses in its
          statistics, we usually hold nothing that identifies you beyond an email you chose to send.
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
        Our hosting, font and advertising providers operate globally, so technical data such as
        request logs and ad cookies may be processed outside the country where you live, including in
        the United States. Those providers maintain their own transfer safeguards under their
        published terms. File processing itself takes place on our own server.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        The site is served over HTTPS. Because most processing happens on your own device, the
        strongest protection in the design is that those documents never travel at all. For the
        server-backed tools, files are transferred over encrypted connections and deleted immediately
        after processing; the editor’s temporary copy expires after 30 minutes. Rate limits and
        concurrency caps protect the server from abuse. No system is perfectly secure, but we do not
        store documents, so there is no document archive to breach.
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
    'How DocTrim handles your files and data: browser-side processing, short-lived server jobs, first-party analytics without cookies, and the cookies used by advertising.'
  )
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What DocTrim does with your files, your data, and the cookies that come with advertising — in plain language."
      updated="November 24, 2026"
      sections={SECTIONS}
    />
  )
}
