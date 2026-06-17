"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase'; 

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // THE FIX: Real state tied to the database, not a hardcoded 'false'
  const [isPro, setIsPro] = useState(false); 

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        
        // THE FIX: Fetch their actual billing status from the profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setIsPro(profile.is_pro);
        }
      }
      setLoading(false);
    };
    
    fetchUserAndProfile();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleUpgradeClick = async () => {
    if (!user?.email) return;
    setCheckoutLoading(true);
    
    try {
      const res = await fetch('https://all-tech-daily.onrender.com/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      
      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();
      window.location.href = data.url; 
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Could not connect to the billing provider.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Add this near your other useState declarations
  const [portalLoading, setPortalLoading] = useState(false);

  // Add this function below your handleUpgradeClick function
  const handleManageBilling = async () => {
    if (!user?.email) return;
    setPortalLoading(true);
    
    try {
      const res = await fetch('https://all-tech-daily.onrender.com/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      
      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();
      // Redirect the user to their secure Stripe portal
      window.location.href = data.url; 
    } catch (error) {
      console.error("Portal Error:", error);
      alert("Could not connect to the billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif relative min-h-screen paper-grain flex flex-col p-6 md:p-12 items-center">
        
        <header className="max-w-4xl w-full mb-12 flex justify-between items-center pb-6 border-b-8 border-double border-black z-10 relative">
          <Link href="/">
            <div className="relative h-16 w-[250px] cursor-pointer">
              <Image src="/main_logo.png" alt="All Tech Daily" fill sizes="(max-width: 768px) 100vw, 250px" style={{ objectFit: 'contain', objectPosition: 'left' }} priority />
            </div>
          </Link>
          <Link href="/digest" className="text-xs font-bold uppercase tracking-widest hover:text-gray-500 transition-colors">
            ← Return to Digest
          </Link>
        </header>

        <div className="w-full max-w-4xl bg-transparent border-4 border-double border-black p-10 z-10 relative grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-6 italic border-b-2 border-black/20 pb-2">Editor Profile</h2>
            <p className="font-mono text-sm mb-2 text-gray-500">Authenticated Email:</p>
            <p className="font-black text-xl mb-8">{user?.email}</p>
            
            <button 
              onClick={handleSignOut}
              className="px-6 py-3 border border-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-black/5 p-8 border-2 border-black border-dashed">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-6 italic border-b-2 border-black/20 pb-2">Active Subscription</h2>
            
            <div className="flex items-end gap-3 mb-4">
              <h3 className="font-black text-4xl">{isPro ? 'Creator' : 'Reader'}</h3>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Tier</span>
            </div>

            <p className="text-sm text-gray-700 italic mb-8">
              {isPro 
                ? "You have full access to TTS Audio, Social Scripts, and PDF generation." 
                : "You are currently on the free tier. Upgrade to unlock Creator Studio tools and PDF exports."}
            </p>

            {isPro ? (
              <button 
                onClick={handleManageBilling} 
                disabled={portalLoading}
                className="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-widest border border-black hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {portalLoading ? 'Opening Portal...' : 'Manage Billing'}
              </button>
            ) : (
              <button 
                onClick={handleUpgradeClick} 
                disabled={checkoutLoading}
                className="w-full py-4 bg-transparent text-black text-xs font-bold uppercase tracking-widest border-2 border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
              >
                {checkoutLoading ? 'Connecting to Stripe...' : 'Upgrade to Creator — ₹49/mo'}
              </button>
            )}
          </div>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .paper-grain::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.35; z-index: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
      `}} />
    </>
  );
}