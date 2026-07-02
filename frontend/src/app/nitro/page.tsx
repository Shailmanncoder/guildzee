'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Check, Sparkles, Zap, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NitroPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState('');

  React.useEffect(() => {
    // Unlock body scrolling
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.width = 'auto';
    document.body.className = "bg-[#070814] text-white font-sans antialiased";
  }, []);

  const handleSubscribe = (planName: string) => {
    setSelectedPlan(planName);
    setShowCheckout(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070814] text-white font-sans antialiased overflow-x-hidden relative selection:bg-pink-600 selection:text-white">
      <style>{`
        body {
          background-color: #070814 !important;
          color: white !important;
        }
      `}</style>
      
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 blur-[130px] rounded-full pointer-events-none z-0" />

      {/* Floating Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-50 sticky top-0 bg-[#070814]/75 backdrop-blur-md border-b border-white/[0.04]">
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <div className="bg-gradient-to-tr from-pink-600 via-violet-600 to-[#5865F2] text-white h-9 w-9 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
            <MessageSquare className="h-5 w-5 fill-current" />
          </div>
          <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-white via-pink-200 to-violet-300 bg-clip-text text-transparent">
            guildzee nitro
          </span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </header>

      {/* Hero Banner Section */}
      <section className="relative w-full pt-16 pb-20 px-6 text-center z-10 flex flex-col items-center select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-semibold text-pink-300 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
          <span>Supercharge your chat experience</span>
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl text-white tracking-tighter leading-[0.95] uppercase max-w-4xl">
          Unleash More Fun <br />
          <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            with Guildzee Nitro
          </span>
        </h1>
        <p className="mt-8 text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
          Get custom emojis, upload massive files, stream in high-definition video, and customize your profile card with interactive badge themes.
        </p>

        {/* Plan Billing Cycle Toggle */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wider ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 rounded-full bg-white/10 hover:bg-white/20 p-1 transition-all duration-300 flex items-center relative border border-white/5"
          >
            <div className={`w-4 h-4 rounded-full bg-pink-500 transition-all duration-300 transform ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
            Yearly
            <span className="bg-pink-500/20 text-pink-300 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Save 16%</span>
          </span>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24 z-10 relative grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Tier 1: Nitro Basic */}
        <div className="bg-[#111322]/80 border border-white/[0.05] hover:border-pink-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nitro Basic</span>
              <span className="text-pink-400 text-xs bg-pink-500/10 px-2 py-0.5 rounded-full font-bold">Standard</span>
            </div>
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black">${billingCycle === 'monthly' ? '2.99' : '29.99'}</span>
              <span className="text-xs text-gray-500">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <div className="h-px bg-white/[0.05] my-6" />
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Use custom emojis anywhere</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Upload files up to 50MB</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Nitro profile badge indicator</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => handleSubscribe('Nitro Basic')}
            className="w-full mt-8 bg-white/5 hover:bg-white/10 text-white py-3 rounded-full text-xs font-bold transition duration-300 border border-white/5"
          >
            Subscribe Now
          </button>
        </div>

        {/* Tier 2: Nitro Classic */}
        <div className="bg-[#111322]/80 border border-pink-500/50 hover:border-pink-500 rounded-3xl p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.02] relative">
          <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
            Most Popular
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nitro Classic</span>
              <span className="text-violet-400 text-xs bg-violet-500/10 px-2 py-0.5 rounded-full font-bold">Premium</span>
            </div>
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black">${billingCycle === 'monthly' ? '4.99' : '49.99'}</span>
              <span className="text-xs text-gray-500">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <div className="h-px bg-white/[0.05] my-6" />
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Everything in Nitro Basic</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Upload files up to 100MB</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Stream 1080p screen shares</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Custom profile card banner colors</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => handleSubscribe('Nitro Classic')}
            className="w-full mt-8 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white py-3 rounded-full text-xs font-bold transition duration-300 shadow-md shadow-pink-500/25 hover:shadow-pink-500/35"
          >
            Subscribe Now
          </button>
        </div>

        {/* Tier 3: Nitro Premium */}
        <div className="bg-[#111322]/80 border border-white/[0.05] hover:border-pink-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nitro Premium</span>
              <span className="text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded-full font-bold">Collector</span>
            </div>
            <div className="flex items-baseline gap-1 my-6">
              <span className="text-4xl font-black">${billingCycle === 'monthly' ? '9.99' : '99.99'}</span>
              <span className="text-xs text-gray-500">/ {billingCycle === 'monthly' ? 'month' : 'year'}</span>
            </div>
            <div className="h-px bg-white/[0.05] my-6" />
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Everything in Nitro Classic</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>2 Free Server Boosts monthly</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Animated profile avatars</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Custom user theme templates</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => handleSubscribe('Nitro Premium')}
            className="w-full mt-8 bg-white/5 hover:bg-white/10 text-white py-3 rounded-full text-xs font-bold transition duration-300 border border-white/5"
          >
            Subscribe Now
          </button>
        </div>

      </section>

      {/* Interactive Mock Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111322] border border-white/10 p-7 rounded-3xl max-w-sm w-full shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400 mx-auto mb-4 animate-bounce">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-display font-black text-xl mb-2 text-white">Subscribe to {selectedPlan}</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              You are about to subscribe to the {billingCycle} cycle of {selectedPlan}. This is a demonstration billing module.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCheckout(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-full transition duration-300 border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert('Thank you for subscribing to Guildzee Nitro! (Simulation completed)');
                  setShowCheckout(false);
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold py-3 rounded-full transition duration-300 hover:opacity-90 shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#05060A] text-white py-12 px-6 mt-auto relative z-10 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-6">
          <div className="flex items-center gap-2 select-none">
            <div className="bg-gradient-to-tr from-pink-600 to-violet-600 h-7 w-7 rounded-lg flex items-center justify-center text-white">
              <MessageSquare className="h-4 w-4 fill-current" />
            </div>
            <span className="font-display font-black text-sm text-white tracking-tight">guildzee</span>
          </div>
          <span>© 2026 Guildzee. All rights reserved. Built using React & Next.js.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
