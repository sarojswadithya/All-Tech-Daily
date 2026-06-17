import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif min-h-screen p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-transparent border-4 border-double border-black p-8 md:p-12 relative">
        <Link href="/" className="absolute top-4 right-6 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
          Return to Desk →
        </Link>
        
        <h1 className="font-black text-4xl mb-2 uppercase tracking-tight">Terms of Service</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8 pb-4 border-b-2 border-black/20">
          Last Updated: June 17, 2026
        </p>

        <div className="space-y-6 text-gray-800 leading-relaxed">
          <section>
            <h2 className="font-bold text-xl mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using All Tech Daily, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">2. AI-Generated Content Disclaimer</h2>
            <p>All Tech Daily utilizes Artificial Intelligence (AI) to summarize, translate, and generate audio scripts from third-party news sources. While we strive for accuracy, AI can produce hallucinations or errors. All content is provided "as is" for informational purposes only. We are not liable for any decisions made based on this content.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">3. Subscriptions & Payments</h2>
            <p>Our "Creator Tier" is a paid subscription billed monthly. Payments are processed securely via Stripe. You may cancel your subscription at any time through your account dashboard. Refunds are not provided for partial billing periods.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">4. Third-Party Links</h2>
            <p>Our service aggregates links to third-party news publishers. We do not endorse or claim ownership over their original content. Your use of third-party websites is subject to their respective terms and policies.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">5. Governing Law</h2>
            <p>These terms shall be governed by and construed in accordance with the laws of Tamilnadu, India without regard to its conflict of law provisions.</p>
          </section>
        </div>
      </div>
    </main>
  );
}