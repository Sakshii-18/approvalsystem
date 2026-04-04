const API = 'http://localhost:8081';

// ===================== HOD USER FROM localStorage =====================
const hodUser = JSON.parse(localStorage.getItem('user') || '{}');
if (!hodUser || !hodUser.id) { window.location.href = 'SignIn.html'; }

// Fill HOD name everywhere
document.querySelectorAll('.banner-name, .settings-user-name').forEach(el => {
  el.textContent = hodUser.name || 'HOD';
});
document.querySelectorAll('.settings-user-avatar').forEach(el => {
  el.textContent = (hodUser.name || 'H').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
});
document.querySelectorAll('.settings-user-sub').forEach(el => {
  el.textContent = `HOD · ${hodUser.className || 'Department'}`;
});

// ===================== STATE =====================
let approvalData  = [];   // PENDING_HOD leaves only
let allLeavesData = [];   // all leaves with days > 3 for history
let activeFilter  = 'all';
let activeClass   = 'all';
let currentAppId  = null;

// ===================== FETCH ALL LEAVES FROM BACKEND =====================
async function loadAllData() {
  try {
    const res = await fetch(`${API}/leave`);
    if (!res.ok) throw new Error('Server error');
    const all = await res.json();

    // HOD sees only leaves with status PENDING_HOD
    approvalData  = all.filter(l => l.status === 'PENDING_HOD').map(mapLeave);

    // History = all leaves that have passed teacher level (days > 3)
    allLeavesData = all.filter(l => l.days > 3).map(mapLeave);

    renderBannerStats(all);
    renderDeptStats(all);
    renderApprovalTable();
    renderClassSnapshot();
    renderClassHistory();
    updateNotifBadge();
  } catch (err) {
    showToast('Failed to load data from server', 'error');
    console.error(err);
  }
}

// ===================== MAP BACKEND LEAVE TO DASHBOARD ROW =====================
function mapLeave(l) {
  return {
    id:         l.id,
    name:       l.user?.name      || '—',
    cls:        l.user?.className || '—',
    reason:     l.reason          || '—',
    days:       l.days,
    status:     mapStatus(l.status),
    rawStatus:  l.status,
    approvedBy: l.teacher?.name   || '—',   // ← FIXED: use teacher name not teacherId
  };
}

function mapStatus(s) {
  const map = {
    PENDING_TEACHER:      'Forwarded by Student',
    PENDING_HOD:          'Pending',
    PENDING_DIRECTOR:     'Forwarded to Director',
    APPROVED_BY_TEACHER:  'Approved by Teacher',
    APPROVED_BY_HOD:      'Approved by HOD',
    APPROVED_BY_DIRECTOR: 'Approved by Director',
    REJECTED:             'Rejected',
    CANCELLED:            'Cancelled',
  };
  return map[s] || s;
}

// ===================== BANNER STATS =====================
function renderBannerStats(all) {
  const pending  = all.filter(l => l.status === 'PENDING_HOD').length;
  const approved = all.filter(l => l.status === 'APPROVED_BY_HOD' || l.status === 'APPROVED_BY_DIRECTOR').length;
  const total    = all.filter(l => l.days > 3).length;

  const bannerPending  = document.getElementById('bannerPending');
  const bannerApproved = document.getElementById('bannerApproved');
  const bannerTotal    = document.getElementById('bannerTotal');

  if (bannerPending)  bannerPending.textContent  = pending;
  if (bannerApproved) bannerApproved.textContent = approved;
  if (bannerTotal)    bannerTotal.textContent    = total;
}

