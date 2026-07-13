"use strict";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let session = null;
let currentSection = 'notes';

const navState = {
  notes:       { sem: null, subj: null },
  assignments: { sem: null, subj: null },
  logbook:     { sem: null, subj: null },
};

document.addEventListener('DOMContentLoaded', async () => {
  session = typeof GuestIdentity !== 'undefined' ? GuestIdentity.get() : { username: 'Guest' };
  updateGuestBadge();

  applyConfig();

  setTimeout(() => {
    const popup = document.getElementById('welcome-popup');
    const msg   = (SITE_CONFIG.welcomeMessage||'Welcome, {username}! 👋').replace('{username}', session.username);
    document.getElementById('welcome-msg').textContent = msg;
    popup.classList.add('show');
    if (typeof window.launchConfetti === 'function') {
      const r = popup.getBoundingClientRect();
      window.launchConfetti(r.left + r.width/2, r.top + r.height/2, 60);
    }
    setTimeout(() => popup.classList.remove('show'), 4000);
  }, 800);

  buildAllSections();
  updateTabCounts();
  showSection('notes');

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const footerEl = document.getElementById('footer-text');
  if (footerEl) footerEl.textContent = SITE_CONFIG.footerText || '';

  await NotifyManager.init();
  setTimeout(() => NotifyManager.fireQueue(), 3000);

  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-backdrop')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  const nameBtn = document.getElementById('btn-guest-name');
  if (nameBtn) nameBtn.addEventListener('click', promptRename);
});

function updateGuestBadge() {
  const label = document.getElementById('guest-name-label');
  if (label) label.textContent = session?.username || 'Guest';
}

function promptRename() {
  const next = window.prompt('Pick a display name:', session.username);
  if (next === null) return;
  session = GuestIdentity.rename(next);
  updateGuestBadge();
  showToast('🌿', `Now showing as ${session.username}`);
}

function applyConfig() {
  const c = SITE_CONFIG;
  if (c.siteName)   document.getElementById('site-name').textContent   = c.siteName;
  if (c.author)     document.getElementById('site-author').textContent = c.author;
  if (c.subtitle)   document.getElementById('site-subtitle').textContent = c.subtitle;
  if (c.badge)      document.getElementById('site-badge').textContent  = c.badge;
}

