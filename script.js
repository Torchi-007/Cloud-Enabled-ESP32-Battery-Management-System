import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig?.apiKey || !firebaseConfig?.databaseURL) {
  throw new Error("Missing Firebase configuration. Create firebase-config.js from .env.");
}

const app    = initializeApp(firebaseConfig);
const db     = getDatabase(app);
const bmsRef = ref(db, "bms");

const ARC_LENGTH = 283;

// ── Timestamp ──────────────────────────────────────────────
function updateTimestamp() {
  const el = document.getElementById("timestamp");
  if (el) el.textContent = new Date().toLocaleTimeString();
}
setInterval(updateTimestamp, 1000);
updateTimestamp();

// ── SOC Arc ────────────────────────────────────────────────
function setSOCArc(pct) {
  const fill = document.getElementById("arc-fill");
  if (!fill) return;
  const clamped = Math.min(100, Math.max(0, pct));
  const drawn   = (clamped / 100) * ARC_LENGTH;
  fill.setAttribute("stroke-dasharray", `${drawn} ${ARC_LENGTH - drawn}`);
}

// ── Voltage Bar ────────────────────────────────────────────
function setVoltageBar(v) {
  const bar = document.getElementById("voltage-bar");
  if (!bar) return;
  const pct = Math.min(100, Math.max(0, ((v - 2.5) / (4.2 - 2.5)) * 100));
  bar.style.width = pct + "%";
}

// ── Voltage Label ──────────────────────────────────────────
function getVoltageLabel(v) {
  if (v >= 4.15) return "Fully Charged";
  if (v >= 3.7)  return "Nominal";
  if (v >= 3.4)  return "Low";
  return "Critical";
}

// ── Temperature ────────────────────────────────────────────
function updateTemp(temp) {
  const el    = document.getElementById("temp");
  const ring  = document.getElementById("temp-ring");
  const label = document.getElementById("temp-label");
  if (!el || !ring || !label) return;

  el.textContent   = temp.toFixed(1);
  ring.className   = "temp-ring";

  if (temp < 20)      { ring.classList.add("cool");   label.textContent = "Cool"; }
  else if (temp < 35) { ring.classList.add("normal"); label.textContent = "Normal"; }
  else if (temp < 45) { ring.classList.add("warm");   label.textContent = "Warm"; }
  else                { ring.classList.add("hot");    label.textContent = "⚠ HOT!"; }
}

// ── SOH / Health ───────────────────────────────────────────
function updateHealth(soh) {
  const healthValue = document.getElementById("health-value");
  const healthBar   = document.getElementById("health-bar");
  const healthLabel = document.getElementById("health-label");
  if (!healthValue || !healthBar || !healthLabel) return;

  const h = Math.min(100, Math.max(0, soh));
  healthValue.textContent = h.toFixed(1) + "%";
  healthBar.style.width   = h + "%";
  healthBar.className     = "health-bar-fill";

  if (h > 80) {
    healthBar.classList.add("good");
    healthLabel.textContent = "Good";
    healthLabel.className   = "card-sub health-good";
  } else if (h > 50) {
    healthBar.classList.add("fair");
    healthLabel.textContent = "Fair";
    healthLabel.className   = "card-sub health-fair";
  } else {
    healthBar.classList.add("poor");
    healthLabel.textContent = "Poor";
    healthLabel.className   = "card-sub health-poor";
  }
}

// ── Charger Status ─────────────────────────────────────────
function updateCharger(state) {
  const iconWrap      = document.getElementById("charger-icon-wrap");
  const chargerState  = document.getElementById("charger-state");
  const chargerDetail = document.getElementById("charger-detail");
  if (!iconWrap || !chargerState || !chargerDetail) return;

  if (state === "Charging") {
    iconWrap.className        = "charger-icon-wrap connected";
    chargerState.textContent  = "Connected";
    chargerState.className    = "charger-state on";
    chargerDetail.textContent = "Charging in progress";
  } else if (state === "Discharging") {
    iconWrap.className        = "charger-icon-wrap disconnected";
    chargerState.textContent  = "Disconnected";
    chargerState.className    = "charger-state off";
    chargerDetail.textContent = "Running on battery";
  } else {
    iconWrap.className        = "charger-icon-wrap disconnected";
    chargerState.textContent  = "Idle";
    chargerState.className    = "charger-state off";
    chargerDetail.textContent = "No load detected";
  }
}

// ── SOC Label ──────────────────────────────────────────────
function updateSOCLabel(soc, state) {
  const label = document.getElementById("soc-label");
  if (!label) return;
  label.className = "card-sub";

  if (state === "Charging") {
    label.textContent = "⚡ Charging";
    label.classList.add("charging");
  } else if (state === "Discharging") {
    label.textContent = "🔋 Discharging";
    label.classList.add("discharging");
  } else {
    label.textContent = soc > 95 ? "Fully Charged" : "Idle";
    label.classList.add("idle");
  }
}

// ── Alert Strip ────────────────────────────────────────────
function updateAlert(soc, temp, state) {
  const strip = document.getElementById("alert-strip");
  const msg   = document.getElementById("alert-msg");
  if (!strip || !msg) return;

  strip.className = "alert-strip";

  if (temp > 45) {
    strip.classList.add("danger");
    msg.textContent = "⚠ CRITICAL: Cell temperature too high! Check cooling.";
  } else if (soc < 10) {
    strip.classList.add("danger");
    msg.textContent = "⚠ CRITICAL: Battery critically low! Connect charger now.";
  } else if (temp > 35) {
    strip.classList.add("warn");
    msg.textContent = "⚠ Warning: Temperature elevated. Monitor closely.";
  } else if (soc < 20) {
    strip.classList.add("warn");
    msg.textContent = "⚠ Warning: Battery low. Consider charging soon.";
  } else if (state === "Charging") {
    msg.textContent = "⚡ Charging in progress — all systems nominal.";
  } else {
    msg.textContent = "✅ All systems nominal — monitoring in real time.";
  }
}

// ── Firebase Listener ──────────────────────────────────────
onValue(bmsRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  const soc     = parseFloat(data.soc         ?? 0);
  const voltage = parseFloat(data.voltage     ?? 0);
  const temp    = parseFloat(data.temperature ?? data.temp ?? 0);
  const soh     = parseFloat(data.soh         ?? 100);
  const state   = data.state || "Idle";

  // SOC
  document.getElementById("soc").textContent = soc.toFixed(1);
  setSOCArc(soc);
  updateSOCLabel(soc, state);

  // Voltage
  document.getElementById("voltage").textContent = voltage.toFixed(2);
  setVoltageBar(voltage);
  document.getElementById("voltage-label").textContent = getVoltageLabel(voltage);

  // Temperature
  updateTemp(temp);

  // Health / SOH
  updateHealth(soh);

  // Charger
  updateCharger(state);

  // Alert
  updateAlert(soc, temp, state);
});
