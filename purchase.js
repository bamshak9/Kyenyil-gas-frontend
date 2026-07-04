/* =============================================
   KYENYIL GAS — PURCHASE PAGE
   File: purchase.js

   *** CONFIGURATION ***
   API_BASE_URL points to your deployed Render backend.
   If I ever redeploy the backend under a different
   service name, update the URL below to match.
   ============================================= */

const API_BASE_URL = "https://kyenyil-gas-backend-3.onrender.com"; // <-- your live Render backend

/* =============================================
   DOM REFERENCES
   ============================================= */
const form          = document.getElementById("orderForm");
const hamburger     = document.getElementById("hamburger");
const mobileMenu    = document.getElementById("mobileMenu");
const qtyInput      = document.getElementById("quantity");
const qtyMinus      = document.getElementById("qtyMinus");
const qtyPlus       = document.getElementById("qtyPlus");
const successModal  = document.getElementById("successModal");
const errorToast    = document.getElementById("errorToast");
const toastMsg      = document.getElementById("toastMsg");
const orderRef      = document.getElementById("orderRef");
const submitBtn     = document.getElementById("submitBtn");
const submitText    = document.getElementById("submitText");
const submitSpinner = document.getElementById("submitSpinner");
const customSizeBox = document.getElementById("customSizeBox");
const customSizeKg  = document.getElementById("customSizeKg");
const cylinderImageBox     = document.getElementById("cylinderImageBox");
const cylinderImageInput   = document.getElementById("cylinderImage");
const cylinderImagePreview = document.getElementById("cylinderImagePreview");

// Holds the compressed base64 photo once the user picks one (cleared if
// they switch away from "swap" or remove the file).
let cylinderImageData = "";

// Step elements
const steps     = document.querySelectorAll(".step");
const stepLines = document.querySelectorAll(".step-line");
const step1El   = document.getElementById("step1");
const step2El   = document.getElementById("step2");
const step3El   = document.getElementById("step3");

let currentStep = 1;

/* =============================================
   HAMBURGER MENU
   ============================================= */
hamburger.addEventListener("click", () => {
  mobileMenu.classList.toggle("open");
  hamburger.classList.toggle("active");
});

/* =============================================
   QUANTITY CONTROL
   ============================================= */
qtyMinus.addEventListener("click", () => {
  const val = parseInt(qtyInput.value);
  if (val > 1) { qtyInput.value = val - 1; updateSidebar(); }
});
qtyPlus.addEventListener("click", () => {
  const val = parseInt(qtyInput.value);
  if (val < 20) { qtyInput.value = val + 1; updateSidebar(); }
});

/* =============================================
   CYLINDER SIZE HELPERS
   ============================================= */
function getSelectedSize() {
  const selected = document.querySelector('input[name="cylinderSize"]:checked');
  return selected ? selected.value : null;
}

function getEffectiveSizeLabel() {
  const size = getSelectedSize();
  if (size === "custom") {
    const kg = parseFloat(customSizeKg.value);
    return kg ? `${kg} kg (custom)` : "Custom";
  }
  return size;
}

/* =============================================
   CUSTOM SIZE BOX TOGGLE
   ============================================= */
function toggleCustomBox() {
  const isCustom = getSelectedSize() === "custom";
  if (isCustom) {
    customSizeBox.classList.remove("hidden");
    customSizeKg.focus();
  } else {
    customSizeBox.classList.add("hidden");
    customSizeKg.value = "";
    document.getElementById("customSizeNote").value = "";
    hideError("customSizeError");
    clearError(customSizeKg);
  }
}

/* =============================================
   CYLINDER PHOTO BOX TOGGLE (shown only for "swap")
   ============================================= */
function toggleCylinderImageBox() {
  const type = document.getElementById("cylinderType").value;
  if (type === "swap") {
    cylinderImageBox.classList.remove("hidden");
  } else {
    cylinderImageBox.classList.add("hidden");
    cylinderImageInput.value = "";
    cylinderImageData = "";
    cylinderImagePreview.src = "";
    cylinderImagePreview.classList.add("hidden");
    hideError("cylinderImageError");
  }
}

