import LegalPage, { type LegalSection } from '../components/LegalPage'
import { usePageMeta } from '../lib/usePageMeta'
import { TOOLS } from '../lib/tools'

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to these terms',
    body: (
      <p>
        These terms govern your use of DocTrim (the “Service”), a free website for working with PDF
        files. By using the Service you agree to them. If you do not agree, please do not use the
        site.
      </p>
    ),
  },
  {
    id: 'the-service',
    title: 'What the Service is',
    body: (
      <p>
        DocTrim provides {TOOLS.length} browser-based and server-based tools to convert, compress, organise, edit,
        protect and sign PDF documents. Tools are free to use, require no account, and are offered as
        they are. Features may be added, changed, or withdrawn at any time, and a tool marked as
        unavailable is not yet part of the Service.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who may use it',
    body: (
      <p>
        You must be at least 13 years old to use DocTrim. If you are under the age of majority where
        you live, you may only use the Service with the involvement of a parent or guardian.
      </p>
    ),
  },
  {
    id: 'your-files',
    title: 'Your files and content',
    body: (
      <>
        <p>
          <strong className="text-ink">You keep all rights to your documents.</strong> We claim no
          ownership over any file you process, and we do not keep copies.
        </p>
        <p>
          For browser tools, nothing is transmitted. For server-backed tools, you grant us a limited,
          temporary permission to process the file solely to perform the action you requested; that
          permission ends when the processed file is returned and the copy is deleted. Text rewrites
          in the editor are stateless: the server keeps no copy, and any temporary file expires within
          30 minutes at the latest.
        </p>
        <p>
          You are responsible for having the right to handle the files you upload and for keeping your
          own backups. Do not use the Service for content you are not entitled to process.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>process material that is unlawful, infringing, or that you have no permission to handle;</li>
          <li>attempt to disrupt, overload, probe, or gain unauthorised access to the Service or its infrastructure;</li>
          <li>
            use automated means to bulk-extract results, resell the Service, or present it as your own
            product — including scripts that ignore the published rate limits;
          </li>
          <li>remove or obscure attribution where it appears, or use the DocTrim name and logo without permission;</li>
          <li>use the Service in a way that breaks applicable law, including data-protection and export rules.</li>
        </ul>
        <p>
          We may limit or block access — technically or by IP — where we reasonably believe use is
          abusive, and we may report unlawful activity to the relevant authorities.
        </p>
      </>
    ),
  },
  {
    id: 'limits',
    title: 'Availability and fair use',
    body: (
      <>
        <p>
          The Service is free and runs on a shared server. Server-backed tools accept files up to
          50 MB each, may queue during busy periods, and are subject to per-visitor and site-wide
          rate limits. If a limit is reached, the tool tells you to wait and try again; the limit
          resets automatically. These measures exist to keep the Service usable for everyone, not to
          meter normal use.
        </p>
        <p>
          We do not guarantee uptime, processing speed, or that any particular format will convert
          perfectly. Large, damaged, encrypted, or unusually structured documents may fail or take
          longer.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Our intellectual property',
    body: (
      <p>
        The DocTrim name, logo, site design, and the code that makes the tools work belong to the
        operator of the Service and are protected by copyright and trademark rules. You may not copy,
        modify, distribute, or create derivative works from the site itself, except for the open-source
        libraries it uses, which remain under their own licences.
      </p>
    ),
  },
  {
    id: 'ads-and-links',
    title: 'Advertising and third-party links',
    body: (
      <p>
        The Service is supported by advertising and may contain links to third-party websites. Ads and
        linked sites are not under our control: we do not endorse them and are not responsible for
        their content, products, or privacy practices. Your dealings with any advertiser or third party
        are solely between you and them.
      </p>
    ),
  },
  {
    id: 'no-warranty',
    title: 'No warranty',
    body: (
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind, express or
        implied, including fitness for a particular purpose, accuracy, or uninterrupted availability.
        PDF processing can fail on damaged, encrypted, or unusually structured files; always keep the
        original document and check the output before relying on it.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental, special,
        or consequential damages, or for lost data, lost profits, or business interruption arising from
        your use of — or inability to use — the Service. Because the Service is provided free of
        charge, our total liability for any claim relating to it is limited to the amount you paid to
        use it, which is zero.
      </p>
    ),
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    body: (
      <p>
        You agree to indemnify and hold harmless the operator of DocTrim from claims, damages, and
        costs (including reasonable legal fees) arising from your misuse of the Service or your breach
        of these terms, including claims relating to files you processed without the necessary rights.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to the Service and these terms',
    body: (
      <p>
        We may update these terms as the Service evolves. The current version always lives on this
        page with its “last updated” date. Continuing to use DocTrim after a change means you accept
        the updated terms; if a change is material, it will be described here rather than made
        silently.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    body: (
      <p>
        These terms are governed by the laws of the Republic of Iraq. Any dispute arising out of or
        relating to the Service or these terms is subject to the exclusive jurisdiction of the
        competent courts of Baghdad, Iraq. If any provision is found unenforceable, the remaining
        provisions stay in force.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms? Write to{' '}
        <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
          Support@doctrim.com
        </a>
        .
      </p>
    ),
  },
]

export default function Terms() {
  usePageMeta(
    'Terms of Service — DocTrim',
    'The terms that apply when you use DocTrim: what the service is, your rights over your files, acceptable use, fair-use limits, and the limits of our liability.'
  )
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The rules that apply when you use DocTrim — short, readable, and without surprises buried in the middle."
      updated="November 24, 2026"
      sections={SECTIONS}
    />
  )
}