function showSection(name) {
  currentSection = name;
  $$('.section').forEach(s => s.classList.remove('active'));
  $$('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  const sec = document.getElementById('section-'+name);
  const tab = document.getElementById('tab-'+name);
  if (sec) sec.classList.add('active');
  if (tab) { tab.classList.add('active'); tab.setAttribute('aria-selected','true'); }
}

function buildAllSections() {
  ['notes','assignments','logbook'].forEach(sec => buildSemGrid(sec));
}

function buildSemGrid(sec) {
  const grid = document.getElementById(sec+'-sem-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const sems = typeof SEMESTERS !== 'undefined' ? SEMESTERS : [];
  const frag = document.createDocumentFragment();

  sems.forEach(sem => {
    const count = countResources(sec, sem.id);
    const card  = document.createElement('div');
    card.className = 'sem-card card';
    card.style.setProperty('--sem-color', sem.color || '#7ee787');
    card.dataset.semId = sem.id;
    card.innerHTML = `
      <span class="sem-icon">${sem.icon}</span>
      <div class="sem-label">${sem.label}</div>
      <div class="sem-count">${count} item${count!==1?'s':''}</div>`;
    card.addEventListener('click', () => selectSem(sec, sem));
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

function countResources(sec, semId) {
  return (RESOURCES[sec]||[]).filter(r => r.semId === semId).length;
}

function selectSem(sec, sem) {
  navState[sec].sem  = sem;
  navState[sec].subj = null;

  $$('#'+sec+'-sem-grid .sem-card').forEach(c => c.classList.toggle('active', c.dataset.semId === sem.id));

  const subjects = ((typeof SUBJECTS !== 'undefined' ? SUBJECTS : {})[sem.id]) || [];
  const activeSubjs = subjects.filter(s => (RESOURCES[sec]||[]).some(r => r.subjectId === s.id));

  showSubjGrid(sec, sem, activeSubjs);
}

function showSubjGrid(sec, sem, subjects) {
  const bc   = document.getElementById(sec+'-breadcrumb');
  const sg   = document.getElementById(sec+'-subj-grid');
  const cg   = document.getElementById(sec+'-cards');
  const semG = document.getElementById(sec+'-sem-grid');

  if (semG) semG.style.display = 'none';
  bc.style.display = 'flex';
  sg.style.display = '';
  cg.style.display = 'none';

  bc.innerHTML = `
    <span class="breadcrumb-link" onclick="resetToSems('${sec}')">📁 All Semesters</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${sem.label}</span>`;

  sg.innerHTML = '';
  if (!subjects.length) {
    sg.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="em-icon">📭</div><h3>No content yet</h3><p>No ${sec} added for ${sem.label} yet.</p></div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  subjects.forEach(subj => {
    const count = (RESOURCES[sec]||[]).filter(r => r.subjectId === subj.id).length;
    const card  = document.createElement('div');
    card.className = 'subj-card';
    card.dataset.subjId = subj.id;
    card.innerHTML = `
      <span class="subj-icon">${subj.icon}</span>
      <div class="subj-label">${subj.label}</div>
      <div class="subj-count">${count} file${count!==1?'s':''}</div>`;
    card.addEventListener('click', () => selectSubj(sec, sem, subj));
    frag.appendChild(card);
  });
  sg.appendChild(frag);
}

function selectSubj(sec, sem, subj) {
  navState[sec].subj = subj;

  const bc = document.getElementById(sec+'-breadcrumb');
  const sg = document.getElementById(sec+'-subj-grid');
  bc.innerHTML = `
    <span class="breadcrumb-link" onclick="resetToSems('${sec}')">📁 All Semesters</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-link" onclick="goBackToSubjects('${sec}',${JSON.stringify(sem)})">📂 ${sem.label}</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${subj.icon} ${subj.label}</span>`;

  if (sg) sg.style.display = 'none';

  const items = (RESOURCES[sec]||[]).filter(r => r.subjectId === subj.id);
  const cg    = document.getElementById(sec+'-cards');
  cg.style.display = '';
  cg.innerHTML = '';

  if (!items.length) {
    cg.innerHTML = `<div class="empty-state"><div class="em-icon">📭</div><h3>Nothing here yet</h3><p>No ${sec} in ${subj.label} yet.</p></div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((item,i) => frag.appendChild(buildCard(item, i)));
  cg.appendChild(frag);
  setTimeout(() => typeof observeCards === 'function' && observeCards(), 50);
}

function goBackToSubjects(sec, sem) {
  const subjects = ((typeof SUBJECTS !== 'undefined' ? SUBJECTS : {})[sem.id]) || [];
  const activeSubjs = subjects.filter(s => (RESOURCES[sec]||[]).some(r => r.subjectId === s.id));
  navState[sec].subj = null;
  const semG = document.getElementById(sec+'-sem-grid');
  if (semG) semG.style.display = 'none';
  document.getElementById(sec+'-cards').style.display = 'none';
  showSubjGrid(sec, sem, activeSubjs);
}

function resetToSems(sec) {
  navState[sec].sem  = null;
  navState[sec].subj = null;
  const semG = document.getElementById(sec+'-sem-grid');
  if (semG) semG.style.display = '';
  document.getElementById(sec+'-breadcrumb').style.display = 'none';
  document.getElementById(sec+'-subj-grid').style.display  = 'none';
  document.getElementById(sec+'-cards').style.display      = 'none';
  $$('#'+sec+'-sem-grid .sem-card').forEach(c => c.classList.remove('active'));
}

const TYPE_ICONS = { image:'🖼️', pdf:'📄', video:'🎬', doc:'📄' };

function buildCard(item, idx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role','listitem');
  card.setAttribute('tabindex','0');
  card.style.animationDelay = (idx % 8 * 60) + 'ms';

  const thumb = item.thumbnail
    ? `<div class="card-thumb"><img src="${item.thumbnail}" alt="${item.title}" loading="lazy" decoding="async"/><div class="card-thumb-overlay"></div><span class="card-type-badge">${TYPE_ICONS[item.previewType]||'📄'} ${item.previewType||'file'}</span>${item.notify?'<span class="card-new-badge">NEW</span>':''}</div>`
    : `<div class="card-thumb" style="background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:3rem">${TYPE_ICONS[item.previewType]||'📄'}${item.notify?'<span class="card-new-badge">NEW</span>':''}</div>`;

  card.innerHTML = `${thumb}
    <div class="card-body">
      <div class="card-subject">${item.subject||''}</div>
      <div class="card-title">${item.title}</div>
      <div class="card-desc">${item.description||''}</div>
    </div>
    <div class="card-footer">
      <span style="font-size:.7rem;color:var(--text-muted);font-family:var(--font-mono)">${(item.downloadName||'').split('.').pop()?.toUpperCase()||''}</span>
      <button class="card-action-btn">View ↗</button>
    </div>`;

  card.addEventListener('click', () => openModal(item));
  card.addEventListener('keydown', e => { if (e.key === 'Enter'||e.key===' ') openModal(item); });
  return card;
}

function openModal(item) {
  document.getElementById('modal-subject').textContent = item.subject||'';
  document.getElementById('modal-title').textContent   = item.title;
  document.getElementById('modal-desc').textContent    = item.description||'';
  document.getElementById('modal-file-info').textContent = item.downloadName||'';

  const prev = document.getElementById('modal-preview');
  prev.innerHTML = '';
  if (item.previewType === 'image' && item.previewSrc)
    prev.innerHTML = `<img src="${item.previewSrc}" alt="${item.title}" loading="lazy"/>`;
  else if (item.previewType === 'pdf' && item.previewSrc)
    prev.innerHTML = `<iframe src="${item.previewSrc}" title="${item.title}"></iframe>`;
  else
    prev.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:3rem">📄</div>`;

  const dlBtn = document.getElementById('btn-download');
  dlBtn.onclick = () => {
    if (!item.downloadFile) return showToast('⚠️','No download file configured.');
    const a = document.createElement('a');
    a.href = item.downloadFile; a.download = item.downloadName||''; a.click();
    showToast('✅', 'Downloading…');
  };

  document.getElementById('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function updateTabCounts() {
  ['notes','assignments','logbook'].forEach(sec => {
    const n  = (RESOURCES[sec]||[]).length;
    const el = document.getElementById('count-'+sec);
    if (!el) return;
    if (typeof animCount === 'function') animCount(el, n, 700);
    else el.textContent = n;
  });
}

function showToast(icon, msg) {
  const c = document.getElementById('toast-container'); if (!c) return;
  const t = document.createElement('div'); t.className='toast';
  t.innerHTML=`<span>${icon}</span> ${msg}`;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(),500); }, 4000);
}
window.showToast = showToast;