// ===================== CLASS OPTIONS PER DEPARTMENT =====================

const caClasses = [
  "BCA-1 A", "BCA-1 B",
  "BCA-2 A", "BCA-2 B",
  "BCA-3 A", "BCA-3 B",
  "MCA-1 A", "MCA-1 B",
  "MCA-2 A", "MCA-2 B"
];

const baClasses = [
  "BBA-1 A", "BBA-1 B",
  "BBA-2 A", "BBA-2 B",
  "BBA-3 A", "BBA-3 B",
  "MBA-1 A", "MBA-1 B",
  "MBA-2 A", "MBA-2 B"
];

// ===================== ROLE TOGGLE (show/hide fields) =====================

const roleSelect  = document.getElementById("role");
const deptSelect  = document.getElementById("department");
const deptLabel   = document.getElementById("deptLabel");
const classSelect = document.getElementById("std");
const classLabel  = document.getElementById("classLabel");
const prnInput    = document.getElementById("prn");
const prnLabel    = document.getElementById("prnLabel");
const secretGroup = document.getElementById("secretCodeGroup");

roleSelect.addEventListener("change", function () {

  const role = this.value;

  if (role === "Student") {

    // show department first
    deptSelect.style.display = "block";
    deptLabel.style.display  = "block";
    deptSelect.required      = true;

    // reset and hide class until department is chosen
    classSelect.style.display = "none";
    classLabel.style.display  = "none";
    classSelect.required      = false;
    classSelect.innerHTML     = '<option value="">Select class</option>';

    // reset department selection
    deptSelect.value = "";

    prnInput.style.display = "block";
    prnLabel.style.display = "block";
    prnInput.required      = true;

    // hide secret code
    secretGroup.style.display = "none";

  } else if (role === "Teacher" || role === "HOD" || role === "Director") {

    // hide student fields
    deptSelect.style.display = "none";
    deptLabel.style.display  = "none";
    deptSelect.required      = false;

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
    deptSelect.style.display = "none";
    deptLabel.style.display  = "none";
    deptSelect.required      = false;

    classSelect.style.display = "none";
    classLabel.style.display  = "none";
    classSelect.required      = false;

    prnInput.style.display = "none";
    prnLabel.style.display = "none";
    prnInput.required      = false;

    secretGroup.style.display = "none";

  }

});

// ===================== DEPARTMENT TOGGLE (populate class list) =====================

deptSelect.addEventListener("change", function () {

  const dept = this.value;

  // reset class dropdown
  classSelect.innerHTML = '<option value="">Select class</option>';

  if (dept === "CA") {

    caClasses.forEach(function (cls) {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = cls;
      classSelect.appendChild(opt);
    });

    classSelect.style.display = "block";
    classLabel.style.display  = "block";
    classSelect.required      = true;

  } else if (dept === "BA") {

    baClasses.forEach(function (cls) {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = cls;
      classSelect.appendChild(opt);
    });

    classSelect.style.display = "block";
    classLabel.style.display  = "block";
    classSelect.required      = true;

  } else {

    classSelect.style.display = "none";
    classLabel.style.display  = "none";
    classSelect.required      = false;

  }

});

// ===================== SIGNUP FORM SUBMIT =====================

document.getElementById("signupForm").addEventListener("submit", function (e) {

  e.preventDefault();

  const name       = document.getElementById("name").value;
  const email      = document.getElementById("email").value;
  const password   = document.getElementById("password").value;
  const role       = document.getElementById("role").value;
  const department = document.getElementById("department").value;
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
      department: department,
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