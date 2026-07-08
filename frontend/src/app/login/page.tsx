'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBackendUrl } from '../../lib/backend';

export default function LoginPage() {
  const { login, token, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(102,126,234,${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(102,126,234,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && token) {
      setRedirecting(true);
      router.push('/dashboard');
    }
  }, [token, loading]);

  if (redirecting) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#070910' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, animation: 'pulse 1s ease infinite', boxShadow: '0 0 40px rgba(102,126,234,.5)' }}>G</div>
          <div style={{ fontSize: 13, color: '#667eea', fontWeight: 700, letterSpacing: '.1em' }}>LAUNCHING GUILDZEE…</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSubmit(true);
    setError('');
    const BE = getBackendUrl();
    try {
      const res = await fetch(`${BE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
      setRedirecting(true);
      login(data.token || data.accessToken, data.user);

    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
      setLoadingSubmit(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070910', fontFamily: "'Inter',sans-serif", position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes orbPulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.15);opacity:.9}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 0 0 rgba(102,126,234,.3)}50%{box-shadow:0 0 0 4px rgba(102,126,234,.1)}}
        .inp{width:100%;height:52px;padding:0 16px;border-radius:14px;border:1.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#E3E5E8;font-size:15px;font-family:inherit;outline:none;transition:all .25s}
        .inp:focus{border-color:rgba(102,126,234,.7);background:rgba(102,126,234,.06);box-shadow:0 0 0 4px rgba(102,126,234,.12)}
        .inp::placeholder{color:#3A3F52}
        .inp:hover:not(:focus){border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.06)}
        .btn-submit{width:100%;height:52px;border:none;border-radius:14px;cursor:pointer;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);background-size:200%;transition:all .3s;letter-spacing:.02em}
        .btn-submit:hover:not(:disabled){background-position:right center;transform:translateY(-1px);box-shadow:0 8px 32px rgba(102,126,234,.45)}
        .btn-submit:active:not(:disabled){transform:translateY(0);box-shadow:0 4px 16px rgba(102,126,234,.3)}
        .btn-submit:disabled{opacity:.7;cursor:not-allowed}
        .card{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both}
        .g-logo{animation:float 4s ease infinite}
        .label{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;color:#4A5168;margin-bottom:10px;text-transform:uppercase}
      `}</style>

      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Glowing orbs */}
      <div style={{ position: 'fixed', top: '-20vh', left: '-15vw', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(102,126,234,.18) 0%,transparent 70%)', animation: 'orbPulse 8s ease infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20vh', right: '-15vw', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(118,75,162,.15) 0%,transparent 70%)', animation: 'orbPulse 10s ease infinite .5s', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '35%', right: '5%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(240,147,251,.08) 0%,transparent 70%)', animation: 'orbPulse 7s ease infinite 1s', pointerEvents: 'none', zIndex: 0 }} />

      {/* Card */}
      <div className="card" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, margin: '0 16px', background: 'rgba(13,14,17,.85)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 28, border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)' }}>
        {/* Rainbow top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb,#f5576c,#667eea)', backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

        <div style={{ padding: '40px 40px 44px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
            <div className="g-logo" style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 20, boxShadow: '0 12px 40px rgba(102,126,234,.5), inset 0 1px 0 rgba(255,255,255,.2)' }}>G</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>Welcome back</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#4A5168', fontWeight: 500 }}>So excited to see you again! 🎉</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(242,63,66,.1)', border: '1px solid rgba(242,63,66,.2)', color: '#F23F42', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="label">Email or Username</label>
              <input className="inp" type="text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="username" />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#667eea', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}>Forgot password?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input className="inp" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your secret password" autoComplete="current-password" style={{ paddingRight: 52 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#4A5168', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#667eea')} onMouseLeave={e => (e.currentTarget.style.color = '#4A5168')}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loadingSubmit} style={{ marginTop: 8 }}>
              {loadingSubmit ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Signing in…
                </span>
              ) : '🚀 Log In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#4A5168' }}>
            Need an account?{' '}
            <Link href="/signup" style={{ color: '#667eea', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              Register for free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
