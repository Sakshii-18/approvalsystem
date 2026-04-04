// ===================== BASE URL =====================
const BASE_URL = "http://localhost:8081";

// ===================== LOAD TEACHER FROM LOCALSTORAGE =====================
const teacher = JSON.parse(localStorage.getItem("user"));
if (!teacher) { window.location.href = "SignIn.html"; }

// ===================== FILL TEACHER INFO =====================
function loadTeacherInfo() {
  const initials = teacher.name.split(" ").map(n => n[0]).join("").toUpperCase();

  document.getElementById("avatarBtn").textContent = initials;
  document.getElementById("bannerName").textContent = teacher.name;

  document.getElementById("settingsAvatar").textContent    = initials;
  document.getElementById("settingsName").textContent      = teacher.name;
  document.getElementById("settingsSub").textContent       = "Teacher · " + (teacher.className || "");
  document.getElementById("settingsClassChip").textContent = teacher.className || "";

  document.getElementById("profileName").value  = teacher.name;
  document.getElementById("profileEmail").value = teacher.email;
  document.getElementById("profileClass").value = teacher.className || "";
  document.getElementById("profileAvatarInitials").textContent = initials;
  document.getElementById("profileHeaderName").textContent     = teacher.name;
}

// ===================== LOAD ALL LEAVES FOR THIS TEACHER =====================
let allLeaves   = [];
let activeFilter  = "all";
let activeStudent = "all";

async function loadLeaves() {
  try {
    const res  = await fetch(`${BASE_URL}/leave/teacher/${teacher.id}`);
    allLeaves  = await res.json();
    buildStudentPills();
    renderApprovalTable();
    renderClassStats();
    renderStudentSnapshot();
    renderStudentHistory();
    updateBannerStats();
  } catch (err) {
    console.error("Failed to load leaves:", err);
    showToast("Could not load leave data", "error");
  }
}

// ===================== BANNER STATS =====================
function updateBannerStats() {
  const pending  = allLeaves.filter(l => l.status === "PENDING_TEACHER").length;
  const onLeave  = allLeaves.filter(l =>
    l.status === "APPROVED_BY_TEACHER" ||
    l.status === "APPROVED_BY_HOD" ||
    l.status === "APPROVED_BY_DIRECTOR"
  ).length;
  const approvedThisMonth = allLeaves.filter(l =>
    l.status === "APPROVED_BY_TEACHER" ||
    l.status === "APPROVED_BY_HOD" ||
    l.status === "APPROVED_BY_DIRECTOR"
  ).length;

  document.getElementById("bannerPending").textContent       = pending;
  document.getElementById("bannerOnLeave").textContent       = onLeave;
  document.getElementById("bannerApprovedMonth").textContent = approvedThisMonth;
}

