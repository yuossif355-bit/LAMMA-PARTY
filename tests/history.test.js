// تشغيل: node tests/history.test.js
const assert = require("assert");
require("../history/data.js");
const D = globalThis.HistoryData;
const base = D.EVENTS.length;
require("../history/more.js");
const U = require("../history/util.js");

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok  -", name); }
  catch (e) { console.error("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}
const NOW = 2026;
const find = (t) => {
  const e = D.EVENTS.find((x) => x.title === t);
  assert.ok(e, "مفيش حدث بالعنوان: " + t);
  return e;
};

/* ---------- سلامة البيانات ---------- */
test("more.js ضاف أحداث على data.js", () => {
  assert.ok(base >= 90, "data.js فيه " + base);
  assert.ok(D.EVENTS.length > base + 40, "اتضاف " + (D.EVENTS.length - base));
});

test("كل حدث فيه الحقول الأساسية ونوع وقت وفئة صحيحة", () => {
  for (const e of D.EVENTS) {
    assert.ok(D.CATS[e.cat], "فئة غير معروفة: " + e.cat + " في " + e.title);
    assert.ok(["bya", "mya", "kya", "bce", "ce"].includes(e.k), "نوع وقت غلط في " + e.title);
    assert.ok(typeof e.v === "number" && e.v > 0, "قيمة غلط في " + e.title);
    assert.ok(e.title && e.text && e.em, "حقل ناقص في " + e.title);
  }
});

test("العناوين مش متكررة", () => {
  const seen = new Set();
  for (const e of D.EVENTS) {
    assert.ok(!seen.has(e.title), "عنوان متكرر: " + e.title);
    seen.add(e.title);
  }
});

test("التواريخ md صحيحة (شهر ويوم موجودين فعلاً)", () => {
  for (const e of D.EVENTS) {
    if (!e.md) continue;
    assert.ok(/^\d\d-\d\d$/.test(e.md), "شكل md غلط في " + e.title + ": " + e.md);
    assert.ok(U.mdParts(e), "تاريخ مش موجود في التقويم: " + e.title + " " + e.md);
    assert.ok(e.k === "ce" || e.k === "bce", "md على حدث مش تاريخي بالسنة: " + e.title);
  }
});

test("formatWhen: يوم وشهر لحدث قبل الميلاد", () => {
  assert.strictEqual(U.formatWhen(find("اغتيال يوليوس قيصر")), "15 مارس 44 ق.م");
});

test("كل العناوين في COSMIC_TITLES موجودة فعلاً", () => {
  const src = require("fs").readFileSync(__dirname + "/../history/more.js", "utf8");
  const m = src.match(/const COSMIC_TITLES = \[([\s\S]*?)\];/);
  const titles = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(titles.length >= 8);
  for (const t of titles) find(t);
});

test("مفيش حدث ميلادي في المستقبل", () => {
  for (const e of D.EVENTS) if (e.k === "ce") assert.ok(e.v <= NOW, e.title + " " + e.v);
});

/* ---------- الوقت والترتيب ---------- */
test("yearsAgo: ميلادي وقبل الميلاد وملايين السنين", () => {
  assert.strictEqual(U.yearsAgo({ k: "ce", v: 1969 }, NOW), 57);
  assert.strictEqual(U.yearsAgo({ k: "bce", v: 2560 }, NOW), 4585);
  assert.strictEqual(U.yearsAgo({ k: "bce", v: 1 }, NOW), NOW);
  assert.strictEqual(U.yearsAgo({ k: "mya", v: 66 }, NOW), 66e6);
  assert.strictEqual(U.yearsAgo({ k: "bya", v: 13.8 }, NOW), 13.8e9);
  assert.strictEqual(U.yearsAgo({ k: "kya", v: 300 }, NOW), 300000);
});

test("الترتيب من الأقدم للأحدث والانفجار العظيم الأول", () => {
  const s = U.sortEvents(D.EVENTS, NOW);
  assert.strictEqual(s.length, D.EVENTS.length);
  assert.strictEqual(s[0].title, "الانفجار العظيم");
  for (let i = 1; i < s.length; i++) {
    assert.ok(U.yearsAgo(s[i - 1], NOW) >= U.yearsAgo(s[i], NOW), s[i - 1].title + " قبل " + s[i].title);
  }
});

test("نفس السنة: بيترتب بالشهر واليوم", () => {
  const s = U.sortEvents([
    { cat: "civ", k: "ce", v: 1945, md: "10-24", title: "ب" },
    { cat: "civ", k: "ce", v: 1945, md: "08-06", title: "أ" },
    { cat: "civ", k: "ce", v: 1945, title: "ج" },
  ], NOW);
  assert.deepStrictEqual(s.map((x) => x.title), ["أ", "ب", "ج"]);
});

test("العصور: كل حدث ليه عصر والعصور مرتبة", () => {
  const ids = U.ERAS.map((e) => e.id);
  let last = -1;
  for (const e of U.sortEvents(D.EVENTS, NOW)) {
    const i = ids.indexOf(U.eraOf(e));
    assert.ok(i >= 0, "عصر غلط: " + e.title);
    assert.ok(i >= last, e.title + " في عصر قبل عصر الحدث اللي قبله");
    last = i;
  }
  assert.strictEqual(U.eraOf(find("فتح القسطنطينية")), "medieval");
  assert.strictEqual(U.eraOf(find("كولومبوس يوصل للأمريكتين")), "early");
  assert.strictEqual(U.eraOf(find("الكتابة تظهر")), "ancient");
  assert.strictEqual(U.eraOf(find("الثورة الزراعية")), "prehistory");
  assert.strictEqual(U.eraOf(find("ChatGPT")), "c21");
  assert.strictEqual(U.groupByEra(U.sortEvents(D.EVENTS, NOW)).reduce((a, g) => a + g.items.length, 0), D.EVENTS.length);
});

/* ---------- التنسيق ---------- */
test("formatWhen بكل الأنواع", () => {
  assert.strictEqual(U.formatWhen(find("الانفجار العظيم")), "قبل 13.8 مليار سنة");
  assert.strictEqual(U.formatWhen(find("الانفجار الكامبري")), "قبل حوالي 538 مليون سنة");
  assert.strictEqual(U.formatWhen(find("ظهور الإنسان العاقل")), "قبل حوالي 300 ألف سنة");
  assert.strictEqual(U.formatWhen(find("الهرم الأكبر في الجيزة")), "حوالي 2560 ق.م");
  assert.strictEqual(U.formatWhen(find("الهبوط على القمر")), "20 يوليو 1969م");
  assert.strictEqual(U.formatWhen(find("مطبعة جوتنبرج")), "حوالي 1450م");
  assert.strictEqual(U.formatWhen(find("أول أولمبياد")), "حوالي 776 ق.م");
});

test("formatSpan بصياغة مصرية", () => {
  assert.strictEqual(U.formatSpan(0), "نفس السنة");
  assert.strictEqual(U.formatSpan(1), "سنة واحدة");
  assert.strictEqual(U.formatSpan(2), "سنتين");
  assert.strictEqual(U.formatSpan(7), "7 سنين");
  assert.strictEqual(U.formatSpan(57), "57 سنة");
  assert.strictEqual(U.formatSpan(4585), "4,585 سنة");
  assert.strictEqual(U.formatSpan(14400), "14.4 ألف سنة");
  assert.strictEqual(U.formatSpan(66e6), "66 مليون سنة");
  assert.strictEqual(U.formatSpan(4.54e9), "4.54 مليار سنة");
});

test("ago بيرجع «من X»", () => {
  assert.strictEqual(U.ago(find("الهبوط على القمر"), NOW), "من 57 سنة");
  assert.strictEqual(U.ago({ k: "ce", v: NOW }, NOW), "السنة دي");
});

test("مقارنة كليوباترا: أقرب للقمر من الهرم", () => {
  const pyr = find("الهرم الأكبر في الجيزة");
  const cleo = find("نهاية مصر البطلمية");
  const moon = find("الهبوط على القمر");
  const a = U.compareEvents(pyr, cleo, NOW);
  const b = U.compareEvents(cleo, moon, NOW);
  assert.strictEqual(a.older, pyr);
  assert.strictEqual(a.span, 2530);
  assert.strictEqual(b.span, 1998);   // من 30 ق.م لـ 1969م: مفيش سنة صفر
  assert.ok(b.span < a.span);
  assert.strictEqual(a.approx, true);
});

/* ---------- السنة الكونية ---------- */
test("السنة الكونية: بداية ونهاية", () => {
  const bb = U.cosmicInfo(find("الانفجار العظيم"), NOW);
  assert.strictEqual(bb.label, "1 يناير — لحظة البداية");
  assert.ok(bb.frac < 1e-9);
  const gpt = U.cosmicInfo(find("ChatGPT"), NOW);
  assert.strictEqual(gpt.month, 11);
  assert.strictEqual(gpt.day, 31);
  assert.ok(gpt.secBefore < 0.02, "secBefore " + gpt.secBefore);
  assert.ok(/ثانية قبل منتصف الليل/.test(gpt.label), gpt.label);
});

test("السنة الكونية: الشمس في آخر أغسطس/بداية سبتمبر والديناصورات آخر السنة", () => {
  const sun = U.cosmicInfo(find("ولادة الشمس والمجموعة الشمسية"), NOW);
  assert.ok(sun.month === 7 || sun.month === 8, "الشهر " + sun.month);
  const dino = U.cosmicInfo(find("ظهور الديناصورات"), NOW);
  assert.strictEqual(dino.month, 11);
  assert.ok(dino.day >= 24 && dino.day <= 26, "اليوم " + dino.day);
  const hs = U.cosmicInfo(find("ظهور الإنسان العاقل"), NOW);
  assert.strictEqual(hs.day, 31);
  assert.ok(/م$/.test(hs.label), hs.label);
});

test("السنة الكونية: الترتيب بيتبع الترتيب الزمني", () => {
  const cos = U.sortEvents(D.EVENTS.filter((e) => e.cosmic), NOW);
  assert.ok(cos.length >= 20, "عدد الأحداث الكونية " + cos.length);
  let last = -1;
  for (const e of cos) {
    const f = U.cosmicInfo(e, NOW).frac;
    assert.ok(f >= last - 1e-12, e.title);
    last = f;
  }
});

/* ---------- النهاردة في التاريخ ---------- */
test("onThisDay بيجيب أحداث اليوم", () => {
  const r = U.onThisDay(D.EVENTS, 7, 20, NOW);
  assert.ok(r.some((e) => e.title === "الهبوط على القمر"));
  assert.ok(r.every((e) => e.md === "07-20"));
  assert.deepStrictEqual(U.onThisDay(D.EVENTS, 2, 30, NOW), []);
});

test("nearestDays بيرجع أقرب أيام (حتى عبر نهاية السنة)", () => {
  const n = U.nearestDays(D.EVENTS, 10, 15, 5);
  assert.strictEqual(n.length, 5);
  for (let i = 1; i < n.length; i++) assert.ok(Math.abs(n[i - 1].delta) <= Math.abs(n[i].delta));
  assert.ok(n.every((x) => x.delta !== 0));
  const wrap = U.nearestDays([{ md: "01-02", k: "ce", v: 1900 }], 12, 30, 3);
  assert.strictEqual(wrap[0].delta, 3);
});

/* ---------- بحث وفلترة ---------- */
test("normalizeAr بيطبّع الهمزات والتاء المربوطة والتشكيل", () => {
  assert.strictEqual(U.normalizeAr("الأهرامَات"), "الاهرامات");
  assert.strictEqual(U.normalizeAr("مكتبة الإسكندرية"), "مكتبه الاسكندريه");
  assert.strictEqual(U.normalizeAr("موسى"), "موسي");
});

test("filterEvents: بحث + فئة + مصر", () => {
  const all = U.filterEvents(D.EVENTS, {}, NOW);
  assert.strictEqual(all.length, D.EVENTS.length);
  const eg = U.filterEvents(D.EVENTS, { egypt: true }, NOW);
  assert.ok(eg.length > 30 && eg.every((e) => e.eg));
  const sport = U.filterEvents(D.EVENTS, { cat: "sport" }, NOW);
  assert.ok(sport.length > 5 && sport.every((e) => e.cat === "sport"));
  const q = U.filterEvents(D.EVENTS, { q: "اسكندريه" }, NOW);
  assert.ok(q.some((e) => e.title === "تأسيس الإسكندرية"), "البحث بالإسكندرية");
  const none = U.filterEvents(D.EVENTS, { q: "xyz-مفيش" }, NOW);
  assert.strictEqual(none.length, 0);
});

/* ---------- الاختبار ---------- */
test("الاختبار: ١٠ أسئلة، كل واحد فيه إجابة صحيحة واحدة وخيارات مختلفة", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const qs = U.makeQuiz(D.EVENTS, U.mulberry32(seed), 10, NOW);
    assert.strictEqual(qs.length, 10, "seed " + seed + " طلّع " + qs.length);
    for (const q of qs) {
      assert.ok(q.options.length === 2 || q.options.length === 4, q.q);
      assert.strictEqual(new Set(q.options).size, q.options.length, "خيارات متكررة: " + q.q + " → " + q.options.join(" | "));
      assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
      assert.ok(q.explain.length > 10);
    }
  }
});

