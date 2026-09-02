// ============================================================
// FIREBASE — same project/collection as the previous ISO17025 app
// (iso17025-b46ae, doc iso17025/documents, single-array schema)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaJ6vmhob-2rbWgrSXy0y7ZbodI7ZKJsk",
  authDomain: "iso17025-b46ae.firebaseapp.com",
  projectId: "iso17025-b46ae",
  storageBucket: "iso17025-b46ae.firebasestorage.app",
  messagingSenderId: "336569574112",
  appId: "1:336569574112:web:a380f141379e4deedb2685",
  measurementId: "G-TXJNG11ZY4",
};
const firebaseApp = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(firebaseApp);
const docRef = doc(dbFirestore, "iso17025", "documents");
const archiveDocRef = doc(dbFirestore, "iso17025", "archive");
const watermarkLogRef = doc(dbFirestore, "iso17025", "watermarklog");

// ============================================================
// AUTH — soft, client-side login for identity + role-based UI gating.
// NOTE: this is a static site with no backend, so this is NOT
// cryptographically secure (the password list lives in this JS file
// and could be read via browser dev tools). It's meant to stop
// accidental misuse and give every action a real name for the audit
// trail, not to withstand a determined attacker. Real security would
// need Firebase Authentication + Firestore security rules.
// ============================================================
// fixed external SharePoint request-form link — the same form every
// requester fills out at step 2 of a new/revision request (step 3 is a
// separate, per-document working link that DC pastes in later)
const EXTERNAL_REQUEST_FORM_LINK = 'https://mitrphol.sharepoint.com/:l:/s/ServiceLab/JADi783WMc0gT6wo8iS0ojrJAc8VFmVEeOfR9ClBWLZ8qRA?nav=MWZmZDZkOGItZDc3Zi00NjcwLWI3M2MtNTZkN2YwNzNkZDc5';

const USERS = [
  { id:'yaraponp',  password:'yarapon23452', name:'Yarapon Puttakot',   role:'DC' },
  { id:'thidarati', password:'ISO123',       name:'Thitarat Intakham',  role:'QM' },
  { id:'pimchanok', password:'mpir1234',     name:'Pimchanok Busayapong', role:'LM' },
];
const ROLE_LABEL = { DC:'Document Control', QM:'Quality Manager', LM:'Lab Manager' };
let currentUser = null;
const SESSION_KEY = 'mpir_iso17025_session';
function tryRestoreSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return;
    const saved = JSON.parse(raw);
    const match = USERS.find(u=>u.id===saved.id);
    if(match) currentUser = { id:match.id, name:match.name, role:match.role };
  } catch(e){ /* ignore corrupt/blocked storage */ }
}
function saveSession(){
  try{ localStorage.setItem(SESSION_KEY, JSON.stringify({ id: currentUser.id })); } catch(e){}
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_KEY); } catch(e){}
  currentUser = null;
}
function isDC(){ return !!currentUser && currentUser.role==='DC'; }
function currentActorName(){ return currentUser ? currentUser.name : 'ไม่ระบุ'; }

function renderLoginScreen(){
  const el = document.createElement('div');
  el.className = 'login-screen';
  el.id = 'loginScreen';
  el.innerHTML = `
    <div class="login-card">
      <div class="login-logo">MP</div>
      <div class="login-title">MPIR Central Lab</div>
      <div class="login-sub">ระบบเอกสาร ISO/IEC 17025:2017 — เข้าสู่ระบบ</div>
      <div class="field"><label>รหัสผู้ใช้ (ID)</label><input id="loginId" placeholder="เช่น yaraponp" autocomplete="username"></div>
      <div class="field"><label>รหัสผ่าน</label><input id="loginPw" type="password" placeholder="Password" autocomplete="current-password"></div>
      <div class="field-error" id="loginError" style="display:none;"></div>
      <button class="btn primary" id="loginBtn" style="width:100%; justify-content:center; margin-top:8px;">เข้าสู่ระบบ</button>
    </div>`;
  document.body.appendChild(el);
  const doLogin = ()=>{
    const id = document.getElementById('loginId').value.trim();
    const pw = document.getElementById('loginPw').value;
    const errEl = document.getElementById('loginError');
    const user = USERS.find(u=>u.id===id && u.password===pw);
    if(!user){ errEl.textContent = 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'; errEl.style.display='block'; return; }
    currentUser = { id:user.id, name:user.name, role:user.role };
    saveSession();
    const screen = document.getElementById('loginScreen');
    if(screen) screen.remove();
    startApp();
  };
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('loginPw').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  document.getElementById('loginId').focus();
}
function updateUserBadge(){
  if(!currentUser) return;
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userNameDisplay');
  const roleEl = document.getElementById('userRoleDisplay');
  if(avatarEl) avatarEl.textContent = initials;
  if(nameEl) nameEl.textContent = currentUser.name;
  if(roleEl) roleEl.textContent = `${currentUser.role} — ${ROLE_LABEL[currentUser.role]}`;
  const badge = document.getElementById('userBadge');
  if(badge) badge.onclick = ()=>{
    if(confirm('ออกจากระบบใช่หรือไม่?')){ clearSession(); location.reload(); }
  };
  // Administration now stays visible to everyone, like Archive — it hosts
  // the watermark/print tool that every role can use. The DC-only parts
  // (Firestore/SharePoint info, Import Master List) are gated inside
  // viewAdmin() itself, not by hiding the nav entry.
  document.querySelectorAll('.nav-item[data-view="administration"], .nav-item[data-view="admin"]').forEach(el=>{
    el.style.display = '';
  });
}

async function loadDocs(){
  try{
    const snap = await getDoc(docRef);
    if(snap.exists() && Array.isArray(snap.data().docs)){
      DOCUMENTS = snap.data().docs;
    } else {
      DOCUMENTS = [];
    }
    // backfill fields for records saved before the approval workflow existed
    let needsMigration = false;
    DOCUMENTS.forEach(d=>{
      if(d.approvalStatus===undefined){ d.approvalStatus = (d.note==='ควบคุม'||d.note==='แจกจ่าย') ? 'อนุมัติแล้ว' : 'ร่าง'; needsMigration = true; }
      if(d.reviewerName===undefined){ d.reviewerName=''; needsMigration = true; }
      if(d.approverName===undefined){ d.approverName=''; needsMigration = true; }
      if(!Array.isArray(d.comments)){ d.comments=[]; needsMigration = true; }
      if(d.lastUpdated===undefined){ d.lastUpdated = Date.now(); needsMigration = true; }
      if(d.preparedBy===undefined){ d.preparedBy=''; needsMigration = true; }
      if(d.rev===undefined){ d.rev=null; needsMigration = true; }
      if(d.createdDate===undefined){ d.createdDate=null; needsMigration = true; }
      if(d.effectiveDate===undefined){ d.effectiveDate=null; needsMigration = true; }
      if(d.approvedBy===undefined){ d.approvedBy=null; needsMigration = true; }
      if(d.approvedAt===undefined){ d.approvedAt=null; needsMigration = true; }
      if(d.approvedComment===undefined){ d.approvedComment=null; needsMigration = true; }
      if(d.reviewCycleDays===undefined){ d.reviewCycleDays=DEFAULT_REVIEW_CYCLE_DAYS; needsMigration = true; }
      if(d.lastReviewedAt===undefined){ d.lastReviewedAt=null; needsMigration = true; }
      if(d.lastReviewedBy===undefined){ d.lastReviewedBy=''; needsMigration = true; }
      if(d.publishedLink===undefined){ d.publishedLink=null; needsMigration = true; }
      if(!Array.isArray(d.linkHistory)){ d.linkHistory=[]; needsMigration = true; }
      if(d.dcRegisteredLink===undefined){ d.dcRegisteredLink=null; needsMigration = true; }
      if(d.dcRegisteredBy===undefined){ d.dcRegisteredBy=null; needsMigration = true; }
      if(d.dcRegisteredAt===undefined){ d.dcRegisteredAt=null; needsMigration = true; }
      if(d.formConfirmedAt===undefined){ d.formConfirmedAt=null; needsMigration = true; }
      if(d.formConfirmedBy===undefined){ d.formConfirmedBy=null; needsMigration = true; }
      if(d.linkSetAt===undefined){ d.linkSetAt=null; needsMigration = true; }
      if(d.linkSetBy===undefined){ d.linkSetBy=null; needsMigration = true; }
      if(d.reviewedAt===undefined){ d.reviewedAt=null; needsMigration = true; }
      if(d.publishedBy===undefined){ d.publishedBy=null; needsMigration = true; }
      if(d.publishedAt===undefined){ d.publishedAt=null; needsMigration = true; }
    });
    DOCS_LOADED = true;
    DOCS_ERROR = null;
    if(needsMigration) await persistDocs(true);
  } catch(e){
    console.error('load failed', e);
    DOCS_ERROR = e.message || String(e);
    DOCS_LOADED = false;
  }
}

let saving = false;
async function persistDocs(silent){
  saving = true;
  if(!silent) updateSyncPill();
  try{
    await setDoc(docRef, { docs: DOCUMENTS, updatedAt: Date.now() });
  } catch(e){
    console.error('save failed', e);
    alert('บันทึกไป Firebase ไม่สำเร็จ: ' + e.message);
  }
  saving = false;
  if(!silent) updateSyncPill();
}
function updateSyncPill(){
  const p = document.getElementById('syncPill');
  if(!p) return;
  p.className = 'sync-pill' + (saving ? ' saving' : '');
  p.innerHTML = `<span class="dot"></span>${saving ? 'กำลังบันทึก…' : 'Synced with Firestore'}`;
}

async function loadArchive(){
  try{
    const snap = await getDoc(archiveDocRef);
    ARCHIVE_ITEMS = (snap.exists() && Array.isArray(snap.data().items)) ? snap.data().items : [];
    ARCHIVE_LOADED = true;
    ARCHIVE_ERROR = null;
  } catch(e){
    console.error('archive load failed', e);
    ARCHIVE_ERROR = e.message || String(e);
    ARCHIVE_LOADED = false;
  }
}
let archiveSaving = false;
async function persistArchive(){
  archiveSaving = true;
  try{
    await setDoc(archiveDocRef, { items: ARCHIVE_ITEMS, updatedAt: Date.now() });
  } catch(e){
    console.error('archive save failed', e);
    alert('บันทึกคลังเอกสารไม่สำเร็จ: ' + e.message);
  }
  archiveSaving = false;
}

// watermark distribution log — DC-only feature (see viewAdmin). We never
// store the uploaded PDF itself, only a record of each watermark+download
// action (document ID, who, when) so DC can track how many controlled
// copies of a document have been issued.
var WATERMARK_LOG = [];
var WATERMARK_LOG_LOADED = false;
async function loadWatermarkLog(){
  try{
    const snap = await getDoc(watermarkLogRef);
    WATERMARK_LOG = (snap.exists() && Array.isArray(snap.data().items)) ? snap.data().items : [];
    // backfill: old entries predate the download/distribute split — infer
    // from whether a recipient was recorded (a named recipient means it was
    // handed to someone, i.e. distributed; no recipient means it was just
    // downloaded for the actor's own use)
    WATERMARK_LOG.forEach(e=>{
      if(e.type===undefined){ e.type = e.recipient ? 'distribute' : 'download'; }
    });
    WATERMARK_LOG_LOADED = true;
  } catch(e){
    console.error('watermark log load failed', e);
    WATERMARK_LOG_LOADED = false;
  }
}
async function persistWatermarkLog(){
  try{
    await setDoc(watermarkLogRef, { items: WATERMARK_LOG, updatedAt: Date.now() });
  } catch(e){
    console.error('watermark log save failed', e);
    alert('บันทึกประวัติการดาวน์โหลดไม่สำเร็จ: ' + e.message);
  }
}

// ============================================================
// APP STATE
// ============================================================
const state = {
  view: 'dashboard',
  selectedClause: '',
  isoTab: 'documents',
  docFilter: { clause:'All', type:'All', status:'All', q:'', preset:'all' },
  docPage: 1,
  selectedDoc: null,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  modal: null, // { mode:'new'|'edit', id }
  queueListOpen: false,
  approvalTab: 'active',
  approvalDetailOpen: false,
  approvalCommentsExpanded: false,
  dcPublishEditing: false,
  archiveFilter: { category:'All', status:'All', q:'' },
  archiveModal: null, // { mode:'new'|'edit'|'verify', id }
  wmManualModal: false,
  wmExpandedDoc: null,
  archiveFolder: { year:null, category:null },
  approvalPage: 1,
  approvalTypeFilter: 'All',
  revFilter: { clause:'All', type:'All', status:'All', q:'' },
  revPage: 1,
  revisionDetailOpen: false,
  revisionTimelineExpanded: false,
};

const ICONS = {
  doc: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  check: `<path d="m5 12 5 5L20 7"/>`,
  clock: `<path d="M12 7v5l3 3"/><circle cx="12" cy="12" r="9"/>`,
  alert: `<path d="M12 8v5M12 16h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>`,
  file: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  pdf: `<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>`,
  history: `<path d="M12 2a10 10 0 1 0 7.07 2.93M12 2v5h5"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  empty: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  trash: `<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  send: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
  chevronRight: `<path d="m9 18 6-6-6-6"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
  bell: `<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>`,
  filter: `<path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z"/>`,
  folder: `<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
};
function ic(name, cls=''){ return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

function emptyState(title, sub){
  return `<div class="empty-state">${ic('empty')}<h3>${title}</h3><p>${sub}</p></div>`;
}

function pendingQueue(){
  return DOCUMENTS.filter(d=> d.approvalStatus==='ร่าง' || d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ')
    .sort((a,b)=> (a.lastUpdated||0)-(b.lastUpdated||0));
}
// whether it's specifically the logged-in user's turn to act on this
// request right now — mirrors the approve-button gating rules exactly, so
// notifications only ever point at something that person can actually do
function isMyTurn(d){
  if(!currentUser) return false;
  if(isDC()) return true; // DC oversees the whole system and can act at every step
  if(d.lastRequestType!=='new' && d.lastRequestType!=='revision') return false;
  if(d.approvalStatus==='ร่าง') return d.requestedBy === currentUser.name;
  if(d.approvalStatus==='รอทบทวน'){
    if(!d.linkSetAt) return false; // waiting on DC first
    return currentUser.role==='QM' && d.requestedBy !== currentUser.name;
  }
  if(d.approvalStatus==='รออนุมัติ') return currentUser.role==='LM';
  return false;
}
// the notification bell only shows requests waiting specifically on the
// logged-in person — NOTE: this is a static site with no backend/push
// notifications, so this can only alert someone once they're actually
// logged into the app; it can't message an offline account
function myActionQueue(){
  return pendingQueue().filter(isMyTurn);
}
let notifOpen = false;
let helpOpen = false;
let settingsOpen = false;
function closeAllTopPanels(except){
  if(except!=='notif' && notifOpen){ notifOpen = false; renderNotifPanel(); }
  if(except!=='help' && helpOpen){ helpOpen = false; renderHelpPanel(); }
  if(except!=='settings' && settingsOpen){ settingsOpen = false; renderSettingsPanel(); }
}
function wireNotifBell(){
  const bell = document.getElementById('notifBell');
  if(bell) bell.addEventListener('click', e=>{
    e.stopPropagation();
    const opening = !notifOpen;
    closeAllTopPanels('notif');
    notifOpen = opening;
    renderNotifPanel();
  });
  document.addEventListener('click', ()=>{
    if(notifOpen){ notifOpen = false; renderNotifPanel(); }
  });
}
function updateNotifBadge(){
  const dot = document.getElementById('notifDot');
  if(!dot) return;
  const n = myActionQueue().length;
  dot.style.display = n>0 ? 'block' : 'none';
}
function wireBackButton(){
  const btn = document.getElementById('topBackBtn');
  if(btn) btn.addEventListener('click', goBack);
}
function updateBackButton(){
  const btn = document.getElementById('topBackBtn');
  if(!btn) return;
  btn.style.display = navStack.length>0 ? 'flex' : 'none';
}

// ============================================================
// HELP PANEL — clicking Help shows a card explaining the linked
// document instead of jumping straight to a new tab.
// ============================================================
function wireHelpBtn(){
  const btn = document.getElementById('helpBtn');
  if(btn) btn.addEventListener('click', e=>{
    e.stopPropagation();
    const opening = !helpOpen;
    closeAllTopPanels('help');
    helpOpen = opening;
    renderHelpPanel();
  });
  document.addEventListener('click', ()=>{
    if(helpOpen){ helpOpen = false; renderHelpPanel(); }
  });
}
function renderHelpPanel(){
  const wrap = document.getElementById('helpPanel');
  if(!wrap) return;
  if(!helpOpen){ wrap.style.display = 'none'; wrap.innerHTML=''; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="dp-title">คู่มือ ISO/IEC 17025:2017 (GLA-23)</div>
    <div class="dp-sub">ข้อแนะนำประกอบการตรวจประเมิน ตาม มอก. 17025-2561 จัดทำโดยสำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.) — ใช้เฉพาะกิจกรรมการรับรองห้องปฏิบัติการของ MPIR เท่านั้น ไม่ใช่ตัวมาตรฐานฉบับแปล</div>
    <a class="btn primary" href="./GLA-23-00.pdf" target="_blank" rel="noopener" style="width:100%; justify-content:center; box-sizing:border-box;">${ic('doc')} เปิดเอกสาร (PDF)</a>
  `;
}

// ============================================================
// SETTINGS PANEL — language switcher + logout.
// Language switching only re-labels the app's fixed chrome (sidebar
// nav, topbar, brand) — it does not translate document content,
// which comes from the lab's own real (mixed Thai/English) data.
// ============================================================
const I18N = {
  th: {
    brandTitle:'MPIR CENTRAL LAB', brandSub:'ISO/IEC 17025:2017',
    search:'Search documents, records, ISO clause...',
    nav_dashboard:'Dashboard', nav_documents:'Documents',
    nav_archive:'คลังเอกสาร', nav_approval:'Approval', nav_audit:'Audit',
    nav_calendar:'Review Calendar', nav_admin:'Administration',
  },
  en: {
    brandTitle:'MPIR CENTRAL LAB', brandSub:'ISO/IEC 17025:2017',
    search:'Search documents, records, ISO clause...',
    nav_dashboard:'Dashboard', nav_documents:'Documents',
    nav_archive:'Document Archive', nav_approval:'Approval', nav_audit:'Audit',
    nav_calendar:'Review Calendar', nav_admin:'Administration',
  },
};
const LANG_KEY = 'mpir_iso17025_lang';
let uiLang = 'th';
try{ uiLang = localStorage.getItem(LANG_KEY) || 'th'; }catch(e){}
function applyLanguage(){
  const t = I18N[uiLang] || I18N.th;
  const setText = (sel, val)=>{ const el = document.querySelector(sel); if(el) el.textContent = val; };
  setText('.brand-title', t.brandTitle);
  setText('.brand-sub', t.brandSub);
  const searchInput = document.getElementById('globalSearch');
  if(searchInput) searchInput.placeholder = t.search;
  const navMap = { dashboard:'nav_dashboard', documents:'nav_documents',
    archive:'nav_archive', approval:'nav_approval', audit:'nav_audit',
    calendar:'nav_calendar', admin:'nav_admin', administration:'nav_admin' };
  document.querySelectorAll('.nav-item').forEach(btn=>{
    const key = navMap[btn.dataset.view];
    if(key && t[key]){ const span = btn.querySelector('span'); if(span) span.textContent = t[key]; }
  });
}
function setLanguage(lang){
  uiLang = lang;
  try{ localStorage.setItem(LANG_KEY, lang); }catch(e){}
  applyLanguage();
  renderSettingsPanel();
}
function wireSettingsBtn(){
  const btn = document.getElementById('settingsBtn');
  if(btn) btn.addEventListener('click', e=>{
    e.stopPropagation();
    const opening = !settingsOpen;
    closeAllTopPanels('settings');
    settingsOpen = opening;
    renderSettingsPanel();
  });
  document.addEventListener('click', ()=>{
    if(settingsOpen){ settingsOpen = false; renderSettingsPanel(); }
  });
}
function renderSettingsPanel(){
  const wrap = document.getElementById('settingsPanel');
  if(!wrap) return;
  if(!settingsOpen){ wrap.style.display = 'none'; wrap.innerHTML=''; return; }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="dp-title">ภาษา / Language</div>
    <div class="lang-toggle" style="margin-bottom:12px;">
      <button id="langTh" class="${uiLang==='th'?'active':''}">ไทย</button>
      <button id="langEn" class="${uiLang==='en'?'active':''}">English</button>
    </div>
    <div class="dp-divider"></div>
    <button class="dp-btn danger" id="btnLogoutMenu">${ic('logout')} ออกจากระบบ (Logout)</button>
  `;
  const thBtn = document.getElementById('langTh');
  const enBtn = document.getElementById('langEn');
  if(thBtn) thBtn.addEventListener('click', e=>{ e.stopPropagation(); setLanguage('th'); });
  if(enBtn) enBtn.addEventListener('click', e=>{ e.stopPropagation(); setLanguage('en'); });
  const logoutBtn = document.getElementById('btnLogoutMenu');
  if(logoutBtn) logoutBtn.addEventListener('click', e=>{
    e.stopPropagation();
    if(confirm('ออกจากระบบใช่หรือไม่?')){ clearSession(); location.reload(); }
  });
}

function renderNotifPanel(){
  const wrap = document.getElementById('notifPanel');
  if(!wrap) return;
  updateNotifBadge();
  if(!notifOpen){ wrap.style.display = 'none'; wrap.innerHTML=''; return; }
  const queue = myActionQueue();
  wrap.className = 'notif-panel';
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="notif-head">รอคุณดำเนินการ (${queue.length})</div>
    ${queue.length ? queue.map(d=>{
      const label = d.lastRequestType==='new' ? 'คำขอเอกสารใหม่' : d.lastRequestType==='revision' ? `คำขอปรับปรุง Rev.${d.lastRequestFrom||'-'} → ${d.rev||'-'}` : d.lastRequestType==='review' ? 'คำขอทบทวนประจำปี' : 'รอดำเนินการ';
      return `
      <div class="notif-item" data-notif-doc="${d.id}">
        <div class="notif-icon">${ic('clock')}</div>
        <div class="notif-text">
          <div class="notif-title">${d.id} — ${cleanName(d)}</div>
          <div class="notif-sub">${label} · ${approvalBadge(d.approvalStatus)}</div>
        </div>
      </div>`;
    }).join('') : `<div class="notif-empty">ไม่มีคำขอค้างอยู่</div>`}
  `;
  wrap.querySelectorAll('[data-notif-doc]').forEach(elx=>{
    elx.addEventListener('click', e=>{
      e.stopPropagation();
      notifOpen = false;
      renderNotifPanel();
      goTo('approval', { selectedDoc: elx.dataset.notifDoc, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
    });
  });
}
function nextRevNumber(currentRev){
  const n = parseInt(currentRev, 10);
  return isNaN(n) ? '1' : String(n+1);
}
function openModal(opts){ state.modal = opts; renderModalLayer(); }
function closeModal(){ state.modal = null; renderModalLayer(); }
function renderModalLayer(){
  const layer = document.getElementById('modalLayer');
  if(!layer) return;
  if(state.modal){
    layer.innerHTML = docModal();
    wireModalControls();
  } else if(state.archiveModal){
    layer.innerHTML = archiveModal();
    wireArchiveModalControls();
  } else if(state.wmManualModal){
    layer.innerHTML = wmManualModal();
    wireWmManualModal();
  } else {
    layer.innerHTML = '';
  }
}
function openArchiveModal(opts){ state.archiveModal = opts; renderModalLayer(); }
function closeArchiveModal(){ state.archiveModal = null; renderModalLayer(); }

// display-only: many document names already have the doc ID typed into
// them (e.g. name="RDI-LM-01 คู่มือคุณภาพ"), which duplicates the ID
// column/label everywhere id+name are shown together. Strip it for display.
function cleanName(d){
  if(!d || !d.name) return '';
  const id = (d.id||'').trim();
  let n = d.name.trim();
  if(id && n.startsWith(id)){
    n = n.slice(id.length).replace(/^[\s\-:–—]+/, '').trim();
  }
  return n || d.name;
}

// ============================================================
// BOOT
// ============================================================
async function startApp(){
  updateUserBadge();
  renderBootScreen('กำลังโหลดข้อมูลจาก Firestore…');
  await loadDocs();
  if(!DOCS_LOADED){
    renderBootError(DOCS_ERROR);
    return;
  }
  loadArchive().then(()=>{ if(state.view==='archive' || state.view==='records') render(); }); // best-effort, non-blocking — Archive is a separate store; 'records' also needs it now that Evidence/Support shows clause-tagged archive items too
  loadWatermarkLog().then(()=>{ if(state.view==='admin') render(); }); // best-effort, non-blocking
  removeBootScreen();
  wireNav();
  wireGlobalSearch();
  wireNotifBell();
  wireHelpBtn();
  wireSettingsBtn();
  wireBackButton();
  wireSidebarToggle();
  applyLanguage();
  render();
  updateUserBadge();
}
function initApp(){
  tryRestoreSession();
  if(currentUser) startApp();
  else renderLoginScreen();
}
function renderBootScreen(text){
  const el = document.createElement('div');
  el.className = 'boot-screen';
  el.id = 'bootScreen';
  el.innerHTML = `<div class="boot-spinner"></div><div class="boot-text">${text}</div>`;
  document.body.appendChild(el);
}
function renderBootError(msg){
  const el = document.getElementById('bootScreen');
  if(!el) return;
  el.innerHTML = `<div class="boot-error"><h3>โหลดข้อมูลจาก Firebase ไม่สำเร็จ</h3><p>${msg || 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและ Firestore rules ของโปรเจกต์ iso17025-b46ae แล้วลองรีเฟรชหน้านี้อีกครั้ง'}</p></div>`;
}
function removeBootScreen(){
  const el = document.getElementById('bootScreen');
  if(el) el.remove();
}

// ============================================================
// NAV + HISTORY STACK (so "back" returns to the actual previous
// page/filters, not a hardcoded target)
// ============================================================
let navStack = [];
function snapshotState(){
  // state only holds plain data (no functions/DOM refs), safe to deep-clone
  return JSON.parse(JSON.stringify(state));
}
function syncNavActive(){
  const activeKey = NAV_GROUP_MAP[state.view] || state.view;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===activeKey));
}
// which sidebar button stays highlighted for each of the merged views
const NAV_GROUP_MAP = {
  documents:'documents', iso:'documents', records:'documents',
  audit:'audit', audittrail:'audit',
  approval:'approval', revision:'approval',
};
// shared tab bars for the three merged sections — the underlying pages/state
// (docFilter, selectedClause, isoTab, approvalTab, revFilter, etc.) are all
// untouched; this only adds a tab strip on top and reuses goTo() to switch
// between the views that used to be separate sidebar entries
function renderDocHubTabs(){
  const tabs = [ ['documents','ทั้งหมด'], ['iso','ตามข้อกำหนด ISO'], ['records','หลักฐาน/สนับสนุน'] ];
  return `<div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${state.view===k?'active':''}" data-hub-nav="${k}">${l}</button>`).join('')}</div>`;
}
function renderAuditHubTabs(){
  const tabs = [ ['audit','ภาพรวมตรวจสอบ'], ['audittrail','บันทึกกิจกรรม'] ];
  return `<div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${state.view===k?'active':''}" data-hub-nav="${k}">${l}</button>`).join('')}</div>`;
}
function renderWorkflowHubTabs(){
  const tabs = [ ['approval','คำขออนุมัติ'], ['revision','ภาพรวมการปรับปรุง'] ];
  return `<div class="tabs">${tabs.map(([k,l])=>`<button class="tab ${state.view===k?'active':''}" data-hub-nav="${k}">${l}</button>`).join('')}</div>`;
}
function wireHubTabs(){
  document.querySelectorAll('[data-hub-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const view = btn.dataset.hubNav;
      let extra = {};
      if(view==='documents') extra = { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:'all' }, docPage:1 };
      if(view==='revision') extra = { revFilter:{ clause:'All', type:'All', status:'All', q:'' }, revPage:1, revisionDetailOpen:false };
      if(view==='approval'){
        const next = pendingQueue()[0];
        extra = { approvalTab:'active', approvalPage:1, approvalDetailOpen:false };
        if(next) extra.selectedDoc = next.id;
      }
      goTo(view, extra);
    });
  });
}
function wireNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      let extra = {};
      if(btn.dataset.view==='documents') extra = { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:'all' }, docPage:1 };
      if(btn.dataset.view==='revision') extra = { revFilter:{ clause:'All', type:'All', status:'All', q:'' }, revPage:1, revisionDetailOpen:false };
      if(btn.dataset.view==='archive') extra = { archiveFilter:{ category:'All', status:'All', q:'' }, archiveFolder:{ year:null, category:null } };
      if(btn.dataset.view==='approval'){
        const next = pendingQueue()[0];
        extra = { approvalTab:'active', approvalPage:1, approvalDetailOpen:false };
        if(next) extra.selectedDoc = next.id;
      }
      goTo(btn.dataset.view, extra);
    });
  });
}
function openSidebar(){
  document.querySelector('.sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
}
function wireSidebarToggle(){
  const toggle = document.getElementById('menuToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  if(toggle) toggle.addEventListener('click', ()=>{
    const sidebar = document.querySelector('.sidebar');
    if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  });
  if(backdrop) backdrop.addEventListener('click', closeSidebar);
}
function goTo(view, extra={}){
  navStack.push(snapshotState());
  Object.assign(state, extra);
  state.view = view;
  syncNavActive();
  render();
  window.scrollTo({top:0, behavior:'instant'});
  closeSidebar();
}
function goBack(){
  if(navStack.length){
    const prev = navStack.pop();
    Object.assign(state, prev);
    syncNavActive();
    render();
  } else {
    goTo('dashboard');
  }
  window.scrollTo({top:0, behavior:'instant'});
}
function wireGlobalSearch(){
  const gs = document.getElementById('globalSearch');
  gs.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      goTo('documents', { docFilter:{ clause:'All', type:'All', status:'All', q:e.target.value, preset:'all' }, docPage:1 });
    }
  });
}

