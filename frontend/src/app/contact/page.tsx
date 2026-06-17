import React from 'react';
import Link from 'next/link';

export default function ContactDesk() {
  return (
    <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-transparent border-4 border-double border-black p-10 relative text-center">
        <Link href="/" className="absolute top-4 left-4 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
          ← Back
        </Link>
        
        <div className="mb-8 mt-6">
          <span className="text-4xl">✉︎</span>
        </div>
        
        <h1 className="font-black text-3xl mb-4 uppercase tracking-tight">The Contact Desk</h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Have a question about your subscription, spotted a bug on the printing press, or want to suggest a new tech source? Drop us a line.
        </p>

        <div className="space-y-4">
          <a 
            href="mailto:sarojswadithyam@gmail.com?subject=All Tech Daily Inquiry" 
            className="block w-full py-4 bg-black text-[#F9F7F1] font-bold uppercase tracking-widest text-sm border border-black hover:bg-gray-800 transition-colors"
          >
            Email the Editor
          </a>
          
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-6 border-t border-black/10">
            Operating Hours: Mon-Fri, 9AM - 5PM IST
          </p>
        </div>
      </div>
    </main>
  );
}