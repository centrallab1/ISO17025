// ============================================================
// APP STATE
// ============================================================
const state = {
  view: 'dashboard',
  selectedClause: '7.2',
  isoTab: 'documents',
  docFilter: { clause:'All', type:'All', status:'All', q:'' },
  docPage: 1,
  selectedDoc: 'SOP-007',
  calMonth: 7, // 0-indexed, 7 = August
  calYear: 2026,
};

const ICONS = {
  doc: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  check: `<path d="m5 12 5 5L20 7"/>`,
  clock: `<path d="M12 7v5l3 3"/><circle cx="12" cy="12" r="9"/>`,
  alert: `<path d="M12 8v5M12 16h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>`,
  file: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  pdf: `<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5"/>`,
  download: `<path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/>`,
  history: `<path d="M12 2a10 10 0 1 0 7.07 2.93M12 2v5h5"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  empty: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
};
function ic(name, cls=''){ return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`; }

function badge(status){
  const map = { Active:'active', Review:'review', Overdue:'overdue', Draft:'draft' };
  return `<span class="badge ${map[status]||'draft'}">${status}</span>`;
}
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function clauseTitle(id){
  for(const g of CLAUSE_TREE){
    if(g.id===id) return `${g.id} ${g.title}`;
    for(const c of g.children||[]){ if(c.id===id) return `${c.id} ${c.title}`; }
  }
  return id;
}

// ============================================================
// NAV
// ============================================================
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.view = btn.dataset.view;
    render();
    window.scrollTo({top:0, behavior:'instant'});
  });
});

function goTo(view, extra={}){
  Object.assign(state, extra);
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  render();
  window.scrollTo({top:0, behavior:'instant'});
}

// ============================================================
// RENDER ROOT
// ============================================================
function render(){
  const el = document.getElementById('content');
  switch(state.view){
    case 'dashboard': el.innerHTML = viewDashboard(); break;
    case 'iso': el.innerHTML = viewISO(); attachISOHandlers(); break;
    case 'documents': el.innerHTML = viewDocuments(); attachDocHandlers(); return;
    case 'records': el.innerHTML = viewRecords(); break;
    case 'revision': el.innerHTML = viewRevision(); attachDocPicker('revision'); break;
    case 'approval': el.innerHTML = viewApproval(); attachDocPicker('approval'); break;
    case 'audit': el.innerHTML = viewAudit(); attachAuditHandlers(); break;
    case 'calendar': el.innerHTML = viewCalendar(); attachCalHandlers(); break;
    case 'audittrail': el.innerHTML = viewAuditTrail(); break;
    case 'admin': el.innerHTML = viewAdmin(); break;
    case 'docdetail': el.innerHTML = viewDocDetail(state.selectedDoc); attachDetailHandlers(); break;
    default: el.innerHTML = viewDashboard();
  }
  attachGlobalRowHandlers();
}

function attachGlobalRowHandlers(){
  document.querySelectorAll('[data-open-doc]').forEach(row=>{
    row.addEventListener('click', ()=>{
      goTo('docdetail', { selectedDoc: row.dataset.openDoc });
    });
  });
  document.querySelectorAll('[data-go]').forEach(elx=>{
    elx.addEventListener('click', ()=> goTo(elx.dataset.go));
  });
}

