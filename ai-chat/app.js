(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const KEY = "lamma-chat:v1";
  const NEW_TITLE = "محادثة جديدة";
  const MAX_HISTORY = 30;

  const MODELS = [
    { id: "gpt-5-nano", name: "GPT-5 nano (سريع)" },
    { id: "gpt-4o-mini", name: "GPT-4o mini" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  ];

  const STARTERS = [
    "اشرحلي الذكاء الاصطناعي ببساطة",
    "اقترح عليا 5 أفكار لسهرة مع صحابي",
    "اكتبلي كود بايثون يعدّ الكلمات في ملف",
    "ساعدني أكتب رسالة اعتذار لصاحبي",
  ];

  const SYSTEM =
    "إنت مساعد ذكي وودود جوه موقع «لمّة بارتي». رد دايمًا بنفس لغة المستخدم، ولو كتب بالعربي " +
    "رد بلهجة مصرية بسيطة وواضحة. خلّي الإجابة مختصرة ومفيدة، واستخدم Markdown (قوايم وأكواد) لما تفيد.";

  /* ---------- الحالة والتخزين ---------- */
  function load() {
    const def = { chats: [], active: null, model: MODELS[0].id, theme: null };
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && Array.isArray(s.chats)) return Object.assign(def, s);
    } catch (e) { /* تجاهل */ }
    return def;
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* المساحة اتملت أو الخصوصية */ }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const getChat = () => state.chats.find((c) => c.id === state.active) || null;

  let busy = false;
  let stopFlag = false;

  /* ---------- عناصر الصفحة ---------- */
  const el = {
    app: $("#app"), sidebar: $("#sidebar"), scrim: $("#scrim"), list: $("#chatList"),
    title: $("#chatTitle"), model: $("#model"), stage: $("#stage"), thread: $("#thread"),
    starters: $("#starters"), input: $("#input"), send: $("#sendBtn"), composer: $("#composer"),
    toBottom: $("#toBottom"),
  };

  /* ---------- الثيم ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "light" ? "#f2f6f5" : "#0d1a1f");
  }
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    state.theme = cur === "light" ? "dark" : "light";
    applyTheme(state.theme);
    save();
  });

  /* ---------- القايمة الجانبية ---------- */
  function openSide(open) {
    el.sidebar.classList.toggle("open", open);
    el.scrim.hidden = !open;
  }
  $("#openSide").addEventListener("click", () => openSide(true));
  $("#closeSide").addEventListener("click", () => openSide(false));
  el.scrim.addEventListener("click", () => openSide(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") openSide(false); });

  function renderList() {
    el.list.textContent = "";
    if (!state.chats.length) {
      const p = document.createElement("p");
      p.className = "empty-list";
      p.textContent = "لسه مفيش محادثات. ابدأ بسؤال.";
      el.list.appendChild(p);
      return;
    }
    state.chats
      .slice()
      .sort((a, b) => b.updated - a.updated)
      .forEach((c) => {
        const row = document.createElement("div");
        row.className = "chat-item" + (c.id === state.active ? " active" : "");
        const open = document.createElement("button");
        open.type = "button";
        open.className = "chat-open";
        open.textContent = c.title;
        open.title = c.title;
        open.addEventListener("click", () => { if (!busy) { state.active = c.id; save(); renderAll(); openSide(false); } });
        const del = document.createElement("button");
        del.type = "button";
        del.className = "chat-del";
        del.textContent = "✕";
        del.setAttribute("aria-label", "امسح المحادثة: " + c.title);
        del.addEventListener("click", () => {
          if (busy) return;
          if (!confirm("تمسح المحادثة «" + c.title + "»؟ مش هتقدر ترجّعها.")) return;
          state.chats = state.chats.filter((x) => x.id !== c.id);
          if (state.active === c.id) state.active = null;
          save();
          renderAll();
        });
        row.append(open, del);
        el.list.appendChild(row);
      });
  }

  $("#newChat").addEventListener("click", () => {
    if (busy) return;
    state.active = null;
    save();
    renderAll();
    openSide(false);
    el.input.focus();
  });

  /* ---------- الرسايل ---------- */
  function bodyHTML(m) {
    if (m.role === "user") return MD.esc(m.content);
    return m.content ? MD.render(m.content) : '<span class="typing" aria-label="بيكتب"><i></i><i></i><i></i></span>';
  }

  function msgEl(m, idx, isLast) {
    const art = document.createElement("article");
    art.className = "msg " + (m.role === "user" ? "user" : "ai");
    art.dataset.idx = idx;
    const body = document.createElement("div");
    body.className = "body";
    body.innerHTML = bodyHTML(m);
    art.appendChild(body);
    if (m.role === "assistant" && m.content) art.appendChild(toolsEl(isLast));
    return art;
  }

  function toolsEl(isLast) {
    const t = document.createElement("div");
    t.className = "tools";
    const copy = document.createElement("button");
    copy.type = "button"; copy.className = "tool"; copy.dataset.act = "copy"; copy.textContent = "انسخ الرد";
    t.appendChild(copy);
    if (isLast) {
      const re = document.createElement("button");
      re.type = "button"; re.className = "tool"; re.dataset.act = "regen"; re.textContent = "اعمل رد تاني";
      t.appendChild(re);
    }
    return t;
  }

  function renderMessages() {
    const chat = getChat();
    el.thread.textContent = "";
    el.app.classList.toggle("has-chat", !!(chat && chat.messages.length));
    if (!chat) return;
    chat.messages.forEach((m, i) => el.thread.appendChild(msgEl(m, i, i === chat.messages.length - 1)));
  }

  function renderAll() {
    const chat = getChat();
    el.title.textContent = chat ? chat.title : NEW_TITLE;
    document.title = (chat ? chat.title + " | " : "") + "اسأل لمّة";
    renderList();
    renderMessages();
    updateComposer();
    scrollDown(true);
  }

  /* ---------- التمرير ---------- */
  const nearBottom = () => el.stage.scrollHeight - el.stage.scrollTop - el.stage.clientHeight < 120;
  function scrollDown(force) {
    if (force || nearBottom()) el.stage.scrollTop = el.stage.scrollHeight;
  }
  el.stage.addEventListener("scroll", () => { el.toBottom.hidden = nearBottom(); });
  el.toBottom.addEventListener("click", () => { el.stage.scrollTop = el.stage.scrollHeight; });

  /* ---------- صندوق الكتابة ---------- */
  function updateComposer() {
    el.send.classList.toggle("stop", busy);
    el.send.setAttribute("aria-label", busy ? "وقّف الرد" : "ابعت");
    el.send.innerHTML = busy
      ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V6M12 6l-5.5 5.5M12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    el.send.disabled = !busy && !el.input.value.trim();
  }
  function grow() {
    el.input.style.height = "auto";
    el.input.style.height = Math.min(el.input.scrollHeight, 190) + "px";
  }
  el.input.addEventListener("input", () => { grow(); updateComposer(); });
  el.input.addEventListener("keydown", (e) => {
    const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && desktop) {
      e.preventDefault();
      el.composer.requestSubmit();
    }
  });
  el.composer.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) { stopFlag = true; return; }
    const text = el.input.value.trim();
    if (!text) return;
    el.input.value = "";
    grow();
    send(text);
  });

  /* ---------- الإرسال والرد ---------- */
  function newChat() {
    const c = { id: uid(), title: NEW_TITLE, messages: [], updated: Date.now() };
    state.chats.push(c);
    state.active = c.id;
    return c;
  }

  function send(text) {
    const chat = getChat() || newChat();
    chat.messages.push({ role: "user", content: text });
    if (chat.title === NEW_TITLE) chat.title = text.replace(/\s+/g, " ").slice(0, 42);
    chat.updated = Date.now();
    save();
    renderAll();
    generate(chat);
  }

  function friendlyError(e) {
    const raw = (e && (e.message || (e.error && (e.error.message || e.error)))) || String(e || "");
    const s = String(raw).toLowerCase();
    if (s === "no_puter") return "مش قادر أحمّل خدمة الذكاء الاصطناعي. اتأكد إنك متصل بالنت وجرب تاني.";
    if (s.includes("auth") || s.includes("cancel") || s.includes("sign") || s.includes("login")) {
      return "لازم تسجّل دخول بحساب Puter المجاني (ببلاش) عشان الشات يشتغل. جرب تاني ووافق على النافذة اللي هتظهرلك.";
    }
    if (s.includes("model")) return "النموذج ده مش متاح دلوقتي. اختار نموذج تاني من فوق وجرب.";
    if (s === "empty") return "الرد رجع فاضي. جرب تبعت تاني.";
    return "حصلت مشكلة وإحنا بنجيب الرد (" + String(raw).slice(0, 120) + "). جرب تاني.";
  }

  function showNotice(text, onRetry) {
    const box = document.createElement("div");
    box.className = "notice";
    box.setAttribute("role", "alert");
    const p = document.createElement("p");
    p.textContent = text;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "جرب تاني";
    b.addEventListener("click", () => { box.remove(); onRetry(); });
    box.append(p, b);
    el.thread.appendChild(box);
    scrollDown(true);
  }

  async function generate(chat) {
    busy = true;
    stopFlag = false;
    chat.messages.push({ role: "assistant", content: "" });
    renderMessages();
    updateComposer();
    scrollDown(true);

    const idx = chat.messages.length - 1;
    const msg = chat.messages[idx];
    const body = () => el.thread.querySelector('.msg[data-idx="' + idx + '"] .body');
    let queued = false;
    const paint = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const b = body();
        if (b) { b.innerHTML = bodyHTML(msg); scrollDown(false); }
      });
    };

    let failure = null;
    try {
      if (!window.puter || !puter.ai) throw new Error("NO_PUTER");
      const history = chat.messages.slice(0, -1).slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content }));
      const resp = await puter.ai.chat([{ role: "system", content: SYSTEM }].concat(history), { model: state.model, stream: true });
      for await (const part of resp) {
        if (stopFlag) break;
        const t = part && part.text;
        if (t) { msg.content += t; paint(); }
      }
      if (!msg.content.trim() && !stopFlag) throw new Error("EMPTY");
    } catch (e) {
      failure = e;
    }

    busy = false;
    if (!msg.content.trim()) chat.messages.pop();
    chat.updated = Date.now();
    save();
    renderAll();
    if (failure) showNotice(friendlyError(failure), () => generate(chat));
  }

  /* ---------- أدوات الرسالة ---------- */
  el.thread.addEventListener("click", (e) => {
    const copyCode = e.target.closest("[data-copy]");
    if (copyCode) {
      const code = copyCode.closest(".code").querySelector("code").textContent;
      flash(copyCode, code);
      return;
    }
    const tool = e.target.closest(".tool");
    if (!tool) return;
    const chat = getChat();
    const art = tool.closest(".msg");
    const m = chat && chat.messages[+art.dataset.idx];
    if (!m) return;
    if (tool.dataset.act === "copy") flash(tool, m.content);
    if (tool.dataset.act === "regen" && !busy) {
      chat.messages.pop();
      save();
      generate(chat);
    }
  });

  function flash(btn, text) {
    const old = btn.textContent;
    const done = () => { btn.textContent = "اتنسخ"; setTimeout(() => { btn.textContent = old; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    else done();
  }

  /* ---------- تصدير ---------- */
  $("#exportBtn").addEventListener("click", () => {
    const chat = getChat();
    if (!chat || !chat.messages.length) return;
    const md = "# " + chat.title + "\n\n" + chat.messages
      .map((m) => (m.role === "user" ? "**أنا:** " : "**الذكاء الاصطناعي:** ") + m.content)
      .join("\n\n---\n\n") + "\n";
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lamma-chat-" + new Date().toISOString().slice(0, 10) + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* ---------- البداية ---------- */
  MODELS.forEach((m) => {
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = m.name;
    el.model.appendChild(o);
  });
  if (!MODELS.some((m) => m.id === state.model)) state.model = MODELS[0].id;
  el.model.value = state.model;
  el.model.addEventListener("change", () => { state.model = el.model.value; save(); });

  STARTERS.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "starter";
    b.textContent = s;
    b.addEventListener("click", () => { if (!busy) send(s); });
    el.starters.appendChild(b);
  });

  renderAll();
  el.input.focus();
})();
