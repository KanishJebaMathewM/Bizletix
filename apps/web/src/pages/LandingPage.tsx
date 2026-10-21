import { Link } from 'react-router-dom';
import { Send, Users, Shield, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Bizletix Logo" className="w-9 h-9 object-contain rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-slate-900">Bizletix</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          The Responsible YAMM-Style Mail Merge Platform
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Send thoughtfully.<br />
          <span className="text-emerald-600">Measure responsibly.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Bizletix is an email campaign and mail merge management application that connects directly to your authorized Google account to send personalized emails from your own Gmail address.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3.5 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Get Started with Bizletix <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#how-it-works"
            className="px-6 py-3.5 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Purpose & Value Proposition */}
      <section id="how-it-works" className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Why Bizletix?
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              Designed for legitimate, professional outreach—contacting community members, open-source contributors, and opted-in subscribers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Native Gmail Sending</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Send authentic, personalized messages directly from your personal Gmail or Google Workspace account via the official Google OAuth 2.0 API.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart CSV Personalization</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Import contacts from CSV files and personalize message templates using merge tags like <code>{`{{first_name}}`}</code>, <code>{`{{company}}`}</code>, and custom fields.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Responsible Tracking</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track open signals and link clicks with high-entropy token hashing and anti-caching headers, while honoring recipient privacy and one-click unsubscribes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Permissions Callout */}
      <section className="py-16 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 items-center justify-center mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Strict Security & Minimal Scopes
        </h2>
        <p className="mt-4 text-slate-600 leading-relaxed text-base max-w-2xl mx-auto">
          Bizletix requests only the minimal scope required to dispatch user-composed messages (<code>gmail.send</code>). We <strong>never</strong> read, store, or modify your inbox, and tokens are encrypted at rest with AES-256-GCM.
        </p>
        <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
          <span>✓ Zero inbox read access</span>
          <span>✓ AES-256-GCM encryption</span>
          <span>✓ One-click unsubscribe</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-100 bg-slate-50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Bizletix" className="w-5 h-5 object-contain" />
            <span>© {new Date().getFullYear()} Bizletix. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
