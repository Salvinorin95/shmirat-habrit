#!/usr/bin/env python3
"""Builds index.html from plan/README.plain.md (Hebrew) and plan/README.en.md (English).
Usage: python3 tools/build_html.py      (needs: pip install markdown-it-py mdit-py-plugins)"""
import os, re, html
from markdown_it import MarkdownIt
from mdit_py_plugins.tasklists import tasklists_plugin

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
md = MarkdownIt("commonmark", {"html": False}).enable("table").use(tasklists_plugin)

L = {
  "he": {"file": "plan/README.plain.md", "nums": list("אבגדהוזחטי"), "num_suffix": "׳",
         "keys": {"why": 'ה"למה" שלי', "emergency": "כרטיס חירום", "reset": "מה כן עושים: איפוס של 24 שעות"},
         "table": "טבלת רצף", "steps": "שלב אחר שלב", "chapter": "פרק",
         "tracker_title": "הרצף שלי", "tracker_note": "הטבלה מהתוכנית הפכה כאן למעקב חי. הכל נשמר רק במכשיר שלך.",
         "stats_title": "תובנות פרטיות", "stats_note": "דפוסים, לא שיפוט. הנתונים האלה מחושבים ונשמרים רק במכשיר הזה.",
         "btn_em": "לפתוח מצב חירום עכשיו", "btn_reset": "נפלתי. מתחילים איפוס בעדינות",
         "intro": "הקדמה", "closing": "סיום",
         "privacy": "🔒 האפליקציה לא שולחת שום מידע. הרצף, הצ׳קליסטים והיומן נשמרים רק בדפדפן של המכשיר הזה."},
  "en": {"file": "plan/README.en.md", "nums": ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"], "num_suffix": "",
         "keys": {"why": 'My "why"', "emergency": "Emergency card", "reset": "What to do: the 24-hour reset"},
         "table": "Streak table", "steps": "Step by step", "chapter": "Chapter",
         "tracker_title": "My streak", "tracker_note": "The plan's table becomes a live tracker here. Everything is stored only on your device.",
         "stats_title": "Private insights", "stats_note": "Patterns, not judgment. These numbers are computed and stored only on this device.",
         "btn_em": "Open emergency mode now", "btn_reset": "I fell. Let's start a gentle reset",
         "intro": "Introduction", "closing": "Closing",
         "privacy": "🔒 This app sends no data anywhere. Your streak, checklists and log are stored only in this device's browser."},
}

def ember(s, cls=""):
    return f'<span class="ember {cls}">{s}</span>'

def enable_checks(h, prefix):
    i = [0]
    def rep(m):
        i[0] += 1
        return f'<input class="task-list-item-checkbox" type="checkbox" data-check="{prefix}-{i[0]}">'
    h = re.sub(r'<input class="task-list-item-checkbox"[^>]*>', rep, h)
    return re.sub(r'<li class="task-list-item">(<input[^>]*>)(.*?)</li>',
                  lambda m: f'<li class="task-list-item"><label>{m.group(1)}<span>{m.group(2).strip()}</span></label></li>', h, flags=re.S)

