'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBackendUrl } from '../../lib/backend';

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
    const particles: any[] = [];
    for (let i = 0; i < 70; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 2 + .5, alpha: Math.random() * .45 + .1 });
    }
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(118,75,162,${p.alpha})`; ctx.fill();
      });
      particles.forEach((a, i) => particles.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(118,75,162,${.1 * (1 - d / 110)})`; ctx.lineWidth = .5; ctx.stroke(); }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    if (!authLoading && token) { setRedirecting(true); router.push('/dashboard'); }
  }, [token, authLoading]);

  if (redirecting) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#070910' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', animation: 'pulse 1s ease infinite', boxShadow: '0 0 40px rgba(118,75,162,.6)' }}>G</div>
          <div style={{ fontSize: 13, color: '#764ba2', fontWeight: 700, letterSpacing: '.1em', fontFamily: 'Inter,sans-serif' }}>SETTING UP YOUR GUILD…</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
      </div>
    );
  }

  const pwStrength = () => { let s = 0; if (password.length >= 8) s++; if (/[A-Z]/.test(password)) s++; if (/[0-9]/.test(password)) s++; if (/[^A-Za-z0-9]/.test(password)) s++; return s; };
  const strength = pwStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#F23F42', '#F0B232', '#667eea', '#23D18B'][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (strength < 2) { setError('Please use a stronger password'); return; }
    setLoading(true); setError('');
    const BE = getBackendUrl();
    try {
      const r = await fetch(`${BE}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username, displayName, password }) });
      const d = await r.json();
      if (r.ok) {
        setSuccess(true);
        setRedirecting(true);
        // Login immediately with the token returned by the register endpoint
        const tokenVal = d.token || d.accessToken;
        if (tokenVal && d.user) {
          login(tokenVal, d.user);
        } else {
          // If for some reason token is not returned, redirect to login page
          setTimeout(() => router.push('/login'), 1500);
        }
      } else setError(d.error || 'Registration failed');
    } catch { setError('Connection error. Please try again.'); }
    finally { setLoading(false); }
  }

  const STEPS = ['Account', 'Profile', 'Password'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA', fontFamily: "'Inter',sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes orbPulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.12);opacity:.75}}
        @keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
        .s-inp{width:100%;height:52px;padding:0 16px;border-radius:14px;border:1.5px solid rgba(0,0,0,.08);background:rgba(0,0,0,.03);color:#1B1E2B;font-size:15px;font-family:inherit;outline:none;transition:all .25s}
        .s-inp:focus{border-color:rgba(118,75,162,.7);background:rgba(118,75,162,.04);box-shadow:0 0 0 4px rgba(118,75,162,.08)}
        .s-inp::placeholder{color:#8C95AD}
        .s-inp:hover:not(:focus){border-color:rgba(0,0,0,.15);background:rgba(0,0,0,.05)}
        .s-btn{width:100%;height:52px;border:none;border-radius:14px;cursor:pointer;font-size:16px;font-weight:800;font-family:inherit;color:#fff;background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);background-size:200%;transition:all .3s}
        .s-btn:hover:not(:disabled){background-position:right;transform:translateY(-1px);box-shadow:0 8px 32px rgba(118,75,162,.25)}
        .s-btn:disabled{opacity:.7;cursor:not-allowed}
        .s-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;color:#5A6178;margin-bottom:10px;text-transform:uppercase}
        .step-slide{animation:slideIn .35s cubic-bezier(.16,1,.3,1) both}
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '-25vh', right: '-10vw', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(118,75,162,.1) 0%,transparent 70%)', animation: 'orbPulse 9s ease infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20vh', left: '-10vw', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(102,126,234,.1) 0%,transparent 70%)', animation: 'orbPulse 11s ease infinite .8s', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, margin: '16px', background: 'rgba(255,255,255,.75)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 28, border: '1px solid rgba(0,0,0,.08)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.5)', animation: 'fadeUp .5s cubic-bezier(.16,1,.3,1) both' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,#f093fb,#764ba2,#667eea,#764ba2,#f093fb)', backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

        <div style={{ padding: '40px 40px 44px' }}>
          {/* Logo + title */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 18, boxShadow: '0 12px 40px rgba(118,75,162,.3), inset 0 1px 0 rgba(255,255,255,.2)', animation: 'float 4s ease infinite' }}>G</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#1B1E2B', letterSpacing: '-.02em' }}>Create your account</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#5A6178' }}>Join the Guildzee community ✨</p>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: i + 1 <= step ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(0,0,0,.04)', border: i + 1 === step ? '2px solid #764ba2' : '2px solid rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: i + 1 <= step ? '#fff' : '#8C95AD', transition: 'all .3s', boxShadow: i + 1 === step ? '0 0 16px rgba(118,75,162,.25)' : 'none' }}>
                    {i + 1 < step ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: i + 1 === step ? '#764ba2' : '#8C95AD', marginTop: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ height: 2, flex: 1, background: i + 1 < step ? 'linear-gradient(90deg,#667eea,#764ba2)' : 'rgba(0,0,0,.06)', borderRadius: 1, marginBottom: 18, transition: 'background .4s' }} />}
              </React.Fragment>
            ))}
          </div>

          {error && <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(242,63,66,.1)', border: '1px solid rgba(242,63,66,.2)', color: '#F23F42', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#23D18B', marginBottom: 8 }}>Welcome to Guildzee!</div>
              <div style={{ fontSize: 14, color: '#5A6178' }}>Taking you to your dashboard…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="step-slide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="s-lbl">Email address</label>
                    <input className="s-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                  </div>
                  <button type="button" className="s-btn" onClick={() => { if (!email) { setError('Please enter your email'); return; } setError(''); setStep(2); }}>Continue →</button>
                </div>
              )}
              {step === 2 && (
                <div className="step-slide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="s-lbl">Username</label>
                    <input className="s-inp" type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))} required placeholder="cooluser123" pattern="[a-z0-9_]{3,20}" title="3-20 lowercase letters, numbers, underscores" />
                    <div style={{ fontSize: 11, color: '#5A6178', marginTop: 6 }}>Lowercase letters, numbers, underscores only</div>
                  </div>
                  <div>
                    <label className="s-lbl">Display Name</label>
                    <input className="s-inp" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="Cool User" maxLength={32} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={() => setStep(1)} style={{ flex: 1, height: 52, border: '1.5px solid rgba(0,0,0,.08)', borderRadius: 14, background: 'rgba(255,255,255,.8)', color: '#5A6178', cursor: 'pointer', fontWeight: 700, fontSize: 15, fontFamily: 'inherit', transition: 'all .2s' }}>← Back</button>
                    <button type="button" className="s-btn" style={{ flex: 2 }} onClick={() => { if (!username || !displayName) { setError('Fill all fields'); return; } setError(''); setStep(3); }}>Continue →</button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="step-slide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="s-lbl">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="s-inp" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Make it strong 💪" style={{ paddingRight: 52 }} />
                      <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#4A5168' }}>{showPw ? '🙈' : '👁️'}</button>
                    </div>
                    {password && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColor : 'rgba(0,0,0,.06)', transition: 'background .3s' }} />)}
                        </div>
                        <div style={{ fontSize: 11, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="s-lbl">Confirm Password</label>
                    <input className="s-inp" type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat your password" style={{ borderColor: confirm && confirm !== password ? 'rgba(242,63,66,.5)' : undefined }} />
                    {confirm && confirm !== password && <div style={{ fontSize: 11, color: '#F23F42', marginTop: 6, fontWeight: 600 }}>Passwords don't match</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="button" onClick={() => setStep(2)} style={{ flex: 1, height: 52, border: '1.5px solid rgba(0,0,0,.08)', borderRadius: 14, background: 'rgba(255,255,255,.8)', color: '#5A6178', cursor: 'pointer', fontWeight: 700, fontSize: 15, fontFamily: 'inherit' }}>← Back</button>
                    <button type="submit" className="s-btn" disabled={loading} style={{ flex: 2 }}>
                      {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Creating…</span> : '🚀 Create Account'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#5A6178' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#764ba2', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
