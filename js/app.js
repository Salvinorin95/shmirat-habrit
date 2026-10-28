/* שמירת הברית / Guarding the Covenant — vanilla JS, no network, all data stays in localStorage */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const KEY = "shmira-v1";          // storage key kept from v1 for backward compatibility
  const SCHEMA = 2;
  const TRIGGER_KEYS = ["hungry", "angry", "lonely", "tired", "bored", "phone_night", "alone_home", "other"];

  // ---------- storage + migration ----------
  const defaults = () => ({ v: SCHEMA, lang: null, checks: {}, days: {}, best: 0, resets: [], resetActive: null,
    reminder: { on: false, time: "21:30", last: "" }, partner: { name: "", weekly: false, day: 5, last: "" }, theme: "light" });
  function migrate(d) {
    d = d && typeof d === "object" ? d : {};
    if (!d.v || d.v < 2) {
      (d.resets || []).forEach(r => {
        r.triggers = (r.triggers || []).map(x => (window.LEGACY_TRIGGERS || {})[x] || x);
        if (r.hour == null && r.ts) r.hour = new Date(r.ts).getHours();
      });
      d.v = 2;
    }
    const base = defaults();
    return Object.assign(base, d, { reminder: Object.assign(base.reminder, d.reminder || {}), partner: Object.assign(base.partner, d.partner || {}),
      checks: d.checks || {}, days: d.days || {}, resets: Array.isArray(d.resets) ? d.resets : [] });
  }
  let st;
  try { st = migrate(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { st = defaults(); }
  if (!st.lang) { const n = ((navigator.languages && navigator.languages[0]) || navigator.language || "he").toLowerCase(); st.lang = /^(he|iw)/.test(n) ? "he" : "en"; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  save();

  // ---------- i18n helpers ----------
  const t = (k, ...a) => { const v = I18N[st.lang][k]; return typeof v === "function" ? v(...a) : v; };
  const pad = n => String(n).padStart(2, "0");
  const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dkey(new Date());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const fromKey = k => new Date(k + "T12:00:00");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const toast = msg => { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("show"), 2800); };

  // ---------- theme ----------
  const applyTheme = () => { document.documentElement.dataset.theme = st.theme; $('meta[name="theme-color"]').content = st.theme === "dusk" ? "#1a130e" : "#1fb5a6"; };
  applyTheme();
  $("#theme-btn").addEventListener("click", () => { st.theme = st.theme === "dusk" ? "light" : "dusk"; save(); applyTheme(); });

  // ---------- quotes ----------
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  let emQuoteIdx = 0;
  const fillQuote = (fig, i) => { const [q, s] = QUOTES[i][st.lang]; $("blockquote", fig).textContent = st.lang === "he" ? `״${q}״` : `“${q}”`; $("figcaption", fig).textContent = s; };

  // ---------- streak logic ----------
  function streak() {
    let d = new Date(), n = 0;
    if (st.days[dkey(d)] !== "clean") d = addDays(d, -1);
    while (st.days[dkey(d)] === "clean") { n++; d = addDays(d, -1); }
    return n;
  }
  function longest() {
    const ks = Object.keys(st.days).filter(k => st.days[k] === "clean").sort(); let best = 0, run = 0, prev = null;
    for (const k of ks) { const d = fromKey(k); run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return Math.max(best, st.best || 0);
  }
  const totals = () => { const v = Object.values(st.days); return { clean: v.filter(x => x === "clean").length, resets: v.filter(x => x === "reset").length }; };

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
    if (st.days[k] === "clean") { toast(t("already")); return; }
    st.days[k] = "clean"; st.best = Math.max(st.best, streak()); save(); renderAll();
    const r = ev?.currentTarget?.getBoundingClientRect?.(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2);
    const n = streak();
    toast({ 7: t("ms7"), 30: t("ms30"), 90: t("ms90") }[n] || t("day_n", n));
  }

  // ---------- tracker ----------
  function partnerDue() { const p = st.partner; return p.weekly && new Date().getDay() === Number(p.day) && p.last !== today(); }
  function renderTracker() {
    const n = streak(), tt = totals(); st.best = Math.max(st.best || 0, n);
    $("#streak-mini").textContent = n;
    const host = $("#tracker"); if (!host) return;
    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(new Date(), -i), v = st.days[dkey(d)] || "";
      const label = t("cell", d.toLocaleDateString(st.lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "numeric" }), v === "clean" ? t("lg_clean") : v === "reset" ? t("lg_reset") : t("lg_none"));
      cells.push(`<span class="${v}${i === 0 ? " today" : ""}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span>`);
    }
    const checked = st.days[today()] === "clean";
    let reset = "";
    const ra = st.resetActive;
    if (ra && Date.now() - ra.start < 864e5) {
      const left = 864e5 - (Date.now() - ra.start), h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4);
      reset = `<div class="reset-panel" role="region" aria-label="${t("reset_region")}"><h4>${t("reset_active", h, pad(m))}</h4>
        <ul class="contains-task-list">${t("reset_steps").map((s, i) => `<li class="task-list-item"><label><input class="task-list-item-checkbox" type="checkbox" data-reset-step="${i}" ${ra.steps?.[i] ? "checked" : ""}><span>${s}</span></label></li>`).join("")}</ul></div>`;
    }
    const logs = st.resets.slice(-5).reverse().map(r => {
      const d = new Date(r.ts), tr = (r.triggers || []).map(x => t("triggers")[x] || x);
      return `<li><b>${d.getDate()}/${d.getMonth() + 1}</b> · ${tr.length ? esc(tr.join(", ")) : t("no_trigger")}${r.change ? ` · <span class="muted">${t("change_lbl")}: ${esc(r.change)}</span>` : ""}</li>`;
    }).join("");
    const banner = partnerDue() ? `<div class="partner-banner" role="status"><p>🤝 ${esc(t("p_banner", st.partner.name))}</p>
      <div class="tracker-btns"><button class="btn btn-ember" data-open-share data-partner-send>${t("p_send")}</button><button class="btn btn-ghost" data-partner-later>${t("p_later")}</button></div></div>` : "";
    host.innerHTML = `${banner}
      <div class="tracker-top">
        <div class="flame-count" role="img" aria-label="${t("streak_aria", n)}"><div><b>${n}</b><small>${t("days")}</small></div></div>
        <div>
          <div class="stats-row">
            <span class="stat">${t("best")}: <b>${longest()}</b></span>
            <span class="stat">${t("clean_days")}: <b>${tt.clean}</b></span>
            <span class="stat">${t("rises")}: <b>${tt.resets}</b></span>
          </div>
          <div class="tracker-btns center">
            <button class="btn ${checked ? "done" : "btn-ember"}" data-checkin aria-pressed="${checked}">${checked ? t("checked_today") : t("checkin")}</button>
            <button class="btn btn-soft" data-open-share>📤 ${t("share")}</button>
          </div>
        </div>
      </div>
      <div class="heat" role="group" aria-label="${t("last30")}">${cells.join("")}</div>
      <div class="legend"><span><i style="background:#1fb5a6"></i>${t("lg_clean")}</span><span><i style="background:#ffb860"></i>${t("lg_reset")}</span><span><i style="background:rgba(140,123,94,.3)"></i>${t("lg_none")}</span></div>
      ${reset}
      <div class="tracker-btns">
        <button class="btn btn-soft" data-open-reset>${t("fell")}</button>
        <button class="btn btn-ghost" data-open-settings>${t("rem_settings")}</button>
      </div>
      ${logs ? `<details><summary>${t("log_title")}</summary><ul class="log-list">${logs}</ul></details>` : ""}`;
    bind(host);
    $$("[data-reset-step]", host).forEach(c => c.onchange = () => { st.resetActive.steps = st.resetActive.steps || {}; st.resetActive.steps[c.dataset.resetStep] = c.checked; save(); });
    $$("[data-partner-later],[data-partner-send]", host).forEach(b => b.addEventListener("click", () => { st.partner.last = today(); save(); setTimeout(renderTracker, 50); }));
  }

  // ---------- private insights (hand-drawn SVG) ----------
  const rtl = () => st.lang === "he";
  function vbars(values, labels, aria) {
    const W = 340, H = 170, top = 22, bottom = 26, max = Math.max(1, ...values), n = values.length, gap = 10, bw = (W - gap * (n + 1)) / n;
    let s = `<svg class="chart" direction="ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><defs><linearGradient id="gT${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee6d7"/><stop offset=".55" stop-color="#1fb5a6"/><stop offset="1" stop-color="#0e7c7b"/></linearGradient></defs>`;
    s += `<line x1="0" y1="${H - bottom}" x2="${W}" y2="${H - bottom}" class="axis"/>`;
    values.forEach((v, i) => {
      const idx = rtl() ? n - 1 - i : i, x = gap + idx * (bw + gap), h = (H - top - bottom) * v / max, y = H - bottom - h;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, v ? 3 : 1.5).toFixed(1)}" rx="6" fill="${v ? `url(#gT${n})` : "rgba(140,123,94,.25)"}"/>`;
      if (v) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="val">${v}</text>`;
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="lbl">${esc(labels[i])}</text>`;
    });
    return s + "</svg>";
  }
  function hbars(items, aria) {
    const W = 340, row = 30, H = items.length * row + 6, labelW = 118, max = Math.max(1, ...items.map(x => x[1]));
    let s = `<svg class="chart" direction="ltr" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><defs><linearGradient id="gE" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd56e"/><stop offset="1" stop-color="#ff8a1c"/></linearGradient></defs>`;
    items.forEach(([label, v], i) => {
      const y = 4 + i * row, bw = (W - labelW - 40) * v / max;
      if (rtl()) {
        s += `<text x="${W - 4}" y="${y + 19}" text-anchor="end" class="lbl">${esc(label)}</text>`;
        s += `<rect x="${(W - labelW - bw).toFixed(1)}" y="${y + 5}" width="${bw.toFixed(1)}" height="18" rx="9" fill="url(#gE)"/>`;
        s += `<text x="${(W - labelW - bw - 6).toFixed(1)}" y="${y + 19}" text-anchor="end" class="val">${v}</text>`;
      } else {
        s += `<text x="4" y="${y + 19}" class="lbl">${esc(label)}</text>`;
        s += `<rect x="${labelW}" y="${y + 5}" width="${bw.toFixed(1)}" height="18" rx="9" fill="url(#gE)"/>`;
        s += `<text x="${(labelW + bw + 6).toFixed(1)}" y="${y + 19}" class="val">${v}</text>`;
      }
    });
    return s + "</svg>";
  }
  function ring(pct) {
    const r = 46, C = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${pct}%"><circle cx="60" cy="60" r="${r}" class="ring-bg"/>
      <circle cx="60" cy="60" r="${r}" class="ring-val" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 60 60)"/>
      <text x="60" y="68" text-anchor="middle" class="ring-txt">${pct}%</text></svg>`;
  }
  function renderStats() {
    const host = $("#stats"); if (!host) return;
    const tt = totals(), marked = tt.clean + tt.resets, pct = marked ? Math.round(tt.clean / marked * 100) : 0;
    const wd = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(st.days).forEach(k => { if (st.days[k] === "clean") wd[fromKey(k).getDay()]++; });
    const trig = {}; let hours = [0, 0, 0, 0, 0, 0], unknown = 0;
    st.resets.forEach(r => {
      (r.triggers || []).forEach(x => trig[x] = (trig[x] || 0) + 1);
      const h = r.hour != null ? r.hour : (r.ts ? new Date(r.ts).getHours() : null);
      h == null || isNaN(h) ? unknown++ : hours[Math.min(5, Math.floor(h / 4))]++;
    });
    const tl = t("triggers");
    const trigItems = Object.entries(trig).sort((a, b) => b[1] - a[1]).map(([k, v]) => [tl[k] || k, v]);
    const wdAria = t("st_week") + ": " + wd.map((v, i) => `${t("wd_long")[i]} ${v}`).join(", ");
    const hrAria = t("st_time") + ": " + hours.map((v, i) => `${t("hours")[i]} ${v}`).join(", ");
    host.innerHTML = `
      <div class="insight-top">
        ${ring(pct)}
        <div class="insight-nums">
          <div class="stat big">${t("st_best")}: <b>${longest()}</b> ${t("days")}</div>
          <div class="stat">${t("st_pct")}: <b>${pct}%</b></div>
          <div class="stat">${t("st_marked")}: <b>${marked}</b></div>
        </div>
      </div>
      ${marked ? "" : `<p class="muted">${t("st_empty")}</p>`}
      <h4>${t("st_week")}</h4>${vbars(wd, t("wd"), wdAria)}
      <h4>${t("st_trig")}</h4>${trigItems.length ? hbars(trigItems, t("st_trig") + ": " + trigItems.map(x => x.join(" ")).join(", ")) : `<p class="muted">${t("st_trig_empty")}</p>`}
      ${st.resets.length ? `<h4>${t("st_time")}</h4>${vbars(hours, t("hours"), hrAria)}${unknown ? `<p class="muted small">${t("st_unknown", unknown)}</p>` : ""}` : ""}
      <p class="kind-note">${t("st_kind")}</p><p class="muted small">${t("st_device")}</p>`;
  }
  const renderAll = () => { renderTracker(); renderStats(); };

  // ---------- binding (works for re-mounted content too) ----------
  function bind(root) {
    $$("[data-checkin]", root).forEach(b => b.onclick = checkIn);
    $$("[data-open-reset]", root).forEach(b => b.onclick = openReset);
    $$("[data-open-share]", root).forEach(b => b.addEventListener("click", openShare));
    $$("[data-open-settings]", root).forEach(b => b.onclick = openSettings);
    $$("[data-open-emergency]", root).forEach(b => b.onclick = openEmergency);
  }
  let revealIO, chIO;
  function bindContent() {
    const c = $("#content");
    $$("[data-check]", c).forEach(el => { el.checked = !!st.checks[el.dataset.check]; el.onchange = () => { st.checks[el.dataset.check] = el.checked; save(); }; });
    bind(c);
    revealIO?.disconnect(); chIO?.disconnect();
    revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal", c).forEach(el => reduce.matches ? el.classList.add("in") : revealIO.observe(el));
    chIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$("[data-nav]").forEach(a => a.classList.toggle("current", a.dataset.nav === e.target.dataset.chapter)); }), { rootMargin: "-45% 0px -50% 0px" });
    $$(".chapter[data-chapter]", c).forEach(s => chIO.observe(s));
  }

  // ---------- language ----------
  function currentChapter() { const a = $("[data-nav].current"); return a ? a.dataset.nav : null; }
  function applyLang(keepPlace) {
    const L = st.lang, html = document.documentElement, ch = keepPlace ? currentChapter() : null, y = scrollY;
    html.lang = L; html.dir = L === "he" ? "rtl" : "ltr"; document.title = t("title");
    $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    $$("[data-i18n-html]").forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
    $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $$("[data-i18n-title]").forEach(el => el.title = t(el.dataset.i18nTitle));
    $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
    const lb = $("#lang-btn"); $("#lang-label").textContent = t("lang_label"); lb.setAttribute("lang", L === "he" ? "en" : "he");
    const c = $("#content");
    if ((c.dataset.lang || "he") !== L) { c.replaceChildren($("#tpl-" + L).content.cloneNode(true)); c.dataset.lang = L; }
    $("#nav-list").replaceChildren($("#tpl-nav-" + L).content.cloneNode(true));
    $("#steps-host").replaceChildren($("#tpl-steps-" + L).content.cloneNode(true)); bindSteps();
    $("#trigger-chips").innerHTML = TRIGGER_KEYS.map(k => `<label><input type="checkbox" name="trigger" value="${k}"><span>${t("triggers")[k]}</span></label>`).join("");
    $("#p-day").innerHTML = t("wd_long").map((d, i) => `<option value="${i}">${d}</option>`).join(""); $("#p-day").value = st.partner.day;
    fillQuote($("#daily-verse"), doy % QUOTES.length); fillQuote($("#em-quote"), emQuoteIdx);
    $("#breath-label").textContent = t("inhale"); $("#timer-start").textContent = tId ? t("t_pause") : left < TOTAL ? t("t_resume") : t("t_start");
    bindContent(); renderAll();
    if (keepPlace) { const target = ch && document.getElementById("ch-" + ch); target ? target.scrollIntoView({ behavior: "auto" }) : scrollTo(0, y); }
  }
  $("#lang-btn").addEventListener("click", () => { st.lang = st.lang === "he" ? "en" : "he"; save(); applyLang(true); toast(st.lang === "he" ? "עברית" : "English"); });

  // ---------- reset flow ----------
  const resetDlg = $("#reset-dialog");
  function openReset() { $("#reset-form").reset(); resetDlg.showModal(); }
  resetDlg.addEventListener("close", () => {
    if (resetDlg.returnValue !== "save") return;
    const f = $("#reset-form"), now = new Date();
    st.resets.push({ ts: now.getTime(), hour: now.getHours(), triggers: $$('input[name="trigger"]:checked', f).map(i => i.value),
      moment: f.moment.value.trim(), change: f.change.value.trim(), kind: f.kind.value.trim() });
    st.days[today()] = "reset"; st.resetActive = { start: Date.now(), steps: {} }; save(); renderAll();
    toast(t("r_toast"));
    document.getElementById("tracker-card")?.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
  });

  // ---------- share (privacy-safe: day count + link only) ----------
  const shareDlg = $("#share-dialog");
  const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");
  const shareText = () => t("sh_msg", streak());
  function openShare(e) {
    e?.preventDefault?.(); closeDrawer(); if ($("#settings-dialog").open) $("#settings-dialog").close();
    const msg = shareText(), url = appUrl(), full = `${msg}\n${url}`;
    $("#share-preview").textContent = full;
    $("#share-native").hidden = !navigator.share;
    $("#share-wa").href = "https://wa.me/?text=" + encodeURIComponent(full);
    $("#share-tg").href = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(msg);
    shareDlg.showModal();
  }
  $("#share-native").addEventListener("click", async () => { try { await navigator.share({ text: shareText(), url: appUrl() }); shareDlg.close(); } catch {} });
  $("#share-copy").addEventListener("click", async () => {
    const full = $("#share-preview").textContent;
    try { await navigator.clipboard.writeText(full); } catch {
      const ta = document.createElement("textarea"); ta.value = full; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove();
    }
    toast(t("sh_copied"));
  });

  // ---------- settings: partner, reminder, data ----------
  const setDlg = $("#settings-dialog");
  function openSettings() {
    $("#rem-on").checked = st.reminder.on; $("#rem-time").value = st.reminder.time;
    $("#p-name").value = st.partner.name; $("#p-weekly").checked = st.partner.weekly; $("#p-day").value = st.partner.day;
    closeDrawer(); setDlg.showModal();
  }
  $("#settings-btn").addEventListener("click", openSettings);
  $("#p-name").addEventListener("input", e => { st.partner.name = e.target.value.trim().slice(0, 40); save(); });
  $("#p-weekly").addEventListener("change", e => { st.partner.weekly = e.target.checked; save(); renderTracker(); });
  $("#p-day").addEventListener("change", e => { st.partner.day = Number(e.target.value); save(); renderTracker(); });
  setDlg.addEventListener("close", renderTracker);
  async function askNotify(el) {
    if (!("Notification" in window)) { toast(t("no_notif")); el.checked = false; return false; }
    const p = await Notification.requestPermission(); if (p !== "granted") { toast(t("no_perm")); el.checked = false; return false; }
    return true;
  }
  $("#rem-on").addEventListener("change", async e => { if (e.target.checked && !(await askNotify(e.target))) return; st.reminder.on = e.target.checked; save(); });
  $("#rem-time").addEventListener("change", e => { st.reminder.time = e.target.value || "21:30"; save(); });
  async function notify(body, tag) {
    const opts = { body, icon: "assets/icons/icon-192.png", lang: st.lang, dir: st.lang === "he" ? "rtl" : "ltr", tag };
    try { const reg = await navigator.serviceWorker?.getRegistration(); reg ? reg.showNotification(t("brand"), opts) : new Notification(t("brand"), opts); } catch {}
  }
  function reminderTick() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const r = st.reminder, now = new Date();
    if (r.on) { const [h, m] = r.time.split(":").map(Number);
      if (now.getHours() * 60 + now.getMinutes() >= h * 60 + m && r.last !== today() && !st.days[today()]) { r.last = today(); save(); notify(t("rem_body"), "checkin"); } }
    if (partnerDue() && st.partner.notified !== today()) { st.partner.notified = today(); save(); notify(t("p_banner", st.partner.name), "partner"); }
  }
  setInterval(reminderTick, 60000);
  $("#export-btn").addEventListener("click", () => {
    const data = Object.assign({ app: "shmirat-habrit", exportedAt: new Date().toISOString() }, st, { v: SCHEMA });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `shmira-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $("#import-file").addEventListener("change", async e => {
    try { const d = JSON.parse(await e.target.files[0].text()); delete d.app; delete d.exportedAt; const keepLang = st.lang;
      st = migrate(d); st.lang = st.lang || keepLang; save(); toast(t("imported")); setTimeout(() => location.reload(), 600); } catch { toast(t("bad_file")); }
  });
  $("#wipe-btn").addEventListener("click", () => { if (confirm(t("wipe_confirm"))) { localStorage.removeItem(KEY); location.reload(); } });

  // ---------- drawer ----------
  const drawer = $("#drawer"), menuBtn = $("#menu-btn");
  function openDrawer() { drawer.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); $(".nav-list a", drawer)?.focus(); }
  function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", openDrawer);
  $("#drawer-close").addEventListener("click", () => { closeDrawer(); menuBtn.focus(); });
  drawer.addEventListener("click", e => { if (e.target === drawer || e.target.closest("a")) closeDrawer(); });

  // ---------- emergency mode ----------
  const em = $("#emergency"); let lastFocus = null, breathT = null;
  function openEmergency() {
    lastFocus = document.activeElement; em.hidden = false; document.body.style.overflow = "hidden";
    emQuoteIdx = Math.floor(Math.random() * QUOTES.length); fillQuote($("#em-quote"), emQuoteIdx);
    $$(".steps li", em).forEach(li => { li.classList.remove("done"); li.setAttribute("aria-checked", "false"); });
    $("#em-close").focus(); startBreath();
  }
  function closeEmergency() { em.hidden = true; document.body.style.overflow = ""; stopBreath(); lastFocus?.focus?.(); }
  $("#em-close").addEventListener("click", closeEmergency);
  $("#em-done").addEventListener("click", e => { burst(e.clientX, e.clientY); toast(t("em_done_toast")); setTimeout(closeEmergency, 600); });
  $("#em-another").addEventListener("click", () => { emQuoteIdx = (emQuoteIdx + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length; fillQuote($("#em-quote"), emQuoteIdx); });
  function bindSteps() {
    $$(".steps li", em).forEach(li => { li.tabIndex = 0; li.setAttribute("role", "checkbox"); li.setAttribute("aria-checked", "false");
      const tog = () => { li.classList.toggle("done"); li.setAttribute("aria-checked", li.classList.contains("done")); };
      li.onclick = tog; li.onkeydown = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tog(); } }; });
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (!em.hidden) closeEmergency(); else closeDrawer(); }
    if (e.key === "Tab" && !em.hidden) {
      const f = $$("button, [tabindex='0'], a[href]", em).filter(x => x.offsetParent); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  function startBreath() {
    const lbl = $("#breath-label"); let phase = 0; lbl.textContent = t("inhale");
    const c = $("#breath-circle"); c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    stopBreath(); breathT = setInterval(() => { phase = (phase + 1) % 10; lbl.textContent = phase < 4 ? t("inhale") : t("exhale"); }, 1000);
  }
  function stopBreath() { clearInterval(breathT); }
  const TOTAL = 600, C = 2 * Math.PI * 52; let left = TOTAL, tId = null;
  const ringFg = $("#ring-fg"), out = $("#timer-out"), startBtn = $("#timer-start");
  ringFg.style.strokeDasharray = C;
  const drawTimer = () => { out.textContent = `${Math.floor(left / 60)}:${pad(left % 60)}`; ringFg.style.strokeDashoffset = C * (1 - left / TOTAL); };
  startBtn.addEventListener("click", () => {
    if (tId) { clearInterval(tId); tId = null; startBtn.textContent = t("t_resume"); return; }
    $("#timer-done").hidden = true; startBtn.textContent = t("t_pause");
    tId = setInterval(() => { left--; drawTimer(); if (left <= 0) { clearInterval(tId); tId = null; startBtn.textContent = t("t_start"); left = TOTAL; $("#timer-done").hidden = false; navigator.vibrate?.(200); } }, 1000);
  });
  $("#timer-reset").addEventListener("click", () => { clearInterval(tId); tId = null; left = TOTAL; drawTimer(); startBtn.textContent = t("t_start"); $("#timer-done").hidden = true; });
  drawTimer();

  // global buttons outside #content
  bind($(".hero")); bind($("#drawer")); bind($("#settings-dialog")); $("#fab").onclick = openEmergency;

  // ---------- scroll: fuse + parallax ----------
  const fuse = $("#fuse"), heroBg = $("#hero-bg"), hero = $(".hero");
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      fuse.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
      if (!reduce.matches && scrollY < innerHeight * 1.2) heroBg.style.transform = `translate3d(0,${scrollY * .35}px,0) scale(${1 + scrollY / innerHeight * .06})`;
      ticking = false;
    });
  }, { passive: true });

  // ---------- ember particles (canvas) ----------
  const cv = $("#embers"), ctx = cv.getContext("2d");
  let parts = [], W = 0, H = 0, raf = null, visible = true;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  const spawn = init => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: .8 + Math.random() * 2.4, vy: .25 + Math.random() * .7,
    vx: (Math.random() - .5) * .3, ph: Math.random() * 6.28, life: 0, max: 300 + Math.random() * 400, hue: 18 + Math.random() * 28 });
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
  function startEmbers() { if (reduce.matches || raf || !visible || document.hidden) return; size(); const n = W < 700 ? 34 : 70; if (parts.length !== n) parts = Array.from({ length: n }, () => spawn(true)); frame(); }
  function stopEmbers() { cancelAnimationFrame(raf); raf = null; }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? startEmbers() : stopEmbers(); }).observe(hero);
  document.addEventListener("visibilitychange", () => document.hidden ? stopEmbers() : startEmbers());
  addEventListener("resize", () => { if (raf) size(); });
  reduce.addEventListener?.("change", () => reduce.matches ? (stopEmbers(), ctx.clearRect(0, 0, W, H)) : startEmbers());

  // ---------- init ----------
  applyLang(false);
  startEmbers();
  reminderTick();
  if (location.hash === "#emergency") openEmergency();
  setInterval(renderTracker, 60000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
