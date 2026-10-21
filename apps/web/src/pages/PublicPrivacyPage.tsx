import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PublicPrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <header className="border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Bizletix Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold text-base text-slate-900">Bizletix</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500 mt-0.5">Last updated: October 21, 2026</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Google API Services User Data Policy Compliance</h2>
            <p>
              Bizletix's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 underline font-medium"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Overview and Purpose</h2>
            <p>
              Bizletix ("we", "our", or "the Service") is a self-hostable email campaign and mail merge platform designed to help users compose, personalize, and dispatch emails to opted-in recipient lists directly through their authenticated Google accounts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Google User Data We Access</h2>
            <p className="mb-2">When you connect your Google account, Bizletix requests the following minimal permissions:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong><code>https://www.googleapis.com/auth/gmail.send</code></strong>: Used solely to dispatch email messages that you explicitly compose, preview, and launch within the application. We <strong>do not</strong> read, search, index, or delete your existing emails or mailbox content.
              </li>
              <li>
                <strong><code>https://www.googleapis.com/auth/userinfo.email</code></strong>: Used to identify your sender email address and display it in campaign headers.
              </li>
              <li>
                <strong><code>https://www.googleapis.com/auth/userinfo.profile</code></strong>: Used to retrieve your display name for sender profile identification.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Store and Protect Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Token Encryption at Rest</strong>: Google OAuth access tokens and refresh tokens are encrypted at rest using industry-standard <strong>AES-256-GCM</strong> authenticated encryption before storage. Encryption keys are securely injected via environment variables and never logged.
              </li>
              <li>
                <strong>Server-Side Storage Only</strong>: OAuth credentials are never stored in browser local storage or exposed to client-side code.
              </li>
              <li>
                <strong>Disconnecting Accounts</strong>: You may disconnect your Google account at any time via <em>Settings &gt; Integrations</em>, which immediately deletes all stored OAuth tokens from our database.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Information Sharing & Third-Party Disclosure</h2>
            <p className="font-semibold text-slate-900 mb-1">We do not sell, rent, or monetize your data.</p>
            <p>
              Specifically regarding Google user data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>We do <strong>not</strong> sell Google user data to any third parties.</li>
              <li>We do <strong>not</strong> use or transfer Google user data for serving advertisements (including retargeting, personalized, or interest-based advertising).</li>
              <li>We do <strong>not</strong> use Google user data to train generalized machine learning or artificial intelligence models.</li>
              <li>We do <strong>not</strong> permit humans to read your private email content unless compelled by law or explicitly authorized for debugging with your consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Recipient Data & Universal Suppression</h2>
            <p>
              Contacts uploaded to Bizletix belong solely to you. We provide a universal suppression mechanism: whenever a recipient clicks an unsubscribe link, their email is placed on a global suppression list and permanently prevented from receiving future campaign dispatches.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Open & Link Tracking Policy</h2>
            <p>
              Bizletix generates high-entropy cryptographic tokens for open-event pixels and link redirection. We do not engage in covert device fingerprinting or store raw IP addresses. Detected opens are labeled as approximate signals acknowledging email proxy caching.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to request data deletion, please contact us at:
            </p>
            <p className="mt-2 text-slate-900 font-medium">
              Email: <code>kanishjebamathew.m@gmail.com</code>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 py-6 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Bizletix. All rights reserved.
      </footer>
    </div>
  );
}
