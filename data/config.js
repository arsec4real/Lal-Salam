const SITE_CONFIG = {
  siteName:    "Lal Salam",
  author:      "Lal Salam Comrade",
  subtitle:    "Pokhara University — BHM",
  badge:       "Academic Resources",
  footerText:  "Made with ♥ by Lal Salam Comrade",
  welcomeMessage: "Welcome back, {username}! 👋",
  sections: { notes: true, assignments: true, logbook: true },
};

/* ═══════════════════════════════════════════════════════════
   ACTIVATION CODES
   Each code → 1 person, 1 device only.
   Set expiresAt to null for no expiry, or "2025-12-31" for a date.
═══════════════════════════════════════════════════════════ */
const ACTIVATION_CODES = [
  { code: "FUCK BOSTON",           name: "General",        expiresAt: null },
  { code: "ADMIN ARSEC",           name: "General",        expiresAt: null },
  { code: "COMRADE x KRISHCHAL",   name: "Krishchal",      expiresAt: null },
  { code: "COMRADE x RABIN",       name: "Rabin",          expiresAt: null },
  { code: "COMRADE x SABIN",       name: "Sabin",          expiresAt: null },
  { code: "COMRADE x NIKESH",      name: "Nikesh",         expiresAt: null },
  { code: "COMRADE x RAUNAK",      name: "Raunak",         expiresAt: null },
  { code: "COMRADE x PRATIK",      name: "Pratik",         expiresAt: null },
  { code: "COMRADE x JIBAN",       name: "Jiban",          expiresAt: null },
  { code: "COMRADE x REHAN",       name: "Rehan",          expiresAt: null },
  { code: "COMRADE x SAUGAT",      name: "Saugat",         expiresAt: null },
  { code: "COMRADE x SADIS",       name: "Sadis",          expiresAt: null },
  { code: "COMRADE x ADARSHA",     name: "Adarsha",        expiresAt: null },
  { code: "COMRADE x ANIK",        name: "Anik",           expiresAt: null },
];

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION CONFIG
   No VAPID / Firebase needed. Works on all platforms.
═══════════════════════════════════════════════════════════ */
const NOTIFY_CONFIG = {
  enabled:          true,
  promptDelay:      4000,
  promptOnce:       true,
  newResourceNotif: true,
  queueNotif:       true,
  defaultIcon:      "assets/images/notes/F&B SERVICE.png",
  defaultBadge:     "assets/images/notes/F&B SERVICE.png",
  defaultVibrate:   [200, 100, 200],
};

const NOTIFY_QUEUE = [
  // Example:
  // {
  //   id:     "notif-welcome-2025",          // unique ID — only fires once per browser
  //   title:  "📚 Lal Salam Updated!",
  //   body:   "New notes for F&B Service Unit 2 are now available.",
  //   icon:   "assets/images/notes/F&B SERVICE.png",
  //   url:    "./index.html",
  //   requireInteraction: false,
  // },
];

const CHAT_CONFIG = {
  enabled:     true,
  title:       "Lal Salam Chat",
  subtitle:    "BHM Students",
  placeholder: "Message…",
  maxMessages: 300,
  notifyOnMsg: true,
  notifTitle:  "💬 {sender}",
  notifBody:   "{preview}",
};

const ANIM_CONFIG = {
  particles:      true,
  ripple:         true,
  confetti:       true,
  cards:          true,
  counter:        true,
  cursor:         true,
  pageTrans:      true,
  particleCount:  35,
  particleColor:  "#f5c842",
  particleOpacity: 0.45,
  confettiColors: ["#f5c842","#e8a500","#fff8dc","#ffffff","#f5c84288"],
};

const SEMESTERS = [
  { id: "sem1", label: "Semester 1", icon: "📖", color: "#6366f1" },
  { id: "sem2", label: "Semester 2", icon: "📗", color: "#10b981" },
  { id: "sem3", label: "Semester 3", icon: "📘", color: "#3b82f6" },
  { id: "sem4", label: "Semester 4", icon: "📙", color: "#f5c842" },
  { id: "sem5", label: "Semester 5", icon: "📕", color: "#e84545" },
  { id: "sem6", label: "Semester 6", icon: "📓", color: "#a855f7" },
  { id: "sem7", label: "Semester 7", icon: "📒", color: "#f97316" },
  { id: "sem8", label: "Semester 8", icon: "🎓", color: "#14b8a6" },
];