// ============================================================
// DASHBOARD
// ============================================================
function viewDashboard(){
  const s = computeStats();
  const comp = complianceByClauseGroup();
  const recent = [...DOCUMENTS].sort((a,b)=> new Date(b.effDate)-new Date(a.effDate)).slice(0,3);

  return `
  <div class="stat-row">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${s.total}</div><div class="stat-label">Documents ทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${s.active}</div><div class="stat-label">Active เอกสารใช้งาน</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('clock')}</div>
      <div><div class="stat-num">${s.review}</div><div class="stat-label">Under Review รอการทบทวน</div></div></div>
    <div class="stat-card"><div class="stat-icon red">${ic('alert')}</div>
      <div><div class="stat-num">${s.overdue}</div><div class="stat-label">Overdue เกินกำหนด</div></div></div>
  </div>

  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">ISO 17025 Compliance</div></div>
      ${comp.map((c,i)=>`
        <div class="prog-row">
          <div class="prog-badge">${c.n}</div>
          <div class="prog-label">${c.label}</div>
          <div class="prog-track"><div class="prog-fill" style="width:${c.pct}%"></div></div>
          <div class="prog-pct">${c.pct}%</div>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Action Required</div></div>
      <div class="action-item">
        <div class="action-dot red">${ic('alert')}</div>
        <div class="action-text">เอกสารเกินกำหนดทบทวน</div>
        <div class="action-count">${s.overdue} รายการ</div>
      </div>
      <div class="action-item">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">เอกสารรอการอนุมัติ</div>
        <div class="action-count">${s.review} รายการ</div>
      </div>
      <div class="action-item">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">เอกสารใกล้ครบกำหนดทบทวนใน 30 วัน</div>
        <div class="action-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='upcoming').length} รายการ</div>
      </div>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Recent Documents</div><button class="panel-link" data-go="documents">View all</button></div>
      ${recent.map(d=>`
        <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
          <div class="file-ic">${ic('file')}</div>
          <div class="rl-main">
            <div class="rl-title">${d.id} &nbsp;${d.name}</div>
            <div class="rl-sub">${fmtDate(d.effDate)} · ${d.owner}</div>
          </div>
          <div class="rl-rev">Rev.${d.rev}</div>
        </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Review Calendar <span style="color:var(--ink-500); font-weight:500;">(Next 30 Days)</span></div></div>
      ${miniCalendar()}
    </div>
  </div>
  `;
}

function miniCalendar(){
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const year=2026, month=7; // August
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay()+6)%7; // Monday-first
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = 24; // "today" marker to match brief's Aug 24 2026 context isn't in screenshot; keep 18 per screenshot's highlighted "today"
  let cells = '';
  for(let i=0;i<startOffset;i++){
    const prevDays = new Date(year, month, 0).getDate();
    cells += `<div class="cal-cell dim">${prevDays-startOffset+1+i}</div>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const ev = CAL_EVENTS[d];
    let cls = '';
    if(d===18) cls='today';
    else if(ev && ev.type==='overdue') cls='overdue';
    else if(ev && ev.type==='soon') cls='soon';
    else if(ev && ev.type==='upcoming') cls='upcoming';
    cells += `<div class="cal-cell ${cls}" title="${ev?ev.label:''}">${d}</div>`;
  }
  const total = startOffset+daysInMonth;
  const trailing = (7-(total%7))%7;
  for(let i=1;i<=trailing;i++) cells += `<div class="cal-cell dim">${i}</div>`;

  return `
  <div class="mini-cal-head">
    <div class="mini-cal-title">August 2026</div>
    <div class="cal-nav"><button>‹</button><button>›</button></div>
  </div>
  <div class="cal-grid">
    ${dows.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
    ${cells}
  </div>
  <div class="cal-legend">
    <div class="lg-item"><span class="lg-dot red"></span>Overdue<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='overdue').length}</span></div>
    <div class="lg-item"><span class="lg-dot amber"></span>&lt; 30 days<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='soon').length}</span></div>
    <div class="lg-item"><span class="lg-dot yellow"></span>&lt; 90 days<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='upcoming').length}</span></div>
    <div class="lg-item"><span class="lg-dot green"></span>Normal<span class="lg-count">${DOCUMENTS.length - Object.keys(CAL_EVENTS).length}</span></div>
  </div>`;
}

// ============================================================
// ISO 17025 VIEW (clause tree + tabs)
// ============================================================
function viewISO(){
  return `
  <div class="grid" style="grid-template-columns:260px 1fr; align-items:start;">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">ISO/IEC 17025:2017</div></div>
      <div class="clause-tree">
        ${CLAUSE_TREE.map(g=>`
          <div class="clause-group">
            <div class="clause-group-head" data-clausegroup="${g.id}"><span class="n">${g.id}</span>${g.title}</div>
            <div class="clause-children">
              ${g.children.map(c=>`<div class="clause-leaf ${c.id===state.selectedClause?'active':''}" data-clause="${c.id}">${c.id} ${c.title}</div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel" id="isoDetailPanel">
      ${isoDetailContent()}
    </div>
  </div>`;
}

function isoDetailContent(){
  const clause = state.selectedClause;
  const docs = DOCUMENTS.filter(d=>d.clause===clause);
  const recs = RECORDS.filter(r=>r.clause===clause);
  // "evidence" & "related" are illustrative, derived from doc/record set
  const evidence = docs.slice(0,4).map(d=>`Calibration/verification evidence — ${d.id}`);
  const related = CLAUSE_TREE.flatMap(g=>g.children).filter(c=>c.id!==clause).slice(0,3);

  const tabs = [
    {k:'documents', label:'Documents', n:docs.length},
    {k:'records', label:'Records', n:recs.length},
    {k:'evidence', label:'Evidence', n:evidence.length},
    {k:'related', label:'Related', n:related.length},
  ];

  return `
    <div class="panel-title" style="margin-bottom:14px;">${clauseTitle(clause)}</div>
    <div class="tabs">
      ${tabs.map(t=>`<button class="tab ${state.isoTab===t.k?'active':''}" data-isotab="${t.k}">${t.label}<span class="cnt">${t.n}</span></button>`).join('')}
    </div>
    <div id="isoTabBody">${isoTabBody(clause, docs, recs, evidence, related)}</div>
  `;
}

function isoTabBody(clause, docs, recs, evidence, related){
  if(state.isoTab==='documents'){
    if(!docs.length) return emptyState('ยังไม่มีเอกสารในข้อกำหนดนี้','No documents linked to this clause yet.');
    return `
    <div class="panel-head"><div></div><button class="panel-link" data-go="documents">View all documents</button></div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Document ID</th><th>Document Name</th><th>Type</th><th>Rev.</th><th>Status</th><th>Review Date</th></tr></thead>
      <tbody>
        ${docs.map(d=>`<tr data-open-doc="${d.id}">
          <td class="mono">› ${d.id}</td><td class="name">${d.name}</td><td>${d.type}</td><td>${d.rev}</td>
          <td>${badge(d.status)}</td><td>${fmtDate(d.reviewDate)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }
  if(state.isoTab==='records'){
    if(!recs.length) return emptyState('ยังไม่มีบันทึกในข้อกำหนดนี้','No records linked to this clause yet.');
    return `
    <div class="panel-head"><div></div><button class="panel-link" data-go="records">View all records</button></div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Record ID</th><th>Record Name</th><th>Date</th><th>Owner</th><th>File</th></tr></thead>
      <tbody>
        ${recs.map(r=>`<tr>
          <td class="mono">${r.id}</td><td class="name">${r.name}</td><td>${fmtDate(r.date)}</td><td>${r.owner}</td>
          <td>${ic('download','sm')}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }
  if(state.isoTab==='evidence'){
    if(!evidence.length) return emptyState('ยังไม่มีหลักฐานในข้อกำหนดนี้','No evidence linked to this clause yet.');
    return `<div style="display:flex; flex-direction:column; gap:2px;">
      ${evidence.map(e=>`<div class="audit-link"><span class="dot"></span>${e}</div>`).join('')}
    </div>`;
  }
  // related
  if(!related.length) return emptyState('ไม่มีข้อกำหนดที่เกี่ยวข้อง','No related clauses found.');
  return `<div style="display:flex; flex-direction:column; gap:2px;">
    ${related.map(r=>`<div class="audit-link" data-clause-jump="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('')}
  </div>`;
}

function emptyState(title, sub){
  return `<div class="empty-state">${ic('empty')}<h3>${title}</h3><p>${sub}</p></div>`;
}

function attachISOHandlers(){
  document.querySelectorAll('[data-clause]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clause;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      document.querySelectorAll('.clause-leaf').forEach(l=>l.classList.toggle('active', l.dataset.clause===state.selectedClause));
      attachISOTabHandlers();
      attachGlobalRowHandlers();
    });
  });
  attachISOTabHandlers();
}
function attachISOTabHandlers(){
  document.querySelectorAll('[data-isotab]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.isoTab = elx.dataset.isotab;
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers();
      attachGlobalRowHandlers();
    });
  });
  document.querySelectorAll('[data-clause-jump]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clauseJump;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers();
      attachGlobalRowHandlers();
    });
  });
}

