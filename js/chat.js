"use strict";

(function initChat() {
  if (typeof CHAT_CONFIG !== 'undefined' && CHAT_CONFIG.enabled === false) return;
  const session = typeof AuthStore !== 'undefined' ? AuthStore.getSession() : null;
  if (!session) return;

  const CFG = Object.assign({
    title: 'Messages', subtitle: 'Messages Comrades',
    placeholder: 'Message…', maxMessages: 300,
    notifTitle: '💬 {sender}', notifBody: '{preview}',
  }, typeof CHAT_CONFIG !== 'undefined' ? CHAT_CONFIG : {});

  const API       = 'api/chat.php';
  const POLL_MS   = 3000;
  const ONLINE_MS = 18000;
  const KEY_DRAFT = 'ls_chat_draft_' + session.id;
  const KEY_NOTIF = 'ls_chat_notif';
  const CHAN_NAME  = 'lalsalam_chat_v9';
  const LS_KEY    = 'ls_chat_msgs_v9';
  const EMOJIS    = ['👍','❤️','😂','😮','😢','🙏','🔥','✅'];
  const PALETTES  = [
    ['#e17055','#fdcb6e'],['#6c5ce7','#a29bfe'],['#00b894','#55efc4'],
    ['#e84393','#fd79a8'],['#0984e3','#74b9ff'],['#d63031','#ff7675'],
    ['#00cec9','#81ecec'],['#fdcb6e','#f9ca24'],['#6ab04c','#badc58'],
    ['#f0932b','#ffbe76'],
  ];

  let isOpen = false, unread = 0, replyTo = null, pickerMsgId = null;
  let lastTs = 0, pollTimer = null, onlineTimer = null, typingTimer = null;
  let backendOk = true, notifOn = localStorage.getItem(KEY_NOTIF) === '1';
  let channel = null, membersOpen = false;
  let swipeStartX = 0, swipeRow = null;
  const renderedIds = new Set();
  const onlineUsers = new Map();

  try { channel = new BroadcastChannel(CHAN_NAME); } catch(_) {}
  if (channel) channel.onmessage = e => {
    const { type, payload } = e.data || {};
    if (type === 'msg') { appendMsg(payload, true); if (!isOpen) bumpBadge(); pingBubble(); }
  };

  const S = document.createElement('style');
  S.textContent = `
  #ch-bubble {
    position:fixed;
    bottom:calc(env(safe-area-inset-bottom,0px) + 22px);
    right:calc(env(safe-area-inset-right,0px) + 22px);
    z-index:600; width:58px; height:58px; border-radius:50%; border:none;
    background:linear-gradient(145deg,#25d366,#075e54);
    box-shadow:0 6px 24px rgba(7,94,84,.55), 0 2px 8px rgba(0,0,0,.3);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
    touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  }
  #ch-bubble svg { width:28px; height:28px; fill:#fff; display:block; }
  @media(hover:hover){#ch-bubble:hover{transform:scale(1.1);box-shadow:0 8px 32px rgba(7,94,84,.7);}}
  #ch-bubble:active { transform:scale(.9); }
  #ch-bubble.open { transform:rotate(8deg) scale(1.05); }
  @keyframes chPing {
    0%,100%{ box-shadow:0 6px 24px rgba(7,94,84,.55); }
    50%{ box-shadow:0 6px 40px rgba(37,211,102,.9),0 0 0 10px rgba(37,211,102,.12); }
  }
  #ch-bubble.ping { animation:chPing .65s ease; }

  #ch-badge {
    position:absolute; top:-5px; right:-5px; min-width:20px; height:20px;
    padding:0 5px; border-radius:10px; border:2.5px solid #0a0a0f;
    background:#e84545; color:#fff; font-size:.6rem; font-weight:800;
    display:none; align-items:center; justify-content:center; line-height:1;
  }

  #ch-scroll-btn {
    position:absolute; bottom:68px; right:12px; z-index:5;
    width:36px; height:36px; border-radius:50%; border:none;
    background:#1f2c34; color:#e9edef;
    box-shadow:0 2px 12px rgba(0,0,0,.5);
    display:none; align-items:center; justify-content:center;
    cursor:pointer; font-size:.9rem; flex-direction:column; gap:1px;
  }
  #ch-scroll-btn.show { display:flex; }
  #ch-scroll-count {
    font-size:.5rem; font-weight:800; color:#25d366; line-height:1; display:none;
  }
  #ch-scroll-count.show { display:block; }

  #ch-window {
    position:fixed;
    bottom:calc(env(safe-area-inset-bottom,0px) + 92px);
    right:calc(env(safe-area-inset-right,0px) + 22px);
    z-index:600; width:385px; max-width:calc(100vw - 28px);
    height:min(580px, calc(100dvh - 120px));
    background:#111b21; border-radius:20px; overflow:hidden;
    display:flex; flex-direction:column;
    box-shadow:0 32px 80px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05);
    transform:translateY(20px) scale(.94); opacity:0; pointer-events:none;
    transition:transform .3s cubic-bezier(.34,1.4,.64,1), opacity .28s;
    overscroll-behavior:contain;
  }
  #ch-window.open { transform:translateY(0) scale(1); opacity:1; pointer-events:all; }
  @media(max-width:450px){
    #ch-window {
      right:0; left:0; bottom:0; width:100%; max-width:100%; border-radius:20px 20px 0 0;
      height:min(92dvh,92vh); padding-bottom:env(safe-area-inset-bottom,0px);
    }
    #ch-bubble { right:16px; bottom:calc(env(safe-area-inset-bottom,0px) + 16px); }
  }
  @media(max-height:500px) and (orientation:landscape){
    #ch-window { height:min(300px,calc(100dvh - 80px)); }
  }

  #ch-head {
    flex-shrink:0; display:flex; align-items:center; gap:10px;
    padding:10px 14px; background:#1f2c34;
    border-bottom:1px solid rgba(255,255,255,.06);
  }
  .ch-hav {
    width:40px; height:40px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-size:1.2rem;
    background:linear-gradient(135deg,#25d366,#075e54);
  }
  .ch-htitle { flex:1; min-width:0; }
  .ch-htitle h4 { margin:0; font-size:.88rem; font-weight:700; color:#e9edef; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ch-htitle p  { margin:.1rem 0 0; font-size:.64rem; color:#8696a0; }
  .ch-hbtns { display:flex; gap:6px; flex-shrink:0; }
  .ch-hbtn {
    width:32px; height:32px; border-radius:50%; border:none; cursor:pointer;
    background:rgba(255,255,255,.07); color:#8696a0; font-size:.85rem;
    display:flex; align-items:center; justify-content:center; transition:.18s;
  }
  .ch-hbtn:hover { background:rgba(255,255,255,.14); color:#e9edef; }
  .ch-hbtn.active { background:rgba(37,211,102,.18); color:#25d366; }

  #ch-bar {
    flex-shrink:0; padding:4px 14px; background:#0d1418;
    font-size:.64rem; color:#8696a0; display:flex; align-items:center; gap:7px;
    border-bottom:1px solid rgba(255,255,255,.04);
  }
  .ch-dot { width:7px; height:7px; border-radius:50%; background:#25d366; flex-shrink:0; }
  #ch-mode {
    margin-left:auto; font-size:.58rem; padding:2px 8px; border-radius:20px; font-weight:700;
  }
  .ch-mode-live { background:rgba(37,211,102,.14); color:#25d366; }
  .ch-mode-local { background:rgba(245,200,66,.14); color:#f5c842; }

  #ch-msgs {
    flex:1; overflow-y:auto; overflow-x:hidden;
    padding:10px 10px 6px; display:flex; flex-direction:column; gap:2px;
    background:#0b141a; scrollbar-width:thin; scrollbar-color:#1f2c34 transparent;
    -webkit-overflow-scrolling:touch; position:relative;
    overscroll-behavior:contain;
  }
  #ch-msgs::-webkit-scrollbar { width:3px; }
  #ch-msgs::-webkit-scrollbar-thumb { background:#1f2c34; border-radius:2px; }

  .ch-date {
    align-self:center; font-size:.6rem; color:#8696a0;
    background:#182229; padding:3px 12px; border-radius:20px; margin:8px 0 4px;
    box-shadow:0 1px 4px rgba(0,0,0,.3);
  }

  .ch-row {
    display:flex; gap:8px; max-width:86%;
    animation:chIn .18s ease both; position:relative;
    transition:transform .15s ease;
  }
  @keyframes chIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  .ch-row.me   { align-self:flex-end; flex-direction:row-reverse; }
  .ch-row.them { align-self:flex-start; }
  .ch-row.grouped .ch-av  { visibility:hidden; }
  .ch-row.grouped .ch-name { display:none; }
  .ch-row.swiping { user-select:none; }

  .ch-av {
    width:28px; height:28px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:.7rem; font-weight:800; color:#fff; margin-top:2px;
    background:linear-gradient(135deg,#2a3942,#1f2c34);
  }

  .ch-bwrap { display:flex; flex-direction:column; gap:2px; min-width:0; max-width:100%; }
  .ch-name { font-size:.62rem; font-weight:700; padding:0 6px; color:#8696a0; }

  .ch-bbl {
    padding:7px 11px 5px; border-radius:0 14px 14px 14px;
    font-size:.875rem; color:#e9edef; line-height:1.5;
    word-break:break-word; white-space:pre-wrap; position:relative;
    cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.25);
    background:#202c33; max-width:100%;
    -webkit-user-select:text; user-select:text;
  }
  .ch-row.me .ch-bbl {
    background:#005c4b; border-radius:14px 0 14px 14px;
  }
  .ch-bbl a { color:#53bdeb; text-decoration:underline; word-break:break-all; }

  .ch-rp {
    background:rgba(255,255,255,.07); border-left:3px solid #25d366;
    border-radius:6px 6px 0 0; padding:4px 8px; margin:-7px -11px 7px;
    font-size:.7rem; color:#8696a0; cursor:pointer;
  }
  .ch-rp strong { display:block; color:#25d366; font-size:.66rem; }
  .ch-row.me .ch-rp { border-color:#53bdeb; }
  .ch-row.me .ch-rp strong { color:#53bdeb; }

  .ch-swipe-icon {
    position:absolute; top:50%; transform:translateY(-50%) scale(0);
    font-size:1.1rem; opacity:0; transition:opacity .15s, transform .15s;
    pointer-events:none; z-index:1;
  }
  .ch-row.them .ch-swipe-icon { right:-28px; }
  .ch-row.me   .ch-swipe-icon { left:-28px; }
  .ch-row.swipe-ready .ch-swipe-icon { transform:translateY(-50%) scale(1); opacity:.7; }

  .ch-epick {
    display:none; position:absolute; z-index:20;
    background:#1f2c34; border:1px solid rgba(255,255,255,.1);
    border-radius:14px; padding:6px 8px;
    box-shadow:0 10px 32px rgba(0,0,0,.75);
    gap:4px; flex-wrap:nowrap; align-items:center;
  }
  .ch-epick.show { display:flex; }
  .ch-row.me   .ch-epick { right:0; bottom:calc(100% + 6px); }
  .ch-row.them .ch-epick { left:0; bottom:calc(100% + 6px); }
  .ch-ebtn {
    width:34px; height:34px; border:none; background:none;
    font-size:1.15rem; cursor:pointer; border-radius:8px; transition:.15s;
    display:flex; align-items:center; justify-content:center;
  }
  .ch-ebtn:hover { background:rgba(255,255,255,.12); }
  .ch-epick-reply {
    width:34px; height:34px; border:none;
    background:rgba(37,211,102,.1); border-radius:8px; cursor:pointer;
    color:#25d366; font-size:.8rem; display:flex; align-items:center; justify-content:center;
    border-left:1px solid rgba(255,255,255,.08); margin-left:2px;
  }
  .ch-epick-reply:hover { background:rgba(37,211,102,.2); }

  .ch-reacts { display:flex; flex-wrap:wrap; gap:4px; padding:2px 6px 0; }
  .ch-react {
    background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
    border-radius:20px; padding:2px 8px; font-size:.72rem; cursor:pointer;
    transition:.15s; display:inline-flex; align-items:center; gap:3px; line-height:1.4;
  }
  .ch-react:hover { background:rgba(37,211,102,.14); border-color:rgba(37,211,102,.35); }
  .ch-react.mine  { background:rgba(37,211,102,.14); border-color:rgba(37,211,102,.45); }
  .ch-react-count { font-size:.65rem; font-weight:700; color:#8696a0; }
  .ch-react.mine .ch-react-count { color:#25d366; }

  .ch-meta { font-size:.58rem; color:#8696a0; padding:1px 6px; display:flex; align-items:center; gap:4px; }
  .ch-row.me .ch-meta { justify-content:flex-end; }
  .ch-ticks { font-size:.7rem; color:#53bdeb; }

  #ch-typing {
    flex-shrink:0; display:none; align-items:center; gap:8px;
    padding:4px 14px; font-size:.64rem; color:#8696a0;
    background:#0b141a; border-top:1px solid rgba(255,255,255,.03);
  }
  #ch-typing.show { display:flex; }
  .ch-dots { display:inline-flex; gap:3px; align-items:center; }
  .ch-dot2 { width:5px; height:5px; border-radius:50%; background:#8696a0; animation:chDot .9s ease-in-out infinite; }
  .ch-dot2:nth-child(2){animation-delay:.18s;} .ch-dot2:nth-child(3){animation-delay:.36s;}
  @keyframes chDot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

  #ch-rbar {
    flex-shrink:0; display:none; align-items:center; gap:8px; padding:6px 12px;
    background:rgba(37,211,102,.06); border-top:2px solid rgba(37,211,102,.25);
  }
  #ch-rbar.show { display:flex; }
  .ch-rb-line { flex:1; min-width:0; }
  .ch-rb-who  { font-size:.65rem; font-weight:700; color:#25d366; }
  .ch-rb-txt  { font-size:.72rem; color:#8696a0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #ch-rcancel { background:none; border:none; color:#8696a0; cursor:pointer; font-size:1rem; flex-shrink:0; padding:4px; }
  #ch-rcancel:hover { color:#e9edef; }

  #ch-foot {
    flex-shrink:0; display:flex; align-items:flex-end; gap:8px;
    padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));
    background:#1f2c34; border-top:1px solid rgba(255,255,255,.05);
  }
  #ch-inp {
    flex:1; background:#2a3942; border:none; outline:none;
    border-radius:22px; padding:9px 14px; color:#e9edef;
    font-size:.94rem; font-family:inherit; resize:none;
    min-height:40px; max-height:100px; line-height:1.45;
    -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  #ch-inp::placeholder { color:#8696a0; }
  #ch-inp::-webkit-scrollbar { display:none; }
  #ch-send {
    width:40px; height:40px; border-radius:50%; border:none; flex-shrink:0;
    background:linear-gradient(145deg,#25d366,#128c7e); color:#fff;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:transform .18s, opacity .18s;
    touch-action:manipulation;
  }
  #ch-send svg { width:17px; height:17px; stroke:#fff; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
  #ch-send:hover { transform:scale(1.1); }
  #ch-send:active { transform:scale(.88); }
  #ch-send:disabled { opacity:.3; transform:none; cursor:default; }

  #ch-members {
    position:absolute; inset:0; z-index:15;
    background:#0d1418; display:flex; flex-direction:column;
    transform:translateX(100%); transition:transform .28s cubic-bezier(.4,0,.2,1);
    pointer-events:none;
  }
  #ch-members.open { transform:translateX(0); pointer-events:all; }
  #ch-mhead {
    display:flex; align-items:center; gap:10px; padding:12px 14px;
    background:#1f2c34; border-bottom:1px solid rgba(255,255,255,.06); flex-shrink:0;
  }
  #ch-mhead h4 { margin:0; font-size:.88rem; color:#e9edef; flex:1; }
  #ch-mclose { background:none; border:none; color:#8696a0; cursor:pointer; font-size:1.1rem; }
  #ch-mlist { flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:4px; }
  .ch-mrow {
    display:flex; align-items:center; gap:10px; padding:8px 10px;
    border-radius:10px; transition:.15s;
  }
  .ch-mrow:hover { background:rgba(255,255,255,.05); }
  .ch-mav {
    width:36px; height:36px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:.82rem; font-weight:800; color:#fff;
  }
  .ch-mname { font-size:.82rem; color:#e9edef; flex:1; }
  .ch-monl { font-size:.6rem; color:#25d366; }
  .ch-moff { font-size:.6rem; color:#8696a0; }

  #ch-empty {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:10px; color:#8696a0; text-align:center; padding:20px;
  }
  #ch-empty-icon { font-size:3.5rem; opacity:.5; }
  #ch-empty strong { font-size:.9rem; color:#c9d1d9; }
  #ch-empty span { font-size:.78rem; }
  `;
  document.head.appendChild(S);

  document.body.insertAdjacentHTML('beforeend', `
  <button id="ch-bubble" aria-label="Open chat">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.145 2 11.259c0 2.93 1.39 5.54 3.57 7.27L4.5 22l3.98-2C9.62 20.63 10.78 21 12 21c5.52 0 10-4.145 10-9.259S17.52 2 12 2zm-3.5 10.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm3.5 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm3.5 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
    </svg>
    <span id="ch-badge"></span>
  </button>

  <div id="ch-window" role="dialog" aria-modal="true" aria-hidden="true">
    <div id="ch-head">
      <div class="ch-hav">💬</div>
      <div class="ch-htitle">
        <h4>${esc(CFG.title)}</h4>
        <p id="ch-sub">${esc(CFG.subtitle)}</p>
      </div>
      <div class="ch-hbtns">
        <button class="ch-hbtn" id="ch-members-btn" title="Members">👥</button>
        <button class="ch-hbtn ${notifOn?'active':''}" id="ch-notif-btn" title="Notifications">🔔</button>
        <button class="ch-hbtn" id="ch-close-btn" aria-label="Close chat">✕</button>
      </div>
    </div>

    <div id="ch-bar">
      <span class="ch-dot"></span>
      <span id="ch-online-txt">Connecting…</span>
      <span id="ch-mode" class="ch-mode-live">● Live</span>
    </div>

    <div id="ch-msgs" role="log" aria-live="polite">
      <div id="ch-empty">
        <div id="ch-empty-icon">💬</div>
        <strong>No messages yet</strong>
        <span>Start the conversation!</span>
      </div>
    </div>

    <div id="ch-typing">
      <div class="ch-dots"><div class="ch-dot2"></div><div class="ch-dot2"></div><div class="ch-dot2"></div></div>
      <span id="ch-typing-txt"></span>
    </div>

    <div id="ch-rbar">
      <div class="ch-rb-line">
        <div class="ch-rb-who" id="ch-rb-who"></div>
        <div class="ch-rb-txt" id="ch-rb-txt"></div>
      </div>
      <button id="ch-rcancel" aria-label="Cancel reply">✕</button>
    </div>

    <div id="ch-foot">
      <textarea id="ch-inp" rows="1" placeholder="${esc(CFG.placeholder)}" maxlength="1000" aria-label="Message"></textarea>
      <button id="ch-send" aria-label="Send">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>

    <button id="ch-scroll-btn" aria-label="Scroll to bottom">
      ↓<span id="ch-scroll-count"></span>
    </button>

    <div id="ch-members">
      <div id="ch-mhead">
        <h4>👥 Members</h4>
        <button id="ch-mclose">✕</button>
      </div>
      <div id="ch-mlist"></div>
    </div>
  </div>`);

  const bubble   = $('ch-bubble');
  const win      = $('ch-window');
  const msgBox   = $('ch-msgs');
  const inp      = $('ch-inp');
  const sendBtn  = $('ch-send');
  const badge    = $('ch-badge');
  const modeBadge= $('ch-mode');
  const onlineTxt= $('ch-online-txt');
  const typingEl = $('ch-typing');
  const typingTxt= $('ch-typing-txt');
  const rbar     = $('ch-rbar');
  const scrollBtn= $('ch-scroll-btn');
  const membersList = $('ch-mlist');

  function $(id) { return document.getElementById(id); }

  async function api(action, body = {}) {
    try {
      const r = await fetch(API, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({action, ...body}),
        signal: AbortSignal.timeout(7000),
      });
      const d = await r.json();
      if (!backendOk) { backendOk=true; setBadge(true); }
      return d;
    } catch(e) {
      if (backendOk) { backendOk=false; setBadge(false); }
      return null;
    }
  }
  function setBadge(live) {
    modeBadge.textContent = live ? '● Live' : '○ Local';
    modeBadge.className   = live ? 'ch-mode-live' : 'ch-mode-local';
  }

  bubble.onclick = toggle;
  $('ch-close-btn').onclick = close;
  $('ch-members-btn').onclick = openMembers;
  $('ch-mclose').onclick = closeMembers;
  $('ch-notif-btn').onclick = toggleNotif;
  $('ch-rcancel').onclick = cancelReply;
  $('ch-scroll-btn').onclick = () => scrollBottom(true);
  sendBtn.onclick = send;

  document.addEventListener('keydown', e => { if (e.key==='Escape' && isOpen) close(); });

  inp.addEventListener('keydown', e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inp.addEventListener('input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
    localStorage.setItem(KEY_DRAFT, inp.value);
    api('typing', {uid:session.id, username:session.username});
  });

  const draft = localStorage.getItem(KEY_DRAFT);
  if (draft) { inp.value=draft; inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,100)+'px'; }

  let scrollNewCount = 0;
  msgBox.addEventListener('scroll', () => {
    const atBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 80;
    if (atBottom) {
      scrollBtn.classList.remove('show');
      scrollNewCount = 0;
      $('ch-scroll-count').classList.remove('show');
    } else {
      scrollBtn.classList.add('show');
    }
  });

  document.addEventListener('pointerdown', e => {
    if (pickerMsgId && !e.target.closest('.ch-epick') && !e.target.closest('.ch-bbl')) {
      closePicker(); pickerMsgId = null;
    }
  });

  msgBox.addEventListener('touchstart', e => {
    swipeStartX = e.touches[0].clientX;
    swipeRow = e.target.closest('.ch-row');
  }, {passive:true});
  msgBox.addEventListener('touchmove', e => {
    if (!swipeRow) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const isMe = swipeRow.classList.contains('me');
    const dir = isMe ? -1 : 1;
    const move = dx * dir;
    if (move > 5 && move < 70) {
      swipeRow.style.transform = `translateX(${dx * .4}px)`;
      if (move > 40) swipeRow.classList.add('swipe-ready');
      else swipeRow.classList.remove('swipe-ready');
    }
  }, {passive:true});
  msgBox.addEventListener('touchend', () => {
    if (!swipeRow) return;
    swipeRow.style.transform = '';
    if (swipeRow.classList.contains('swipe-ready')) {
      const msgId = swipeRow.id.replace('chm-', '');
      const msgData = getMsgData(msgId);
      if (msgData) setReply(msgData);
    }
    swipeRow.classList.remove('swipe-ready');
    swipeRow = null;
  });

  function toggle() { isOpen ? close() : open(); }

  function open() {
    isOpen = true;
    win.classList.add('open'); win.removeAttribute('aria-hidden');
    bubble.classList.add('open');
    resetBadge();
    loadMsgs();
    startPolling();
    heartbeat();
    setTimeout(() => { scrollBottom(true); inp.focus(); }, 80);
  }

  function close() {
    isOpen = false;
    win.classList.remove('open'); win.setAttribute('aria-hidden','true');
    bubble.classList.remove('open');
    closeMembers();
    stopPolling();
  }

  function openMembers() {
    $('ch-members').classList.add('open');
    $('ch-members-btn').classList.add('active');
    membersOpen = true;
    renderMembers();
  }
  function closeMembers() {
    $('ch-members').classList.remove('open');
    $('ch-members-btn').classList.remove('active');
    membersOpen = false;
  }
  function renderMembers() {
    const rows = [...onlineUsers.entries()].map(([uid, uname]) => {
      const [g1,g2] = palette(uname);
      return `<div class="ch-mrow">
        <div class="ch-mav" style="background:linear-gradient(135deg,${g1},${g2})">${esc(uname[0].toUpperCase())}</div>
        <div class="ch-mname">${esc(uname)} ${uid===session.id?'<span style="color:#8696a0;font-size:.62rem">(you)</span>':''}</div>
        <span class="ch-monl">● Online</span>
      </div>`;
    }).join('');
    membersList.innerHTML = rows || '<div style="color:#8696a0;font-size:.8rem;padding:16px;text-align:center">No one else online</div>';
  }

  const msgDataMap = new Map();

  async function loadMsgs() {
    const d = await api('poll', {since:0});
    if (d?.ok && Array.isArray(d.messages)) {
      $('ch-empty')?.remove();
      d.messages.slice(-100).forEach((m,i) => appendMsg(m, false, i===d.messages.slice(-100).length-1));
      if (d.messages.length) lastTs = Math.max(...d.messages.map(m=>m.ts));
      scrollBottom(true);
    } else {
      loadLocal();
    }
    pollOnline();
  }

  function startPolling() {
    stopPolling();
    pollTimer   = setInterval(poll, POLL_MS);
    onlineTimer = setInterval(heartbeat, ONLINE_MS);
  }
  function stopPolling() {
    clearInterval(pollTimer); pollTimer=null;
    clearInterval(onlineTimer); onlineTimer=null;
  }

  async function poll() {
    const d = await api('poll', {since:lastTs});
    if (d?.ok && d.messages?.length) {
      $('ch-empty')?.remove();
      const atBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 100;
      d.messages.forEach(m => {
        if (renderedIds.has(m.id)) return;
        appendMsg(m, true, true);
        if (m.uid !== session.id) {
          if (!isOpen || !atBottom) { bumpBadge(); scrollNewCount++; updateScrollCount(); }
          pingBubble();
          if (notifOn && Notification.permission==='granted') fireNotif(m.username, m.text);
        }
      });
      lastTs = Math.max(...d.messages.map(m=>m.ts), lastTs);
      if (atBottom) scrollBottom(false);
    }
    if (d?.typing?.length) {
      const typers = d.typing.filter(u=>u!==session.username);
      if (typers.length) {
        typingTxt.textContent = typers.join(', ') + (typers.length===1?' is typing…':' are typing…');
        typingEl.classList.add('show');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(()=>typingEl.classList.remove('show'), 4000);
      } else typingEl.classList.remove('show');
    }
  }

  function heartbeat() {
    api('online', {uid:session.id, username:session.username});
  }
  async function pollOnline() {
    const d = await api('online_count', {});
    if (d?.ok) {
      const n = d.count||0;
      onlineTxt.textContent = n<=1 ? 'Just you online' : `${n} member${n!==1?'s':''} online`;
      onlineUsers.clear();
      onlineUsers.set(session.id, session.username);
      (d.users||[]).forEach(u => onlineUsers.set(u.uid||u.id||u.username, u.username));
      if (membersOpen) renderMembers();
    }
  }

  window.addEventListener('beforeunload', () => {
    api('offline', {uid:session.id});
    stopPolling();
  });
  setInterval(pollOnline, 15000);
  pollOnline();

  function loadLocal() {
    try {
      const msgs = JSON.parse(localStorage.getItem(LS_KEY)||'[]');
      if (msgs.length) {
        $('ch-empty')?.remove();
        msgs.slice(-100).forEach((m,i)=>appendMsg(m,false,i===msgs.slice(-100).length-1));
        scrollBottom(true);
      }
    } catch(_){}
  }
  function saveLocal(msg) {
    try {
      const msgs = JSON.parse(localStorage.getItem(LS_KEY)||'[]');
      msgs.push(msg);
      if (msgs.length>300) msgs.splice(0,msgs.length-300);
      localStorage.setItem(LS_KEY, JSON.stringify(msgs));
    } catch(_){}
  }

  async function send() {
    const text = inp.value.trim(); if (!text) return;
    const msg = {
      id: 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      uid:session.id, username:session.username, text,
      ts: Date.now(),
      replyTo: replyTo ? {id:replyTo.id, username:replyTo.username, text:replyTo.text} : null,
      reactions:{},
    };
    inp.value=''; inp.style.height='auto';
    sendBtn.disabled=true; setTimeout(()=>sendBtn.disabled=false, 500);
    localStorage.removeItem(KEY_DRAFT);
    cancelReply();
    $('ch-empty')?.remove();
    appendMsg(msg, true, true);
    scrollBottom(false);
    inp.focus();

    const res = await api('send', {uid:session.id, username:session.username, text, replyTo:msg.replyTo||null});
    if (res?.ok && res.msg) {
      const oldEl = document.getElementById('chm-'+msg.id);
      if (oldEl) { oldEl.id='chm-'+res.msg.id; }
      renderedIds.add(res.msg.id);
      if (res.msg.ts>lastTs) lastTs=res.msg.ts;
    } else {
      saveLocal(msg);
      channel?.postMessage({type:'msg', payload:msg});
    }
  }

  let _prevUid = null, _prevTs = 0, _lastDateStr = '';

  function appendMsg(msg, animate, scrollCheck) {
    if (renderedIds.has(msg.id)) return;
    renderedIds.add(msg.id);
    msgDataMap.set(msg.id, msg);

    const isMe = msg.uid === session.id;

    const dStr = fmtDate(msg.ts);
    if (dStr !== _lastDateStr) {
      _lastDateStr = dStr;
      const d = document.createElement('div');
      d.className='ch-date'; d.textContent=dStr;
      msgBox.appendChild(d);
      _prevUid=null;
    }

    const grouped = msg.uid===_prevUid && (msg.ts - _prevTs) < 120000;
    _prevUid = msg.uid; _prevTs = msg.ts;

    const [c1,c2] = palette(msg.username);
    const init = (msg.username||'?')[0].toUpperCase();

    const row = document.createElement('div');
    row.className = `ch-row ${isMe?'me':'them'}${grouped?' grouped':''}`;
    row.id = 'chm-'+msg.id;
    if (animate) row.style.animationDelay='0ms';

    const rpHtml = msg.replyTo
      ? `<div class="ch-rp" data-jump="${esc(msg.replyTo.id)}">
           <strong>↩ ${esc(msg.replyTo.username)}</strong>
           ${esc((msg.replyTo.text||'').slice(0,60))}
         </div>`
      : '';

    const msgHtml = linkify(esc(msg.text));

    row.innerHTML = `
      <div class="ch-av" style="background:linear-gradient(135deg,${c1},${c2})" title="${esc(msg.username)}">${esc(init)}</div>
      <div class="ch-bwrap">
        ${!isMe && !grouped ? `<div class="ch-name" style="color:${c1}">${esc(msg.username)}</div>` : ''}
        <div class="ch-bbl" id="chb-${msg.id}">
          ${rpHtml}${msgHtml}
          <div class="ch-epick" id="chep-${msg.id}">
            ${EMOJIS.map(em=>`<button class="ch-ebtn" data-emoji="${em}" data-id="${msg.id}">${em}</button>`).join('')}
            <button class="ch-epick-reply" data-id="${msg.id}" title="Reply">↩</button>
          </div>
        </div>
        <div class="ch-reacts" id="chr-${msg.id}"></div>
        <div class="ch-meta">
          ${fmtTime(msg.ts)}
          ${isMe ? '<span class="ch-ticks">✓✓</span>' : ''}
        </div>
      </div>
      <span class="ch-swipe-icon">↩</span>`;

    msgBox.appendChild(row);
    renderReactions(msg);

    const bbl = document.getElementById('chb-'+msg.id);
    let holdT;
    bbl.addEventListener('pointerdown', e=>{
      if (e.button===2) return;
      holdT = setTimeout(()=>{ showPicker(msg.id,row); }, 480);
    });
    bbl.addEventListener('pointerup',    ()=>clearTimeout(holdT));
    bbl.addEventListener('pointercancel',()=>clearTimeout(holdT));
    bbl.addEventListener('contextmenu',  e=>{ e.preventDefault(); showPicker(msg.id,row); });

    const picker = document.getElementById('chep-'+msg.id);
    picker.addEventListener('click', e=>{
      const btn = e.target.closest('[data-emoji],[data-id].ch-epick-reply');
      if (!btn) return;
      if (btn.dataset.emoji) { react(msg.id, btn.dataset.emoji); closePicker(); pickerMsgId=null; }
      else if (btn.classList.contains('ch-epick-reply')) { setReply(msg); closePicker(); pickerMsgId=null; }
    });

    row.querySelectorAll('.ch-rp[data-jump]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const target = document.getElementById('chm-'+el.dataset.jump);
        if (target) { target.scrollIntoView({behavior:'smooth',block:'center'}); target.style.outline='2px solid rgba(37,211,102,.5)'; setTimeout(()=>target.style.outline='',1200); }
      });
    });

    if (scrollCheck) {
      const atBottom = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight < 100;
      if (atBottom) scrollBottom(false);
    }
  }

  function getMsgData(id) { return msgDataMap.get(id)||null; }

  function showPicker(msgId, row) {
    closePicker();
    const p = document.getElementById('chep-'+msgId);
    if (!p) return;
    p.classList.add('show');
    pickerMsgId = msgId;
    const pb = p.getBoundingClientRect();
    if (pb.top < 0) { p.style.bottom='auto'; p.style.top='calc(100% + 6px)'; }
  }
  function closePicker() {
    document.querySelectorAll('.ch-epick.show').forEach(p=>{
      p.classList.remove('show'); p.style.top=''; p.style.bottom='';
    });
  }

  async function react(msgId, emoji) {
    const msg = msgDataMap.get(msgId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions={};
    const arr = msg.reactions[emoji] || [];
    const idx = arr.indexOf(session.id);
    if (idx===-1) arr.push(session.id); else arr.splice(idx,1);
    if (!arr.length) delete msg.reactions[emoji]; else msg.reactions[emoji]=arr;
    renderReactions(msg);

    await api('react', {msgId, emoji, uid:session.id});
  }

  function renderReactions(msg) {
    const el = document.getElementById('chr-'+msg.id); if (!el) return;
    const r = msg.reactions||{};
    el.innerHTML = Object.entries(r).filter(([,v])=>v.length).map(([emoji,uids])=>{
      const mine = uids.includes(session.id);
      return `<span class="ch-react${mine?' mine':''}" data-id="${msg.id}" data-emoji="${emoji}" title="${uids.length} reaction${uids.length!==1?'s':''}">
        ${emoji}<span class="ch-react-count">${uids.length}</span>
      </span>`;
    }).join('');
    el.querySelectorAll('.ch-react').forEach(r2=>r2.onclick=()=>react(r2.dataset.id, r2.dataset.emoji));
  }

  function setReply(msg) {
    replyTo = {id:msg.id, username:msg.username, text:msg.text};
    $('ch-rb-who').textContent = '↩ ' + msg.username;
    $('ch-rb-txt').textContent = (msg.text||'').slice(0,80);
    rbar.classList.add('show'); inp.focus();
  }
  function cancelReply() { replyTo=null; rbar.classList.remove('show'); }

  async function toggleNotif() {
    if (notifOn) {
      notifOn=false; localStorage.removeItem(KEY_NOTIF);
      $('ch-notif-btn').classList.remove('active');
      toast('🔕','Chat notifications off'); return;
    }
    if (!('Notification' in window)) { toast('⚠️','Not supported in this browser'); return; }
    const p = await Notification.requestPermission();
    if (p==='granted') {
      notifOn=true; localStorage.setItem(KEY_NOTIF,'1');
      $('ch-notif-btn').classList.add('active');
      toast('🔔','Chat notifications on!');
    } else toast('🔕','Blocked — enable in browser settings');
  }

  function fireNotif(sender, text) {
    try {
      const n = new Notification(CFG.notifTitle.replace('{sender}',sender), {
        body:(text||'').slice(0,100), tag:'ls-chat', renotify:true,
        icon:'assets/icon/icon.png', vibrate:[180,80,180],
      });
      n.onclick=()=>{ window.focus(); open(); n.close(); };
      setTimeout(()=>n.close(), 9000);
    } catch(_){}
  }

  function bumpBadge() {
    unread++; badge.textContent=unread>9?'9+':String(unread); badge.style.display='flex';
  }
  function resetBadge() { unread=0; badge.style.display='none'; }
  function updateScrollCount() {
    const sc=$('ch-scroll-count');
    if (scrollNewCount>0) { sc.textContent=scrollNewCount>9?'9+':scrollNewCount; sc.classList.add('show'); }
    else sc.classList.remove('show');
  }
  function pingBubble() {
    bubble.classList.add('ping'); setTimeout(()=>bubble.classList.remove('ping'),700);
  }
  function scrollBottom(instant) {
    if (instant) { msgBox.scrollTop=msgBox.scrollHeight; return; }
    requestAnimationFrame(()=>{ msgBox.scrollTop=msgBox.scrollHeight; });
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function fmtDate(ts) {
    const d=new Date(ts), t=new Date();
    if (d.toDateString()===t.toDateString()) return 'Today';
    const y=new Date(t); y.setDate(t.getDate()-1);
    if (d.toDateString()===y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function linkify(html) {
    return html.replace(/(https?:\/\/[^\s&lt;&gt;"]+)/g,
      m=>`<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
  }
  function palette(name) {
    let h=0; for(let i=0;i<(name||'').length;i++){h=((h<<5)-h)+name.charCodeAt(i);h|=0;}
    return PALETTES[Math.abs(h)%PALETTES.length];
  }
  function toast(icon, msg) {
    if (typeof window.showToast==='function') { window.showToast(icon,msg); return; }
    const c=document.getElementById('toast-container'); if(!c) return;
    const t=document.createElement('div'); t.className='toast';
    t.innerHTML=`<span>${icon}</span> ${msg}`; c.appendChild(t);
    requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),500); },3500);
  }

  heartbeat();
})();
