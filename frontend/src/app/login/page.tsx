"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // BOUNCER LOGIC: Redirect immediately if already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/digest');
      }
    };
    checkExistingSession();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/digest`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif relative min-h-screen paper-grain flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-transparent border-4 border-double border-black p-10 z-10 relative">
          
          <div className="flex justify-center mb-8">
            <Link href="/">
              <div className="relative h-16 w-[250px] cursor-pointer">
                <Image src="/main_logo.png" alt="All Tech Daily" fill sizes="(max-width: 768px) 100vw, 250px" style={{ objectFit: 'contain' }} priority />
              </div>
            </Link>
          </div>

          <div className="text-center mb-8 border-b-2 border-black pb-6">
            <h1 className="font-black text-2xl tracking-tight mb-2">Access the Desk</h1>
            <p className="text-gray-600 italic text-sm">Sign in securely with Google to save your preferences and access Creator tools.</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 font-bold uppercase tracking-widest text-xs border border-black hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 text-sm font-medium text-center">
              {error}
            </div>
          )}
        </div>
        
        <Link href="/" className="mt-8 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors z-10 relative">
          ← Return to Frontpage
        </Link>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .paper-grain::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.35; z-index: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
      `}} />
    </>
  );
}