def build(lang):
    c = L[lang]; src = open(os.path.join(ROOT, c["file"]), encoding="utf-8").read()
    parts = re.split(r"\n---\n", src)
    intro_body = "\n".join(l for l in parts[0].strip().splitlines() if not l.startswith(("# ", "> "))).strip()
    sections = {}
    for p in parts[1:]:
        m = re.match(r"\s*## (\d+)\. (.*?)\n(.*)", p, re.S)
        if m: sections[int(m.group(1))] = (m.group(2).strip(), m.group(3).strip())
    closing = md.render(parts[-1])
    out = [f'<section class="chapter intro" id="intro" aria-label="{c["intro"]}">',
           f'<div class="card reveal"><div class="card-inner lead">{md.render(intro_body)}</div></div>',
           '<img class="divider reveal" src="assets/img/divider.webp" alt="" width="1200" height="165" loading="lazy">', '</section>']
    for n in sorted(sections):
        title, body = sections[n]; sid = f"ch-{n}"
        # emergency card: code block -> bold first line + list (renders better than monospace)
        body = re.sub(r"(### " + re.escape(c["keys"]["emergency"]) + r".*?\n)```\n(.*?)\n(.*?)```",
                      lambda m: m.group(1) + f"**{m.group(2)}**\n\n" + m.group(3), body, flags=re.S)
        chunks = re.split(r"^### (.*)$", body, flags=re.M)
        cards = ([("", chunks[0].strip())] if chunks[0].strip() else []) + [(chunks[i].strip(), chunks[i + 1].strip()) for i in range(1, len(chunks), 2)]
        out.append(f'<section class="chapter" id="{sid}" aria-labelledby="{sid}-t" data-chapter="{n}">')
        out.append(f'<h2 class="bamboo reveal" id="{sid}-t"><span class="num" aria-hidden="true">{ember(c["nums"][n-1] + c["num_suffix"])}</span>'
                   f'<span class="sr-only">{c["chapter"]} {n}: </span>{ember(html.escape(title), "title")}</h2>')
        for ci, (h3, txt) in enumerate(cards):
            key = next((k for k, v in c["keys"].items() if h3.startswith(v)), "")
            if n == 8 and h3.startswith(c["table"]):
                rest = md.render("\n".join(l for l in txt.splitlines() if not l.startswith("|")).strip())
                out.append(f'<div class="card reveal key" id="tracker-card"><div class="card-inner"><h3>{ember(c["tracker_title"], "card-title")}</h3>'
                           f'<p class="muted">{c["tracker_note"]}</p><div id="tracker"></div>{rest}</div></div>')
                out.append(f'<div class="card reveal" id="stats-card"><div class="card-inner"><h3>{ember(c["stats_title"], "card-title")}</h3>'
                           f'<p class="muted">{c["stats_note"]}</p><div id="stats"></div></div></div>')
                continue
            h = enable_checks(md.render(txt), f"s{n}c{ci}")
            h = h.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
            t = f'<h3>{ember(html.escape(h3), "card-title") if key else html.escape(h3)}</h3>' if h3 else ""
            extra = {"emergency": f'<button class="btn btn-ember" data-open-emergency>{c["btn_em"]}</button>',
                     "reset": f'<button class="btn btn-soft" data-open-reset>{c["btn_reset"]}</button>'}.get(key, "")
            out.append(f'<div class="card reveal{" key" if key else ""}"{f" id=card-{key}" if key else ""}><div class="card-inner">{t}{h}{extra}</div></div>')
        out.append("</section>")
    out.append(f'<section class="chapter closing" aria-label="{c["closing"]}">'
               '<img class="divider reveal" src="assets/img/divider.webp" alt="" width="1200" height="165" loading="lazy">'
               f'<div class="card reveal key"><div class="card-inner closing-inner">{closing}</div></div>'
               f'<p class="privacy-note">{c["privacy"]}</p></section>')
    nav = "\n".join(f'<li><a href="#ch-{n}" data-nav="{n}"><span class="nav-num">{c["nums"][n-1] + c["num_suffix"]}</span>{html.escape(sections[n][0])}</a></li>' for n in sorted(sections))
    steps_md = re.search(r"### " + re.escape(c["steps"]) + r"\n(.*?)\n\n###", sections[5][1], re.S).group(1)
    steps = md.render(steps_md).replace("<ol>", '<ol class="steps">')
    checks = len(re.findall(r"data-check=", "\n".join(out)))
    return "\n".join(out), nav, steps, checks

he, nav_he, steps_he, n_he = build("he")
en, nav_en, steps_en, n_en = build("en")
assert n_he == n_en, f"checklist structure differs: he={n_he} en={n_en}"
tpl = open(os.path.join(ROOT, "tools", "index.template.html"), encoding="utf-8").read()
out = (tpl.replace("{{CONTENT_HE}}", he).replace("{{TPL_HE}}", he).replace("{{TPL_EN}}", en)
          .replace("{{NAV_HE}}", nav_he).replace("{{NAV_EN}}", nav_en)
          .replace("{{STEPS_HE}}", steps_he).replace("{{STEPS_EN}}", steps_en))
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(out)
print(f"index.html: {len(out)//1024} KB, checklists per language: {n_he}")