// ===================== DEPT STATS =====================
function renderDeptStats(all) {
  const container = document.getElementById('classStats');
  if (!container) return;

  const total    = all.length;
  const pending  = all.filter(l => l.status === 'PENDING_HOD').length;
  const approved = all.filter(l => l.status.startsWith('APPROVED')).length;
  const rejected = all.filter(l => l.status === 'REJECTED').length;

  const stats = [
    { icon:'📋', label:'Total Applications',  val: total,    bg:'#eef0fd', color:'#4361ee' },
    { icon:'⏳', label:'Pending (HOD)',        val: pending,  bg:'#fef3c7', color:'#d97706' },
    { icon:'✅', label:'Approved',            val: approved, bg:'#d1fae5', color:'#059669' },
    { icon:'❌', label:'Rejected',            val: rejected, bg:'#fee2e2', color:'#dc2626' },
  ];

  container.innerHTML = '';
  stats.forEach(s => {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML = `
      <div class="stat-icon" style="background:${s.bg};color:${s.color};font-size:22px">${s.icon}</div>
      <div>
        <div class="stat-val" style="color:${s.color}">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===================== APPROVAL TABLE =====================
function renderApprovalTable() {
  const tbody = document.getElementById('approvalTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  // ← FIXED: filter by status not by cls
  const filtered = activeFilter === 'all'
    ? approvalData
    : activeFilter === 'Pending'
      ? approvalData.filter(r => r.rawStatus === 'PENDING_HOD')
      : activeFilter === 'Approved'
        ? approvalData.filter(r => r.rawStatus.startsWith('APPROVED'))
        : approvalData.filter(r => r.rawStatus === 'REJECTED' || r.rawStatus === 'CANCELLED');

  const pending = approvalData.filter(r => r.rawStatus === 'PENDING_HOD').length;
  const pendingCountEl = document.getElementById('pendingCount');
  const bannerPendingEl = document.getElementById('bannerPending');
  if (pendingCountEl)  pendingCountEl.textContent  = `${pending} Pending`;
  if (bannerPendingEl) bannerPendingEl.textContent = pending;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--muted)">🎉 No leave requests found</td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const tr = document.createElement('tr');
    const statusClass = row.rawStatus === 'PENDING_HOD'       ? 'badge-pending'
                      : row.rawStatus.startsWith('APPROVED')  ? 'badge-approved'
                      : row.rawStatus === 'REJECTED'           ? 'badge-rejected'
                      : 'badge-pending';

    const showActions = row.rawStatus === 'PENDING_HOD';

    tr.innerHTML = `
      <td><strong>${row.name}</strong></td>
      <td><span class="class-badge">${row.cls}</span></td>
      <td>${row.reason}</td>
      <td style="text-align:center;font-weight:700">${row.days}</td>
      <td>
        <div class="teacher-ref">
          <span class="teacher-ref-dot"></span>
          <span>${row.approvedBy}</span>
        </div>
      </td>
      <td><span class="badge-status ${statusClass}">${row.status}</span></td>
      <td>
        <button class="btn-view-app" onclick="viewApplication(${row.id})" title="View">👁 View</button>
      </td>
      <td>
        ${showActions ? `
        <div class="action-btns">
          <button class="action-btn btn-approve" onclick="handleApproval(${row.id},'Approved')" title="Approve">✓</button>
          <button class="action-btn btn-reject"  onclick="handleApproval(${row.id},'Rejected')" title="Reject">✕</button>
        </div>` : '—'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===================== FILTER APPROVAL TABLE =====================
function filterApproval(type, btn) {
  activeFilter = type;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderApprovalTable();
}

// ===================== APPROVE / REJECT =====================
async function handleApproval(id, status) {
  const endpoint = status === 'Approved'
    ? `${API}/leave/approve/${id}`
    : `${API}/leave/reject/${id}`;

  try {
    const res = await fetch(endpoint, { method: 'POST' });
    if (!res.ok) throw new Error('Server error');
    showToast(`Leave ${status.toLowerCase()} successfully!`, status === 'Approved' ? 'success' : 'error');
    await loadAllData(); // reload fresh data
  } catch (err) {
    showToast('Action failed — check server connection', 'error');
    console.error(err);
  }
}

// ===================== VIEW APPLICATION MODAL =====================
function viewApplication(id) {
  const row = approvalData.find(r => r.id === id) || allLeavesData.find(r => r.id === id);
  if (!row) return;
  currentAppId = id;

  const nameEl   = document.getElementById('appStudentName');
  const daysEl   = document.getElementById('appDays');
  const reasonEl = document.getElementById('appReason');
  const statusEl = document.getElementById('appStatus');
  const approveBtn = document.getElementById('appApproveBtn');
  const rejectBtn  = document.getElementById('appRejectBtn');

  if (nameEl)   nameEl.textContent   = row.name;
  if (daysEl)   daysEl.textContent   = row.days + ' day(s)';
  if (reasonEl) reasonEl.textContent = row.reason;

  const statusClass = row.rawStatus === 'PENDING_HOD' ? 'badge-pending'
    : row.rawStatus.startsWith('APPROVED') ? 'badge-approved' : 'badge-rejected';
  if (statusEl) statusEl.innerHTML = `<span class="badge-status ${statusClass}">${row.status}</span>`;

  const showActions = row.rawStatus === 'PENDING_HOD';
  if (approveBtn) approveBtn.style.display = showActions ? '' : 'none';
  if (rejectBtn)  rejectBtn.style.display  = showActions ? '' : 'none';

  document.getElementById('appModal').classList.add('open');
}

function closeAppModal() {
  document.getElementById('appModal').classList.remove('open');
  currentAppId = null;
}

function approveFromModal() { if (currentAppId) { handleApproval(currentAppId, 'Approved'); closeAppModal(); } }
function rejectFromModal()  { if (currentAppId) { handleApproval(currentAppId, 'Rejected'); closeAppModal(); } }

document.getElementById('appModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('appModal')) closeAppModal();
});

// ===================== CLASS SNAPSHOT =====================
function renderClassSnapshot() {
  const container = document.getElementById('classSnapshot');
  if (!container) return;

  const data = activeClass === 'all' ? allLeavesData
    : allLeavesData.filter(r => r.cls === activeClass);

  const total    = data.length;
  const approved = data.filter(r => r.rawStatus.startsWith('APPROVED')).length;
  const pending  = data.filter(r => r.rawStatus === 'PENDING_HOD').length;
  const totalDays = data.reduce((s, r) => s + (r.days || 0), 0);

  const snaps = [
    { label:'Total Applications', val:total,     color:'#4361ee', bg:'#eef0fd', icon:'📋' },
    { label:'Approved',           val:approved,  color:'#059669', bg:'#d1fae5', icon:'✅' },
    { label:'Pending HOD',        val:pending,   color:'#d97706', bg:'#fef3c7', icon:'⏳' },
    { label:'Total Leave Days',   val:totalDays, color:'#8b5cf6', bg:'#f3e8ff', icon:'📅' },
  ];

  container.innerHTML = '';
  snaps.forEach(s => {
    const div = document.createElement('div');
    div.className = 'snapshot-card';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:18px">${s.icon}</span>
        <span style="font-size:11.5px;color:var(--muted);font-weight:600">${s.label}</span>
      </div>
      <div style="font-size:26px;font-weight:800;color:${s.color}">${s.val}</div>
    `;
    container.appendChild(div);
  });
}

// ===================== CLASS HISTORY =====================
function renderClassHistory() {
  const tbody = document.getElementById('historyTable');
  const empty = document.getElementById('historyEmpty');
  if (!tbody) return;

  const data = activeClass === 'all' ? allLeavesData
    : allLeavesData.filter(r => r.cls === activeClass);

  tbody.innerHTML = '';
  if (data.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  data.forEach(row => {
    const statusClass = row.rawStatus === 'PENDING_HOD'       ? 'badge-pending'
                      : row.rawStatus.startsWith('APPROVED')  ? 'badge-approved'
                      : row.rawStatus === 'REJECTED'           ? 'badge-rejected'
                      : 'badge-pending';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.name}</strong></td>
      <td><span class="class-badge">${row.cls}</span></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.reason}</td>
      <td style="text-align:center;font-weight:700">${row.days}</td>
      <td><span class="badge-status ${statusClass}">${row.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===================== NOTIFICATION BADGE =====================
function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (badge) badge.textContent = approvalData.filter(r => r.rawStatus === 'PENDING_HOD').length;
}

// ===================== SETTINGS =====================
function toggleSettings() {
  const panel   = document.getElementById('settingsPanel');
  const overlay = document.getElementById('settingsOverlay');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (overlay) overlay.classList.toggle('open', !isOpen);
  if (!isOpen) showSubPanel('main');
}

function closeSettings(e) {
  if (e.target === document.getElementById('settingsOverlay')) toggleSettings();
}

function showSubPanel(name) {
  const main  = document.getElementById('settingsMain');
  const prof  = document.getElementById('settingsProfile');
  const pass  = document.getElementById('settingsPassword');
  const notif = document.getElementById('settingsNotifications');
  if (main)  main.style.display  = name === 'main' ? 'block' : 'none';
  if (prof)  prof.classList.toggle('active',  name === 'profile');
  if (pass)  pass.classList.toggle('active',  name === 'password');
  if (notif) notif.classList.toggle('active', name === 'notifications');
}

// ===================== CHANGE PASSWORD =====================
async function changePassword() {
  const cur = document.getElementById('currentPwd')?.value;
  const nw  = document.getElementById('newPwd')?.value;
  const cnf = document.getElementById('confirmPwd')?.value;

  if (!cur || !nw || !cnf) { showToast('Please fill all fields', 'error'); return; }
  if (nw !== cnf)           { showToast('Passwords do not match', 'error'); return; }
  if (nw.length < 8)        { showToast('Min 8 characters required', 'error'); return; }

  try {
    const res = await fetch(`${API}/users/${hodUser.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: cur, newPassword: nw })
    });
    if (!res.ok) { showToast(await res.text(), 'error'); return; }
    showToast('Password updated successfully!', 'success');
    showSubPanel('main');
  } catch (err) {
    showToast('Server error. Try again.', 'error');
  }
}

// ===================== DARK MODE =====================
function toggleDarkMode(cb) {
  if (cb.checked) {
    document.documentElement.style.setProperty('--bg', '#0f1117');
    document.documentElement.style.setProperty('--surface', '#1a1f2e');
    document.documentElement.style.setProperty('--text', '#e2e8f0');
    document.documentElement.style.setProperty('--border', '#2d3348');
    showToast('Dark mode enabled', 'info');
  } else {
    document.documentElement.style.setProperty('--bg', '#f0f2f8');
    document.documentElement.style.setProperty('--surface', '#ffffff');
    document.documentElement.style.setProperty('--text', '#1a1f36');
    document.documentElement.style.setProperty('--border', '#e5e8f0');
    showToast('Light mode enabled', 'info');
  }
}

// ===================== LOGOUT =====================
function logout() {
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'SignIn.html', 1200);
}

// ===================== SIDEBAR =====================
document.querySelectorAll('.sidebar-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    if (icon.title === 'Settings') { toggleSettings(); return; }
    document.querySelectorAll('.sidebar-icon').forEach(i => i.classList.remove('active'));
    icon.classList.add('active');
  });
});

// ===================== TOAST =====================
let toastTimeout;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===================== PROFILE FILL =====================
document.getElementById('profileName') && (document.getElementById('profileName').value  = hodUser.name  || '');
document.getElementById('profileEmail') && (document.getElementById('profileEmail').value = hodUser.email || '');

// ===================== INIT =====================
loadAllData();