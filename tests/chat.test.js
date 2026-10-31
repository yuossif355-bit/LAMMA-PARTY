"use strict";
const assert = require("assert");
const MD = require("../ai-chat/md.js");

let passed = 0;
function t(name, fn) { fn(); passed++; console.log("ok - " + name); }

t("بيهرّب HTML الخطير", () => {
  const h = MD.render("<script>alert(1)</script> و <img src=x onerror=y>");
  assert(!h.includes("<script>") && !h.includes("<img"));
  assert(h.includes("&lt;script&gt;"));
});

t("بلوك الكود بيتهرّب وفيه زرار نسخ", () => {
  const h = MD.render("```js\nconst a = '<b>';\n```");
  assert(h.includes('class="code"') && h.includes("data-copy"));
  assert(h.includes("&lt;b&gt;") && !h.includes("<b>"));
  assert(h.includes(">js<"));
});

t("بلوك كود مش مقفول (أثناء الستريم) بيتعرض برضه", () => {
  const h = MD.render("بص:\n```py\nprint(1)");
  assert(h.includes("<pre") && h.includes("print(1)"));
});

t("قوايم نقطية ورقمية", () => {
  assert(MD.render("- أ\n- ب").includes("<ul><li>أ</li><li>ب</li></ul>"));
  assert(MD.render("1. أ\n2. ب").includes("<ol><li>أ</li><li>ب</li></ol>"));
});

t("عناوين وخط عريض ومائل وكود سطري", () => {
  assert(MD.render("# عنوان").includes("<h2>عنوان</h2>"));
  const h = MD.render("**غامق** و *مائل* و `x<y`");
  assert(h.includes("<strong>غامق</strong>") && h.includes("<em>مائل</em>") && h.includes("<code>x&lt;y</code>"));
});

t("الروابط http/https بس", () => {
  assert(MD.render("[موقع](https://example.com)").includes('href="https://example.com"'));
  assert(!MD.render("[x](javascript:alert(1))").includes("<a "));
});

t("فقرات وأسطر", () => {
  const h = MD.render("سطر1\nسطر2\n\nفقرة تانية");
  assert(h.includes("<p>سطر1<br>سطر2</p><p>فقرة تانية</p>"));
});

t("نص فاضي", () => { assert.strictEqual(MD.render(""), ""); assert.strictEqual(MD.render(null), ""); });

console.log(passed + " اختبارات نجحت");