test("الاختبار: الإجابة الصحيحة فعلاً صح (when و first)", () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const q of U.makeQuiz(D.EVENTS, U.mulberry32(seed), 10, NOW)) {
      if (q.type === "when") {
        const title = q.q.match(/«(.+)»/)[1];
        const e = find(title);
        const correct = q.options[q.answer];
        const want = e.k === "bce" ? e.v + " ق.م" : e.k === "ce" ? e.v + "م" : U.formatWhen({ k: e.k, v: e.v });
        assert.strictEqual(correct, want, title);
        // مفيش اختيار غلط بيطابق السنة الصح
        q.options.forEach((o, i) => { if (i !== q.answer) assert.notStrictEqual(o, want); });
      } else {
        const [a, b] = q.options.map(find);
        const older = U.compareEvents(a, b, NOW).older;
        assert.strictEqual(q.options[q.answer], older.title);
      }
    }
  }
});

test("الاختبار: مفيش سؤال مكرر ومفيش خيار سنة مستحيلة", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const qs = U.makeQuiz(D.EVENTS, U.mulberry32(seed), 10, NOW);
    // سؤال «أيهم حصل الأول؟» نصه ثابت، فالتكرار بيتقاس بالسؤال + الخيارات
    assert.strictEqual(new Set(qs.map((q) => q.q + "|" + [...q.options].sort().join("|"))).size, qs.length);
    const titles = qs.filter((q) => q.type === "when").map((q) => q.q);
    assert.strictEqual(new Set(titles).size, titles.length);
    for (const q of qs) {
      if (q.type !== "when") continue;
      for (const o of q.options) {
        const m = o.match(/^(\d+)(م| ق\.م)$/);
        if (m) {
          const y = +m[1];
          assert.ok(y >= 1 && (m[2] !== "م" || y <= NOW), "سنة مستحيلة " + o + " في " + q.q);
        }
      }
    }
  }
});

test("الاختبار: نفس الـ seed بيدي نفس الأسئلة", () => {
  const a = U.makeQuiz(D.EVENTS, U.mulberry32(7), 10, NOW);
  const b = U.makeQuiz(D.EVENTS, U.mulberry32(7), 10, NOW);
  assert.deepStrictEqual(a, b);
});

console.log("\n" + passed + " اختبار نجحوا" + (process.exitCode ? " (فيه فشل)" : ""));
