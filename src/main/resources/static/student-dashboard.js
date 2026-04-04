// ===================== LOAD USER FROM DB =====================
const BASE_URL = "http://localhost:8081";

const user = JSON.parse(localStorage.getItem("user"));
if (!user) { window.location.href = "SignIn.html"; }

function loadUserInfo() {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase();

  document.querySelector(".avatar-name").innerText = user.name;
  document.querySelector(".avatar-role").innerText = (user.className || "") + " · PRN: " + (user.prn || "");
  document.querySelector(".avatar").innerText = initials;
  document.querySelector(".welcome-name").innerText = user.name;

  document.querySelector(".settings-avatar").innerText = initials;
  document.querySelector(".settings-profile-name").innerText = user.name;
  document.querySelector(".settings-profile-roll").innerText = "PRN: " + (user.prn || "");
  document.getElementById("settingsClassChip").innerText = user.className || "";

  document.getElementById("profileName").value  = user.name;
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profilePrn").value   = user.prn || "";
  document.getElementById("profileClass").value = user.className || "";
  document.getElementById("profileAvatarInitials").innerText = initials;
  document.getElementById("profileHeaderName").innerText     = user.name;
}

// ===================== FETCH LEAVE DATA FROM DB =====================
let myLeaves = [];

async function loadLeaveHistory() {
  try {
    const res = await fetch(`${BASE_URL}/leave/user/${user.id}`);
    myLeaves = await res.json();
    renderLeaveTable();
    updateWelcomeStat();
  } catch (err) {
    console.error("Failed to load leave history:", err);
    showToast("Could not load leave history", "error", "⚠️");
  }
}

// ===================== LEAVE GRID =====================
const leaveBalance = [
  { key: "sick",   label: "Sick Leave",     icon: "🤒", remaining: 10, total: 10, cls: "lc-sick sick",     badge: "good", badgeText: "Available"    },
  { key: "casual", label: "Casual Leave",   icon: "🌿", remaining: 10, total: 10, cls: "lc-casual casual", badge: "good", badgeText: "Available"    },
  { key: "learn",  label: "Learning Leave", icon: "📚", remaining: 5,  total: 5,  cls: "lc-learn learn",   badge: "good", badgeText: "Full Balance" },
  { key: "annual", label: "Annual Leave",   icon: "🏖️", remaining: 15, total: 15, cls: "lc-annual annual", badge: "good", badgeText: "Available"    },
];

function renderLeaveGrid() {
  const grid = document.getElementById("leaveGrid");
  grid.innerHTML = "";
  leaveBalance.forEach((lt) => {
    const pct  = lt.remaining / lt.total;
    const card = document.createElement("div");
    card.className = `leave-card ${lt.cls.split(" ")[0]}`;
    card.innerHTML = `
      <div class="leave-card-top">
        <div class="leave-card-icon ${lt.cls.split(" ")[0]}">${lt.icon}</div>
        <span class="leave-card-badge ${lt.badge}">${lt.badgeText}</span>
      </div>
      <div>
        <div class="leave-card-remaining" style="color:${getLeaveColor(lt.key)}">${lt.remaining}</div>
        <div class="leave-card-label">${lt.label}</div>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar" style="width:${pct * 100}%;background:${getLeaveColor(lt.key)}"></div>
      </div>
      <div class="leave-card-footer">
        <span>${lt.remaining} remaining</span>
        <span>${lt.total} total</span>
      </div>
    `;
    card.addEventListener("click", () => {
      document.getElementById("applyLeaveBtn").click();
      setTimeout(() => selectLeaveType(lt.key), 100);
    });
    grid.appendChild(card);
  });
  const total = leaveBalance.reduce((s, l) => s + l.remaining, 0);
  document.getElementById("totalRemainingDays").textContent = total;
}

function getLeaveColor(key) {
  return { sick: "#f59e0b", casual: "#22c55e", learn: "#5b6af5", annual: "#a855f7" }[key];
}

function updateWelcomeStat() {
  const totalDays = myLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
  document.getElementById("totalRemainingDays").textContent = totalDays;
  document.querySelector(".welcome-stat-label").textContent = "Total leave days used";
}

