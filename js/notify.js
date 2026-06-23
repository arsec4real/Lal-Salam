"use strict";

const NotifyManager = (() => {
  const CFG = Object.assign({
    enabled: true, promptDelay: 4000, promptOnce: true,
    newResourceNotif: true, queueNotif: true,
    defaultIcon:  'assets/images/icon/icon.png',
    defaultBadge: 'assets/images/icon/icon.png',
    defaultVibrate: [200, 100, 200],
  }, typeof NOTIFY_CONFIG !== 'undefined' ? NOTIFY_CONFIG : {});

  const KEY_PERM   = 'ls_notif_perm';
  const KEY_SEEN_R = 'ls_seen_resources';
  const KEY_SEEN_Q = 'ls_seen_queue';
  let swReg = null;

  async function init() {
    if (!CFG.enabled || !('Notification' in window)) return;
    if ('serviceWorker' in navigator) {
      try {
        swReg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
        await navigator.serviceWorker.ready;
      } catch(e) { console.warn('[Notify] SW failed:', e); }
    }
    const perm = Notification.permission;
    if (perm === 'granted') { localStorage.setItem(KEY_PERM,'granted'); setTimeout(fireQueue, 2000); }
    else if (perm === 'default') {
      const wasDismissed = localStorage.getItem(KEY_PERM) === 'dismissed';
      if (!(CFG.promptOnce && wasDismissed)) setTimeout(showPrompt, CFG.promptDelay);
    }
  }

  function showPrompt() {
    if (Notification.permission !== 'default') return;
    if (document.getElementById('ls-np')) return;
    const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode:standalone)').matches || !!navigator.standalone;
    if (isIOS && !isPWA) return;

    const el = document.createElement('div');
    el.id = 'ls-np';
    el.innerHTML = `
      <div class="ls-np-in">
        <div class="ls-np-icon">🔔</div>
        <div class="ls-np-txt">
          <strong>Stay updated</strong>
          <span>Get notified when new notes & assignments drop.</span>
        </div>
        <div class="ls-np-btns">
          <button id="ls-np-yes">Allow</button>
          <button id="ls-np-no">Later</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

    function dismiss() { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }
    document.getElementById('ls-np-yes').onclick = async () => { dismiss(); await requestPerm(); };
    document.getElementById('ls-np-no').onclick  = () => { dismiss(); localStorage.setItem(KEY_PERM,'dismissed'); };
  }

  async function requestPerm() {
    if (!('Notification' in window)) return showToast('⚠️','Notifications not supported.');
    const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode:standalone)').matches || !!navigator.standalone;
    if (isIOS && !isPWA) return showToast('📱','Add to Home Screen first to enable notifications on iOS.');
    const perm = await Notification.requestPermission();
    localStorage.setItem(KEY_PERM, perm);
    if (perm === 'granted') { showToast('🔔','Notifications enabled!'); fireQueue(); }
    else showToast('🔕','Notifications blocked — allow via browser settings.');
  }

  function fireQueue() {
    if (Notification.permission !== 'granted') return;
    if (CFG.queueNotif && typeof NOTIFY_QUEUE !== 'undefined') {
      const seen = JSON.parse(localStorage.getItem(KEY_SEEN_Q)||'[]');
      NOTIFY_QUEUE.filter(n => !seen.includes(n.id)).forEach((n,i) => {
        setTimeout(() => send({
          title: n.title||'Lal Salam', body: n.body||'',
          icon:  n.icon||CFG.defaultIcon, badge: n.badge||CFG.defaultBadge,
          tag: 'ls-q-'+n.id, url: n.url||'./',
          vibrate: n.vibrate||CFG.defaultVibrate,
          requireInteraction: n.requireInteraction||false,
          actions: n.actions||[],
        }), i * 1800);
        seen.push(n.id);
      });
      localStorage.setItem(KEY_SEEN_Q, JSON.stringify(seen));
    }
    if (CFG.newResourceNotif && typeof RESOURCES !== 'undefined') {
      const seen = JSON.parse(localStorage.getItem(KEY_SEEN_R)||'[]');
      const toSend = [];
      ['notes','assignments','logbook'].forEach(sec =>
        (RESOURCES[sec]||[]).filter(r => r.notify && !seen.includes(r.id)).forEach(r => { toSend.push(r); seen.push(r.id); })
      );
      toSend.forEach((r,i) => setTimeout(() => send({
        title: '📚 New Resource — Lal Salam',
        body: `"${r.title}" is now available!`,
        icon: r.thumbnail||CFG.defaultIcon, badge: CFG.defaultBadge,
        tag: 'ls-r-'+r.id, url: './', vibrate: CFG.defaultVibrate,
      }), i * 1800));
      localStorage.setItem(KEY_SEEN_R, JSON.stringify(seen));
    }
  }

  async function send(data) {
    if (Notification.permission !== 'granted') return;
    const sw = swReg?.active || (await navigator.serviceWorker?.ready.catch(()=>null))?.active;
    if (sw) { sw.postMessage({ type:'SHOW_NOTIF', payload: data }); return; }
    try {
      const n = new Notification(data.title, { body:data.body, icon:data.icon, badge:data.badge, tag:data.tag, vibrate:data.vibrate, data:{url:data.url} });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {}
  }

  async function promptUser() {
    if (Notification.permission === 'granted') { showToast('🔔','Already enabled!'); fireQueue(); }
    else await requestPerm();
  }

  async function sendNow(title, body, opts = {}) {
    if (Notification.permission !== 'granted') await requestPerm();
    await send({ title, body, icon:CFG.defaultIcon, badge:CFG.defaultBadge, url:'./', vibrate:CFG.defaultVibrate, ...opts });
  }

  function resetSeen() {
    localStorage.removeItem(KEY_SEEN_Q); localStorage.removeItem(KEY_SEEN_R); localStorage.removeItem(KEY_PERM);
  }

  function showToast(icon, msg) {
    if (typeof window.showToast === 'function') return window.showToast(icon, msg);
    const c = document.getElementById('toast-container'); if (!c) return;
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span>${icon}</span> ${msg}`; c.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(),500); }, 4000);
  }

  return { init, promptUser, sendNow, fireQueue, resetSeen };
})();