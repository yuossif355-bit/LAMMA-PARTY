"""اختبار شامل في متصفح حقيقي (Playwright + Chromium).
التشغيل:  pip install playwright && playwright install chromium && python3 tests/e2e.py
"""
import os, sys, time, tempfile, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = tempfile.mkdtemp(prefix="history-e2e-")
srv = subprocess.Popen(["python3", "-m", "http.server", "8771", "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors, results = [], []

def check(name, ok, extra=""):
    results.append(ok)
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra != "" else ""))

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_context(viewport={"width": 1200, "height": 900}).new_page()
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text else None)
        go = lambda r: (page.goto("http://127.0.0.1:8771/index.html#/" + r), page.wait_for_timeout(250))
        n = lambda sel: page.locator(sel).count()

        # الخط الزمني
        go("timeline")
        total = n(".ev")
        check("الخط الزمني بيعرض كل الأحداث", total > 140, total)
        check("أول حدث هو الانفجار العظيم", "الانفجار العظيم" in page.locator(".ev-title").first.inner_text())
        check("آخر عصر هو القرن الحادي والعشرين", "القرن الحادي والعشرين" in page.locator(".era-h").last.inner_text())
        check("التنقل نشط على الخط الزمني", page.locator('#nav a[aria-current="page"]').get_attribute("data-route") == "timeline")

        # بحث بإملاء مختلف (إسكندرية ← اسكندريه)
        page.fill(".search", "اسكندريه"); page.wait_for_timeout(300)
        titles = page.locator(".ev-title").all_inner_texts()
        check("البحث بيطبّع الهمزة والتاء", any("الإسكندرية" in t for t in titles), titles[:4])
        page.fill(".search", "xyz-مفيش"); page.wait_for_timeout(300)
        check("رسالة مفيش نتائج", n(".empty") == 1)
        page.fill(".search", ""); page.wait_for_timeout(300)

        # فلتر مصر وفئة
        page.get_by_role("button", name="🇪🇬 مصر").click()
        eg = n(".ev")
        check("فلتر مصر بيقلل الأحداث", 30 < eg < total, eg)
        check("كل كروت مصر عليها شارة مصر", n(".ev") == n(".ev .chip-eg"))
        page.get_by_role("button", name="الكل", exact=True).click()
        page.get_by_role("button", name="⚽ رياضة وألعاب").click()
        sp = n(".ev")
        check("فلتر الرياضة شغال", 5 < sp < 40, sp)
        page.get_by_role("button", name="الكل", exact=True).click()

        # حدث عشوائي
        page.get_by_role("button", name="🎲 حدث عشوائي").click(); page.wait_for_timeout(500)
        check("الحدث العشوائي بيتعلّم", n(".ev.flash") == 1)

        # السنة الكونية
        go("cosmic")
        rows = n(".cos-row")
        check("السنة الكونية فيها أحداث", rows >= 20, rows)
        first = page.locator(".cos-when").first.inner_text()
        check("أول حدث كوني 1 يناير", "1 يناير" in first, first)
        last = page.locator(".cos-when").last.inner_text()
        check("آخر حدث في آخر 31 ديسمبر", "31 ديسمبر" in last, last)
        check("شريط السنة فيه علامات", n(".strip-dot") == rows)
        check("المعلومة عن التاريخ المكتوب ظاهرة", "التاريخ المكتوب" in page.locator(".callout").nth(1).inner_text())

        # النهاردة في التاريخ
        go("today")
        page.select_option('select[aria-label="الشهر"]', "7")
        page.select_option('select[aria-label="اليوم"]', "20")
        check("20 يوليو فيه الهبوط على القمر", "الهبوط على القمر" in page.locator("main").inner_text())
        page.select_option('select[aria-label="الشهر"]', "2")
        days = n('select[aria-label="اليوم"] option')
        check("فبراير فيه 29 يوم كحد أقصى", days == 29, days)
        page.select_option('select[aria-label="الشهر"]', "3")
        page.select_option('select[aria-label="اليوم"]', "15")
        check("15 مارس فيه اغتيال قيصر بتاريخ ق.م", "15 مارس 44 ق.م" in page.locator("main").inner_text())
        page.select_option('select[aria-label="الشهر"]', "10")
        page.select_option('select[aria-label="اليوم"]', "15")
        check("يوم من غير أحداث بيعرض أقرب أيام", n(".delta") == 5, n(".delta"))

        # الاختبار
        go("quiz")
        page.get_by_role("button", name="ابدأ الاختبار").click()
        for i in range(10):
            assert n(".opt") in (2, 4), "عدد خيارات السؤال %d: %d" % (i + 1, n(".opt"))
            page.locator(".opt").first.click()
            assert n(".opt.ok") == 1, "لازم إجابة صح واحدة معلّمة"
            assert n(".explain") == 1
            page.get_by_role("button", name="السؤال التالي").or_(page.get_by_role("button", name="شوف نتيجتك")).click()
        check("الاختبار خلص وعرض النتيجة", n(".score") == 1 and "/ 10" in page.locator(".score").inner_text(), page.locator(".score").inner_text())
        best = page.evaluate("() => localStorage.getItem('hist-best')")
        check("أعلى نتيجة اتحفظت", best is not None and 0 <= int(best) <= 10, best)

        # المقارنة
        go("compare")
        txt = page.locator(".cmp-res").inner_text()
        check("المقارنة الافتراضية (الهرم والقمر)", "4,585" in txt or "4,5" in txt or "سنة" in txt, txt.replace("\n", " ")[:90])
        check("معلومة كليوباترا ظاهرة بالأرقام الصح", "2,530" in page.locator("main").inner_text() and "1,998" in page.locator("main").inner_text())
        page.select_option("#cmpB", page.locator("#cmpA").input_value())
        check("نفس الحدث بيتنبّه", "نفس الحدث" in page.locator(".cmp-res").inner_text())
        page.get_by_role("button", name="⇄ بدّل").click()

        # أخطاء أمان: مفيش HTML بيتحقن من اسم/نص
        check("مفيش عناصر script/iframe اتولدت في الصفحة", n("main script") == 0 and n("main iframe") == 0)

        # لقطات شاشة
        go("timeline"); page.screenshot(path=OUT + "/timeline.png")
        go("cosmic"); page.screenshot(path=OUT + "/cosmic.png", full_page=False)
        m = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True).new_page()
        m.on("pageerror", lambda e: errors.append("mobile pageerror: " + str(e)))
        for r in ["timeline", "cosmic", "today", "quiz", "compare"]:
            m.goto("http://127.0.0.1:8771/index.html#/" + r); m.wait_for_timeout(250)
            sw = m.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
            check("الموبايل: مفيش تمرير أفقي في " + r, sw[0] <= sw[1], sw)
        m.goto("http://127.0.0.1:8771/index.html#/timeline"); m.wait_for_timeout(300)
        m.screenshot(path=OUT + "/mobile-timeline.png")
        b.close()
finally:
    srv.terminate()

print("لقطات الشاشة في:", OUT)
print("--- errors:", errors if errors else "none")
bad = results.count(False)
print("\nالنتيجة:", len(results) - bad, "/", len(results))
sys.exit(1 if bad or errors else 0)
