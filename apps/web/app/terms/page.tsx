import type { Metadata } from 'next';
import Link from 'next/link';

import { LEGAL_CONTACT, LegalPage } from '@/features/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms of Service · Cadence' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <p>
          These terms are the agreement between you and the operator of Cadence. By creating an
          account or using Cadence you accept them. If you do not agree, please do not use Cadence.
        </p>
      </section>

      <section>
        <h2>Who can use Cadence</h2>
        <p>
          You must be 18 or older and able to agree to these terms. You are responsible for your
          account and for keeping your password safe. Tell us at {LEGAL_CONTACT} if you think
          someone else is using it.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          Everything you put into Cadence (notes, habits, tasks, photos) stays yours. You give
          Cadence only the permission it needs to store, process and show that content to you to
          run the service. You are responsible for what you store and must have the right to store
          it.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not break the law or use Cadence to harm others.</li>
          <li>Do not try to access other people’s accounts or data.</li>
          <li>
            Do not attack, overload, scrape or reverse-engineer the service, or get around its
            limits and security.
          </li>
          <li>Do not upload malware or content you have no right to.</li>
        </ul>
      </section>

      <section>
        <h2>Suspension and leaving</h2>
        <p>
          Accounts that break these terms may be suspended or deleted, with notice where reasonable.
          You can stop using Cadence at any time: download your data and delete your account in
          Settings → Account.
        </p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          Cadence is a personal learning and portfolio project run by one developer, not a
          commercial service. It is provided “as is” and “as available”, with no promise of
          uptime, support or data safety. There are no backups, features may change, and the
          project may be reset or shut down at any time, with or without notice.
        </p>
        <p>
          Do not rely on Cadence for anything important or store sensitive information in it. Keep
          your own copy of anything you care about: you can export your data at any time.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          To the extent the law allows, the operator is not liable for indirect or consequential
          losses, or for loss of data, profits or opportunities, arising from your use of Cadence.
          Total liability for any claim is limited to the amount you paid for Cadence in the twelve
          months before the claim (currently nothing, as Cadence is free). Nothing here limits
          rights you have by law that cannot be limited.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How your data is handled is explained in the{' '}
          <Link href="/privacy" className="text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Law and disputes</h2>
        <p>
          These terms are governed by the laws of India, and disputes are handled by the courts of
          India. Please write to {LEGAL_CONTACT} first: most problems can be solved that way.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If these terms change, the new version is published here with a new effective date.
          Significant changes are announced in the app where practical.
        </p>
      </section>
    </LegalPage>
  );
}
