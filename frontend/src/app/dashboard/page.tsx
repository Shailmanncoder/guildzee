'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import { useRouter } from 'next/navigation';

const BE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function AdSenseUnit() {
  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense error', e);
    }
  }, []);

  return (
    <div style={{ margin: '8px auto 20px', display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden', minHeight: 90, background: 'rgba(255,255,255,.01)', border: '1px solid rgba(255,255,255,.03)', borderRadius: 12, padding: 8 }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minWidth: 250 }}
        data-ad-client="ca-pub-2123132010029656"
        data-ad-slot="8181147423"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ─── Color seeds ─────────────────────────────────────────────────────────────
const PALETTES: [string, string][] = [
  ['#7C5CFF', '#35E7D2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'], ['#84fab0', '#8fd3f4'],
];
function seedColor(s: string): [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return PALETTES[Math.abs(h) % PALETTES.length] as [string, string];
}
const grad = (s: string) => { const [a, b] = seedColor(s); return `linear-gradient(135deg,${a},${b})`; };
const STATUS: Record<string, string> = { ONLINE: '#3DDC84', IDLE: '#FFB020', DND: '#FF5C6C', offline: '#4A5168' };

// ─── Emoji / GIF data ─────────────────────────────────────────────────────────
const EMOJIS = ['😀','😂','🤣','😍','🥰','😎','🤩','🥳','😏','😢','😤','😠','🤯','😱','🤗','🤔','🙏','💪','👀','❤️','🔥','✨','⭐','🎉','🎁','🏆','🍕','🎮','🎵','🐶','🐱','🦊','💎','⚔️','🎯','💥','🌟','🎊','🥇','💫','🌈','🦄','👋','👍','👎','✊','👏','🙌','😅','😇','🙂','😉','🥴','🤢','🤧','🎤','🐱','🍔','🍣','⚽','💬','🔒','🌍','📱','🖥️','⚡'];
const GIFS = [
  { name: 'Victory', url: 'https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif', cat: 'gaming' },
  { name: 'GG', url: 'https://media.giphy.com/media/L38lH2P2L27Fm/giphy.gif', cat: 'gaming' },
  { name: 'Laugh', url: 'https://media.giphy.com/media/kC8N6D5d6LDc4/giphy.gif', cat: 'funny' },
  { name: 'Anime', url: 'https://media.giphy.com/media/c6DIpCp1922KQ/giphy.gif', cat: 'anime' },
  { name: 'Chill', url: 'https://media.giphy.com/media/hVTouqNmQHCC4/giphy.gif', cat: 'chill' },
  { name: 'Rage', url: 'https://media.giphy.com/media/11tTATOB1jGFIc/giphy.gif', cat: 'gaming' },
  { name: 'Kawaii', url: 'https://media.giphy.com/media/14ppamy2kvCskw/giphy.gif', cat: 'anime' },
  { name: 'Silly', url: 'https://media.giphy.com/media/13CoXDia17X6Cc/giphy.gif', cat: 'funny' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ u, size = 36 }: { u: any; size?: number }) {
  if (u?.avatarUrl) {
    const src = u.avatarUrl.startsWith('http') ? u.avatarUrl : `${BE}${u.avatarUrl}`;
    return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const letter = ((u?.displayName || u?.username || '?')[0] || '?').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: grad(u?.id || u?.displayName || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: size * 0.4, flexShrink: 0 }}>
      {letter}
    </div>
  );
}

function StatusDot({ status = 'offline', border = '#0E0F17', size = 11 }: { status?: string; border?: string; size?: number }) {
  return (
    <span style={{ position: 'absolute', bottom: -1, right: -1, width: size, height: size, borderRadius: '50%', background: STATUS[status] || STATUS.offline, border: `2.5px solid ${border}`, display: 'block' }} />
  );
}

function AudioPlayer({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <audio ref={ref} autoPlay hidden />;
}

function linkify(text: string) {
  const rx = /(https?:\/\/[^\s]+)/g;
  return text.split(rx).map((p, i) =>
    rx.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: '#7C5CFF', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>{p}</a> : p
  );
}
function fmtTime(iso: string) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(10px)', animation: 'fadeIn .18s ease' }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const router = useRouter();
  const { token, user, logout, updateUser, loading } = useAuth();
  const { socket, onlineFriends, typingUsers, messagesNotifier } = useSocket();
  const { call, initiateCall, acceptCall, endCall, isMuted, toggleMute, activeVoiceChannelId, voiceUsers, joinVoiceChannel } = useCall();

  // Server / channel data
  const [servers, setServers] = useState<any[]>([]);
  const [serverId, setServerId] = useState<string | null>(null);
  const [serverDetail, setServerDetail] = useState<any>(null);

  // Social data
  const [friends, setFriends] = useState<any>({ all: [], pendingIncoming: [], pendingOutgoing: [], blocked: [] });
  const [groups, setGroups] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Chat nav
  const [activeTab, setActiveTab] = useState('friends');
  const [activeTabType, setActiveTabType] = useState<'dm' | 'group' | 'channel'>('dm');
  const [activeTabName, setActiveTabName] = useState('Friends');

  // Input
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI panels
  const [friendFilter, setFriendFilter] = useState<'online' | 'all' | 'pending'>('online');
  const [friendSearch, setFriendSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifCategory, setGifCategory] = useState('gaming');
  const [micOn, setMicOn] = useState(true);
  const [deafened, setDeafened] = useState(false);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'account' | 'profile' | 'appearance'>('account');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendUsername, setAddFriendUsername] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [inviteCode, setInviteCode] = useState('');

  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [serverName, setServerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); }, []);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [token, loading]);
  useEffect(() => { if (token) { fetchFriends(); fetchGroups(); fetchServers(); } }, [token]);
  useEffect(() => { if (token && serverId) fetchServerDetail(serverId); else setServerDetail(null); }, [serverId, token]);
  useEffect(() => { if (user) { setEditName(user.displayName || ''); setEditBio(user.bio || ''); setEditStatus(user.customStatus || ''); } }, [user, showSettings]);

  useEffect(() => {
    if (!messagesNotifier) return;
    const n = messagesNotifier, uid = user?.id;
    const here = (activeTabType === 'dm' && ((n.senderId === activeTab && n.recipientId === uid) || (n.senderId === uid && n.recipientId === activeTab)))
      || (activeTabType === 'group' && n.groupId === activeTab)
      || (activeTabType === 'channel' && n.channelId === activeTab);
    if (here) { setMessages(p => p.some(m => m.id === n.id) ? p : [...p, n]); scrollToBottom(); }
    else setUnreadCount(c => c + 1);
    fetchFriends();
  }, [messagesNotifier, activeTab, activeTabType]);

  const api = async (path: string, opts?: RequestInit) =>
    fetch(`${BE}${path}`, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  const fetchFriends = async () => { try { const r = await api('/api/friends/list'); const d = await r.json(); if (r.ok) setFriends(d); } catch { } };
  const fetchGroups = async () => { try { const r = await api('/api/messages/groups'); const d = await r.json(); if (r.ok) setGroups(d); } catch { } };
  const fetchServers = async () => { try { const r = await api('/api/servers'); const d = await r.json(); if (r.ok) setServers(d); } catch { } };
  const fetchServerDetail = async (id: string) => { try { const r = await api(`/api/servers/${id}`); const d = await r.json(); if (r.ok) setServerDetail(d); } catch { } };

  async function openChat(id: string, type: 'dm' | 'group' | 'channel', name: string) {
    setActiveTab(id); setActiveTabType(type); setActiveTabName(name);
    setReplyTo(null); setShowEmoji(false); setShowGif(false); setUnreadCount(0);
    if (id === 'friends') return;
    try {
      const ep = type === 'dm' ? `/api/messages/dm/${id}` : type === 'group' ? `/api/messages/groups/${id}` : `/api/channels/${id}/messages`;
      const r = await api(ep); const d = await r.json();
      if (r.ok) { setMessages(d.messages || d); scrollToBottom(); }
    } catch { }
  }

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    const fd = new FormData();
    if (inputText.trim()) fd.append('content', inputText);
    if (replyTo) fd.append('parentId', replyTo.id);
    if (attachedFile) fd.append('file', attachedFile);
    setInputText(''); setAttachedFile(null); setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = '24px';
    try {
      const ep = activeTabType === 'dm' ? `/api/messages/dm/${activeTab}` : activeTabType === 'group' ? `/api/messages/groups/${activeTab}` : `/api/channels/${activeTab}/messages`;
      const r = await api(ep, { method: 'POST', body: fd });
      const m = await r.json();
      if (r.ok) { setMessages(p => [...p, m]); scrollToBottom(); }
    } catch { }
  }

  async function addReaction(msgId: string, emoji: string) {
    try { await api(`/api/messages/react/${msgId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) }); openChat(activeTab, activeTabType, activeTabName); } catch { }
  }

  async function acceptFriend(id: string) { try { await api(`/api/friends/accept/${id}`, { method: 'POST' }); fetchFriends(); } catch { } }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: editName, bio: editBio, customStatus: editStatus }) });
      const d = await r.json(); if (r.ok) { updateUser(d); setShowSettings(false); }
    } catch { }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const fd = new FormData(); fd.append('avatar', e.target.files[0]);
    try { const r = await api('/api/users/profile', { method: 'PUT', body: fd }); const d = await r.json(); if (r.ok) updateUser(d); } catch { }
  }

  async function deleteAccount() {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    try { const r = await api('/api/users/me', { method: 'DELETE' }); if (r.ok) logout(); } catch { }
  }

  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    if (!addFriendUsername.trim()) return;
    setAddFriendStatus({ type: null, msg: '' });
    try {
      const r = await api('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: addFriendUsername }),
      });
      const d = await r.json();
      if (r.ok) {
        setAddFriendStatus({ type: 'success', msg: d.message || 'Friend request sent!' });
        setAddFriendUsername('');
        fetchFriends();
      } else {
        setAddFriendStatus({ type: 'error', msg: d.error || 'Failed to send request' });
      }
    } catch {
      setAddFriendStatus({ type: 'error', msg: 'Something went wrong' });
    }
  }

  async function handleDeleteServer() {
    if (!serverId) return;
    if (!confirm('Are you sure you want to permanently delete this server? All channels and messages will be lost.')) return;
    try {
      const r = await api(`/api/servers/delete/${serverId}`, { method: 'DELETE' });
      if (r.ok) {
        setServerId(null);
        openChat('friends', 'dm', 'Friends');
        fetchServers();
      } else {
        const d = await r.json();
        alert(d.error || 'Failed to delete server');
      }
    } catch {
      alert('Something went wrong');
    }
  }

  async function handleLeaveServer() {
    if (!serverId) return;
    if (!confirm('Are you sure you want to leave this server?')) return;
    try {
      const r = await api(`/api/servers/${serverId}`, { method: 'DELETE' });
      if (r.ok) {
        setServerId(null);
        openChat('friends', 'dm', 'Friends');
        fetchServers();
      } else {
        const d = await r.json();
        alert(d.error || 'Failed to leave server');
      }
    } catch {
      alert('Something went wrong');
    }
  }

  function sendGif(url: string, name: string) {
    setMessages(p => [...p, { id: Math.random().toString(36).slice(2), senderId: user?.id, type: 'IMAGE', fileUrl: url, fileName: name, createdAt: new Date().toISOString(), sender: user }]);
    scrollToBottom(); setShowGif(false);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const allFriends: any[] = friends.all || [];
  const onlineFriendsList = allFriends.filter(f => onlineFriends.has(f.id));
  const offlineFriendsList = allFriends.filter(f => !onlineFriends.has(f.id));
  const isChatOpen = activeTab !== 'friends';
  const recipient = allFriends.find(f => f.id === activeTab);
  const activeGroup = groups.find(g => g.id === activeTab);
  const activeChannel = serverDetail?.channels?.find((c: any) => c.id === activeTab);
  const chatTitle = activeTabType === 'dm' ? (recipient?.displayName || activeTabName) : activeTabType === 'group' ? (activeGroup?.name || activeTabName) : (activeChannel?.name || activeTabName);

  const filteredFriends = (() => {
    const base = friendFilter === 'pending' ? (friends.pendingIncoming || []) : friendFilter === 'online' ? onlineFriendsList : allFriends;
    return friendSearch ? base.filter((f: any) => (f.displayName || '').toLowerCase().includes(friendSearch.toLowerCase()) || (f.username || '').toLowerCase().includes(friendSearch.toLowerCase())) : base;
  })();

  const lvl = user?.level || 1, xp = user?.xp || 0, xpMax = lvl * 200;
  const xpPct = Math.min(100, Math.round((xp % xpMax) / xpMax * 100));
  if (loading || !token) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: '#070910', color: '#fff', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(124,92,255,.15)', borderTopColor: '#7C5CFF', animation: 'spin .8s linear infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4A5168', letterSpacing: '.08em' }}>VERIFYING SESSION…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: "'Inter',sans-serif", background: '#070910', color: '#C8CBDB' }}>

      {/* ─── Global styles ────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.2)}
        ::selection{background:rgba(124,92,255,.4);color:#fff}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes popIn{from{opacity:0;transform:scale(.94) translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideLeft{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}
        @keyframes ring{0%{transform:scale(1);opacity:.5}100%{transform:scale(2);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 18px rgba(124,92,255,.35)}50%{box-shadow:0 0 32px rgba(124,92,255,.65)}}
        .pill-hover{transition:background .14s,color .14s,border-color .14s}
        .pill-hover:hover{background:rgba(255,255,255,.07)!important;color:#fff!important}
        .pill-active{background:rgba(124,92,255,.16)!important;color:#fff!important}
        .msg-row:hover{background:rgba(255,255,255,.025)}
        .msg-row:hover .msg-actions{opacity:1;transform:none}
        .msg-actions{opacity:0;transform:translateY(-2px);transition:opacity .15s,transform .15s}
        .srv-btn{transition:border-radius .25s,background .2s,transform .2s,box-shadow .2s}
        .srv-btn:hover{border-radius:18px!important;transform:scale(1.06)}
        .chan-btn{transition:background .12s,color .12s}
        .chan-btn:hover{background:rgba(255,255,255,.055)!important;color:#e0e2ef!important}
        .icon-act{transition:background .14s,color .14s,transform .1s}
        .icon-act:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}
        .icon-act:active{transform:scale(.93)}
        input,textarea{outline:none;font-family:inherit}
        .focus-ring:focus{box-shadow:0 0 0 3px rgba(124,92,255,.35)}
        .tooltip{position:relative}
        .tooltip-tip{position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);background:#111420;color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;transform:translateY(-50%) translateX(-4px);border:1px solid rgba(255,255,255,.08);z-index:100}
        .tooltip:hover .tooltip-tip{opacity:1;transform:translateY(-50%) translateX(0)}
      `}</style>

      {/* voice audio outputs */}
      {voiceUsers.map(v => v.stream ? <AudioPlayer key={v.socketId} stream={v.stream} /> : null)}

      {/* ════════════════════════════════════════════
          RAIL — 72px
      ════════════════════════════════════════════ */}
      <nav style={{ width: 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 8, overflowY: 'auto', background: '#070910', borderRight: '1px solid rgba(255,255,255,.04)', scrollbarWidth: 'none' }}>

        {/* Home */}
        <div className="tooltip" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: 52 }}>
          <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 4, height: serverId === null ? 40 : 0, background: 'linear-gradient(180deg,#7C5CFF,#35E7D2)', borderRadius: '0 4px 4px 0', transition: 'height .25s', opacity: serverId === null ? 1 : 0 }} />
          <button className="srv-btn" onClick={() => { setServerId(null); openChat('friends', 'dm', 'Friends'); }}
            style={{ width: 48, height: 48, borderRadius: serverId === null ? 18 : 28, background: serverId === null ? 'linear-gradient(135deg,#7C5CFF,#35E7D2)' : 'rgba(124,92,255,.15)', color: '#fff', fontWeight: 900, fontSize: 22, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: serverId === null ? '0 6px 24px rgba(124,92,255,.5)' : 'none' }}>
            G
          </button>
          <span className="tooltip-tip">Guildzee Home</span>
        </div>

        <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,.08)', margin: '2px 0' }} />

        {servers.map(s => {
          const active = serverId === s.id;
          const [c1, c2] = seedColor(s.id || s.name);
          return (
            <div key={s.id} className="tooltip" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: 52 }}>
              <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 4, height: active ? 40 : 0, background: 'linear-gradient(180deg,#7C5CFF,#35E7D2)', borderRadius: '0 4px 4px 0', transition: 'height .25s', opacity: active ? 1 : 0 }} />
              <button className="srv-btn" onClick={() => { setServerId(s.id); const fc = s.channels?.find((c: any) => c.type === 'TEXT') || s.channels?.[0]; if (fc) openChat(fc.id, 'channel', fc.name); }}
                style={{ width: 48, height: 48, borderRadius: active ? 18 : 28, background: active ? `linear-gradient(135deg,${c1},${c2})` : `rgba(255,255,255,.07)`, color: '#fff', fontWeight: 900, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: active ? `0 6px 20px ${c1}55` : 'none' }}>
                {s.name.substring(0, 2).toUpperCase()}
              </button>
              <span className="tooltip-tip">{s.name}</span>
            </div>
          );
        })}

        {/* Add / Join */}
        {[
          { icon: '+', label: 'Create Server', action: () => setShowServerModal(true), color: '#3DDC84' },
          { icon: '⊕', label: 'Join Server', action: () => setShowJoinModal(true), color: '#7C5CFF' },
        ].map(b => (
          <div key={b.label} className="tooltip" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: 48 }}>
            <button className="srv-btn" onClick={b.action}
              style={{ width: 48, height: 48, borderRadius: 28, background: `${b.color}18`, color: b.color, fontSize: 22, fontWeight: 900, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = b.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = `0 6px 20px ${b.color}55`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${b.color}18`; e.currentTarget.style.color = b.color; e.currentTarget.style.boxShadow = 'none'; }}>
              {b.icon}
            </button>
            <span className="tooltip-tip">{b.label}</span>
          </div>
        ))}
      </nav>

      {/* ════════════════════════════════════════════
          SIDEBAR — 248px
      ════════════════════════════════════════════ */}
      <aside style={{ width: 248, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#0E0F17', borderRight: '1px solid rgba(255,255,255,.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#E0E2EF', letterSpacing: '-.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {serverId === null ? '✦ Guildzee' : (serverDetail?.name || '…')}
          </span>
          {serverId !== null && serverDetail && (
            serverDetail.ownerId === user?.id ? (
              <button className="icon-act" onClick={handleDeleteServer} title="Delete Server"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#FF5C6C', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
              </button>
            ) : (
              <button className="icon-act" onClick={handleLeaveServer} title="Leave Server"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#FF5C6C', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </button>
            )
          )}
          {serverId === null && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><path d="M7 10l5 5 5-5" /></svg>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {serverId === null ? (
            <>
              {/* XP bar */}
              <div style={{ margin: '4px 4px 16px', padding: '12px 14px', borderRadius: 14, background: 'rgba(124,92,255,.08)', border: '1px solid rgba(124,92,255,.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>LVL {lvl}</span>
                  <span style={{ fontSize: 11, color: '#7C5CFF', fontWeight: 700 }}>{xp % xpMax}/{xpMax} XP</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg,#7C5CFF,#35E7D2)', borderRadius: 2, transition: 'width .8s ease' }} />
                </div>
              </div>

              {/* Friends nav */}
              <button className="pill-hover chan-btn" onClick={() => openChat('friends', 'dm', 'Friends')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 2, background: activeTab === 'friends' ? 'rgba(124,92,255,.18)' : 'transparent', border: 'none', cursor: 'pointer', color: activeTab === 'friends' ? '#fff' : '#6B7289' }}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1, textAlign: 'left' }}>Friends</span>
                {friends.pendingIncoming?.length > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', background: '#FF5C6C', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{friends.pendingIncoming.length}</span>}
              </button>

              {/* Group DMs */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 6px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.06em' }}>Group Chats</span>
                <button className="icon-act" onClick={() => setShowGroupModal(true)} style={{ width: 20, height: 20, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#3D4259', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>+</button>
              </div>
              {groups.map(g => (
                <button key={g.id} className="chan-btn" onClick={() => openChat(g.id, 'group', g.name)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: activeTab === g.id ? 'rgba(124,92,255,.16)' : 'transparent', border: 'none', cursor: 'pointer', color: activeTab === g.id ? '#fff' : '#6B7289' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: grad(g.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{g.name[0]?.toUpperCase()}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                </button>
              ))}

              {/* DMs */}
              <div style={{ padding: '16px 12px 6px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.06em' }}>Direct Messages</span>
              </div>
              {allFriends.map(f => {
                const online = onlineFriends.has(f.id);
                return (
                  <button key={f.id} className="chan-btn" onClick={() => openChat(f.id, 'dm', f.displayName)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, marginBottom: 2, background: activeTab === f.id ? 'rgba(124,92,255,.16)' : 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar u={f} size={32} />
                      <StatusDot status={online ? 'ONLINE' : 'offline'} border="#0E0F17" size={10} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: activeTab === f.id ? '#fff' : '#9AA0B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{f.displayName}</span>
                      {f.customStatus && <span style={{ fontSize: 11, color: '#3D4259', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{f.customStatus}</span>}
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            /* ── Server channels ── */
            <>
              <button className="chan-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Browse Channels</span>
              </button>
              {(['IMPORTANT', 'TEXT', 'VOICE'] as const).map(sec => {
                const chans = (serverDetail?.channels || []).filter((c: any) => {
                  const n = (c.name || '').toLowerCase();
                  if (sec === 'IMPORTANT') return ['announce', 'rule', 'welcome'].some(k => n.includes(k));
                  if (sec === 'TEXT') return c.type === 'TEXT' && !['announce', 'rule', 'welcome'].some(k => n.includes(k));
                  return c.type === 'VOICE';
                });
                if (!chans.length) return null;
                return (
                  <div key={sec} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {sec === 'IMPORTANT' ? 'Important' : sec === 'TEXT' ? 'Text Channels' : 'Voice Channels'}
                      </span>
                      <button className="icon-act" onClick={() => setShowChannelModal(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3D4259', fontSize: 18, width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    {chans.map((c: any) => {
                      const on = activeTab === c.id;
                      return (
                        <button key={c.id} className="chan-btn" onClick={() => c.type === 'VOICE' ? joinVoiceChannel(c.id) : openChat(c.id, 'channel', c.name)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: on ? 'rgba(124,92,255,.16)' : 'transparent', border: 'none', cursor: 'pointer', color: on ? '#fff' : '#6B7289' }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>
                            {c.type === 'VOICE' ? '🔊' : c.name.includes('announce') ? '📢' : c.name.includes('rule') ? '📋' : c.name.includes('welcome') ? '👋' : '#'}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                          {activeVoiceChannelId === c.id && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DDC84', animation: 'glow 2s ease infinite', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <button onClick={() => { setInviteCode(serverId || ''); setShowInviteModal(true); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, marginTop: 8, background: 'rgba(124,92,255,.1)', border: '1px solid rgba(124,92,255,.2)', cursor: 'pointer', color: '#7C5CFF', fontSize: 13, fontWeight: 700 }}>
                🔗 Invite Friends
              </button>
            </>
          )}
        </div>

        {/* User Panel */}
        <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 0, padding: '0 6px', borderTop: '1px solid rgba(255,255,255,.05)', background: '#0A0B12', flexShrink: 0 }}>
          <button onClick={() => setShowSettings(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', flex: 1, minWidth: 0, transition: 'background .14s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar u={user} size={34} />
              <StatusDot status="ONLINE" border="#0A0B12" size={11} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#E0E2EF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{user?.displayName}</span>
              <span style={{ fontSize: 11, color: '#3D4259', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{user?.customStatus || 'Online'}</span>
            </div>
          </button>
          {[
            {
              icon: micOn ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.19A6.96 6.96 0 0 1 12 18c-3.87 0-7-3.13-7-7V10"/><path d="M9 9h6a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3Z"/><line x1="12" x2="12" y1="18" y2="22"/></svg>
              ),
              action: () => setMicOn(v => !v),
              active: micOn,
              title: 'Mute'
            },
            {
              icon: !deafened ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.44 3.07a9 9 0 0 1 12.56 8.93v2"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 14v-2a9 9 0 0 1 1.77-5.36"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/></svg>
              ),
              action: () => setDeafened(v => !v),
              active: !deafened,
              title: 'Deafen'
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              ),
              action: () => setShowSettings(true),
              active: true,
              title: 'Settings'
            },
          ].map(b => (
            <button key={b.title} className="icon-act" onClick={b.action} title={b.title}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.active ? '#9AA0B8' : '#FF5C6C', flexShrink: 0 }}>
              {b.icon}
            </button>
          ))}
        </div>
      </aside>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#12131C' }}>

        {/* Top bar */}
        <header style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0, background: '#12131C' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isChatOpen && <span style={{ fontWeight: 800, fontSize: 18, color: '#3D4259' }}>{activeTabType === 'channel' ? '#' : activeTabType === 'group' ? '⊕' : '@'}</span>}
            <h1 style={{ fontWeight: 800, fontSize: 16, color: '#E0E2EF', margin: 0, letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {!isChatOpen ? 'Friends' : chatTitle}
            </h1>
            {isChatOpen && activeTabType === 'dm' && recipient && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: onlineFriends.has(recipient.id) ? '#3DDC84' : '#4A5168', flexShrink: 0 }} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isChatOpen && activeTabType === 'dm' && recipient && (
              <>
                {[
                  { label: 'Voice Call', icon: '📞', action: () => initiateCall(recipient.id, recipient.displayName || recipient.username, 'voice') },
                  { label: 'Video Call', icon: '🎥', action: () => initiateCall(recipient.id, recipient.displayName || recipient.username, 'video') },
                ].map(b => (
                  <button key={b.label} className="icon-act" onClick={b.action} title={b.label}
                    style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.05)', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.icon}
                  </button>
                ))}
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.07)' }} />
              </>
            )}
            {unreadCount > 0 && (
              <button onClick={() => setUnreadCount(0)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 13 }}>
                🔔 {unreadCount} new
              </button>
            )}
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{ position: 'absolute', left: 10, pointerEvents: 'none', color: '#3D4259' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input placeholder="Search…" className="focus-ring"
                style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '7px 12px 7px 30px', fontSize: 13, color: '#C8CBDB', width: 140, transition: 'width .2s' }}
                onFocus={e => e.currentTarget.style.width = '200px'} onBlur={e => e.currentTarget.style.width = '140px'} />
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── Friends View ── */}
          {!isChatOpen && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp .2s ease' }}>
              {/* Filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0, flexWrap: 'wrap' }}>
                {(['online', 'all', 'pending'] as const).map(f => (
                  <button key={f} className="pill-hover" onClick={() => setFriendFilter(f)}
                    style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid', fontSize: 14, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s', background: friendFilter === f ? 'rgba(124,92,255,.2)' : 'transparent', color: friendFilter === f ? '#fff' : '#6B7289', borderColor: friendFilter === f ? 'rgba(124,92,255,.35)' : 'transparent' }}>
                    {f === 'pending' && friends.pendingIncoming?.length > 0 ? `Pending (${friends.pendingIncoming.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => { setAddFriendStatus({ type: null, msg: '' }); setAddFriendUsername(''); setShowAddFriendModal(true); }}
                  style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#3DDC84,#2ab870)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 16px rgba(61,220,132,.3)' }}>
                  + Add Friend
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <AdSenseUnit />
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 24, maxWidth: 480 }}>
                  <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3D4259', pointerEvents: 'none' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                  <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Search friends…" className="focus-ring"
                    style={{ width: '100%', padding: '11px 16px 11px 40px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', fontSize: 14, color: '#C8CBDB' }} />
                </div>

                <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                  {friendFilter === 'online' ? `Online — ${filteredFriends.length}` : friendFilter === 'pending' ? `Pending — ${filteredFriends.length}` : `All Friends — ${filteredFriends.length}`}
                </p>

                {filteredFriends.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 16, opacity: .4 }}>
                    <span style={{ fontSize: 56 }}>👻</span>
                    <span style={{ fontSize: 15, color: '#3D4259' }}>It's quiet here. Add some friends!</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredFriends.map((f: any) => {
                      const online = onlineFriends.has(f.id);
                      const isPending = friendFilter === 'pending';
                      return (
                        <div key={f.id} className="msg-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,.04)', transition: 'all .15s', cursor: 'default' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <Avatar u={f} size={46} />
                              {!isPending && <StatusDot status={online ? 'ONLINE' : 'offline'} border="#12131C" size={13} />}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: '#E0E2EF', fontSize: 15 }}>{f.displayName}</span>
                                <span style={{ fontSize: 12, color: '#3D4259' }}>@{f.username}</span>
                              </div>
                              <span style={{ fontSize: 13, color: '#3D4259' }}>
                                {isPending ? '📨 Incoming Friend Request' : f.customStatus || (online ? '🟢 Online' : 'Offline')}
                              </span>
                            </div>
                          </div>
                          <div className="msg-actions" style={{ display: 'flex', gap: 8 }}>
                            {isPending ? (
                              <>
                                <button onClick={() => acceptFriend(f.id)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#3DDC84', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                                <button style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF5C6C', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => openChat(f.id, 'dm', f.displayName)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
                                <button onClick={() => initiateCall(f.id, f.displayName || f.username, 'voice')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📞</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Chat View ── */}
          {isChatOpen && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideLeft .2s ease' }}>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 8px' }}>
                <AdSenseUnit />
                {/* Channel intro */}
                <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  {activeTabType === 'dm' && recipient ? (
                    <>
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                        <Avatar u={recipient} size={80} />
                        <StatusDot status={onlineFriends.has(recipient.id) ? 'ONLINE' : 'offline'} border="#12131C" size={18} />
                      </div>
                      <h2 style={{ fontSize: 32, fontWeight: 900, color: '#E0E2EF', margin: '0 0 6px', letterSpacing: '-.02em' }}>{recipient.displayName}</h2>
                      <p style={{ fontSize: 14, color: '#3D4259', margin: 0 }}>Beginning of your conversation with <span style={{ color: '#7C5CFF', fontWeight: 700 }}>{recipient.displayName}</span>.</p>
                    </>
                  ) : activeTabType === 'channel' && activeChannel ? (
                    <>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 16, boxShadow: '0 8px 28px rgba(124,92,255,.45)' }}>#</div>
                      <h2 style={{ fontSize: 32, fontWeight: 900, color: '#E0E2EF', margin: '0 0 6px', letterSpacing: '-.02em' }}>#{activeChannel.name}</h2>
                      <p style={{ fontSize: 14, color: '#3D4259', margin: 0 }}>Start of <span style={{ color: '#7C5CFF', fontWeight: 700 }}>#{activeChannel.name}</span> channel.</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: grad(activeGroup?.id || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 16, boxShadow: '0 8px 28px rgba(0,0,0,.35)' }}>{(activeGroup?.name || '?')[0]}</div>
                      <h2 style={{ fontSize: 32, fontWeight: 900, color: '#E0E2EF', margin: '0 0 6px', letterSpacing: '-.02em' }}>{activeGroup?.name || 'Group'}</h2>
                    </>
                  )}
                </div>

                {/* Typing */}
                {typingUsers.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#6B7289', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B7289', display: 'block', animation: `blink 1.4s ease ${i * .2}s infinite` }} />)}
                    </div>
                    <em>{Array.from(typingUsers.values()).map((u: any) => u.displayName).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing…</em>
                  </div>
                )}

                {/* Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {messages.map((msg: any, i: number) => {
                    const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;
                    const sender = msg.sender || (isMe ? user : recipient) || {};
                    const prev = messages[i - 1];
                    const grouped = prev && prev.senderId === msg.senderId && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000);
                    const [c1] = seedColor(sender?.id || sender?.displayName || '?');
                    return (
                      <div key={msg.id} className="msg-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: `${grouped ? 3 : 14}px 12px 3px`, borderRadius: 12, margin: '0 -12px', position: 'relative' }}>
                        {/* Avatar col */}
                        <div style={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                          {!grouped ? <Avatar u={sender} size={40} /> : (
                            <span style={{ fontSize: 10, color: '#3D4259', marginTop: 6, opacity: 0, transition: 'opacity .15s' }} className="time-hint">{fmtTime(msg.createdAt)}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {!grouped && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
                              <span style={{ fontWeight: 800, fontSize: 15, color: c1 }}>{sender?.displayName || 'Unknown'}</span>
                              <span style={{ fontSize: 11, color: '#3D4259' }}>Today at {fmtTime(msg.createdAt)}</span>
                            </div>
                          )}
                          {msg.replyTo && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,.15)', fontSize: 12, color: '#6B7289', opacity: .7 }}>
                              ↩ {msg.replyTo.content?.slice(0, 60)}…
                            </div>
                          )}
                          {(msg.type === 'IMAGE' || msg.fileUrl?.match(/\.(gif|jpe?g|png|webp)$/i)) ? (
                            <>
                              {msg.content && <p style={{ fontSize: 15, color: '#C8CBDB', margin: '0 0 8px', lineHeight: 1.5 }}>{linkify(msg.content)}</p>}
                              <img src={msg.fileUrl} alt={msg.fileName || 'img'} style={{ maxWidth: 320, maxHeight: 240, borderRadius: 14, objectFit: 'contain', border: '1px solid rgba(255,255,255,.07)' }} />
                            </>
                          ) : msg.fileUrl ? (
                            <>
                              {msg.content && <p style={{ fontSize: 15, color: '#C8CBDB', margin: '0 0 8px', lineHeight: 1.5 }}>{linkify(msg.content)}</p>}
                              <a href={`${BE}${msg.fileUrl}`} target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'rgba(124,92,255,.12)', border: '1px solid rgba(124,92,255,.2)', color: '#7C5CFF', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                                📎 {msg.fileName}
                              </a>
                            </>
                          ) : (
                            <p style={{ fontSize: 15, color: '#C8CBDB', margin: 0, lineHeight: 1.6 }}>{linkify(msg.content || '')}</p>
                          )}

                          {/* Reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {Object.entries(msg.reactions).map(([emoji, users]: any) => (
                                <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(124,92,255,.12)', border: '1px solid rgba(124,92,255,.22)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#7C5CFF', transition: 'transform .15s' }}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                  {emoji} {users.length}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover actions */}
                        <div className="msg-actions" style={{ position: 'absolute', right: 12, top: -16, display: 'flex', background: '#1C1E2C', border: '1px solid rgba(255,255,255,.09)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.4)', zIndex: 10 }}>
                          {['❤️', '🔥', '👍', '😂'].map(e => (
                            <button key={e} onClick={() => addReaction(msg.id, e)}
                              style={{ width: 34, height: 34, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
                              onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,.07)'}
                              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                              {e}
                            </button>
                          ))}
                          <div style={{ width: 1, background: 'rgba(255,255,255,.08)', margin: '6px 2px' }} />
                          <button onClick={() => setReplyTo(msg)}
                            style={{ width: 34, height: 34, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7289', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
                            onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(255,255,255,.07)'; ev.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; ev.currentTarget.style.color = '#6B7289'; }}>
                            ↩
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* ── Input ── */}
              <div style={{ padding: '8px 20px 20px', flexShrink: 0 }}>
                {/* Emoji picker */}
                {showEmoji && (
                  <div style={{ position: 'absolute', bottom: 90, right: 80, zIndex: 50, background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 16, width: 344, maxHeight: 260, overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.5)', animation: 'popIn .15s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 4 }}>
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => { setInputText(t => t + e); setShowEmoji(false); }}
                          style={{ width: 34, height: 34, fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,.07)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {showGif && (
                  <div style={{ position: 'absolute', bottom: 90, right: 80, zIndex: 50, background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 16, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.5)', animation: 'popIn .15s ease' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {['gaming', 'funny', 'anime', 'chill'].map(c => (
                        <button key={c} onClick={() => setGifCategory(c)}
                          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', background: gifCategory === c ? 'linear-gradient(135deg,#7C5CFF,#35E7D2)' : 'rgba(255,255,255,.06)', color: gifCategory === c ? '#fff' : '#6B7289' }}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {GIFS.filter(g => g.cat === gifCategory).map(g => (
                        <button key={g.name} onClick={() => sendGif(g.url, g.name)}
                          style={{ borderRadius: 12, overflow: 'hidden', border: 'none', cursor: 'pointer', transition: 'transform .15s, opacity .15s' }}
                          onMouseEnter={ev => { ev.currentTarget.style.transform = 'scale(1.03)'; ev.currentTarget.style.opacity = '.85'; }}
                          onMouseLeave={ev => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.opacity = '1'; }}>
                          <img src={g.url} alt={g.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply bar */}
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', marginBottom: -1, background: 'rgba(124,92,255,.08)', border: '1px solid rgba(124,92,255,.2)', borderBottom: 'none', borderRadius: '14px 14px 0 0', fontSize: 13, color: '#9AA0B8' }}>
                    <span>↩ Replying to <strong style={{ color: '#7C5CFF' }}>{replyTo.sender?.displayName || 'someone'}</strong></span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontSize: 20, lineHeight: 1 }}>×</button>
                  </div>
                )}
                {attachedFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', marginBottom: -1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderBottom: 'none', borderRadius: '14px 14px 0 0', fontSize: 13, color: '#9AA0B8' }}>
                    📎 {attachedFile.name}
                    <button onClick={() => setAttachedFile(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontSize: 18 }}>×</button>
                  </div>
                )}

                <form onSubmit={sendMessage}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)', borderRadius: replyTo || attachedFile ? '0 0 16px 16px' : 16, transition: 'border-color .2s' }}
                    onFocus={() => { }}>
                    {/* Attach */}
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(124,92,255,.2)', border: 'none', cursor: 'pointer', color: '#7C5CFF', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s, transform .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#7C5CFF'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(45deg)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,92,255,.2)'; e.currentTarget.style.color = '#7C5CFF'; e.currentTarget.style.transform = 'none'; }}>
                      +
                    </button>
                    <input type="file" ref={fileInputRef} onChange={e => { if (e.target.files?.[0]) setAttachedFile(e.target.files[0]); }} style={{ display: 'none' }} />

                    <textarea ref={textareaRef} value={inputText}
                      onChange={e => {
                        setInputText(e.target.value);
                        e.target.style.height = '24px';
                        e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                        if (socket && activeTab !== 'friends') socket.emit('typing', { to: activeTab, type: activeTabType });
                      }}
                      onKeyDown={onInputKey}
                      placeholder={`Message ${activeTabType === 'channel' ? '#' : '@'}${chatTitle}`}
                      rows={1}
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#C8CBDB', fontSize: 15, lineHeight: 1.5, resize: 'none', height: 24, maxHeight: 140, fontFamily: 'inherit', padding: 0 }} />

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button type="button" style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#3D4259', transition: 'color .15s, background .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#3D4259'; e.currentTarget.style.background = 'transparent'; }}>🎁</button>
                      <button type="button" onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
                        style={{ height: 32, padding: '0 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, letterSpacing: '.08em', borderRadius: 8, color: '#3D4259', transition: 'color .15s, background .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#3D4259'; e.currentTarget.style.background = 'transparent'; }}>GIF</button>
                      <button type="button" onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
                        style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#3D4259', transition: 'color .15s, background .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#3D4259'; e.currentTarget.style.background = 'transparent'; }}>😀</button>
                      {inputText.trim() && (
                        <button type="submit" style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,92,255,.4)', transition: 'transform .15s, box-shadow .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,92,255,.6)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,92,255,.4)'; }}>
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Members panel ── */}
          {isChatOpen && (
            <aside style={{ width: 240, flexShrink: 0, overflowY: 'auto', background: '#0E0F17', borderLeft: '1px solid rgba(255,255,255,.05)', padding: '16px 8px' }}>
              {onlineFriendsList.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', padding: '0 8px', marginBottom: 8 }}>Online — {onlineFriendsList.length}</p>
                  {onlineFriendsList.map(f => (
                    <button key={f.id} className="chan-btn" onClick={() => openChat(f.id, 'dm', f.displayName)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar u={f} size={34} />
                        <StatusDot status="ONLINE" border="#0E0F17" size={10} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#C8CBDB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 148 }}>{f.displayName}</span>
                        <span style={{ fontSize: 11, color: '#3D4259', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 148 }}>{f.customStatus || 'Online'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {offlineFriendsList.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', padding: '0 8px', marginBottom: 8 }}>Offline — {offlineFriendsList.length}</p>
                  {offlineFriendsList.map(f => (
                    <button key={f.id} className="chan-btn" onClick={() => openChat(f.id, 'dm', f.displayName)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, marginBottom: 2, background: 'transparent', border: 'none', cursor: 'pointer', opacity: .45 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar u={f} size={34} />
                        <StatusDot status="offline" border="#0E0F17" size={10} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#6B7289', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 148 }}>{f.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
              {onlineFriendsList.length === 0 && offlineFriendsList.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 32, color: '#3D4259', fontSize: 13 }}>No members yet</div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          INCOMING CALL
      ════════════════════════════════════════════ */}
      {call?.isReceiving && (
        <Overlay onClose={() => endCall()}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', width: 320, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .2s ease' }}>
            <div style={{ position: 'relative' }}>
              <Avatar u={{ id: call.callerId, displayName: call.callerName }} size={88} />
              <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(124,92,255,.4)', animation: 'ring 1.8s ease infinite' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#E0E2EF', margin: '0 0 6px' }}>{call.callerName}</h3>
              <p style={{ fontSize: 14, color: '#3D4259', margin: 0 }}>Incoming {call.type} call…</p>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <button onClick={() => acceptCall()} style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#3DDC84,#2ab870)', border: 'none', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 22px rgba(61,220,132,.45)', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>📞</button>
              <button onClick={() => endCall()} style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#FF5C6C,#c0392b)', border: 'none', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 22px rgba(255,92,108,.45)', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>📵</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Active call bar */}
      {call?.isActive && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderRadius: 18, background: 'linear-gradient(135deg,#3DDC84,#2ab870)', boxShadow: '0 8px 32px rgba(61,220,132,.45)', animation: 'fadeIn .25s ease' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'blink 1.8s ease infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#04030A' }}>In Call · {call.callerName}</span>
          <button onClick={() => toggleMute()} style={{ width: 34, height: 34, borderRadius: 10, background: isMuted ? 'rgba(255,92,108,.4)' : 'rgba(255,255,255,.25)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎤</button>
          <button onClick={() => endCall()} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,92,108,.55)', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SETTINGS FULL SCREEN
      ════════════════════════════════════════════ */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', background: '#070910', animation: 'fadeIn .15s ease' }}>
          {/* Left nav */}
          <div style={{ width: 220, background: '#0E0F17', borderRight: '1px solid rgba(255,255,255,.05)', display: 'flex', flexDirection: 'column', padding: '56px 12px 24px', flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', padding: '0 10px', marginBottom: 8 }}>User Settings</p>
            {(['account', 'profile', 'appearance'] as const).map(k => (
              <button key={k} onClick={() => setSettingsTab(k)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: settingsTab === k ? 'rgba(124,92,255,.18)' : 'transparent', border: 'none', cursor: 'pointer', color: settingsTab === k ? '#fff' : '#6B7289', fontSize: 14, fontWeight: 700, textTransform: 'capitalize', transition: 'background .14s, color .14s' }}>
                {k === 'account' ? '👤 My Account' : k === 'profile' ? '✏️ Edit Profile' : '🎨 Appearance'}
              </button>
            ))}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              {[{ l: '🚪 Log Out', fn: () => logout(), danger: false }, { l: '🗑️ Delete Account', fn: deleteAccount, danger: true }].map(b => (
                <button key={b.l} onClick={b.fn}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: b.danger ? '#FF5C6C' : '#FF5C6C', fontSize: 14, fontWeight: 700, transition: 'background .14s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,92,108,.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {b.l}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '60px 64px' }}>
            <div style={{ maxWidth: 680 }}>

              {settingsTab === 'account' && (
                <div style={{ animation: 'slideUp .2s ease' }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, color: '#E0E2EF', margin: '0 0 32px', letterSpacing: '-.02em' }}>My Account</h2>
                  {/* Banner card */}
                  <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,.07)' }}>
                    <div style={{ height: 120, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 40%, rgba(255,255,255,.12) 0%, transparent 55%)' }} />
                    </div>
                    <div style={{ background: '#1A1C28', padding: '0 24px 24px' }}>
                      <div style={{ marginTop: -36, marginBottom: 12, position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={() => avatarInputRef.current?.click()}>
                        <div style={{ padding: 4, borderRadius: '50%', background: '#1A1C28', display: 'inline-block' }}>
                          <Avatar u={user} size={72} />
                        </div>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)', opacity: 0, transition: 'opacity .15s', fontSize: 12, fontWeight: 800, color: '#fff' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                          Edit
                        </div>
                        <input type="file" accept="image/*" ref={avatarInputRef} onChange={uploadAvatar} style={{ display: 'none' }} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#E0E2EF', marginBottom: 2 }}>{user?.displayName}</div>
                      <div style={{ fontSize: 14, color: '#3D4259' }}>@{user?.username}</div>
                    </div>
                  </div>
                  <div style={{ background: '#1A1C28', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,.07)' }}>
                    {[['Display Name', user?.displayName], ['Username', '@' + (user?.username || '')]].map(([l, v]) => (
                      <div key={l as string} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{l}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#E0E2EF', fontSize: 15, fontWeight: 600 }}>{v}</span>
                          {l === 'Display Name' && <button onClick={() => setSettingsTab('profile')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7C5CFF', fontSize: 13, fontWeight: 800 }}>Edit</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'profile' && (
                <div style={{ animation: 'slideUp .2s ease' }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, color: '#E0E2EF', margin: '0 0 32px', letterSpacing: '-.02em' }}>Edit Profile</h2>
                  <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {[
                      { l: 'Display Name', v: editName, set: setEditName, ph: 'Your name', multi: false },
                      { l: 'Bio', v: editBio, set: setEditBio, ph: 'Tell people about yourself…', multi: true },
                      { l: 'Custom Status', v: editStatus, set: setEditStatus, ph: 'Playing something awesome…', multi: false },
                    ].map(({ l, v, set, ph, multi }) => (
                      <div key={l}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{l}</p>
                        {multi ? (
                          <textarea value={v} onChange={e => (set as any)(e.target.value)} placeholder={ph} rows={3} className="focus-ring"
                            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#C8CBDB', fontSize: 14, fontFamily: 'inherit', resize: 'none' }} />
                        ) : (
                          <input value={v} onChange={e => (set as any)(e.target.value)} placeholder={ph} className="focus-ring"
                            style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#C8CBDB', fontSize: 14 }} />
                        )}
                      </div>
                    ))}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Avatar</p>
                      <button type="button" onClick={() => avatarInputRef.current?.click()}
                        style={{ padding: '11px 22px', borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', color: '#C8CBDB', fontSize: 14, fontWeight: 700 }}>
                        📸 Upload Photo
                      </button>
                    </div>
                    <button type="submit"
                      style={{ height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontSize: 16, fontWeight: 800, boxShadow: '0 6px 22px rgba(124,92,255,.4)', transition: 'transform .15s, box-shadow .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(124,92,255,.55)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(124,92,255,.4)'; }}>
                      Save Changes ✓
                    </button>
                  </form>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div style={{ animation: 'slideUp .2s ease' }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, color: '#E0E2EF', margin: '0 0 32px', letterSpacing: '-.02em' }}>Appearance</h2>
                  <div style={{ background: '#1A1C28', borderRadius: 18, padding: 24, border: '1px solid rgba(255,255,255,.07)', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#E0E2EF', fontSize: 15 }}>Dark Mode</div>
                        <div style={{ fontSize: 13, color: '#3D4259', marginTop: 4 }}>The abyss stares back, beautifully.</div>
                      </div>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 2, cursor: 'pointer' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Accent Colors</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {PALETTES.map(([c1, c2]) => (
                        <button key={c1} style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${c1},${c2})`, border: 'none', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', boxShadow: `0 4px 14px ${c1}44` }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = `0 6px 20px ${c1}66`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${c1}44`; }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ESC to close */}
          <div style={{ paddingTop: 56, paddingRight: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowSettings(false)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: '2px solid rgba(255,255,255,.15)', cursor: 'pointer', color: '#6B7289', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.4)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; e.currentTarget.style.color = '#6B7289'; }}>✕</button>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#3D4259' }}>ESC</span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════ */}
      {showGroupModal && (
        <Overlay onClose={() => setShowGroupModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 440, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden' }}>
            <div style={{ padding: '28px 28px 16px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#E0E2EF', margin: '0 0 8px' }}>Create Group Chat</h2>
              <p style={{ fontSize: 13, color: '#3D4259', margin: 0 }}>Add friends to start a group conversation.</p>
            </div>
            <form onSubmit={async e => { e.preventDefault(); try { const r = await api('/api/messages/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: groupName, memberIds: groupMembers }) }); if (r.ok) { setGroupName(''); setGroupMembers([]); setShowGroupModal(false); fetchGroups(); } } catch { } }}>
              <div style={{ padding: '0 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Group Name</p>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Squad name…" required className="focus-ring"
                    style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: '#C8CBDB', fontSize: 14 }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Add Friends</p>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allFriends.map(f => {
                      const sel = groupMembers.includes(f.id);
                      return (
                        <button key={f.id} type="button" onClick={() => setGroupMembers(p => sel ? p.filter(x => x !== f.id) : [...p, f.id])}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 11, background: sel ? 'rgba(124,92,255,.14)' : 'rgba(255,255,255,.04)', border: `1px solid ${sel ? 'rgba(124,92,255,.3)' : 'rgba(255,255,255,.07)'}`, cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar u={f} size={30} /><span style={{ fontWeight: 700, color: '#E0E2EF', fontSize: 14 }}>{f.displayName}</span></div>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: sel ? 'linear-gradient(135deg,#7C5CFF,#35E7D2)' : 'transparent', border: `2px solid ${sel ? 'transparent' : 'rgba(255,255,255,.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <button type="button" onClick={() => setShowGroupModal(false)} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontWeight: 700 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 14 }}>Create Group</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {showServerModal && (
        <Overlay onClose={() => setShowServerModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '36px 32px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px', boxShadow: '0 8px 28px rgba(124,92,255,.45)' }}>🏰</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#E0E2EF', margin: '0 0 10px' }}>Create Your Server</h2>
              <p style={{ fontSize: 14, color: '#3D4259', margin: 0 }}>Your server is where you and your crew hang. Give it a name.</p>
            </div>
            <form onSubmit={async e => { e.preventDefault(); try { const r = await api('/api/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: serverName }) }); if (r.ok) { setServerName(''); setShowServerModal(false); fetchServers(); } } catch { } }}>
              <div style={{ padding: '0 32px 20px' }}>
                <input value={serverName} onChange={e => setServerName(e.target.value)} placeholder="My Awesome Server" required className="focus-ring"
                  style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: '#C8CBDB', fontSize: 15, textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px 28px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <button type="button" onClick={() => setShowServerModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontWeight: 700, fontSize: 14 }}>Back</button>
                <button type="submit" style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 15 }}>Create Server 🎉</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {showJoinModal && (
        <Overlay onClose={() => setShowJoinModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '36px 32px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#3DDC84,#2ab870)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>🚀</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#E0E2EF', margin: '0 0 10px' }}>Join a Server</h2>
              <p style={{ fontSize: 14, color: '#3D4259', margin: 0 }}>Enter an invite code to join an existing community.</p>
            </div>
            <form onSubmit={async e => { e.preventDefault(); try { const r = await api('/api/servers/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteCode: joinCode }) }); const d = await r.json(); if (r.ok) { setJoinCode(''); setShowJoinModal(false); fetchServers(); } else alert(d.error || 'Not found'); } catch { } }}>
              <div style={{ padding: '0 32px 20px' }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="h7x9k3b" required className="focus-ring"
                  style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: '#C8CBDB', fontSize: 18, fontWeight: 800, letterSpacing: '.1em', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px 28px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <button type="button" onClick={() => setShowJoinModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontWeight: 700, fontSize: 14 }}>Back</button>
                <button type="submit" style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#3DDC84,#2ab870)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 15 }}>Join Server →</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {showChannelModal && (
        <Overlay onClose={() => setShowChannelModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 440, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden' }}>
            <div style={{ padding: '28px 28px 16px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#E0E2EF', margin: 0 }}>Create Channel</h2>
            </div>
            <form onSubmit={async e => { e.preventDefault(); if (!serverId) return; try { const r = await api(`/api/servers/${serverId}/channels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: channelName, type: channelType }) }); if (r.ok) { setChannelName(''); setShowChannelModal(false); fetchServerDetail(serverId); } } catch { } }}>
              <div style={{ padding: '0 28px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Channel Type</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['TEXT', '# Text', 'Chat with text and images'] as const, ['VOICE', '🔊 Voice', 'Hang out with voice'] as const].map(([t, l, d]) => (
                      <button key={t} type="button" onClick={() => setChannelType(t)}
                        style={{ padding: '14px', borderRadius: 12, textAlign: 'left', background: channelType === t ? 'rgba(124,92,255,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${channelType === t ? 'rgba(124,92,255,.4)' : 'rgba(255,255,255,.07)'}`, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 800, color: '#E0E2EF', fontSize: 14, marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 11, color: '#3D4259' }}>{d}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#3D4259', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Channel Name</p>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3D4259', fontWeight: 800, fontSize: 16 }}>#</span>
                    <input value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="new-channel" required className="focus-ring"
                      style={{ width: '100%', height: 44, padding: '0 16px 0 32px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: '#C8CBDB', fontSize: 14 }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <button type="button" onClick={() => setShowChannelModal(false)} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontWeight: 700 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 14 }}>Create Channel</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}

      {showInviteModal && (
        <Overlay onClose={() => setShowInviteModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 360, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ padding: '32px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔗</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#E0E2EF', margin: 0 }}>Invite to Server</h2>
              <p style={{ fontSize: 13, color: '#3D4259', margin: 0 }}>Share this code with your friends.</p>
              <div style={{ width: '100%', padding: 18, borderRadius: 14, background: 'rgba(124,92,255,.1)', border: '1px solid rgba(124,92,255,.25)', fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#E0E2EF', letterSpacing: '.15em', userSelect: 'all' }}>
                {inviteCode}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '0 28px 28px' }}>
              <button onClick={() => setShowInviteModal(false)} style={{ flex: 1, height: 44, borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', color: '#6B7289', fontWeight: 700, fontSize: 14 }}>Close</button>
              <button onClick={() => navigator.clipboard.writeText(inviteCode)} style={{ flex: 1, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 14 }}>📋 Copy</button>
            </div>
          </div>
        </Overlay>
      )}

      {showAddFriendModal && (
        <Overlay onClose={() => setShowAddFriendModal(false)}>
          <div style={{ background: '#1A1C28', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, width: '100%', maxWidth: 400, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'popIn .18s ease', overflow: 'hidden' }}>
            <div style={{ padding: '28px 28px 16px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#E0E2EF', margin: '0 0 8px' }}>Add Friend</h2>
              <p style={{ fontSize: 13, color: '#3D4259', margin: 0 }}>You can add friends with their Guildzee username.</p>
            </div>
            <form onSubmit={handleAddFriend}>
              <div style={{ padding: '0 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input value={addFriendUsername} onChange={e => setAddFriendUsername(e.target.value)} placeholder="Username…" required className="focus-ring"
                  style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 11, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: '#C8CBDB', fontSize: 14 }} />
                
                {addFriendStatus.type && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: addFriendStatus.type === 'success' ? 'rgba(61,220,132,.1)' : 'rgba(255,92,108,.1)', border: `1px solid ${addFriendStatus.type === 'success' ? 'rgba(61,220,132,.2)' : 'rgba(255,92,108,.2)'}`, color: addFriendStatus.type === 'success' ? '#3DDC84' : '#FF5C6C' }}>
                    {addFriendStatus.msg}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <button type="button" onClick={() => setShowAddFriendModal(false)} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7289', fontWeight: 700 }}>Close</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFF,#35E7D2)', border: 'none', cursor: 'pointer', color: '#04030A', fontWeight: 800, fontSize: 14 }}>Send Request</button>
              </div>
            </form>
          </div>
        </Overlay>
      )}
    </div>
  );
}
