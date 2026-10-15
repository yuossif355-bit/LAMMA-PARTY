/* تاريخ كل حاجة - منطق الأحداث (ترتيب، تنسيق التواريخ، السنة الكونية، الاختبارات)
   الملف ده مفيهوش أي حاجة تخص المتصفح، عشان كده بيتختبر في Node. */
(function (root) {
  "use strict";

  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const COSMIC_AGE = 13.8e9;          // عمر الكون بالسنين
  const YEAR_SEC = 365 * 86400;       // «السنة الكونية» بالثواني
  const MULT = { bya: 1e9, mya: 1e6, kya: 1e3 };

  const ERAS = [
    { id: "pre", n: "قبل الإنسان العاقل", e: "🌌" },
    { id: "prehistory", n: "ما قبل التاريخ", e: "🔥" },
    { id: "ancient", n: "العصور القديمة", e: "🏺" },
    { id: "medieval", n: "العصور الوسطى", e: "🕌" },
    { id: "early", n: "العصر الحديث المبكر", e: "🧭" },
    { id: "c19", n: "القرن التاسع عشر", e: "🚂" },
    { id: "c20", n: "القرن العشرين", e: "✈️" },
    { id: "c21", n: "القرن الحادي والعشرين", e: "📱" },
  ];

  const nowYear = () => new Date().getFullYear();
  const pad = (n) => String(n).padStart(2, "0");
  const num = (n) => String(+Number(n).toFixed(2));
  const grouped = (n) => Math.round(n).toLocaleString("en-US");

  /* ---------- الوقت ---------- */
  // كام سنة فاتت من الحدث لحد النهاردة
  function yearsAgo(e, now) {
    now = now || nowYear();
    if (MULT[e.k]) return e.v * MULT[e.k];
    if (e.k === "bce") return now + e.v - 1;   // مفيش سنة صفر: 1 ق.م قبل 1م بسنة
    if (e.k === "ce") return now - e.v;
    throw new Error("نوع وقت غير معروف: " + e.k);
  }

  function mdParts(e) {
    if (!e.md) return null;
    const p = e.md.split("-").map(Number);
    return p.length === 2 && p[0] >= 1 && p[0] <= 12 && p[1] >= 1 && p[1] <= DAYS_IN[p[0] - 1] ? p : null;
  }

  // من الأقدم للأحدث (ولو نفس السنة بالشهر واليوم)
  function sortEvents(events, now) {
    return events
      .map((e, i) => ({ e, i, y: yearsAgo(e, now), md: mdParts(e) }))
      .sort((a, b) => {
        if (b.y !== a.y) return b.y - a.y;
        const am = a.md ? a.md[0] * 100 + a.md[1] : 9999;
        const bm = b.md ? b.md[0] * 100 + b.md[1] : 9999;
        return am - bm || a.i - b.i;
      })
      .map((x) => x.e);
  }

  function eraOf(e) {
    if (e.k === "bya" || e.k === "mya") return "pre";
    if (e.k === "kya" || (e.k === "bce" && e.v > 3200)) return "prehistory";
    if (e.k === "bce" || e.v < 500) return "ancient";
    if (e.v < 1492) return "medieval";
    if (e.v < 1800) return "early";
    if (e.v < 1900) return "c19";
    if (e.v < 2000) return "c20";
    return "c21";
  }

  function groupByEra(sorted) {
    const out = [];
    for (const era of ERAS) {
      const items = sorted.filter((e) => eraOf(e) === era.id);
      if (items.length) out.push({ era, items });
    }
    return out;
  }

  /* ---------- تنسيق ---------- */
  function formatWhen(e) {
    const ap = e.approx ? "حوالي " : "";
    if (e.k === "bya") return "قبل " + (e.approx ? "حوالي " : "") + num(e.v) + " مليار سنة";
    if (e.k === "mya") return "قبل " + (e.approx ? "حوالي " : "") + num(e.v) + " مليون سنة";
    if (e.k === "kya") return "قبل " + (e.approx ? "حوالي " : "") + num(e.v) + " ألف سنة";
    const md = mdParts(e);
    if (e.k === "bce") return md ? md[1] + " " + MONTHS[md[0] - 1] + " " + e.v + " ق.م" : ap + e.v + " ق.م";
    if (md) return md[1] + " " + MONTHS[md[0] - 1] + " " + e.v + "م";
    return ap + e.v + "م";
  }

  // مدة بالسنين بصياغة مصرية
  function formatSpan(y) {
    y = Math.abs(y);
    if (y >= 1e9) return num(y / 1e9) + " مليار سنة";
    if (y >= 1e6) return num(y / 1e6) + " مليون سنة";
    if (y >= 1e4) return num(y / 1e3) + " ألف سنة";
    y = Math.round(y);
    if (y === 0) return "نفس السنة";
    if (y === 1) return "سنة واحدة";
    if (y === 2) return "سنتين";
    if (y <= 10) return y + " سنين";
    return grouped(y) + " سنة";
  }

  function ago(e, now) {
    const y = yearsAgo(e, now);
    return y < 1 ? "السنة دي" : "من " + formatSpan(y);
  }

  function compareEvents(a, b, now) {
    const ya = yearsAgo(a, now);
    const yb = yearsAgo(b, now);
    const aOlder = ya >= yb;
    return { older: aOlder ? a : b, newer: aOlder ? b : a, span: Math.abs(ya - yb), approx: !!(a.approx || b.approx) };
  }

  /* ---------- السنة الكونية ---------- */
  function clock(sod) {
    const h = Math.floor(sod / 3600);
    const m = Math.floor((sod % 3600) / 60);
    const s = Math.floor(sod % 60);
    return (h % 12 || 12) + ":" + pad(m) + ":" + pad(s) + " " + (h >= 12 ? "م" : "ص");
  }

  function cosmicInfo(e, now) {
    const ya = yearsAgo(e, now);
    const secBefore = (ya / COSMIC_AGE) * YEAR_SEC;
    const t = Math.max(0, YEAR_SEC - secBefore);
    const dayIdx = Math.min(364, Math.floor(t / 86400));
    let month = 0;
    let d = dayIdx;
    while (d >= DAYS_IN[month]) { d -= DAYS_IN[month]; month++; }
    const day = d + 1;
    const sod = t - dayIdx * 86400;
    let label;
    if (ya >= COSMIC_AGE * 0.999) {
      label = "1 يناير — لحظة البداية";
    } else {
      label = day + " " + MONTHS[month];
      if (month === 11 && day === 31) {
        label += secBefore < 1
          ? "، آخر " + (secBefore < 0.1 ? secBefore.toFixed(3) : secBefore.toFixed(2)) + " ثانية قبل منتصف الليل"
          : "، " + clock(sod);
      }
    }
    return { secBefore, frac: t / YEAR_SEC, month, day, label };
  }

  /* ---------- النهاردة في التاريخ ---------- */
  const dayOfYear = (m, d) => DAYS_IN.slice(0, m - 1).reduce((a, b) => a + b, 0) + d;

  function onThisDay(events, m, d, now) {
    const key = pad(m) + "-" + pad(d);
    return sortEvents(events.filter((e) => e.md === key), now);
  }

  // أقرب أيام فيها أحداث لو اليوم المطلوب مفيهوش (delta بالأيام، موجب = بعد)
  function nearestDays(events, m, d, limit) {
    const target = dayOfYear(m, d);
    const out = [];
    for (const e of events) {
      const p = mdParts(e);
      if (!p) continue;
      let delta = dayOfYear(p[0], p[1]) - target;
      if (delta > 182) delta -= 365;
      if (delta < -182) delta += 365;
      if (delta !== 0) out.push({ event: e, delta });
    }
    out.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
    return out.slice(0, limit || 5);
  }

  /* ---------- بحث وفلترة ---------- */
  function normalizeAr(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }

  function filterEvents(events, f, now) {
    f = f || {};
    const q = normalizeAr(f.q);
    return sortEvents(
      events.filter((e) => {
        if (f.cat && e.cat !== f.cat) return false;
        if (f.egypt && !e.eg) return false;
        if (q && !normalizeAr(e.title + " " + e.text).includes(q)) return false;
        return true;
      }),
      now
    );
  }

  /* ---------- الاختبار ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function optionText(e, value) {
    if (e.k === "bce") return value + " ق.م";
    if (e.k === "ce") return value + "م";
    return formatWhen({ k: e.k, v: value });
  }

  // 3 اختيارات غلط قريبة بما يكفي تبقى مقنعة وبعيدة بما يكفي متتلخبطش
  function distractors(e, rng, now) {
    const out = [];
    const seen = new Set([e.v]);
    let guard = 0;
    if (e.k === "ce" || e.k === "bce") {
      const scale = Math.max(4, Math.round(yearsAgo(e, now) / 12));
      const gap = Math.max(1, Math.round(scale * 0.3));
      const far = (v) => [...seen].every((s) => Math.abs(s - v) >= gap);
      while (out.length < 3 && guard++ < 200) {
        const off = Math.max(gap, Math.round(scale * (0.4 + rng() * 1.6)));
        const v = e.v + (rng() < 0.5 ? -off : off);
        if (v < 1 || (e.k === "ce" && v > now) || !far(v)) continue;
        seen.add(v);
        out.push(v);
      }
    } else {
      const mults = shuffle([0.3, 0.5, 0.7, 1.4, 2, 3], rng);
      for (const m of mults) {
        if (out.length === 3) break;
        const v = +(e.v * m).toPrecision(3);
        if (v > 0 && !seen.has(v)) { seen.add(v); out.push(v); }
      }
    }
    return out.length === 3 ? out : null;
  }

  function makeQuiz(events, rng, count, now) {
    count = count || 10;
    now = now || nowYear();
    rng = rng || Math.random;
    const pool = shuffle(events, rng);
    const used = new Set();
    const qs = [];

    const pickPartner = (a) => {
      const ya = yearsAgo(a, now);
      return pool.find((b) => {
        if (b === a || used.has(b)) return false;
        const gap = Math.abs(ya - yearsAgo(b, now));
        return gap > (a.approx || b.approx ? 50 : 5) && gap > ya * 0.02;
      });
    };

    for (const e of pool) {
      if (qs.length >= count) break;
      if (used.has(e)) continue;
      const wantFirst = qs.length % 3 === 2;
      if (wantFirst) {
        const b = pickPartner(e);
        if (b) {
          const cmp = compareEvents(e, b, now);
          const opts = shuffle([e, b], rng);
          used.add(e); used.add(b);
          qs.push({
            type: "first",
            q: "أيهم حصل الأول؟",
            options: opts.map((x) => x.title),
            answer: opts.indexOf(cmp.older),
            explain: cmp.older.title + " (" + formatWhen(cmp.older) + ") حصل قبل " + cmp.newer.title +
              " (" + formatWhen(cmp.newer) + ") بحوالي " + formatSpan(cmp.span) + ".",
          });
          continue;
        }
      }
      const bad = distractors(e, rng, now);
      if (!bad) continue;
      const opts = shuffle([e.v, ...bad], rng);
      used.add(e);
      qs.push({
        type: "when",
        q: "إمتى حصل: «" + e.title + "»؟" + (e.approx ? " (تقريباً)" : ""),
        options: opts.map((v) => optionText(e, v)),
        answer: opts.indexOf(e.v),
        explain: e.title + ": " + formatWhen(e) + ". " + e.text,
      });
    }
    return qs;
  }

  const api = {
    MONTHS, DAYS_IN, COSMIC_AGE, YEAR_SEC, ERAS,
    yearsAgo, sortEvents, eraOf, groupByEra,
    formatWhen, formatSpan, ago, compareEvents,
    cosmicInfo, onThisDay, nearestDays, dayOfYear,
    normalizeAr, filterEvents, mulberry32, shuffle, makeQuiz, mdParts,
  };
  root.HistoryUtil = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
