"use strict";

const AuthStore = (() => {
  const ls = {
    get:    k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set:    (k,v) => localStorage.setItem(k, JSON.stringify(v)),
    remove: k => localStorage.removeItem(k),
  };

  function getDeviceId() {
    let id = ls.get('ls_device_id');
    if (!id) {
      const raw = [
        navigator.userAgent, navigator.language, navigator.hardwareConcurrency,
        screen.width, screen.height, screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.platform || '',
      ].join('|');
      let hash = 0;
      for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0;
      }
      id = 'dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
      ls.set('ls_device_id', id);
    }
    return id;
  }

  const ADMIN_ACCOUNTS = [
    { email: 'arsec4real@gmail.com', password: '9745356396sushant', username: 'AdmiN', isAdmin: true },
  ];

  function findAdminByCredential(emailOrUser) {
    const ql = (emailOrUser || '').toLowerCase();
    return ADMIN_ACCOUNTS.find(a => a.email.toLowerCase() === ql || a.username.toLowerCase() === ql) || null;
  }

  function getUsers()        { return ls.get('ls_users') || []; }
  function saveUsers(u)      { ls.set('ls_users', u); }
  function findByEmail(e)    { return getUsers().find(u => u.email === (e||'').toLowerCase()) || null; }
  function findByUsername(n) { return getUsers().find(u => u.username.toLowerCase() === (n||'').toLowerCase()) || null; }
  function findUser(q) {
    const ql = (q || '').toLowerCase();
    return getUsers().find(u => u.email === ql || u.username.toLowerCase() === ql) || null;
  }

  function logActivity(type, data = {}) {
    const log = ls.get('ls_activity') || [];
    log.push({ type, ts: Date.now(), deviceId: getDeviceId(), ...data });
    if (log.length > 2000) log.splice(0, log.length - 2000);
    ls.set('ls_activity', log);
  }

  function registerUser({ username, email, password }) {
    const emailLower = (email || '').toLowerCase();
    if (ADMIN_ACCOUNTS.some(a => a.email.toLowerCase() === emailLower))
      return { ok: false, msg: 'This email is reserved.' };
    if (findByEmail(emailLower))      return { ok: false, msg: 'Email already registered.' };
    if (findByUsername(username))     return { ok: false, msg: 'Username already taken.' };
    const user = {
      id: 'u_' + Date.now(), username, email: emailLower,
      password: btoa(unescape(encodeURIComponent(password))),
      activated: false, isAdmin: false,
      createdAt: new Date().toISOString(), deviceId: null, activationCode: null,
    };
    const users = getUsers(); users.push(user); saveUsers(users);
    logActivity('register', { username, email: emailLower });
    return { ok: true, user };
  }

  function loginUser(emailOrUser, password) {
    const adminAcc = findAdminByCredential(emailOrUser);
    if (adminAcc) {
      if (adminAcc.password !== password) return { ok: false, msg: 'Incorrect password.' };
      logActivity('login', { username: adminAcc.username, email: adminAcc.email, isAdmin: true });
      return {
        ok: true,
        user: {
          id: 'admin_' + adminAcc.username,
          username: adminAcc.username,
          email: adminAcc.email,
          activated: true,
          isAdmin: true,
        },
      };
    }

    const user = findUser(emailOrUser);
    if (!user) return { ok: false, msg: 'No account found.' };
    let pw;
    try { pw = decodeURIComponent(escape(atob(user.password))); } catch { pw = atob(user.password); }
    if (pw !== password) return { ok: false, msg: 'Incorrect password.' };

    const expiry = getCodeExpiry(user.activationCode);
    if (expiry && Date.now() > expiry) {
      const users = getUsers(); const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) { users[idx].activated = false; saveUsers(users); }
      return { ok: false, msg: 'Your activation code has expired. Please contact admin.', codeExpired: true, user };
    }

    if (!user.activated) return { ok: false, msg: 'Account not activated.', needsActivation: true, user };
    logActivity('login', { username: user.username, email: user.email });
    return { ok: true, user };
  }

  function activateUser(email, code) {
    const trimmed    = code.trim();
    const emailLower = (email || '').toLowerCase();
    const deviceId   = getDeviceId();

    const codeDef = (typeof ACTIVATION_CODES !== 'undefined' ? ACTIVATION_CODES : [])
      .find(c => (typeof c === 'string' ? c : c.code) === trimmed);
    if (!codeDef) return { ok: false, msg: 'Invalid activation code.' };

    const codeStr  = typeof codeDef === 'string' ? codeDef : codeDef.code;
    const expiresAt = typeof codeDef === 'object' ? codeDef.expiresAt : null;
    if (expiresAt && Date.now() > new Date(expiresAt).getTime())
      return { ok: false, msg: 'This activation code has expired.' };

    const usedCodes = ls.get('ls_used_codes') || {};
    if (usedCodes[codeStr] && usedCodes[codeStr] !== deviceId)
      return { ok: false, msg: 'This code is already active on another device.' };

    const user = findByEmail(emailLower);
    if (!user) return { ok: false, msg: 'User not found.' };

    const users = getUsers();
    const alreadyOwner = users.find(u => u.activationCode === codeStr && u.email !== emailLower);
    if (alreadyOwner) return { ok: false, msg: 'This code is already in use by another account.' };

    const idx = users.findIndex(u => u.email === emailLower);
    users[idx].activated = true;
    users[idx].deviceId  = deviceId;
    users[idx].activationCode = codeStr;
    users[idx].activatedAt    = new Date().toISOString();
    saveUsers(users);

    usedCodes[codeStr] = deviceId;
    ls.set('ls_used_codes', usedCodes);

    logActivity('activate', { username: user.username, email: emailLower, code: codeStr });
    return { ok: true, user: users[idx] };
  }

  function getCodeExpiry(codeStr) {
    if (!codeStr) return null;
    const codeDef = (typeof ACTIVATION_CODES !== 'undefined' ? ACTIVATION_CODES : [])
      .find(c => (typeof c === 'string' ? c : c.code) === codeStr);
    if (!codeDef || typeof codeDef === 'string') return null;
    return codeDef.expiresAt ? new Date(codeDef.expiresAt).getTime() : null;
  }

  function validateSession() {
    const session = ls.get('ls_session');
    if (!session) return null;

    if (session.isAdmin) {
      const still = ADMIN_ACCOUNTS.find(a => a.email.toLowerCase() === session.email.toLowerCase());
      if (!still) { ls.remove('ls_session'); return null; }
      return session;
    }

    const user = findByEmail(session.email);
    if (!user) { ls.remove('ls_session'); return null; }

    const manuallyExpired = (ls.get('ls_expired_codes') || []).includes(user.activationCode);
    const expiry = getCodeExpiry(user.activationCode);
    if (manuallyExpired || (expiry && Date.now() > expiry)) {
      ls.remove('ls_session');
      return { expired: true };
    }
    return session;
  }

  function updatePassword(email, newPassword) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.email === (email || '').toLowerCase());
    if (idx === -1) return { ok: false, msg: 'User not found.' };
    users[idx].password = btoa(unescape(encodeURIComponent(newPassword)));
    saveUsers(users);
    return { ok: true };
  }

  async function generateOTP(email) {
    const emailLower = (email || '').toLowerCase();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const exp = Date.now() + 10 * 60 * 1000;
    ls.set('ls_otp_' + emailLower, { otp, exp });
    const user = findByEmail(emailLower);
    const name = user ? user.username : '';
    let emailSent = false;
    try {
      const resp = await fetch('api/send-otp.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, otp, name }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) { const d = await resp.json().catch(() => ({})); emailSent = d.ok === true; }
    } catch (_) {}
    if (!emailSent)
      console.log(`%c[Dev OTP] ${emailLower}: ${otp}`, 'color:#f5c842;font-size:1.1rem;font-weight:bold');
    return { otp, emailSent };
  }

  function verifyOTP(email, inputOtp) {
    const emailLower = (email || '').toLowerCase();
    const stored = ls.get('ls_otp_' + emailLower);
    if (!stored)                        return { ok: false, msg: 'No OTP found. Request a new one.' };
    if (Date.now() > stored.exp)        return { ok: false, msg: 'OTP expired. Request a new one.' };
    if (stored.otp !== inputOtp.trim()) return { ok: false, msg: 'Incorrect OTP.' };
    ls.remove('ls_otp_' + emailLower);
    return { ok: true };
  }

  function setSession(user) {
    ls.set('ls_session', {
      id:        user.id,
      username:  user.username,
      email:     user.email,
      activated: user.activated,
      isAdmin:   !!user.isAdmin,
    });
  }
  function getSession()     { return ls.get('ls_session'); }
  function clearSession()   { ls.remove('ls_session'); }
  function isAdminSession() { const s = ls.get('ls_session'); return !!(s && s.isAdmin); }

  function getActivity() { return ls.get('ls_activity') || []; }
  function logDownload(resourceId, resourceTitle, username) {
    logActivity('download', { resourceId, resourceTitle, username });
  }
  function logPageVisit(username) { logActivity('visit', { username }); }

  function expireCode(codeStr) {
    const expired = ls.get('ls_expired_codes') || [];
    if (!expired.includes(codeStr)) { expired.push(codeStr); ls.set('ls_expired_codes', expired); }
    const users = getUsers();
    users.forEach(u => { if (u.activationCode === codeStr) u.activated = false; });
    saveUsers(users);
    return { ok: true };
  }
  function isCodeExpired(codeStr) {
    if ((ls.get('ls_expired_codes') || []).includes(codeStr)) return true;
    const expiry = getCodeExpiry(codeStr);
    return expiry ? Date.now() > expiry : false;
  }
  function getDeviceIdPub() { return getDeviceId(); }

  return {
    getUsers, findUser, findByEmail, registerUser, loginUser,
    activateUser, updatePassword, validateSession,
    setSession, getSession, clearSession, isAdminSession,
    generateOTP, verifyOTP,
    getActivity, logDownload, logPageVisit,
    expireCode, isCodeExpired, getDeviceIdPub,
  };
})();
