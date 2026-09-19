/* ------------------------------------------------------------------
   Logique de correction (sans DOM, donc testable avec Node).
   Tolérance : casse, accents, tirets, apostrophes, espaces, articles
   (le/la/les/l'), « St » pour « Saint », et jusqu'à 1 ou 2 fautes de frappe.
------------------------------------------------------------------- */
(function (root) {
  "use strict";

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  const strip = (s) => s.replace(/[^a-z0-9]/g, "");

  /* Renvoie les formes « comparables » d'un texte (sans accents, tirets,
     espaces…), avec et sans article initial. */
  function variants(s) {
    let t = norm(s)
      .replace(/[’'`ʻʼ]/g, " ")
      .replace(/[-_.,;:!?]/g, " ")
      .replace(/\s+/g, " ").trim();
    t = t.replace(/\bst\b/g, "saint").replace(/\bste\b/g, "sainte");
    const out = new Set();
    const full = strip(t);
    if (full) out.add(full);
    const m = t.match(/^(?:le|la|les|l|the|el)\s+(.+)$/);
    if (m) { const k = strip(m[1]); if (k) out.add(k); }
    return Array.from(out);
  }

  function lev(a, b) {
    if (a === b) return 0;
    let prev = new Array(b.length + 1), cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }

  /* Index de toutes les réponses valides : sert à refuser une « faute de
     frappe » qui serait en réalité le nom d'un autre pays ou d'une autre
     capitale (ex. Kingston / Kingstown). */
  function buildIndex(countries, hist) {
    const nameKeys = new Set(), capKeys = new Set();
    const add = (set, list) => list.forEach((x) => variants(x).forEach((k) => set.add(k)));
    countries.forEach((c) => {
      add(nameKeys, [c.name].concat(c.an));
      add(capKeys, [c.cap].concat(c.ac));
    });
    hist.forEach((h) => add(nameKeys, [h.name].concat(h.alt)));
    return { nameKeys: nameKeys, capKeys: capKeys };
  }

  /* Renvoie "ok" (exact), "typo" (correct à une faute près) ou "ko". */
  function judge(input, q, idx) {
    const uv = variants(input);
    if (!uv.length) return "ko";
    const ev = new Set();
    [q.answer].concat(q.alts || []).forEach((x) => variants(x).forEach((k) => ev.add(k)));
    if (uv.some((u) => ev.has(u))) return "ok";

    const keys = q.kind === "cap" ? idx.capKeys : idx.nameKeys;
    for (const u of uv) {
      if (keys.has(u)) continue; // c'est une autre vraie réponse : donc une erreur
      for (const e of ev) {
        if (e.length < 5) continue; // mots courts : orthographe exacte
        const tol = e.length >= 10 ? 2 : 1;
        if (Math.abs(u.length - e.length) <= tol && lev(u, e) <= tol) return "typo";
      }
    }
    return "ko";
  }

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  /* Évite deux questions d'affilée sur le même pays. */
  function spread(a) {
    const r = a.slice();
    for (let i = 1; i < r.length; i++) {
      if (r[i].base === r[i - 1].base) {
        let j = i + 1;
        while (j < r.length && r[j].base === r[i - 1].base) j++;
        if (j < r.length) { const t = r[i]; r[i] = r[j]; r[j] = t; }
      }
    }
    return r;
  }

  const Logic = { norm: norm, variants: variants, lev: lev, buildIndex: buildIndex, judge: judge, shuffle: shuffle, spread: spread };
  if (typeof module !== "undefined" && module.exports) module.exports = Logic;
  else root.Logic = Logic;
})(typeof window !== "undefined" ? window : globalThis);
