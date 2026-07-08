'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../lib/backend';

function CallTileVideo({ name, color, active, index }: { name: string; color: string; active: boolean; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let width = canvas.width = 300;
    let height = canvas.height = 200;
    let time = 0;

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0d1020');
      bgGrad.addColorStop(1, '#070910');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      time += 0.035;

      if (index === 0) {
        // Nova: Planetary wireframe orb
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Glow effect
        const rad = 45 + Math.sin(time * 2) * 3;
        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, rad + 15);
        glow.addColorStop(0, color);
        glow.addColorStop(0.3, 'rgba(124, 92, 255, 0.45)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, rad + 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();

        // Horizontal line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 0, rad, rad * 0.35, Math.sin(time) * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Vertical line
        ctx.beginPath();
        ctx.ellipse(0, 0, rad * 0.35, rad, Math.cos(time) * 0.2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      } else if (index === 1) {
        // Kade: Audio equalizer wave bars
        const bars = 20;
        const gap = 3;
        const w = (width - (bars - 1) * gap) / bars;
        ctx.fillStyle = color;
        for (let i = 0; i < bars; i++) {
          const amp = active ? 55 : 12;
          const h = 25 + Math.sin(i * 0.6 + time * 3.5) * amp + Math.cos(i * 0.3 + time * 1.5) * (amp * 0.3);
          const y = height - h - 20;
          ctx.beginPath();
          ctx.roundRect(i * (w + gap), y, w, h, 3);
          ctx.fill();
        }
      } else if (index === 2) {
        // Piper: Orbital cyber dots and lines
        const count = 10;
        const pts: { x: number; y: number }[] = [];
        ctx.fillStyle = color;
        for (let i = 0; i < count; i++) {
          const px = (width / 2) + Math.cos(time * 0.8 + i * (Math.PI * 2 / count)) * 55;
          const py = (height / 2) + Math.sin(time * 1.1 + i * (Math.PI * 2 / count)) * 40;
          pts.push({ x: px, y: py });
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255, 176, 32, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            if (dist < 85) {
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[j].x, pts[j].y);
            }
          }
        }
        ctx.stroke();
      } else {
        // Rex: Wave layers (ambient flow)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.globalAlpha = 0.15 + j * 0.25;
          for (let x = 0; x < width; x += 3) {
            const y = (height / 2) + Math.sin(x * 0.012 + time * 1.5 + j) * 18 + Math.cos(x * 0.007 - time * 0.9) * 12;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }

      // Border glow
      if (active) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, width, height);
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = Math.floor(entry.contentRect.width);
        height = canvas.height = Math.floor(entry.contentRect.height);
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [color, active, index]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

export default function GuildzeeLandingPage() {
  const { token, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(0);
  const [captionName, setCaptionName] = useState('Nova');
  const [captionText, setCaptionText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setDownloadUrl(`${getBackendUrl()}/api/download-apk`);
  }, []);


  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'auto';
    document.body.style.background = '#070910';
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mounted]);

  // Parallax + particles
  useEffect(() => {
    if (!mounted) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf: number;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const stage = stageRef.current;
    if (stage && !reduceMotion) {
      const onMove = (e: MouseEvent) => {
        const r = stage.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      stage.addEventListener('mousemove', onMove);
      const loop = () => {
        cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
        if (glowRef.current) glowRef.current.style.transform = `translate(calc(-50% + ${cx * 22}px), calc(-50% + ${cy * 18}px))`;
        document.querySelectorAll<HTMLElement>('.float-window').forEach((el, i) => {
          const d = 8 + i * 5;
          el.style.transform = `translate(${cx * d}px,${cy * d}px)`;
        });
        raf = requestAnimationFrame(loop);
      };
      loop();
      return () => { stage.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
    }
  }, [mounted]);

  // Canvas particles
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let praf: number;
    const resize = () => { const r = stage.getBoundingClientRect(); canvas.width = r.width; canvas.height = r.height; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * (canvas.width || 600),
      y: Math.random() * (canvas.height || 500),
      r: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.5 + 0.1,
      alpha: Math.random() * 0.6 + 0.1,
      hue: Math.random() > 0.5 ? '124,92,255' : '53,231,210',
    }));
    const tick = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},${p.alpha})`; ctx.fill();
      });
      praf = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(praf); };
  }, [mounted]);

  // Caption loop
  useEffect(() => {
    if (!mounted) return;
    const lines = [
      { name: 'Nova', text: 'okay so if we ship this Friday...' },
      { name: 'Kade', text: 'agreed, I\'ll handle the release notes' },
      { name: 'Piper', text: 'captions are looking solid btw 👍' },
      { name: 'Rex', text: 'voice quality is insane on mobile!' },
    ];
    let idx = 0; let tt: NodeJS.Timeout; let lt: NodeJS.Timeout;
    const run = () => {
      const line = lines[idx % lines.length];
      setCaptionName(line.name); setActiveSpeakerIdx(idx % 4);
      setCaptionText(''); let c = 0;
      const type = () => { if (c <= line.text.length) { setCaptionText(line.text.slice(0, c)); c++; tt = setTimeout(type, 30); } };
      type(); idx++; lt = setTimeout(run, 3800);
    };
    run();
    return () => { clearTimeout(tt); clearTimeout(lt); };
  }, [mounted]);

  // Fake chat bubbles
  useEffect(() => {
    if (!mounted) return;
    const scripts: Record<string, string[]> = {
      fwMsgs1: ['anyone up for a match?', 'I\'m in, 5 min', 'queuing now 🎮'],
      fwMsgs2: ['pushed the new build 🚀', 'pulling it now', 'looks clean!'],
      fwMsgs3: ['voice room is live', 'omw ⚡', 'grab me a seat 😄'],
    };
    const timers: NodeJS.Timeout[] = [];
    Object.entries(scripts).forEach(([id, lines]) => {
      const el = document.getElementById(id);
      if (!el) return;
      let i = 0;
      const showNext = () => {
        const typing = document.createElement('div');
        typing.className = 'fw-bubble';
        typing.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
        el.appendChild(typing);
        while (el.children.length > 3) el.removeChild(el.firstChild!);
        const t1 = setTimeout(() => {
          typing.remove();
          const b = document.createElement('div');
          b.className = 'fw-bubble';
          b.textContent = lines[i % lines.length]; i++;
          el.appendChild(b);
          while (el.children.length > 3) el.removeChild(el.firstChild!);
          const t2 = setTimeout(showNext, 2500 + Math.random() * 1200);
          timers.push(t2);
        }, 900 + Math.random() * 500);
        timers.push(t1);
      };
      const t0 = setTimeout(showNext, Math.random() * 800);
      timers.push(t0);
    });
    return () => timers.forEach(clearTimeout);
  }, [mounted]);

  // Scroll reveal
  useEffect(() => {
    if (!mounted) return;
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('revealed'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [mounted]);

  if (loading) return <div style={{ minHeight: '100vh', background: '#070910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (!mounted) return <div style={{ minHeight: '100vh', background: '#070910' }} />;

  return (
    <div style={{ minHeight: '100vh', background: '#070910', color: '#E8EAF2', fontFamily: "'Inter',sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(124,92,255,.3);border-radius:3px}
        ::selection{background:rgba(124,92,255,.4);color:#fff}
        :root{
          --brand:#7C5CFF;--teal:#35E7D2;--warn:#FFB020;--danger:#FF5C6C;--success:#3DDC84;
          --bg0:#070910;--bg1:#0D1020;--bg2:#141728;--bg3:#1C2035;
          --border:rgba(255,255,255,.07);--text1:#F0F2FF;--text2:#8B92AD;--text3:#4A5168;
          --grad:linear-gradient(135deg,#7C5CFF,#35E7D2);
          --ease:cubic-bezier(.16,1,.3,1);
          --shadow-glow:0 0 40px rgba(124,92,255,.4);
        }

        /* Nav */
        .nav{
          position:sticky;top:0;z-index:100;height:76px;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 40px;background:transparent;
          transition:background .25s,border-color .25s,backdrop-filter .25s;
          border-bottom:1px solid transparent;
        }
        .nav.scrolled{background:rgba(13,16,32,.92);backdrop-filter:blur(16px);border-bottom-color:var(--border);}
        .nav-left{display:flex;align-items:center;gap:44px;}
        .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;color:var(--text1);text-decoration:none;letter-spacing:-.02em;}
        .logo-icon{width:36px;height:36px;border-radius:10px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;box-shadow:0 4px 18px rgba(124,92,255,.45);transition:transform .2s var(--ease);}
        .logo:hover .logo-icon{transform:rotate(8deg) scale(1.08);}
        .nav-links{display:flex;gap:32px;font-size:15px;font-weight:600;color:var(--text2);}
        .nav-links a{text-decoration:none;padding:8px 0;position:relative;transition:color .15s;}
        .nav-links a::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--grad);transform:scaleX(0);transition:transform .18s;}
        .nav-links a:hover{color:var(--text1);}
        .nav-links a:hover::after{transform:scaleX(1);}
        .nav-right{display:flex;align-items:center;gap:12px;}

        /* Buttons — big with proper spacing */
        .btn{
          display:inline-flex;align-items:center;justify-content:center;gap:10px;
          font-family:'Inter',sans-serif;font-weight:700;font-size:15px;
          padding:14px 28px;border-radius:14px;border:none;cursor:pointer;
          text-decoration:none;transition:transform .18s var(--ease),box-shadow .18s ease,background .18s ease,opacity .18s;
          white-space:nowrap;letter-spacing:-.01em;
        }
        .btn:active{transform:scale(.96)!important;}
        .btn-primary{
          background:var(--grad);color:#04030A;
          box-shadow:0 4px 18px rgba(124,92,255,.4);
        }
        .btn-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 32px rgba(124,92,255,.55);}
        .btn-secondary{
          background:rgba(255,255,255,.06);color:var(--text1);
          border:1.5px solid rgba(255,255,255,.12);
        }
        .btn-secondary:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);transform:translateY(-1px);}
        .btn-ghost{background:transparent;color:var(--text2);padding:14px 20px;font-size:15px;}
        .btn-ghost:hover{color:var(--text1);}

        /* Pill nav buttons */
        .btn-nav{padding:10px 22px;font-size:14px;border-radius:10px;}

        /* Icon buttons */
        .icon-btn{
          width:44px;height:44px;border-radius:12px;border:1px solid var(--border);
          background:rgba(255,255,255,.04);color:var(--text2);
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:background .15s,color .15s,border-color .15s;
          flex-shrink:0;
        }
        .icon-btn:hover{background:rgba(255,255,255,.09);color:var(--text1);border-color:rgba(255,255,255,.14);}

        /* Hamburger */
        .hamburger{display:none;}

        /* Hero */
        .hero{
          max-width:1300px;margin:0 auto;
          padding:100px 40px 120px;
          display:grid;grid-template-columns:1.1fr 1fr;gap:64px;align-items:center;
          min-height:680px;
        }
        .hero-copy{position:relative;z-index:2;}
        .eyebrow{
          display:inline-flex;align-items:center;gap:10px;
          font-size:13px;font-weight:700;color:var(--teal);
          background:rgba(53,231,210,.08);border:1px solid rgba(53,231,210,.2);
          padding:8px 18px;border-radius:100px;margin-bottom:28px;
          opacity:0;animation:fadeUp .55s var(--ease) .05s forwards;
        }
        .eyebrow-dot{width:7px;height:7px;border-radius:50%;background:var(--teal);animation:pulse 2s ease infinite;}
        @keyframes pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.1)}}
        .hero h1{
          font-size:64px;line-height:1.06;letter-spacing:-.03em;
          font-weight:900;color:var(--text1);margin:0 0 24px;
          opacity:0;animation:fadeUp .55s var(--ease) .12s forwards;
        }
        .hero h1 .grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;}
        .hero p.sub{
          font-size:19px;line-height:1.65;color:var(--text2);max-width:500px;
          margin:0 0 40px;opacity:0;animation:fadeUp .55s var(--ease) .2s forwards;
        }
        .hero-cta{
          display:flex;gap:16px;flex-wrap:wrap;margin-bottom:44px;
          opacity:0;animation:fadeUp .55s var(--ease) .28s forwards;
        }
        .hero-cta .btn{font-size:17px;padding:17px 36px;border-radius:16px;}
        .chip-row{
          display:flex;gap:12px;flex-wrap:wrap;
          opacity:0;animation:fadeUp .55s var(--ease) .36s forwards;
        }
        .chip{
          font-size:13px;font-weight:600;color:var(--text2);
          background:var(--bg1);border:1px solid var(--border);
          padding:10px 18px;border-radius:100px;letter-spacing:-.01em;
          transition:border-color .15s,color .15s;
        }
        .chip:hover{border-color:rgba(124,92,255,.4);color:var(--text1);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

        /* Hero Stage */
        .hero-stage{
          position:relative;height:540px;perspective:1100px;
          opacity:0;animation:fadeUp .55s var(--ease) .15s forwards;
        }
        #particle-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
        .glow-layer{
          position:absolute;width:480px;height:480px;left:50%;top:50%;
          background:radial-gradient(circle,rgba(124,92,255,.3),transparent 65%);
          transform:translate(-50%,-50%);mix-blend-mode:screen;pointer-events:none;will-change:transform;
        }
        .hall{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:360px;height:360px;will-change:transform;}
        .guild-crest{
          position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
          width:130px;height:130px;display:flex;align-items:center;justify-content:center;
          border-radius:28px;background:linear-gradient(145deg,var(--bg2),var(--bg1));
          border:1px solid rgba(124,92,255,.25);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(124,92,255,.2);
        }
        .crest-logo{font-size:56px;font-weight:900;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;}
        .orbit-ring{
          position:absolute;left:50%;top:50%;border-radius:50%;
          border:1px dashed rgba(124,92,255,.15);animation:spin linear infinite;
        }
        .ring1{width:220px;height:220px;margin:-110px 0 0 -110px;animation-duration:40s;}
        .ring2{width:300px;height:300px;margin:-150px 0 0 -150px;animation-duration:60s;animation-direction:reverse;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .orbit-dot{
          position:absolute;width:10px;height:10px;border-radius:50%;
          top:50%;left:50%;margin:-5px;transform-origin:0 0;
          animation:orbit linear infinite;box-shadow:0 0 8px rgba(124,92,255,.6);
        }
        @keyframes orbit{from{transform:rotate(0) translateX(var(--r)) rotate(0)}to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)}}
        .dot-brand{background:var(--brand);--r:110px;animation-duration:8s;}
        .dot-teal{background:var(--teal);--r:110px;animation-duration:12s;animation-delay:-4s;}
        .dot-warn{background:var(--warn);--r:150px;animation-duration:15s;}
        .dot-danger{background:var(--danger);--r:150px;animation-duration:10s;animati        /* Float Windows */
        .float-window{
          position:absolute;width:180px;
          background:rgba(13, 16, 32, 0.7);
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255, 255, 255, 0.08);
          border-radius:20px;
          box-shadow:0 24px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,0.06);
          padding:14px;will-change:transform;
          transition:box-shadow .25s var(--ease), border-color .25s;
        }
        .float-window:hover{box-shadow:0 24px 60px rgba(124,92,255,.25)!important; border-color: rgba(124,92,255,0.3);}
        .fw-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .fw-avatar{width:22px;height:22px;border-radius:50%;background:var(--grad);flex-shrink:0;}
        .fw-name{font-size:12px;font-weight:700;color:var(--text1);}
        .fw-online{width:7px;height:7px;border-radius:50%;background:var(--success);margin-left:auto;}
        .fw-msgs{display:flex;flex-direction:column;gap:6px;min-height:48px;justify-content:flex-end;}
        .fw-bubble{
          background:rgba(255, 255, 255, 0.06);
          border:1.5px solid rgba(255, 255, 255, 0.04);
          border-radius:8px 8px 8px 2px;
          padding:7px 10px;font-size:11.5px;line-height:1.4;
          color:var(--text1);max-width:95%;
          opacity:0;transform:translateY(6px) scale(.96);
          animation:bubbleIn .3s var(--ease) forwards;
        }
        @keyframes bubbleIn{to{opacity:1;transform:none}}
        .fw1{top:4%;left:0%;animation:float1 7s ease-in-out infinite;}
        .fw2{top:55%;left:68%;animation:float2 9s ease-in-out infinite 1s;}
        .fw3{top:80%;left:4%;animation:float3 6.5s ease-in-out infinite 2s;width:155px;}
        @keyframes float1{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-12px) rotate(1deg)}}
        @keyframes float2{0%,100%{transform:translateY(0) rotate(1deg)}50%{transform:translateY(-9px) rotate(-1.5deg)}}
        @keyframes float3{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-10px) rotate(1.2deg)}}
        .typing-dots{display:flex;gap:3px;padding:2px 0;}
        .typing-dots span{width:5px;height:5px;border-radius:50%;background:var(--teal);opacity:.3;animation:dot 1.2s infinite;}
        .typing-dots span:nth-child(2){animation-delay:.15s;}
        .typing-dots span:nth-child(3){animation-delay:.3s;}
        @keyframes dot{0%,60%,100%{opacity:.25}30%{opacity:1}}

        /* Sections */
        .section{max-width:1300px;margin:0 auto;padding:100px 40px;}
        .section-head{max-width:600px;margin:0 auto 64px;text-align:center;}
        .kicker{
          display:inline-block;font-size:12px;font-weight:800;letter-spacing:.1em;
          text-transform:uppercase;color:var(--teal);margin-bottom:16px;
        }
        .section-head h2{font-size:42px;font-weight:900;letter-spacing:-.02em;margin:0 0 16px;color:var(--text1);}
        .section-head p{font-size:17px;line-height:1.7;color:var(--text2);margin:0;}

        /* Reveal animations */
        .reveal{opacity:0;transform:translateY(20px);transition:opacity .55s var(--ease),transform .55s var(--ease);}
        .reveal.revealed{opacity:1;transform:none;}
        .reveal-d1{transition-delay:.06s;}
        .reveal-d2{transition-delay:.12s;}
        .reveal-d3{transition-delay:.18s;}
        .reveal-d4{transition-delay:.24s;}
        .reveal-d5{transition-delay:.30s;}

        /* Feature Cards */
        .feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;}
        .feature-card{
          background:rgba(13, 16, 32, 0.5);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(255, 255, 255, 0.05);
          border-radius:24px;
          padding:36px 32px;min-height:220px;
          transition:transform .25s var(--ease),box-shadow .25s ease,border-color .25s;
          position:relative;overflow:hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
        }
        .feature-card::before{
          content:'';position:absolute;inset:0;
          background:radial-gradient(circle at top left,rgba(124,92,255,.09),transparent 70%);
          opacity:0;transition:opacity .25s;
        }
        .feature-card:hover{transform:translateY(-6px);box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(124,92,255,.2);border-color:rgba(124,92,255,.25);}
        .feature-card:hover::before{opacity:1;}
        .feature-icon{
          width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;
          margin-bottom:20px;background:rgba(124,92,255,.12);border:1px solid rgba(124,92,255,.15);
          transition:transform .25s var(--ease),box-shadow .25s ease;font-size:24px;
        }
        .feature-card:hover .feature-icon{transform:scale(1.12) rotate(3deg);box-shadow:0 8px 24px rgba(124,92,255,.4);}
        .feature-card h3{font-size:19px;font-weight:800;margin:0 0 10px;color:var(--text1);letter-spacing:-.01em;}
        .feature-card p{font-size:15px;line-height:1.6;color:var(--text2);margin:0;}

        /* Call section */
        .call-stage{
          background:rgba(13, 16, 32, 0.45);
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255, 255, 255, 0.06);
          border-radius:28px;
          padding:24px;max-width:900px;margin:0 auto;
          box-shadow:0 32px 80px rgba(0,0,0,.5);
        }
        .call-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}
        .call-tile{
          position:relative;aspect-ratio:200/140;border-radius:20px;overflow:hidden;
          border:1.5px solid rgba(255, 255, 255, 0.05);
          display:flex;align-items:center;justify-content:center;
          transition:border-color .2s;
        }
        .tile-bg{position:absolute;inset:0;width:100%;height:100%;}
        .tile-avatar{width:48px;height:48px;position:relative;z-index:1;}
        .tile-tag{
          position:absolute;left:12px;bottom:12px;z-index:2;
          background:rgba(7,9,16,.75);backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          padding:5px 12px;border-radius:100px;font-size:12px;font-weight:700;
          display:flex;align-items:center;gap:7px;color:var(--text1);
        }
        .tile-dot{width:7px;height:7px;border-radius:50%;background:var(--success);}
        .speak-ring{
          position:absolute;inset:0;border-radius:16px;
          border:2px solid var(--teal);opacity:0;transition:opacity .2s;
        }
        .call-tile.speaking .speak-ring{opacity:1;animation:speakPulse 1.2s ease-in-out infinite;}
        @keyframes speakPulse{0%{box-shadow:0 0 0 0 rgba(53,231,210,.45)}70%{box-shadow:0 0 0 10px rgba(53,231,210,0)}100%{box-shadow:0 0 0 0 rgba(53,231,210,0)}}
        .join-shimmer{
          position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.06) 50%,transparent 70%);
          background-size:200% 100%;animation:shimmerSweep 2s linear infinite;
        }
        @keyframes shimmerSweep{from{background-position:200% 0}to{background-position:-200% 0}}
        .caption-bar{
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.05);
          border-radius:16px;
          padding:14px 20px;font-size:14px;display:flex;gap:10px;align-items:baseline;
          margin-bottom:16px;min-height:52px;
        }
        .caption-name{font-weight:800;color:var(--teal);flex-shrink:0;}
        .caption-text{color:var(--text2);line-height:1.5;}
        .call-controls{display:flex;justify-content:center;gap:12px;}
        .call-btn{
          width:52px;height:52px;border-radius:50%;
          border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);
          color:var(--text1);display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:transform .15s var(--ease),background .15s,box-shadow .15s;
          flex-shrink:0;
        }
        .call-btn:hover{transform:translateY(-3px);background:rgba(255,255,255,0.09);box-shadow:0 6px 18px rgba(0,0,0,.3);}
        .call-btn.active{background:rgba(53,231,210,.15);border-color:var(--teal);color:var(--teal);}
        .call-btn.danger{background:var(--danger);border-color:var(--danger);color:#04030A;}
        .call-btn.danger:hover{background:#ff7683;box-shadow:0 6px 20px rgba(255,92,108,.4);}

        /* CTA section */
        .cta-section{
          max-width:1300px;margin:0 auto;padding:80px 40px 120px;text-align:center;
        }
        .cta-card{
          background:rgba(13, 16, 32, 0.45);
          backdrop-filter:blur(16px);
          -webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(124,92,255,.2);border-radius:32px;
          padding:80px 48px;position:relative;overflow:hidden;
        }
        .cta-card::before{
          content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);
          width:600px;height:600px;border-radius:50%;
          background:radial-gradient(circle,rgba(124,92,255,.12),transparent 65%);
          pointer-events:none;
        }
        .cta-card h2{font-size:48px;font-weight:900;letter-spacing:-.03em;color:var(--text1);margin:0 0 16px;}
        .cta-card p{font-size:18px;color:var(--text2);margin:0 auto 40px;max-width:480px;line-height:1.6;}
        .cta-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;}
        .cta-buttons .btn{font-size:17px;padding:18px 40px;border-radius:16px;}

        /* Stats */
        .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:64px;}
        .stat-card{
          background:rgba(13, 16, 32, 0.4);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          border:1px solid rgba(255, 255, 255, 0.05);
          border-radius:20px;
          padding:28px 24px;text-align:center;
          transition:transform .2s var(--ease),border-color .2s;
        }
        .stat-card:hover{transform:translateY(-4px);border-color:rgba(124,92,255,.25);}
        .stat-num{font-size:40px;font-weight:900;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.02em;}
        .stat-label{font-size:14px;font-weight:600;color:var(--text2);margin-top:6px;}

        /* Drawer */
        .drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .2s;z-index:150;backdrop-filter:blur(4px);}
        .drawer-backdrop.open{opacity:1;pointer-events:auto;}
        .drawer{position:fixed;top:0;right:0;bottom:0;width:85vw;max-width:380px;background:var(--bg1);z-index:160;transform:translateX(100%);transition:transform .3s var(--ease);display:flex;flex-direction:column;padding:24px;border-left:1px solid var(--border);}
        .drawer.open{transform:translateX(0);}
        .drawer-close{align-self:flex-end;margin-bottom:20px;}
        .drawer-links{display:flex;flex-direction:column;gap:4px;}
        .drawer-links a{padding:18px 12px;font-size:16px;font-weight:600;color:var(--text1);text-decoration:none;border-bottom:1px solid var(--border);display:block;border-radius:10px;transition:background .15s;}
        .drawer-links a:hover{background:rgba(255,255,255,.05);}
        .drawer-bottom{margin-top:auto;display:flex;flex-direction:column;gap:12px;}
        .drawer-bottom .btn{width:100%;justify-content:center;font-size:16px;padding:16px;}

        /* Footer */
        footer{border-top:1px solid var(--border);padding:48px 40px;text-align:center;color:var(--text3);font-size:14px;}
        footer a{color:var(--text2);text-decoration:none;transition:color .15s;}
        footer a:hover{color:var(--text1);}

        /* Spinner */
        .spinner{width:40px;height:40px;border-radius:50%;border:3px solid rgba(124,92,255,.2);border-top-color:var(--brand);animation:spin .7s linear infinite;}

        /* Responsive */
        @media (max-width:1023px){
          .hero{grid-template-columns:1fr;padding:60px 24px 80px;}
          .hero-stage{height:420px;order:-1;}
          .hero h1{font-size:48px;}
          .nav-links{display:none;}
          .hamburger{display:flex;}
          .stats-row{grid-template-columns:1fr;}
        }
        @media (max-width:767px){
          .nav{padding:0 20px;height:68px;}
          .nav-right .btn-ghost,.nav-right .btn-nav{display:none;}
          .hero{padding:40px 20px 60px;}
          .hero h1{font-size:38px;}
          .hero p.sub{font-size:16px;}
          .hero-cta{flex-direction:column;}
          .hero-cta .btn{width:100%;justify-content:center;}
          .section{padding:64px 20px;}
          .call-grid{grid-template-columns:1fr;}
          .cta-card{padding:48px 24px;}
          .cta-card h2{font-size:32px;}
          .cta-buttons .btn{width:100%;justify-content:center;}
        }
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important;}}
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-left">
          <Link href="/" className="logo">
            <div className="logo-icon">G</div>
            Guildzee
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#calls">Voice &amp; Video</a>
            <a href="#cta">Community</a>
            <a href={downloadUrl}>Download</a>
          </div>
        </div>
        <div className="nav-right">
          <button className="icon-btn" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <Link href={token ? '/dashboard' : '/login'} className="btn btn-ghost btn-nav">
            {token ? 'Open App' : 'Log In'}
          </Link>
          <Link href={token ? '/dashboard' : '/signup'} className="btn btn-primary btn-nav">
            {token ? 'Dashboard' : 'Get Started — Free'}
          </Link>
          <button className="icon-btn hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ── */}
      <div className={`drawer-backdrop ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <div className={`drawer ${drawerOpen ? 'open' : ''}`} role="dialog" aria-label="Mobile menu">
        <button className="icon-btn drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="drawer-links">
          <a href="#features" onClick={() => setDrawerOpen(false)}>Features</a>
          <a href="#calls" onClick={() => setDrawerOpen(false)}>Voice &amp; Video</a>
          <a href="#cta" onClick={() => setDrawerOpen(false)}>Community</a>
          <a href={downloadUrl} onClick={() => setDrawerOpen(false)}>Download</a>
        </div>
        <div className="drawer-bottom">
          <Link href={token ? '/dashboard' : '/login'} className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>
            {token ? 'Open App' : 'Log In'}
          </Link>
          <Link href={token ? '/dashboard' : '/signup'} className="btn btn-primary" onClick={() => setDrawerOpen(false)}>
            {token ? 'Dashboard' : 'Get Started Free'}
          </Link>
        </div>
      </div>

      <main id="main">

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Built for real communities
            </span>
            <h1>
              Where your people<br />
              <span className="grad-text">actually show up.</span>
            </h1>
            <p className="sub">
              Guildzee brings voice, video, rich chat, and community into one fast space built for the way real groups talk — no clutter, just connection.
            </p>
            <div className="hero-cta">
              <Link href={token ? '/dashboard' : '/signup'} className="btn btn-primary">
                🚀 Jump In Free
              </Link>
              <Link href={token ? '/dashboard' : '/login'} className="btn btn-secondary">
                See it in action ↓
              </Link>
            </div>
            <div className="chip-row">
              <span className="chip">⚡ Instant voice rooms</span>
              <span className="chip">🔒 Private by default</span>
              <span className="chip">💬 Real-time everywhere</span>
              <span className="chip">🌍 Cross-platform</span>
            </div>
          </div>

          <div className="hero-stage" ref={stageRef}>
            <canvas id="particle-canvas" ref={canvasRef} />
            <div className="glow-layer" ref={glowRef} />

            <div className="hall">
              {/* Orbit rings */}
              <div className="orbit-ring ring1" />
              <div className="orbit-ring ring2" />
              {/* Orbit dots */}
              <div className="orbit-dot dot-brand" />
              <div className="orbit-dot dot-teal" />
              <div className="orbit-dot dot-warn" />
              <div className="orbit-dot dot-danger" />
              {/* Center crest */}
              <div className="guild-crest">
                <span className="crest-logo">G</span>
              </div>
            </div>

            {/* Float windows */}
            <div className="float-window fw1">
              <div className="fw-head">
                <span className="fw-avatar" />
                <div className="fw-name">Nova</div>
                <div className="fw-online" />
              </div>
              <div className="fw-msgs" id="fwMsgs1" />
            </div>
            <div className="float-window fw2">
              <div className="fw-head">
                <span className="fw-avatar" style={{ background: 'var(--teal)' }} />
                <div className="fw-name">Kade</div>
                <div className="fw-online" />
              </div>
              <div className="fw-msgs" id="fwMsgs2" />
            </div>
            <div className="float-window fw3">
              <div className="fw-head">
                <span className="fw-avatar" style={{ background: 'var(--warn)' }} />
                <div className="fw-name">Piper</div>
                <div className="fw-online" />
              </div>
              <div className="fw-msgs" id="fwMsgs3" />
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="stats-row reveal">
            {[['10M+','Active users worldwide'],['99.9%','Uptime guaranteed'],['<50ms','Average latency']].map(([n,l],i)=>(
              <div key={i} className={`stat-card reveal reveal-d${i+1}`}>
                <div className="stat-num">{n}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ── */}
        <section className="section" id="features">
          <div className="section-head reveal">
            <span className="kicker">Features</span>
            <h2>Everything your guild needs</h2>
            <p>Real-time voice, rich chat, GIFs, reactions, and custom communities — all in one beautifully focused space.</p>
          </div>
          <div className="feature-grid">
            {[
              { icon: '🎙️', title: 'Real-Time Voice Rooms', desc: 'Drop into a room in one tap. Crystal clear audio with adaptive noise suppression — no dial-in required.' },
              { icon: '💬', title: 'Threaded Conversations', desc: 'Branch side discussions without losing the main thread. Every reply stays linked to its context.' },
              { icon: '🎥', title: 'HD Video Calls', desc: 'Face-to-face with your whole crew. Up to 25 participants with active speaker spotlight.' },
              { icon: '🏰', title: 'Custom Communities', desc: 'Shape your guild with roles, channels, and permissions that fit how your group actually works.' },
              { icon: '🖥️', title: 'Screen Share & Watch', desc: 'Share your screen instantly, or queue something up and watch it in sync with the whole room.' },
              { icon: '📱', title: 'Cross-Platform Sync', desc: 'Start on your phone, finish on desktop. Everything picks up exactly where you left it.' },
              { icon: '🎭', title: '500+ Emojis & GIFs', desc: 'Express yourself with a massive library of emojis, stickers, and funny GIFs built right in.' },
              { icon: '🔒', title: 'End-to-End Privacy', desc: 'Your conversations are yours. Advanced encryption and granular privacy controls by default.' },
              { icon: '⚡', title: 'Instant Notifications', desc: 'Never miss a moment. Smart notifications that respect your focus and surface what matters most.' },
            ].map((f, i) => (
              <article key={i} className={`feature-card reveal reveal-d${(i % 3) + 1}`}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── VOICE & VIDEO ── */}
        <section className="section" id="calls">
          <div className="section-head reveal">
            <span className="kicker">Voice &amp; Video</span>
            <h2>Calls that feel like being in the room</h2>
            <p>Active-speaker spotlighting, live captions, and floating controls that stay out of the way until you need them.</p>
          </div>
          <div className="call-stage reveal">
            <div className="call-grid">
              {[
                { name: 'Nova', color: '#7C5CFF', idx: 0 },
                { name: 'Kade', color: '#35E7D2', idx: 1 },
                { name: 'Piper', color: '#FFB020', idx: 2 },
                { name: 'Rex', color: '#FF5C6C', idx: 3, shimmer: true },
              ].map(t => (
                <div key={t.name} className={`call-tile ${activeSpeakerIdx === t.idx ? 'speaking' : ''}`} style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
                  <CallTileVideo name={t.name} color={t.color} active={activeSpeakerIdx === t.idx} index={t.idx} />
                  <div className="tile-tag" style={{ zIndex: 10 }}>
                    {activeSpeakerIdx === t.idx && <span className="tile-dot" />}
                    {t.name}
                  </div>
                  {t.shimmer && <div className="join-shimmer" />}
                </div>
              ))}
            </div>

            <div className="caption-bar">
              <span className="caption-name">{captionName}</span>
              <span className="caption-text">{captionText}<span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--teal)', marginLeft: 2, animation: 'pulse 1s ease infinite', verticalAlign: 'middle' }} /></span>
            </div>

            <div className="call-controls">
              {[
                { label: 'Mute', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/></svg>, cls: '' },
                { label: 'Camera', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3Z"/></svg>, cls: '' },
                { label: 'Share screen', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, cls: '' },
                { label: 'Captions', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12h3M14 12h3M7 15h6"/></svg>, cls: 'active' },
                { label: 'Leave', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15c4-5 12-5 16 0M9 17l1.5-1.5M15 17l-1.5-1.5"/></svg>, cls: 'danger' },
              ].map(b => (
                <button key={b.label} className={`call-btn ${b.cls}`} aria-label={b.label}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                    {b.icon.props.children}
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section" id="cta">
          <div className="cta-card reveal">
            <span className="kicker" style={{ position: 'relative', zIndex: 1 }}>Ready?</span>
            <h2 style={{ position: 'relative', zIndex: 1 }}>Your guild is waiting.</h2>
            <p style={{ position: 'relative', zIndex: 1 }}>Join millions of communities already building something incredible on Guildzee. Free forever, no credit card required.</p>
            <div className="cta-buttons" style={{ position: 'relative', zIndex: 1 }}>
              <Link href={token ? '/dashboard' : '/signup'} className="btn btn-primary">
                🎉 Create Your Guild Free
              </Link>
              <Link href={token ? '/dashboard' : '/login'} className="btn btn-secondary">
                Already have an account? →
              </Link>
            </div>
          </div>
        </section>

      </main>

      <footer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 20 }}>
          {['Privacy Policy', 'Terms of Service', 'Help Center', 'Blog', 'Download'].map(l => (
            <a key={l} href="#">{l}</a>
          ))}
        </div>
        <p>© 2026 Guildzee. Built with ❤️ for real communities.</p>
      </footer>
    </div>
  );
}
