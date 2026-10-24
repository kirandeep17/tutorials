/* Diwali Party Planner — vanilla JS, data saved in this browser (localStorage) */
(() => {
  "use strict";

  const STORE_KEY = "diwali-party-v1";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const haptic = (ms = 10) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

  /* ---------- Constants ---------- */
  const GUEST_STATUS = ["invited", "going", "maybe", "declined"];
  const STATUS_LABEL = { invited: "Invited", going: "Going", maybe: "Maybe", declined: "Declined" };
  const STATUS_RANK = { going: 0, maybe: 1, invited: 2, declined: 3 };
  const STATUS_COLOR = { going: "var(--success)", maybe: "var(--gold)", invited: "var(--outline)", declined: "var(--error)" };

  const DISH_CATS = ["Starters", "Mains", "Breads & Rice", "Sweets", "Drinks", "Snacks"];
  const DISH_EMOJI = { Starters: "🥟", Mains: "🍛", "Breads & Rice": "🫓", Sweets: "🍬", Drinks: "🥤", Snacks: "🥨" };
  const DISH_UNITS = ["plates", "kg", "pcs", "trays", "litres", "boxes"];

  const EXP_CATS = ["Decor & Lights", "Diyas & Pooja", "Fireworks", "Gifts & Sweets", "Venue", "Music & Fun", "Birthday Cake", "Other"];
  const EXP_EMOJI = { "Decor & Lights": "✨", "Diyas & Pooja": "🪔", Fireworks: "🎆", "Gifts & Sweets": "🎁", Venue: "🏠", "Music & Fun": "🎶", "Birthday Cake": "🎂", Other: "🧾", "Food orders": "🍛" };
  const PALETTE = ["#ff9f1c", "#e64980", "#7950f2", "#f0c13a", "#20c997", "#4dabf7", "#ff6b6b", "#a9e34b", "#fd7e14"];

  const AVATAR_TONES = [
    ["var(--primary-container)", "var(--on-primary-container)"],
    ["var(--secondary-container)", "var(--on-secondary-container)"],
    ["var(--tertiary-container)", "var(--on-tertiary-container)"],
    ["var(--gold-container)", "var(--on-gold-container)"],
  ];

  /* ---------- State ---------- */
  const defaultState = () => ({
    settings: {
      name: "Diwali Night",
      date: "2026-11-08T19:00",
      venue: "",
      birthday: false,
      birthdayName: "",
      budget: 50000,
      currency: "INR",
      includeDishes: true,
      theme: "system",
    },
    guests: [],
    dishes: [],
    expenses: [],
  });

  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = defaultState();
        return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
      }
    } catch (_) {}
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  /* ---------- Formatting ---------- */
  let moneyFmt, moneyFmtShort;
  function setupFormatters() {
    const cur = state.settings.currency || "INR";
    const locale = cur === "INR" ? "en-IN" : undefined;
    try {
      moneyFmt = new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: 0 });
      moneyFmtShort = new Intl.NumberFormat(locale, { style: "currency", currency: cur, notation: "compact", maximumFractionDigits: 1 });
    } catch (_) {
      moneyFmt = moneyFmtShort = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    }
  }
  const money = (n) => moneyFmt.format(Math.round(n || 0));
  const moneyShort = (n) => (Math.abs(n) >= 100000 ? moneyFmtShort.format(n) : money(n));

  /* ---------- Derived numbers ---------- */
  const guestSize = (g) => Math.max(0, (g.adults | 0) + (g.kids | 0));
  const dishTotal = (d) => num(d.qty) * num(d.price);

  function totals() {
    const by = { going: 0, maybe: 0, invited: 0, declined: 0 };
    const people = { going: 0, maybe: 0, invited: 0, declined: 0 };
    for (const g of state.guests) { by[g.status]++; people[g.status] += guestSize(g); }
    const headcount = people.going + people.maybe;
    const invitedPeople = people.going + people.maybe + people.invited + people.declined;
    const foodCost = state.dishes.reduce((s, d) => s + dishTotal(d), 0);
    const expCost = state.expenses.reduce((s, e) => s + num(e.amount), 0);
    const spent = expCost + (state.settings.includeDishes ? foodCost : 0);
    const paid = state.expenses.filter((e) => e.paid).reduce((s, e) => s + num(e.amount), 0);
    return { by, people, headcount, invitedPeople, foodCost, expCost, spent, paid, perGuest: headcount ? spent / headcount : 0 };
  }

  /* =========================================================
     Rendering
     ========================================================= */
  function renderAll() {
    setupFormatters();
    renderHeader();
    renderOverview();
    renderGuests();
    renderDishes();
    renderExpenses();
  }

  function renderHeader() {
    const s = state.settings;
    $("#partyName").textContent = s.name || "Diwali Night";
    $("#heroTitle").textContent = s.name || "Diwali Night";
    document.title = `${s.name || "Diwali"} · Party Planner`;
    const badge = $("#heroBadge");
    badge.innerHTML = s.birthday
      ? `<span class="ms fill">cake</span> Diwali + ${esc(s.birthdayName ? s.birthdayName + "'s " : "")}Birthday`
      : `<span class="ms fill">celebration</span> Festival of Lights`;
    $("#eyebrow").textContent = s.birthday ? "शुभ दीपावली · 🎂" : "शुभ दीपावली";
    const d = s.date ? new Date(s.date) : null;
    const dateText = d && !isNaN(d)
      ? d.toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })
      : "Set your party date in settings";
    $("#heroDate").textContent = s.venue ? `${dateText} · ${s.venue}` : dateText;
    tickCountdown();
  }

  function renderOverview() {
    const t = totals();
    animateCount($('[data-count="headcount"]'), t.headcount);
    animateCount($('[data-count="dishes"]'), state.dishes.length);
    animateCount($('[data-count="spent"]'), t.spent, true);
    animateCount($('[data-count="perGuest"]'), t.perGuest, true);
    $("#statGuestsSub").textContent = `${t.by.going} going · ${t.by.maybe} maybe`;
    const ordered = state.dishes.filter((d) => d.ordered).length;
    $("#statDishesSub").textContent = `${ordered} ordered · ${money(t.foodCost)}`;
    $("#statSpentSub").textContent = `${money(t.paid)} paid so far`;

    // Budget ring
    const budget = num(state.settings.budget);
    const pct = budget ? (t.spent / budget) * 100 : 0;
    const bar = $("#ringBar");
    requestAnimationFrame(() => { bar.style.strokeDasharray = `${Math.min(pct, 100)} 100`; });
    bar.classList.toggle("over", pct > 100);
    $("#ringPct").textContent = budget ? `${Math.round(pct)}%` : "—";
    if (!budget) {
      $("#budgetLeft").textContent = "No budget set";
      $("#budgetLine").textContent = `Spent ${money(t.spent)}`;
    } else if (t.spent > budget) {
      $("#budgetLeft").textContent = `${money(t.spent - budget)} over`;
      $("#budgetLine").textContent = `${money(t.spent)} of ${money(budget)}`;
    } else {
      $("#budgetLeft").textContent = `${money(budget - t.spent)} left`;
      $("#budgetLine").textContent = `${money(t.spent)} of ${money(budget)}`;
    }

    // Breakdown
    const cats = {};
    for (const e of state.expenses) cats[e.category] = (cats[e.category] || 0) + num(e.amount);
    if (state.settings.includeDishes && t.foodCost) cats["Food orders"] = t.foodCost;
    const rows = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;
    const bd = $("#breakdown");
    bd.innerHTML = rows.length
      ? rows.map(([k, v], i) => `
        <div class="bd-row">
          <span class="name"><span class="dot" style="background:${PALETTE[i % PALETTE.length]}"></span>${EXP_EMOJI[k] || "🧾"} ${esc(k)}</span>
          <span class="amt">${money(v)}</span>
          <div class="bd-track"><div class="bd-fill" data-w="${(v / max) * 100}" style="background:${PALETTE[i % PALETTE.length]}"></div></div>
        </div>`).join("")
      : `<p class="muted">Add expenses or dishes to see your spending breakdown.</p>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$(".bd-fill", bd).forEach((el) => (el.style.width = el.dataset.w + "%"))));

    // RSVP
    const total = state.guests.length;
    const order = ["going", "maybe", "invited", "declined"];
    $("#rsvpBar").innerHTML = total
      ? order.filter((k) => t.by[k]).map((k) => `<span style="flex-grow:${t.by[k]};background:${STATUS_COLOR[k]}"></span>`).join("")
      : "";
    $("#rsvpLegend").innerHTML = total
      ? order.map((k) => `<span><i style="background:${STATUS_COLOR[k]}"></i>${STATUS_LABEL[k]} <b>${t.by[k]}</b></span>`).join("")
      : `<span class="muted">No guests yet — add your first invite!</span>`;
  }

  function animateCount(el, to, isMoney = false) {
    const from = num(el.dataset.v);
    el.dataset.v = to;
    const fmt = (v) => (isMoney ? moneyShort(v) : Math.round(v).toLocaleString());
    if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now(), dur = 900;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const empty = (art, title, text) => `<li class="empty"><span class="art">${art}</span><h4>${title}</h4><p>${text}</p></li>`;
  const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const toneFor = (s) => AVATAR_TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

  /* ----- Guests ----- */
  let guestFilter = "all", guestQuery = "";
  function renderGuests() {
    const t = totals();
    $("#guestSummary").textContent = `${state.guests.length} invites · ${t.invitedPeople} people · ${t.people.going} confirmed`;
    const q = guestQuery.trim().toLowerCase();
    const list = state.guests
      .filter((g) => guestFilter === "all" || g.status === guestFilter)
      .filter((g) => !q || g.name.toLowerCase().includes(q) || (g.phone || "").includes(q))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name));
    const ul = $("#guestList");
    if (!state.guests.length) { ul.innerHTML = empty("🪔", "No guests yet", "Tap “Add guest” to start your invite list."); return; }
    if (!list.length) { ul.innerHTML = empty("🔍", "No matches", "Try a different search or filter."); return; }
    ul.innerHTML = list.map((g, i) => {
      const [bg, fg] = toneFor(g.name);
      const size = guestSize(g);
      const parts = [`${size} ${size === 1 ? "person" : "people"}`];
      if (g.kids) parts.push(`${g.kids} kid${g.kids > 1 ? "s" : ""}`);
      if (g.note) parts.push(g.note);
      return `<li class="item" style="--i:${i}" data-id="${g.id}">
        <span class="avatar" style="background:${bg};color:${fg}">${esc(initials(g.name))}</span>
        <div class="item-main" data-edit="guest">
          <div class="item-title">${esc(g.name)}</div>
          <div class="item-sub">${esc(parts.join(" · "))}</div>
        </div>
        <div class="item-end">
          ${g.phone ? `<a class="icon-btn" href="tel:${esc(g.phone)}" aria-label="Call ${esc(g.name)}"><span class="ms">phone</span></a>` : ""}
          <button class="status st-${g.status}" data-cycle="guest" aria-label="RSVP: ${STATUS_LABEL[g.status]}, tap to change">${STATUS_LABEL[g.status]}</button>
        </div>
      </li>`;
    }).join("");
  }

  /* ----- Dishes ----- */
  let dishFilter = "all";
  function renderDishes() {
    const t = totals();
    const ordered = state.dishes.filter((d) => d.ordered).length;
    $("#dishSummary").textContent = `${state.dishes.length} dishes for ${t.headcount || 0} expected guests`;
    $("#dishStats").innerHTML = `
      <div><b>${state.dishes.length}</b><span>Dishes</span></div>
      <div><b>${ordered}/${state.dishes.length}</b><span>Ordered</span></div>
      <div><b>${moneyShort(t.foodCost)}</b><span>Food cost</span></div>`;
    const list = state.dishes
      .filter((d) => dishFilter === "all" || d.category === dishFilter)
      .sort((a, b) => DISH_CATS.indexOf(a.category) - DISH_CATS.indexOf(b.category) || a.name.localeCompare(b.name));
    const ul = $("#dishList");
    if (!state.dishes.length) { ul.innerHTML = empty("🍛", "No dishes yet", "Add the dishes you're ordering — samosas, paneer, jalebi…"); return; }
    if (!list.length) { ul.innerHTML = empty("🍽️", "Nothing here", "No dishes in this category yet."); return; }
    ul.innerHTML = list.map((d, i) => {
      const serves = num(d.serves);
      const cover = t.headcount && serves ? Math.min(100, (serves / t.headcount) * 100) : 0;
      const sub = [`${num(d.qty)} ${d.unit}`];
      if (num(d.price)) sub.push(money(dishTotal(d)));
      if (serves) sub.push(`serves ${serves}`);
      if (d.vendor) sub.push(d.vendor);
      return `<li class="item" style="--i:${i}" data-id="${d.id}">
        <span class="cat-icon" style="background:var(--surface-c-high)">${DISH_EMOJI[d.category] || "🍽️"}</span>
        <div class="item-main" data-edit="dish">
          <div class="item-title"><span class="veg ${d.veg ? "" : "non"}" title="${d.veg ? "Veg" : "Non-veg"}"></span>${esc(d.name)}</div>
          <div class="item-sub">${esc(sub.join(" · "))}</div>
          ${serves && t.headcount ? `<div class="serve-bar" title="Covers ${Math.round(cover)}% of expected guests"><i class="${cover < 80 ? "low" : ""}" style="width:${cover}%"></i></div>` : ""}
        </div>
        <div class="item-end">
          <button class="status st-${d.ordered ? "ordered" : "pending"}" data-cycle="dish">${d.ordered ? "✓ Ordered" : "To order"}</button>
        </div>
      </li>`;
    }).join("");
  }

  /* ----- Expenses ----- */
  function renderExpenses() {
    const t = totals();
    $("#expenseSummary").textContent = state.settings.includeDishes && t.foodCost
      ? `Includes ${money(t.foodCost)} of food orders from Dishes`
      : `${state.expenses.length} expenses logged`;
    $("#expenseStats").innerHTML = `
      <div><b>${moneyShort(t.spent)}</b><span>Total</span></div>
      <div><b>${moneyShort(t.paid)}</b><span>Paid</span></div>
      <div><b>${moneyShort(t.expCost - t.paid)}</b><span>Due</span></div>`;
    const ul = $("#expenseList");
    const list = [...state.expenses].sort((a, b) => (b.date || "").localeCompare(a.date || "") || num(b.amount) - num(a.amount));
    let html = "";
    if (state.settings.includeDishes && t.foodCost) {
      html += `<li class="item" style="--i:0">
        <span class="cat-icon" style="background:var(--primary-container)">🍛</span>
        <div class="item-main" data-goto="dishes">
          <div class="item-title">Food orders</div>
          <div class="item-sub">${state.dishes.length} dishes · auto from Dishes tab</div>
        </div>
        <div class="item-end"><span class="amount">${money(t.foodCost)}</span></div>
      </li>`;
    }
    if (!list.length && !html) { ul.innerHTML = empty("🎆", "No expenses yet", "Track decor, diyas, fireworks, gifts and more."); return; }
    html += list.map((e, i) => {
      const sub = [e.category];
      if (e.date) sub.push(new Date(e.date + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }));
      if (e.note) sub.push(e.note);
      return `<li class="item" style="--i:${i + 1}" data-id="${e.id}">
        <span class="cat-icon" style="background:var(--surface-c-high)">${EXP_EMOJI[e.category] || "🧾"}</span>
        <div class="item-main" data-edit="expense">
          <div class="item-title">${esc(e.title)}</div>
          <div class="item-sub">${esc(sub.join(" · "))}</div>
        </div>
        <div class="item-end">
          <span class="amount">${money(num(e.amount))}</span>
          <button class="status st-${e.paid ? "paid" : "due"}" data-cycle="expense">${e.paid ? "Paid" : "Due"}</button>
        </div>
      </li>`;
    }).join("");
    ul.innerHTML = html;
  }

  /* =========================================================
     Navigation
     ========================================================= */
  let currentView = "overview";
  const FAB_LABEL = { overview: "Add", guests: "Add guest", dishes: "Add dish", expenses: "Add expense" };
  function go(view) {
    if (view === currentView) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    currentView = view;
    $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.nav === view));
    $("#fabLabel").textContent = FAB_LABEL[view];
    $("#fab").setAttribute("aria-label", FAB_LABEL[view]);
    $("#fab").classList.remove("compact");
    window.scrollTo({ top: 0 });
    heroFx.setActive(view === "overview");
    haptic(8);
  }
  $("#navbar").addEventListener("click", (e) => { const b = e.target.closest("[data-nav]"); if (b) go(b.dataset.nav); });
  document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) go(g.dataset.goto); });

  // App bar elevation + FAB compaction on scroll
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    $("#appbar").classList.toggle("scrolled", y > 8);
    $("#fab").classList.toggle("compact", y > 40 && y > lastY);
    lastY = y;
  }, { passive: true });

  /* =========================================================
     Bottom sheet & forms
     ========================================================= */
  const sheet = $("#sheet"), scrim = $("#scrim"), form = $("#sheetForm");
  let onSubmit = null, lastFocus = null;

  function openSheet(title, html, submit) {
    lastFocus = document.activeElement;
    $("#sheetTitle").textContent = title;
    form.innerHTML = html;
    onSubmit = submit;
    form.onclick = null;
    scrim.hidden = false; sheet.hidden = false;
    scrim.classList.remove("closing"); sheet.classList.remove("closing");
    sheet.style.transform = "";
    document.body.style.overflow = "hidden";
    wireFormWidgets();
    setTimeout(() => { const f = form.querySelector("[autofocus]"); if (f && matchMedia("(hover: hover)").matches) f.focus(); }, 350);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.add("closing"); scrim.classList.add("closing");
    document.body.style.overflow = "";
    setTimeout(() => { sheet.hidden = true; scrim.hidden = true; form.innerHTML = ""; onSubmit = null; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  scrim.addEventListener("click", closeSheet);
  $("#sheetClose").addEventListener("click", closeSheet);
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    const data = Object.fromEntries(new FormData(form).entries());
    $$("input[type=checkbox]", form).forEach((c) => (data[c.name] = c.checked));
    if (onSubmit(data) !== false) closeSheet();
  });

  // Drag the handle down to dismiss
  (() => {
    let startY = null, dy = 0;
    const handle = $("#sheetHandle");
    handle.addEventListener("pointerdown", (e) => { startY = e.clientY; dy = 0; handle.setPointerCapture(e.pointerId); sheet.style.transition = "none"; });
    handle.addEventListener("pointermove", (e) => { if (startY === null) return; dy = Math.max(0, e.clientY - startY); sheet.style.transform = `translate3d(0,${dy}px,0)`; });
    const end = () => {
      if (startY === null) return;
      startY = null; sheet.style.transition = "transform .25s cubic-bezier(.2,0,0,1)";
      if (dy > 100) { closeSheet(); } else { sheet.style.transform = ""; }
      setTimeout(() => (sheet.style.transition = ""), 260);
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  })();

  // Keep the sheet above the on-screen keyboard (iOS Safari / Samsung Internet)
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const onVV = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", kb > 80 ? kb + "px" : "0px");
    };
    vv.addEventListener("resize", onVV);
    vv.addEventListener("scroll", onVV);
  }

  function wireFormWidgets() {
    $$(".stepper", form).forEach((st) => {
      const input = $("input", st), out = $("output", st);
      const min = num(input.min);
      st.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-step]"); if (!b) return;
        e.preventDefault();
        const v = Math.max(min, num(input.value) + num(b.dataset.step));
        input.value = v; out.textContent = v; haptic(5);
      });
    });
  }

  /* ----- Field helpers ----- */
  const field = (name, label, value = "", attrs = "") =>
    `<div class="field"><input id="f-${name}" name="${name}" value="${esc(value)}" placeholder=" " ${attrs} /><label for="f-${name}">${label}</label></div>`;
  const select = (name, label, options, value) =>
    `<div class="field"><select id="f-${name}" name="${name}">${options.map((o) => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select><label for="f-${name}">${label}</label></div>`;
  const seg = (name, title, options, value) =>
    `<div><p class="seg-title">${title}</p><div class="seg" role="radiogroup">${options.map(([v, l], i) =>
      `<input type="radio" id="s-${name}-${i}" name="${name}" value="${v}" ${v === value ? "checked" : ""}/><label for="s-${name}-${i}">${l}</label>`).join("")}</div></div>`;
  const stepper = (name, label, value, min = 0) =>
    `<div class="stepper"><span class="lbl">${label}</span><div class="ctl"><button type="button" data-step="-1" aria-label="Decrease ${label}">−</button><output>${value}</output><button type="button" data-step="1" aria-label="Increase ${label}">+</button></div><input type="hidden" name="${name}" value="${value}" min="${min}"/></div>`;
  const toggle = (name, label, checked, hint = "") =>
    `<label class="switch-row"><span>${label}${hint ? `<small>${hint}</small>` : ""}</span><span class="switch"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}/><i></i></span></label>`;
  const actions = (isEdit) =>
    `<div class="form-actions">${isEdit ? `<button type="button" class="btn-danger" data-delete><span class="ms">delete</span> Delete</button>` : ""}<span class="spacer"></span><button type="submit" class="btn-filled"><span class="ms">check</span> ${isEdit ? "Save" : "Add"}</button></div>`;

  function bindDelete(collection, item, label) {
    const btn = $("[data-delete]", form);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const idx = state[collection].indexOf(item);
      if (idx < 0) return;
      state[collection].splice(idx, 1);
      commit();
      closeSheet();
      snack(`Deleted ${label}`, "Undo", () => { state[collection].splice(idx, 0, item); commit(); });
    });
  }

  /* ----- Guest form ----- */
  function guestForm(g) {
    const isEdit = !!g;
    g = g || { name: "", adults: 1, kids: 0, status: "invited", phone: "", note: "" };
    openSheet(isEdit ? "Edit guest" : "Add guest", `
      ${field("name", "Guest or family name", g.name, 'autofocus required enterkeyhint="next" autocapitalize="words"')}
      <div class="row">${stepper("adults", "Adults", g.adults, 0)}${stepper("kids", "Kids", g.kids, 0)}</div>
      ${seg("status", "RSVP", GUEST_STATUS.map((s) => [s, STATUS_LABEL[s]]), g.status)}
      ${field("phone", "Phone (optional)", g.phone, 'type="tel" inputmode="tel" autocomplete="tel"')}
      ${field("note", "Note (optional)", g.note, 'enterkeyhint="done"')}
      ${actions(isEdit)}
    `, (d) => {
      if (!d.name.trim()) { shake($("#f-name")); return false; }
      const wasGoing = g.status === "going";
      const next = { ...g, id: g.id || uid(), name: d.name.trim(), adults: num(d.adults) | 0, kids: num(d.kids) | 0, status: d.status || "invited", phone: d.phone.trim(), note: d.note.trim() };
      upsert("guests", next);
      snack(isEdit ? "Guest updated" : `${next.name} added to the list 🪔`);
      if (next.status === "going" && !wasGoing) celebrate();
    });
    bindDelete("guests", g, g.name);
  }

  /* ----- Dish form ----- */
  function dishForm(d) {
    const isEdit = !!d;
    const t = totals();
    d = d || { name: "", category: dishFilter !== "all" ? dishFilter : "Starters", veg: true, qty: 1, unit: "trays", price: "", serves: t.headcount || "", vendor: "", ordered: false };
    openSheet(isEdit ? "Edit dish" : "Add dish", `
      ${field("name", "Dish name", d.name, 'autofocus required autocapitalize="sentences"')}
      <div class="row">${select("category", "Category", DISH_CATS, d.category)}${select("unit", "Unit", DISH_UNITS, d.unit)}</div>
      ${seg("veg", "Type", [["1", "🟢 Veg"], ["0", "🔺 Non-veg"]], d.veg ? "1" : "0")}
      <div class="row">
        ${field("qty", "Quantity", d.qty, 'type="number" inputmode="decimal" min="0" step="any"')}
        ${field("price", "Price per unit", d.price, 'type="number" inputmode="decimal" min="0" step="any"')}
      </div>
      <div class="row">
        ${field("serves", "Serves (people)", d.serves, 'type="number" inputmode="numeric" min="0"')}
        ${field("vendor", "Caterer / shop", d.vendor)}
      </div>
      ${toggle("ordered", "Order placed", d.ordered, "Mark once you've confirmed with the caterer")}
      <p class="form-note" id="dishCalc"></p>
      ${actions(isEdit)}
    `, (v) => {
      if (!v.name.trim()) { shake($("#f-name")); return false; }
      const wasOrdered = d.ordered;
      const next = { ...d, id: d.id || uid(), name: v.name.trim(), category: v.category, unit: v.unit, veg: v.veg === "1", qty: num(v.qty), price: num(v.price), serves: num(v.serves), vendor: v.vendor.trim(), ordered: !!v.ordered };
      upsert("dishes", next);
      snack(isEdit ? "Dish updated" : `${next.name} added 🍛`);
      if (next.ordered && !wasOrdered) celebrate();
    });
    const calc = () => {
      const q = num($("#f-qty").value), p = num($("#f-price").value);
      $("#dishCalc").textContent = q && p ? `Line total: ${money(q * p)}` : "Tip: “Serves” is compared against your expected guest count.";
    };
    $("#f-qty").addEventListener("input", calc); $("#f-price").addEventListener("input", calc); calc();
    bindDelete("dishes", d, d.name);
  }

  /* ----- Expense form ----- */
  function expenseForm(e) {
    const isEdit = !!e;
    e = e || { title: "", category: "Decor & Lights", amount: "", paid: true, date: new Date().toISOString().slice(0, 10), note: "" };
    openSheet(isEdit ? "Edit expense" : "Add expense", `
      ${field("title", "What was it for?", e.title, 'autofocus required autocapitalize="sentences"')}
      <div class="row">
        ${field("amount", `Amount (${state.settings.currency})`, e.amount, 'type="number" inputmode="decimal" min="0" step="any" required')}
        ${field("date", "Date", e.date, 'type="date"')}
      </div>
      ${select("category", "Category", EXP_CATS, e.category)}
      ${toggle("paid", "Already paid", e.paid)}
      ${field("note", "Note (optional)", e.note)}
      ${actions(isEdit)}
    `, (v) => {
      if (!v.title.trim()) { shake($("#f-title")); return false; }
      if (!(num(v.amount) > 0)) { shake($("#f-amount")); return false; }
      upsert("expenses", { ...e, id: e.id || uid(), title: v.title.trim(), amount: num(v.amount), date: v.date, category: v.category, paid: !!v.paid, note: v.note.trim() });
      snack(isEdit ? "Expense updated" : "Expense added");
    });
    bindDelete("expenses", e, e.title);
  }

  /* ----- Settings ----- */
  function settingsForm(focusBudget = false) {
    const s = state.settings;
    openSheet("Party settings", `
      ${field("name", "Party name", s.name, 'autocapitalize="words"')}
      ${field("date", "Date & time", s.date, 'type="datetime-local"')}
      ${field("venue", "Venue (optional)", s.venue)}
      <div class="row">
        ${field("budget", "Budget", s.budget, `type="number" inputmode="decimal" min="0" step="any" ${focusBudget ? "autofocus" : ""}`)}
        ${select("currency", "Currency", ["INR", "USD", "GBP", "EUR", "AED", "CAD", "AUD", "SGD"], s.currency)}
      </div>
      ${toggle("birthday", "It's also a birthday 🎂", s.birthday, "Adds a birthday badge to the header")}
      ${field("birthdayName", "Birthday star's name (optional)", s.birthdayName)}
      ${toggle("includeDishes", "Count dish orders as expenses", s.includeDishes, "Adds dish totals to your spend & budget")}
      <div class="divider"></div>
      <div class="quick-grid">
        <button type="button" data-act="export"><span class="ms">download</span><span>Back up data<small>Download a .json file</small></span></button>
        <button type="button" data-act="import"><span class="ms">upload</span><span>Restore backup<small>Load a .json file</small></span></button>
        <button type="button" data-act="sample"><span class="ms">celebration</span><span>Load sample party<small>See how it looks with data</small></span></button>
        <button type="button" data-act="reset" style="color:var(--error)"><span class="ms">delete</span><span>Clear everything<small>Start a fresh plan</small></span></button>
      </div>
      <div class="form-actions"><span class="spacer"></span><button type="submit" class="btn-filled"><span class="ms">check</span> Save</button></div>
    `, (v) => {
      Object.assign(state.settings, {
        name: v.name.trim() || "Diwali Night", date: v.date, venue: v.venue.trim(),
        budget: num(v.budget), currency: v.currency, birthday: !!v.birthday,
        birthdayName: v.birthdayName.trim(), includeDishes: !!v.includeDishes,
      });
      commit();
      snack("Settings saved ✨");
    });
    form.onclick = (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const act = b.dataset.act;
      if (act === "export") exportData();
      if (act === "import") $("#importFile").click();
      if (act === "sample") {
        if (hasData() && !confirm("Replace your current plan with sample data?")) return;
        state = sampleState(); commit(); closeSheet(); snack("Sample party loaded 🎉"); celebrate();
      }
      if (act === "reset") {
        if (!confirm("Clear all guests, dishes and expenses? This can't be undone.")) return;
        const theme = state.settings.theme;
        state = defaultState(); state.settings.theme = theme; commit(); closeSheet(); snack("Fresh start 🪔");
      }
    };
  }

  function quickAddSheet() {
    openSheet("Add to your party", `
      <div class="quick-grid">
        <button type="button" data-q="guest"><span class="avatar s-primary"><span class="ms fill">person_add</span></span><span>Guest<small>Invite a friend or family</small></span></button>
        <button type="button" data-q="dish"><span class="avatar s-secondary"><span class="ms fill">restaurant</span></span><span>Dish<small>Add to the food order</small></span></button>
        <button type="button" data-q="expense"><span class="avatar s-tertiary"><span class="ms fill">payments</span></span><span>Expense<small>Decor, diyas, fireworks…</small></span></button>
      </div>`, null);
    form.onclick = (e) => {
      const b = e.target.closest("[data-q]"); if (!b) return;
      const which = b.dataset.q;
      sheet.hidden = true; // swap content without the close animation
      ({ guest: guestForm, dish: dishForm, expense: expenseForm })[which]();
    };
  }

  $("#fab").addEventListener("click", () => {
    haptic(10);
    ({ overview: quickAddSheet, guests: () => guestForm(), dishes: () => dishForm(), expenses: () => expenseForm() })[currentView]();
  });
  $("#settingsBtn").addEventListener("click", () => settingsForm());
  $("#editBudgetBtn").addEventListener("click", () => settingsForm(true));

  /* ----- List interactions (edit + quick status toggles) ----- */
  document.addEventListener("click", (e) => {
    const cyc = e.target.closest("[data-cycle]");
    if (cyc) {
      const id = cyc.closest("[data-id]").dataset.id;
      const kind = cyc.dataset.cycle;
      haptic(12);
      if (kind === "guest") {
        const g = state.guests.find((x) => x.id === id);
        const order = ["invited", "going", "maybe", "declined"];
        g.status = order[(order.indexOf(g.status) + 1) % order.length];
        if (g.status === "going") burst(e.clientX, e.clientY);
      } else if (kind === "dish") {
        const d = state.dishes.find((x) => x.id === id);
        d.ordered = !d.ordered;
        if (d.ordered) burst(e.clientX, e.clientY);
      } else if (kind === "expense") {
        const x = state.expenses.find((v) => v.id === id);
        x.paid = !x.paid;
        if (x.paid) burst(e.clientX, e.clientY);
      }
      commit(true);
      return;
    }
    const ed = e.target.closest("[data-edit]");
    if (ed) {
      const id = ed.closest("[data-id]").dataset.id;
      const kind = ed.dataset.edit;
      if (kind === "guest") guestForm(state.guests.find((x) => x.id === id));
      if (kind === "dish") dishForm(state.dishes.find((x) => x.id === id));
      if (kind === "expense") expenseForm(state.expenses.find((x) => x.id === id));
    }
  });

  $("#guestFilters").addEventListener("click", (e) => {
    const c = e.target.closest("[data-filter]"); if (!c) return;
    guestFilter = c.dataset.filter;
    $$("#guestFilters .chip").forEach((x) => x.classList.toggle("active", x === c));
    renderGuests();
  });
  $("#dishFilters").addEventListener("click", (e) => {
    const c = e.target.closest("[data-filter]"); if (!c) return;
    dishFilter = c.dataset.filter;
    $$("#dishFilters .chip").forEach((x) => x.classList.toggle("active", x === c));
    renderDishes();
  });
  $("#guestSearch").addEventListener("input", (e) => { guestQuery = e.target.value; renderGuests(); });

  function upsert(collection, item) {
    const arr = state[collection];
    const i = arr.findIndex((x) => x.id === item.id);
    if (i >= 0) arr[i] = item; else arr.push(item);
    commit(i >= 0);
  }
  // quiet = re-render without replaying the list entrance animation
  function commit(quiet = false) {
    save();
    if (quiet) document.body.classList.add("quiet");
    renderAll();
    if (quiet) requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("quiet")));
  }
  const hasData = () => state.guests.length || state.dishes.length || state.expenses.length;

  function shake(el) {
    if (!el) return;
    el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 320 });
    el.focus(); haptic([10, 40, 10]);
  }

  /* ----- Snackbar ----- */
  let snackTimer;
  function snack(text, actionLabel = "", action = null) {
    const bar = $("#snackbar"), btn = $("#snackAction");
    $("#snackText").textContent = text;
    btn.textContent = actionLabel;
    btn.onclick = action ? () => { action(); bar.classList.remove("show"); } : null;
    bar.classList.add("show");
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => bar.classList.remove("show"), action ? 5000 : 2600);
  }

  /* ----- Backup / share ----- */
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `diwali-party-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    snack("Backup downloaded");
  }
  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.guests) || !Array.isArray(d.dishes) || !Array.isArray(d.expenses)) throw new Error("bad file");
      state = { ...defaultState(), ...d, settings: { ...defaultState().settings, ...(d.settings || {}) } };
      commit(); closeSheet(); snack("Backup restored ✨");
    } catch (_) { snack("That file doesn't look like a party backup"); }
    e.target.value = "";
  });

  $("#shareBtn").addEventListener("click", async () => {
    const t = totals(), s = state.settings;
    const text = [
      `🪔 ${s.name}${s.birthday ? " + 🎂 Birthday" : ""}`,
      $("#heroDate").textContent,
      ``,
      `👥 Guests: ${t.headcount} expected (${t.by.going} going, ${t.by.maybe} maybe, ${t.by.invited} awaiting)`,
      `🍛 Dishes: ${state.dishes.length} (${state.dishes.filter((d) => d.ordered).length} ordered)`,
      `💰 Spent: ${money(t.spent)}${s.budget ? ` of ${money(s.budget)} budget` : ""}`,
      `🧮 Per guest: ${money(t.perGuest)}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: s.name, text });
      else { await navigator.clipboard.writeText(text); snack("Summary copied to clipboard"); }
    } catch (_) {}
  });

  /* ----- Theme ----- */
  function applyTheme() {
    const t = state.settings.theme;
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    $("#themeBtn .ms").textContent = dark ? "light_mode" : "dark_mode";
    $$('meta[name="theme-color"]').forEach((m) => {
      if (t === "system") m.setAttribute("content", m.media.includes("dark") ? "#17120e" : "#fff8f4");
      else m.setAttribute("content", dark ? "#17120e" : "#fff8f4");
    });
  }
  $("#themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.hasAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    state.settings.theme = dark ? "light" : "dark";
    save(); applyTheme(); haptic(8);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

  /* ----- Countdown ----- */
  function tickCountdown() {
    const el = $("#countdown");
    const target = new Date(state.settings.date).getTime();
    if (!target) { el.classList.remove("done"); $$("[data-cd]", el).forEach((b) => (b.textContent = "--")); return; }
    let diff = Math.max(0, target - Date.now());
    el.classList.toggle("done", diff === 0);
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    const set = (k, v) => { const b = $(`[data-cd="${k}"]`, el); const t = String(v).padStart(2, "0"); if (b.textContent !== t) b.textContent = t; };
    set("d", d); set("h", h); set("m", m); set("s", s);
  }
  setInterval(() => { if (!document.hidden) tickCountdown(); }, 1000);

  /* =========================================================
     Graphics: rangoli, lanterns, fireworks
     ========================================================= */
  (function buildRangoli() {
    const a = $(".rangoli .petals-a"), b = $(".rangoli .petals-b");
    let pa = "", pb = "";
    for (let i = 0; i < 12; i++) {
      const r = i * 30;
      pa += `<path d="M100 100 C 112 70, 112 40, 100 22 C 88 40, 88 70, 100 100Z" stroke="currentColor" transform="rotate(${r} 100 100)" opacity=".8"/>`;
      pb += `<circle cx="100" cy="36" r="4" fill="currentColor" transform="rotate(${r + 15} 100 100)" opacity=".7"/>`;
    }
    a.innerHTML = pa; b.innerHTML = pb;
  })();

  (function buildLanterns() {
    if (reduceMotion) return;
    const box = $("#lanterns");
    const count = innerWidth < 500 ? 7 : 11;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const scale = 0.55 + Math.random() * 0.7;
      s.style.left = `${Math.random() * 96}%`;
      s.style.transform = `scale(${scale})`;
      s.style.width = `${18 * scale}px`; s.style.height = `${26 * scale}px`;
      s.style.animationDuration = `${18 + Math.random() * 16}s`;
      s.style.animationDelay = `${-Math.random() * 30}s`;
      box.appendChild(s);
    }
  })();

  // Particle engine shared by the hero fireworks and the full-screen celebration layer
  function createFx(canvas, { auto = false, trail = false } = {}) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, particles = [], rockets = [], running = false, active = true, visible = true, nextAuto = 0;
    const COLORS = ["#ffd166", "#ff9f1c", "#ff5d8f", "#c77dff", "#7bdff2", "#ffffff", "#f4a261"];

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function explode(x, y, n = 70, palette) {
      const c1 = palette || COLORS[(Math.random() * COLORS.length) | 0];
      const c2 = COLORS[(Math.random() * COLORS.length) | 0];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        const sp = 1.2 + Math.random() * 3.2;
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.008 + Math.random() * 0.012, c: Math.random() < 0.7 ? c1 : c2, r: 1.2 + Math.random() * 1.6 });
      }
      start();
    }
    function launch(tx, ty) {
      rockets.push({ x: tx + (Math.random() - 0.5) * 40, y: h + 10, tx, ty, vy: -(5 + Math.random() * 2.5) });
      start();
    }
    function frame(now) {
      if (!running) return;
      if (trail) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "lighter";

      if (auto && active && visible && now > nextAuto) {
        launch(w * (0.2 + Math.random() * 0.6), h * (0.15 + Math.random() * 0.3));
        nextAuto = now + 1400 + Math.random() * 1600;
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy; r.vy *= 0.985; r.x += (r.tx - r.x) * 0.02;
        ctx.fillStyle = "#ffe8b0";
        ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.ty || r.vy > -1.2) { explode(r.x, r.y, 60 + ((Math.random() * 40) | 0)); rockets.splice(i, 1); }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.035;
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + p.life * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const idle = !particles.length && !rockets.length && !(auto && active && visible);
      if (idle) { running = false; ctx.clearRect(0, 0, w, h); return; }
      requestAnimationFrame(frame);
    }
    function start() { if (!running && w) { running = true; requestAnimationFrame(frame); } }
    resize();
    addEventListener("resize", resize);
    return {
      explode, launch, resize,
      get w() { return w; }, get h() { return h; },
      setActive(v) { active = v; if (v && auto && !reduceMotion) start(); },
      setVisible(v) { visible = v; if (v && auto && active && !reduceMotion) start(); },
    };
  }

  const heroCanvas = $("#heroFx");
  const heroFx = createFx(heroCanvas, { auto: !reduceMotion, trail: true });
  const fx = createFx($("#fx"));

  // Only animate the hero while it's on screen and the tab is visible (saves battery)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => heroFx.setVisible(en.isIntersecting && !document.hidden), { threshold: 0.05 }).observe($("#hero"));
  }
  document.addEventListener("visibilitychange", () => heroFx.setVisible(!document.hidden));

  $("#hero").addEventListener("click", (e) => {
    const r = heroCanvas.getBoundingClientRect();
    heroFx.launch(e.clientX - r.left, e.clientY - r.top);
    haptic(15);
  });

  function burst(x, y) {
    if (reduceMotion) return;
    fx.explode(x, y, 36);
  }
  function celebrate() {
    if (reduceMotion) return;
    const W = innerWidth, H = innerHeight;
    [0, 220, 440].forEach((d, i) => setTimeout(() => fx.launch(W * (0.25 + i * 0.25), H * (0.2 + Math.random() * 0.15)), d));
    haptic([15, 60, 15]);
  }

  /* ----- Sample data ----- */
  function sampleState() {
    const s = defaultState();
    s.settings = { ...s.settings, name: "Diwali Night 2026", venue: "Home", birthday: true, birthdayName: "Riya", budget: 60000, theme: state.settings.theme };
    const G = (name, adults, kids, status, phone = "", note = "") => ({ id: uid(), name, adults, kids, status, phone, note });
    s.guests = [
      G("Sharma family", 2, 2, "going", "", "Bringing rangoli colours"),
      G("Ananya & Rohit", 2, 0, "going"),
      G("Mehta family", 3, 1, "maybe"),
      G("Priya Nair", 1, 0, "going"),
      G("Kapoor uncle & aunty", 2, 0, "invited"),
      G("Arjun", 1, 0, "declined", "", "Travelling"),
      G("Gupta family", 2, 3, "going"),
      G("Neha & Vikram", 2, 1, "invited"),
    ];
    const D = (name, category, veg, qty, unit, price, serves, vendor, ordered) => ({ id: uid(), name, category, veg, qty, unit, price, serves, vendor, ordered });
    s.dishes = [
      D("Paneer tikka", "Starters", true, 3, "trays", 1800, 25, "Haldiram's", true),
      D("Samosa & chutney", "Starters", true, 40, "pcs", 25, 20, "Local halwai", true),
      D("Chicken seekh kebab", "Starters", false, 2, "trays", 2200, 16, "", false),
      D("Dal makhani", "Mains", true, 2, "trays", 1600, 25, "Haldiram's", true),
      D("Shahi paneer", "Mains", true, 2, "trays", 1900, 22, "Haldiram's", false),
      D("Butter naan", "Breads & Rice", true, 50, "pcs", 40, 25, "", false),
      D("Jeera rice", "Breads & Rice", true, 2, "trays", 900, 25, "", false),
      D("Kaju katli", "Sweets", true, 1.5, "kg", 1200, 30, "Bikanervala", true),
      D("Gulab jamun", "Sweets", true, 40, "pcs", 20, 20, "", false),
      D("Masala chaas", "Drinks", true, 6, "litres", 120, 24, "", false),
    ];
    const today = new Date();
    const day = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n).toISOString().slice(0, 10);
    const E = (title, category, amount, paid, n, note = "") => ({ id: uid(), title, category, amount, paid, date: day(n), note });
    s.expenses = [
      E("Fairy lights & torans", "Decor & Lights", 3500, true, 6),
      E("Clay diyas (50) & oil", "Diyas & Pooja", 1200, true, 5),
      E("Marigold flowers", "Decor & Lights", 1800, false, 1, "Deliver on the day"),
      E("Sparklers & anar", "Fireworks", 4500, true, 3),
      E("Return gift boxes", "Gifts & Sweets", 6000, false, 2),
      E("Birthday cake", "Birthday Cake", 2200, false, 0, "Chocolate truffle, 2kg"),
      E("Bluetooth speaker rental", "Music & Fun", 800, true, 4),
    ];
    return s;
  }

  /* ----- Boot ----- */
  applyTheme();
  renderAll();
  heroFx.setActive(true);
  // A welcoming burst on first open
  if (!reduceMotion) setTimeout(() => heroFx.launch(heroFx.w * 0.5, heroFx.h * 0.3), 600);
})();
