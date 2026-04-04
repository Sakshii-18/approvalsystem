const BASE_URL = "http://localhost:8081";
let verifiedEmail = "";

// ===================== LOGIN =====================
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => {
    if (!res.ok) throw new Error("Invalid email or password");
    return res.json();
  })
  .then(data => {
    localStorage.setItem("user", JSON.stringify(data));
    if      (data.role === "Student")  window.location.href = "student-dashboard.html";
    else if (data.role === "Teacher")  window.location.href = "Teacher-dashboard.html";
    else if (data.role === "HOD")      window.location.href = "hod-dashboard.html";
    else if (data.role === "Director") window.location.href = "director-dashboard.html";
  })
  .catch(err => alert(err.message));
});

// ===================== STEP NAVIGATION =====================
function showStep(stepId) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById(stepId).classList.add("active");
}

// ===================== SEND OTP =====================
async function sendOtp() {
  const email = document.getElementById("forgotEmail").value.trim();
  const msg   = document.getElementById("forgotMsg");

  if (!email) { showMsg(msg, "Please enter your email", "error"); return; }

  try {
    const res  = await fetch(`${BASE_URL}/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const text = await res.text();
    if (!res.ok) { showMsg(msg, text, "error"); return; }

    verifiedEmail = email;
    document.getElementById("otpSubText").textContent = `OTP sent to ${email}. Check your inbox.`;
    showStep("stepOtp");

  } catch (err) {
    showMsg(msg, "Server error. Try again.", "error");
  }
}

// ===================== VERIFY OTP =====================
async function verifyOtp() {
  const otp = document.getElementById("otpInput").value.trim();
  const msg = document.getElementById("otpMsg");

  if (!otp || otp.length !== 6) { showMsg(msg, "Enter a valid 6-digit OTP", "error"); return; }

  try {
    const res  = await fetch(`${BASE_URL}/users/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verifiedEmail, otp })
    });
    const text = await res.text();
    if (!res.ok) { showMsg(msg, text, "error"); return; }

    showStep("stepNewPwd");

  } catch (err) {
    showMsg(msg, "Server error. Try again.", "error");
  }
}

// ===================== RESET PASSWORD =====================
async function resetPassword() {
  const newPwd     = document.getElementById("newPwd").value;
  const confirmPwd = document.getElementById("confirmPwd").value;
  const msg        = document.getElementById("newPwdMsg");

  if (!newPwd || !confirmPwd) { showMsg(msg, "Please fill all fields", "error"); return; }
  if (newPwd !== confirmPwd)  { showMsg(msg, "Passwords do not match", "error"); return; }
  if (newPwd.length < 8)      { showMsg(msg, "Min 8 characters required", "error"); return; }

  try {
    const res  = await fetch(`${BASE_URL}/users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verifiedEmail, newPassword: newPwd })
    });
    const text = await res.text();
    if (!res.ok) { showMsg(msg, text, "error"); return; }

    showMsg(msg, "Password reset successfully! Redirecting to login...", "success");
    setTimeout(() => {
      showStep("stepLogin");
      document.getElementById("otpInput").value      = "";
      document.getElementById("newPwd").value        = "";
      document.getElementById("confirmPwd").value    = "";
    }, 2000);

  } catch (err) {
    showMsg(msg, "Server error. Try again.", "error");
  }
}

// ===================== HELPER =====================
function showMsg(el, text, type) {
  el.textContent = text;
  el.className   = `msg ${type}`;
}

// ===================== EYE TOGGLE =====================
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