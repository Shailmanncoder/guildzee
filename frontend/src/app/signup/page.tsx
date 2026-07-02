'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function SignupPage() {
  const { token, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hasLocalToken = typeof window !== 'undefined' && localStorage.getItem('token');
    if (!authLoading && (token || hasLocalToken)) {
      router.push('/dashboard');
    }
  }, [token, authLoading]);

  if (authLoading || token) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#0D0E11', color: '#fff', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(102,126,234,.15)', borderTopColor: '#667eea', animation: 'spin .8s linear infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4E5462', letterSpacing: '.08em' }}>VERIFYING SESSION…</span>
        </div>
      </div>
    );
  }

  const pwStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const strength = pwStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#F23F42', '#F0B232', '#667eea', '#23D18B'][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (strength < 2) { setError('Please use a stronger password'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`${BE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, displayName, password }),
      });
      const d = await r.json();
      if (r.ok) {
        setSuccess(true);
        try {
          const loginRes = await fetch(`${BE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrUsername: email, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            setTimeout(() => {
              login(loginData.token, loginData.user);
            }, 1500);
            return;
          }
        } catch { }
        setTimeout(() => router.push('/login'), 2500);
      }
      else setError(d.error || 'Registration failed');
    } catch { setError('Connection error. Is the server running?'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0D0E11', fontFamily: "'Inter',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        ::selection{background:rgba(102,126,234,.4);color:#fff}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes checkPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
        .orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
        .inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);outline:none;color:#E3E5E8;font-size:15px;transition:border-color .2s,box-shadow .2s;width:100%;height:48px;padding:0 16px;border-radius:12px}
        .inp:focus{border-color:rgba(102,126,234,.6);box-shadow:0 0 0 4px rgba(102,126,234,.12)}
        .inp::placeholder{color:#4E5462}
      `}</style>

      {/* Background orbs */}
      <div className="orb" style={{ width: 500, height: 500, background: 'rgba(102,126,234,.1)', top: -100, right: -100, animation: 'float 8s ease infinite' }} />
      <div className="orb" style={{ width: 350, height: 350, background: 'rgba(240,147,251,.08)', bottom: -60, left: -60, animation: 'float 11s ease infinite reverse' }} />
      <div className="orb" style={{ width: 200, height: 200, background: 'rgba(35,209,139,.07)', top: '30%', left: '10%', animation: 'float 9s ease infinite' }} />

      <div className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(19,20,26,.96)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(20px)', animation: 'fadeUp .4s ease' }}>

        {/* Top gradient bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb,#23D18B)' }} />

        <div className="p-8">
          {success ? (
            /* Success screen */
            <div className="flex flex-col items-center py-8 gap-5" style={{ animation: 'fadeUp .3s ease' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: 'rgba(35,209,139,.15)', border: '2px solid #23D18B', animation: 'checkPop .4s cubic-bezier(.34,1.56,.64,1)' }}>✓</div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-2">Account Created! 🎉</h2>
                <p className="text-[14px]" style={{ color: '#4E5462' }}>Logging you in…</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white mb-4 shadow-xl"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 8px 32px rgba(102,126,234,.4)' }}>G</div>
                <h1 className="text-2xl font-black text-white">Create an account</h1>
                <p className="text-[14px] mt-1" style={{ color: '#4E5462' }}>Join Guildzee today</p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2].map(s => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all"
                        style={{ background: step >= s ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,.06)', color: step >= s ? '#fff' : '#4E5462' }}>
                        {step > s ? '✓' : s}
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: step >= s ? '#9AA2B1' : '#4E5462' }}>
                        {s === 1 ? 'Account' : 'Security'}
                      </span>
                    </div>
                    {s < 2 && <div className="flex-1 h-px" style={{ background: step > 1 ? 'rgba(102,126,234,.5)' : 'rgba(255,255,255,.08)' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-[13px] font-semibold" style={{ background: 'rgba(242,63,66,.1)', border: '1px solid rgba(242,63,66,.2)', color: '#F23F42' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <div className="space-y-4" style={{ animation: 'fadeUp .25s ease' }}>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="inp" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Display Name</label>
                      <input value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="Your name" className="inp" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold" style={{ color: '#4E5462' }}>@</span>
                        <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required placeholder="cooluser" className="inp" style={{ paddingLeft: 28 }} />
                      </div>
                      <p className="text-[11px] mt-1.5" style={{ color: '#4E5462' }}>Lowercase letters, numbers, and underscores only.</p>
                    </div>
                    <button type="button" onClick={() => { if (!email || !displayName || !username) { setError('Please fill all fields'); return; } setError(''); setStep(2); }}
                      className="w-full h-12 rounded-xl font-bold text-[15px] text-white transition hover:opacity-90 active:scale-[.98] mt-2"
                      style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 6px 24px rgba(102,126,234,.3)' }}>
                      Continue →
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4" style={{ animation: 'fadeUp .25s ease' }}>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Create a strong password" className="inp" style={{ paddingRight: 48 }} />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 transition hover:opacity-80" style={{ color: '#4E5462' }}>{showPw ? '🙈' : '👁️'}</button>
                      </div>
                      {password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                                style={{ background: i <= strength ? strengthColor : 'rgba(255,255,255,.08)' }} />
                            ))}
                          </div>
                          {strengthLabel && <p className="text-[11px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#4E5462' }}>Confirm Password</label>
                      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat your password" className="inp" />
                      {confirm && password !== confirm && <p className="text-[11px] mt-1.5" style={{ color: '#F23F42' }}>Passwords don't match</p>}
                      {confirm && password === confirm && <p className="text-[11px] mt-1.5" style={{ color: '#23D18B' }}>✓ Passwords match</p>}
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: '#4E5462' }}>
                      By creating an account, you agree to our <span className="font-semibold" style={{ color: '#667eea' }}>Terms of Service</span> and <span className="font-semibold" style={{ color: '#667eea' }}>Privacy Policy</span>.
                    </p>
                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl font-bold text-[15px] text-white transition hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,.1)' }}>← Back</button>
                      <button type="submit" disabled={loading}
                        className="flex-1 h-12 rounded-xl font-bold text-[15px] text-white transition hover:opacity-90 active:scale-[.98] flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 6px 24px rgba(102,126,234,.3)' }}>
                        {loading ? <><span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" style={{ animation: 'spin .7s linear infinite' }} />Creating…</> : 'Create Account 🎉'}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <p className="text-center text-[14px] mt-6" style={{ color: '#4E5462' }}>
                Already have an account?{' '}
                <Link href="/login" className="font-bold transition hover:underline" style={{ color: '#667eea' }}>Log In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