// ============================================================
// RENDER ROOT
// ============================================================
function render(){
  const el = document.getElementById('content');
  switch(state.view){
    case 'dashboard': el.innerHTML = viewDashboard(); break;
    case 'iso': el.innerHTML = renderDocHubTabs() + viewISO(); attachISOHandlers(); break;
    case 'documents': renderDocumentsInto(); wireDocControls(); renderModalLayer(); updateNotifBadge(); updateBackButton(); wireHubTabs(); return;
    case 'records': el.innerHTML = renderDocHubTabs() + viewEvidence(); attachEvidenceHandlers(); break;
    case 'archive': el.innerHTML = viewArchive(); attachArchiveHandlers(); break;
    case 'revision': el.innerHTML = renderWorkflowHubTabs() + viewRevisionDashboard(); attachRevisionDashboardHandlers(); break;
    case 'approval': el.innerHTML = renderWorkflowHubTabs() + viewApproval(); attachApprovalHandlers(); break;
    case 'audit': el.innerHTML = renderAuditHubTabs() + viewAudit(); attachAuditHandlers(); break;
    case 'calendar': el.innerHTML = viewCalendar(); attachCalHandlers(); break;
    case 'audittrail': el.innerHTML = renderAuditHubTabs() + viewAuditTrail(); break;
    case 'admin': el.innerHTML = viewAdmin(); attachWatermarkHandlers(); break;
    case 'docdetail': el.innerHTML = viewDocDetail(state.selectedDoc); attachDetailActionHandlers(); break;
    default: el.innerHTML = viewDashboard();
  }
  attachGlobalRowHandlers();
  renderModalLayer();
  updateNotifBadge();
  updateBackButton();
  wireHubTabs();
}
function attachGlobalRowHandlers(){
  document.querySelectorAll('[data-open-doc]').forEach(row=>{
    row.addEventListener('click', ()=> goTo('docdetail', { selectedDoc: row.dataset.openDoc }));
  });
  document.querySelectorAll('[data-back]').forEach(elx=>{
    elx.addEventListener('click', ()=> goBack());
  });
  document.querySelectorAll('[data-go]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      if(elx.dataset.preset){
        goTo(elx.dataset.go, { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:elx.dataset.preset }, docPage:1 });
      } else {
        goTo(elx.dataset.go);
      }
    });
  });
}

// ============================================================
// DASHBOARD
// ============================================================
function viewDashboard(){
  const s = computeStats();
  const comp = complianceByGroup();
  const recent = [...visibleDocuments()].sort((a,b)=> (b.lastUpdated||0)-(a.lastUpdated||0)).slice(0,5);
  const unclassified = unclassifiedDocs().length;

  return `
  <div class="stat-row">
    <div class="stat-card" data-go="documents" data-preset="all" style="cursor:pointer;"><div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${s.total}</div><div class="stat-label">Documents ทั้งหมด</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="active" style="cursor:pointer;"><div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${s.active}</div><div class="stat-label">ควบคุม / แจกจ่าย (ใช้งานอยู่)</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="pending" style="cursor:pointer;"><div class="stat-icon amber">${ic('clock')}</div>
      <div><div class="stat-num">${s.pending}</div><div class="stat-label">รอทบทวน / รออนุมัติ</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="attention" style="cursor:pointer;"><div class="stat-icon red">${ic('alert')}</div>
      <div><div class="stat-num">${s.attention}</div><div class="stat-label">ต้องตรวจสอบ (ไม่พบ / ไม่อนุมัติ)</div></div></div>
  </div>

  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Compliance ตามหมวดข้อกำหนด</div><div style="font-size:11px; color:var(--ink-500); font-weight:600;">% เอกสารที่อนุมัติแล้ว</div></div>
      ${comp.map(c=>`
        <div class="prog-row">
          <div class="prog-badge">${c.id}</div>
          <div class="prog-label">${c.label}</div>
          <div class="prog-track"><div class="prog-fill" style="width:${c.pct}%"></div></div>
          <div class="prog-pct">${c.pct}%</div>
        </div>`).join('')}
      ${unclassified ? `<div style="margin-top:12px; font-size:11.5px; color:var(--ink-500);">มีเอกสาร <b style="color:var(--ink-900);">${unclassified}</b> รายการที่ยังไม่ได้ระบุข้อกำหนด <span class="panel-link" data-go="documents" data-preset="unclassified" style="cursor:pointer;">ดูรายการ</span></div>` : ''}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Action Required</div></div>
      <div class="action-item" data-go="documents" data-preset="missing" style="cursor:pointer;">
        <div class="action-dot red">${ic('alert')}</div>
        <div class="action-text">เอกสารสถานะ "ไม่พบ" ในทะเบียน</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.note==='ไม่พบ').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="rejected" style="cursor:pointer;">
        <div class="action-dot red">${ic('alert')}</div>
        <div class="action-text">ถูกปฏิเสธการอนุมัติ (ไม่อนุมัติ)</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='ไม่อนุมัติ').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="waitingreview" style="cursor:pointer;">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">รอทบทวน</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='รอทบทวน').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="waitingapproval" style="cursor:pointer;">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">รออนุมัติ</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='รออนุมัติ').length} รายการ</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><div class="panel-title">Recently Updated</div><button class="panel-link" data-go="documents">View all</button></div>
    ${recent.map(d=>`
      <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
        <div class="file-ic">${ic('file')}</div>
        <div class="rl-main">
          <div class="rl-title">${d.id} &nbsp;${cleanName(d)}</div>
          <div class="rl-sub">${fmtDateTime(d.lastUpdated)} · ${docTypeLabel(d)}</div>
        </div>
        ${statusBadge(d.note)}
      </div>`).join('')}
  </div>
  `;
}