// ===================== CLASS STAT CARDS =====================
function renderClassStats() {
  const total    = allLeaves.length;
  const rejected = allLeaves.filter(l => l.status === "REJECTED").length;
  const pending  = allLeaves.filter(l => l.status === "PENDING_TEACHER").length;

  const stats = [
    { icon:"📋", label:"Total Applications", val: total,    bg:"#eef0fd", color:"#4361ee", trend:"All time" },
    { icon:"⏳", label:"Pending Approvals",  val: pending,  bg:"#fef3c7", color:"#d97706", trend:"Needs your action" },
    { icon:"❌", label:"Rejected",           val: rejected, bg:"#fee2e2", color:"#dc2626", trend:"This semester" },
    { icon:"✅", label:"Approved",           val: allLeaves.filter(l => l.status.startsWith("APPROVED")).length, bg:"#d1fae5", color:"#059669", trend:"All stages" },
  ];

  const container = document.getElementById("classStats");
  container.innerHTML = "";
  stats.forEach(s => {
    const div = document.createElement("div");
    div.className = "stat-card";
    div.innerHTML = `
      <div class="stat-icon" style="background:${s.bg};color:${s.color};font-size:22px">${s.icon}</div>
      <div>
        <div class="stat-val" style="color:${s.color}">${s.val}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-trend">${s.trend}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ===================== APPROVAL TABLE =====================
function getStatusDisplay(status) {
  const map = {
    PENDING_TEACHER:      { label: "Pending",             cls: "badge-pending"  },
    PENDING_HOD:          { label: "Forwarded to HOD",    cls: "badge-pending"  },
    PENDING_DIRECTOR:     { label: "Forwarded to Dir",    cls: "badge-pending"  },
    APPROVED_BY_TEACHER:  { label: "Approved ✓",          cls: "badge-approved" },
    APPROVED_BY_HOD:      { label: "Approved by HOD ✓",   cls: "badge-approved" },
    APPROVED_BY_DIRECTOR: { label: "Approved by Dir ✓",   cls: "badge-approved" },
    REJECTED:             { label: "Rejected",            cls: "badge-rejected" },
    CANCELLED:            { label: "Cancelled",           cls: "badge-rejected" },
  };
  return map[status] || { label: status, cls: "badge-pending" };
}

function renderApprovalTable() {
  const tbody = document.getElementById("approvalTable");
  tbody.innerHTML = "";

  const filtered = activeFilter === "all"
    ? allLeaves
    : activeFilter === "Pending"
      ? allLeaves.filter(l => l.status === "PENDING_TEACHER")
      : activeFilter === "Approved"
        ? allLeaves.filter(l => l.status.startsWith("APPROVED"))
        : allLeaves.filter(l => l.status === "REJECTED" || l.status === "CANCELLED");

  const pending = allLeaves.filter(l => l.status === "PENDING_TEACHER").length;
  document.getElementById("pendingCount").textContent = `${pending} Pending`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">No records found</td></tr>`;
    return;
  }

  filtered.forEach(row => {
    const sd          = getStatusDisplay(row.status);
    const canAct      = row.status === "PENDING_TEACHER";
    const studentName = row.user ? row.user.name : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${studentName}</strong></td>
      <td><span class="type-badge">${row.reason || "—"}</span></td>
      <td style="font-weight:700;text-align:center">${row.days}</td>
      <td><span class="badge-status ${sd.cls}">${sd.label}</span></td>
      <td><button class="btn-view-app" onclick="viewApplication(${row.id})">👁 View</button></td>
      <td>${canAct ? `
        <div class="action-btns">
          <button class="action-btn btn-approve" onclick="handleApproval(${row.id},'approve')" title="Approve">✓</button>
          <button class="action-btn btn-reject"  onclick="handleApproval(${row.id},'reject')"  title="Reject">✕</button>
        </div>` : "—"}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterApproval(type, btn) {
  activeFilter = type;
  document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderApprovalTable();
}

// ===================== APPROVE / REJECT =====================
async function handleApproval(id, action) {
  try {
    const endpoint = action === "approve"
      ? `${BASE_URL}/leave/approve/${id}`
      : `${BASE_URL}/leave/reject/${id}`;

    const res = await fetch(endpoint, { method: "POST" });
    if (!res.ok) {
      showToast("Action failed. Try again.", "error");
      return;
    }

    showToast(action === "approve" ? "Leave approved!" : "Leave rejected!", action === "approve" ? "success" : "error");
    await loadLeaves();
    await loadNotifications(); // refresh bell after action

  } catch (err) {
    console.error(err);
    showToast("Server error. Try again.", "error");
  }
}

// ===================== VIEW APPLICATION MODAL =====================
let currentAppId = null;

function viewApplication(id) {
  const row = allLeaves.find(l => l.id === id);
  if (!row) return;
  currentAppId = id;

  document.getElementById("appStudentName").textContent = row.user ? row.user.name : "—";
  document.getElementById("appDays").textContent        = row.days + " day(s)";
  document.getElementById("appReason").textContent      = row.reason || "—";
  document.getElementById("appStatus").innerHTML        = `<span class="badge-status ${getStatusDisplay(row.status).cls}">${getStatusDisplay(row.status).label}</span>`;

  const canAct = row.status === "PENDING_TEACHER";
  document.getElementById("appApproveBtn").style.display = canAct ? "" : "none";
  document.getElementById("appRejectBtn").style.display  = canAct ? "" : "none";

  document.getElementById("appModal").classList.add("open");
}

function closeAppModal() {
  document.getElementById("appModal").classList.remove("open");
  currentAppId = null;
}

function approveFromModal() { if (currentAppId) { handleApproval(currentAppId, "approve"); closeAppModal(); } }
function rejectFromModal()  { if (currentAppId) { handleApproval(currentAppId, "reject");  closeAppModal(); } }

document.getElementById("appModal").addEventListener("click", e => {
  if (e.target === document.getElementById("appModal")) closeAppModal();
});

// ===================== STUDENT PILLS =====================
function buildStudentPills() {
  const wrap = document.getElementById("studentFilterWrap");
  const names = [...new Set(allLeaves.map(l => l.user ? l.user.name : null).filter(Boolean))];

  wrap.innerHTML = `
    <span style="font-size:12px;color:var(--muted);margin-right:2px">Filter:</span>
    <button class="student-pill ${activeStudent === 'all' ? 'active' : ''}" onclick="selectStudent('all',this)">All Students</button>
  `;

  names.forEach(name => {
    const btn = document.createElement("button");
    btn.className = `student-pill ${activeStudent === name ? "active" : ""}`;
    btn.textContent = name;
    btn.onclick = function() { selectStudent(name, this); };
    wrap.appendChild(btn);
  });
}

// ===================== STUDENT HISTORY =====================
function selectStudent(student, btn) {
  activeStudent = student;
  document.querySelectorAll(".student-pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  renderStudentSnapshot();
  renderStudentHistory();
}

function renderStudentSnapshot() {
  const data = activeStudent === "all"
    ? allLeaves
    : allLeaves.filter(l => l.user && l.user.name === activeStudent);

  const total     = data.length;
  const approved  = data.filter(l => l.status.startsWith("APPROVED")).length;
  const pending   = data.filter(l => l.status === "PENDING_TEACHER").length;
  const totalDays = data.reduce((s, l) => s + (l.days || 0), 0);

  const snaps = [
    { label:"Total Applications", val:total,     color:"#4361ee", bg:"#eef0fd", icon:"📋" },
    { label:"Approved",           val:approved,  color:"#059669", bg:"#d1fae5", icon:"✅" },
    { label:"Pending",            val:pending,   color:"#d97706", bg:"#fef3c7", icon:"⏳" },
    { label:"Total Leave Days",   val:totalDays, color:"#8b5cf6", bg:"#f3e8ff", icon:"📅" },
  ];

  const container = document.getElementById("studentSnapshot");
  container.innerHTML = "";
  snaps.forEach(s => {
    const div = document.createElement("div");
    div.className = "snapshot-card";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:18px">${s.icon}</span>
        <span style="font-size:11.5px;color:var(--muted);font-weight:600">${s.label}</span>
      </div>
      <div class="snapshot-val" style="color:${s.color}">${s.val}</div>
      <div class="snapshot-sub">${activeStudent === "all" ? "All Students" : activeStudent}</div>
    `;
    container.appendChild(div);
  });
}

function renderStudentHistory() {
  const tbody = document.getElementById("historyTable");
  const empty = document.getElementById("historyEmpty");

  const data = activeStudent === "all"
    ? allLeaves
    : allLeaves.filter(l => l.user && l.user.name === activeStudent);

  tbody.innerHTML = "";

  if (data.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  data.forEach(row => {
    const sd = getStatusDisplay(row.status);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${row.user ? row.user.name : "—"}</strong></td>
      <td><span class="reason-text" title="${row.reason}">${row.reason || "—"}</span></td>
      <td style="text-align:center;font-weight:700">${row.days}</td>
      <td><span class="badge-status ${sd.cls}">${sd.label}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===================== NOTIFICATIONS — REAL DB =====================
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function loadNotifications() {
  try {
    const res    = await fetch(`${BASE_URL}/notifications/user/${teacher.id}`);
    const notifs = await res.json();
    renderNotifDropdown(notifs);
  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
}

function renderNotifDropdown(notifs = []) {
  const list   = document.getElementById("notifList");
  const badge  = document.getElementById("notifBadge");

  const unreadCount   = notifs.filter(n => !n.read).length;
  badge.textContent   = unreadCount;
  badge.style.display = unreadCount > 0 ? "flex" : "none";

  if (notifs.length === 0) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">
      <div style="font-size:28px;margin-bottom:8px">🔕</div>No notifications yet</div>`;
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div style="display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--bg);${!n.read ? 'background:#f5f7ff;' : ''}">
      <div style="width:34px;height:34px;border-radius:10px;background:${n.iconBg || '#eef0ff'};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${n.icon || '🔔'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:${!n.read ? '600' : '400'};color:var(--text);line-height:1.4">${n.message}</div>
        ${n.subText ? `<div style="font-size:11.5px;color:var(--muted);margin-top:2px">${n.subText}</div>` : ''}
        <div style="font-size:11px;color:var(--muted);margin-top:4px">${timeAgo(n.createdAt)}</div>
      </div>
      ${!n.read ? '<div style="width:7px;height:7px;border-radius:50%;background:#4361ee;flex-shrink:0;margin-top:4px"></div>' : ''}
    </div>
  `).join("");
}

// Bell click — toggle dropdown & fetch
document.getElementById("notifBtn").addEventListener("click", async (e) => {
  e.stopPropagation();
  document.getElementById("notifDropdown").classList.toggle("open");
  await loadNotifications();
});

// Mark all read
document.getElementById("notifClearAll").addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    await fetch(`${BASE_URL}/notifications/mark-read/${teacher.id}`, { method: "PATCH" });
    await loadNotifications();
  } catch (err) {
    console.error("Mark read failed:", err);
  }
});

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  const dd = document.getElementById("notifDropdown");
  if (dd && !dd.contains(e.target) && e.target.id !== "notifBtn") {
    dd.classList.remove("open");
  }
});

// ===================== SETTINGS PANEL =====================
function toggleSettings() {
  const panel   = document.getElementById("settingsPanel");
  const overlay = document.getElementById("settingsOverlay");
  const isOpen  = panel.style.display !== "none";
  panel.style.display = isOpen ? "none" : "block";
  overlay.classList.toggle("open", !isOpen);
  if (!isOpen) showSubPanel("main");
}

function closeSettings(e) {
  if (e.target === document.getElementById("settingsOverlay")) toggleSettings();
}

function showSubPanel(name) {
  document.getElementById("settingsMain").style.display          = name === "main" ? "block" : "none";
  document.getElementById("settingsProfile").classList.toggle("active",       name === "profile");
  document.getElementById("settingsPassword").classList.toggle("active",      name === "password");
  document.getElementById("settingsNotifications").classList.toggle("active", name === "notifications");
  // Show forgot step 1 whenever password panel opens
  if (name === "password") showForgotStep(1);
}

// ===================== DARK MODE =====================
function toggleDarkMode(cb) {
  if (cb.checked) {
    document.documentElement.style.setProperty("--bg",           "#0f1117");
    document.documentElement.style.setProperty("--surface",      "#1a1f2e");
    document.documentElement.style.setProperty("--text",         "#e2e8f0");
    document.documentElement.style.setProperty("--muted",        "#94a3b8");
    document.documentElement.style.setProperty("--border",       "#2d3348");
    document.documentElement.style.setProperty("--primary-light","#1e2a4a");
    document.body.style.background = "#0f1117";
    showToast("Dark mode enabled", "info");
  } else {
    document.documentElement.style.setProperty("--bg",           "#f0f2f8");
    document.documentElement.style.setProperty("--surface",      "#ffffff");
    document.documentElement.style.setProperty("--text",         "#1a1f36");
    document.documentElement.style.setProperty("--muted",        "#6b7280");
    document.documentElement.style.setProperty("--border",       "#e5e8f0");
    document.documentElement.style.setProperty("--primary-light","#eef0fd");
    document.body.style.background = "#f0f2f8";
    showToast("Light mode enabled", "info");
  }
}

// ===================== LOGOUT =====================
function logout() {
  localStorage.removeItem("user");
  showToast("Logged out successfully", "info");
  setTimeout(() => window.location.href = "SignIn.html", 1200);
}

// ===================== TABS =====================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ===================== SIDEBAR =====================
document.querySelectorAll(".sidebar-icon").forEach(icon => {
  icon.addEventListener("click", () => {
    if (icon.title === "Settings") { toggleSettings(); return; }
    document.querySelectorAll(".sidebar-icon").forEach(i => i.classList.remove("active"));
    icon.classList.add("active");
  });
});

// ===================== TOAST =====================
let toastTimeout;
function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===================== PASSWORD EYE TOGGLE =====================
function toggleEye(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type    = "text";
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  } else {
    input.type    = "password";
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

// ===================== SAVE PHONE =====================
function savePhone() {
  const val = document.getElementById("phoneInput").value.trim();
  if (!val) { showToast("Please enter a phone number", "error"); return; }
  showToast("Phone number saved!", "success");
}

// ===================== CHANGE PASSWORD =====================
async function changePassword() {
  const cur = document.getElementById("currentPwd").value;
  const nw  = document.getElementById("newPwd").value;
  const cnf = document.getElementById("confirmPwd").value;

  if (!cur || !nw || !cnf) { showToast("Please fill all fields", "error"); return; }
  if (nw !== cnf)           { showToast("New passwords do not match", "error"); return; }
  if (nw.length < 8)        { showToast("Min 8 characters required", "error"); return; }

  try {
    const res = await fetch(`${BASE_URL}/users/${teacher.id}/password`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: cur, newPassword: nw })
    });
    if (!res.ok) { showToast(await res.text(), "error"); return; }

    document.getElementById("currentPwd").value = "";
    document.getElementById("newPwd").value      = "";
    document.getElementById("confirmPwd").value  = "";
    showToast("Password updated successfully!", "success");
    showSubPanel("main");
  } catch (err) {
    showToast("Server error. Try again.", "error");
  }
}

// ===================== FORGOT PASSWORD (OTP FLOW) =====================
let fpEmail = "";

function showForgotStep(step) {
  ["fpStep1","fpStep2","fpStep3","fpStep4"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById("fpStep" + step);
  if (target) target.style.display = "block";
}

async function sendFpOtp() {
  const email = document.getElementById("fpEmail").value.trim();
  if (!email) { showToast("Please enter your email", "error"); return; }
  fpEmail = email;
  try {
    const res = await fetch(`${BASE_URL}/users/forgot-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email })
    });
    if (!res.ok) { showToast(await res.text(), "error"); return; }
    showToast("OTP sent to your email!", "success");
    showForgotStep(3);
  } catch (err) {
    showToast("Server error. Try again.", "error");
  }
}

async function verifyFpOtp() {
  const otp = document.getElementById("fpOtp").value.trim();
  if (!otp) { showToast("Please enter the OTP", "error"); return; }
  try {
    const res = await fetch(`${BASE_URL}/users/verify-otp`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: fpEmail, otp })
    });
    if (!res.ok) { showToast(await res.text(), "error"); return; }
    showToast("OTP verified!", "success");
    showForgotStep(4);
  } catch (err) {
    showToast("Server error. Try again.", "error");
  }
}

async function resetFpPassword() {
  const newPwd = document.getElementById("fpNewPwd").value.trim();
  const cnfPwd = document.getElementById("fpCnfPwd").value.trim();
  if (!newPwd || !cnfPwd) { showToast("Please fill both fields", "error"); return; }
  if (newPwd !== cnfPwd)  { showToast("Passwords do not match", "error"); return; }
  if (newPwd.length < 8)  { showToast("Min 8 characters required", "error"); return; }
  try {
    const res = await fetch(`${BASE_URL}/users/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: fpEmail, newPassword: newPwd })
    });
    if (!res.ok) { showToast(await res.text(), "error"); return; }
    showToast("Password reset successfully!", "success");
    showForgotStep(1);
    showSubPanel("main");
  } catch (err) {
    showToast("Server error. Try again.", "error");
  }
}

// ===================== INIT =====================
loadTeacherInfo();
loadLeaves();
loadNotifications();