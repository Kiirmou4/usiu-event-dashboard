/* =====================================================
   USIU-A Event Booking Dashboard — Vanilla JS
   Data model, interactions, validation, and persistence.
   Author: (Student) — Original logic. No frameworks.
   ===================================================== */

const EVENTS_KEY = "usiu_events_v1";
const BOOKINGS_KEY = "usiu_bookings_v1";

/** Base sample events. If localStorage has a saved version, we’ll load that. */
const BASE_EVENTS = [
  { id: "e1", name: "Orientation & Clubs Fair", date: "2025-09-05", venue: "Main Quad", slots: 40 },
  { id: "e2", name: "Tech Talk: AI in Africa", date: "2025-09-12", venue: "Lecture Hall 2", slots: 30 },
  { id: "e3", name: "Mental Health Workshop", date: "2025-09-19", venue: "Counseling Centre", slots: 25 },
  { id: "e4", name: "Career Fair", date: "2025-10-03", venue: "Auditorium", slots: 60 },
  { id: "e5", name: "Homecoming Concert", date: "2025-10-10", venue: "Sports Grounds", slots: 150 },
];

/** Utilities */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function loadEvents(){
  const saved = localStorage.getItem(EVENTS_KEY);
  return saved ? JSON.parse(saved) : BASE_EVENTS;
}
function saveEvents(events){
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}
function loadBookings(){
  const saved = localStorage.getItem(BOOKINGS_KEY);
  return saved ? JSON.parse(saved) : [];
}
function saveBookings(bookings){
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function fmtDate(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {year:"numeric", month:"short", day:"2-digit"});
}

function badgeFor(slots){
  if(slots > 0){
    return `<span class="badge open">Open</span>`;
  }
  return `<span class="badge full">Fully Booked</span>`;
}

/** Render events into table, and into the form dropdown */
function render(){
  const events = loadEvents();
  const body = $("#eventsBody");
  body.innerHTML = "";

  events.forEach(ev => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Event Name">${ev.name}</td>
      <td data-label="Date">${fmtDate(ev.date)}</td>
      <td data-label="Venue">${ev.venue}</td>
      <td data-label="Slots Available">
        ${ev.slots} ${badgeFor(ev.slots)}
      </td>
      <td data-label="Action">
        <button class="btn btn-primary" data-id="${ev.id}" ${ev.slots === 0 ? "disabled" : ""}>
          ${ev.slots === 0 ? "Fully Booked" : "Register"}
        </button>
      </td>
    `;
    body.appendChild(tr);
  });

  // Populate dropdown
  const select = $("#eventSelect");
  select.innerHTML = `<option value="">Select an event…</option>` + events
      .map(ev => `<option value="${ev.id}" ${ev.slots===0?"disabled":""}>${ev.name} (${fmtDate(ev.date)})</option>`)
      .join("");

  // Wire up buttons
  $$("#eventsBody .btn").forEach(btn => {
    btn.addEventListener("click", onClickRegisterButton);
  });

  // Render existing bookings
  renderBookings();

  // Year in footer
  $("#year").textContent = new Date().getFullYear();
}

/** Handle row “Register” button */
function onClickRegisterButton(e){
  const id = e.currentTarget.getAttribute("data-id");
  const events = loadEvents();
  const ev = events.find(x => x.id === id);
  if(!ev) return;

  if(ev.slots > 0){
    ev.slots -= 1;
    saveEvents(events);
    flashHeader(`Booked 1 slot for “${ev.name}”.`, "ok");
  }
  // If becomes 0, disable in UI (rerender guarantees state)
  render();
}

/** Light-weight a11y-friendly toast in header */
function flashHeader(msg, type="ok"){
  const headerMessage = $("#headerMessage");
  headerMessage.textContent = msg;
  headerMessage.style.background = type === "ok" ? "#ecfdf5" : "#fff1f2";
  headerMessage.style.color = type === "ok" ? "#064e3b" : "#7f1d1d";
  headerMessage.style.padding = "10px 12px";
  headerMessage.style.borderRadius = "10px";
  headerMessage.style.border = type === "ok" ? "1px solid #a7f3d0" : "1px solid #fecaca";
  setTimeout(() => { headerMessage.textContent = ""; headerMessage.removeAttribute("style"); }, 2200);
}

/** Form validation and submission */
function validStudentId(value){
  // Example acceptable formats: USIU123456 or 12345678 or AA123456
  // Rule: 6–10 alphanumeric characters, must contain at least one digit.
  const basic = /^[A-Za-z0-9]{6,10}$/;
  const hasDigit = /\d/;
  return basic.test(value) && hasDigit.test(value);
}

function onSubmitForm(e){
  e.preventDefault();
  const name = $("#name").value.trim();
  const sid = $("#studentId").value.trim();
  const eventId = $("#eventSelect").value;

  let ok = true;

  // Reset errors
  $("#nameErr").textContent = "";
  $("#idErr").textContent = "";
  $("#eventErr").textContent = "";

  if(name.length < 2){
    $("#nameErr").textContent = "Please enter your full name.";
    ok = false;
  }
  if(!validStudentId(sid)){
    $("#idErr").textContent = "Student ID should be 6–10 letters/digits and include a number (e.g., USIU123456).";
    ok = false;
  }
  if(!eventId){
    $("#eventErr").textContent = "Please choose an event.";
    ok = false;
  }
  if(!ok) return;

  // Deduct a slot for the chosen event, if available
  const events = loadEvents();
  const ev = events.find(x => x.id === eventId);
  if(!ev){
    $("#eventErr").textContent = "Selected event not found.";
    return;
  }
  if(ev.slots === 0){
    $("#eventErr").textContent = "Sorry, this event is fully booked.";
    render(); // to ensure UI shows disabled
    return;
  }

  ev.slots -= 1;
  saveEvents(events);

  // Save booking
  const bookings = loadBookings();
  const booking = { id: crypto.randomUUID(), name, sid, eventId, when: new Date().toISOString() };
  bookings.push(booking);
  saveBookings(bookings);

  // Clear form + message
  $("#registerForm").reset();
  $("#formMessage").innerHTML = `<strong>Success!</strong> ${name} (${sid}) registered for “${ev.name}”.`;

  render();
}

/** Show bookings list */
function renderBookings(){
  const list = $("#bookingsList");
  const bookings = loadBookings();
  const events = loadEvents();
  if(bookings.length === 0){
    list.innerHTML = "<li>No bookings yet.</li>";
    return;
  }
  list.innerHTML = bookings.slice().reverse().map(b => {
    const ev = events.find(e => e.id === b.eventId);
    const when = new Date(b.when).toLocaleString();
    return `<li>
      <strong>${b.name}</strong> • ${b.sid} → <em>${ev ? ev.name : "(deleted event)"
    }</em> <small style="color:#6b7280">on ${when}</small>
    </li>`;
  }).join("");
}

/** Initialize */
window.addEventListener("DOMContentLoaded", () => {
  // Initialize storage on first load
  if(!localStorage.getItem(EVENTS_KEY)){
    saveEvents(BASE_EVENTS);
  }
  render();

  $("#registerForm").addEventListener("submit", onSubmitForm);
});
