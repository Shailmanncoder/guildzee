'use client';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
      login(data.token, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0D0E11', fontFamily: "'Inter',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        ::selection{background:rgba(102,126,234,.4);color:#fff}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-20px) rotate(3deg)}}
        @keyframes floatB{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(-2deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
        .inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);outline:none;color:#E3E5E8;font-size:15px;transition:border-color .2s,box-shadow .2s}
        .inp:focus{border-color:rgba(102,126,234,.6);box-shadow:0 0 0 4px rgba(102,126,234,.12)}
        .inp::placeholder{color:#4E5462}
      `}</style>

      {/* Background orbs */}
      <div className="orb" style={{ width: 500, height: 500, background: 'rgba(102,126,234,.12)', top: -100, left: -100, animation: 'float 8s ease infinite' }} />
      <div className="orb" style={{ width: 400, height: 400, background: 'rgba(118,75,162,.1)', bottom: -80, right: -80, animation: 'floatB 10s ease infinite' }} />
      <div className="orb" style={{ width: 200, height: 200, background: 'rgba(35,209,139,.06)', top: '40%', right: '15%', animation: 'float 12s ease infinite' }} />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(19,20,26,.95)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(20px)', animation: 'fadeUp .4s ease' }}>

        {/* Top gradient bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb)' }} />

        <div className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-4 shadow-xl"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 8px 32px rgba(102,126,234,.4)' }}>G</div>
            <h1 className="text-2xl font-black text-white">Welcome back</h1>
            <p className="text-[14px] mt-1" style={{ color: '#4E5462' }}>We're so excited to see you again!</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-[13px] font-semibold" style={{ background: 'rgba(242,63,66,.12)', border: '1px solid rgba(242,63,66,.25)', color: '#F23F42' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="inp w-full h-12 px-4 rounded-xl font-medium" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Your password"
                  className="inp w-full h-12 px-4 pr-12 rounded-xl font-medium" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lg transition hover:opacity-80"
                  style={{ color: '#4E5462' }}>{showPw ? '🙈' : '👁️'}</button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-[13px] font-semibold transition hover:opacity-80" style={{ color: '#667eea' }}>Forgot password?</button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-[15px] text-white transition hover:opacity-90 active:scale-[.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 6px 24px rgba(102,126,234,.35)', marginTop: 24 }}>
              {loading ? (
                <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'spin .7s linear infinite' }} />Signing in…</>
              ) : 'Log In'}
            </button>
          </form>

          <p className="text-center text-[14px] mt-6" style={{ color: '#4E5462' }}>
            Need an account?{' '}
            <Link href="/signup" className="font-bold transition hover:underline" style={{ color: '#667eea' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