// ===================== LEAVE TABLE =====================
function renderLeaveTable(filter = "all") {
  const tbody = document.getElementById("myLeaveTable");
  const empty = document.getElementById("emptyState");

  const filtered = filter === "all"
    ? myLeaves
    : myLeaves.filter((l) => l.status && l.status.includes(filter.toUpperCase()));

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    filtered.forEach((row) => {
      const tr            = document.createElement("tr");
      const statusDisplay = getStatusDisplay(row.status);
      const canCancel     = row.status === "PENDING_TEACHER";
      tr.innerHTML = `
        <td style="font-size:12px;color:var(--muted)">#${String(row.id).padStart(3, "0")}</td>
        <td>${row.reason || "—"}</td>
        <td style="font-weight:700;text-align:center">${row.days}</td>
        <td><span class="status-chip ${statusDisplay.cls}">${statusDisplay.label}</span></td>
        <td>${canCancel ? `<button class="cancel-btn" onclick="cancelLeave(${row.id})">Cancel</button>` : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function getStatusDisplay(status) {
  const map = {
    PENDING_TEACHER:      { label: "Pending (Teacher)",      cls: "status-pending"  },
    PENDING_HOD:          { label: "Pending (HOD)",          cls: "status-pending"  },
    APPROVED_BY_TEACHER:  { label: "Approved ✓",             cls: "status-approved" },
    APPROVED_BY_HOD:      { label: "Approved by HOD ✓",      cls: "status-approved" },
    APPROVED_BY_DIRECTOR: { label: "Approved by Director ✓", cls: "status-approved" },
    REJECTED:             { label: "Rejected",               cls: "status-rejected" },
    CANCELLED:            { label: "Cancelled",              cls: "status-rejected" },
  };
  return map[status] || { label: status, cls: "status-pending" };
}

async function cancelLeave(id) {
  try {
    const res = await fetch(`${BASE_URL}/leave/cancel/${id}`, { method: "PATCH" });
    if (!res.ok) {
      showToast((await res.text()) || "Could not cancel leave", "error", "⚠️");
      return;
    }
    const updated = await res.json();
    const index   = myLeaves.findIndex(l => l.id === id);
    if (index !== -1) myLeaves[index] = updated;
    renderLeaveTable(document.getElementById("filterStatus").value);
    showToast("Leave cancelled successfully", "warning", "↩️");
    await loadNotifications();
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
}

// ===================== LOAD TEACHERS =====================
async function loadTeachers() {
  try {
    const res      = await fetch(`${BASE_URL}/users/teachers`);
    const teachers = await res.json();
    const select   = document.getElementById("teacherSelect");
    select.innerHTML = `<option value="">Select Teacher</option>`;
    teachers.forEach(t => {
      select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  } catch (err) {
    showToast("Could not load teachers", "error", "⚠️");
  }
}

// ===================== APPLY LEAVE =====================
let selectedLeaveType = "sick";

function renderLeaveTypeGrid() {
  const grid = document.getElementById("leaveTypeGrid");
  grid.innerHTML = "";
  leaveBalance.forEach((lt) => {
    const opt = document.createElement("div");
    opt.className   = `leave-type-option ${lt.key === selectedLeaveType ? "selected" : ""}`;
    opt.dataset.key = lt.key;
    opt.innerHTML   = `
      <span class="lto-icon">${lt.icon}</span>
      <div>
        <div>${lt.label}</div>
        <div class="lto-bal">${lt.remaining} days left</div>
      </div>
    `;
    opt.addEventListener("click", () => selectLeaveType(lt.key));
    grid.appendChild(opt);
  });
}

function selectLeaveType(key) {
  selectedLeaveType = key;
  document.querySelectorAll(".leave-type-option").forEach((o) => {
    o.classList.toggle("selected", o.dataset.key === key);
  });
}

const modal = document.getElementById("leaveModal");

document.getElementById("applyLeaveBtn").addEventListener("click", () => {
  selectedLeaveType = "sick";
  renderLeaveTypeGrid();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("startDate").value       = today;
  document.getElementById("endDate").value         = today;
  document.getElementById("reason").value          = "";
  document.getElementById("charCount").textContent = "0";
  document.getElementById("teacherSelect").value   = "";
  modal.classList.add("open");
});

document.getElementById("reason").addEventListener("input", function () {
  document.getElementById("charCount").textContent = this.value.length;
});

document.getElementById("closeModal").addEventListener("click",  () => modal.classList.remove("open"));
document.getElementById("cancelLeave").addEventListener("click", () => modal.classList.remove("open"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

document.getElementById("submitLeave").addEventListener("click", async () => {
  const start     = document.getElementById("startDate").value;
  const end       = document.getElementById("endDate").value;
  const reason    = document.getElementById("reason").value.trim();
  const teacherId = document.getElementById("teacherSelect").value;

  if (!start || !end)                  { showToast("Please select dates", "error", "⚠️"); return; }
  if (new Date(end) < new Date(start)) { showToast("End date must be after start date", "error", "⚠️"); return; }
  if (!reason)                         { showToast("Please provide a reason", "error", "⚠️"); return; }
  if (!teacherId)                      { showToast("Please select a teacher", "error", "⚠️"); return; }

  const days = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;

  const leaveData = {
    reason,
    days,
    teacher: { id: parseInt(teacherId) },
    user:    { id: user.id },
  };

  try {
    const res = await fetch(`${BASE_URL}/leave`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(leaveData),
    });
    if (!res.ok) {
      showToast((await res.text()) || "Failed to apply leave", "error", "⚠️");
      return;
    }
    const saved = await res.json();
    myLeaves.unshift(saved);
    renderLeaveTable(document.getElementById("filterStatus").value);
    modal.classList.remove("open");
    showToast(`Leave applied for ${days} day${days > 1 ? "s" : ""}!`, "success", "✅");
    await loadNotifications(); // refresh bell
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
});

// ===================== FILTER =====================
document.getElementById("filterStatus").addEventListener("change", (e) =>
  renderLeaveTable(e.target.value)
);

// ===================== MINI CALENDAR =====================
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

function renderCalendar() {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  document.getElementById("calMonthTitle").textContent = `${months[calMonth]} ${calYear}`;
  const grid = document.getElementById("miniCal");
  grid.innerHTML = "";

  ["S","M","T","W","T","F","S"].forEach((d) => {
    const h = document.createElement("div");
    h.className   = "cal-day-header";
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement("div");
    e.className = "cal-day empty";
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell     = document.createElement("div");
    cell.className = "cal-day";
    const isToday  =
      today.getFullYear() === calYear &&
      today.getMonth()    === calMonth &&
      today.getDate()     === d;
    if (isToday) cell.classList.add("today");
    cell.textContent = d;
    grid.appendChild(cell);
  }
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ===================== TABS =====================
document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ===================== SIDEBAR =====================
document.querySelectorAll(".sidebar-icon").forEach((icon) => {
  icon.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-icon").forEach((i) => i.classList.remove("active"));
    icon.classList.add("active");
  });
});

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
    const res    = await fetch(`${BASE_URL}/notifications/user/${user.id}`);
    const notifs = await res.json();
    renderNotifDropdown(notifs);
  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
}

function renderNotifDropdown(notifs = []) {
  const list   = document.getElementById("notifList");
  const badge  = document.getElementById("notifBadge");
  const footer = document.getElementById("notifFooter");

  const unreadCount   = notifs.filter(n => !n.read).length;
  badge.textContent   = unreadCount;
  badge.style.display = unreadCount > 0 ? "flex" : "none";

  if (notifs.length === 0) {
    list.innerHTML = `<div class="notif-dd-empty"><div class="notif-dd-empty-icon">🔕</div>No notifications yet</div>`;
    footer.style.display = "none";
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-dd-item ${!n.read ? 'unread' : ''}">
      <div class="notif-dd-icon" style="background:${n.iconBg || '#eef0ff'}">${n.icon || '🔔'}</div>
      <div class="notif-dd-body">
        <div class="notif-dd-text">${n.message}</div>
        <div class="notif-dd-sub">${n.subText || ''}</div>
        <div class="notif-dd-time">${timeAgo(n.createdAt)}</div>
      </div>
    </div>
  `).join("");

  footer.style.display = notifs.length > 3 ? "block" : "none";
}

document.getElementById("notifBtn").addEventListener("click", async (e) => {
  e.stopPropagation();
  document.getElementById("notifDropdown").classList.toggle("open");
  await loadNotifications();
});

document.getElementById("notifClearAll").addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    await fetch(`${BASE_URL}/notifications/mark-read/${user.id}`, { method: "PATCH" });
    await loadNotifications();
  } catch (err) {
    console.error("Mark read failed:", err);
  }
});

