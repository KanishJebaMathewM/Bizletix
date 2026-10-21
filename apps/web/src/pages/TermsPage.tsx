import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsPage() {
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500 mt-0.5">Last updated: October 21, 2026</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Bizletix ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Acceptable Use Policy</h2>
            <p className="mb-2">Bizletix is designed strictly for legitimate, professional, and opt-in communications. You agree that you will NOT use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Send unsolicited bulk commercial email (spam) in violation of CAN-SPAM, GDPR, or applicable laws.</li>
              <li>Distribute malware, phishing links, or deceptive communications.</li>
              <li>Scrape or harvest email addresses without recipient consent.</li>
              <li>Exceed provider quota thresholds or circumvent Gmail API rate limits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Google Account Integration</h2>
            <p>
              When connecting a Google Account, you grant Bizletix permission to send emails on your behalf via the Gmail API (`gmail.send`). You remain solely responsible for the content and frequency of messages dispatched through your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">4. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including inbox delivery guarantees or provider uptime.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">5. Contact</h2>
            <p>
              For legal inquiries or terms questions, reach out to <code>kanishjebamathew.m@gmail.com</code>.
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
