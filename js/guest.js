"use strict";

const GuestIdentity = (() => {
  const KEY = 'ls_guest_v1';
  const ADJ = ['Swift','Bright','Chill','Bold','Lucky','Sunny','Quiet','Sharp','Cosmic','Rebel'];
  const AN  = ['Falcon','Comrade','Otter','Panther','Maple','Nova','Ember','Wolf','Tiger','Yeti'];

  function rnd(n = 8) {
    return Array.from({ length: n }, () => Math.random().toString(36)[2] || '0').join('');
  }

  function niceName() {
    const a = ADJ[Math.floor(Math.random() * ADJ.length)];
    const n = AN[Math.floor(Math.random() * AN.length)];
    return `${a}${n}${Math.floor(Math.random() * 90 + 10)}`;
  }

  function get() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.username) return parsed;
      }
    } catch (_) {}
    const guest = { id: 'g_' + rnd(12), username: niceName(), createdAt: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(guest)); } catch (_) {}
    return guest;
  }

  function rename(newName) {
    const g = get();
    g.username = (newName || '').trim().slice(0, 24) || g.username;
    try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (_) {}
    return g;
  }

  return { get, rename };
})();