document.addEventListener("click", (e) => {
  const dd = document.getElementById("notifDropdown");
  if (dd && !dd.contains(e.target) && e.target.id !== "notifBtn") {
    dd.classList.remove("open");
  }
});

// ===================== TOAST =====================
let toastTimeout;
function showToast(msg, type = "", icon = "ℹ️") {
  const toast = document.getElementById("toast");
  document.getElementById("toastMsg").textContent  = msg;
  document.getElementById("toastIcon").textContent = icon;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ===================== SETTINGS PANEL =====================
const settingsOverlay = document.getElementById("settingsOverlay");

document.querySelector('.sidebar-icon[title="Settings"]').addEventListener("click", () => {
  settingsOverlay.classList.add("open");
  document.querySelectorAll(".sub-panel").forEach((p) => p.classList.remove("open"));
});

document.getElementById("settingsClose").addEventListener("click", () =>
  settingsOverlay.classList.remove("open")
);
settingsOverlay.addEventListener("click", (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.remove("open");
});

document.getElementById("openProfile").addEventListener("click",       () => openSubPanel("subProfile"));
document.getElementById("openPassword").addEventListener("click",      () => openSubPanel("subPassword"));
document.getElementById("openNotifications").addEventListener("click", () => openSubPanel("subNotifications"));

function openSubPanel(id) {
  document.querySelectorAll(".sub-panel").forEach((p) => p.classList.remove("open"));
  document.getElementById(id).classList.add("open");
}

function closeSubPanel(id) {
  document.getElementById(id).classList.remove("open");
}

// Dark mode
let darkMode = false;
function toggleDark(e) {
  e.stopPropagation();
  darkMode = !darkMode;
  document.getElementById("darkToggle").classList.toggle("on", darkMode);
  document.body.style.filter = darkMode ? "invert(1) hue-rotate(180deg)" : "";
  showToast(darkMode ? "Dark mode on" : "Light mode on", "", darkMode ? "🌙" : "☀️");
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  showToast("Logging you out...", "warning", "🚪");
  setTimeout(() => (window.location.href = "SignIn.html"), 1500);
});

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
  if (!val) { showToast("Please enter a phone number", "error", "⚠️"); return; }
  showToast("Phone number saved!", "success", "✅");
}