const SUBJECTS = {
  sem1: [
    //{ id: "fnb-s1",  label: "F&B Service",               icon: "🍽️", semId: "sem1" },
    //{ id: "fp-s1",   label: "Food Production & Patisserie", icon: "👨‍🍳", semId: "sem1" },
    //{ id: "rdm-s1",  label: "Rooms Division Management",  icon: "🏨", semId: "sem1" },
    //{ id: "eng-s1",  label: "English Communication",      icon: "📝", semId: "sem1" },
    //{ id: "it-s1",   label: "IT in Hospitality",          icon: "💻", semId: "sem1" },
  ],
  sem2: [
    //{ id: "fnb-s2",  label: "F&B Service",               icon: "🍽️", semId: "sem2" },
    //{ id: "fp-s2",   label: "Food Production & Patisserie", icon: "👨‍🍳", semId: "sem2" },
    //{ id: "hk-s2",   label: "Housekeeping",               icon: "🧹", semId: "sem2" },
    //{ id: "mkt-s2",  label: "Marketing",                  icon: "📊", semId: "sem2" },
    //{ id: "acc-s2",  label: "Accounting",                 icon: "💰", semId: "sem2" },
  ],
  sem3: [
    //{ id: "fnb-s3",  label: "F&B Management",            icon: "🍽️", semId: "sem3" },
    //{ id: "fp-s3",   label: "Food Production",            icon: "👨‍🍳", semId: "sem3" },
    //{ id: "hm-s3",   label: "Hotel Management",           icon: "🏨", semId: "sem3" },
    //{ id: "hr-s3",   label: "Human Resources",            icon: "👥", semId: "sem3" },
  ],
  sem4: [
    { id: "fnb-s4",  label: "F&B Service",               icon: "🍽️", semId: "sem4" },
    { id: "fp-s4",   label: "Food Production & Patisserie", icon: "👨‍🍳", semId: "sem4" },
    { id: "rdm-s4",  label: "RDM",                        icon: "📊", semId: "sem4" },
    { id: "mkt-s4",  label: "Marketing",                  icon: "📈", semId: "sem4" },
  ],
  sem5: [],
  sem6: [],
  sem7: [],
  sem8: [],
};

const FOLDERS = {
  notes: [
    { id: "fnb",        label: "F&B Service",                  icon: "🍽️" },
    { id: "production", label: "Food Production & Patisserie", icon: "👨‍🍳" },
    { id: "rdm",        label: "RDM",                          icon: "📊" },
  ],
  assignments: [
    { id: "fnb-asgn",  label: "F&B Service",    icon: "🍽️" },
    { id: "mkt-asgn",  label: "Marketing",       icon: "📊" },
    { id: "prod-asgn", label: "Food Production", icon: "👨‍🍳" },
  ],
  logbook: [
    { id: "fnb-lb",   label: "F&B Service",    icon: "📅" },
    { id: "prodn-lb", label: "Food Production", icon: "📅" },
    { id: "rdm-lb",   label: "RDM",             icon: "📅" },
  ],
};

const RESOURCES = {
  notes: [
    {
      id: "note-fnb-s4-u1",
      semId: "sem4", subjectId: "fnb-s4",
      folderId: "fnb",
      title: "Unit 1 – F&B Service",
      subject: "F&B Service",
      description: "Complete Unit 1 notes — service styles, equipment, mise en place and table settings.",
      thumbnail: "assets/images/notes/F&B SERVICE.png",
      previewType: "image",
      previewSrc: "assets/images/notes/F&B SERVICE.png",
      downloadFile: "assets/files/notes/Service Unit 1.docx",
      downloadName: "FnB_Service_Unit1.docx",
      notify: false,
    },
    {
      id: "note-fp-s4-u1",
      semId: "sem4", subjectId: "fp-s4",
      folderId: "production",
      title: "Unit 1 – Food Production & Patisserie",
      subject: "Food Production",
      description: "Classical & modern food production methods, kitchen brigade, and patisserie fundamentals.",
      thumbnail: "assets/images/notes/FP&P.png",
      previewType: "image",
      previewSrc: "assets/images/notes/FP&P.png",
      downloadFile: "assets/files/notes/Production - Unit 1.docx",
      downloadName: "FoodProduction_Unit1.docx",
      notify: false,
    },
  ],
  assignments: [
    {
      id: "asgn-fnb-whisky",
      semId: "sem4", subjectId: "fnb-s4",
      folderId: "fnb-asgn",
      title: "F&B — Whisky Service",
      subject: "F&B Service",
      description: "Whisky types, service styles, and pairing recommendations.",
      thumbnail: "assets/images/assignments/F&B Whisky.png",
      previewType: "image",
      previewSrc: "assets/images/assignments/F&B Whisky.png",
      downloadFile: "assets/files/assignments/F&B Assignment.docx",
      downloadName: "FnB_Whisky_Assignment.docx",
      notify: false,
    },
    {
      id: "asgn-mkt-u1",
      semId: "sem4", subjectId: "mkt-s4",
      folderId: "mkt-asgn",
      title: "Marketing Unit 1 Assignment",
      subject: "Marketing",
      description: "Market segmentation, the 4Ps, and competitive positioning.",
      thumbnail: "assets/images/assignments/F&B Whisky.png",
      previewType: "image",
      previewSrc: "assets/images/assignments/F&B Whisky.png",
      downloadFile: "assets/files/assignments/Marketing Unit 1 Assignment.docx",
      downloadName: "Marketing_Unit1.docx",
      notify: false,
    },
  ],
  logbook: [],
};
