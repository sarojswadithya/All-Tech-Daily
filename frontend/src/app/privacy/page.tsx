import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif min-h-screen p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-transparent border-4 border-double border-black p-8 md:p-12 relative">
        <Link href="/" className="absolute top-4 right-6 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
          Return to Desk →
        </Link>
        
        <h1 className="font-black text-4xl mb-2 uppercase tracking-tight">Privacy Policy</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-8 pb-4 border-b-2 border-black/20">
          Last Updated: June 17, 2026
        </p>

        <div className="space-y-6 text-gray-800 leading-relaxed">
          <section>
            <h2 className="font-bold text-xl mb-2">1. Information We Collect</h2>
            <p>When you register for an account, we collect your email address via Google Authentication. If you upgrade to the Creator Tier, your payment details are collected and processed securely by Stripe. We do not store your credit card information on our servers.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">2. How We Use Your Information</h2>
            <p>We use your email solely to manage your account access and subscription status. We use local storage and session storage on your browser to remember your language preferences and save your daily digest state.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">3. Third-Party AI Services</h2>
            <p>To generate summaries, translations, and audio, text data is temporarily processed by our AI partners (Groq and Sarvam AI). Your personal account information is never sent to these AI providers.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">4. Data Security</h2>
            <p>Your account data is secured using Supabase infrastructure. However, no method of transmission over the internet is 100% secure. We strive to use commercially acceptable means to protect your personal information.</p>
          </section>

          <section>
            <h2 className="font-bold text-xl mb-2">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us via our Contact Desk.</p>
          </section>
        </div>
      </div>
    </main>
  );
}