// ============================================================
// ISO 17025 VIEW (clause tree + tabs)
// ============================================================
function viewISO(){
  const unclassified = unclassifiedDocs().length;
  return `
  <div class="grid" style="grid-template-columns:270px 1fr; align-items:start;">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">ISO/IEC 17025:2017</div></div>
      <div class="clause-tree">
        <div class="clause-leaf ${state.selectedClause===''?'active':''}" data-clause="" style="font-weight:700; margin-bottom:4px;">ไม่ระบุข้อกำหนด (${unclassified})</div>
        ${CLAUSE_TREE.map(g=>`
          <div class="clause-group">
            <div class="clause-group-head"><span class="n">${g.id}</span>${g.title}</div>
            <div class="clause-children">
              ${g.children.map(c=>`<div class="clause-leaf ${c.id===state.selectedClause?'active':''}" data-clause="${c.id}">${c.id} ${c.title}</div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel" id="isoDetailPanel">${isoDetailContent()}</div>
  </div>`;
}
function isoDetailContent(){
  const clause = state.selectedClause;
  const docs = visibleDocuments().filter(d=> (d.clause||'')===clause);
  const evidence = docs.filter(d=> d.note==='สนับสนุน');
  const related = clause ? CLAUSE_TREE.flatMap(g=>g.children).filter(c=> c.id!==clause && groupOf(c.id)===groupOf(clause)) : [];

  const tabs = [
    {k:'documents', label:'Documents', n:docs.length},
    {k:'evidence', label:'Evidence/Support', n:evidence.length},
    {k:'related', label:'Related', n:related.length},
  ];
  return `
    <div class="panel-title" style="margin-bottom:14px;">${clause ? clauseLabel(clause) : 'เอกสารที่ยังไม่ได้ระบุข้อกำหนด'}</div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${state.isoTab===t.k?'active':''}" data-isotab="${t.k}">${t.label}<span class="cnt">${t.n}</span></button>`).join('')}</div>
    <div id="isoTabBody">${isoTabBody(docs, evidence, related)}</div>
  `;
}
function isoTabBody(docs, evidence, related){
  if(state.isoTab==='documents'){
    if(!docs.length) return emptyState('ยังไม่มีเอกสารในข้อกำหนดนี้','No documents linked to this clause yet.');
    return docTable(docs);
  }
  if(state.isoTab==='evidence'){
    if(!evidence.length) return emptyState('ยังไม่มีเอกสารสนับสนุนในข้อกำหนดนี้','No supporting/reference documents linked here.');
    return docTable(evidence);
  }
  if(!related.length) return emptyState('ไม่มีข้อกำหนดที่เกี่ยวข้อง','No related clauses in this group.');
  return `<div style="display:flex; flex-direction:column; gap:2px;">${related.map(r=>`<div class="audit-link" data-clause-jump="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('')}</div>`;
}
function docTable(docs){
  return `<div class="table-wrap"><table class="dtable">
    <thead><tr><th>Document ID</th><th>Document Name</th><th>Type</th><th>Status</th><th>Approval</th><th>Last Updated</th></tr></thead>
    <tbody>${docs.map(d=>`<tr data-open-doc="${d.id}">
      <td class="mono">${d.id}</td><td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td><td>${docTypeLabel(d)}</td>
      <td>${statusBadge(d.note)}</td><td>${approvalBadge(d.approvalStatus)}</td><td>${fmtDate(d.lastUpdated)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function attachISOHandlers(){
  document.querySelectorAll('[data-clause]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clause;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      document.querySelectorAll('.clause-leaf').forEach(l=>l.classList.toggle('active', l.dataset.clause===state.selectedClause));
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
  attachISOTabHandlers();
}
function attachISOTabHandlers(){
  document.querySelectorAll('[data-isotab]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.isoTab = elx.dataset.isotab;
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
  document.querySelectorAll('[data-clause-jump]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clauseJump;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
}

// ============================================================
// DOCUMENTS LIST VIEW (+ full CRUD, writes to Firestore)
// ============================================================
const DOC_PRESETS = {
  all: d=> true,
  active: d=> d.note==='ควบคุม' || d.note==='แจกจ่าย',
  pending: d=> d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ',
  attention: d=> d.note==='ไม่พบ' || d.approvalStatus==='ไม่อนุมัติ',
  missing: d=> d.note==='ไม่พบ',
  rejected: d=> d.approvalStatus==='ไม่อนุมัติ',
  waitingreview: d=> d.approvalStatus==='รอทบทวน',
  waitingapproval: d=> d.approvalStatus==='รออนุมัติ',
  unclassified: d=> !d.clause,
};
function filteredDocs(){
  const presetFn = DOC_PRESETS[state.docFilter.preset] || DOC_PRESETS.all;
  return visibleDocuments().filter(d=>{
    if(!presetFn(d)) return false;
    if(state.docFilter.clause!=='All' && (d.clause||'')!==state.docFilter.clause) return false;
    if(state.docFilter.type!=='All' && docTypeCode(d)!==state.docFilter.type) return false;
    if(state.docFilter.status!=='All' && d.note!==state.docFilter.status) return false;
    if(state.docFilter.q){
      const q = state.docFilter.q.toLowerCase();
      if(!d.id.toLowerCase().includes(q) && !d.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
function renderDocumentsInto(){
  const el = document.getElementById('content');
  const list = filteredDocs();
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(list.length/pageSize));
  state.docPage = Math.min(state.docPage, pages);
  const start = (state.docPage-1)*pageSize;
  const pageItems = list.slice(start, start+pageSize);

  const clauseOpts = [['All','ทุกข้อกำหนด'], ['','ไม่ระบุ'], ...CLAUSES];
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];
  const statusOpts = ['All','ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก','ว่าง','ไม่พบ'];
  const PRESET_LABEL = { active:'ควบคุม/แจกจ่าย', pending:'รอทบทวน/รออนุมัติ', attention:'ต้องตรวจสอบ', missing:'ไม่พบ', rejected:'ไม่อนุมัติ', waitingreview:'รอทบทวน', waitingapproval:'รออนุมัติ', unclassified:'ไม่ระบุข้อกำหนด' };
  const presetActive = state.docFilter.preset && state.docFilter.preset!=='all';

  el.innerHTML = `
  ${renderDocHubTabs()}
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Document List <span id="syncPill" class="sync-pill" style="margin-left:10px;"><span class="dot"></span>Synced with Firestore</span></div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost" id="btnReviseDoc">${ic('history')} ขอปรับปรุง (Revision)</button>
        <button class="btn primary" id="btnNewDoc">${ic('plus')} เอกสารใหม่</button>
      </div></div>
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="docSearch" placeholder="Search documents..." value="${state.docFilter.q}"></div>
      <select class="select" id="fClause">${clauseOpts.map(([v,l])=>`<option value="${v}" ${v===state.docFilter.clause?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="fType">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.docFilter.type?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="fStatus">${statusOpts.map(s=>`<option ${s===state.docFilter.status?'selected':''}>${s}</option>`).join('')}</select>
      ${presetActive ? `<button class="btn ghost" id="btnClearPreset">✕ ${PRESET_LABEL[state.docFilter.preset]||''}</button>` : ''}
      <div class="spacer"></div>
      <div style="font-size:12px; color:var(--ink-500); font-weight:600;">${list.length} entries</div>
    </div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Document ID</th><th>Document Name</th><th>Clause</th><th>Type</th><th>Status</th><th>Approval</th><th>Updated</th><th></th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>`
        <tr data-open-doc="${d.id}">
          <td class="mono">${d.id}</td><td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td><td>${d.clause || '<span style="color:var(--ink-400);">—</span>'}</td>
          <td>${docTypeLabel(d)}</td><td>${statusBadge(d.note)}</td><td>${approvalBadge(d.approvalStatus)}</td><td>${fmtDate(d.lastUpdated)}</td>
          <td><div class="row-actions" onclick="event.stopPropagation()">
            ${isDC() ? `<button data-edit="${d.id}" title="Edit">${ic('edit')}</button>
            <button data-del="${d.id}" class="del" title="Delete">${ic('trash')}</button>` : ''}
          </div></td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center; padding:40px 0; color:var(--ink-500);">No documents match your filters.</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>Showing ${pageItems.length?start+1:0}–${start+pageItems.length} of ${list.length} entries</div>
      <div class="pg-btns">
        <button ${state.docPage===1?'disabled':''} id="pgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.docPage?'active':''}" data-pg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.docPage===pages?'disabled':''} id="pgNext">›</button>
      </div>
    </div>
  </div>
  `;
}
function wireDocControls(){
  const search = document.getElementById('docSearch');
  if(search) search.addEventListener('input', e=>{
    const cursorPos = e.target.selectionStart;
    state.docFilter.q = e.target.value;
    state.docPage=1;
    renderDocumentsInto();
    wireDocControls();
    wireHubTabs();
    const refreshed = document.getElementById('docSearch');
    if(refreshed){ refreshed.focus(); refreshed.setSelectionRange(cursorPos, cursorPos); }
  });
  const fc = document.getElementById('fClause');
  if(fc) fc.addEventListener('change', e=>{ state.docFilter.clause = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  const ft = document.getElementById('fType');
  if(ft) ft.addEventListener('change', e=>{ state.docFilter.type = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  const fs = document.getElementById('fStatus');
  if(fs) fs.addEventListener('change', e=>{ state.docFilter.status = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  const clearPreset = document.getElementById('btnClearPreset');
  if(clearPreset) clearPreset.addEventListener('click', ()=>{ state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  document.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click', ()=>{ state.docPage=parseInt(b.dataset.pg,10); renderDocumentsInto(); wireDocControls(); wireHubTabs(); }));
  const prev = document.getElementById('pgPrev'); if(prev) prev.addEventListener('click', ()=>{ state.docPage=Math.max(1,state.docPage-1); renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  const next = document.getElementById('pgNext'); if(next) next.addEventListener('click', ()=>{ state.docPage=state.docPage+1; renderDocumentsInto(); wireDocControls(); wireHubTabs(); });
  const btnNew = document.getElementById('btnNewDoc');
  if(btnNew) btnNew.addEventListener('click', ()=> openModal({ mode:'new' }));
  const btnRevise = document.getElementById('btnReviseDoc');
  if(btnRevise) btnRevise.addEventListener('click', ()=> openModal({ mode:'revise', id:null }));
  document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> openModal({ mode:'edit', id:b.dataset.edit })));
  document.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===b.dataset.del);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    renderDocumentsInto(); wireDocControls(); wireHubTabs();
  }));
  attachGlobalRowHandlers();
}
function docModal(){
  const mode = state.modal.mode;

  if(mode==='revise' && !state.modal.id){
    // step 1 of the revision flow: pick which existing document to revise
    return `
    <div class="modal-backdrop" id="docModalBackdrop">
      <div class="modal">
        <div class="modal-head"><div class="modal-title">ขอปรับปรุงเอกสาร (Revision)</div><button class="modal-close" id="modalCloseBtn">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>เลือกเอกสารที่ต้องการปรับปรุง</label>
            <select id="mfReviseDocPicker">
              <option value="">— เลือกเอกสาร —</option>
              ${DOCUMENTS.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>`<option value="${x.id}">${x.id} — ${cleanName(x)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" id="modalCancelBtn">ยกเลิก</button>
        </div>
      </div>
    </div>`;
  }

  const editing = mode==='edit';
  const revising = mode==='revise';
  const creatingNew = mode==='new';
  const d = (editing||revising) ? DOCUMENTS.find(x=>x.id===state.modal.id) : {
    id:'', name:'', clause:'', link:'', note:'ว่าง', rev:'0', preparedBy:'', reviewerName:'', approverName:'',
  };
  if(!d) return `<div class="modal-backdrop" id="docModalBackdrop"><div class="modal"><div class="modal-body">${emptyState('ไม่พบเอกสาร','')}</div><div class="modal-actions"><button class="btn ghost" id="modalCancelBtn">ปิด</button></div></div></div>`;

  const title = editing ? 'แก้ไขเอกสาร (แก้ไขข้อมูลที่นำเข้าให้ถูกต้อง)' : revising ? `ขอปรับปรุง — ${d.id}` : 'เอกสารใหม่ (ขั้นที่ 1: จองเลขเอกสาร)';

  let bodyFields = '';
  if(editing){
    // EDIT / correction — unchanged single-page form
    bodyFields = `
        <div class="field"><label>รหัสเอกสาร (Document ID)</label>
          <input id="mfId" value="${d.id}" placeholder="เช่น MPIR-LF-074-00" disabled></div>
        <div class="field"><label>ชื่อเอกสาร</label>
          <input id="mfName" value="${cleanName(d).replace(/"/g,'&quot;')}" placeholder="ชื่อเอกสาร"></div>
        <div class="field"><label>ข้อกำหนด ISO 17025</label>
          <select id="mfClause"><option value="">ไม่ระบุ</option>${CLAUSES.map(([c,l])=>`<option value="${c}" ${d.clause===c?'selected':''}>${l}</option>`).join('')}</select>
          <div id="clauseSuggest" class="suggest-hint"></div>
        </div>
        <div class="field"><label>ลิงก์ SharePoint</label>
          <input id="mfLink" value="${d.link||''}" placeholder="https://mitrphol.sharepoint.com/..."></div>
        <div class="field"><label>สถานะเอกสาร</label>
          <select id="mfNote">${['ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก','ว่าง','ไม่พบ'].map(s=>`<option ${d.note===s?'selected':''}>${s}</option>`).join('')}</select>
          <div id="noteSuggest" class="suggest-hint"></div>
        </div>
        <div class="field"><label>Rev.</label><input id="mfRev" value="${d.rev||'0'}" placeholder="0"></div>
        <div class="field"><label>วันที่จัดทำ</label><input id="mfCreated" type="date" value="${d.createdDate ? new Date(d.createdDate).toISOString().slice(0,10) : ''}"></div>
        <div class="field"><label>วันที่ประกาศใช้</label><input id="mfEffective" type="date" value="${d.effectiveDate ? new Date(d.effectiveDate).toISOString().slice(0,10) : ''}"></div>
        <div class="field"><label>ผู้จัดทำ</label><input id="mfPrep" value="${(d.preparedBy||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>ผู้ทบทวน</label><input id="mfReviewer" value="${(d.reviewerName||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>ผู้อนุมัติ</label><input id="mfApprover" value="${(d.approverName||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>สถานะการอนุมัติ</label>
          <select id="mfApprovalStatus">${[...STATUS_FLOW,'ไม่อนุมัติ'].map(s=>`<option ${((d.approvalStatus||'ร่าง')===s)?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>รอบทบทวน (วัน) — นับจากวันประกาศใช้</label><input id="mfReviewCycle" value="${d.reviewCycleDays || DEFAULT_REVIEW_CYCLE_DAYS}" placeholder="365"></div>
        <div class="field-error" id="mfError" style="display:none;"></div>`;
  } else if(creatingNew){
    // STEP 1 only — everything else (form confirmation, DC link+clause,
    // review, approval, publish) happens as lifecycle cards on the
    // document's own detail page after this reserves the number
    const isEvidence = state.modal.presetNote === 'สนับสนุน';
    bodyFields = `
        ${isEvidence ? `
        <div class="field"><label>หมวดบันทึกผล</label>
          <select id="mfEvidenceCategory">
            <option value="">— เลือกหมวด (ไม่บังคับ) —</option>
            ${EVIDENCE_CATEGORIES.map((c,i)=>`<option value="${i}">${c.label} (ข้อ ${c.clause})</option>`).join('')}
          </select>
          <div style="font-size:11px; color:var(--ink-500); margin-top:5px;">เลือกหมวดเพื่อเติมชื่อเอกสารและข้อกำหนด ISO ให้อัตโนมัติ — แก้ไขได้หลังจากนั้น</div>
        </div>` : ''}
        <div class="field"><label>ประเภทเอกสาร</label>
          <select id="mfTypePrefix">
            <option value="">— เลือกประเภท —</option>
            ${Object.entries(DOC_TYPE_MAP).map(([k,v])=>`<option value="${k}" ${isEvidence && k==='LS' ? 'selected':''}>${k} — ${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>ชื่อเอกสาร</label>
          <input id="mfName" placeholder="ชื่อเอกสาร"></div>
        <div class="field"><label>รหัสเอกสาร (Document ID)</label>
          <div style="display:flex; gap:8px;">
            <input id="mfId" placeholder="เช่น MPIR-LF-074-00" style="flex:1;">
            <button type="button" class="btn ghost" id="btnAutoNumber" style="flex-shrink:0; white-space:nowrap;">ออกเลขอัตโนมัติ</button>
          </div>
          <div style="font-size:11px; color:var(--ink-500); margin-top:5px;">เลือกประเภทด้านบนเพื่อออกเลขอัตโนมัติ — ระบบจะเติมเลขที่ยังว่างอยู่ก่อนเสมอ</div>
        </div>
        <input type="hidden" id="mfPresetClause" value="">
        <div class="field-error" id="mfError" style="display:none;"></div>`;
  } else {
    // revising: target document already chosen — just confirm
    bodyFields = `
        <div style="font-size:12.5px; color:var(--ink-700); margin-bottom:14px;">กำลังขอปรับปรุง <b>${d.id} ${cleanName(d)}</b> (Rev.${d.rev||'0'} ปัจจุบัน) — ขั้นตอนถัดไป (กรอกฟอร์ม, วางลิงก์, ทบทวน, อนุมัติ, เผยแพร่) จะดำเนินการที่หน้ารายละเอียดคำขอ</div>
        <div class="field-error" id="mfError" style="display:none;"></div>`;
  }

  return `
  <div class="modal-backdrop" id="docModalBackdrop">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">${title}</div><button class="modal-close" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        ${bodyFields}
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="modalCancelBtn">ยกเลิก</button>
        <button class="btn primary" id="modalSaveBtn">${editing ? 'บันทึกการแก้ไข' : revising ? 'ส่งคำขอปรับปรุง' : 'บันทึก (จองเลขเอกสาร)'}</button>
      </div>
    </div>
  </div>`;
}
function wireModalControls(){
  const backdrop = document.getElementById('docModalBackdrop');
  if(!backdrop) return;
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) closeModal(); });

  const picker = document.getElementById('mfReviseDocPicker');
  if(picker) picker.addEventListener('change', e=>{
    state.modal.id = e.target.value || null;
    renderModalLayer();
  });

  // live auto-classification suggestions (name/id → clause, name/id → support)
  const nameInput = document.getElementById('mfName');
  const idInput = document.getElementById('mfId');
  const clauseSel = document.getElementById('mfClause');
  const noteSel = document.getElementById('mfNote');
  function refreshSuggestions(){
    const name = nameInput ? nameInput.value.trim() : '';
    const idVal = idInput ? idInput.value.trim() : '';
    const clauseHint = document.getElementById('clauseSuggest');
    const noteHint = document.getElementById('noteSuggest');

    if(clauseHint){
      const suggested = suggestClause(name);
      if(suggested && clauseSel && clauseSel.value !== suggested){
        clauseHint.innerHTML = `💡 แนะนำ: ${clauseLabel(suggested)} <button type="button" class="suggest-accept" id="acceptClauseSuggest">ใช้คำแนะนำนี้</button>`;
        const btn = document.getElementById('acceptClauseSuggest');
        if(btn) btn.addEventListener('click', ()=>{ clauseSel.value = suggested; refreshSuggestions(); });
      } else {
        clauseHint.innerHTML = '';
      }
    }
    if(noteHint){
      const likelySupport = isLikelySupportDoc(idVal, name);
      if(likelySupport && noteSel && noteSel.value !== 'สนับสนุน'){
        noteHint.innerHTML = `💡 เอกสารนี้อาจเข้าข่ายหลักฐาน/สนับสนุน <button type="button" class="suggest-accept" id="acceptNoteSuggest">ตั้งเป็นสนับสนุน</button>`;
        const btn = document.getElementById('acceptNoteSuggest');
        if(btn) btn.addEventListener('click', ()=>{ noteSel.value = 'สนับสนุน'; refreshSuggestions(); });
      } else {
        noteHint.innerHTML = '';
      }
    }
  }
  if(nameInput) nameInput.addEventListener('input', refreshSuggestions);
  if(idInput) idInput.addEventListener('input', refreshSuggestions);
  refreshSuggestions();

  const evidenceCategorySel = document.getElementById('mfEvidenceCategory');
  if(evidenceCategorySel) evidenceCategorySel.addEventListener('change', ()=>{
    const idx = evidenceCategorySel.value;
    const nameInput = document.getElementById('mfName');
    const presetClauseInput = document.getElementById('mfPresetClause');
    if(idx===''){
      if(presetClauseInput) presetClauseInput.value = '';
      return;
    }
    const cat = EVIDENCE_CATEGORIES[parseInt(idx,10)];
    if(!cat) return;
    if(nameInput && !nameInput.value.trim()) nameInput.value = cat.label;
    if(presetClauseInput) presetClauseInput.value = cat.clause;
  });
  const typePrefixSel = document.getElementById('mfTypePrefix');
  const autoNumBtn = document.getElementById('btnAutoNumber');
  function doAutoNumber(){
    const prefix = typePrefixSel ? typePrefixSel.value : '';
    if(!prefix) return;
    try{
      const generated = nextAvailableNumber(prefix);
      if(idInput) idInput.value = generated;
      refreshSuggestions();
    } catch(err){
      console.error('doAutoNumber failed:', err);
      alert('ออกเลขอัตโนมัติไม่สำเร็จ: ' + (err && err.message ? err.message : err) + '\n\nกรุณากรอกรหัสเอกสารเอง หรือแจ้งข้อความนี้เพื่อแก้ไข');
    }
  }
  if(typePrefixSel) typePrefixSel.addEventListener('change', doAutoNumber);
  if(autoNumBtn) autoNumBtn.addEventListener('click', doAutoNumber);

  const saveBtn = document.getElementById('modalSaveBtn');
  if(!saveBtn) return;
  saveBtn.addEventListener('click', async ()=>{
    const mode = state.modal.mode;
    const errEl = document.getElementById('mfError');

    if(mode==='new'){
      const id = document.getElementById('mfId').value.trim();
      const name = document.getElementById('mfName').value.trim();
      if(!id || !name){ errEl.textContent = 'กรอกรหัสเอกสารและชื่อเอกสารให้ครบ'; errEl.style.display='block'; return; }
      if(DOCUMENTS.some(x=>x.id===id)){ errEl.textContent = 'รหัสเอกสารนี้มีอยู่แล้ว'; errEl.style.display='block'; return; }
      const actor = currentActorName();
      const now = Date.now();
      const presetClauseEl = document.getElementById('mfPresetClause');
      const clause = presetClauseEl ? presetClauseEl.value : '';
      const note = state.modal.presetNote || 'ว่าง';
      DOCUMENTS.push({
        id, name, clause, link:'', note, rev:'0',
        approvalStatus:'ร่าง', reviewerName:'', approverName:'', preparedBy:actor,
        comments:[{ by:actor, text:'ขั้นที่ 1: จองเลขเอกสาร', time: now }], lastUpdated: now, createdDate: now, effectiveDate:null,
        approvedBy:null, approvedAt:null, approvedComment:null, lastRequestType:'new', requestedBy: actor,
        publishedLink:null, linkHistory:[],
        formConfirmedAt:null, formConfirmedBy:null, linkSetAt:null, linkSetBy:null, reviewedAt:null,
      });
      closeModal();
      await persistDocs();
      goTo('approval', { selectedDoc: id, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
      return;
    }

    if(mode==='revise'){
      const actor = currentActorName();
      const d = DOCUMENTS.find(x=>x.id===state.modal.id);
      const oldRev = d.rev;
      d.rev = nextRevNumber(oldRev);
      d.approvalStatus = 'ร่าง';
      d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
      d.lastRequestType = 'revision'; d.lastRequestFrom = oldRev || null; d.requestedBy = actor;
      d.formConfirmedAt = null; d.formConfirmedBy = null;
      d.linkSetAt = null; d.linkSetBy = null; d.reviewedAt = null;
      d.comments = d.comments || [];
      d.comments.push({ by:actor, text:`ขั้นที่ 1: ขอปรับปรุงจาก Rev.${oldRev||'-'} เป็น Rev.${d.rev}`, time: Date.now() });
      d.lastUpdated = Date.now();
      closeModal();
      await persistDocs();
      goTo('approval', { selectedDoc: d.id, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
      return;
    }

    // edit — direct correction, no workflow reset
    const id = document.getElementById('mfId').value.trim();
    const name = document.getElementById('mfName').value.trim();
    const clause = document.getElementById('mfClause').value;
    const link = document.getElementById('mfLink').value.trim();
    const note = document.getElementById('mfNote').value;
    const rev = document.getElementById('mfRev').value.trim();
    if(!id || !name){ errEl.textContent = 'กรอกรหัสเอกสารและชื่อเอกสารให้ครบ'; errEl.style.display='block'; return; }
    const d = DOCUMENTS.find(x=>x.id===state.modal.id);
    d.name = name; d.clause = clause; d.link = link; d.note = note; d.rev = rev || d.rev;
    const created = document.getElementById('mfCreated');
    const effective = document.getElementById('mfEffective');
    if(created) d.createdDate = created.value ? new Date(created.value+'T00:00:00').getTime() : null;
    if(effective) d.effectiveDate = effective.value ? new Date(effective.value+'T00:00:00').getTime() : null;
    const prep = document.getElementById('mfPrep'); if(prep) d.preparedBy = prep.value.trim();
    const rev2 = document.getElementById('mfReviewer'); if(rev2) d.reviewerName = rev2.value.trim();
    const appr = document.getElementById('mfApprover'); if(appr) d.approverName = appr.value.trim();
    const apStatus = document.getElementById('mfApprovalStatus'); if(apStatus) d.approvalStatus = apStatus.value;
    const cycle = document.getElementById('mfReviewCycle'); if(cycle){ const n = parseInt(cycle.value,10); d.reviewCycleDays = isNaN(n) ? DEFAULT_REVIEW_CYCLE_DAYS : n; }
    d.lastUpdated = Date.now();
    closeModal();
    render();
    await persistDocs();
    render();
  });
}

// ============================================================
// EVIDENCE / SUPPORT VIEW — all documents with note==='สนับสนุน',
// grouped by ISO clause, shown as clickable document-name links to
// the pasted SharePoint URL (replaces the old "Records" page).
// ============================================================
function evidenceDocRow(d){
  const link = displayLink(d);
  return `
  <div class="evidence-item">
    <div class="file-ic">${ic('file')}</div>
    <div class="evi-main">
      ${link
        ? `<a class="evi-name" href="${link}" target="_blank" rel="noopener">${cleanName(d)}</a>`
        : `<span class="evi-name evi-nolink">${cleanName(d)}</span>`}
      <div class="evi-sub">${d.id}${!link ? ' · ยังไม่มีลิงก์' : ''}</div>
    </div>
    <div class="row-actions">
      ${isDC() ? `<button data-edit="${d.id}" title="แก้ไข">${ic('edit')}</button>
      <button data-del="${d.id}" class="del" title="ลบ">${ic('trash')}</button>` : ''}
    </div>
  </div>`;
}
function evidenceArchiveRow(a){
  return `
  <div class="evidence-item">
    <div class="file-ic">${ic('folder','sm-icon')}</div>
    <div class="evi-main">
      ${a.link
        ? `<a class="evi-name" href="${a.link}" target="_blank" rel="noopener">${a.title}</a>`
        : `<span class="evi-name evi-nolink">${a.title}</span>`}
      <div class="evi-sub"><span style="color:var(--blue-600); font-weight:700;">คลังเอกสาร</span> · ${a.category||'ไม่ระบุหมวดหมู่'} · ${archiveStatusBadge(a.status)}</div>
    </div>
    <div class="row-actions">
      ${(a.status!=='ยืนยันแล้ว' && isDC()) ? `<button data-verify="${a.id}" title="ยืนยัน (DC)">${ic('check')}</button>` : ''}
      ${isDC() ? `<button data-archive-edit="${a.id}" title="แก้ไข">${ic('edit')}</button>
      <button data-archive-del="${a.id}" class="del" title="ลบ">${ic('trash')}</button>` : ''}
    </div>
  </div>`;
}
function viewEvidence(){
  const docItems = visibleDocuments().filter(d=> d.note==='สนับสนุน').map(d=>({ clause: d.clause, html: evidenceDocRow(d) }));
  const archiveItems = ARCHIVE_ITEMS.filter(a=> a.clause).map(a=>({ clause: a.clause, html: evidenceArchiveRow(a) }));
  const allItems = [...docItems, ...archiveItems];
  const byClause = {};
  allItems.forEach(item=>{
    const key = item.clause || '';
    (byClause[key] = byClause[key]||[]).push(item);
  });
  const orderedKeys = [...CLAUSES.map(c=>c[0]), ''];
  const sections = orderedKeys.filter(k=> byClause[k] && byClause[k].length);

  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Evidence / Support</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">เอกสารสนับสนุน/หลักฐาน (ใบรับรอง มาตรฐานอ้างอิง ฯลฯ) จัดกลุ่มตามข้อกำหนด ISO 17025 — รวมทั้งเอกสารสนับสนุนที่ขึ้นทะเบียนโดยตรง และเอกสารจากคลังเอกสารที่ระบุข้อกำหนดไว้ — วางลิงก์ SharePoint แล้วกดชื่อเพื่อเปิดได้เลย</div>
      </div>
      <button class="btn primary" id="btnNewEvidence">${ic('plus')} เพิ่มรายการสนับสนุน</button>
    </div>
  </div>
  ${sections.length ? sections.map(key=>{
    const wrapped = byClause[key];
    const label = key ? clauseLabel(key) : 'ไม่ระบุข้อกำหนด';
    return `
    <div class="panel">
      <div class="panel-title" style="margin-bottom:12px;">${label} <span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${wrapped.length})</span></div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        ${wrapped.map(item=>item.html).join('')}
      </div>
    </div>`;
  }).join('') : `<div class="panel">${emptyState('ยังไม่มีเอกสารสนับสนุน','เพิ่มรายการแรกได้จากปุ่ม "เพิ่มรายการสนับสนุน" ด้านบน หรือระบุข้อกำหนด ISO ให้เอกสารในคลังเอกสาร')}</div>`}
  `;
}
function attachEvidenceHandlers(){
  const btn = document.getElementById('btnNewEvidence');
  if(btn) btn.addEventListener('click', ()=> openModal({ mode:'new', presetNote:'สนับสนุน' }));
  document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> openModal({ mode:'edit', id:b.dataset.edit })));
  document.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===b.dataset.del);
    if(!d) return;
    if(!confirm(`ลบรายการ "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    render();
  }));
  wireArchiveItemActions();
}

// ============================================================
// ARCHIVE — general document store (meeting minutes, calibration certs,
// external reports, etc). Separate from the controlled ISO register:
// no document-number scheme, just a title + category + link, with a
// single DC-verification step before an item counts as confirmed.
// ============================================================
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function archiveStatusBadge(status){
  const cls = status==='ยืนยันแล้ว' ? 'active' : 'review';
  return `<span class="badge ${cls}">${status||'รอตรวจสอบ'}</span>`;
}
function archiveItemRow(a){
  return `
  <div class="evidence-item">
    <div class="file-ic">${ic('file')}</div>
    <div class="evi-main">
      ${a.link ? `<a class="evi-name" href="${a.link}" target="_blank" rel="noopener">${a.title}</a>` : `<span class="evi-name evi-nolink">${a.title}</span>`}
      <div class="evi-sub">${a.clause ? `ข้อกำหนด ${clauseLabel(a.clause)} · ` : ''}อัปโหลดโดย ${a.uploadedBy||'—'} · ยืนยันโดย ${a.verifiedBy ? `<b style="color:var(--green-600);">${a.verifiedBy}</b>` : 'ยังไม่ยืนยัน'} · ${fmtDate(a.uploadedAt)}</div>
    </div>
    ${archiveStatusBadge(a.status)}
    <div class="row-actions" style="margin-left:10px;">
      ${(a.status!=='ยืนยันแล้ว' && isDC()) ? `<button data-verify="${a.id}" title="ยืนยัน (DC)">${ic('check')}</button>` : ''}
      ${isDC() ? `<button data-archive-edit="${a.id}" title="แก้ไข">${ic('edit')}</button>
      <button data-archive-del="${a.id}" class="del" title="ลบ">${ic('trash')}</button>` : ''}
    </div>
  </div>`;
}
function buildArchiveTree(items){
  const tree = {};
  items.forEach(a=>{
    const cat = a.category || 'ไม่ระบุหมวดหมู่';
    const dt = new Date(a.uploadedAt || Date.now());
    const year = dt.getFullYear() + 543;
    tree[year] = tree[year] || {};
    tree[year][cat] = tree[year][cat] || [];
    tree[year][cat].push(a);
  });
  return tree;
}
function archiveCategoryOrderFor(catsObj){
  const cats = Object.keys(catsObj);
  return [...ARCHIVE_CATEGORY_SUGGESTIONS.filter(c=>cats.includes(c)), ...cats.filter(c=>!ARCHIVE_CATEGORY_SUGGESTIONS.includes(c) && c!=='ไม่ระบุหมวดหมู่').sort(), ...(cats.includes('ไม่ระบุหมวดหมู่')?['ไม่ระบุหมวดหมู่']:[])];
}
function countArchiveNode(node){
  if(Array.isArray(node)) return node.length;
  return Object.values(node).reduce((s,v)=>s+countArchiveNode(v),0);
}
function archiveBreadcrumb(){
  const f = state.archiveFolder;
  const parts = [`<span data-archive-crumb="root" style="cursor:pointer; color:${f.year?'var(--blue-600)':'var(--ink-900)'}; font-weight:700;">${ic('folder','sm-icon')} คลังเอกสาร</span>`];
  if(f.year) parts.push(`<span data-archive-crumb="year" style="cursor:pointer; color:${f.category?'var(--blue-600)':'var(--ink-900)'}; font-weight:700;">ปี ${f.year}</span>`);
  if(f.category) parts.push(`<span style="color:var(--ink-900); font-weight:700;">${f.category}</span>`);
  return `<div style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:18px; flex-wrap:wrap;">${parts.join('<span style="color:var(--ink-400);">/</span>')}</div>`;
}
function renderArchiveFolderView(tree){
  const f = state.archiveFolder;
  const crumb = archiveBreadcrumb();

  if(!f.year){
    const years = Object.keys(tree).map(Number).sort((a,b)=>b-a);
    if(!years.length) return `<div class="panel">${crumb}${emptyState('ยังไม่มีเอกสารในคลัง','เพิ่มรายการแรกได้จากปุ่ม "เพิ่มเอกสาร" ด้านบน')}</div>`;
    return `<div class="panel">${crumb}<div class="folder-grid">${years.map(y=>`
      <div class="folder-card" data-open-year="${y}">${ic('folder')}<div class="folder-label">ปี ${y}</div><div class="folder-count">${countArchiveNode(tree[y])} รายการ</div></div>`).join('')}</div></div>`;
  }
  if(!f.category){
    const cats = archiveCategoryOrderFor(tree[f.year]||{});
    return `<div class="panel">${crumb}<div class="folder-grid">${cats.map(c=>`
      <div class="folder-card" data-open-category="${c}">${ic('folder')}<div class="folder-label">${c}</div><div class="folder-count">${countArchiveNode(tree[f.year][c])} รายการ</div></div>`).join('')}</div></div>`;
  }
  const items = (tree[f.year] && tree[f.year][f.category]) || [];
  return `<div class="panel">${crumb}<div style="display:flex; flex-direction:column;">${items.map(archiveItemRow).join('') || emptyState('ไม่มีเอกสารในโฟลเดอร์นี้','')}</div></div>`;
}
function viewArchive(){
  if(!ARCHIVE_LOADED && ARCHIVE_ERROR){
    return `<div class="panel">${emptyState('โหลดคลังเอกสารไม่สำเร็จ', ARCHIVE_ERROR)}</div>`;
  }
  const total = ARCHIVE_ITEMS.length;
  const pending = ARCHIVE_ITEMS.filter(a=>a.status!=='ยืนยันแล้ว').length;
  const verified = ARCHIVE_ITEMS.filter(a=>a.status==='ยืนยันแล้ว').length;

  const categoriesInUse = Array.from(new Set(ARCHIVE_ITEMS.map(a=>a.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...ARCHIVE_CATEGORY_SUGGESTIONS, ...categoriesInUse]));

  const searching = !!state.archiveFilter.q || state.archiveFilter.category!=='All' || state.archiveFilter.status!=='All';

  let body;
  if(searching){
    let list = ARCHIVE_ITEMS.slice();
    if(state.archiveFilter.category!=='All') list = list.filter(a=>a.category===state.archiveFilter.category);
    if(state.archiveFilter.status!=='All') list = list.filter(a=> (a.status||'รอตรวจสอบ')===state.archiveFilter.status);
    if(state.archiveFilter.q){
      const q = state.archiveFilter.q.toLowerCase();
      list = list.filter(a=> (a.title||'').toLowerCase().includes(q) || (a.category||'').toLowerCase().includes(q));
    }
    list = list.slice().sort((a,b)=>(b.uploadedAt||0)-(a.uploadedAt||0));
    body = `<div class="panel">
      <div style="font-size:11.5px; color:var(--ink-500); margin-bottom:10px;">ผลการค้นหา (${list.length})</div>
      <div style="display:flex; flex-direction:column;">${list.map(archiveItemRow).join('') || emptyState('ไม่พบเอกสารที่ตรงกับเงื่อนไข','')}</div>
    </div>`;
  } else {
    const tree = buildArchiveTree(ARCHIVE_ITEMS);
    body = renderArchiveFolderView(tree);
  }

  return `
  <div class="panel">
    <div class="panel-title">คลังเอกสาร</div>
    <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">เก็บเอกสารทั่วไปที่ไม่ใช่เอกสารควบคุมของระบบ ISO เช่น สรุปประชุม, เอกสารสอบเทียบ, ใบรับรองจากภายนอก — ต้องผ่านการตรวจสอบยืนยันจาก DC ก่อนจึงจะถือว่าสมบูรณ์ · กดเข้าโฟลเดอร์ ปี → หมวดหมู่ เพื่อดูเอกสาร · ระบุข้อกำหนด ISO ได้เมื่อเป็นเอกสาร Evidence/Support</div>
  </div>
  <div class="grid grid-3">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div><div><div class="stat-num">${total}</div><div class="stat-label">เอกสารทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('clock')}</div><div><div class="stat-num">${pending}</div><div class="stat-label">รอตรวจสอบ</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div><div><div class="stat-num">${verified}</div><div class="stat-label">ยืนยันแล้ว</div></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <div></div>
      <button class="btn primary" id="btnNewArchive">${ic('plus')} เพิ่มเอกสาร</button>
    </div>
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="archiveSearch" placeholder="ค้นหาเอกสาร..." value="${state.archiveFilter.q}"></div>
      <select class="select" id="archiveFCategory">
        <option value="All" ${state.archiveFilter.category==='All'?'selected':''}>ทุกหมวดหมู่</option>
        ${allCategories.map(c=>`<option value="${c}" ${state.archiveFilter.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <select class="select" id="archiveFStatus">
        <option value="All" ${state.archiveFilter.status==='All'?'selected':''}>ทุกสถานะ</option>
        <option ${state.archiveFilter.status==='รอตรวจสอบ'?'selected':''}>รอตรวจสอบ</option>
        <option ${state.archiveFilter.status==='ยืนยันแล้ว'?'selected':''}>ยืนยันแล้ว</option>
      </select>
    </div>
  </div>

  ${body}
  `;
}
function wireArchiveItemActions(){
  document.querySelectorAll('[data-archive-edit]').forEach(b=> b.addEventListener('click', ()=> openArchiveModal({ mode:'edit', id:b.dataset.archiveEdit })));
  document.querySelectorAll('[data-verify]').forEach(b=> b.addEventListener('click', ()=> openArchiveModal({ mode:'verify', id:b.dataset.verify })));
  document.querySelectorAll('[data-archive-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const a = ARCHIVE_ITEMS.find(x=>x.id===b.dataset.archiveDel);
    if(!a) return;
    if(!confirm(`ลบเอกสาร "${a.title}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    ARCHIVE_ITEMS = ARCHIVE_ITEMS.filter(x=>x.id!==a.id);
    await persistArchive();
    render();
  }));
}
function attachArchiveHandlers(){
  const search = document.getElementById('archiveSearch');
  if(search) search.addEventListener('input', e=>{
    const cursorPos = e.target.selectionStart;
    state.archiveFilter.q = e.target.value;
    render();
    const refreshed = document.getElementById('archiveSearch');
    if(refreshed){ refreshed.focus(); refreshed.setSelectionRange(cursorPos, cursorPos); }
  });
  const fc = document.getElementById('archiveFCategory');
  if(fc) fc.addEventListener('change', e=>{ state.archiveFilter.category = e.target.value; render(); });
  const fs = document.getElementById('archiveFStatus');
  if(fs) fs.addEventListener('change', e=>{ state.archiveFilter.status = e.target.value; render(); });
  const newBtn = document.getElementById('btnNewArchive');
  if(newBtn) newBtn.addEventListener('click', ()=> openArchiveModal({ mode:'new' }));
  wireArchiveItemActions();
  // folder navigation
  document.querySelectorAll('[data-open-year]').forEach(el=> el.addEventListener('click', ()=>{
    state.archiveFolder = { year: Number(el.dataset.openYear), category:null }; render();
  }));
  document.querySelectorAll('[data-open-category]').forEach(el=> el.addEventListener('click', ()=>{
    state.archiveFolder.category = el.dataset.openCategory; render();
  }));
  document.querySelectorAll('[data-archive-crumb]').forEach(el=> el.addEventListener('click', ()=>{
    const level = el.dataset.archiveCrumb;
    if(level==='root') state.archiveFolder = { year:null, category:null };
    else if(level==='year') state.archiveFolder = { year: state.archiveFolder.year, category:null };
    render();
  }));
}
function archiveModal(){
  const mode = state.archiveModal.mode;
  const editing = mode==='edit';
  const verifying = mode==='verify';
  const a = (editing||verifying) ? ARCHIVE_ITEMS.find(x=>x.id===state.archiveModal.id) : { title:'', category:'', clause:'', link:'', uploadedBy:'', uploadedAt:null };
  if(!a) return `<div class="modal-backdrop" id="archiveModalBackdrop"><div class="modal"><div class="modal-body">${emptyState('ไม่พบเอกสาร','')}</div><div class="modal-actions"><button class="btn ghost" id="archiveModalCancelBtn">ปิด</button></div></div></div>`;

  if(verifying){
    return `
    <div class="modal-backdrop" id="archiveModalBackdrop">
      <div class="modal">
        <div class="modal-head"><div class="modal-title">ยืนยันเอกสาร (DC)</div><button class="modal-close" id="archiveModalCloseBtn">✕</button></div>
        <div class="modal-body">
          <div style="font-size:13px; font-weight:700; color:var(--ink-900); margin-bottom:4px;">${a.title}</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-bottom:16px;">${a.category||'ไม่ระบุหมวดหมู่'}${a.clause?` · ข้อกำหนด ${clauseLabel(a.clause)}`:''} · อัปโหลดโดย ${a.uploadedBy||'ไม่ระบุ'}</div>
          <div class="field"><label>ผู้ยืนยัน (DC)</label><div style="font-size:12.5px; font-weight:700; color:var(--ink-900); padding:9px 12px; background:var(--bg); border-radius:9px;">${currentActorName()}</div></div>
          <div class="field-error" id="archiveModalError" style="display:none;"></div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" id="archiveModalCancelBtn">ยกเลิก</button>
          <button class="btn success" id="archiveModalSaveBtn">${ic('check')} ยืนยันเอกสาร</button>
        </div>
      </div>
    </div>`;
  }

  return `
  <div class="modal-backdrop" id="archiveModalBackdrop">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">${editing ? 'แก้ไขเอกสาร' : 'เพิ่มเอกสารในคลัง'}</div><button class="modal-close" id="archiveModalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field"><label>ชื่อเอกสาร</label><input id="archiveTitle" value="${(a.title||'').replace(/"/g,'&quot;')}" placeholder="เช่น สรุปประชุมทบทวนฝ่ายบริหาร ม.ค. 2569"></div>
        <div class="field"><label>หมวดหมู่</label>
          <input id="archiveCategory" list="archiveCategoryList" value="${(a.category||'').replace(/"/g,'&quot;')}" placeholder="เลือกหรือพิมพ์หมวดหมู่ใหม่">
          <datalist id="archiveCategoryList">${ARCHIVE_CATEGORY_SUGGESTIONS.map(c=>`<option value="${c}">`).join('')}</datalist>
        </div>
        <div class="field"><label>ข้อกำหนด ISO 17025 (ถ้ามี — Evidence/Support)</label>
          <select id="archiveClause"><option value="">ไม่ระบุ</option>${CLAUSES.map(([c,l])=>`<option value="${c}" ${a.clause===c?'selected':''}>${l}</option>`).join('')}</select>
          <div id="archiveClauseSuggest" class="suggest-hint"></div>
        </div>
        <div class="field"><label>ลิงก์เอกสาร</label><input id="archiveLink" value="${a.link||''}" placeholder="https://mitrphol.sharepoint.com/..."></div>
        <div class="field"><label>ผู้อัปโหลด</label><div style="font-size:12.5px; font-weight:700; color:var(--ink-900); padding:9px 12px; background:var(--bg); border-radius:9px;">${currentActorName()}</div></div>
        <div class="field"><label>วันที่เอกสาร</label><input type="date" id="archiveDate" value="${new Date(a.uploadedAt || Date.now()).toISOString().slice(0,10)}"></div>
        <div style="font-size:11px; color:var(--ink-500); margin-top:-8px; margin-bottom:14px;">แก้วันที่ได้ถ้าวางไฟล์ย้อนหลัง — ระบบจะจัดกลุ่มปี/เดือนตามวันที่นี้</div>
        <div class="field-error" id="archiveModalError" style="display:none;"></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="archiveModalCancelBtn">ยกเลิก</button>
        <button class="btn primary" id="archiveModalSaveBtn">${editing ? 'บันทึกการแก้ไข' : 'เพิ่มเอกสาร'}</button>
      </div>
    </div>
  </div>`;
}
function wireArchiveModalControls(){
  const backdrop = document.getElementById('archiveModalBackdrop');
  if(!backdrop) return;
  document.getElementById('archiveModalCloseBtn').addEventListener('click', closeArchiveModal);
  document.getElementById('archiveModalCancelBtn').addEventListener('click', closeArchiveModal);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) closeArchiveModal(); });

  // live clause suggestion, based on the title — same keyword matcher used
  // for regular documents
  const archiveTitleInput = document.getElementById('archiveTitle');
  const archiveClauseSel = document.getElementById('archiveClause');
  const archiveClauseHint = document.getElementById('archiveClauseSuggest');
  function refreshArchiveClauseSuggest(){
    if(!archiveClauseHint) return;
    const name = archiveTitleInput ? archiveTitleInput.value.trim() : '';
    const suggested = suggestClause(name);
    if(suggested && archiveClauseSel && archiveClauseSel.value !== suggested){
      archiveClauseHint.innerHTML = `💡 แนะนำ: ${clauseLabel(suggested)} <button type="button" class="suggest-accept" id="acceptArchiveClauseSuggest">ใช้คำแนะนำนี้</button>`;
      const btn = document.getElementById('acceptArchiveClauseSuggest');
      if(btn) btn.addEventListener('click', ()=>{ archiveClauseSel.value = suggested; refreshArchiveClauseSuggest(); });
    } else {
      archiveClauseHint.innerHTML = '';
    }
  }
  if(archiveTitleInput) archiveTitleInput.addEventListener('input', refreshArchiveClauseSuggest);
  refreshArchiveClauseSuggest();

  const saveBtn = document.getElementById('archiveModalSaveBtn');
  if(!saveBtn) return;
  saveBtn.addEventListener('click', async ()=>{
    const mode = state.archiveModal.mode;
    const errEl = document.getElementById('archiveModalError');

    if(mode==='verify'){
      if(!isDC()) return; // defense in depth
      const verifier = currentActorName();
      const a = ARCHIVE_ITEMS.find(x=>x.id===state.archiveModal.id);
      if(!a) return;
      a.status = 'ยืนยันแล้ว';
      a.verifiedBy = verifier;
      a.verifiedAt = Date.now();
      closeArchiveModal();
      render();
      await persistArchive();
      render();
      return;
    }

    const title = document.getElementById('archiveTitle').value.trim();
    const category = document.getElementById('archiveCategory').value.trim();
    const clauseSel = document.getElementById('archiveClause');
    const clause = clauseSel ? clauseSel.value : '';
    const link = document.getElementById('archiveLink').value.trim();
    const uploadedBy = currentActorName();
    const dateInput = document.getElementById('archiveDate');
    const dateVal = dateInput ? dateInput.value : '';
    const uploadedAt = dateVal ? new Date(dateVal+'T00:00:00').getTime() : Date.now();
    if(!title){ errEl.textContent='กรอกชื่อเอกสารให้ครบ'; errEl.style.display='block'; return; }

    if(mode==='new'){
      ARCHIVE_ITEMS.push({
        id: 'ARC-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        title, category, clause, link, uploadedBy, uploadedAt,
        status:'รอตรวจสอบ', verifiedBy:null, verifiedAt:null,
      });
    } else {
      const a = ARCHIVE_ITEMS.find(x=>x.id===state.archiveModal.id);
      if(a){ a.title = title; a.category = category; a.clause = clause; a.link = link; a.uploadedBy = uploadedBy; a.uploadedAt = uploadedAt; }
    }
    closeArchiveModal();
    render();
    await persistArchive();
    render();
  });
}

// ============================================================
// DOCUMENT DETAIL
// ============================================================
function viewDocDetail(docId){
  const d = DOCUMENTS.find(x=>x.id===docId);
  if(!d) return `<div class="panel">${emptyState('ไม่พบเอกสาร','This document may have been deleted.')}</div>`;
  return `
  <div class="crumb" data-back="1">‹ Back</div>
  <div class="panel">
    <div class="detail-head">
      <div class="doc-thumb">${ic('pdf')}<span>${docTypeCode(d)}</span></div>
      <div style="flex:1;">
        <div class="detail-title-row"><div class="detail-title">${d.id}</div>${statusBadge(d.note)}${approvalBadge(d.approvalStatus)}${d.lastRequestType==='new'||d.lastRequestType==='revision' ? (d.publishedLink ? `<span class="badge active">เผยแพร่แล้ว</span>` : `<span class="badge review">รอ DC เผยแพร่</span>`) : ''}</div>
        <div class="detail-sub">${cleanName(d)}${d.rev ? ` <span style="color:var(--ink-500); font-weight:600;">· Rev.${d.rev}</span>` : ''}</div>
        <div class="kv-row"><div class="k">ประเภท</div><div class="v">${docTypeLabel(d)}</div></div>
        <div class="kv-row"><div class="k">วันที่จัดทำ</div><div class="v">${d.createdDate ? fmtDate(d.createdDate) : '—'}</div></div>
        <div class="kv-row"><div class="k">วันที่ประกาศใช้</div><div class="v">${d.effectiveDate ? fmtDate(d.effectiveDate) : '—'}</div></div>
        <div class="kv-row"><div class="k">อัปเดตล่าสุด</div><div class="v">${fmtDateTime(d.lastUpdated)}</div></div>
        <div class="kv-row"><div class="k">ผู้จัดทำ</div><div class="v">${d.preparedBy || '—'}</div></div>
        <div class="kv-row"><div class="k">ผู้ทบทวน</div><div class="v">${d.reviewerName || '—'}</div></div>
        <div class="kv-row"><div class="k">ผู้อนุมัติ</div><div class="v">${d.approverName || '—'}</div></div>
        <div class="detail-actions">
          ${displayLink(d) ? `<a class="btn primary" href="${displayLink(d)}" target="_blank" rel="noopener">${ic('link')} Open in SharePoint</a>` : `<button class="btn ghost" disabled>${ic('link')} ยังไม่มีลิงก์</button>`}
          <button class="btn ghost" data-go-revision-history="1">${ic('history')} History</button>
        </div>
        <div class="detail-actions-label">จัดการเอกสาร</div>
        <div class="detail-actions">
          ${isDC() ? `<button class="btn ghost" id="btnDetailEdit">${ic('edit')} แก้ไข</button>` : ''}
          <button class="btn ghost" id="btnDetailRevise">${ic('history')} ปรับปรุง Rev.</button>
          ${isDC() ? `<button class="btn danger" id="btnDetailDelete">${ic('trash')} ลบ</button>` : ''}
        </div>
      </div>
      <div class="side-box" style="width:230px;">
        <div class="side-box-title">ISO/IEC 17025</div>
        <div class="clause-chip">${d.clause ? ic('check') : ''}${d.clause ? clauseLabel(d.clause) : 'ยังไม่ได้ระบุข้อกำหนด'}</div>
      </div>
    </div>
    <div class="desc-block" style="margin-top:18px;">
      <b>ความคิดเห็นล่าสุด:</b><br>
      ${(d.comments||[]).slice(-1).map(c=>`${c.by}: ${c.text} <span style="color:var(--ink-500);">(${fmtDateTime(c.time)})</span>`).join('') || 'ยังไม่มีความเห็น'}
    </div>
    ${(d.linkHistory && d.linkHistory.length) ? `
    <div class="desc-block" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--line);">
      <b>ประวัติลิงก์เอกสาร:</b><br>
      ${d.linkHistory.slice().reverse().map(h=>`<div style="margin-top:6px; word-break:break-all;">${h.note||'ลิงก์เดิม'} — <a href="${h.link}" target="_blank" rel="noopener" style="color:var(--blue-600);">${h.link}</a> <span style="color:var(--ink-500);">(${fmtDate(h.time)})</span></div>`).join('')}
    </div>` : ''}
  </div>`;
}
function attachDetailActionHandlers(){
  const editBtn = document.getElementById('btnDetailEdit');
  if(editBtn) editBtn.addEventListener('click', ()=> openModal({ mode:'edit', id: state.selectedDoc }));
  const reviseBtn = document.getElementById('btnDetailRevise');
  if(reviseBtn) reviseBtn.addEventListener('click', ()=> openModal({ mode:'revise', id: state.selectedDoc }));
  const historyBtn = document.querySelector('[data-go-revision-history]');
  if(historyBtn) historyBtn.addEventListener('click', ()=> goTo('revision', { selectedDoc: state.selectedDoc, revisionDetailOpen: true, revisionTimelineExpanded: false, dcPublishEditing: false }));
  const delBtn = document.getElementById('btnDetailDelete');
  if(delBtn) delBtn.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    goBack();
  });
}

// ============================================================
// REVISION / HISTORY VIEW — honest version: this system tracks a
// single lastUpdated timestamp + a comment trail, not versioned
// revisions, so we show exactly that rather than inventing Rev.00-03.
// ============================================================
// Groups a document's flat comment history into cards, one per revision/
// approval request cycle, detected from the "ขอปรับปรุงจาก Rev.X เป็น Rev.Y"
// marker comment written by the revise-request flow.
function groupHistoryByRequest(d){
  const comments = (d.comments||[]).slice(); // stored oldest → newest
  const groups = [];
  let current = null;
  comments.forEach(c=>{
    const m = c.text.match(/ขอปรับปรุงจาก Rev\.(.*?) เป็น Rev\.(.*)/);
    if(m){
      current = { type:'revision', fromRev:m[1], toRev:m[2], requestedBy:c.by, requestedAt:c.time, events:[] };
      groups.push(current);
    } else {
      if(!current){
        current = { type:'initial', toRev: d.rev || null, requestedBy: d.preparedBy || c.by, requestedAt: d.createdDate || c.time, events:[] };
        groups.push(current);
      }
      current.events.push(c);
    }
  });
  if(!groups.length){
    groups.push({ type:'initial', toRev: d.rev || null, requestedBy: d.preparedBy || '', requestedAt: d.createdDate || d.lastUpdated, events:[] });
  }
  return groups.slice().reverse(); // newest request first
}

// classifies a comment/event into an icon + color + short Thai title for
// the colored-icon timeline (revision history detail page + activity feed)
function classifyEvent(text){
  if(/ขั้นที่ 1: จองเลขเอกสาร/.test(text)){
    return { icon:'plus', bg:'--blue-600', title:'ขั้นที่ 1: จองเลขเอกสาร' };
  }
  if(/ขั้นที่ 2: ยืนยันกรอกฟอร์ม/.test(text)){
    return { icon:'check', bg:'--amber-600', title:'ขั้นที่ 2: ยืนยันกรอกฟอร์ม' };
  }
  if(/ขั้นที่ 3: DC วางลิงก์เอกสาร/.test(text)){
    return { icon:'link', bg:'--amber-600', title:'ขั้นที่ 3: DC วางลิงก์+เลือกข้อกำหนด' };
  }
  if(/ขั้นที่ 4: ทบทวนแล้ว/.test(text)){
    return { icon:'check', bg:'--amber-600', title:'ขั้นที่ 4: ทบทวนแล้ว' };
  }
  if(/ขั้นที่ 5: อนุมัติเอกสารแล้ว/.test(text)){
    return { icon:'check', bg:'--green-600', title:'ขั้นที่ 5: อนุมัติเอกสารแล้ว' };
  }
  if(/ขั้นที่ 6: DC เผยแพร่เอกสาร|DC แก้ไขลิงก์ที่เผยแพร่/.test(text)){
    return { icon:'link', bg:'--green-600', title: /แก้ไขลิงก์/.test(text) ? 'DC แก้ไขลิงก์ที่เผยแพร่' : 'ขั้นที่ 6: DC เผยแพร่เอกสาร' };
  }
  if(/เปลี่ยนรหัสเอกสารจาก/.test(text)){
    return { icon:'edit', bg:'--blue-600', title:'เปลี่ยนรหัสเอกสาร' };
  }
  if(/ขอขึ้นทะเบียนเอกสารใหม่/.test(text)){
    return { icon:'plus', bg:'--blue-600', title:'ขอขึ้นทะเบียนเอกสารใหม่' };
  }
  if(/ขอทบทวนประจำปี/.test(text)){
    return { icon:'send', bg:'--amber-600', title:'ขอทบทวนประจำปี' };
  }
  if(/^ไม่อนุมัติ|ไม่อนุมัติ$/.test(text) || (/ไม่อนุมัติ/.test(text) && !/→\s*อนุมัติแล้ว/.test(text))){
    return { icon:'alert', bg:'--red-600', title:'ปฏิเสธเอกสาร' };
  }
  if(/ขอปรับปรุงจาก/.test(text)){
    return { icon:'send', bg:'--amber-600', title:'ส่งคำขอปรับปรุง' };
  }
  if(/→\s*อนุมัติแล้ว$/.test(text)){
    return { icon:'check', bg:'--green-600', title:'อนุมัติเอกสาร' };
  }
  return { icon:'edit', bg:'--blue-600', title:'อัปเดตสถานะเอกสาร' };
}
function eitem(opts){
  // opts: { icon, bg, title, detail, actor, time }
  return `
  <div class="eitem">
    <div class="eitem-icon" style="background:var(${opts.bg})">${ic(opts.icon)}</div>
    <div class="eitem-body">
      <div class="eitem-head"><div class="eitem-title">${opts.title}</div><div class="eitem-time">${fmtDateTime(opts.time)}</div></div>
      <div class="eitem-detail">รายละเอียด: ${opts.detail}</div>
      <div class="eitem-actor">ผู้ดำเนินการ: <span class="actor-pill">${opts.actor || 'ไม่ระบุ'}</span></div>
    </div>
  </div>`;
}

// DC publish step — only relevant once a NEW-document or revision request
// has been fully approved. Until DC pastes the published link, the document
// stays invisible in every browsable list (see isHiddenFromLists in data.js).
// ============================================================
// STEP 2: the requester confirms they filled out the fixed external
// SharePoint request form. Confirming is what actually submits the
// request for review (ร่าง → รอทบทวน) — there is no separate button.
// ============================================================
function renderFormConfirmBox(d){
  if(d.lastRequestType !== 'new' && d.lastRequestType !== 'revision') return '';
  if(!d.formConfirmedAt && d.approvalStatus !== 'ร่าง') return ''; // shouldn't normally happen
  const isRequester = currentUser && (d.requestedBy === currentUser.name || isDC());
  if(d.formConfirmedAt){
    return `
    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
      <div class="side-box-title" style="color:var(--green-600);">ขั้นที่ 2: กรอกฟอร์มแล้ว</div>
      <div style="font-size:13px; color:var(--ink-900); font-weight:700;">${d.formConfirmedBy||'—'}</div>
      <div style="font-size:12px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.formConfirmedAt)}</div>
      <a class="btn ghost" href="${EXTERNAL_REQUEST_FORM_LINK}" target="_blank" rel="noopener" style="margin-top:10px;">${ic('link')} เปิดฟอร์ม</a>
    </div>`;
  }
  return `
  <div class="side-box" style="border-color:var(--amber-600); background:var(--amber-50); margin-bottom:18px;">
    <div style="font-size:12.5px; font-weight:800; color:var(--amber-600); margin-bottom:8px;">ขั้นที่ 2: กรอกฟอร์มคำขอใน SharePoint</div>
    <div style="font-size:11.5px; color:var(--ink-700); margin-bottom:10px;">เปิดฟอร์มด้านล่างแล้วกรอกให้ครบก่อน จากนั้นกดยืนยันเพื่อส่งคำขอเข้าสู่การทบทวน</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <a class="btn ghost" href="${EXTERNAL_REQUEST_FORM_LINK}" target="_blank" rel="noopener">${ic('link')} เปิดฟอร์ม</a>
      ${isRequester ? `<button class="btn success" id="btnConfirmForm">${ic('check')} ยืนยันว่ากรอกฟอร์มแล้ว</button>` : `<span style="font-size:12px; color:var(--ink-500);">รอ ${d.requestedBy||'ผู้ขอ'} ยืนยัน</span>`}
    </div>
  </div>`;
}
function wireFormConfirm(){
  const btn = document.getElementById('btnConfirmForm');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    const actor = currentActorName();
    const now = Date.now();
    d.formConfirmedAt = now;
    d.formConfirmedBy = actor;
    d.approvalStatus = 'รอทบทวน';
    d.lastUpdated = now;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:'ขั้นที่ 2: ยืนยันกรอกฟอร์มแล้ว — ส่งคำขอเข้าสู่การทบทวน', time: now });
    render();
    await persistDocs();
  });
}

// ============================================================
// STEP 3: DC pastes the actual document link and selects its ISO
// clause. The independent reviewer (step 4) cannot proceed until this
// is done — the link stays visible to reviewer/approver afterward so
// they can go read the document.
// ============================================================
function renderDcRegisterBox(d){
  if(d.lastRequestType !== 'new' && d.lastRequestType !== 'revision') return '';
  if(!d.linkSetAt && d.approvalStatus !== 'รอทบทวน') return ''; // shouldn't normally happen
  if(d.linkSetAt){
    return `
    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:12.5px; font-weight:800; color:var(--green-600);">ขั้นที่ 3: วางลิงก์เอกสารแล้ว</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px; word-break:break-all;">โดย ${d.linkSetBy||'—'} · ${fmtDateTime(d.linkSetAt)} · ข้อกำหนด: ${d.clause?clauseLabel(d.clause):'ไม่ระบุ'}</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px; word-break:break-all;">${d.link||''}</div>
        </div>
        ${d.link ? `<a class="btn ghost" href="${d.link}" target="_blank" rel="noopener">${ic('link')} เปิดเอกสาร</a>` : ''}
      </div>
    </div>`;
  }
  if(!isDC()){
    return `
    <div class="side-box" style="border-color:var(--amber-600); background:var(--amber-50); margin-bottom:18px;">
      <div style="font-size:12.5px; font-weight:800; color:var(--amber-600); margin-bottom:4px;">ขั้นที่ 3: รอ DC วางลิงก์เอกสารและเลือกข้อกำหนด</div>
      <div style="font-size:11.5px; color:var(--ink-700);">ผู้ทบทวนจะยังกดทบทวนต่อไม่ได้ จนกว่า Document Control (DC) จะวางลิงก์เอกสารและเลือกข้อกำหนด ISO ให้ก่อน</div>
    </div>`;
  }
  return `
  <div class="side-box" style="border-color:var(--amber-600); background:var(--amber-50); margin-bottom:18px;">
    <div style="font-size:12.5px; font-weight:800; color:var(--amber-600); margin-bottom:8px;">ขั้นที่ 3: DC วางลิงก์เอกสารและเลือกข้อกำหนด</div>
    <div style="font-size:11.5px; color:var(--ink-700); margin-bottom:10px;">ลิงก์นี้จะแสดงให้ผู้ทบทวนและผู้อนุมัติเห็นตลอด เพื่อให้เข้าไปอ่านเอกสารได้</div>
    <div class="field"><label>ลิงก์เอกสาร</label>
      <input id="dcLinkInput" placeholder="https://mitrphol.sharepoint.com/..." style="border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:12.5px; width:100%; box-sizing:border-box;"></div>
    <div class="field"><label>ข้อกำหนด ISO 17025</label>
      <select id="dcClauseInput" style="width:100%;"><option value="">ไม่ระบุ</option>${CLAUSES.map(([c,l])=>`<option value="${c}" ${d.clause===c?'selected':''}>${l}</option>`).join('')}</select></div>
    <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
      <div style="font-size:12px; color:var(--ink-500);">โดย ${currentActorName()}</div>
      <button class="btn success" id="btnDcRegister">${ic('link')} บันทึก</button>
    </div>
  </div>`;
}
function wireDcRegister(){
  const btn = document.getElementById('btnDcRegister');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    if(!isDC()) return; // defense in depth — button only renders for DC anyway
    const linkInput = document.getElementById('dcLinkInput');
    const clauseInput = document.getElementById('dcClauseInput');
    const link = linkInput ? linkInput.value.trim() : '';
    const clause = clauseInput ? clauseInput.value : '';
    const actor = currentActorName();
    if(!link){ alert('กรอกลิงก์เอกสารก่อน'); return; }
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    const now = Date.now();
    d.link = link;
    d.clause = clause;
    d.linkSetAt = now;
    d.linkSetBy = actor;
    d.lastUpdated = now;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:`ขั้นที่ 3: DC วางลิงก์เอกสารและเลือกข้อกำหนด (${clause?clauseLabel(clause):'ไม่ระบุ'})`, time: now });
    render();
    await persistDocs();
  });
}
// ============================================================
// STEP 4: the independent review itself (รอทบทวน → รออนุมัติ). There's no
// separate action UI here — the reviewer acts via the comment/approve
// box further down viewApprovalDetail() — but once it's done, show a
// completed-step card here too, matching steps 2/3/6, so the flow
// doesn't visually "skip" from step 3 straight to step 5/6.
// ============================================================
function renderReviewBox(d){
  if(d.lastRequestType !== 'new' && d.lastRequestType !== 'revision') return '';
  if(!d.reviewedAt) return '';
  return `
  <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
    <div class="side-box-title" style="color:var(--green-600);">ขั้นที่ 4: ทบทวนแล้ว</div>
    <div style="font-size:13px; color:var(--ink-900); font-weight:700;">${d.reviewerName || '—'}</div>
    <div style="font-size:12px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.reviewedAt)}</div>
  </div>`;
}
// ============================================================
// STEP 5: final approval (รออนุมัติ → อนุมัติแล้ว). Shared between
// viewApprovalDetail() (where an in-progress request still shows the
// pending action buttons instead) and viewRevisionDetailInline() (which
// has no action buttons of its own and previously skipped straight from
// step 3 to step 6, making steps 4/5 look like they'd vanished).
// ============================================================
function renderApprovedBox(d){
  if(d.approvalStatus !== 'อนุมัติแล้ว') return '';
  const lastComment = (d.comments||[])[(d.comments||[]).length-1];
  const approvedBy = d.approvedBy || (lastComment ? lastComment.by : '');
  const approvedAt = d.approvedAt || (lastComment ? lastComment.time : d.lastUpdated);
  const approvedComment = d.approvedComment !== undefined ? d.approvedComment : (lastComment ? lastComment.text : '');
  return `
  <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
    <div class="side-box-title" style="color:var(--green-600);">${(d.lastRequestType==='new'||d.lastRequestType==='revision') ? 'ขั้นที่ 5: อนุมัติแล้ว' : 'อนุมัติแล้ว'}</div>
    <div style="font-size:13px; color:var(--ink-900); font-weight:700;">${approvedBy || 'ไม่ระบุผู้อนุมัติ'}</div>
    <div style="font-size:12px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(approvedAt)}</div>
    ${approvedComment ? `<div style="font-size:12.5px; color:var(--ink-700); margin-top:8px; padding-top:8px; border-top:1px solid var(--line);">${approvedComment}</div>` : ''}
  </div>`;
}
// once a request is rejected it's a dead end — no more Approve/Reject
// buttons should be reachable, otherwise a stray click could push the
// status through STATUS_FLOW from index -1 (rejected isn't part of the
// flow array) and silently reset it back to 'ร่าง'
function renderRejectedBox(d){
  if(d.approvalStatus !== 'ไม่อนุมัติ') return '';
  const lastComment = (d.comments||[])[(d.comments||[]).length-1];
  const rejectedBy = lastComment ? lastComment.by : '';
  const rejectedAt = lastComment ? lastComment.time : d.lastUpdated;
  const rejectedComment = lastComment ? lastComment.text : '';
  return `
  <div class="side-box" style="border-color:var(--red-600); background:var(--red-50); margin-bottom:18px;">
    <div class="side-box-title" style="color:var(--red-600);">ไม่อนุมัติ (Rejected)</div>
    <div style="font-size:13px; color:var(--ink-900); font-weight:700;">${rejectedBy || 'ไม่ระบุผู้พิจารณา'}</div>
    <div style="font-size:12px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(rejectedAt)}</div>
    ${rejectedComment ? `<div style="font-size:12.5px; color:var(--ink-700); margin-top:8px; padding-top:8px; border-top:1px solid var(--line);">${rejectedComment}</div>` : ''}
  </div>`;
}
function renderPublishBox(d){
  if(d.approvalStatus !== 'อนุมัติแล้ว') return '';
  if(d.lastRequestType !== 'new' && d.lastRequestType !== 'revision') return '';
  if(d.publishedLink && !state.dcPublishEditing){
    return `
    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:12.5px; font-weight:800; color:var(--green-600);">ขั้นที่ 6: เผยแพร่แล้ว (Published) — เสร็จสิ้น</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">โดย ${d.publishedBy||'—'} · ${fmtDateTime(d.publishedAt)} · วันประกาศใช้: ${d.effectiveDate?fmtDate(d.effectiveDate):'ไม่ระบุ'}</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px; word-break:break-all;">${d.publishedLink}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a class="btn ghost" href="${d.publishedLink}" target="_blank" rel="noopener">${ic('link')} เปิดลิงก์</a>
          ${isDC() ? `<button class="btn ghost" id="btnDcEditPublish">${ic('edit')} แก้ไขลิงก์</button>` : ''}
        </div>
      </div>
    </div>`;
  }
  if(!isDC()){
    return `
    <div class="side-box" style="border-color:var(--amber-600); background:var(--amber-50); margin-bottom:18px;">
      <div style="font-size:12.5px; font-weight:800; color:var(--amber-600); margin-bottom:4px;">ขั้นที่ 6: รอ DC เผยแพร่เอกสาร (Pending Publish)</div>
      <div style="font-size:11.5px; color:var(--ink-700);">เอกสารนี้อนุมัติแล้ว แต่จะยังไม่แสดงในรายการเอกสารจนกว่า Document Control (DC) จะวางลิงก์เอกสารที่ขึ้นระบบแล้วและกำหนดวันประกาศใช้</div>
    </div>`;
  }
  return `
  <div class="side-box" style="border-color:var(--amber-600); background:var(--amber-50); margin-bottom:18px;">
    <div style="font-size:12.5px; font-weight:800; color:var(--amber-600); margin-bottom:8px;">ขั้นที่ 6: DC วางลิงก์ใหม่ + กำหนดวันประกาศใช้</div>
    <div style="font-size:11.5px; color:var(--ink-700); margin-bottom:10px;">${d.publishedLink ? 'ลิงก์เดิมจะถูกเก็บไว้ในประวัติลิงก์อัตโนมัติ' : 'เอกสารนี้อนุมัติแล้ว แต่จะยังไม่แสดงในรายการเอกสารจนกว่า DC จะวางลิงก์เอกสารที่ขึ้นระบบแล้ว'}</div>
    <div class="field"><label>ลิงก์เอกสารที่ขึ้นระบบแล้ว</label>
      <input id="dcPublishLink" placeholder="https://mitrphol.sharepoint.com/..." value="${d.publishedLink||''}" style="border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:12.5px; width:100%; box-sizing:border-box;"></div>
    <div class="field"><label>วันที่ประกาศใช้</label>
      <input id="dcEffectiveDate" type="date" value="${d.effectiveDate ? new Date(d.effectiveDate).toISOString().slice(0,10) : ''}" style="border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:12.5px;"></div>
    <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
      <div style="font-size:12px; color:var(--ink-500);">โดย ${currentActorName()}</div>
      <button class="btn success" id="btnDcPublish">${ic('link')} ${d.publishedLink ? 'บันทึกใหม่' : 'เผยแพร่ + เสร็จสิ้น'}</button>
      ${d.publishedLink ? `<button class="btn ghost" id="btnDcCancelEdit">ยกเลิก</button>` : ''}
    </div>
  </div>`;
}
function wireDcPublish(){
  const editBtn = document.getElementById('btnDcEditPublish');
  if(editBtn) editBtn.addEventListener('click', ()=>{ state.dcPublishEditing = true; render(); });
  const cancelBtn = document.getElementById('btnDcCancelEdit');
  if(cancelBtn) cancelBtn.addEventListener('click', ()=>{ state.dcPublishEditing = false; render(); });
  const btn = document.getElementById('btnDcPublish');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    if(!isDC()) return; // defense in depth — button only renders for DC anyway
    const linkInput = document.getElementById('dcPublishLink');
    const dateInput = document.getElementById('dcEffectiveDate');
    const link = linkInput ? linkInput.value.trim() : '';
    const dateVal = dateInput ? dateInput.value : '';
    const actor = currentActorName();
    if(!link){ alert('กรอกลิงก์เอกสารก่อน'); return; }
    if(!dateVal){ alert('กำหนดวันที่ประกาศใช้ก่อน'); return; }
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    const now = Date.now();
    if(d.publishedLink && d.publishedLink !== link){
      d.linkHistory = d.linkHistory || [];
      d.linkHistory.push({ link:d.publishedLink, by:actor, time:now, note:`ลิงก์เวอร์ชันก่อนหน้า (Rev.${d.lastRequestFrom||'-'})` });
    }
    const isFirstPublish = !d.publishedLink;
    d.publishedLink = link;
    d.effectiveDate = new Date(dateVal+'T00:00:00').getTime();
    d.publishedBy = actor;
    d.publishedAt = now;
    d.lastUpdated = now;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text: isFirstPublish ? `ขั้นที่ 6: DC เผยแพร่เอกสาร (ลิงก์: ${link}, ประกาศใช้: ${fmtDate(d.effectiveDate)}) — เสร็จสิ้น` : `DC แก้ไขลิงก์ที่เผยแพร่ (ลิงก์ใหม่: ${link})`, time: now });
    state.dcPublishEditing = false;
    render();
    await persistDocs();
  });
}