// Resize/compress the chosen photo client-side so uploads stay small
// and fast, then store it as a base64 data URL for submission.
function handleCylinderImageChange() {
  const file = cylinderImageInput.files[0];
  hideError("cylinderImageError");
  if (!file) { cylinderImageData = ""; cylinderImagePreview.classList.add("hidden"); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 1000;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      cylinderImageData = canvas.toDataURL("image/jpeg", 0.7);
      cylinderImagePreview.src = cylinderImageData;
      cylinderImagePreview.classList.remove("hidden");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById("cylinderType").addEventListener("change", toggleCylinderImageBox);
cylinderImageInput.addEventListener("change", handleCylinderImageChange);

/* =============================================
   LIVE SIDEBAR UPDATES
   ============================================= */
function updateSidebar() {
  const size = getSelectedSize();
  const qty  = qtyInput.value;
  const type = document.getElementById("cylinderType");
  const area = document.getElementById("area");

  document.getElementById("sidebarSizeVal").textContent =
    size === "custom" ? getEffectiveSizeLabel() : (size || "Not selected");
  document.getElementById("sidebarQtyVal").textContent  = qty;
  document.getElementById("sidebarTypeVal").textContent =
    type.value ? type.options[type.selectedIndex].text : "—";
  document.getElementById("sidebarAreaVal").textContent = area.value || "—";
}

// Attach sidebar listeners
document.querySelectorAll('input[name="cylinderSize"]').forEach(radio => {
  radio.addEventListener("change", () => { toggleCustomBox(); updateSidebar(); });
});
document.getElementById("cylinderType").addEventListener("change", updateSidebar);
document.getElementById("area").addEventListener("change", updateSidebar);
qtyInput.addEventListener("input", updateSidebar);
customSizeKg.addEventListener("input", () => {
  hideError("customSizeError");
  clearError(customSizeKg);
  updateSidebar();
});

/* =============================================
   STEP NAVIGATION
   ============================================= */
document.getElementById("toStep2").addEventListener("click",     () => goToStep(2));
document.getElementById("toStep1Back").addEventListener("click", () => goToStep(1));
document.getElementById("toStep3").addEventListener("click",     () => goToStep(3));
document.getElementById("toStep2Back").addEventListener("click", () => goToStep(2));

function goToStep(step) {
  // Validate current step before advancing forward
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }

  // Build summary when landing on step 3
  if (step === 3) buildSummary();

  // Hide all step panels
  [step1El, step2El, step3El].forEach(el => el.classList.add("hidden"));

  // Show the target step panel
  const targets = [null, step1El, step2El, step3El];
  targets[step].classList.remove("hidden");

  // Update step indicator dots
  steps.forEach((s, i) => {
    s.classList.remove("active", "done");
    if (i + 1 < step)  s.classList.add("done");
    if (i + 1 === step) s.classList.add("active");
  });

  // Update connector lines
  stepLines.forEach((line, i) => {
    line.classList.toggle("done", i < step - 1);
  });

  currentStep = step;
  document.querySelector(".form-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =============================================
   VALIDATION
   ============================================= */
function validateStep(step) {
  if (step === 1) return validateStep1();
  if (step === 2) return validateStep2();
  return true;
}

function validateStep1() {
  let valid = true;

  // Must pick a size
  if (!getSelectedSize()) {
    showError("sizeError");
    valid = false;
  } else {
    hideError("sizeError");
  }

  // If custom, must enter a valid weight
  if (getSelectedSize() === "custom") {
    const kg = parseFloat(customSizeKg.value);
    if (!customSizeKg.value || isNaN(kg) || kg < 0.5 || kg > 500) {
      showError("customSizeError", "Please enter a valid size between 0.5 kg and 500 kg.");
      markError(customSizeKg);
      valid = false;
    } else {
      hideError("customSizeError");
      clearError(customSizeKg);
    }
  }

  // Must pick an action (swap / pickup / new)
  const typeEl = document.getElementById("cylinderType");
  if (!typeEl.value) {
    showError("typeError");
    markError(typeEl);
    valid = false;
  } else {
    hideError("typeError");
    clearError(typeEl);
  }

  // If swapping, a photo of the cylinder is required
  if (typeEl.value === "swap" && !cylinderImageData) {
    showError("cylinderImageError", "Please upload a photo of your cylinder to request a swap.");
    valid = false;
  } else {
    hideError("cylinderImageError");
  }

  return valid;
}

function validateStep2() {
  let valid = true;

  // Helper that marks a field and flips the flag — avoids forEach return issue
  function check(id, errId, message) {
    const el  = document.getElementById(id);
    const val = el.value.trim();
    if (!val) {
      showError(errId, message);
      markError(el);
      valid = false;
    } else {
      hideError(errId);
      clearError(el);
    }
    return val;
  }

  check("firstName",    "firstNameError", "First name is required.");
  check("lastName",     "lastNameError",  "Last name is required.");
  check("address",      "addressError",   "Delivery address is required.");

  // Area (select)
  const areaEl = document.getElementById("area");
  if (!areaEl.value) {
    showError("areaError", "Please select your area.");
    markError(areaEl);
    valid = false;
  } else {
    hideError("areaError");
    clearError(areaEl);
  }

  // Phone — must be present and match Nigerian format
  const phoneEl  = document.getElementById("phone");
  const phoneVal = phoneEl.value.trim().replace(/\s/g, "");
  if (!phoneVal) {
    showError("phoneError", "Phone number is required.");
    markError(phoneEl);
    valid = false;
  } else if (!/^[0-9]{10,14}$/.test(phoneVal)) {
    showError("phoneError", "Please enter a valid Nigerian phone number (10–14 digits).");
    markError(phoneEl);
    valid = false;
  } else {
    hideError("phoneError");
    clearError(phoneEl);
  }

  // Delivery date — must be present and not in the past
  const dateEl  = document.getElementById("deliveryDate");
  const dateVal = dateEl.value;
  if (!dateVal) {
    showError("dateError", "Please choose a delivery date.");
    markError(dateEl);
    valid = false;
  } else {
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const chosen = new Date(dateVal);
    if (chosen < today) {
      showError("dateError", "Delivery date cannot be in the past.");
      markError(dateEl);
      valid = false;
    } else {
      hideError("dateError");
      clearError(dateEl);
    }
  }

  return valid;
}

function validateStep3() {
  let valid = true;

  const paymentEl = document.getElementById("paymentMethod");
  if (!paymentEl.value) {
    showError("paymentError", "Please select a payment method.");
    markError(paymentEl);
    valid = false;
  } else {
    hideError("paymentError");
    clearError(paymentEl);
  }

  const termsEl = document.getElementById("agreeTerms");
  if (!termsEl.checked) {
    showError("termsError", "Please confirm your agreement to continue.");
    valid = false;
  } else {
    hideError("termsError");
  }

  return valid;
}

/* =============================================
   ERROR HELPERS
   ============================================= */
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) el.textContent = msg;
  el.classList.remove("hidden");
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}
function markError(el)  { if (el) el.classList.add("error"); }
function clearError(el) { if (el) el.classList.remove("error"); }

// Clear error styling as the user corrects a field
document.querySelectorAll("input, select, textarea").forEach(el => {
  el.addEventListener("input",  () => clearError(el));
  el.addEventListener("change", () => clearError(el));
});
document.querySelectorAll('input[name="cylinderSize"]').forEach(r => {
  r.addEventListener("change", () => hideError("sizeError"));
});

/* =============================================
   ORDER SUMMARY (Step 3)
   ============================================= */
function buildSummary() {
  const data = collectFormData();

  const rows = [
    ["Cylinder size",    data.cylinderSize || "—"],
    ["Quantity",         data.quantity],
    ["Action",           actionLabel(data.cylinderType)],
    ["Customer name",    `${data.firstName} ${data.lastName}`],
    ["Phone",            data.phone],
    ["Delivery address", data.address],
    ["Area",             data.area],
    ["Preferred date",   formatDate(data.deliveryDate)],
    ["Payment",          data.paymentMethod === "cash" ? "Cash on delivery" : data.paymentMethod === "transfer" ? "Bank transfer" : "—"],
    ["Notes",            data.notes || "None"],
  ];

  // Show custom description row only when relevant
  if (data.isCustomSize && data.customSizeNote) {
    rows.splice(1, 0, ["Cylinder description", data.customSizeNote]);
  }

  const container = document.getElementById("orderSummary");
  container.innerHTML = rows.map(([key, val]) => `
    <div class="summary-row">
      <span class="s-key">${key}</span>
      <span class="s-val">${val}</span>
    </div>
  `).join("");

  // Show the uploaded cylinder photo in the summary for swap orders
  if (data.cylinderType === "swap" && data.cylinderImage) {
    container.insertAdjacentHTML("beforeend", `
      <div class="summary-row">
        <span class="s-key">Cylinder photo</span>
        <span class="s-val"><img src="${data.cylinderImage}" alt="Your cylinder" class="cyl-image-preview" /></span>
      </div>
    `);
  }
}

function actionLabel(type) {
  if (type === "swap")   return "Swap my cylinder with a full one";
  if (type === "pickup") return "Pickup my cylinder";
  if (type === "new")    return "Bring new filled cylinder";
  return "—";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00"); // prevent timezone offset shifting the date
  return d.toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

/* =============================================
   COLLECT FORM DATA
   ============================================= */
function collectFormData() {
  return {
    cylinderSize:   getEffectiveSizeLabel(),
    isCustomSize:   getSelectedSize() === "custom",
    customSizeNote: document.getElementById("customSizeNote").value.trim(),
    quantity:       parseInt(qtyInput.value),
    cylinderType:   document.getElementById("cylinderType").value,
    cylinderImage:  document.getElementById("cylinderType").value === "swap" ? cylinderImageData : "",
    firstName:      document.getElementById("firstName").value.trim(),
    lastName:       document.getElementById("lastName").value.trim(),
    phone:          document.getElementById("phone").value.trim(),
    address:        document.getElementById("address").value.trim(),
    area:           document.getElementById("area").value,
    deliveryDate:   document.getElementById("deliveryDate").value,
    notes:          document.getElementById("notes").value.trim(),
    paymentMethod:  document.getElementById("paymentMethod").value,
    status:         "pending",
    createdAt:      new Date().toISOString(),
  };
}

/* =============================================
   FORM SUBMIT — POST TO BACKEND API
   ============================================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep3()) return;

  const orderData = collectFormData();

  // Loading state
  submitBtn.disabled = true;
  submitText.textContent = "Placing order…";
  submitSpinner.classList.remove("hidden");

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json();

    // Success
    orderRef.textContent = `Order reference: ${result.orderId || result._id || "KG-" + Date.now()}`;
    successModal.classList.remove("hidden");
    form.reset();
    toggleCustomBox();        // reset custom box state
    toggleCylinderImageBox(); // reset cylinder photo box state
    goToStep(1);               // reset step indicators

  } catch (err) {
    console.error("Order submission error:", err);
    showToast(err.message || "Failed to place order. Please check your connection and try again.");
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = "Place Order";
    submitSpinner.classList.add("hidden");
  }
});

/* =============================================
   TOAST NOTIFICATION
   ============================================= */
let toastTimer;
function showToast(message) {
  toastMsg.textContent = message;
  errorToast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => errorToast.classList.add("hidden"), 5000);
}

/* =============================================
   SET MINIMUM DELIVERY DATE (today)
   ============================================= */
(function setMinDate() {
  const dateInput = document.getElementById("deliveryDate");
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);
})();