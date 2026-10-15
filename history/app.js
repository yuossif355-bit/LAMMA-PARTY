/* تاريخ كل حاجة - الواجهة (خط زمني، السنة الكونية، النهاردة في التاريخ، اختبار، مقارنة) */
(function () {
  "use strict";

  const D = window.HistoryData;
  const U = window.HistoryUtil;
  const view = document.getElementById("view");
  if (!D || !U) {
    view.textContent = "حصل خطأ في تحميل بيانات الموقع. جرب تحدّث الصفحة.";
    return;
  }

  const NOW = new Date().getFullYear();
  const EVENTS = U.sortEvents(D.EVENTS, NOW);
  const INDEX = new Map(EVENTS.map((e, i) => [e, i]));
  const byTitle = (t) => EVENTS.find((e) => e.title === t);

  // كل النصوص بتتحط بـ textContent، فمفيش HTML بيتحقن
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    },
  };

  /* ---------- كارت الحدث ---------- */
  function evCard(e) {
    const cat = D.CATS[e.cat];
    const a = h("article", "ev");
    a.style.setProperty("--c", cat.c);
    a.dataset.i = INDEX.get(e);
    const dot = h("div", "ev-dot", e.em);
    dot.setAttribute("aria-hidden", "true");
    const body = h("div", "ev-body");
    const meta = h("div", "ev-meta");
    meta.append(h("span", "chip", cat.e + " " + cat.n));
    if (e.eg) meta.append(h("span", "chip chip-eg", "🇪🇬 مصر"));
    meta.append(h("span", "ev-ago", U.ago(e, NOW)));
    body.append(h("div", "ev-when", U.formatWhen(e)), h("h3", "ev-title", e.title), h("p", "ev-text", e.text), meta);
    a.append(dot, body);
    return a;
  }

  /* ---------- الخط الزمني ---------- */
  const F = { cat: "", egypt: false, q: "" };

  function viewTimeline() {
    const egCount = EVENTS.filter((e) => e.eg).length;
    const hero = h("section", "hero");
    hero.append(
      h("h1", null, "تاريخ كل حاجة"),
      h("p", null, "من الانفجار العظيم لحد النهاردة: الكون، الحياة، الإنسان، الحضارات، العلوم، التكنولوجيا، الرياضة وحتى الأكل. اتصفح الخط الزمني أو دوّر على اللي يهمك.")
    );
    const stats = h("div", "stats");
    for (const [b, s] of [[String(EVENTS.length), "حدث"], ["13.8 مليار سنة", "عمر الكون"], [String(egCount), "حدث متعلق بمصر"]]) {
      const st = h("div", "stat");
      st.append(h("b", null, b), h("span", null, s));
      stats.append(st);
    }
    hero.append(stats);
    const rnd = h("button", "btn", "🎲 حدث عشوائي");
    rnd.style.marginTop = "16px";
    hero.append(rnd);

    const controls = h("div", "controls");
    const search = h("input", "search");
    search.type = "search";
    search.placeholder = "دوّر: الأهرامات، نابليون، القهوة، 1973…";
    search.setAttribute("aria-label", "بحث في الأحداث");
    search.value = F.q;
    const chips = h("div", "chips");
    const count = h("div", "count");
    count.setAttribute("aria-live", "polite");
    controls.append(search, chips, count);

    const list = h("div");
    view.replaceChildren(hero, controls, list);

    function renderChips() {
      chips.replaceChildren();
      const mk = (label, pressed, color, fn) => {
        const b = h("button", "chip-btn", label);
        b.type = "button";
        b.setAttribute("aria-pressed", String(pressed));
        if (color) b.style.setProperty("--cc", color);
        b.addEventListener("click", fn);
        chips.append(b);
      };
      mk("الكل", !F.cat && !F.egypt, null, () => { F.cat = ""; F.egypt = false; update(); });
      mk("🇪🇬 مصر", F.egypt, "#ffd88a", () => { F.egypt = !F.egypt; update(); });
      for (const id of Object.keys(D.CATS)) {
        const c = D.CATS[id];
        mk(c.e + " " + c.n, F.cat === id, c.c, () => { F.cat = F.cat === id ? "" : id; update(); });
      }
    }

    function renderList() {
      const items = U.filterEvents(EVENTS, F, NOW);
      count.textContent = items.length === EVENTS.length ? "كل الأحداث (" + items.length + ")" : items.length + " حدث من " + EVENTS.length;
      list.replaceChildren();
      if (!items.length) {
        list.append(h("p", "empty", "مفيش أحداث بالشكل ده. جرب كلمة تانية أو شيل فلتر."));
        return;
      }
      for (const g of U.groupByEra(items)) {
        const sec = h("section", "era");
        const head = h("h2", "era-h", g.era.e + " " + g.era.n);
        head.append(h("small", null, g.items.length + " حدث"));
        const evs = h("div", "evs");
        for (const e of g.items) evs.append(evCard(e));
        sec.append(head, evs);
        list.append(sec);
      }
    }

    function update() { renderChips(); renderList(); }

    let timer = null;
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { F.q = search.value; renderList(); }, 120);
    });

    rnd.addEventListener("click", () => {
      const e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      F.cat = ""; F.egypt = false; F.q = ""; search.value = "";
      update();
      const el = list.querySelector('.ev[data-i="' + INDEX.get(e) + '"]');
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
      }
    });

    update();
  }

  /* ---------- السنة الكونية ---------- */
  function viewCosmic() {
    const cos = EVENTS.filter((e) => e.cosmic);
    const secYears = U.COSMIC_AGE / U.YEAR_SEC;
    const dayYears = U.COSMIC_AGE / 365;
    const writing = byTitle("الكتابة تظهر");

    const head = h("div", "page-head");
    head.append(
      h("h1", null, "🌌 السنة الكونية"),
      h("p", null, "تخيّل إن عمر الكون كله (13.8 مليار سنة) اتضغط في سنة واحدة، من 1 يناير لحد منتصف ليل 31 ديسمبر. شوف اتحط فين كل حدث.")
    );

    const c1 = h("div", "callout");
    c1.append("كل ", Object.assign(h("b"), { textContent: "ثانية" }), " في السنة دي = حوالي " + Math.round(secYears) +
      " سنة حقيقية، وكل ", Object.assign(h("b"), { textContent: "يوم" }), " = حوالي " + U.formatSpan(Math.round(dayYears / 1e6) * 1e6) + ".");
    const nodes = [head, c1];
    if (writing) {
      const wsec = Math.round(U.cosmicInfo(writing, NOW).secBefore);
      const c2 = h("div", "callout");
      c2.append("كل التاريخ المكتوب (من أول كتابة لحد النهاردة) بيتحط في آخر ", Object.assign(h("b"), { textContent: "حوالي " + wsec + " ثانية" }), " من السنة الكونية.");
      nodes.push(c2);
    }

    const strip = h("div", "strip");
    const bar = h("div", "strip-bar");
    for (const e of cos) {
      const dot = h("span", "strip-dot");
      dot.style.insetInlineStart = (U.cosmicInfo(e, NOW).frac * 100).toFixed(3) + "%";
      dot.title = e.title;
      bar.append(dot);
    }
    const months = h("div", "strip-months");
    months.setAttribute("aria-hidden", "true");
    U.MONTHS.forEach((m, i) => { const s = h("span", null, m); s.style.flexGrow = U.DAYS_IN[i]; months.append(s); });
    strip.append(bar, months);

    const list = h("div", "cos");
    for (const e of cos) {
      const ci = U.cosmicInfo(e, NOW);
      const row = h("div", "cos-row");
      const title = h("div", "cos-title", e.em + " " + e.title);
      title.append(h("small", null, U.formatWhen(e)));
      const bar2 = h("div", "cos-bar");
      const fill = h("i");
      fill.style.width = Math.max(1, ci.frac * 100).toFixed(2) + "%";
      bar2.append(fill);
      row.append(h("div", "cos-when", ci.label), title, bar2);
      list.append(row);
    }
    view.replaceChildren(...nodes, strip, list);
  }

  /* ---------- النهاردة في التاريخ ---------- */
  const T = { m: new Date().getMonth() + 1, d: new Date().getDate() };

  function viewToday() {
    const head = h("div", "page-head");
    head.append(h("h1", null, "📅 النهاردة في التاريخ"), h("p", null, "إيه اللي حصل في اليوم ده من السنين اللي فاتت؟ اختار أي يوم."));

    const pickers = h("div", "pickers");
    const selD = h("select");
    selD.setAttribute("aria-label", "اليوم");
    const selM = h("select");
    selM.setAttribute("aria-label", "الشهر");
    U.MONTHS.forEach((m, i) => { const o = h("option", null, m); o.value = i + 1; selM.append(o); });
    const todayBtn = h("button", "btn ghost", "النهاردة");
    todayBtn.type = "button";
    pickers.append(selD, selM, todayBtn);

    const out = h("div");
    view.replaceChildren(head, pickers, out);

    function fillDays() {
      selD.replaceChildren();
      for (let i = 1; i <= U.DAYS_IN[T.m - 1] + (T.m === 2 ? 1 : 0); i++) { const o = h("option", null, String(i)); o.value = i; selD.append(o); }
      if (T.d > selD.options.length) T.d = selD.options.length;
      selD.value = T.d;
      selM.value = T.m;
    }

    function render() {
      out.replaceChildren();
      const exact = U.onThisDay(EVENTS, T.m, T.d, NOW);
      const label = T.d + " " + U.MONTHS[T.m - 1];
      if (exact.length) {
        out.append(h("div", "count", exact.length + " حدث في " + label));
        const evs = h("div", "near");
        exact.forEach((e) => evs.append(evCard(e)));
        out.append(evs);
        return;
      }
      out.append(h("p", "empty", "مفيش أحداث مسجلة في " + label + " بالظبط. دي أقرب أيام فيها أحداث:"));
      const evs = h("div", "near");
      for (const { event, delta } of U.nearestDays(EVENTS, T.m, T.d, 5)) {
        const wrap = h("div");
        const n = Math.abs(delta);
        const txt = delta > 0 ? (n === 1 ? "بعد النهاردة بيوم" : "بعد " + n + " يوم") : n === 1 ? "قبلها بيوم" : "قبل " + n + " يوم";
        wrap.append(h("div", "delta", txt), evCard(event));
        evs.append(wrap);
      }
      out.append(evs);
    }

    selM.addEventListener("change", () => { T.m = +selM.value; fillDays(); render(); });
    selD.addEventListener("change", () => { T.d = +selD.value; render(); });
    todayBtn.addEventListener("click", () => { const n = new Date(); T.m = n.getMonth() + 1; T.d = n.getDate(); fillDays(); render(); });
    fillDays();
    render();
  }

  /* ---------- الاختبار ---------- */
  function viewQuiz() {
    const best = store.get("hist-best");
    const head = h("div", "page-head");
    head.append(h("h1", null, "🧠 اختبر نفسك"), h("p", null, "10 أسئلة من أحداث الموقع: إمتى حصل؟ وأيهم حصل الأول؟"));
    const box = h("div");
    view.replaceChildren(head, box);

    function intro() {
      box.replaceChildren();
      const q = h("div", "q");
      if (best != null) q.append(h("p", null, "أعلى نتيجة ليك: " + best + " / 10"));
      const go = h("button", "btn", "ابدأ الاختبار");
      go.addEventListener("click", start);
      q.append(go);
      box.append(q);
    }

    function start() {
      const qs = U.makeQuiz(EVENTS, Math.random, 10, NOW);
      let i = 0;
      let score = 0;

      function show() {
        const q = qs[i];
        box.replaceChildren();
        const prog = h("div", "qprog");
        const fill = h("i");
        fill.style.width = (i / qs.length) * 100 + "%";
        prog.append(fill);
        const card = h("div", "q");
        const title = h("h2", null, q.q);
        title.tabIndex = -1;
        card.append(h("div", "count", "سؤال " + (i + 1) + " من " + qs.length), title);
        const opts = q.options.map((t, k) => {
          const b = h("button", "opt", t);
          b.type = "button";
          b.addEventListener("click", () => answer(k));
          card.append(b);
          return b;
        });
        const fb = h("div");
        fb.setAttribute("aria-live", "polite");
        card.append(fb);
        box.append(prog, card);
        title.focus({ preventScroll: true });

        function answer(k) {
          opts.forEach((o) => (o.disabled = true));
          opts[q.answer].classList.add("ok");
          if (k === q.answer) score++; else opts[k].classList.add("bad");
          fb.append(h("div", "explain", (k === q.answer ? "✅ صح! " : "❌ غلط. ") + q.explain));
          const next = h("button", "btn", i + 1 < qs.length ? "السؤال التالي" : "شوف نتيجتك");
          next.style.marginTop = "12px";
          next.addEventListener("click", () => { i++; if (i < qs.length) show(); else finish(); });
          fb.append(next);
          next.focus();
        }
      }

      function finish() {
        const prev = +store.get("hist-best");
        if (!(prev >= score)) store.set("hist-best", String(score));
        box.replaceChildren();
        const card = h("div", "q");
        const msg = score >= 9 ? "مؤرخ بجد! 🏆" : score >= 7 ? "ممتاز 👏" : score >= 5 ? "كويس، كمل 💪" : "محتاج تقرا الخط الزمني تاني 😄";
        card.append(h("div", "score", score + " / " + qs.length), h("p", null, msg));
        const again = h("button", "btn", "اختبار جديد");
        again.addEventListener("click", start);
        const tl = h("a", "btn ghost", "ارجع للخط الزمني");
        tl.href = "#/timeline";
        const r = h("div", "row");
        r.append(again, tl);
        card.append(r);
        box.append(card);
      }

      show();
    }

    intro();
  }

  /* ---------- قارن بين حدثين ---------- */
  const C = { a: "الهرم الأكبر في الجيزة", b: "الهبوط على القمر" };

  function viewCompare() {
    const head = h("div", "page-head");
    head.append(h("h1", null, "⚖️ قارن بين حدثين"), h("p", null, "اختار أي حدثين وشوف قد إيه بينهم من السنين."));

    const mkSelect = (id, val) => {
      const s = h("select");
      s.id = id;
      for (const e of EVENTS) {
        const o = h("option", null, e.title + " — " + U.formatWhen(e));
        o.value = e.title;
        s.append(o);
      }
      s.value = byTitle(val) ? val : EVENTS[0].title;
      return s;
    };
    const selA = mkSelect("cmpA", C.a);
    const selB = mkSelect("cmpB", C.b);
    const la = h("label", null, "الحدث الأول");
    la.htmlFor = "cmpA";
    const lb = h("label", null, "الحدث التاني");
    lb.htmlFor = "cmpB";
    const swap = h("button", "btn ghost", "⇄ بدّل");
    swap.type = "button";

    const form = h("div", "cmp");
    const ga = h("div"); ga.append(la, selA);
    const gb = h("div"); gb.append(lb, selB);
    form.append(ga, gb, swap);
    const res = h("div");
    const fact = h("div");
    view.replaceChildren(head, form, res, fact);

    function render() {
      C.a = selA.value;
      C.b = selB.value;
      const a = byTitle(C.a);
      const b = byTitle(C.b);
      res.replaceChildren();
      if (!a || !b) return;
      const r = U.compareEvents(a, b, NOW);
      const box = h("div", "cmp-res");
      if (a === b) {
        box.append(h("div", "big", "نفس الحدث!"), h("p", null, "اختار حدثين مختلفين."));
      } else {
        const span = U.formatSpan(r.span);
        box.append(
          h("div", "big", (r.approx ? "حوالي " : "") + span),
          h("p", null, "«" + r.older.title + "» (" + U.formatWhen(r.older) + ") حصل قبل «" + r.newer.title + "» (" + U.formatWhen(r.newer) + ")" +
            (r.span >= 1 ? "." : " ")),
          h("p", "count", r.newer.title + " " + U.ago(r.newer, NOW) + "، و" + r.older.title + " " + U.ago(r.older, NOW) + ".")
        );
      }
      res.append(box);
    }

    // معلومة طريفة بتتحسب من البيانات نفسها
    const pyr = byTitle("الهرم الأكبر في الجيزة");
    const cleo = byTitle("نهاية مصر البطلمية");
    const moon = byTitle("الهبوط على القمر");
    if (pyr && cleo && moon) {
      const d1 = U.compareEvents(pyr, cleo, NOW).span;
      const d2 = U.compareEvents(cleo, moon, NOW).span;
      if (d2 < d1) {
        const c = h("div", "callout");
        c.append(Object.assign(h("b"), { textContent: "معلومة غريبة: " }),
          "كليوباترا (30 ق.م) عاشت بعد بناء الهرم الأكبر بحوالي " + U.formatSpan(d1) + "، وقبل الهبوط على القمر بحوالي " + U.formatSpan(d2) +
          ". يعني كانت أقرب زمنياً لينا من الهرم.");
        fact.append(c);
      }
    }

    selA.addEventListener("change", render);
    selB.addEventListener("change", render);
    swap.addEventListener("click", () => { const t = selA.value; selA.value = selB.value; selB.value = t; render(); });
    render();
  }

  /* ---------- التنقل ---------- */
  const ROUTES = {
    timeline: [viewTimeline, "الخط الزمني"],
    cosmic: [viewCosmic, "السنة الكونية"],
    today: [viewToday, "النهاردة في التاريخ"],
    quiz: [viewQuiz, "اختبر نفسك"],
    compare: [viewCompare, "قارن بين حدثين"],
  };

  function route() {
    const key = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "timeline";
    const r = ROUTES[key] || ROUTES.timeline;
    const name = ROUTES[key] ? key : "timeline";
    document.querySelectorAll("#nav a").forEach((a) => {
      if (a.dataset.route === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = r[1] + " | تاريخ كل حاجة";
    r[0]();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
