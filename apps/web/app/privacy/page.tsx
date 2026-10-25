import type { Metadata } from 'next';

import { LEGAL_CONTACT, LegalPage } from '@/features/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy · Cadence' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          Cadence is a personal workspace for habits, tasks, notes and a daily journal. This policy
          explains what data Cadence handles, why, where it is kept and what you can do about it. In
          short: your data is used only to run Cadence for you. There are no ads, no analytics or
          tracking, and your data is never sold or shared for marketing.
        </p>
      </section>

      <section>
        <h2>What Cadence collects</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your email address, display name and, if you sign in
            with Google or GitHub, the name and profile picture link they share.
          </li>
          <li>
            <strong>What you create:</strong> habits, tasks, to-dos and their completion history,
            notes and folders, daily notes, and your settings (time zone, when your day ends).
          </li>
          <li>
            <strong>A profile photo</strong>, if you upload one.
          </li>
          <li>
            <strong>Technical data:</strong> server logs with IP addresses, browser type and the
            pages requested, used to keep the service secure and working. IP addresses are also used,
            in memory only, to limit abuse (rate limiting).
          </li>
        </ul>
      </section>

      <section>
        <h2>Why it is used</h2>
        <p>
          Only to provide Cadence: to sign you in, store and sync your data across your devices,
          send account emails (confirming your address, resetting your password), keep the service
          secure, and answer your requests. Cadence does not send marketing email.
        </p>
      </section>

      <section>
        <h2>Where it is kept and who processes it</h2>
        <ul>
          <li>
            <strong>Oracle Cloud, Mumbai (India):</strong> the servers that run Cadence and its
            database, including your account and everything you create.
          </li>
          <li>
            <strong>Cloudinary:</strong> stores uploaded profile photos (private, only delivered
            through signed links). Its servers may be outside India.
          </li>
          <li>
            <strong>Resend:</strong> delivers account emails. It handles your email address and the
            message, and its servers may be outside India.
          </li>
          <li>
            <strong>Google and GitHub:</strong> only if you choose to sign in with them; they
            confirm who you are and share your basic profile.
          </li>
        </ul>
        <p>These providers process data only to provide their service to Cadence.</p>
      </section>

      <section>
        <h2>Cookies and storage on your device</h2>
        <p>
          Cadence uses only the cookies needed to keep you signed in. It also stores data in your
          browser so the app works offline and remembers small preferences (for example open note
          tabs). There are no advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>How long it is kept</h2>
        <p>
          Your data is kept while you have an account. When you delete your account (Settings →
          Account), your account and everything in it are deleted immediately, including your
          profile photo. Server logs are kept for a short time and rotated.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under India’s Digital Personal Data Protection Act, 2023 and similar laws, you can:
        </p>
        <ul>
          <li>get a copy of your data: Settings → Account → Download my data;</li>
          <li>correct it: most details can be edited in the app;</li>
          <li>delete it: Settings → Account → Delete account;</li>
          <li>withdraw consent, which means deleting your account;</li>
          <li>nominate someone to act for you, and raise a complaint.</li>
        </ul>
        <p>
          For anything else, or a grievance, write to{' '}
          <a href={`mailto:${LEGAL_CONTACT}`} className="text-foreground underline underline-offset-4">
            {LEGAL_CONTACT}
          </a>
          . You will get a reply within 30 days. If you are not satisfied, you may complain to the
          Data Protection Board of India.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Connections are encrypted (HTTPS), passwords are stored only as secure hashes, and each
          account can only reach its own data. No system is perfectly secure; if a breach affects
          your data, you and the authorities will be told as the law requires.
        </p>
      </section>

      <section>
        <h2>Age</h2>
        <p>Cadence is for people aged 18 or older.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If this policy changes, the new version is published here with a new effective date.
          Significant changes are announced in the app or by email before they apply.
        </p>
      </section>
    </LegalPage>
  );
}
