"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from './utils/supabase';

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    checkUser();
  }, []);

  return (
    <>
      <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif relative min-h-screen paper-grain flex flex-col selection:bg-black selection:text-white">
        
        <nav className="w-full max-w-6xl mx-auto px-6 py-8 flex justify-between items-center relative z-10">
          <Link href="/">
            <div className="relative h-12 w-[200px] cursor-pointer">
              <Image src="/main_logo.png" alt="All Tech Daily" fill sizes="(max-width: 768px) 100vw, 200px" style={{ objectFit: 'contain', objectPosition: 'left' }} priority />
            </div>
          </Link>
          
          {/* DYNAMIC NAVIGATION BASED ON AUTH STATE */}
          <div className="flex gap-6 items-center text-xs font-bold uppercase tracking-widest transition-opacity duration-300" style={{ opacity: loading ? 0 : 1 }}>
            {user ? (
              <>
                <Link href="/digest" className="hover:text-gray-500 transition-colors">Enter Desk</Link>
                <Link href="/dashboard" className="bg-black text-white px-6 py-3 border border-black hover:bg-transparent hover:text-black transition-all">
                  My Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-gray-500 transition-colors">Sign In</Link>
                <Link href="/login" className="bg-black text-white px-6 py-3 border border-black hover:bg-transparent hover:text-black transition-all">
                  Subscribe
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 z-10 max-w-4xl mx-auto">
          <div className="border-b-8 border-double border-black pb-10 mb-10 w-full">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
              The Morning Paper <br /> for the Modern Engineer.
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 italic max-w-2xl mx-auto leading-relaxed">
              We scrape the globe's top tech publications, distill the noise using AI, and hand you the facts. Read the news today. Script your content tomorrow.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/digest" className="bg-black text-white px-8 py-4 text-sm font-bold uppercase tracking-widest border-2 border-black hover:bg-gray-900 transition-all">
              Read Today's Edition →
            </Link>
            <Link href="#pricing" className="bg-transparent text-black px-8 py-4 text-sm font-bold uppercase tracking-widest border-2 border-black hover:bg-black hover:text-white transition-all">
              View Pricing
            </Link>
          </div>
        </div>

        {/* --- FEATURES GRID --- */}
        <div className="w-full border-t-2 border-black bg-black/5 z-10 relative">
          <div className="max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="border-l-4 border-black pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest mb-2 block">01 / Aggregation</span>
              <h3 className="text-2xl font-black mb-3">Global Sources</h3>
              <p className="text-gray-700 italic leading-relaxed">Unified feeds from top-tier publications including The Hindu, Times of India, and localized Tamil tech reports.</p>
            </div>
            <div className="border-l-4 border-black pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest mb-2 block">02 / Distillation</span>
              <h3 className="text-2xl font-black mb-3">Executive Summaries</h3>
              <p className="text-gray-700 italic leading-relaxed">No fluff. Llama 3 AI reads the articles and extracts strict, factual bullet points in milliseconds.</p>
            </div>
            <div className="border-l-4 border-black pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest mb-2 block">03 / Creation</span>
              <h3 className="text-2xl font-black mb-3">Creator Studio & Press</h3>
              <p className="text-gray-700 italic leading-relaxed">Instantly convert breaking news into highly-retained 30-second social media scripts, or export the entire daily feed as a beautifully formatted PDF.</p>
            </div>
            <div className="border-l-4 border-black pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest mb-2 block">04 / Broadcasting</span>
              <h3 className="text-2xl font-black mb-3">The Daily Podcast</h3>
              <p className="text-gray-700 italic leading-relaxed">Turn today's top stories into a seamlessly mixed, professional audio podcast with a single click. Listen on the go.</p>
            </div>
          </div>
        </div>

        {/* --- PRICING SECTION --- */}
        <div id="pricing" className="max-w-4xl mx-auto px-6 py-24 z-10 relative w-full">
          <h2 className="text-4xl font-black text-center mb-16 border-b-4 border-black pb-6 inline-block w-full">The Subscriptions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-black p-8 bg-transparent">
              <h3 className="text-2xl font-black mb-2">The Reader</h3>
              <p className="text-4xl font-black mb-6">$0<span className="text-sm font-normal italic text-gray-600"> / forever</span></p>
              <ul className="space-y-4 mb-8 text-sm font-medium">
                <li className="flex items-center gap-2">✓ Access to all global news sources</li>
                <li className="flex items-center gap-2">✓ AI Executive Summaries</li>
                <li className="flex items-center gap-2">✓ English & Tamil Translations</li>
              </ul>
              <Link href="/digest" className="block text-center w-full bg-transparent text-black border-2 border-black py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                Start Reading
              </Link>
            </div>

            <div className="border-4 border-double border-black p-8 bg-black text-[#F9F7F1]">
              <h3 className="text-2xl font-black mb-2">The Creator</h3>
              <p className="text-4xl font-black mb-6">₹49<span className="text-sm font-normal italic text-gray-400"> / month</span></p>
              <ul className="space-y-4 mb-8 text-sm font-medium">
                <li className="flex items-center gap-2">★ Everything in The Reader</li>
                <li className="flex items-center gap-2">★ Full Daily Podcast Mixing</li>
                <li className="flex items-center gap-2">★ One-click PDF layout exports</li>
                <li className="flex items-center gap-2">★ Instant Social Media Scripts</li>
                <li className="flex items-center gap-2">★ Hyper-realistic TTS Audio generation</li>
              </ul>
              {/* Dynamic Pricing Button */}
              <Link href={user ? "/dashboard" : "/login"} className="block text-center w-full bg-[#F9F7F1] text-black border-2 border-[#F9F7F1] py-3 text-xs font-bold uppercase tracking-widest hover:bg-transparent hover:text-[#F9F7F1] transition-all">
                {user ? "Manage Subscription" : "Upgrade to Creator"}
              </Link>
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <footer className="w-full border-t-8 border-double border-black bg-transparent mt-auto relative z-10">
          <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative h-8 w-[150px] opacity-50 grayscale">
              <Image src="/main_logo.png" alt="All Tech Daily" fill sizes="(max-width: 768px) 100vw, 150px" style={{ objectFit: 'contain', objectPosition: 'left' }} />
            </div>
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-black transition-colors">Contact Desk</Link>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              © 2026 All Tech Daily. All Rights Reserved.
            </p>
          </div>
        </footer>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .paper-grain::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.35; z-index: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
      `}} />
    </>
  );
}