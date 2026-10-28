/* שמירת הברית — vanilla JS, no network, all data stays in localStorage */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const KEY = "shmira-v1";

  // ---------- vetted sources (all used in the plan) ----------
  const QUOTES = [
    { t: "איזהו גיבור? הכובש את יצרו", s: "משנה, אבות ד, א" },
    { t: "טוב ארך אפים מגבור, ומושל ברוחו מלוכד עיר", s: "משלי טז, לב" },
    { t: "כי שבע יפול צדיק וקם", s: "משלי כד, טז" },
    { t: "ויעזוב בגדו בידה וינס ויצא החוצה", s: "בראשית לט, יב" },
    { t: "אין יצר הרע שולט אלא במה שעיניו רואות", s: "סוטה ח, א" },
    { t: "בראתי יצר הרע, בראתי לו תורה תבלין", s: "קידושין ל, ב" },
    { t: "אל תאמין בעצמך עד יום מותך", s: "אבות ב, ד" },
  ];

  // ---------- storage ----------
  const defaults = { checks: {}, days: {}, best: 0, resets: [], resetActive: null, reminder: { on: false, time: "21:30", last: "" }, theme: "light" };
  let st;
  try { st = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { st = { ...defaults }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

  const pad = n => String(n).padStart(2, "0");
  const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dkey(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2800); };

  // ---------- theme ----------
  const applyTheme = () => {
    document.documentElement.dataset.theme = st.theme;
    $('meta[name="theme-color"]').content = st.theme === "dusk" ? "#1a130e" : "#1fb5a6";
  };
  applyTheme();
  $("#theme-btn").addEventListener("click", () => { st.theme = st.theme === "dusk" ? "light" : "dusk"; save(); applyTheme(); });

  // ---------- daily verse ----------
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const fillQuote = (fig, q) => { $("blockquote", fig).textContent = `״${q.t}״`; $("figcaption", fig).textContent = q.s; };
  fillQuote($("#daily-verse"), QUOTES[doy % QUOTES.length]);

  // ---------- streak logic ----------
  function streak() {
    let d = new Date(), n = 0;
    if (st.days[dkey(d)] !== "clean") d = addDays(d, -1);
    while (st.days[dkey(d)] === "clean") { n++; d = addDays(d, -1); }
    return n;
  }
  function totals() { const v = Object.values(st.days); return { clean: v.filter(x => x === "clean").length, resets: v.filter(x => x === "reset").length }; }

  function burst(x, y) {
    if (reduce.matches) return;
    for (let i = 0; i < 22; i++) {
      const s = document.createElement("span"); s.className = "burst"; document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 90;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r - 40}px) scale(.3)`, opacity: 0 }],
        { duration: 700 + Math.random() * 500, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => s.remove();
    }
  }

  function checkIn(ev) {
    const k = today();
    if (st.days[k] === "clean") { toast("כבר סימנת היום. ממשיכים חזק 💪"); return; }
    st.days[k] = "clean"; st.best = Math.max(st.best, streak()); save(); renderTracker();
    const r = ev?.currentTarget?.getBoundingClientRect?.(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2);
    const n = streak();
    const ms = { 7: "7 ימים! אבן דרך ראשונה 🎉", 30: "30 יום! זה כבר מי שאתה 🎉", 90: "90 יום! גבורה אמיתית 🎉" };
    toast(ms[n] || `יום ${n}. ״איזהו גיבור? הכובש את יצרו״`);
  }

  // ---------- tracker UI ----------
  const RESET_STEPS = [
    "עוצרים עכשיו. סוגרים את המסך ויוצאים מהחדר.",
    "מקלחת, אוכל, שינה. מחזירים את הגוף לאיזון.",
    "מספרים לשותף, בקצרה וביושר.",
    "מנתחים בלי שיפוט (יומן הנפילה נשמר).",
    "מעדכנים את התוכנית: איזה חור במערכת התגלה, ואיך סוגרים אותו?",
    "מתחילים מחדש מחר בבוקר, עם כוונה.",
  ];
  function renderTracker() {
    const n = streak(), t = totals(); st.best = Math.max(st.best || 0, n);
    $("#streak-mini").textContent = n;
    const host = $("#tracker"); if (!host) return;
    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(new Date(), -i), k = dkey(d), v = st.days[k] || "";
      const label = `${d.getDate()}/${d.getMonth() + 1}: ${v === "clean" ? "יום נקי" : v === "reset" ? "יום איפוס" : "לא סומן"}`;
      cells.push(`<span class="${v}${i === 0 ? " today" : ""}" role="img" aria-label="${label}" title="${label}"></span>`);
    }
    const checked = st.days[today()] === "clean";
    let reset = "";
    const ra = st.resetActive;
    if (ra && Date.now() - ra.start < 864e5) {
      const left = 864e5 - (Date.now() - ra.start), h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4);
      reset = `<div class="reset-panel" role="region" aria-label="איפוס 24 שעות">
        <h4>איפוס של 24 שעות פעיל · נותרו ${h}:${pad(m)}</h4>
        <ul class="contains-task-list">${RESET_STEPS.map((s, i) => `<li class="task-list-item"><label><input class="task-list-item-checkbox" type="checkbox" data-reset-step="${i}" ${ra.steps?.[i] ? "checked" : ""}><span>${s}</span></label></li>`).join("")}</ul>
      </div>`;
    }
    const logs = (st.resets || []).slice(-5).reverse().map(r => {
      const d = new Date(r.ts);
      return `<li><b>${d.getDate()}/${d.getMonth() + 1}</b> · ${r.triggers.length ? r.triggers.join(", ") : "בלי טריגר מסומן"}${r.change ? ` · <span class="muted">שינוי: ${esc(r.change)}</span>` : ""}</li>`;
    }).join("");
    host.innerHTML = `
      <div class="tracker-top">
        <div class="flame-count" aria-label="רצף נוכחי ${n} ימים"><div><b>${n}</b><small>ימים</small></div></div>
        <div>
          <div class="stats">
            <span class="stat">שיא: <b>${st.best}</b></span>
            <span class="stat">ימים נקיים: <b>${t.clean}</b></span>
            <span class="stat">פעמים שקמתי: <b>${t.resets}</b></span>
          </div>
          <button class="btn ${checked ? "done" : "btn-ember"}" data-checkin aria-pressed="${checked}">${checked ? "סימנת היום ✓" : "היום שמרתי ✓"}</button>
        </div>
      </div>
      <div class="heat" aria-label="30 הימים האחרונים">${cells.join("")}</div>
      <div class="legend"><span><i style="background:#1fb5a6"></i>יום נקי</span><span><i style="background:#ffb860"></i>יום איפוס (וקמתי)</span><span><i style="background:rgba(140,123,94,.3)"></i>לא סומן</span></div>
      ${reset}
      <div class="tracker-btns">
        <button class="btn btn-soft" data-open-reset>נפלתי. מתחילים איפוס</button>
        <button class="btn btn-ghost" id="settings-inline">תזכורת והגדרות</button>
      </div>
      ${logs ? `<details><summary>יומן הנפילות האחרונות (נשמר רק כאן)</summary><ul class="log-list">${logs}</ul></details>` : ""}`;
    bindDynamic(host);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function bindDynamic(root) {
    $$("[data-checkin]", root).forEach(b => b.onclick = checkIn);
    $$("[data-open-reset]", root).forEach(b => b.onclick = openReset);
    $$("[data-reset-step]", root).forEach(c => c.onchange = () => { st.resetActive.steps = st.resetActive.steps || {}; st.resetActive.steps[c.dataset.resetStep] = c.checked; save(); });
    const si = $("#settings-inline", root); if (si) si.onclick = openSettings;
  }

  // ---------- persistent checklists ----------
  $$("[data-check]").forEach(c => {
    c.checked = !!st.checks[c.dataset.check];
    c.addEventListener("change", () => { st.checks[c.dataset.check] = c.checked; save(); });
  });

  // ---------- reset flow ----------
  const resetDlg = $("#reset-dialog");
  function openReset() { $("#reset-form").reset(); resetDlg.showModal(); }
  resetDlg.addEventListener("close", () => {
    if (resetDlg.returnValue !== "save") return;
    const f = $("#reset-form");
    const triggers = $$('input[name="trigger"]:checked', f).map(i => i.value);
    st.resets.push({ ts: Date.now(), triggers, moment: f.moment.value.trim(), change: f.change.value.trim(), kind: f.kind.value.trim() });
    st.days[today()] = "reset"; st.resetActive = { start: Date.now(), steps: {} }; save(); renderTracker();
    toast("קמת. זה מה שקובע. 24 השעות של האיפוס התחילו 🌅");
    document.getElementById("tracker-card")?.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
  });

  // ---------- settings / reminder / data ----------
  const setDlg = $("#settings-dialog");
  function openSettings() { $("#rem-on").checked = st.reminder.on; $("#rem-time").value = st.reminder.time; closeDrawer(); setDlg.showModal(); }
  $("#settings-btn").addEventListener("click", openSettings);
  $("#rem-on").addEventListener("change", async e => {
    if (e.target.checked) {
      if (!("Notification" in window)) { toast("הדפדפן הזה לא תומך בהתראות"); e.target.checked = false; return; }
      const p = await Notification.requestPermission();
      if (p !== "granted") { toast("לא התקבלה הרשאה להתראות"); e.target.checked = false; return; }
    }
    st.reminder.on = e.target.checked; save();
  });
  $("#rem-time").addEventListener("change", e => { st.reminder.time = e.target.value || "21:30"; save(); });
  async function reminderTick() {
    const r = st.reminder; if (!r.on || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date(), [h, m] = r.time.split(":").map(Number);
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m || r.last === today() || st.days[today()]) return;
    r.last = today(); save();
    const opts = { body: "איך היה היום? רגע של צ׳ק-אין, ואז הטלפון מחוץ לחדר 🌙", icon: "assets/icons/icon-192.png", lang: "he", dir: "rtl", tag: "checkin" };
    try { const reg = await navigator.serviceWorker?.ready; reg ? reg.showNotification("שמירת הברית", opts) : new Notification("שמירת הברית", opts); } catch {}
  }
  setInterval(reminderTick, 60000); reminderTick();
  $("#export-btn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: "application/json" }));
    a.download = `shmira-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $("#import-file").addEventListener("change", async e => {
    try { const d = JSON.parse(await e.target.files[0].text()); st = Object.assign({}, defaults, d); save(); location.reload(); } catch { toast("הקובץ לא תקין"); }
  });
  $("#wipe-btn").addEventListener("click", () => {
    if (confirm("למחוק את כל הנתונים מהמכשיר הזה? אי אפשר לבטל.")) { localStorage.removeItem(KEY); location.reload(); }
  });

  // ---------- drawer ----------
  const drawer = $("#drawer"), menuBtn = $("#menu-btn");
  function openDrawer() { drawer.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); $(".nav-list a", drawer).focus(); }
  function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", openDrawer);
  $("#drawer-close").addEventListener("click", () => { closeDrawer(); menuBtn.focus(); });
  drawer.addEventListener("click", e => { if (e.target === drawer || e.target.closest("a")) closeDrawer(); });

  // ---------- emergency mode ----------
  const em = $("#emergency"); let lastFocus = null, breathT = null;
  function openEmergency() {
    lastFocus = document.activeElement; em.hidden = false; document.body.style.overflow = "hidden";
    fillQuote($("#em-quote"), QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    $$(".steps li", em).forEach(li => li.classList.remove("done"));
    $("#em-close").focus(); startBreath();
  }
  function closeEmergency() { em.hidden = true; document.body.style.overflow = ""; stopBreath(); lastFocus?.focus?.(); }
  $("#em-close").addEventListener("click", closeEmergency);
  $("#em-done").addEventListener("click", e => { burst(e.clientX, e.clientY); toast("עברת את הגל. זה ניצחון אמיתי 💪"); setTimeout(closeEmergency, 600); });
  $("#em-another").addEventListener("click", () => fillQuote($("#em-quote"), QUOTES[Math.floor(Math.random() * QUOTES.length)]));
  $$(".steps li", em).forEach(li => { li.tabIndex = 0; li.setAttribute("role", "checkbox"); li.setAttribute("aria-checked", "false");
    const tog = () => { li.classList.toggle("done"); li.setAttribute("aria-checked", li.classList.contains("done")); };
    li.addEventListener("click", tog); li.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tog(); } }); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (!em.hidden) closeEmergency(); else closeDrawer(); }
    if (e.key === "Tab" && !em.hidden) { // focus trap
      const f = $$("button, [tabindex='0'], a[href]", em).filter(x => x.offsetParent); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  function startBreath() {
    const lbl = $("#breath-label"); let phase = 0; lbl.textContent = "שאיפה";
    const c = $("#breath-circle"); c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    stopBreath(); breathT = setInterval(() => { phase = (phase + 1) % 10; lbl.textContent = phase < 4 ? "שאיפה" : "נשיפה"; }, 1000);
  }
  function stopBreath() { clearInterval(breathT); }
  // 10-minute timer
  const TOTAL = 600, C = 2 * Math.PI * 52; let left = TOTAL, tId = null;
  const ring = $("#ring-fg"), out = $("#timer-out"), startBtn = $("#timer-start");
  ring.style.strokeDasharray = C;
  const drawTimer = () => { out.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; ring.style.strokeDashoffset = C * (1 - left / TOTAL); };
  startBtn.addEventListener("click", () => {
    if (tId) { clearInterval(tId); tId = null; startBtn.textContent = "המשך"; return; }
    $("#timer-done").hidden = true; startBtn.textContent = "השהה";
    tId = setInterval(() => { left--; drawTimer(); if (left <= 0) { clearInterval(tId); tId = null; startBtn.textContent = "התחל"; left = TOTAL; $("#timer-done").hidden = false; navigator.vibrate?.(200); } }, 1000);
  });
  $("#timer-reset").addEventListener("click", () => { clearInterval(tId); tId = null; left = TOTAL; drawTimer(); startBtn.textContent = "התחל"; $("#timer-done").hidden = true; });
  drawTimer();

  // global bindings
  bindDynamic(document);
  $$("[data-open-emergency]").forEach(b => b.addEventListener("click", openEmergency));

  // ---------- scroll: fuse, parallax, current chapter, reveal ----------
  const fuse = $("#fuse"), heroBg = $("#hero-bg"), hero = $(".hero");
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement, max = h.scrollHeight - innerHeight;
      fuse.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
      if (!reduce.matches && scrollY < innerHeight * 1.2) heroBg.style.transform = `translate3d(0,${scrollY * .35}px,0) scale(${1 + scrollY / innerHeight * .06})`;
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(el => reduce.matches ? el.classList.add("in") : revealIO.observe(el));

  const navLinks = $$("[data-nav]");
  const chIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle("current", a.dataset.nav === e.target.dataset.chapter));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$(".chapter[data-chapter]").forEach(s => chIO.observe(s));

  // ---------- ember particles (canvas) ----------
  const cv = $("#embers"), ctx = cv.getContext("2d");
  let parts = [], W = 0, H = 0, raf = null, visible = true;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function spawn(init) {
    return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: .8 + Math.random() * 2.4, vy: .25 + Math.random() * .7,
      vx: (Math.random() - .5) * .3, ph: Math.random() * 6.28, life: 0, max: 300 + Math.random() * 400, hue: 18 + Math.random() * 28 };
  }
  function frame() {
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.life++; p.ph += .03; p.y -= p.vy; p.x += p.vx + Math.sin(p.ph) * .35;
      const a = Math.max(0, Math.min(1, p.life / 40) * (1 - p.life / p.max));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue + 20},100%,85%,${a})`); g.addColorStop(.35, `hsla(${p.hue},100%,58%,${a * .8})`); g.addColorStop(1, `hsla(${p.hue},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      if (p.life > p.max || p.y < -20) Object.assign(p, spawn(false));
    }
    raf = requestAnimationFrame(frame);
  }
  function startEmbers() {
    if (reduce.matches || raf || !visible || document.hidden) return;
    size(); const n = W < 700 ? 34 : 70; if (parts.length !== n) parts = Array.from({ length: n }, () => spawn(true)); frame();
  }
  function stopEmbers() { cancelAnimationFrame(raf); raf = null; }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? startEmbers() : stopEmbers(); }).observe(hero);
  document.addEventListener("visibilitychange", () => document.hidden ? stopEmbers() : startEmbers());
  addEventListener("resize", () => { if (raf) size(); });
  reduce.addEventListener?.("change", () => reduce.matches ? (stopEmbers(), ctx.clearRect(0, 0, W, H)) : startEmbers());
  startEmbers();

  renderTracker();
  if (location.hash === "#emergency") openEmergency();
  setInterval(renderTracker, 60000); // keep the 24h countdown fresh

  // ---------- service worker (offline) ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
