/* ------------------------------------------------------------------
   Interface : accueil, quiz, résultats.
------------------------------------------------------------------- */
(function () {
  "use strict";

  const DATA = window.DATA;
  const L = window.Logic;
  const app = document.getElementById("app");

  const CONT = {
    E: "Europe", A: "Asie", F: "Afrique",
    N: "Amérique du Nord", S: "Amérique du Sud", O: "Océanie"
  };
  const MODES = [
    { id: "flag", sw: "sw-flag", title: "Drapeau → pays", desc: "Tu vois le drapeau, tu écris le pays." },
    { id: "cap",  sw: "sw-cap",  title: "Pays → capitale", desc: "Tu vois le pays, tu écris sa capitale." },
    { id: "rev",  sw: "sw-rev",  title: "Capitale → pays", desc: "Tu vois la capitale, tu écris le pays." },
    { id: "old",  sw: "sw-old",  title: "Anciens drapeaux", desc: "URSS, Yougoslavie, RDA, Zaïre… de quel État s'agit-il ?" }
  ];
  const COUNTS = [10, 20, 50, 0]; // 0 = tout

  const flagUrl = (code, w) => "https://flagcdn.com/w" + (w || 640) + "/" + code + ".png";
  const commons = (f) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=640";

  const COUNTRIES = DATA.RAW.map(function (r) {
    return { code: r[0], name: r[1], cap: r[2], c: r[3], an: r[4] || [], ac: r[5] || [] };
  });
  const HIST = DATA.HIST;
  const INDEX = L.buildIndex(COUNTRIES, HIST);

  /* ---------- petits utilitaires ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  const $ = (id) => document.getElementById(id);

  function loadFlag(img, urls, onOk, onFail) {
    let k = 0;
    img.onload = function () { if (onOk) onOk(); };
    img.onerror = function () {
      k++;
      if (k < urls.length) img.src = urls[k];
      else if (onFail) onFail();
    };
    img.src = urls[0];
  }

  /* ---------- préférences ---------- */
  const LS_KEY = "drapeaux-prefs-v1";
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY));
      if (p && Array.isArray(p.modes) && Array.isArray(p.conts) && COUNTS.indexOf(p.count) !== -1) return p;
    } catch (e) { /* stockage indisponible */ }
    return { modes: ["flag"], conts: Object.keys(CONT), count: 20 };
  }
  function savePrefs() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignoré */ }
  }
  let prefs = loadPrefs();
  let S = null; // état de la partie en cours

  /* ---------- construction des questions ---------- */
  function buildPool(p) {
    const modes = new Set(p.modes), conts = new Set(p.conts), pool = [];
    COUNTRIES.forEach(function (c) {
      if (!conts.has(c.c)) return;
      if (modes.has("flag")) pool.push({
        base: c.code, mode: "flag", prompt: "Quel est ce pays ?",
        flags: [flagUrl(c.code)], flagSize: "main",
        answer: c.name, alts: c.an, kind: "name", extra: "Capitale : " + c.cap
      });
      if (modes.has("cap")) pool.push({
        base: c.code, mode: "cap", prompt: "Quelle est la capitale de…", big: c.name,
        flags: [flagUrl(c.code, 160)], flagSize: "small",
        answer: c.cap, alts: c.ac, kind: "cap", extra: ""
      });
      if (modes.has("rev")) pool.push({
        base: c.code, mode: "rev", prompt: "De quel pays est-ce la capitale ?", big: c.cap,
        flags: null, revealFlag: [flagUrl(c.code, 320)],
        answer: c.name, alts: c.an, kind: "name", extra: ""
      });
    });
    if (modes.has("old")) HIST.forEach(function (h) {
      if (!conts.has(h.c)) return;
      pool.push({
        base: "h:" + h.id, mode: "old", prompt: "À quel pays ou État appartenait ce drapeau ?",
        flags: h.files.map(commons), flagSize: "main",
        answer: h.name, alts: h.alt, kind: "name", extra: h.period + ". " + h.note
      });
    });
    return pool;
  }

  /* ================================================================
     ACCUEIL
  ================================================================ */
  function renderHome() {
    clearTimer();
    S = null;
    const strip = L.shuffle(COUNTRIES).slice(0, 10).map(function (c) {
      return '<img src="' + flagUrl(c.code, 80) + '" alt="">';
    }).join("");

    app.innerHTML =
      '<main class="home">' +
        '<header>' +
          '<div class="strip" aria-hidden="true">' + strip + '</div>' +
          '<h1>Drapeaux du monde</h1>' +
          '<p class="lede">Réponds au clavier. Les accents, les tirets et les majuscules n\'ont pas d\'importance, et une petite faute de frappe passe.</p>' +
        '</header>' +
        '<section class="block"><h2>Ce que tu révises</h2><div class="modes" id="modes">' +
          MODES.map(function (m) {
            return '<button type="button" class="mode" data-mode="' + m.id + '" aria-pressed="false">' +
              '<span class="swatch ' + m.sw + '" aria-hidden="true"></span>' +
              '<span><strong>' + m.title + '</strong><span class="desc">' + m.desc + '</span></span>' +
              '<span class="tick" aria-hidden="true"></span></button>';
          }).join("") +
        '</div></section>' +
        '<section class="block"><h2>Continents</h2><div class="chips" id="conts">' +
          Object.keys(CONT).map(function (k) {
            return '<button type="button" class="chip" data-cont="' + k + '" aria-pressed="false">' + CONT[k] + '</button>';
          }).join("") +
        '</div></section>' +
        '<section class="block"><h2>Nombre de questions</h2><div class="chips" id="counts">' +
          COUNTS.map(function (n) {
            return '<button type="button" class="chip" data-count="' + n + '" aria-pressed="false">' + (n === 0 ? "Toutes" : n) + '</button>';
          }).join("") +
        '</div></section>' +
        '<button type="button" class="cta wide" id="go"></button>' +
        '<p class="hint" id="hint"></p>' +
      '</main>';

    $("modes").addEventListener("click", function (e) {
      const b = e.target.closest("[data-mode]"); if (!b) return;
      toggle(prefs.modes, b.dataset.mode); refreshHome();
    });
    $("conts").addEventListener("click", function (e) {
      const b = e.target.closest("[data-cont]"); if (!b) return;
      toggle(prefs.conts, b.dataset.cont); refreshHome();
    });
    $("counts").addEventListener("click", function (e) {
      const b = e.target.closest("[data-count]"); if (!b) return;
      prefs.count = Number(b.dataset.count); refreshHome();
    });
    $("go").addEventListener("click", function () {
      const pool = buildPool(prefs);
      if (pool.length) startSession(pool, prefs.count);
    });
    refreshHome();
  }

  function toggle(arr, v) {
    const i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
  }

  function refreshHome() {
    savePrefs();
    document.querySelectorAll("[data-mode]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(prefs.modes.indexOf(b.dataset.mode) !== -1));
    });
    document.querySelectorAll("[data-cont]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(prefs.conts.indexOf(b.dataset.cont) !== -1));
    });
    document.querySelectorAll("[data-count]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.count) === prefs.count));
    });
    const total = buildPool(prefs).length;
    const n = prefs.count === 0 ? total : Math.min(prefs.count, total);
    const go = $("go");
    go.disabled = total === 0;
    go.textContent = total === 0 ? "Commencer" : "Commencer (" + n + " question" + (n > 1 ? "s" : "") + ")";
    $("hint").textContent = total === 0 ? "Choisis au moins un type de question et un continent." : "";
  }

  /* ================================================================
     QUIZ
     L'écran est construit une seule fois : le champ de réponse n'est jamais
     recréé, donc il garde le focus (et le clavier mobile reste ouvert).
  ================================================================ */
  function startSession(pool, count) {
    let qs = L.spread(L.shuffle(pool));
    if (count > 0) qs = qs.slice(0, count);
    S = { qs: qs, i: 0, results: [], given: [], validated: false, lock: 0 };
    buildShell();
    showQuestion();
  }

  function buildShell() {
    app.innerHTML =
      '<section class="quiz" id="quiz">' +
        '<div class="quiz-top">' +
          '<button type="button" class="ghost" id="quit">Arrêter</button>' +
          '<div class="count" id="count" aria-live="polite"></div>' +
        '</div>' +
        '<div class="bar" id="bar" aria-hidden="true"></div>' +
        '<p class="prompt" id="prompt"></p>' +
        '<div class="stage" id="stage"></div>' +
        '<div class="fb-slot" id="fb" aria-live="polite"></div>' +
        '<form class="answer" id="form" autocomplete="off">' +
          '<input id="ans" type="text" placeholder="Ta réponse" aria-label="Ta réponse" ' +
                 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">' +
          '<button type="submit" class="cta" id="submit">Valider</button>' +
        '</form>' +
        '<div class="idk-row"><button type="button" class="ghost" id="idk">Je ne sais pas</button>' +
          '<span class="idk-tip"> ou Entrée avec un champ vide</span></div>' +
      '</section>';

    const inp = $("ans");

    // Un tap sur un bouton ne doit pas voler le focus au champ (sinon le clavier se ferme).
    $("quiz").addEventListener("mousedown", function (e) {
      if (e.target.closest("button")) e.preventDefault();
    });

    $("form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (S.validated) { next(); return; }
      const v = inp.value.trim();
      // Champ vide + Entrée = « je ne sais pas » (compté faux).
      finish(v ? L.judge(v, S.qs[S.i], INDEX) : "ko", v);
    });
    $("idk").addEventListener("click", function () {
      if (!S.validated) finish("ko", "");
      inp.focus({ preventScroll: true });
    });
    $("quit").addEventListener("click", quit);

    // Après la correction, le champ reste actif mais son contenu est figé.
    inp.addEventListener("input", function () {
      if (S.validated) inp.value = S.given[S.i] || "";
    });
  }

  function showQuestion() {
    const q = S.qs[S.i];
    S.validated = false;

    const inp = $("ans");
    inp.value = "";
    inp.classList.remove("done", "good", "bad");
    $("submit").textContent = "Valider";
    $("idk").hidden = false;
    $("fb").innerHTML = "";
    $("prompt").textContent = q.prompt;
    drawBar(); drawCount();

    const stage = $("stage");
    stage.innerHTML = "";
    if (q.flags && q.flagSize === "main") {
      const box = el("div", "flagbox");
      const img = el("img"); img.alt = "Drapeau à identifier";
      box.appendChild(img); stage.appendChild(box);
      loadFlag(img, q.flags,
        function () { box.classList.add("ready"); },
        function () { flagFailed(q); });
    } else if (q.flags && q.flagSize === "small") {
      const row = el("div", "namerow");
      const img = el("img"); img.alt = "";
      loadFlag(img, q.flags, null, function () { img.remove(); });
      row.appendChild(img);
      row.appendChild(el("h2", "big", q.big));
      stage.appendChild(row);
    } else {
      stage.appendChild(el("h2", "big", q.big));
    }

    // Précharge le drapeau de la question suivante.
    const nq = S.qs[S.i + 1];
    if (nq && nq.flags) { const p = new Image(); p.src = nq.flags[0]; }

    inp.focus({ preventScroll: true });
  }

  function flagFailed(q) {
    // Image introuvable (ex. nom de fichier Commons incorrect) : on saute la question.
    if (!S || q.failed || S.qs[S.i] !== q) return;
    q.failed = true;
    S.qs.splice(S.i, 1);
    if (S.qs.length === 0) return renderHome();
    if (S.i >= S.qs.length) return renderEnd();
    showQuestion();
  }

  function drawBar() {
    const bar = $("bar"); bar.innerHTML = "";
    S.qs.forEach(function (_, i) {
      const s = document.createElement("span");
      if (S.results[i]) s.className = S.results[i];
      else if (i === S.i) s.className = "cur";
      bar.appendChild(s);
    });
  }
  function goodCount() { return S.results.filter(function (r) { return r === "ok"; }).length; }
  function drawCount() {
    const g = goodCount();
    $("count").innerHTML = (S.i + 1) + " / " + S.qs.length +
      "<small>" + g + " juste" + (g > 1 ? "s" : "") + "</small>";
  }

  function finish(res, given) {
    const q = S.qs[S.i];
    S.validated = true;
    S.lock = Date.now() + 200; // évite qu'un double appui saute la correction
    S.results[S.i] = res === "ko" ? "ko" : "ok";
    S.given[S.i] = given;
    drawBar(); drawCount();

    const last = S.i === S.qs.length - 1;
    const inp = $("ans");
    inp.classList.add("done", res === "ko" ? "bad" : "good");
    $("submit").textContent = last ? "Voir le résultat" : "Suivant";
    $("idk").hidden = true;

    const fb = $("fb"); fb.innerHTML = "";
    const box = el("div", "fb " + (res === "ko" ? "ko" : "ok"));
    if (q.revealFlag) {
      const im = el("img", "fb-flag"); im.alt = "Drapeau : " + q.answer;
      loadFlag(im, q.revealFlag, null, function () { im.remove(); });
      box.appendChild(im);
    }
    const txt = el("div", "fb-text");
    const title = el("p", "fb-title");
    if (res === "ok") {
      const same = L.variants(given).some(function (u) { return L.variants(q.answer).indexOf(u) !== -1; });
      title.textContent = same ? "Correct" : "Correct : " + q.answer;
    } else if (res === "typo") {
      title.textContent = "Correct, à une faute près : " + q.answer;
    } else {
      title.textContent = "C'était : " + q.answer;
    }
    txt.appendChild(title);
    if (q.extra) txt.appendChild(el("p", "fb-extra", q.extra));
    if (res === "ko" && given) {
      const fix = el("button", "ghost", "J'avais juste");
      fix.type = "button";
      fix.addEventListener("click", function () {
        S.results[S.i] = "ok";
        drawBar(); drawCount();
        title.textContent = "Compté juste";
        box.className = "fb ok";
        inp.classList.remove("bad"); inp.classList.add("good");
        fix.remove();
        inp.focus({ preventScroll: true });
      });
      txt.appendChild(fix);
    }
    box.appendChild(txt);

    // Bonne réponse (même avec une faute ou un alias) : passage automatique après 2 s.
    if (res !== "ko") {
      const ms = 2000;
      const timer = el("span", "fb-timer");
      timer.style.setProperty("--t", ms + "ms");
      box.appendChild(timer);
      const sess = S, idx = S.i;
      clearTimer();
      S.timer = setTimeout(function () {
        if (S === sess && S.validated && S.i === idx) next();
      }, ms);
    }
    fb.appendChild(box);
    inp.focus({ preventScroll: true });
  }

  function clearTimer() {
    if (S && S.timer) { clearTimeout(S.timer); S.timer = null; }
  }

  function next() {
    if (!S || !S.validated || Date.now() < S.lock) return;
    clearTimer();
    S.i++;
    if (S.i >= S.qs.length) renderEnd(); else showQuestion();
  }

  function quit() {
    clearTimer();
    const answered = S.results.filter(Boolean).length;
    if (answered === 0) return renderHome();
    S.qs = S.qs.slice(0, answered);
    renderEnd();
  }

  // Filet de sécurité (clavier physique) si le focus n'est plus sur le champ.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !S || !S.validated) return;
    if (e.target.closest && e.target.closest("button, input")) return;
    e.preventDefault();
    next();
  });

  /* ================================================================
     RÉSULTAT
  ================================================================ */
  function describe(q) {
    if (q.mode === "flag") return "Drapeau";
    if (q.mode === "old") return "Ancien drapeau";
    if (q.mode === "cap") return "Capitale de " + q.big;
    return q.big + " (capitale de quel pays ?)";
  }

  function renderEnd() {
    clearTimer();
    const total = S.qs.length;
    if (total === 0) return renderHome();
    const good = goodCount();
    const pct = Math.round((good / total) * 100);
    const verdict = pct === 100 ? "Sans faute."
      : pct >= 90 ? "Excellent."
      : pct >= 70 ? "Solide, encore un peu de travail."
      : pct >= 50 ? "Ça vient."
      : "On y retourne, ça rentre avec la répétition.";
    const misses = [];
    S.qs.forEach(function (q, i) { if (S.results[i] === "ko") misses.push({ q: q, given: S.given[i] }); });

    app.innerHTML =
      '<main class="end">' +
        '<p class="score-big">' + good + '<span> / ' + total + '</span></p>' +
        '<p class="verdict">' + verdict + '</p>' +
        '<div class="end-actions" id="endActions"></div>' +
        (misses.length ? '<h2>À revoir</h2><ul class="misses" id="misses"></ul>' : '') +
      '</main>';

    const actions = $("endActions");
    if (misses.length) {
      const again = el("button", "cta", "Rejouer les " + misses.length + " erreur" + (misses.length > 1 ? "s" : ""));
      again.type = "button";
      again.addEventListener("click", function () {
        startSession(misses.map(function (m) { const c = Object.assign({}, m.q); c.failed = false; return c; }), 0);
      });
      actions.appendChild(again);
    }
    const home = el("button", "btn2", "Nouvelle partie");
    home.type = "button";
    home.addEventListener("click", renderHome);
    actions.appendChild(home);

    const ul = $("misses");
    if (ul) misses.forEach(function (m) {
      const li = el("li", "miss");
      const urls = m.q.flags || m.q.revealFlag;
      if (urls) {
        const im = el("img"); im.alt = "";
        loadFlag(im, urls, null, function () { im.remove(); });
        li.appendChild(im);
      } else li.appendChild(el("span", "ph"));
      const box = el("div");
      box.appendChild(el("p", "miss-q", describe(m.q)));
      const a = el("p", "miss-a", m.q.answer);
      if (m.given) a.appendChild(el("small", null, "Ta réponse : " + m.given));
      box.appendChild(a);
      li.appendChild(box);
      ul.appendChild(li);
    });
  }

  // Hauteur réellement visible (clavier mobile ouvert) : sert à dimensionner le drapeau.
  function setVvh() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--vvh", h + "px");
  }
  setVvh();
  window.addEventListener("resize", setVvh);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", setVvh);

  renderHome();
})();
