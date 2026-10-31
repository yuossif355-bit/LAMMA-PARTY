/* عارض Markdown صغير وآمن (بيهرّب أي HTML). بيشتغل في المتصفح وفي Node للاختبار. */
(function (root) {
  "use strict";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (m, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return "<code>" + esc(codes[+i]) + "</code>";
    });
    return s;
  }

  function codeBlock(code, lang) {
    return '<div class="code"><div class="code-bar"><span class="code-lang" dir="ltr">' +
      esc(lang || "code") +
      '</span><button type="button" class="copy" data-copy>نسخ</button></div>' +
      '<pre dir="ltr"><code>' + esc(code) + "</code></pre></div>";
  }

  const isBlockStart = function (l) {
    return /^```/.test(l) || /^#{1,4}\s/.test(l) || /^>\s?/.test(l) ||
      /^\s*[-*+]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^\s*(---+|\*\*\*+)\s*$/.test(l);
  };

  function render(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;

      if ((m = /^```\s*([\w+#-]*)/.exec(line))) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(codeBlock(buf.join("\n"), m[1]));
        continue;
      }
      if (/^\s*$/.test(line)) { i++; continue; }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
        const n = Math.min(m[1].length + 1, 5);
        out.push("<h" + n + ">" + inline(m[2]) + "</h" + n + ">");
        i++;
        continue;
      }
      if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(buf.join("\n")).replace(/\n/g, "<br>") + "</blockquote>");
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push("<li>" + inline(lines[i].replace(/^\s*[-*+]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ul>" + items.join("") + "</ul>");
        continue;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push("<li>" + inline(lines[i].replace(/^\s*\d+[.)]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ol>" + items.join("") + "</ol>");
        continue;
      }
      const buf = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && (buf.length === 0 || !isBlockStart(lines[i]))) {
        buf.push(lines[i]);
        i++;
      }
      out.push("<p>" + inline(buf.join("\n")).replace(/\n/g, "<br>") + "</p>");
    }
    return out.join("");
  }

  const api = { render: render, esc: esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MD = api;
})(typeof window !== "undefined" ? window : globalThis);
