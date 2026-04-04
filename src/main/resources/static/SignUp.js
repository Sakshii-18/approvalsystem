// ===================== ROLE TOGGLE (show/hide fields) =====================

const roleSelect  = document.getElementById("role");
const classSelect = document.getElementById("std");
const classLabel  = document.getElementById("classLabel");
const prnInput    = document.getElementById("prn");
const prnLabel    = document.getElementById("prnLabel");
const secretGroup = document.getElementById("secretCodeGroup");

roleSelect.addEventListener("change", function () {

  const role = this.value;

  if (role === "Student") {

    // show class and PRN
    classSelect.style.display = "block";
    classLabel.style.display  = "block";
    classSelect.required      = true;

    prnInput.style.display = "block";
    prnLabel.style.display = "block";
    prnInput.required      = true;

    // hide secret code
    secretGroup.style.display = "none";

  } else if (role === "Teacher" || role === "HOD" || role === "Director") {

    // hide class and PRN
    classSelect.style.display = "none";
    classLabel.style.display  = "none";
    classSelect.required      = false;

    prnInput.style.display = "none";
    prnLabel.style.display = "none";
    prnInput.required      = false;

    // show secret code
    secretGroup.style.display = "block";

  } else {

    // nothing selected — hide everything extra
    classSelect.style.display = "none";
    classLabel.style.display  = "none";

    prnInput.style.display = "none";
    prnLabel.style.display = "none";

    secretGroup.style.display = "none";

  }

});

// ===================== SIGNUP FORM SUBMIT =====================

document.getElementById("signupForm").addEventListener("submit", function (e) {

  e.preventDefault();

  const name       = document.getElementById("name").value;
  const email      = document.getElementById("email").value;
  const password   = document.getElementById("password").value;
  const role       = document.getElementById("role").value;
  const className  = document.getElementById("std").value;
  const prn        = document.getElementById("prn").value;
  const secretCode = document.getElementById("secretCode").value;

  fetch("http://localhost:8081/users", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      name:       name,
      email:      email,
      password:   password,
      role:       role,
      className:  className,
      prn:        prn,
      secretCode: secretCode
    })

  })
  .then(response => {

    if (!response.ok) {
      return response.text().then(msg => { throw new Error(msg); });
    }

    return response.json();

  })
  .then(data => {

    alert("User Registered Successfully");

    // Save user to localStorage so dashboards can use it
    localStorage.setItem("user", JSON.stringify(data));

    // Redirect based on role
    if (data.role === "Student") {
      window.location.href = "student-dashboard.html";

    } else if (data.role === "Teacher") {
      window.location.href = "teacher-dashboard.html";

    } else if (data.role === "HOD") {
      window.location.href = "hod-dashboard.html";

    } else if (data.role === "Director") {
      window.location.href = "director-dashboard.html";

    } else {
      alert("Unknown role: " + data.role);
    }

  })
  .catch(error => {

    alert(error.message);

  });

});

// ===================== PASSWORD EYE TOGGLE =====================
// NOTE: must be OUTSIDE the submit listener — otherwise it won't work

function toggleEye(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  } else {
    input.type = "password";
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}