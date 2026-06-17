"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; 
import Link from 'next/link';
import { supabase } from '../utils/supabase';

const AVAILABLE_SOURCES = [
  { id: 'hindu', name: 'The Hindu', lang: 'en' },
  { id: 'toi', name: 'Times of India', lang: 'en' },
  { id: 'dinamalar', name: 'Dinamalar', lang: 'ta' },
  { id: 'dailythanthi', name: 'Dailythanthi', lang: 'ta' }
];

export default function Home() {
  // --- STATE AND SETUP ---
  const [isClient, setIsClient] = useState(false);
  const [appState, setAppState] = useState<'onboarding' | 'feed'>('onboarding');
  const [lang, setLang] = useState('en');
  const [selectedSources, setSelectedSources] = useState<string[]>(['hindu', 'toi']);
  
  const [news, setNews] = useState([]);
  const [translatedCards, setTranslatedCards] = useState<Record<number, any>>({});
  const [scripts, setScripts] = useState<Record<number, { text: string, loading: boolean, visible: boolean }>>({});
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [audioController, setAudioController] = useState<AbortController | null>(null);

  // NEW: Loading state for the PDF generation
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const [podcastLoading, setPodcastLoading] = useState(false);
  const [podcastPlayer, setPodcastPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
// --- PERSISTENCE ---
  useEffect(() => {
    setIsClient(true);
    
    // 1. Load Local Storage (Permanent Preferences)
    const savedLang = localStorage.getItem('techDigest_lang');
    const savedSources = localStorage.getItem('techDigest_sources');
    if (savedLang) setLang(savedLang);
    if (savedSources) setSelectedSources(JSON.parse(savedSources));

    // 2. Load Session Storage (Temporary Newspaper Cache)
    const savedAppState = sessionStorage.getItem('techDigest_appState');
    const savedNews = sessionStorage.getItem('techDigest_news');
    
    if (savedAppState === 'feed' && savedNews) {
      setNews(JSON.parse(savedNews));
      setAppState('feed');
    }
  }, []);

  // Keep your existing local storage sync effect right below it:
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('techDigest_lang', lang);
      localStorage.setItem('techDigest_sources', JSON.stringify(selectedSources));
    }
  }, [lang, selectedSources, isClient]);

  // NEW: Fetch user billing status to unlock PDF/Script buttons
  useEffect(() => {
    const checkProStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', session.user.id)
          .single();
          
        if (profile) setIsPro(profile.is_pro);
      }
    };
    checkProStatus();
  }, []);


  // --- HANDLERS ---
  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter(id => id !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    if (newLang === 'en') {
      setSelectedSources(['hindu', 'toi']);
    } else {
      setSelectedSources(['dinamalar', 'dailythanthi']);
    }
  };

  const fetchNews = async () => {
    setAppState('feed');
    setLoading(true);
    setError('');
    setTranslatedCards({});
    setScripts({});
    setPodcastPlayer(null);
    setIsPlaying(false);
    setVisibleCount(10); 
    
    try {
      const res = await fetch(`https://all-tech-backend.onrender.com/api/news?lang=${lang}&sources=${selectedSources.join(',')}`);      
      if (!res.ok) throw new Error('Failed to fetch news from backend');
      const data = await res.json();
      
      setNews(data);
      
      // NEW: Cache the newspaper and state for this browser session
      sessionStorage.setItem('techDigest_news', JSON.stringify(data));
      sessionStorage.setItem('techDigest_appState', 'feed');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateCard = async (id: number, currentHeadline: string, currentSummary: string, currentLang: string) => {
    const targetLang = currentLang === 'en' ? 'ta' : 'en';
    setTranslatedCards(prev => ({ ...prev, [id]: { ...prev[id], loading: true } }));

    try {
      const resHead = await fetch('https://all-tech-backend.onrender.com/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentHeadline, target_lang: targetLang })
      });
      const headData = await resHead.json();

      const resSumm = await fetch('https://all-tech-backend.onrender.com/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentSummary, target_lang: targetLang })
      });
      const summData = await resSumm.json();

      setTranslatedCards(prev => ({
        ...prev,
        [id]: {
          headline: headData.translated_text,
          summary: summData.translated_text,
          lang: targetLang,
          loading: false
        }
      }));
    } catch (error) {
      console.error("Translation failed", error);
      alert("Failed to translate article.");
      setTranslatedCards(prev => ({ ...prev, [id]: { ...prev[id], loading: false } }));
    }
  };

  const handleGenerateScript = async (id: number, headline: string, summary: string) => {
    if (!isPro) return; 
    
    if (scripts[id] && scripts[id].text) {
      setScripts(prev => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } }));
      return;
    }

    setScripts(prev => ({ ...prev, [id]: { text: '', loading: true, visible: true } }));
    try {
      const res = await fetch('https://all-tech-backend.onrender.com/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, summary })
      });
      if (!res.ok) throw new Error("Script generation failed");
      const data = await res.json();
      setScripts(prev => ({ ...prev, [id]: { text: data.script, loading: false, visible: true } }));
    } catch (error) {
      console.error(error);
      alert("Failed to generate script.");
      setScripts(prev => ({ ...prev, [id]: { text: 'Error generating script.', loading: false, visible: false } }));
    }
  };

  const readAloud = async (id: number, textToRead: string, playbackLang: string) => {
    if (playingId === id) {
      if (audioPlayer) {
        audioPlayer.pause();
        setAudioPlayer(null);
      }
      if (audioController) {
        audioController.abort(); 
        setAudioController(null);
      }
      setPlayingId(null);
      return;
    }

    if (audioPlayer) audioPlayer.pause();
    if (audioController) audioController.abort();

    const newController = new AbortController();
    setAudioController(newController);
    setPlayingId(id);

    try {
      const response = await fetch('https://all-tech-backend.onrender.com/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRead, lang: playbackLang }),
        signal: newController.signal 
      });

      if (!response.ok) throw new Error("Audio generation failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const newPlayer = new Audio(audioUrl);
      setAudioPlayer(newPlayer);
      
      newPlayer.onended = () => {
        setPlayingId(null);
        setAudioPlayer(null);
      };
      
      newPlayer.play();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Audio fetch was cleanly stopped by the user.");
      } else {
        console.error("TTS Error:", error);
        alert("Failed to load audio from the server.");
        setPlayingId(null);
      }
    }
  };

  // NEW: The PDF Generation Handler
  const handleDownloadPDF = async () => {
    if (!isPro) return;
    setPdfLoading(true);

    try {
      // 1. Send the current news array to the Python backend
      const response = await fetch('https://all-tech-backend.onrender.com/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articles: news, language: lang }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      // 2. Convert the streamed response into a raw file (Blob)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // 3. Create an invisible link, click it to trigger download, and clean it up
      const a = document.createElement('a');
      a.href = url;
      const dateString = new Date().toISOString().split('T')[0];
      a.download = `All_Tech_Daily_${dateString}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error("PDF Download Error:", error);
      alert("Failed to compile the PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePlayPodcast = async () => {
    if (!isPro) return;
    
    // 1. If the audio is already loaded, just toggle play/pause!
    if (podcastPlayer) {
      if (isPlaying) {
        podcastPlayer.pause();
        setIsPlaying(false);
      } else {
        podcastPlayer.play();
        setIsPlaying(true);
      }
      return; // Stop the function here so we don't fetch again
    }

    // 2. If no audio is loaded yet, fetch it from the server
    setPodcastLoading(true);
    try {
      const response = await fetch('https://all-tech-backend.onrender.com/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: news, language: lang }),
      });

      if (!response.ok) throw new Error("Podcast failed");

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const newPlayer = new Audio(audioUrl);
      
      setPodcastPlayer(newPlayer);
      
      // When the podcast finishes naturally, reset the UI
      newPlayer.onended = () => {
        setIsPlaying(false);
        setPodcastPlayer(null); // Clear it so they can generate a fresh one later
      };
      
      newPlayer.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error("Podcast Error:", error);
      alert("Could not load today's podcast.");
    } finally {
      setPodcastLoading(false);
    }
  };

  // --- RENDER ---
  if (!isClient) return null;

  return (
    <>
      <main className="bg-[#F9F7F1] text-[#1A1A1A] font-serif relative min-h-screen paper-grain transition-colors duration-500 flex flex-col p-6 md:p-2">
        
        {/* --- GLOBAL MASTHEAD --- */}
        <header className="max-w-6xl mx-auto mb-2 flex flex-col items-center text-center pb-2 border-b-8 border-double border-black z-10 relative pt-8 w-full">
          <Link href="/">
            <div className="relative h-28 w-[400px] mb-4 cursor-pointer">
            <Image 
              src="/main_logo.png" 
              alt="All Tech Daily Masthead" 
              fill 
              sizes="(max-width: 768px) 100vw, 400px" 
              style={{ objectFit: 'contain' }} 
              priority 
            />           
            </div>
          </Link>

          {appState === 'feed' && (
            <div className="flex justify-between w-full items-center mt-6 border-t border-b border-black py-2 uppercase tracking-widest text-xs font-bold">
              <span className="font-serif text-gray-600 italic">Vol. 1 — {lang === 'ta' ? 'Tamil Edition' : 'English Edition'}</span>
              
              <div className="flex items-center gap-6">
                <Link href="/dashboard" className="text-gray-500 hover:text-black transition-colors flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full"></span> My Account
                </Link>
                <button 
                  onClick={() => {
                    setAppState('onboarding');
                    sessionStorage.setItem('techDigest_appState', 'onboarding');
                  }} 
                  className="flex items-center gap-2 px-4 py-2 border border-gray-400 hover:border-black hover:bg-black hover:text-[#F9F7F1] text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-all"
                >
                  ⛭ Change Edition & Sources
                </button>
              </div>
            </div>
          )}    
        </header>

        {/* --- SCREEN 1: ONBOARDING --- */}
        {appState === 'onboarding' && (
          <div className="w-full max-w-4xl mx-auto pt-16 z-10 relative">
            <div className="p-10 w-full max-w-xl mx-auto transition-all bg-transparent border-4 border-double border-black">
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3 font-serif text-gray-600 italic">Edition Language</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleLanguageChange('en')}
                      className={`py-3 transition-all ${lang === 'en' ? 'bg-black text-white rounded-none border-2 border-black font-serif uppercase tracking-widest text-sm' : 'border-black text-black hover:bg-black hover:text-white rounded-none font-serif uppercase tracking-widest text-sm'}`}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => handleLanguageChange('ta')}
                      className={`py-3 transition-all ${lang === 'ta' ? 'bg-black text-white rounded-none border-2 border-black font-serif uppercase tracking-widest text-sm' : 'border-black text-black hover:bg-black hover:text-white rounded-none font-serif uppercase tracking-widest text-sm'}`}
                    >
                      தமிழ் (Tamil)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-3 font-serif text-gray-600 italic">Source Publications</label>
                  <div className="grid grid-cols-2 gap-4">
                    {AVAILABLE_SOURCES.filter(source => source.lang === lang).map((source) => (
                      <button
                        key={source.id}
                        onClick={() => toggleSource(source.id)}
                        className={`py-3 px-4 text-left flex justify-between items-center transition-all ${selectedSources.includes(source.id) ? 'bg-black/5 text-black font-bold border-l-4 border-black font-serif' : 'border-l-4 border-transparent text-gray-500 font-serif hover:text-black'}`}
                      >
                        {source.name}
                        {selectedSources.includes(source.id) && <span className="font-serif text-lg">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-black/20">
                  <button 
                    onClick={fetchNews}
                    disabled={selectedSources.length === 0}
                    className="w-full py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-black text-white rounded-none border border-black hover:bg-gray-800 uppercase tracking-widest text-xs font-bold"
                  >
                    Print Edition →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCREEN 2: FEED --- */}
        {appState === 'feed' && (
          <div className="max-w-4xl mx-auto z-10 relative pt-12 w-full">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin h-12 w-12 border-4 border-t-transparent border-black rounded-none"></div>
                <p className="font-medium animate-pulse font-serif text-gray-600 italic">
                  Going to press...
                </p>
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-20 border-t-4 border-b-4 border-double border-black">
                <h2 className="font-black font-serif text-2xl mb-4 text-gray-800">
                   The Presses Are Currently Halted
                </h2>
                <p className="font-serif text-gray-600 italic max-w-lg mx-auto">
                   No breaking tech news could be verified from your selected sources at this time. Please check back later.
                </p>
              </div>
            ) : (
              <div className="pb-20">

                {/* GLOBAL PDF DOWNLOAD BANNER */}
                <div className="mb-12 p-6 bg-black text-[#F9F7F1] flex flex-col md:flex-row justify-between items-center border-4 border-double border-black">
                  <div>
                    <h3 className="font-black text-xl mb-1">Today's Briefing is Ready</h3>
                    <p className="text-sm font-medium text-gray-400">
                      Download the full digest as a formatted print edition.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">

                    
                    {/* PODCAST BUTTON */}
                    {isPro ? (
                      <button 
                        onClick={handlePlayPodcast}
                        disabled={podcastLoading}
                        className="px-6 py-3 bg-[#F9F7F1] text-black font-bold uppercase tracking-widest text-xs border border-[#F9F7F1] hover:bg-transparent hover:text-[#F9F7F1] transition-all disabled:opacity-50"
                      >
                        {podcastLoading ? '🎙️ Mixing...' : 
                          (podcastPlayer 
                            ? (isPlaying ? '⏸ Pause Podcast' : ' ▶ Resume Podcast') 
                            : '🎤︎︎ Play Daily Podcast'
                          )
                        }
                      </button>
                    ) : (
                      <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-transparent text-[#F9F7F1] font-bold uppercase tracking-widest text-xs border border-dashed border-[#F9F7F1] hover:bg-[#F9F7F1] hover:text-black transition-all text-center"
                      >
                        🔒 Podcast (Pro)
                      </Link>
                    )}

                    {/* PDF BUTTON */}
                    {isPro ? (
                      <button
                        onClick={handleDownloadPDF}
                        disabled={pdfLoading}
                        className="px-6 py-3 bg-[#F9F7F1] text-black font-bold uppercase tracking-widest text-xs border border-[#F9F7F1] hover:bg-transparent hover:text-[#F9F7F1] transition-all disabled:opacity-50"
                      >
                        {pdfLoading
                          ? "⏱ Formatting Press..."
                          : "🗎 Download PDF Edition"}
                      </button>
                    ) : (
                      <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-transparent text-[#F9F7F1] font-bold uppercase tracking-widest text-xs border border-dashed border-[#F9F7F1] hover:bg-[#F9F7F1] hover:text-black transition-all"
                      >
                        🔒 Upgrade to Download
                      </Link>
                    )}
                  </div>
                </div>

                {/* THE NEWS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {news.slice(0, visibleCount).map((item: any) => {
                    const displayHeadline = translatedCards[item.id]?.headline || item.translated_headline;
                    const displaySummary = translatedCards[item.id]?.summary || item.summary;
                    const currentLang = translatedCards[item.id]?.lang || lang;
                    const isTranslating = translatedCards[item.id]?.loading;

                    return (
                      <div key={item.id} className="transition-all bg-transparent border-b-2 border-black/20 pb-8 rounded-none shadow-none">
                        <div className="flex flex-col items-start mb-6">
                          <span className="px-3 mb-3 bg-transparent text-black border-black border-y-2 uppercase font-bold tracking-widest rounded-none text-[10px] py-1">
                            {item.source}
                          </span>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                            <h2 className={`leading-tight font-black font-serif tracking-tight text-black ${isTranslating ? 'opacity-50' : 'opacity-100'} text-2xl md:text-3xl`}>
                              {displayHeadline}
                            </h2>
                          </a>
                        </div>
                        
                        <div className="relative bg-transparent border-l-4 border-black pl-4">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-black">
                              <span className="w-2 h-2 animate-pulse bg-black rounded-none"></span>
                              Executive Summary
                            </p>
                            <button 
                              onClick={() => handleTranslateCard(item.id, displayHeadline, displaySummary, currentLang)}
                              disabled={isTranslating}
                              className="text-xs transition-colors disabled:opacity-50 font-bold uppercase tracking-widest text-gray-500 hover:text-black"
                            >
                              {isTranslating ? '⏱ Translating...' : '⇆ Translate'}
                            </button>
                          </div>

                          <div className={`whitespace-pre-line leading-relaxed text-base text-gray-800 font-serif ${isTranslating ? 'opacity-50' : 'opacity-100'}`}>
                            {displaySummary}
                          </div>
                        
                          {/* ACTION BUTTONS */}
                          <div className="flex gap-3 mt-6 pt-4 border-t-2 border-black/10">
                            <button 
                              onClick={() => readAloud(item.id, displaySummary, currentLang)}
                              disabled={isTranslating}
                              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${playingId === item.id ? 'bg-black text-white border border-black' : 'bg-transparent text-black border border-black hover:bg-gray-100 uppercase tracking-widest'}`}
                            >
                              {playingId === item.id ? '⏹ Stop' : '▶ Listen'}
                            </button>
                          
                            {/* SCRIPT BUTTON */}
                            {isPro ? (
                              <button 
                                onClick={() => handleGenerateScript(item.id, displayHeadline, displaySummary)}
                                disabled={scripts[item.id]?.loading}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 bg-black text-[#F9F7F1] border border-black hover:bg-transparent hover:text-black uppercase tracking-widest"
                              >
                                {scripts[item.id]?.loading ? '⏱ Drafting...' : (scripts[item.id]?.visible ? '🖋 Hide Script' : '🖋 Script It')}
                              </button>
                            ) : (
                              <Link 
                                href="/dashboard" 
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all bg-transparent text-gray-500 border border-dashed border-gray-500 hover:bg-black hover:border-black hover:text-[#F9F7F1] uppercase tracking-widest"
                              >
                                🔒 Script It (Pro)
                              </Link>
                            )}
                          </div>

                          {scripts[item.id]?.visible && !scripts[item.id].loading && (
                            <div className="mt-6 p-5 bg-black/5 border-2 border-black border-dashed rounded-none relative">
                              <p className="absolute -top-3 left-4 bg-[#F9F7F1] px-2 text-[10px] font-black uppercase tracking-widest text-black">
                                Director's Notes (Teleprompter)
                              </p>
                              <div className="whitespace-pre-line text-sm font-mono text-gray-900 leading-relaxed mt-2">
                                {scripts[item.id].text}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {visibleCount < news.length && (
                  <div className="flex justify-center pt-16 mt-8">
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 10)}
                      className="px-8 py-4 bg-transparent text-black border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase tracking-widest text-sm rounded-none"
                    >
                      Load More Editions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- FOOTER --- */}
        <footer className="max-w-4xl mx-auto w-full border-t-4 border-black/20 mt-auto relative z-10 pt-8 pb-12">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <p>© 2026 All Tech Daily.</p>
            <Link href="/" className="hover:text-black transition-colors">Return to Frontpage</Link>
          </div>
        </footer>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .paper-grain::before {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          opacity: 0.35;
          z-index: 0;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}} />
    </>
  );
}