// ============================================================
// DOCUMENTS LIST VIEW
// ============================================================
function filteredDocs(){
  return DOCUMENTS.filter(d=>{
    if(state.docFilter.clause!=='All' && d.clause!==state.docFilter.clause) return false;
    if(state.docFilter.type!=='All' && d.type!==state.docFilter.type) return false;
    if(state.docFilter.status!=='All' && d.status!==state.docFilter.status) return false;
    if(state.docFilter.q){
      const q = state.docFilter.q.toLowerCase();
      if(!d.id.toLowerCase().includes(q) && !d.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
function viewDocuments(){
  renderDocumentsInto();
  return `<div id="docListRoot"></div>`;
}
function renderDocumentsInto(){
  const el = document.getElementById('content');
  const list = filteredDocs();
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(list.length/pageSize));
  state.docPage = Math.min(state.docPage, pages);
  const start = (state.docPage-1)*pageSize;
  const pageItems = list.slice(start, start+pageSize);

  const clauseOpts = ['All', ...CLAUSE_TREE.flatMap(g=>g.children.map(c=>c.id))];
  const typeOpts = ['All', ...Array.from(new Set(DOCUMENTS.map(d=>d.type)))];
  const statusOpts = ['All','Active','Review','Overdue'];

  el.innerHTML = `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Document List</div>
      <button class="btn primary">${ic('doc')} New Document</button></div>
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="docSearch" placeholder="Search documents..." value="${state.docFilter.q}"></div>
      <select class="select" id="fClause">${clauseOpts.map(c=>`<option ${c===state.docFilter.clause?'selected':''}>${c}</option>`).join('')}</select>
      <select class="select" id="fType">${typeOpts.map(c=>`<option ${c===state.docFilter.type?'selected':''}>${c}</option>`).join('')}</select>
      <select class="select" id="fStatus">${statusOpts.map(c=>`<option ${c===state.docFilter.status?'selected':''}>${c}</option>`).join('')}</select>
      <div class="spacer"></div>
      <div style="font-size:12px; color:var(--ink-500); font-weight:600;">${list.length} entries</div>
    </div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Document ID</th><th>Document Name</th><th>ISO Clause</th><th>Type</th><th>Rev.</th><th>Status</th><th>Owner</th><th>Review Date</th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>`
        <tr data-open-doc="${d.id}">
          <td class="mono">${d.id}</td><td class="name">${d.name}</td><td>${d.clause}</td><td>${d.type}</td>
          <td>${d.rev}</td><td>${badge(d.status)}</td><td>${d.owner}</td><td>${fmtDate(d.reviewDate)}</td>
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
  </div>`;
}
function attachDocHandlers(){
  renderDocumentsInto();
  wireDocControls();
}
function wireDocControls(){
  const search = document.getElementById('docSearch');
  if(search) search.addEventListener('input', e=>{ state.docFilter.q = e.target.value; state.docPage=1; renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  const fc = document.getElementById('fClause');
  if(fc) fc.addEventListener('change', e=>{ state.docFilter.clause = e.target.value; state.docPage=1; renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  const ft = document.getElementById('fType');
  if(ft) ft.addEventListener('change', e=>{ state.docFilter.type = e.target.value; state.docPage=1; renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  const fs = document.getElementById('fStatus');
  if(fs) fs.addEventListener('change', e=>{ state.docFilter.status = e.target.value; state.docPage=1; renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  document.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click', ()=>{ state.docPage=parseInt(b.dataset.pg,10); renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); }));
  const prev = document.getElementById('pgPrev'); if(prev) prev.addEventListener('click', ()=>{ state.docPage=Math.max(1,state.docPage-1); renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  const next = document.getElementById('pgNext'); if(next) next.addEventListener('click', ()=>{ state.docPage=state.docPage+1; renderDocumentsInto(); wireDocControls(); attachGlobalRowHandlers(); });
  attachGlobalRowHandlers();
}

// ============================================================
// RECORDS VIEW
// ============================================================
function viewRecords(){
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Records</div><button class="btn primary">${ic('doc')} New Record</button></div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Record ID</th><th>Record Name</th><th>ISO Clause</th><th>Date</th><th>Owner</th><th>File</th></tr></thead>
      <tbody>
        ${RECORDS.map(r=>`<tr>
          <td class="mono">${r.id}</td><td class="name">${r.name}</td><td>${r.clause}</td><td>${fmtDate(r.date)}</td><td>${r.owner}</td>
          <td>${ic('download')}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

// ============================================================
// DOCUMENT DETAIL
// ============================================================
function viewDocDetail(docId){
  const d = DOCUMENTS.find(x=>x.id===docId) || DOCUMENTS[0];
  return `
  <div class="crumb" data-go="documents">‹ Back to Document List</div>
  <div class="panel">
    <div class="detail-head">
      <div class="doc-thumb">${ic('pdf')}<span>PDF</span></div>
      <div style="flex:1;">
        <div class="detail-title-row"><div class="detail-title">${d.id}</div>${badge(d.status)}</div>
        <div class="detail-sub">${d.name}</div>
        <div class="kv-row"><div class="k">Revision</div><div class="v">Rev.${d.rev}</div></div>
        <div class="kv-row"><div class="k">Effective Date</div><div class="v">${fmtDate(d.effDate)}</div></div>
        <div class="kv-row"><div class="k">Next Review</div><div class="v">${fmtDate(d.reviewDate)}</div></div>
        <div class="kv-row"><div class="k">Owner</div><div class="v">${d.owner}</div></div>
        <div class="detail-actions">
          <button class="btn primary">${ic('doc')} Open</button>
          <button class="btn ghost">${ic('download')} Download</button>
          <button class="btn ghost" data-go="revision">${ic('history')} Revision History</button>
        </div>
      </div>
      <div class="side-box" style="width:220px;">
        <div class="side-box-title">ISO/IEC 17025</div>
        <div class="clause-chip">${ic('check')}${clauseTitle(d.clause)}</div>
      </div>
    </div>

    <div class="tabs" style="margin-top:22px;">
      <button class="tab active">Overview</button>
      <button class="tab" data-go="revision">Revision History</button>
      <button class="tab" data-go="approval">Approval</button>
      <button class="tab">Related Records</button>
      <button class="tab" data-go="audittrail">Audit Trail</button>
    </div>
    <div class="desc-block">
      <b>ประเภทเอกสาร:</b> ${d.type}<br>
      <b>รหัสเอกสาร:</b> ${d.id}<br>
      <b>วันที่มีผลบังคับใช้:</b> ${fmtDate(d.effDate)}<br>
      <b>คำอธิบาย:</b> เอกสารฉบับนี้ใช้เพื่ออธิบายขั้นตอนการปฏิบัติงาน ${d.name} ให้สอดคล้องตามข้อกำหนด ${clauseTitle(d.clause)} ของมาตรฐาน ISO/IEC 17025:2017
    </div>
  </div>

  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Related Records</div></div>
      ${RECORDS.filter(r=>r.clause===d.clause).slice(0,4).map(r=>`
        <div class="rowline"><div class="file-ic">${ic('file')}</div>
          <div class="rl-main"><div class="rl-title">${r.id}</div><div class="rl-sub">${r.name}</div></div>
          <div class="rl-rev">${fmtDate(r.date)}</div>
        </div>`).join('') || '<div style="color:var(--ink-500); font-size:12.5px;">No related records.</div>'}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Latest Revision</div><button class="panel-link" data-go="revision">View full history</button></div>
      ${revisionsFor(d.id).slice(0,1).map(r=>`
        <div class="timeline"><div class="tl-item"><div class="tl-dot"></div>
          <div class="tl-head"><div class="tl-rev">Rev.${r.rev}</div><div class="tl-date">${fmtDate(r.date)}</div></div>
          <div class="tl-desc">${r.desc}</div><div class="tl-meta">${r.by}</div>
        </div></div>`).join('')}
    </div>
  </div>
  `;
}
function attachDetailHandlers(){ /* handled via data-go/global handlers */ }

// ============================================================
// REVISION HISTORY VIEW
// ============================================================
function viewRevision(){
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc) || DOCUMENTS[0];
  const revs = revisionsFor(d.id);
  return `
  <div class="crumb" data-go="docdetail">‹ Back</div>
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title">Revision History — ${d.id} ${d.name}</div>
      <select class="select" id="revDocPicker">
        ${DOCUMENTS.map(x=>`<option value="${x.id}" ${x.id===d.id?'selected':''}>${x.id}</option>`).join('')}
      </select>
    </div>
    <div class="timeline">
      ${revs.map((r,i)=>`
        <div class="tl-item ${i>0?'old':''}">
          <div class="tl-dot"></div>
          <div class="tl-head"><div class="tl-rev">Rev.${r.rev}</div><div class="tl-date">${fmtDate(r.date)}</div>${r.current?'<span class="badge active">Current</span>':''}</div>
          <div class="tl-desc">${r.desc}</div>
          <div class="tl-meta">${r.by}</div>
          <div class="tl-file">${ic('download')}${r.file}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

// ============================================================
// APPROVAL VIEW
// ============================================================
function viewApproval(){
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc) || DOCUMENTS[0];
  const a = approvalFor(d.id);
  const icons = { done:'check', pending:'clock', waiting:'clock' };
  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">${d.id} ${d.name}</div>
        <div style="font-size:12px; color:var(--ink-500); margin-top:3px; font-weight:600;">Revision : Rev.${a.rev}</div>
      </div>
      <select class="select" id="apDocPicker">
        ${DOCUMENTS.map(x=>`<option value="${x.id}" ${x.id===d.id?'selected':''}>${x.id}</option>`).join('')}
      </select>
    </div>

    <div class="approval-flow">
      ${a.steps.map((s,i)=>`
        ${i>0?`<div class="af-line ${a.steps[i-1].status==='done'?'done':''}"></div>`:''}
        <div class="af-step">
          <div class="af-circle ${s.status}">${ic(icons[s.status]||'clock')}</div>
          <div class="af-name">${s.name}</div>
          <div class="af-role">${s.role}</div>
          <div class="af-status ${s.status}">${s.status==='done'?(s.date?fmtDate(s.date):'Approved'):s.status==='pending'?'Pending':'Waiting'}</div>
        </div>`).join('')}
    </div>

    <div class="comment-box">
      <label style="font-size:12px; font-weight:700; color:var(--ink-700); display:block; margin-bottom:8px;">Comment</label>
      <textarea placeholder="Enter comment..."></textarea>
      <div class="comment-actions">
        <button class="btn danger">Reject</button>
        <button class="btn success">Approve</button>
      </div>
    </div>
  </div>`;
}

// ============================================================
// AUDIT VIEW (clause coverage — documents/records/evidence/related counts)
// ============================================================
function viewAudit(){
  const clause = state.selectedClause;
  const docs = DOCUMENTS.filter(d=>d.clause===clause);
  const recs = RECORDS.filter(r=>r.clause===clause);
  const evidence = docs.slice(0,5);
  const related = CLAUSE_TREE.flatMap(g=>g.children).filter(c=>c.id!==clause).slice(0,4);
  const allClauses = CLAUSE_TREE.flatMap(g=>g.children.map(c=>c.id));

  return `
  <div class="panel">
    <div class="clause-select-row">
      <div class="panel-title">Select Clause</div>
      <select class="select" id="auditClausePicker">
        ${allClauses.map(c=>`<option value="${c}" ${c===clause?'selected':''}>${clauseTitle(c)}</option>`).join('')}
      </select>
    </div>

    <div class="audit-stat-grid">
      <div class="audit-stat"><div class="num">${docs.length}</div><div class="lbl">Documents</div></div>
      <div class="audit-stat"><div class="num">${recs.length}</div><div class="lbl">Records</div></div>
      <div class="audit-stat"><div class="num">${evidence.length}</div><div class="lbl">Evidence</div></div>
      <div class="audit-stat"><div class="num">${related.length}</div><div class="lbl">Related</div></div>
    </div>

    <div class="audit-cols">
      <div>
        <div class="audit-col-title">Documents</div>
        ${docs.length ? docs.map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${d.name}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
      </div>
      <div>
        <div class="audit-col-title">Records</div>
        ${recs.length ? recs.map(r=>`<div class="audit-link"><span class="dot"></span>${r.id} ${r.name}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
      </div>
      <div>
        <div class="audit-col-title">Evidence</div>
        ${evidence.length ? evidence.map(d=>`<div class="audit-link"><span class="dot"></span>Calibration/verification — ${d.id}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
      </div>
      <div>
        <div class="audit-col-title">Related</div>
        ${related.map(r=>`<div class="audit-link" data-clause-jump-audit="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('')}
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
}

// ============================================================
// DOC PICKER (shared by revision/approval views)
// ============================================================
function attachDocPicker(view){
  const el = document.getElementById(view==='revision'?'revDocPicker':'apDocPicker');
  if(el) el.addEventListener('change', e=>{ state.selectedDoc = e.target.value; render(); });
}

// ============================================================
// REVIEW CALENDAR (full month view)
// ============================================================
function viewCalendar(){
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const year=2026, month=7;
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay()+6)%7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  let cells = '';
  for(let i=0;i<startOffset;i++){
    cells += `<div class="fc-cell dim">${prevDays-startOffset+1+i}</div>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const ev = CAL_EVENTS[d];
    cells += `<div class="fc-cell">${d}${ev?`<div class="fc-badges"><span class="fc-pill ${ev.type}">${ev.label}</span></div>`:''}</div>`;
  }
  const total = startOffset+daysInMonth;
  const trailing = (7-(total%7))%7;
  for(let i=1;i<=trailing;i++) cells += `<div class="fc-cell dim">${i}</div>`;

  return `
  <div class="grid" style="grid-template-columns:1fr 260px; align-items:start;">
    <div class="panel">
      <div class="full-cal-head">
        <div class="full-cal-title">August 2026</div>
        <div class="cal-nav"><button id="calPrev">‹</button><button id="calNext">›</button></div>
      </div>
      <div class="full-cal-grid">
        ${dows.map(d=>`<div class="fc-dow">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <div class="panel">
      <div class="panel-title" style="margin-bottom:14px;">Legend</div>
      <div class="cal-legend" style="margin-top:0; padding-top:0; border-top:none;">
        <div class="lg-item"><span class="lg-dot red"></span>Overdue<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='overdue').length}</span></div>
        <div class="lg-item"><span class="lg-dot amber"></span>&lt; 30 days<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='soon').length}</span></div>
        <div class="lg-item"><span class="lg-dot yellow"></span>&lt; 90 days<span class="lg-count">${Object.values(CAL_EVENTS).filter(e=>e.type==='upcoming').length}</span></div>
        <div class="lg-item"><span class="lg-dot green"></span>Normal<span class="lg-count">${DOCUMENTS.length - Object.keys(CAL_EVENTS).length}</span></div>
      </div>
      <div class="panel-title" style="margin:20px 0 10px;">Upcoming reviews</div>
      ${DOCUMENTS.filter(d=>d.status!=='Active').sort((a,b)=>new Date(a.reviewDate)-new Date(b.reviewDate)).slice(0,5).map(d=>`
        <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
          <div class="file-ic">${ic('file')}</div>
          <div class="rl-main"><div class="rl-title">${d.id}</div><div class="rl-sub">${fmtDate(d.reviewDate)}</div></div>
          ${badge(d.status)}
        </div>`).join('')}
    </div>
  </div>`;
}
function attachCalHandlers(){ /* month nav is illustrative (Aug 2026 fixed dataset) */
  const p = document.getElementById('calPrev'); const n = document.getElementById('calNext');
  if(p) p.addEventListener('click', ()=>{});
  if(n) n.addEventListener('click', ()=>{});
}

// ============================================================
// AUDIT TRAIL VIEW
// ============================================================
function viewAuditTrail(){
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Audit Trail</div></div>
    ${AUDIT_TRAIL.map(a=>`
      <div class="at-item">
        <div class="at-icon">${ic('history')}</div>
        <div class="at-main"><div class="at-title">${a.who}</div><div class="at-meta">${a.action}</div></div>
        <div class="at-time">${a.time}</div>
      </div>`).join('')}
  </div>`;
}

// ============================================================
// ADMINISTRATION (placeholder)
// ============================================================
function viewAdmin(){
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Administration</div></div>
    <div class="grid grid-3">
      <div class="side-box"><div class="side-box-title">Users & Roles</div><div style="font-size:12.5px; color:var(--ink-700);">Manage QA Officers, Analysts, and Lab Manager access levels.</div></div>
      <div class="side-box"><div class="side-box-title">SharePoint Sync</div><div style="font-size:12.5px; color:var(--ink-700);">Connected to mitrphol.sharepoint.com/sites/ServiceLab.</div></div>
      <div class="side-box"><div class="side-box-title">Clause Mapping Rules</div><div style="font-size:12.5px; color:var(--ink-700);">Auto-classification keywords per ISO clause.</div></div>
    </div>
  </div>`;
}

// ============================================================
// GLOBAL SEARCH (top bar)
// ============================================================
document.getElementById('globalSearch').addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    state.docFilter.q = e.target.value;
    state.docPage = 1;
    goTo('documents');
  }
});

// ============================================================
// INITIAL RENDER
// ============================================================
render();