// ===================== CHANGE PASSWORD =====================
async function changePassword() {
  const cur = document.getElementById("currentPwd").value;
  const nw  = document.getElementById("newPwd").value;
  const cnf = document.getElementById("confirmPwd").value;

  if (!cur || !nw || !cnf) { showToast("Please fill all fields", "error", "⚠️"); return; }
  if (nw !== cnf)           { showToast("New passwords do not match", "error", "⚠️"); return; }
  if (nw.length < 8)        { showToast("Min 8 characters required", "error", "⚠️"); return; }

  try {
    const res = await fetch(`${BASE_URL}/users/${user.id}/password`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: cur, newPassword: nw })
    });
    if (!res.ok) { showToast(await res.text(), "error", "⚠️"); return; }

    document.getElementById("currentPwd").value = "";
    document.getElementById("newPwd").value      = "";
    document.getElementById("confirmPwd").value  = "";
    showToast("Password updated successfully!", "success", "🔒");
    closeSubPanel("subPassword");
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
}

// ===================== FORGOT PASSWORD =====================
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
  if (!email) { showToast("Please enter your email", "error", "⚠️"); return; }
  fpEmail = email;
  try {
    const res = await fetch(`${BASE_URL}/users/forgot-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email })
    });
    if (!res.ok) { showToast(await res.text(), "error", "⚠️"); return; }
    showToast("OTP sent to your email!", "success", "📧");
    showForgotStep(3);
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
}

async function verifyFpOtp() {
  const otp = document.getElementById("fpOtp").value.trim();
  if (!otp) { showToast("Please enter the OTP", "error", "⚠️"); return; }
  try {
    const res = await fetch(`${BASE_URL}/users/verify-otp`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: fpEmail, otp })
    });
    if (!res.ok) { showToast(await res.text(), "error", "⚠️"); return; }
    showToast("OTP verified!", "success", "✅");
    showForgotStep(4);
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
}

async function resetFpPassword() {
  const newPwd = document.getElementById("fpNewPwd").value.trim();
  const cnfPwd = document.getElementById("fpCnfPwd").value.trim();
  if (!newPwd || !cnfPwd) { showToast("Please fill both fields", "error", "⚠️"); return; }
  if (newPwd !== cnfPwd)  { showToast("Passwords do not match", "error", "⚠️"); return; }
  if (newPwd.length < 8)  { showToast("Min 8 characters required", "error", "⚠️"); return; }
  try {
    const res = await fetch(`${BASE_URL}/users/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: fpEmail, newPassword: newPwd })
    });
    if (!res.ok) { showToast(await res.text(), "error", "⚠️"); return; }
    showToast("Password reset successfully!", "success", "🔒");
    showForgotStep(1);
    closeSubPanel("subPassword");
  } catch (err) {
    showToast("Server error. Try again.", "error", "⚠️");
  }
}

// ===================== INIT =====================
loadUserInfo();
renderLeaveGrid();
renderCalendar();
loadTeachers();
loadLeaveHistory();
loadNotifications();