function viewRevisionDetailInline(d, standalone){
  const linkBtn = displayLink(d)
    ? `<a class="btn ghost" href="${displayLink(d)}" target="_blank" rel="noopener">${ic('link')} เปิดใน SharePoint</a>`
    : `<button class="btn ghost" disabled>${ic('link')} ยังไม่มีลิงก์</button>`;
  const nrd = nextReviewDate(d);
  const days = daysUntil(nrd);
  const isOverdue = days < 0;
  const reviewPending = d.lastRequestType==='review' && ['ร่าง','รอทบทวน','รออนุมัติ'].includes(d.approvalStatus);

  const lastComment = (d.comments||[])[(d.comments||[]).length-1];
  const items = [
    eitem({ icon:'plus', bg:'--blue-600', title:'สร้าง/แก้ไขล่าสุด', time:d.lastUpdated,
      detail:`สถานะปัจจุบัน: ${d.note} · การอนุมัติ: ${d.approvalStatus||'ร่าง'}`,
      actor: lastComment ? lastComment.by : (d.preparedBy || '') }),
    ...(d.comments||[]).slice().reverse().map(c=>{
      const cls = classifyEvent(c.text);
      return eitem({ icon:cls.icon, bg:cls.bg, title:cls.title, time:c.time, detail:c.text, actor:c.by });
    }),
    ...(d.createdDate ? [eitem({ icon:'send', bg:'--amber-600', title:'จัดทำเอกสาร', time:d.createdDate,
      detail:'สร้างเอกสารเวอร์ชันแรก', actor:d.preparedBy || '' })] : []),
  ];
  const shownItems = state.revisionTimelineExpanded ? items : items.slice(0,5);

  return `
  ${standalone ? `<div class="crumb" data-back="1">‹ กลับไปที่รายการ</div>` : ''}
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title" style="display:flex; align-items:center; gap:9px; flex-wrap:wrap;">${d.id} ${cleanName(d)} ${statusBadge(d.note)} ${approvalBadge(d.approvalStatus)}</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:3px;">ประวัติการแก้ไข/ขอปรับปรุงเอกสาร พร้อมลิงก์ ณ ขณะนั้น เพื่อความโปร่งใสและตรวจสอบข้อมูลย้อนหลังได้</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${linkBtn}
        ${isDC() ? `<button class="btn ghost" id="revDetailEdit">${ic('edit')} แก้ไข</button>` : ''}
        <button class="btn ghost" id="revDetailRevise">${ic('history')} ปรับปรุง Rev.</button>
        <button class="btn ghost" id="revDetailApproval">${ic('check')} Approval</button>
        ${isDC() ? `<button class="btn danger" id="revDetailDelete">${ic('trash')} ลบ</button>` : ''}
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="side-box"><div class="side-box-title">ข้อกำหนด ISO</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.clause ? clauseLabel(d.clause) : 'ไม่ระบุ'}</div></div>
      <div class="side-box"><div class="side-box-title">ประเภท / Rev.</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${docTypeLabel(d)} · Rev.${d.rev||'—'}</div></div>
      <div class="side-box"><div class="side-box-title">ทบทวนครั้งถัดไป</div><div style="font-size:12.5px; font-weight:700; color:${isOverdue?'var(--red-600)':'var(--ink-900)'};">${fmtDate(nrd)} (${isOverdue?`เกินกำหนด ${Math.abs(days)} วัน`:`อีก ${days} วัน`})</div></div>
      <div class="side-box"><div class="side-box-title">ผู้จัดทำ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.preparedBy || '—'}</div>${d.createdDate ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.createdDate)}</div>` : ''}</div>
      <div class="side-box"><div class="side-box-title">ผู้ทบทวน</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.reviewerName || '—'}</div>${d.reviewedAt ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.reviewedAt)}</div>` : ''}</div>
      <div class="side-box"><div class="side-box-title">ผู้อนุมัติ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.approverName || d.approvedBy || '—'}</div>${d.approvedAt ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.approvedAt)}</div>` : ''}</div>
    </div>

    ${renderFormConfirmBox(d)}
    ${renderDcRegisterBox(d)}
    ${renderReviewBox(d)}
    ${renderApprovedBox(d)}
    ${renderPublishBox(d)}

    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:12.5px; font-weight:800; color:var(--green-600);">การทบทวนประจำปี (ผ่านขั้นตอนอนุมัติเหมือนคำขอเอกสารใหม่ ตาม SOP)</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">
            ${reviewPending
              ? `มีคำขอทบทวนประจำปีกำลังดำเนินการอยู่ (สถานะ: ${d.approvalStatus})`
              : d.lastReviewedAt ? `ทบทวนล่าสุดโดย ${d.lastReviewedBy||'ไม่ระบุ'} เมื่อ ${fmtDate(d.lastReviewedAt)}` : 'ยังไม่เคยทบทวนประจำปีสำหรับเอกสารนี้'}
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${reviewPending
            ? `<button class="btn ghost" id="btnGoReviewApproval">${ic('check')} ไปที่ Approval</button>`
            : `<button class="btn success" id="btnConfirmReview">${ic('send')} ขอทบทวนประจำปี (โดย ${currentActorName()})</button>`}
        </div>
      </div>
    </div>

    <div class="panel-head" style="margin-bottom:10px;">
      <div class="panel-title" style="margin:0;">ไทม์ไลน์ ${items.length ? `<span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${items.length})</span>` : ''}</div>
      ${items.length > 5 ? `<button class="panel-link" id="btnToggleRevTimeline" style="cursor:pointer;">${state.revisionTimelineExpanded ? 'ย่อ ▲' : `แสดงทั้งหมด (${items.length}) ▼`}</button>` : ''}
    </div>
    ${shownItems.join('')}
  </div>`;
}

// ============================================================
// REVISION DASHBOARD — landing page for "Revision" in the sidebar:
// stat cards, filterable table of every document's revision/review
// status, and a combined latest-activity feed.
// ============================================================
function viewRevisionDashboard(){
  const total = DOCUMENTS.length;
  const revised = DOCUMENTS.filter(d=>d.approvalStatus==='อนุมัติแล้ว').length;
  const pendingApproval = DOCUMENTS.filter(d=>d.approvalStatus==='รออนุมัติ').length;
  const inProgress = DOCUMENTS.filter(d=>d.approvalStatus==='ร่าง'||d.approvalStatus==='รอทบทวน').length;
  const overdue = DOCUMENTS.filter(d=> nextReviewDate(d) < Date.now()).length;

  let list = DOCUMENTS.slice();
  if(state.revFilter.clause!=='All') list = list.filter(d=>(d.clause||'')===state.revFilter.clause);
  if(state.revFilter.type!=='All') list = list.filter(d=>docTypeCode(d)===state.revFilter.type);
  if(state.revFilter.status!=='All') list = list.filter(d=>d.approvalStatus===state.revFilter.status);
  if(state.revFilter.q){
    const q = state.revFilter.q.toLowerCase();
    list = list.filter(d=> d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
  }
  list = list.slice().sort((a,b)=>(b.lastUpdated||0)-(a.lastUpdated||0));
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(list.length/pageSize));
  state.revPage = Math.min(state.revPage||1, pages);
  const start = (state.revPage-1)*pageSize;
  const pageItems = list.slice(start, start+pageSize);
  if(!state.selectedDoc || !DOCUMENTS.some(x=>x.id===state.selectedDoc)) state.selectedDoc = (list[0] || DOCUMENTS[0] || {}).id;
  const selectedDoc = DOCUMENTS.find(x=>x.id===state.selectedDoc);

  // "page 2" of Revision: showing one document's detail replaces the list
  // entirely (not appended below it) — navigate back to return to the list.
  if(state.revisionDetailOpen && selectedDoc){
    return viewRevisionDetailInline(selectedDoc, true);
  }

  const clauseOpts = [['All','ทุกข้อกำหนด'], ['','ไม่ระบุ'], ...CLAUSES];
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];
  const statusOpts = [['All','ทุกสถานะ'], ...[...STATUS_FLOW,'ไม่อนุมัติ'].map(s=>[s,s])];

  // latest activity feed: real comment events across all docs + real overdue alerts
  const commentEvents = DOCUMENTS.flatMap(d=> (d.comments||[]).map(c=>{
    const cls = classifyEvent(c.text);
    return { ...cls, time:c.time, by:c.by, docId:d.id, docName:cleanName(d), detail:c.text };
  }));
  const overdueEvents = DOCUMENTS.filter(d=> nextReviewDate(d) < Date.now()).map(d=>({
    icon:'bell', bg:'--red-600', title:'แก้ไขเกินกำหนด', time: nextReviewDate(d), by:'',
    docId:d.id, docName:cleanName(d), detail:`กำหนดทบทวน: ${fmtDate(nextReviewDate(d))}`,
  }));
  const feed = [...commentEvents, ...overdueEvents].sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,4);

  return `
  <div class="panel">
    <div class="panel-title">History</div>
    <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ติดตามการแก้ไขและประวัติการอนุมัติเอกสาร</div>
  </div>
  <div class="stat-row-5">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div><div><div class="stat-num">${total}</div><div class="stat-label">เอกสารทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div><div><div class="stat-num">${revised}</div><div class="stat-label">แก้ไขแล้ว</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('send')}</div><div><div class="stat-num">${pendingApproval}</div><div class="stat-label">รออนุมัติ</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">${ic('clock')}</div><div><div class="stat-num">${inProgress}</div><div class="stat-label">ร่าง/แก้ไขล่าสุด</div></div></div>
    <div class="stat-card"><div class="stat-icon red">${ic('bell')}</div><div><div class="stat-num">${overdue}</div><div class="stat-label">แก้ไขเกินกำหนด</div></div></div>
  </div>

  <div class="panel">
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="revSearch" placeholder="ค้นหาเอกสาร..." value="${state.revFilter.q}"></div>
      <select class="select" id="revFClause">${clauseOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.clause?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="revFType">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.type?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="revFStatus">${statusOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.status?'selected':''}>${l}</option>`).join('')}</select>
    </div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>เอกสาร</th><th>ข้อกำหนด</th><th>เวอร์ชันปัจจุบัน</th><th>สถานะ</th><th>แก้ไขล่าสุด</th><th>ถัดไป (ทบทวนภายใน)</th><th></th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>{
          const nrd = nextReviewDate(d);
          const days = daysUntil(nrd);
          const isOverdue = days < 0;
          return `
        <tr class="${d.id===state.selectedDoc?'current-row':''}" data-open-rev="${d.id}">
          <td class="mono">${d.id}<div class="name" title="${cleanName(d).replace(/"/g,'&quot;')}" style="max-width:220px;">${cleanName(d)}</div></td>
          <td>${d.clause || '<span style="color:var(--ink-400);">—</span>'}</td>
          <td>${d.rev || '—'}</td>
          <td>${approvalBadge(d.approvalStatus)}</td>
          <td>${fmtDateTime(d.lastUpdated)}</td>
          <td><div class="next-review" style="color:${isOverdue?'var(--red-600)':'var(--ink-700)'}">${fmtDate(nrd)}<div class="rel" style="color:${isOverdue?'var(--red-600)':'var(--ink-500)'}">${isOverdue ? `เกินกำหนด ${Math.abs(days)} วัน` : `อีก ${days} วัน`}</div></div></td>
          <td><button class="chev-btn" data-open-rev-btn="${d.id}">${ic('chevronRight')}</button></td>
        </tr>`;
        }).join('') : `<tr><td colspan="7" style="text-align:center; padding:40px 0; color:var(--ink-500);">ไม่มีเอกสารตรงตามเงื่อนไข</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>แสดง ${pageItems.length?start+1:0}–${start+pageItems.length} จาก ${list.length} รายการ</div>
      <div class="pg-btns">
        <button ${state.revPage===1?'disabled':''} id="revPgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.revPage?'active':''}" data-revpg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.revPage===pages?'disabled':''} id="revPgNext">›</button>
      </div>
    </div>
  </div>



  <div class="panel">
    <div class="panel-head"><div class="panel-title">กิจกรรมล่าสุด (Latest Activity)</div><a class="panel-link" style="cursor:pointer;" data-go="audittrail">ดูทั้งหมด →</a></div>
    <div class="activity-grid">
      ${feed.length ? feed.map(a=>`
        <div class="activity-card">
          <div class="ac-icon" style="background:var(${a.bg})">${ic(a.icon)}</div>
          <div class="ac-title">${a.title}</div>
          <div class="ac-sub">${a.docId} ${a.docName}</div>
          <div class="ac-meta">${a.by ? `โดย ${a.by} · ` : ''}${fmtDateTime(a.time)}</div>
        </div>`).join('') : `<div style="grid-column:1/-1; color:var(--ink-500); font-size:12.5px; text-align:center; padding:20px;">ยังไม่มีกิจกรรม</div>`}
    </div>
  </div>`;
}
function attachRevisionDashboardHandlers(){
  const search = document.getElementById('revSearch');
  if(search) search.addEventListener('input', e=>{
    const cursorPos = e.target.selectionStart;
    state.revFilter.q = e.target.value;
    state.revPage = 1;
    render();
    const refreshed = document.getElementById('revSearch');
    if(refreshed){ refreshed.focus(); refreshed.setSelectionRange(cursorPos, cursorPos); }
  });
  const fc = document.getElementById('revFClause'); if(fc) fc.addEventListener('change', e=>{ state.revFilter.clause = e.target.value; state.revPage=1; render(); });
  const ft = document.getElementById('revFType'); if(ft) ft.addEventListener('change', e=>{ state.revFilter.type = e.target.value; state.revPage=1; render(); });
  const fs = document.getElementById('revFStatus'); if(fs) fs.addEventListener('change', e=>{ state.revFilter.status = e.target.value; state.revPage=1; render(); });
  document.querySelectorAll('[data-revpg]').forEach(b=>b.addEventListener('click', ()=>{ state.revPage=parseInt(b.dataset.revpg,10); render(); }));
  const revPgPrev = document.getElementById('revPgPrev'); if(revPgPrev) revPgPrev.addEventListener('click', ()=>{ state.revPage=Math.max(1,state.revPage-1); render(); });
  const revPgNext = document.getElementById('revPgNext'); if(revPgNext) revPgNext.addEventListener('click', ()=>{ state.revPage=state.revPage+1; render(); });
  document.querySelectorAll('[data-open-rev],[data-open-rev-btn]').forEach(elx=>{
    elx.addEventListener('click', e=>{
      e.stopPropagation();
      const id = elx.dataset.openRev || elx.dataset.openRevBtn;
      goTo('revision', { selectedDoc: id, revisionDetailOpen: true, revisionTimelineExpanded: false, dcPublishEditing: false });
    });
  });
  const toggleTimelineBtn = document.getElementById('btnToggleRevTimeline');
  if(toggleTimelineBtn) toggleTimelineBtn.addEventListener('click', ()=>{ state.revisionTimelineExpanded = !state.revisionTimelineExpanded; render(); });
  wireFormConfirm();
  wireDcRegister();
  wireDcPublish();
  const editBtn = document.getElementById('revDetailEdit');
  if(editBtn) editBtn.addEventListener('click', ()=> openModal({ mode:'edit', id: state.selectedDoc }));
  const reviseBtn = document.getElementById('revDetailRevise');
  if(reviseBtn) reviseBtn.addEventListener('click', ()=> openModal({ mode:'revise', id: state.selectedDoc }));
  const approvalBtn = document.getElementById('revDetailApproval');
  if(approvalBtn) approvalBtn.addEventListener('click', ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    const tab = d && ['อนุมัติแล้ว','ไม่อนุมัติ'].includes(d.approvalStatus) ? 'history' : 'active';
    goTo('approval', { selectedDoc: state.selectedDoc, approvalTab: tab, approvalPage: 1, approvalDetailOpen: true, approvalCommentsExpanded: false, dcPublishEditing: false });
  });
  const delBtn = document.getElementById('revDetailDelete');
  if(delBtn) delBtn.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    state.selectedDoc = null;
    state.revisionDetailOpen = false;
    await persistDocs();
    goBack();
  });
  const confirmReviewBtn = document.getElementById('btnConfirmReview');
  if(confirmReviewBtn) confirmReviewBtn.addEventListener('click', async ()=>{
    const actor = currentActorName();
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    const now = Date.now();
    // send it through the same approval workflow as a revision request —
    // the review isn't official until it's approved through all steps
    d.approvalStatus = 'รอทบทวน';
    d.lastRequestType = 'review';
    d.lastRequestFrom = d.rev || null;
    d.requestedBy = actor;
    d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:'ขอทบทวนประจำปี — ไม่มีการแก้ไขเอกสาร', time: now });
    d.lastUpdated = now;
    await persistDocs();
    goTo('approval', { selectedDoc: d.id, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
  });
  const goReviewApprovalBtn = document.getElementById('btnGoReviewApproval');
  if(goReviewApprovalBtn) goReviewApprovalBtn.addEventListener('click', ()=>{
    goTo('approval', { selectedDoc: state.selectedDoc, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
  });
}

// ============================================================
// APPROVAL VIEW (ported logic from previous app — actor name +
// comment required, writes STATUS_FLOW transitions to Firestore)
// ============================================================
let lastActorName = '';
const STEP_LABEL = { 'ร่าง':'รอส่งตรวจ', 'รอทบทวน':'รอผู้ทบทวน', 'รออนุมัติ':'รอผู้อนุมัติ', 'อนุมัติแล้ว':'เสร็จสมบูรณ์', 'ไม่อนุมัติ':'ถูกปฏิเสธ' };
const STEP_COLOR_VAR = { active:'--green-600', review:'--amber-600', pending:'--blue-600', overdue:'--red-600', draft:'--ink-400' };
function stepIndicator(status){
  const cls = APPROVAL_STATUS_STYLE[status] || 'draft';
  const cv = STEP_COLOR_VAR[cls];
  return `<span style="display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:12px; color:var(${cv});"><span style="width:7px;height:7px;border-radius:50%;background:var(${cv});display:inline-block; flex-shrink:0;"></span>${STEP_LABEL[status]||status}</span>`;
}
function actorForDoc(d){
  const status = d.approvalStatus || 'ร่าง';
  if(status==='ร่าง') return { name: d.preparedBy||'', role:'เจ้าหน้าที่เอกสาร' };
  if(status==='รอทบทวน') return { name: d.reviewerName||'', role:'ผู้ทบทวน' };
  if(status==='รออนุมัติ') return { name: d.approverName||'', role:'ผู้อนุมัติ' };
  if(status==='อนุมัติแล้ว') return { name: d.approvedBy||d.approverName||'', role:'ผู้อนุมัติ' };
  if(status==='ไม่อนุมัติ') return { name: d.approvedBy||'', role:'ผู้พิจารณา' };
  return { name:'', role:'' };
}
function initials(name){
  if(!name) return '?';
  return name.trim().slice(0,2);
}

function viewApproval(){
  const queue = pendingQueue();
  if(!state.selectedDoc) state.selectedDoc = (queue[0] || DOCUMENTS[0] || {}).id;

  // "page 2" of Approval: showing one document's detail replaces the list
  // entirely (not appended below it) — navigate back to return to the list.
  if(state.approvalDetailOpen){
    const selectedDoc = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(selectedDoc) return `<div class="crumb" data-back="1">‹ กลับไปที่รายการ</div>${viewApprovalDetail()}`;
  }

  const countDraft = DOCUMENTS.filter(x=>x.approvalStatus==='ร่าง'||!x.approvalStatus).length;
  const countReview = DOCUMENTS.filter(x=>x.approvalStatus==='รอทบทวน').length;
  const countWaitApprove = DOCUMENTS.filter(x=>x.approvalStatus==='รออนุมัติ').length;
  const countApproved = DOCUMENTS.filter(x=>x.approvalStatus==='อนุมัติแล้ว').length;
  const countRejected = DOCUMENTS.filter(x=>x.approvalStatus==='ไม่อนุมัติ').length;
  const total = DOCUMENTS.length;
  const activeCount = countDraft + countReview + countWaitApprove;
  const historyCount = countApproved + countRejected;

  const tabs = [
    { key:'active', label:'คำขอที่กำลังดำเนินการ', n: activeCount },
    { key:'history', label:'ประวัติ', n: historyCount },
  ];

  let filtered = state.approvalTab==='history'
    ? DOCUMENTS.filter(x=> x.approvalStatus==='อนุมัติแล้ว' || x.approvalStatus==='ไม่อนุมัติ')
    : DOCUMENTS.filter(x=> !x.approvalStatus || x.approvalStatus==='ร่าง' || x.approvalStatus==='รอทบทวน' || x.approvalStatus==='รออนุมัติ');
  if(state.approvalTypeFilter!=='All') filtered = filtered.filter(x=>docTypeCode(x)===state.approvalTypeFilter);
  filtered = filtered.slice().sort((a,b)=> (b.lastUpdated||0)-(a.lastUpdated||0));

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
  state.approvalPage = Math.min(state.approvalPage, pages);
  const start = (state.approvalPage-1)*pageSize;
  const pageItems = filtered.slice(start, start+pageSize);
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];

  return `
  <div class="stat-row-5">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${total}</div><div class="stat-label">รายการทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">${ic('edit')}</div>
      <div><div class="stat-num">${countDraft}</div><div class="stat-label">ร่าง</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('clock')}</div>
      <div><div class="stat-num">${countReview}</div><div class="stat-label">รอทบทวน</div></div></div>
    <div class="stat-card"><div class="stat-icon blue">${ic('clock')}</div>
      <div><div class="stat-num">${countWaitApprove}</div><div class="stat-label">รออนุมัติ</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${countApproved}</div><div class="stat-label">อนุมัติแล้ว</div></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Approval</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ติดตามสถานะการพิจารณาและอนุมัติเอกสาร</div>
      </div>
      <div style="display:flex; gap:8px;">
        <select class="select" id="apTypeFilter">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.approvalTypeFilter?'selected':''}>${l}</option>`).join('')}</select>
        <button class="btn primary" id="btnApNewDoc">${ic('plus')} นำรายการใหม่</button>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(t=>`<button class="tab ${state.approvalTab===t.key?'active':''}" data-ap-tab="${t.key}">${t.label}<span class="cnt">${t.n}</span></button>`).join('')}
    </div>

    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>รหัสเอกสาร</th><th>ชื่อเอกสาร</th><th>สถานะ</th><th>ขั้นตอนปัจจุบัน</th><th>ผู้ดำเนินการ</th><th>อัปเดตล่าสุด</th>${isDC() ? '<th></th>' : ''}</tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>{
          const actor = actorForDoc(d);
          return `
        <tr class="${d.id===state.selectedDoc?'current-row':''}" data-select-approval="${d.id}">
          <td class="mono">${d.id}</td>
          <td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td>
          <td>${approvalBadge(d.approvalStatus)}</td>
          <td>${stepIndicator(d.approvalStatus||'ร่าง')}</td>
          <td><div class="actor-cell"><div class="row-avatar">${initials(actor.name)}</div><div><div class="actor-name">${actor.name||'—'}</div><div class="actor-role">${actor.role}</div></div></div></td>
          <td>${fmtDateTime(d.lastUpdated)}</td>
          ${isDC() ? `<td><div class="row-actions" onclick="event.stopPropagation()"><button data-del-request="${d.id}" class="del" title="ลบคำขอ">${ic('trash')}</button></div></td>` : ''}
        </tr>`;
        }).join('') : `<tr><td colspan="${isDC()?7:6}" style="text-align:center; padding:40px 0; color:var(--ink-500);">ไม่มีเอกสารในหมวดนี้</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>แสดง ${pageItems.length?start+1:0}–${start+pageItems.length} จาก ${filtered.length} รายการ</div>
      <div class="pg-btns">
        <button ${state.approvalPage===1?'disabled':''} id="apPgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.approvalPage?'active':''}" data-appg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.approvalPage===pages?'disabled':''} id="apPgNext">›</button>
      </div>
    </div>
  </div>
  `;
}

function viewApprovalDetail(){
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return '';
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);
  const isRejected = status === 'ไม่อนุมัติ';

  const steps = STATUS_FLOW.map((s,i)=>{
    const done = !isRejected && i<=currentIdx;
    const isNext = !isRejected && i===currentIdx+1;
    return { label:s, cls: done?'done':(isNext?'pending':'waiting') };
  });

  const isApproved = status === 'อนุมัติแล้ว';
  const requestLabel = d.lastRequestType==='new' ? 'เอกสารใหม่' : d.lastRequestType==='revision' ? `ปรับปรุง (Rev.${d.lastRequestFrom||'-'} → ${d.rev||'-'})` : d.lastRequestType==='review' ? 'ทบทวนประจำปี (ไม่มีการแก้ไข)' : null;
  const allComments = (d.comments||[]).slice().reverse();
  const shownComments = state.approvalCommentsExpanded ? allComments : allComments.slice(0,5);

  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title" style="display:flex; align-items:center; gap:9px; flex-wrap:wrap;">${d.id} ${cleanName(d)} ${approvalBadge(status)}</div>
        <div style="font-size:12px; color:var(--ink-500); margin-top:3px; font-weight:600;">ข้อกำหนด: ${d.clause ? clauseLabel(d.clause) : 'ไม่ระบุ'}${requestLabel ? ` · คำขอ: ${requestLabel}` : ''}</div>
      </div>
      <button class="btn ghost" data-go="docdetail">${ic('doc')} ดูรายละเอียดเอกสาร</button>
    </div>

    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="side-box"><div class="side-box-title">ผู้จัดทำ / ผู้ร่าง</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.preparedBy || '—'}</div>${d.createdDate ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.createdDate)}</div>` : ''}</div>
      <div class="side-box"><div class="side-box-title">ผู้ทบทวน</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.reviewerName || '—'}</div>${d.reviewedAt ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.reviewedAt)}</div>` : ''}</div>
      <div class="side-box"><div class="side-box-title">ผู้อนุมัติ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.approverName || d.approvedBy || '—'}</div>${d.approvedAt ? `<div style="font-size:11px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(d.approvedAt)}</div>` : ''}</div>
      <div class="side-box"><div class="side-box-title">วันที่จัดทำ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.createdDate ? fmtDate(d.createdDate) : '—'}</div></div>
      <div class="side-box"><div class="side-box-title">วันที่ประกาศใช้</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.effectiveDate ? fmtDate(d.effectiveDate) : '—'}</div></div>
      <div class="side-box"><div class="side-box-title">อัปเดตล่าสุด</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${fmtDateTime(d.lastUpdated)}</div></div>
    </div>

    <div class="approval-flow">
      ${steps.map((s,i)=>`
        ${i>0?`<div class="af-line ${steps[i-1].cls==='done'?'done':''}"></div>`:''}
        <div class="af-step">
          <div class="af-circle ${s.cls}">${ic(s.cls==='done'?'check':'clock')}</div>
          <div class="af-name">${s.label}</div>
          <div class="af-status ${s.cls}">${s.cls==='done'?'Done':s.cls==='pending'?'Pending':'Waiting'}</div>
        </div>`).join('')}
      ${isRejected ? `<div class="af-line"></div><div class="af-step"><div class="af-circle" style="border-color:var(--red-600); background:var(--red-50);">${ic('alert')}</div><div class="af-name">ไม่อนุมัติ</div><div class="af-status" style="background:var(--red-50); color:var(--red-600);">Rejected</div></div>` : ''}
    </div>

    ${renderFormConfirmBox(d)}
    ${renderDcRegisterBox(d)}
    ${renderReviewBox(d)}

    ${isApproved ? renderApprovedBox(d) : isRejected ? renderRejectedBox(d) : ((status==='ร่าง' || (status==='รอทบทวน' && !d.linkSetAt)) && (d.lastRequestType==='new'||d.lastRequestType==='revision')) ? '' : `
    ${(d.lastRequestType==='new'||d.lastRequestType==='revision') && currentIdx===1 ? `<div style="font-size:11.5px; font-weight:700; color:var(--amber-600); margin-bottom:10px;">${ic('clock','sm-icon')} ขั้นที่ 4: ต้องทบทวนโดย QM หรือ DC</div>` : ''}
    ${(d.lastRequestType==='new'||d.lastRequestType==='revision') && currentIdx===2 ? `<div style="font-size:11.5px; font-weight:700; color:var(--amber-600); margin-bottom:10px;">${ic('clock','sm-icon')} ขั้นที่ 5: ต้องอนุมัติโดย Lab Manager (LM)</div>` : ''}
    <div class="field" style="max-width:320px;"><label>ผู้ดำเนินการ</label><div style="font-size:12.5px; font-weight:700; color:var(--ink-900); padding:9px 12px; background:var(--bg); border-radius:9px;">${currentActorName()} <span style="color:var(--ink-500); font-weight:600;">(${currentUser.role})</span></div></div>
    <div class="comment-box">
      <label style="font-size:12px; font-weight:700; color:var(--ink-700); display:block; margin-bottom:8px;">ความเห็น (จำเป็นถ้ากด "ไม่อนุมัติ")</label>
      <textarea id="approvalComment" placeholder="Enter comment..."></textarea>
      <div id="approvalError" class="field-error" style="display:none;"></div>
      <div class="comment-actions">
        <button class="btn danger" id="btnReject">Reject</button>
        <button class="btn success" id="btnApprove">${currentIdx===STATUS_FLOW.length-2 ? 'Final Approve':'Approve / Next Step'}</button>
      </div>
    </div>
    `}

    ${renderPublishBox(d)}

    <div class="panel-head" style="margin:20px 0 10px;">
      <div class="panel-title" style="margin:0;">ประวัติความเห็น ${allComments.length ? `<span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${allComments.length})</span>` : ''}</div>
      ${allComments.length > 5 ? `<button class="panel-link" id="btnToggleComments" style="cursor:pointer;">${state.approvalCommentsExpanded ? 'ย่อ ▲' : `แสดงทั้งหมด (${allComments.length}) ▼`}</button>` : ''}
    </div>
    ${shownComments.length ? shownComments.map(c=>`
      <div class="at-item"><div class="at-icon">${ic('user')}</div>
        <div class="at-main"><div class="at-title">${c.by}</div><div class="at-meta">${c.text}</div></div>
        <div class="at-time">${fmtDateTime(c.time)}</div>
      </div>`).join('') : `<div style="color:var(--ink-500); font-size:12.5px;">ยังไม่มีความเห็น</div>`}
  </div>`;
}

function attachApprovalHandlers(){
  document.querySelectorAll('[data-ap-tab]').forEach(elx=>{
    elx.addEventListener('click', ()=>{ state.approvalTab = elx.dataset.apTab; state.approvalPage = 1; render(); });
  });
  const typeFilter = document.getElementById('apTypeFilter');
  if(typeFilter) typeFilter.addEventListener('change', e=>{ state.approvalTypeFilter = e.target.value; state.approvalPage = 1; render(); });
  const newBtn = document.getElementById('btnApNewDoc');
  if(newBtn) newBtn.addEventListener('click', ()=> openModal({ mode:'new' }));
  document.querySelectorAll('[data-appg]').forEach(b=>b.addEventListener('click', ()=>{ state.approvalPage=parseInt(b.dataset.appg,10); render(); }));
  const pgPrev = document.getElementById('apPgPrev'); if(pgPrev) pgPrev.addEventListener('click', ()=>{ state.approvalPage=Math.max(1,state.approvalPage-1); render(); });
  const pgNext = document.getElementById('apPgNext'); if(pgNext) pgNext.addEventListener('click', ()=>{ state.approvalPage=state.approvalPage+1; render(); });
  document.querySelectorAll('[data-select-approval]').forEach(row=>{
    row.addEventListener('click', ()=>{ goTo('approval', { selectedDoc: row.dataset.selectApproval, approvalDetailOpen: true, approvalCommentsExpanded: false, dcPublishEditing: false }); });
  });
  document.querySelectorAll('[data-del-request]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!isDC()) return; // defense in depth — button only renders for DC anyway
      const d = DOCUMENTS.find(x=>x.id===btn.dataset.delRequest);
      if(!d) return;
      if(!confirm(`ลบคำขอ "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
      DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
      if(state.selectedDoc===d.id) state.selectedDoc = null;
      await persistDocs();
      render();
    });
  });

  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return;
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);

  const toggleCommentsBtn = document.getElementById('btnToggleComments');
  if(toggleCommentsBtn) toggleCommentsBtn.addEventListener('click', ()=>{ state.approvalCommentsExpanded = !state.approvalCommentsExpanded; render(); });
  wireFormConfirm();
  wireDcRegister();
  wireDcPublish();

  const approveBtn = document.getElementById('btnApprove');
  if(approveBtn) approveBtn.addEventListener('click', async ()=>{
    const actor = currentActorName();
    const errEl = document.getElementById('approvalError');
    const comment = document.getElementById('approvalComment').value.trim();
    const nextIdx = Math.min(currentIdx+1, STATUS_FLOW.length-1);
    const nextStatus = STATUS_FLOW[nextIdx];

    // rule 1: the reviewer must not be the request's own creator. The
    // creator naturally submits their own draft (ร่าง→รอทบทวน), and the
    // final LM sign-off (รออนุมัติ→อนุมัติแล้ว) is exempted too — otherwise
    // a request the sole LM created herself could never be finally approved
    // by anyone (rule 2 requires LM specifically for that step). The
    // independent-review requirement still applies in full at the middle
    // step (รอทบทวน→รออนุมัติ), which is where it matters most.
    // DC oversees the whole system (can already edit/delete anything), so
    // DC is exempt from every role/creator restriction below and can carry
    // a request through every step itself if needed.
    if(!isDC() && currentIdx > 0 && nextStatus!=='อนุมัติแล้ว' && d.requestedBy && d.requestedBy === actor){
      errEl.textContent = `ผู้ทบทวนต้องไม่ใช่ผู้สร้างคำขอเอง (${d.requestedBy})`;
      errEl.style.display = 'block';
      return;
    }
    // rule 2: the final approval step must be done by the Lab Manager (LM)
    if(!isDC() && nextStatus==='อนุมัติแล้ว' && currentUser.role!=='LM'){
      errEl.textContent = 'ผู้อนุมัติขั้นสุดท้ายต้องเป็น Lab Manager (LM) เท่านั้น';
      errEl.style.display = 'block';
      return;
    }
    // rule 3: step 4 (the actual review, รอทบทวน→รออนุมัติ) can only be
    // done by DC or QM — not LM (LM's role is reserved for final approval)
    if(!isDC() && currentIdx===1 && (d.lastRequestType==='new'||d.lastRequestType==='revision') && !['DC','QM'].includes(currentUser.role)){
      errEl.textContent = 'ขั้นตอนทบทวนต้องดำเนินการโดย DC หรือ QM เท่านั้น';
      errEl.style.display = 'block';
      return;
    }
    // rule 4: the reviewer can't act until DC has pasted the document link
    // and selected its ISO clause (step 3) — a real prerequisite so the
    // reviewer/approver can actually go read the document
    if(currentIdx===1 && (d.lastRequestType==='new'||d.lastRequestType==='revision') && !d.linkSetAt){
      errEl.textContent = 'ยังทบทวนไม่ได้ — รอ DC วางลิงก์เอกสารและเลือกข้อกำหนดก่อน';
      errEl.style.display = 'block';
      return;
    }

    const now = Date.now();
    d.approvalStatus = nextStatus;
    d.lastUpdated = now;
    d.comments = d.comments || [];
    // always keep the ขั้นที่ N label visible in the history even when the
    // person also typed a comment — previously a custom comment replaced
    // the label entirely, making steps 4/5 look "missing" from the log
    let stepLabel;
    if((d.lastRequestType==='new'||d.lastRequestType==='revision') && nextStatus==='รออนุมัติ'){
      stepLabel = 'ขั้นที่ 4: ทบทวนแล้ว → รออนุมัติ';
    } else if((d.lastRequestType==='new'||d.lastRequestType==='revision') && nextStatus==='อนุมัติแล้ว'){
      stepLabel = 'ขั้นที่ 5: อนุมัติเอกสารแล้ว';
    } else {
      stepLabel = `อนุมัติ → ${nextStatus}`;
    }
    d.comments.push({ by:actor, text: comment ? `${stepLabel} — ${comment}` : stepLabel, time: now });
    // record the reviewer/approver names on the document's formal record —
    // only for actual new-document or revision-update requests, per SOP
    // (annual review confirmations don't touch these role fields)
    const isFormalRequest = d.lastRequestType==='new' || d.lastRequestType==='revision';
    if(isFormalRequest && d.approvalStatus==='รออนุมัติ'){
      d.reviewerName = actor;
      d.reviewedAt = now;
    }
    if(d.approvalStatus==='อนุมัติแล้ว'){
      d.approvedBy = actor;
      d.approvedAt = now;
      d.approvedComment = comment || '';
      if(isFormalRequest){
        d.approverName = actor;
      }
      if(d.lastRequestType==='review'){
        d.lastReviewedAt = now;
        d.lastReviewedBy = actor;
      }
      // per lab decision: an approved revision is the trigger point to
      // migrate an old RDI- id to the new MPIR-xx-###-rr format
      if(d.lastRequestType==='revision' && !/^MPIR-/i.test(d.id)){
        const typeCode = docTypeCode(d);
        const oldId = d.id;
        const newId = toMpirId(oldId, typeCode, d.rev);
        d.id = newId;
        d.comments.push({ by:actor, text:`เปลี่ยนรหัสเอกสารจาก ${oldId} เป็น ${newId} ตามรูปแบบใหม่`, time: now });
        state.selectedDoc = newId;
      }
    }
    if(['อนุมัติแล้ว','ไม่อนุมัติ'].includes(d.approvalStatus)){
      state.approvalTab = 'history';
      state.approvalPage = 1;
    }
    render();
    await persistDocs();
  });
  const rejectBtn = document.getElementById('btnReject');
  if(rejectBtn) rejectBtn.addEventListener('click', async ()=>{
    const actor = currentActorName();
    const comment = document.getElementById('approvalComment').value.trim();
    const errEl = document.getElementById('approvalError');
    if(!isDC() && currentIdx > 0 && d.requestedBy && d.requestedBy === actor){
      errEl.textContent = `ผู้ทบทวน/อนุมัติต้องไม่ใช่ผู้สร้างคำขอเอง (${d.requestedBy})`;
      errEl.style.display = 'block';
      return;
    }
    if(!comment){ errEl.textContent='กรอกความเห็นก่อนกด "ไม่อนุมัติ"'; errEl.style.display='block'; return; }
    d.approvalStatus = 'ไม่อนุมัติ';
    d.lastUpdated = Date.now();
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:comment, time: Date.now() });
    d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
    state.approvalTab = 'history';
    state.approvalPage = 1;
    render();
    await persistDocs();
  });
}

// ============================================================
// AUDIT VIEW — clause coverage from real data
// ============================================================
function viewAudit(){
  const clause = state.selectedClause;
  const docs = visibleDocuments().filter(d=> (d.clause||'')===clause);
  const evidence = docs.filter(d=> d.note==='สนับสนุน');
  const related = clause ? CLAUSE_TREE.flatMap(g=>g.children).filter(c=> c.id!==clause && groupOf(c.id)===groupOf(clause)) : [];
  const approvedCount = docs.filter(d=>d.approvalStatus==='อนุมัติแล้ว').length;

  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Audit View</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ภาพรวมสถานข้อกำหนด ISO/IEC 17025</div>
      </div>
      <button class="btn ghost" data-go="iso">${ic('doc')} View All Clauses</button>
    </div>
    <div class="clause-select-row" style="margin-top:8px;">
      <div class="panel-title" style="font-size:12.5px;">Select Clause</div>
      <select class="select" id="auditClausePicker">
        <option value="">ไม่ระบุข้อกำหนด</option>
        ${CLAUSES.map(([c,l])=>`<option value="${c}" ${c===clause?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-card clickable" data-audit-clause="${clause}">
      <div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${docs.length}</div><div class="stat-label">Documents<br>เอกสารที่เกี่ยวข้อง</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-audit-scroll="auditColDocs">
      <div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${approvedCount}</div><div class="stat-label">Approved<br>อนุมัติแล้ว</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-go="records">
      <div class="stat-icon purple">${ic('user')}</div>
      <div><div class="stat-num">${evidence.length}</div><div class="stat-label">Evidence / Support<br>หลักฐาน / ข้อมูลสนับสนุน</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-audit-scroll="auditColRelated">
      <div class="stat-icon amber">${ic('link')}</div>
      <div><div class="stat-num">${related.length}</div><div class="stat-label">Related Clauses<br>ข้อกำหนดที่เกี่ยวข้อง</div><a class="stat-card-link">View details →</a></div>
    </div>
  </div>

  <div class="panel">
    <div class="audit-cols" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="audit-col-panel" id="auditColDocs">
        <div class="audit-col-head">${ic('doc')}<span class="audit-col-title" style="margin-bottom:0;">Documents</span></div>
        <div class="audit-col-body">
          ${docs.length ? docs.slice(0,6).map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
        </div>
        <div class="audit-col-foot"><a data-go="documents" data-preset="all">View all documents →</a></div>
      </div>
      <div class="audit-col-panel">
        <div class="audit-col-head">${ic('user')}<span class="audit-col-title" style="margin-bottom:0;">Evidence / Support</span></div>
        <div class="audit-col-body">
          ${evidence.length ? evidence.slice(0,6).map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `
          <div class="audit-empty">${ic('search')}<p>ยังไม่มีข้อมูล</p></div>`}
        </div>
        <div class="audit-col-foot"><a data-go="records">View all evidence →</a></div>
      </div>
      <div class="audit-col-panel" id="auditColRelated">
        <div class="audit-col-head">${ic('link')}<span class="audit-col-title" style="margin-bottom:0;">Related Clauses</span></div>
        <div class="audit-col-body">
          ${related.length ? related.slice(0,6).map(r=>`<div class="audit-link" data-clause-jump-audit="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
        </div>
        <div class="audit-col-foot"><a data-go="iso">View all related clauses →</a></div>
      </div>
    </div>
  </div>`;
}
function attachAuditHandlers(){
  const picker = document.getElementById('auditClausePicker');
  if(picker) picker.addEventListener('change', e=>{ state.selectedClause = e.target.value; render(); });
  document.querySelectorAll('[data-clause-jump-audit]').forEach(elx=>{
    elx.addEventListener('click', ()=>{ state.selectedClause = elx.dataset.clauseJumpAudit; render(); });
  });
  document.querySelectorAll('[data-audit-scroll]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      const target = document.getElementById(elx.dataset.auditScroll);
      if(target) target.scrollIntoView({ behavior:'smooth', block:'center' });
    });
  });
  const docsCard = document.querySelector('[data-audit-clause]');
  if(docsCard) docsCard.addEventListener('click', ()=>{
    goTo('documents', { docFilter:{ clause: state.selectedClause, type:'All', status:'All', q:'', preset:'all' }, docPage:1 });
  });
}

// ============================================================
// DOC PICKER (shared by revision/approval views)
// ============================================================

// ============================================================
// REVIEW CALENDAR — real activity calendar built from lastUpdated
// (not a fabricated review-due schedule, since that field doesn't exist)
// ============================================================
function viewCalendar(){
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const year = state.calYear, month = state.calMonth;
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay()+6)%7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const monthName = first.toLocaleDateString('en-GB', { month:'long', year:'numeric' });

  const byDay = {};
  DOCUMENTS.forEach(d=>{
    if(!d.lastUpdated) return;
    const dt = new Date(d.lastUpdated);
    if(dt.getFullYear()===year && dt.getMonth()===month){
      const day = dt.getDate();
      (byDay[day] = byDay[day]||[]).push(d);
    }
  });

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += `<div class="fc-cell dim">${prevDays-startOffset+1+i}</div>`;
  for(let d=1; d<=daysInMonth; d++){
    const items = byDay[d];
    cells += `<div class="fc-cell">${d}${items?`<div class="fc-badges"><span class="fc-pill soon">${items.length} update${items.length>1?'s':''}</span></div>`:''}</div>`;
  }
  const trailing = (7-((startOffset+daysInMonth)%7))%7;
  for(let i=1;i<=trailing;i++) cells += `<div class="fc-cell dim">${i}</div>`;

  const recentlyUpdated = [...DOCUMENTS].filter(d=>d.lastUpdated).sort((a,b)=>b.lastUpdated-a.lastUpdated).slice(0,6);

  return `
  <div class="grid" style="grid-template-columns:1fr 280px; align-items:start;">
    <div class="panel">
      <div class="full-cal-head">
        <div class="full-cal-title">${monthName}</div>
        <div class="cal-nav"><button id="calPrev">‹</button><button id="calNext">›</button></div>
      </div>
      <div class="full-cal-grid">${dows.map(d=>`<div class="fc-dow">${d}</div>`).join('')}${cells}</div>
      <div style="font-size:11px; color:var(--ink-500); margin-top:10px;">แต่ละวันแสดงจำนวนเอกสารที่มีการแก้ไข/อัปเดตในระบบจริง (จาก lastUpdated)</div>
    </div>
    <div class="panel">
      <div class="panel-title" style="margin-bottom:12px;">Recently Updated</div>
      ${recentlyUpdated.map(d=>`
        <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
          <div class="file-ic">${ic('file')}</div>
          <div class="rl-main"><div class="rl-title">${d.id}</div><div class="rl-sub">${fmtDate(d.lastUpdated)}</div></div>
          ${statusBadge(d.note)}
        </div>`).join('') || `<div style="color:var(--ink-500); font-size:12.5px;">No activity yet.</div>`}
    </div>
  </div>`;
}
function attachCalHandlers(){
  const p = document.getElementById('calPrev');
  const n = document.getElementById('calNext');
  if(p) p.addEventListener('click', ()=>{ state.calMonth--; if(state.calMonth<0){state.calMonth=11; state.calYear--;} render(); });
  if(n) n.addEventListener('click', ()=>{ state.calMonth++; if(state.calMonth>11){state.calMonth=0; state.calYear++;} render(); });
  attachGlobalRowHandlers();
}

// ============================================================
// AUDIT TRAIL — real feed built from every document's comments[]
// ============================================================
function viewAuditTrail(){
  const feed = DOCUMENTS.flatMap(d=> (d.comments||[]).map(c=>({...c, docId:d.id, docName:d.name})))
    .sort((a,b)=> (b.time||0)-(a.time||0)).slice(0,60);
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Audit Trail</div><div style="font-size:11.5px; color:var(--ink-500);">${feed.length} entries</div></div>
    ${feed.length ? feed.map(a=>`
      <div class="at-item" data-open-doc="${a.docId}" style="cursor:pointer;">
        <div class="at-icon">${ic('history')}</div>
        <div class="at-main"><div class="at-title">${a.by} — ${a.docId}</div><div class="at-meta">${a.text}</div></div>
        <div class="at-time">${fmtDateTime(a.time)}</div>
      </div>`).join('') : emptyState('ยังไม่มีกิจกรรม','No approval or comment activity recorded yet.')}
  </div>`;
}

// ============================================================
// MASTER LIST IMPORT — merges MASTER_LIST (parsed from MPIR's
// SharePoint master list export) into DOCUMENTS by matching on id.
// Updates name/link/dates/rev/note and maps role codes (LM/TM/QM/DC)
// to real names for preparedBy/reviewerName/approverName.
//
// Rows with note "ยกเลิก" (cancelled) never land in DOCUMENTS — they're
// moved into ARCHIVE_ITEMS under the "เอกสารยกเลิก" folder instead, and
// visibleDocuments() also hides any note==='ยกเลิก' doc as a second line
// of defense (e.g. if one gets set that way outside of an import).
// ============================================================
const CANCELLED_ARCHIVE_CATEGORY = 'เอกสารยกเลิก';
function toEpoch(isoDateStr){
  if(!isoDateStr) return null;
  const t = new Date(isoDateStr + 'T00:00:00').getTime();
  return isNaN(t) ? null : t;
}
function applyMasterListRow(row, d){
  d.name = row.name || d.name;
  d.rev = row.rev || d.rev || null;
  if(row.link) d.link = row.link;
  if(row.note) d.note = row.note;
  d.createdDate = toEpoch(row.created) || d.createdDate || null;
  d.effectiveDate = toEpoch(row.effective) || d.effectiveDate || null;
  d.preparedBy = roleName(row.prep) || d.preparedBy || '';
  d.reviewerName = roleName(row.reviewer) || d.reviewerName || '';
  d.approverName = roleName(row.approver) || d.approverName || '';
  // ควบคุม/แจกจ่าย = documents actively in force · สนับสนุน = reference/
  // support material · ยกเลิก = retired documents (routed to the archive
  // below). All four are already-settled records coming from the master
  // list, not new/in-progress requests, so none of them need to go
  // through the app's internal approval workflow.
  if(['ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก'].includes(d.note)){
    d.approvalStatus = 'อนุมัติแล้ว';
    if(!d.approvedBy){
      d.approvedBy = d.approverName || '';
      d.approvedAt = d.effectiveDate || d.lastUpdated || Date.now();
    }
  }
  d.lastUpdated = Date.now();
}
// Creates/updates the archive entry for a cancelled document. Matched on
// sourceDocId so re-running the import updates the same archive item
// instead of creating a duplicate each time.
function archiveCancelledRow(row, existingDoc){
  const uploadedAt = toEpoch(row.effective) || toEpoch(row.created) || (existingDoc && existingDoc.lastUpdated) || Date.now();
  const approver = roleName(row.approver) || '';
  let a = ARCHIVE_ITEMS.find(x=> x.sourceDocId===row.id);
  if(a){
    a.title = row.name || a.title;
    a.link = row.link || a.link;
    a.uploadedAt = uploadedAt;
  } else {
    ARCHIVE_ITEMS.push({
      id: 'ARC-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      sourceDocId: row.id, title: row.name || row.id, category: CANCELLED_ARCHIVE_CATEGORY,
      clause:'', link: row.link || '', uploadedBy: approver || 'Master List Import',
      uploadedAt, status:'ยืนยันแล้ว', verifiedBy: approver || null, verifiedAt: uploadedAt,
    });
  }
}
async function runMasterListImport(){
  if(typeof MASTER_LIST === 'undefined'){
    return { ok:false, message:'ไม่พบไฟล์ masterlist.js' };
  }
  // Cancelled rows get merged into ARCHIVE_ITEMS below — make sure the
  // existing archive has actually loaded first, or persistArchive() would
  // overwrite it with an empty/partial in-memory array.
  if(!ARCHIVE_LOADED){
    await loadArchive();
    if(!ARCHIVE_LOADED){
      return { ok:false, message: 'โหลดคลังเอกสารไม่สำเร็จ ลองใหม่อีกครั้ง: ' + (ARCHIVE_ERROR||'') };
    }
  }
  let updated = 0, created = 0, archived = 0;
  MASTER_LIST.forEach(row=>{
    let d = DOCUMENTS.find(x=>x.id===row.id);
    if(row.note === 'ยกเลิก'){
      archiveCancelledRow(row, d);
      archived++;
      if(d) DOCUMENTS = DOCUMENTS.filter(x=>x.id!==row.id); // move out of the doc register
      return;
    }
    if(d){
      applyMasterListRow(row, d);
      updated++;
    } else {
      d = {
        id: row.id, name: row.name, clause:'', link: row.link || '', note: row.note || 'ว่าง',
        approvalStatus:'ร่าง', reviewerName:'', approverName:'', preparedBy:'', comments:[],
        lastUpdated: Date.now(), rev:null, createdDate:null, effectiveDate:null,
      };
      applyMasterListRow(row, d);
      DOCUMENTS.push(d);
      created++;
    }
  });
  await persistDocs();
  if(archived>0) await persistArchive();
  return { ok:true, updated, created, archived };
}


// ============================================================
// ADMINISTRATION
// ============================================================
function viewAdmin(){
  return viewWatermarkTool() + viewImportMasterListPanel();
}

// ============================================================
// IMPORT MASTER LIST — UI entry point for runMasterListImport()
// (see the MASTER LIST IMPORT section below for the merge logic).
// DC-only, matching the other admin-only tools on this page.
// ============================================================
function viewImportMasterListPanel(){
  if(!isDC()) return '';
  const hasList = typeof MASTER_LIST !== 'undefined';
  const total = hasList ? MASTER_LIST.length : 0;
  const cancelledCount = hasList ? MASTER_LIST.filter(r=>r.note==='ยกเลิก').length : 0;
  const activeRows = hasList ? MASTER_LIST.filter(r=>r.note!=='ยกเลิก') : [];
  const existingIds = new Set(DOCUMENTS.map(d=>d.id));
  const newCount = activeRows.filter(r=>!existingIds.has(r.id)).length;
  const updateCount = activeRows.length - newCount;
  return `
  <div class="panel" style="margin-top:20px;">
    <div class="panel-head"><div class="panel-title">นำเข้ารายการเอกสารหลัก (Import Master List)</div></div>
    ${hasList ? `
    <div style="font-size:12.5px; color:var(--ink-700); margin-bottom:14px;">
      นำเข้าเอกสารจาก <code>masterlist.js</code> (${total} รายการ) เข้าสู่ทะเบียนเอกสาร — <b>ไม่ผ่านขั้นตอนอนุมัติในระบบ</b> เอกสารที่มีสถานะ "ควบคุม" "แจกจ่าย" "สนับสนุน" หรือ "ยกเลิก" ในรายการหลักจะถูกตั้งเป็น <b>"อนุมัติแล้ว"</b> ทันที โดยใช้ <b>วันที่จัดทำ</b> และ <b>วันที่ประกาศใช้</b> ตามที่ระบุไว้ในรายการหลักของแต่ละเอกสาร รหัสที่ตรงกับเอกสารเดิม (${updateCount} รายการ) จะถูกอัปเดตข้อมูล ส่วนรหัสใหม่ (${newCount} รายการ) จะถูกเพิ่มเข้าทะเบียน<br>
      เอกสารที่มีสถานะ <b>"ยกเลิก"</b> (${cancelledCount} รายการ) จะ<b>ไม่แสดงในรายการเอกสารเลย</b> — จะถูกย้ายไปไว้ที่ คลังเอกสาร → โฟลเดอร์ "${CANCELLED_ARCHIVE_CATEGORY}" แทน
    </div>
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <button class="btn primary" id="btnImportMasterList">${ic('plus')} นำเข้ารายการเอกสารหลัก (${total} รายการ)</button>
      <span id="importMlStatus" style="font-size:12px; color:var(--ink-500);"></span>
    </div>` : `
    <div style="font-size:12.5px; color:var(--ink-700);">ไม่พบไฟล์ <code>masterlist.js</code> — ตรวจสอบว่าไฟล์นี้ถูกโหลดในหน้าเว็บแล้ว</div>`}
  </div>`;
}

// ============================================================
// WATERMARK TOOL — open to every logged-in role. Whoever uses it uploads a
// PDF and the app stamps ONE centered diagonal watermark per page reading
// "CONTROLLED DOCUMENT — Issued by: <user's role> (<user's name>) |
// Issue date: <today>", entirely in the browser, then triggers a download.
// The uploaded/output PDF is never stored anywhere — only a log entry
// (document ID, who, when) is kept, so anyone can see how many controlled
// copies of a document have been issued without keeping the files
// themselves.
// ============================================================
function watermarkCountsByDoc(){
  const counts = {};
  WATERMARK_LOG.forEach(e=>{
    counts[e.docId] = counts[e.docId] || { downloaded:0, distributed:0, recalled:0, entries:[] };
    const c = counts[e.docId];
    if(e.type === 'distribute'){
      c.distributed++;
      // recall only applies to distributed copies — a plain download never
      // needs to be "recalled" since it wasn't handed to anyone
      if(e.recalled) c.recalled++;
    } else {
      c.downloaded++;
    }
    c.entries.push(e);
  });
  return counts;
}
function viewWatermarkTool(){
  const counts = watermarkCountsByDoc();
  const docIds = Object.keys(counts).sort();
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">ลายน้ำเอกสาร (Watermark PDF)</div></div>
    <div style="font-size:12.5px; color:var(--ink-700); margin-bottom:14px;">
      อัปโหลดไฟล์ PDF แล้วระบบจะติดลายน้ำพาดขวางกลางหน้าในทุกหน้า 2 บรรทัด: <b>"CONTROLLED DOCUMENT"</b> (ตัวหนา ขนาด 36) และ "Issued by ${currentUser ? (ROLE_LABEL[currentUser.role]||currentUser.role) : '[ตำแหน่งเต็ม]'} (${currentUser ? currentUser.name : '[ชื่อเต็ม]'}) | Issue date: ${fmtDate(Date.now())}" (ตัวปกติ ขนาด 32) แล้วดาวน์โหลดไฟล์ให้ทันที — <b>ไม่มีการเก็บไฟล์ไว้ในระบบ</b> เก็บแค่ทะเบียนสำเนาที่แจกจ่ายไป (ใคร วันที่ ให้ใคร) เพื่อให้เรียกคืนได้ในอนาคตหากจำเป็น
    </div>
    <div class="field"><label>รหัสเอกสาร</label>
      <input id="wmDocId" list="wmDocIdList" placeholder="เช่น MPIR-LM-001-00 หรือพิมพ์เอง">
      <datalist id="wmDocIdList">${DOCUMENTS.map(d=>`<option value="${d.id}">`).join('')}</datalist>
    </div>
    <div class="field"><label>ไฟล์ PDF</label><input type="file" id="wmFile" accept="application/pdf"></div>
    <div class="field"><label>ประเภท</label>
      <select id="wmType">
        <option value="download">ดาวน์โหลด (ใช้เอง — ไม่ต้องเรียกคืน)</option>
        <option value="distribute">แจกจ่าย (ให้ผู้อื่น — ต้องเรียกคืนได้)</option>
      </select>
    </div>
    <div class="field" id="wmRecipientField" style="display:none;"><label>แจกจ่ายให้</label><input id="wmRecipient" placeholder="เช่น ทีมประกันคุณภาพ, ผู้ตรวจติดตาม"></div>
    <div class="field-error" id="wmError" style="display:none;"></div>
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <button class="btn primary" id="btnWatermark">${ic('doc')} ติดลายน้ำและดาวน์โหลด</button>
      <button class="btn ghost" id="btnWmManualOpen">${ic('plus')} เพิ่มบันทึกแจกจ่ายด้วยตนเอง</button>
      <span id="wmStatus" style="font-size:12px; color:var(--ink-500);"></span>
    </div>
    <div style="font-size:11px; color:var(--ink-500); margin-top:6px;">ใช้ปุ่ม "เพิ่มบันทึกแจกจ่ายด้วยตนเอง" เมื่อแจกจ่ายสำเนาที่พิมพ์ไว้แล้วนอกระบบ (เช่น แจกในที่ประชุม) โดยไม่ต้องอัปโหลดไฟล์ซ้ำ</div>

    <div style="margin-top:22px; padding-top:18px; border-top:1px solid var(--line);">
      <div style="font-size:12.5px; font-weight:800; color:var(--ink-900); margin-bottom:10px;">ทะเบียนสำเนา (ดาวน์โหลด ${WATERMARK_LOG.filter(e=>e.type!=='distribute').length} · แจกจ่าย ${WATERMARK_LOG.filter(e=>e.type==='distribute').length} ฉบับ จาก ${docIds.length} เอกสาร)</div>
      ${docIds.length ? `<div class="table-wrap"><table class="dtable">
        <thead><tr><th>รหัสเอกสาร</th><th>ดาวน์โหลด</th><th>แจกจ่ายแล้ว</th><th>เรียกคืนแล้ว</th><th>คงเหลือนอกระบบ</th><th>ล่าสุด</th><th></th></tr></thead>
        <tbody>
          ${docIds.map(id=>{
            const c = counts[id];
            // "recall" and "outstanding" only make sense for copies that were
            // actually handed to someone — plain downloads are excluded
            const outstanding = c.distributed - c.recalled;
            const last = c.entries.slice().sort((a,b)=>b.at-a.at)[0];
            return `
          <tr data-wm-toggle="${id}" style="cursor:pointer;">
            <td class="mono">${id}</td>
            <td>${c.downloaded}</td>
            <td>${c.distributed}</td>
            <td>${c.recalled}</td>
            <td>${outstanding>0 ? `<b style="color:var(--amber-600);">${outstanding}</b>` : outstanding}</td>
            <td>${last ? `${last.by} · ${fmtDateTime(last.at)}` : '—'}</td>
            <td>${ic('chevronDown','sm-icon')}</td>
          </tr>
          <tr class="wm-detail-row" data-wm-detail="${id}" style="display:${state.wmExpandedDoc===id?'table-row':'none'};"><td colspan="7">
            ${c.entries.slice().sort((a,b)=>b.at-a.at).map(e=>{
              const isDistribute = e.type === 'distribute';
              return `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid var(--line);">
              <div style="font-size:11.5px; color:var(--ink-700);">
                <span style="font-weight:700; color:${isDistribute ? 'var(--amber-600)' : 'var(--ink-500)'};">${isDistribute ? 'แจกจ่าย' : 'ดาวน์โหลด'}</span>
                · ${e.by} — ${fmtDateTime(e.at)}
                ${e.recipient ? ` · ให้: ${e.recipient}` : ''}
                ${e.manual ? ` <span style="color:var(--amber-600); font-weight:700;">(บันทึกด้วยตนเอง${e.note ? ': '+e.note : ''})</span>` : ''}
                ${isDistribute && e.recalled ? `<br><span style="color:var(--green-600); font-weight:700;">✓ เรียกคืนแล้ว ${fmtDateTime(e.recalledAt)} โดย ${e.recalledBy}</span>` : ''}
              </div>
              ${isDistribute ? `<button class="btn ${e.recalled?'ghost':'success'}" data-wm-recall="${e.id}" style="flex-shrink:0; font-size:11px; padding:5px 10px;">${e.recalled ? 'ยกเลิกการเรียกคืน' : 'ทำเครื่องหมายว่าเรียกคืนแล้ว'}</button>` : ''}
            </div>`;
            }).join('')}
          </td></tr>`;
          }).join('')}
        </tbody>
      </table></div>` : `<div style="font-size:12.5px; color:var(--ink-500);">ยังไม่มีทะเบียนสำเนาแจกจ่าย</div>`}
    </div>
  </div>`;
}
function wmManualModal(){
  return `
  <div class="modal-backdrop" id="wmManualBackdrop">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">เพิ่มบันทึกแจกจ่ายด้วยตนเอง</div><button class="modal-close" id="wmManualCloseBtn">✕</button></div>
      <div class="modal-body">
        <div style="font-size:11.5px; color:var(--ink-500); margin-bottom:14px;">สำหรับสำเนาที่พิมพ์/แจกจ่ายไปแล้วนอกระบบ (เช่น แจกในที่ประชุม) — บันทึกไว้เพื่อการนับจำนวนเท่านั้น ไม่มีการสร้างหรือเก็บไฟล์</div>
        <div class="field"><label>รหัสเอกสาร</label>
          <input id="wmManualDocId" list="wmDocIdList" placeholder="เช่น MPIR-LM-001-00 หรือพิมพ์เอง">
        </div>
        <div class="field"><label>จำนวนสำเนาที่แจกจ่าย</label>
          <input id="wmManualQty" type="number" min="1" value="1"></div>
        <div class="field"><label>แจกจ่ายให้ (ไม่บังคับ)</label>
          <input id="wmManualRecipient" placeholder="เช่น ทีมประกันคุณภาพ, ผู้ตรวจติดตาม"></div>
        <div class="field"><label>หมายเหตุ (ไม่บังคับ)</label>
          <input id="wmManualNote" placeholder="เช่น แจกในที่ประชุมทบทวนฝ่ายบริหาร"></div>
        <div class="field-error" id="wmManualError" style="display:none;"></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="wmManualCancelBtn">ยกเลิก</button>
        <button class="btn primary" id="wmManualSaveBtn">บันทึก</button>
      </div>
    </div>
  </div>`;
}
function wireWmManualModal(){
  const backdrop = document.getElementById('wmManualBackdrop');
  if(!backdrop) return;
  const close = ()=>{ state.wmManualModal = false; renderModalLayer(); };
  document.getElementById('wmManualCloseBtn').addEventListener('click', close);
  document.getElementById('wmManualCancelBtn').addEventListener('click', close);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) close(); });
  document.getElementById('wmManualSaveBtn').addEventListener('click', async ()=>{
    const errEl = document.getElementById('wmManualError');
    const docId = document.getElementById('wmManualDocId').value.trim();
    const qtyRaw = document.getElementById('wmManualQty').value;
    const qty = parseInt(qtyRaw, 10);
    const note = document.getElementById('wmManualNote').value.trim();
    const recipient = document.getElementById('wmManualRecipient').value.trim();
    if(!docId){ errEl.textContent = 'กรอกรหัสเอกสารก่อน'; errEl.style.display='block'; return; }
    if(!qty || qty < 1){ errEl.textContent = 'จำนวนสำเนาต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป'; errEl.style.display='block'; return; }
    const actor = currentActorName();
    const now = Date.now();
    // Firestore's setDoc() rejects `undefined` field values outright — always
    // use '' (empty string) for optional text fields the user left blank,
    // never `undefined`
    for(let i=0; i<qty; i++){
      WATERMARK_LOG.push({
        id: 'WM-' + now.toString(36) + Math.random().toString(36).slice(2,7) + '-' + i,
        docId, by: actor, at: now, manual: true, note, recipient, type: 'distribute',
        recalled: false, recalledAt: null, recalledBy: null,
      });
    }
    state.wmManualModal = false;
    render();
    await persistWatermarkLog();
  });
}
let PDF_LIB_PROMISE = null;
function loadPdfLib(){
  if(!PDF_LIB_PROMISE) PDF_LIB_PROMISE = import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js');
  return PDF_LIB_PROMISE;
}
let FONTKIT_PROMISE = null;
function loadFontkit(){
  // pdf-lib's built-in StandardFonts (Helvetica etc.) can't encode Thai
  // characters at all — registering fontkit lets us embed real fonts
  // (below) instead. The watermark text itself is English/numbers today,
  // but account names could be Thai in the future, so this stays in place
  // as a safety net rather than reverting to StandardFonts.
  if(!FONTKIT_PROMISE) FONTKIT_PROMISE = import('https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm');
  return FONTKIT_PROMISE;
}
let THAI_FONT_REGULAR_PROMISE = null;
function loadThaiFontRegular(){
  if(!THAI_FONT_REGULAR_PROMISE) THAI_FONT_REGULAR_PROMISE = fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf')
    .then(r=>{ if(!r.ok) throw new Error('โหลดฟอนต์ไทยไม่สำเร็จ'); return r.arrayBuffer(); });
  return THAI_FONT_REGULAR_PROMISE;
}
let THAI_FONT_BOLD_PROMISE = null;
function loadThaiFontBold(){
  if(!THAI_FONT_BOLD_PROMISE) THAI_FONT_BOLD_PROMISE = fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf')
    .then(r=>{ if(!r.ok) throw new Error('โหลดฟอนต์ไทย (ตัวหนา) ไม่สำเร็จ'); return r.arrayBuffer(); });
  return THAI_FONT_BOLD_PROMISE;
}
async function watermarkAndDownload(file, docId){
  const [{ PDFDocument, rgb, degrees }, fontkitModule, regularBytes, boldBytes] = await Promise.all([
    loadPdfLib(), loadFontkit(), loadThaiFontRegular(), loadThaiFontBold(),
  ]);
  const fontkit = fontkitModule.default || fontkitModule;
  const positionLabel = currentUser ? (ROLE_LABEL[currentUser.role] || currentUser.role) : '—';
  const fullName = currentUser ? currentUser.name : '—';
  const lines = [
    { text: 'CONTROLLED DOCUMENT', size: 36, bold: true },
    { text: `Issued by ${positionLabel} (${fullName}) | Issue date: ${fmtDate(Date.now())}`, size: 24, bold: false },
  ];
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.registerFontkit(fontkit);
  const regularFont = await pdfDoc.embedFont(regularBytes, { subset: true });
  const boldFont = await pdfDoc.embedFont(boldBytes, { subset: true });
  const angleDeg = 45;
  const angleRad = angleDeg * Math.PI / 180;
  const lineGap = 42; // baseline-to-baseline spacing between the two lines — scaled up to match the larger font sizes
  const pages = pdfDoc.getPages();
  // Shrink any line that would run wider than the page can comfortably show
  // — the role/name text (line 2) varies in length depending on who's
  // logged in, so a fixed size that fits "Yarapon Puttakot" could overflow
  // for a longer name. Uses the first page's dimensions as the reference so
  // every page in the document gets the same, consistent watermark size.
  if(pages.length){
    const { width: refWidth, height: refHeight } = pages[0].getSize();
    const maxTextWidth = Math.min(refWidth, refHeight) * 0.85;
    lines.forEach(line=>{
      const font = line.bold ? boldFont : regularFont;
      const w = font.widthOfTextAtSize(line.text, line.size);
      if(w > maxTextWidth){
        line.size = Math.max(8, line.size * (maxTextWidth / w));
      }
    });
  }
  pages.forEach(page=>{
    const { width, height } = page.getSize();
    const centerX = width / 2, centerY = height / 2;
    const n = lines.length;
    lines.forEach((line, i)=>{
      const font = line.bold ? boldFont : regularFont;
      const textWidth = font.widthOfTextAtSize(line.text, line.size);
      // this line's stacked offset in the local (unrotated) text frame —
      // first line above the block's center, subsequent lines below it
      const localY = (n-1)/2*lineGap - i*lineGap;
      const halfWidth = textWidth / 2;
      const halfHeight = line.size * 0.32;
      // rotate both the horizontal-centering offset and the vertical-stack
      // offset from local text space into page space, then anchor relative
      // to the page's true center point
      const x = centerX - (halfWidth*Math.cos(angleRad) - halfHeight*Math.sin(angleRad)) - localY*Math.sin(angleRad);
      const y = centerY - (halfWidth*Math.sin(angleRad) + halfHeight*Math.cos(angleRad)) + localY*Math.cos(angleRad);
      page.drawText(line.text, {
        x, y, size: line.size, font,
        color: rgb(0.5,0.5,0.5), opacity: 0.35,
        rotate: degrees(angleDeg),
      });
    });
  });
  const outBytes = await pdfDoc.save();
  const blob = new Blob([outBytes], { type:'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${docId}-controlled-watermarked.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function attachWatermarkHandlers(){
  const importBtn = document.getElementById('btnImportMasterList');
  if(importBtn){
    importBtn.addEventListener('click', async ()=>{
      if(!isDC()) return; // defense in depth — button only renders for DC anyway
      if(!confirm('นำเข้ารายการเอกสารหลักทั้งหมด?\n\nเอกสารที่มีสถานะ "ควบคุม"/"แจกจ่าย"/"สนับสนุน"/"ยกเลิก" จะถูกตั้งเป็น "อนุมัติแล้ว" ทันที โดยไม่ผ่านขั้นตอนอนุมัติในระบบ และใช้วันที่จัดทำ/ประกาศใช้ตามรายการหลัก\n\nเอกสารสถานะ "ยกเลิก" จะไม่แสดงในรายการเอกสาร — ย้ายไปคลังเอกสาร โฟลเดอร์ "เอกสารยกเลิก" แทน')) return;
      const statusEl = document.getElementById('importMlStatus');
      importBtn.disabled = true;
      if(statusEl) statusEl.textContent = 'กำลังนำเข้า...';
      const result = await runMasterListImport();
      importBtn.disabled = false;
      if(!result.ok){
        if(statusEl) statusEl.textContent = result.message;
        return;
      }
      if(statusEl) statusEl.textContent = `นำเข้าเสร็จแล้ว — อัปเดต ${result.updated} รายการ, เพิ่มใหม่ ${result.created} รายการ, ย้ายไปคลังเอกสาร (ยกเลิก) ${result.archived} รายการ`;
      render();
    });
  }
  const manualOpenBtn = document.getElementById('btnWmManualOpen');
  if(manualOpenBtn) manualOpenBtn.addEventListener('click', ()=>{ state.wmManualModal = true; renderModalLayer(); });
  const typeSel = document.getElementById('wmType');
  const recipientField = document.getElementById('wmRecipientField');
  if(typeSel && recipientField){
    const syncRecipientVisibility = ()=>{ recipientField.style.display = typeSel.value === 'distribute' ? '' : 'none'; };
    typeSel.addEventListener('change', syncRecipientVisibility);
    syncRecipientVisibility();
  }
  document.querySelectorAll('[data-wm-toggle]').forEach(row=>{
    row.addEventListener('click', ()=>{
      const id = row.dataset.wmToggle;
      state.wmExpandedDoc = state.wmExpandedDoc===id ? null : id;
      render();
    });
  });
  document.querySelectorAll('[data-wm-recall]').forEach(recallBtn=>{
    recallBtn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const entry = WATERMARK_LOG.find(x=>x.id===recallBtn.dataset.wmRecall);
      if(!entry) return;
      if(entry.recalled){
        entry.recalled = false; entry.recalledAt = null; entry.recalledBy = null;
      } else {
        entry.recalled = true; entry.recalledAt = Date.now(); entry.recalledBy = currentActorName();
      }
      render();
      await persistWatermarkLog();
    });
  });
  const btn = document.getElementById('btnWatermark');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    if(!currentUser) return; // must be logged in — everyone with an account can print/watermark
    const errEl = document.getElementById('wmError');
    const statusEl = document.getElementById('wmStatus');
    const docId = document.getElementById('wmDocId').value.trim();
    const fileInput = document.getElementById('wmFile');
    const file = fileInput && fileInput.files && fileInput.files[0];
    const typeSelEl = document.getElementById('wmType');
    const type = typeSelEl && typeSelEl.value === 'distribute' ? 'distribute' : 'download';
    const recipientInput = document.getElementById('wmRecipient');
    errEl.style.display = 'none';
    if(!docId){ errEl.textContent = 'กรอกรหัสเอกสารก่อน'; errEl.style.display='block'; return; }
    if(!file){ errEl.textContent = 'เลือกไฟล์ PDF ก่อน'; errEl.style.display='block'; return; }
    if(file.type !== 'application/pdf'){ errEl.textContent = 'รองรับเฉพาะไฟล์ PDF เท่านั้น'; errEl.style.display='block'; return; }
    if(type === 'distribute' && recipientInput && !recipientInput.value.trim()){ errEl.textContent = 'ระบุว่าแจกจ่ายให้ใคร เพื่อให้เรียกคืนได้ในภายหลัง'; errEl.style.display='block'; return; }
    btn.disabled = true;
    statusEl.textContent = 'กำลังติดลายน้ำ...';
    try{
      await watermarkAndDownload(file, docId);
      const actor = currentActorName();
      const recipient = (type === 'distribute' && recipientInput) ? recipientInput.value.trim() : '';
      const now = Date.now();
      WATERMARK_LOG.push({
        id: 'WM-' + now.toString(36) + Math.random().toString(36).slice(2,7),
        docId, by: actor, at: now, manual: false, note: '', recipient, type,
        recalled: false, recalledAt: null, recalledBy: null,
      });
      await persistWatermarkLog();
      statusEl.textContent = 'เสร็จแล้ว — ดาวน์โหลดไฟล์และบันทึกประวัติแล้ว';
      fileInput.value = '';
      if(recipientInput) recipientInput.value = '';
      render();
    } catch(e){
      console.error('watermark failed', e);
      statusEl.textContent = '';
      errEl.textContent = 'ติดลายน้ำไม่สำเร็จ: ' + (e && e.message ? e.message : e);
      errEl.style.display = 'block';
    }
    btn.disabled = false;
  });
}

// ============================================================
// GO
// ============================================================
initApp();
