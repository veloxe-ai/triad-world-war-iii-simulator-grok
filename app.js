(function () {
  const STORE_KEY = "ww3-three-powers-v1";
  const PALETTE = ["#8fb8c9", "#e07a5f", "#e3b23c"];
  const IDS = ["atlantic", "heartland", "meridian"];

  const DOCTRINES = {
    expeditionary: {
      label: "Expeditionary",
      blurb: "Hard first month. Weaker once the yards take over.",
      opening: 1.16, sea: 1.12, air: 1.1, land: 0.9, late: 0.9, strategic: 0.94, cyber: 1.08,
    },
    fortress: {
      label: "Fortress",
      blurb: "Gives ground slowly. The arsenal is a veto, not a trumpet.",
      opening: 0.9, sea: 0.86, air: 0.95, land: 1.16, late: 1.06, strategic: 1.22, cyber: 0.9,
    },
    swarm: {
      label: "Industrial swarm",
      blurb: "Missiles, yards, and manpower. Heavier every month.",
      opening: 0.94, sea: 1.05, air: 1.03, land: 1.07, late: 1.2, strategic: 0.98, cyber: 1.05,
    },
    hybrid: {
      label: "Hybrid",
      blurb: "A modest edge in every file, and master of none.",
      opening: 1.05, sea: 1.05, air: 1.05, land: 1.05, late: 1.05, strategic: 1.05, cyber: 1.05,
    },
  };

  const FIELDS = [
    ["population", "Population (M)", 1, 2000, 1],
    ["gdp", "GDP ($T)", 0, 80, 0.1],
    ["industry", "Industry (0–100)", 0, 100, 1],
    ["energy", "Energy security", 0, 100, 1],
    ["morale", "Morale", 0, 100, 1],
    ["troops", "Active troops (M)", 0, 12, 0.01],
    ["tanks", "Tanks & AFVs", 0, 80000, 1],
    ["aircraft", "Combat aircraft", 0, 30000, 1],
    ["ships", "Principal ships", 0, 2000, 1],
    ["subs", "Submarines", 0, 300, 1],
    ["nukes", "Nuclear warheads", 0, 20000, 1],
    ["cyber", "Cyber & EW", 0, 100, 1],
    ["missiles", "Missile forces", 0, 100, 1],
  ];

  const PHASES = [
    { id: "shadow", title: "Shadow war", short: "the shadow war", when: "Days 1–14", weights: [["cyber", 0.7], ["opening", 0.3]] },
    { id: "salvo", title: "First salvo", short: "the first salvo", when: "Days 15–40", weights: [["air", 0.58], ["opening", 0.42]] },
    { id: "sea", title: "Sea lanes", short: "the sea lanes", when: "Months 2–7", weights: [["sea", 0.86], ["cyber", 0.14]] },
    { id: "land", title: "Land war", short: "the land war", when: "Months 3–16", weights: [["land", 0.86], ["late", 0.14]] },
    { id: "yards", title: "War of yards", short: "the war of yards", when: "Months 6–24", weights: [["late", 0.8], ["land", 0.1], ["sea", 0.1]] },
    { id: "brink", title: "The brink", short: "the brink", when: "When the sums are in", weights: [["strategic", 1]] },
  ];

  const KIND_LABEL = {
    "armed-peace": "Armed peace",
    decisive: "Decisive advantage",
    costly: "Costly advantage",
    stalemate: "Deadlock",
    exchange: "Limited exchange",
  };

  const KIND_COLOR = {
    "armed-peace": "#c6a15b",
    decisive: "#ebe4d4",
    costly: "#e07a5f",
    stalemate: "#8fb8c9",
    exchange: "#c4492c",
  };

  const EDGE_KEYS = {
    shadow: [["cyber", "cyber index"]],
    salvo: [["aircraft", "combat aircraft"], ["missiles", "missile index"]],
    sea: [["ships", "principal ships"], ["subs", "submarines"]],
    land: [["tanks", "tanks and AFVs"], ["troops", "million active troops"], ["morale", "morale"]],
    yards: [["industry", "industry index"], ["gdp", "trillion GDP"], ["energy", "energy security"]],
    brink: [["nukes", "warheads"]],
  };

  const SAMPLE = {
    meta: { title: "The Three-Winter War", year: 2028, tone: "operatic" },
    countries: [
      {
        id: "atlantic",
        name: "Atlantic Commonwealth",
        leader: "President Hale Voss",
        doctrine: "expeditionary",
        population: 348,
        gdp: 27.4,
        industry: 76,
        energy: 68,
        morale: 64,
        troops: 1.32,
        tanks: 5400,
        aircraft: 3480,
        ships: 296,
        subs: 64,
        nukes: 3650,
        cyber: 91,
        missiles: 72,
        note: "Keep the coalition together. Do not trade cities for coastline.",
      },
      {
        id: "heartland",
        name: "Heartland Compact",
        leader: "Marshal Ilya Ren",
        doctrine: "fortress",
        population: 152,
        gdp: 2.4,
        industry: 58,
        energy: 93,
        morale: 78,
        troops: 1.18,
        tanks: 12800,
        aircraft: 1320,
        ships: 118,
        subs: 54,
        nukes: 5800,
        cyber: 57,
        missiles: 84,
        note: "Trade space. Never trade the arsenal. Winter is a branch of the army.",
      },
      {
        id: "meridian",
        name: "Meridian Combine",
        leader: "Director Shen Qiao",
        doctrine: "swarm",
        population: 1390,
        gdp: 19.6,
        industry: 97,
        energy: 61,
        morale: 73,
        troops: 2.05,
        tanks: 8600,
        aircraft: 2740,
        ships: 410,
        subs: 70,
        nukes: 620,
        cyber: 83,
        missiles: 94,
        note: "Outlast them. Every month the yards launch more hulls than they can sink.",
      },
    ],
  };

  let state = clone(SAMPLE);
  let sim = null;
  let pack = null;
  let viewPhase = 0;
  let userPickedPhase = false;
  let warTimer = 0;
  let resetArm = 0;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function num(v) {
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, num(v))); }

  function decimalsOf(step) {
    return (String(step).split(".")[1] || "").length;
  }

  function clampField(key, value) {
    const spec = FIELDS.find((f) => f[0] === key);
    if (!spec) return value;
    return Number(clamp(value, spec[2], spec[3]).toFixed(decimalsOf(spec[4])));
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function comma(v) {
    return Math.round(num(v)).toLocaleString("en-US");
  }

  function fixed(v, d) {
    return num(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtStat(key, v) {
    if (key === "gdp") return fixed(v, 1);
    if (key === "troops") return fixed(v, 2);
    return comma(v);
  }

  function nm(c) {
    return (c.name || "").trim() || "Unnamed power";
  }

  function codeOf(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0] === "Unnamed") return "—";
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.map((p) => p[0]).join("").slice(0, 3).toUpperCase();
  }

  function humanJoin(arr) {
    const a = arr.filter(Boolean);
    if (a.length <= 1) return a[0] || "";
    if (a.length === 2) return a[0] + " and " + a[1];
    return a.slice(0, -1).join(", ") + ", and " + a[a.length - 1];
  }

  function art(phrase) {
    const w = String(phrase || "").trim();
    return (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
  }

  function pct(x) {
    const n = num(x) * 100;
    if (n >= 10) return String(Math.round(n));
    const d = Math.round(n * 10) / 10;
    return Number.isInteger(d) ? String(d) : d.toFixed(1);
  }

  function byId(countries, id) {
    return countries.find((c) => c.id === id);
  }

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function unitRand(seed) {
    let a = seed >>> 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function powerOf(c) {
    const d = DOCTRINES[c.doctrine] || DOCTRINES.hybrid;
    const pop = Math.max(0, num(c.population));
    const gdp = Math.max(0, num(c.gdp));
    const industry = Math.max(0, num(c.industry));
    const energy = Math.max(0, num(c.energy));
    const morale = Math.max(0, num(c.morale));
    const troops = Math.max(0, num(c.troops));
    const tanks = Math.max(0, num(c.tanks));
    const aircraft = Math.max(0, num(c.aircraft));
    const ships = Math.max(0, num(c.ships));
    const subs = Math.max(0, num(c.subs));
    const nukes = Math.max(0, num(c.nukes));
    const cyber = Math.max(0, num(c.cyber));
    const missiles = Math.max(0, num(c.missiles));
    const cyberS = cyber * 0.82 + gdp * 0.55 + aircraft * 0.004;
    const air = aircraft * 0.04 + missiles * 0.3 + cyber * 0.18;
    const sea = ships * 0.16 + subs * 1.05 + gdp * 1.05 + cyber * 0.22;
    const land = troops * 22 + tanks * 0.0092 + morale * 0.42 + Math.sqrt(pop) * 1.15;
    const late = gdp * 1.55 + industry * 0.5 + energy * 0.36 + Math.log10(pop + 10) * 8 + troops * 3.2;
    const strategic = Math.sqrt(nukes) * 1.55 + missiles * 0.34 + morale * 0.12;
    const opening = air * 0.42 + cyberS * 0.85 + missiles * 0.55 + sea * 0.08;
    return {
      cyber: cyberS * d.cyber,
      air: air * d.air,
      sea: sea * d.sea * (0.86 + morale / 450),
      land: land * d.land * (0.84 + morale / 320),
      late: late * d.late,
      strategic: strategic * d.strategic,
      opening: opening * d.opening,
    };
  }

  function specKey(countries) {
    return countries.map((c) => [
      c.id, c.doctrine,
      c.population, c.gdp, c.industry, c.energy, c.morale,
      c.troops, c.tanks, c.aircraft, c.ships, c.subs,
      c.nukes, c.cyber, c.missiles,
    ].join(",")).join(";");
  }

  function nuclearPosture(c, gap, rank) {
    const nukes = num(c.nukes);
    const morale = num(c.morale);
    const losing = rank > 0 && gap >= 0.1;
    const doomed = rank === 2 && gap >= 0.18;
    if (nukes < 80) return "none";
    if (c.doctrine === "fortress" && nukes >= 1000 && morale >= 55 && losing) return "coerce";
    if (doomed && c.doctrine !== "expeditionary" && nukes >= 400 && morale >= 74) return "limited";
    if (doomed && nukes >= 2500 && morale >= 68) return "limited";
    if (losing && nukes >= 700 && morale >= 50) return "alert";
    return "none";
  }

  function simulate(countries, salt) {
    const key = specKey(countries);
    const powers = countries.map((c) => ({ id: c.id, axes: powerOf(c) }));
    const phases = PHASES.map((def) => {
      const raw = powers.map((p) => {
        let v = 0;
        def.weights.forEach(([k, w]) => { v += p.axes[k] * w; });
        const j = unitRand(hashSeed(key + "|" + salt + "|" + def.id + "|" + p.id));
        return { id: p.id, value: Math.max(1e-6, v * (0.97 + j * 0.06)) };
      });
      raw.sort((a, b) => b.value - a.value);
      const sum = raw.reduce((s, r) => s + r.value, 0) || 1;
      const margin = (raw[0].value - raw[1].value) / raw[0].value;
      return {
        id: def.id,
        title: def.title,
        short: def.short,
        when: def.when,
        winnerId: raw[0].id,
        margin,
        contested: def.id !== "brink" && margin < 0.06,
        rankedIds: raw.map((r) => r.id),
        shares: Object.fromEntries(raw.map((r) => [r.id, r.value / sum])),
      };
    });

    const conv = phases.filter((p) => p.id !== "brink");
    const totals = countries.map((c) => ({
      id: c.id,
      total: conv.reduce((s, p) => s + (p.shares[c.id] || 0), 0),
    })).sort((a, b) => b.total - a.total);
    const gap = (totals[0].total - totals[1].total) / (totals[0].total || 1);

    const postures = countries.map((c) => {
      const rank = totals.findIndex((t) => t.id === c.id);
      const mine = totals.find((t) => t.id === c.id).total;
      const g = (totals[0].total - mine) / (totals[0].total || 1);
      return { id: c.id, posture: nuclearPosture(c, g, rank), gap: g, rank };
    });

    const launchers = postures.filter((p) => p.posture === "limited").map((p) => p.id);
    const retaliators = launchers.length
      ? countries.filter((c) => launchers.indexOf(c.id) === -1 && num(c.nukes) >= 200).map((c) => c.id)
      : [];
    const coercers = postures.filter((p) => p.posture === "coerce").map((p) => p.id);
    const alertIds = postures.filter((p) => p.posture === "alert").map((p) => p.id);

    let kind = gap < 0.055 ? "stalemate" : gap < 0.14 ? "costly" : "decisive";
    if (coercers.length && !launchers.length) kind = "armed-peace";
    if (launchers.length) kind = "exchange";

    const strength = Object.fromEntries(countries.map((c) => [c.id, 100]));
    conv.forEach((p) => {
      if (p.contested) countries.forEach((c) => { strength[c.id] -= 6; });
      else p.rankedIds.forEach((id, i) => { strength[id] -= [4, 8, 12][i] || 10; });
    });
    if (kind === "exchange") {
      launchers.concat(retaliators).forEach((id) => { strength[id] -= 28; });
    }
    countries.forEach((c) => { strength[c.id] = Math.max(6, Math.round(strength[c.id])); });

    return {
      salt, phases, totals, gap, kind,
      leaderId: totals[0].id,
      secondId: totals[1].id,
      thirdId: totals[2].id,
      postures, launchers, retaliators, coercers, alertIds, strength,
      flipped: false,
    };
  }

  function drama(simResult) {
    const voices = new Set(simResult.phases.filter((p) => !p.contested).map((p) => p.winnerId));
    const battle = new Set(simResult.phases.filter((p) => p.id !== "brink" && !p.contested).map((p) => p.winnerId));
    let s = voices.size * 3 + battle.size;
    s += simResult.phases.filter((p) => p.contested).length * 1.4;
    const yards = simResult.phases.find((p) => p.id === "yards");
    if (yards && simResult.phases[0].winnerId !== yards.winnerId) s += 4;
    if (simResult.kind === "armed-peace") s += 6;
    else if (simResult.kind === "stalemate") s += 3;
    else if (simResult.kind === "costly") s += 2;
    else if (simResult.kind === "exchange") s += 1.5;
    if (simResult.gap < 0.09) s += 1.5;
    if (simResult.gap > 0.25 && simResult.kind === "decisive") s -= 2;
    return s;
  }

  function differs(a, b) {
    return a.phases.some((p, i) => p.winnerId !== b.phases[i].winnerId || p.contested !== b.phases[i].contested || a.kind !== b.kind);
  }

  function bestSimulation(countries) {
    const base = simulate(countries, 0);
    let best = base;
    let bestScore = drama(base);
    for (let salt = 1; salt < 24; salt++) {
      const result = simulate(countries, salt);
      const score = drama(result);
      if (score > bestScore + 0.3) {
        best = result;
        bestScore = score;
      }
    }
    best.flipped = best.salt !== 0 && differs(base, best);
    return best;
  }

  function displayYear(meta) {
    const y = Math.round(num(meta.year));
    if (y < 1939 || y > 2200) return 2028;
    return y;
  }

  function noteQuote(c) {
    const n = (c.note || "").trim();
    if (!n) return "";
    return " Note on file from " + nm(c) + ": “" + n + "”";
  }

  function doctrineLine(c, contested) {
    if (contested) return " Neither doctrine gets to cash its theory in this file.";
    if (c.doctrine === "fortress") return " A fortress doctrine will give ground and charge for every kilometer.";
    if (c.doctrine === "swarm") return " A swarm doctrine accepts a messy map if the manpower keeps arriving.";
    if (c.doctrine === "expeditionary") return " An expeditionary doctrine wants the file over before the supply line gets philosophical.";
    return " A hybrid doctrine has no poem for the file. It has a slightly better sum.";
  }

  function hullNote(p, countries) {
    if (p.id !== "sea") return "";
    const winner = byId(countries, p.winnerId);
    const hull = countries.slice().sort((a, b) => num(b.ships) - num(a.ships))[0];
    if (!hull || hull.id === winner.id) return "";
    let line = " " + nm(hull) + " actually has the larger fleet (" + comma(hull.ships) + " principal ships to " + comma(winner.ships) + ").";
    if (num(winner.subs) > num(hull.subs) * 1.05) {
      line += " " + nm(winner) + " answers with the quieter fleet: " + comma(winner.subs) + " submarines to " + comma(hull.subs) + ".";
    } else {
      line += " Hull count is not the file. Magazines, money, and the electronic fight are in the same sum.";
    }
    return line;
  }

  function hotPhase(p, countries) {
    const ranked = p.rankedIds.map((id) => byId(countries, id));
    const a = ranked[0];
    const b = ranked[1];
    const c = ranked[2];
    if (p.id === "shadow") {
      const lead = p.contested
        ? "No service owns the shadow war. " + nm(a) + " and " + nm(b) + " finish inside the noise — cyber " + comma(a.cyber) + " against " + comma(b.cyber) + ", with " + nm(c) + " at " + comma(c.cyber) + "."
        : nm(a) + " takes the shadow war. Cyber and electronic warfare sit at " + comma(a.cyber) + ", against " + comma(b.cyber) + " for " + nm(b) + " and " + comma(c.cyber) + " for " + nm(c) + ".";
      return [lead, "The reading: timetables slip on the weaker nets while every capital still calls it an incident."];
    }
    if (p.id === "salvo") {
      const lead = p.contested
        ? "The first salvo is a mess rather than a verdict. " + nm(a) + " fields " + comma(a.aircraft) + " combat aircraft and a missile index of " + comma(a.missiles) + "; " + nm(b) + " answers with " + comma(b.aircraft) + " and " + comma(b.missiles) + "."
        : nm(a) + " wins the opening sky with " + comma(a.aircraft) + " combat aircraft and missile index " + comma(a.missiles) + ". " + nm(b) + " brings " + comma(b.aircraft) + " aircraft and missiles at " + comma(b.missiles) + "; " + nm(c) + " fields " + comma(c.aircraft) + " and " + comma(c.missiles) + ".";
      return [lead, "The reading: the first month belongs to sorties and magazines. A long-war doctrine has not yet had time to matter." + doctrineLine(a, p.contested)];
    }
    if (p.id === "sea") {
      const open = p.contested
        ? "Nobody owns the sea lanes. " + nm(a) + " finishes a hair ahead of " + nm(b) + " and cannot call it control. "
        : nm(a) + " takes the sea lanes on the mix, not on a slogan. ";
      const lead = open + "Hulls and boats — " + nm(a) + " " + comma(a.ships) + " principal ships and " + comma(a.subs) + " submarines; " + nm(b) + " " + comma(b.ships) + " and " + comma(b.subs) + "; " + nm(c) + " " + comma(c.ships) + " and " + comma(c.subs) + "." + hullNote(p, countries);
      const impl = p.contested
        ? "The reading: convoys continue, insurance does not, and neither admiralty gets the clean map it printed."
        : "The reading: escorts thin out on the losing side, and the map of the sea stops being a negotiation.";
      return [lead, impl];
    }
    if (p.id === "land") {
      const open = p.contested
        ? nm(a) + " is a fraction ahead on the ground, which is not the same as breaking it. "
        : nm(a) + " takes the ground. ";
      const lead = open + "Tanks and AFVs: " + nm(a) + " " + comma(a.tanks) + ", " + nm(b) + " " + comma(b.tanks) + ", " + nm(c) + " " + comma(c.tanks) + ". Active troops, in millions: " + fixed(a.troops, 2) + ", " + fixed(b.troops, 2) + ", " + fixed(c.troops, 2) + ". Morale " + comma(a.morale) + " / " + comma(b.morale) + " / " + comma(c.morale) + ".";
      return [lead, "The reading: borders move less than the briefings promised wherever the armor gap is narrow, and more wherever it is not." + doctrineLine(a, p.contested)];
    }
    if (p.id === "yards") {
      const verb = p.contested ? "is narrowly ahead in" : "takes";
      const lead = nm(a) + " " + verb + " the replacement race. Industry " + comma(a.industry) + " and GDP " + fixed(a.gdp, 1) + " trillion, against " + nm(b) + " at " + comma(b.industry) + " and " + fixed(b.gdp, 1) + ", and " + nm(c) + " at " + comma(c.industry) + " and " + fixed(c.gdp, 1) + ". Energy security — " + nm(a) + " " + comma(a.energy) + ", " + nm(b) + " " + comma(b.energy) + ", " + nm(c) + " " + comma(c.energy) + ". Fuel counts, and it is not the whole file.";
      return [lead, "The reading: losses stop being a shock and become a production schedule. Whoever replaces hulls, airframes, and brigades writes the later months." + noteQuote(a)];
    }
    return ["The file is empty.", ""];
  }

  function coldPhase(p, simResult, countries) {
    const names = p.rankedIds.map((id) => nm(byId(countries, id)));
    const shares = p.rankedIds.map((id) => Math.round((p.shares[id] || 0) * 100) + "%");
    const owner = p.contested ? "CONTESTED" : names[0];
    if (p.id === "brink") return coldBrink(simResult, countries);
    return p.title.toUpperCase() + ": " + owner + ". Weight " + names.map((n, i) => n + " " + shares[i]).join(", ") + ". " + edgeLine(p, countries);
  }

  function coldBrink(simResult, countries) {
    const books = countries.map((c) => nm(c) + " " + comma(c.nukes)).join("; ");
    return "BRINK. WARHEADS " + books + ". " + nuclearCold(simResult, countries) + " JUDGMENT: " + KIND_LABEL[simResult.kind] + ".";
  }

  function nuclearCold(simResult, countries) {
    const nameOf = (id) => nm(byId(countries, id));
    if (simResult.kind === "exchange") {
      return "RELEASE " + simResult.launchers.map(nameOf).join(", ") + ". ANSWER " + (simResult.retaliators.map(nameOf).join(", ") || "NONE") + ".";
    }
    if (simResult.kind === "armed-peace") return "VETO " + simResult.coercers.map(nameOf).join(", ") + ". NO RELEASE.";
    if (simResult.alertIds.length) return "ALERT " + simResult.alertIds.map(nameOf).join(", ") + ". NO RELEASE.";
    return "ARSENALS HELD. NO RELEASE.";
  }

  function brinkHot(simResult, countries) {
    const books = "Warheads on the books — " + countries.map((c) => nm(c) + " " + comma(c.nukes)).join("; ") + ".";
    if (simResult.kind === "exchange") {
      const launcher = byId(countries, simResult.launchers[0]);
      const rets = humanJoin(simResult.retaliators.map((id) => nm(byId(countries, id))));
      const answer = !rets
        ? "No other arsenal is large enough to answer, and the map is still broken."
        : rets + (simResult.retaliators.length > 1 ? " answer in kind." : " answers in kind.");
      return [books, nm(launcher) + " (" + DOCTRINES[launcher.doctrine].label.toLowerCase() + ", morale " + comma(launcher.morale) + ") treats a limited release as a message rather than accept the conventional sum. " + answer + " The exercise stops. There is no victor to sign anything."];
    }
    if (simResult.kind === "armed-peace") {
      const coercer = byId(countries, simResult.coercers[0]);
      let line = nm(coercer) + " is behind the fighting sum and in front of the arsenal. " + (coercer.leader || "Command") + " does what " + art(DOCTRINES[coercer.doctrine].label.toLowerCase() + " doctrine") + " with " + comma(coercer.nukes) + " warheads and morale " + comma(coercer.morale) + " was written to do: stop the war without winning it. No launch. No parade.";
      line += noteQuote(coercer);
      if (simResult.coercers.length > 1) {
        line += " " + nm(byId(countries, simResult.coercers[1])) + " holds a second veto of the same kind.";
      }
      return [books, line];
    }
    if (simResult.alertIds.length) {
      const names = humanJoin(simResult.alertIds.map((id) => nm(byId(countries, id))));
      return [books, "Forces under " + names + " go to full alert. They do not go further. The taboo holds, and the conventional result is allowed to stand."];
    }
    return [books, "Every arsenal stays at its peacetime count. Nobody is both losing badly enough and armed heavily enough to buy a veto. The brink is a file with no fire."];
  }

  function edgeLine(p, countries) {
    const keys = EDGE_KEYS[p.id] || [];
    const winner = byId(countries, p.winnerId);
    const second = byId(countries, p.rankedIds[1]);
    let best = null;
    keys.forEach(([key, label]) => {
      const a = num(winner[key]);
      const b = num(second[key]);
      if (a <= 0) return;
      const ratio = b <= 0 ? 99 : a / b;
      if (ratio > 1 && (!best || ratio > best.ratio)) best = { key, label, a, b, ratio };
    });
    if (!best || best.ratio < 1.04) return "No single column separates them. The file is the mix.";
    const leadIn = p.contested
      ? "Largest column in a file that still will not break: "
      : "Sharpest column against the runner-up: ";
    return leadIn + fmtStat(best.key, best.a) + " " + best.label + " versus " + fmtStat(best.key, best.b) + ".";
  }

  function phaseHeadline(p, simResult, countries) {
    const winner = nm(byId(countries, p.winnerId));
    if (p.id === "brink") {
      if (simResult.kind === "exchange") return "A limited release. Then the answer.";
      if (simResult.kind === "armed-peace") return nm(byId(countries, simResult.coercers[0])) + " spends the arsenal as a veto.";
      if (simResult.alertIds.length) return "Full alert. No release.";
      return "The warheads stay in the silos.";
    }
    if (p.contested) {
      return {
        shadow: "The dark is crowded.",
        salvo: "The first days answer nobody.",
        sea: "The sea is rented, not owned.",
        land: "The front thickens and does not break.",
        yards: "The factories trade blows.",
      }[p.id];
    }
    return {
      shadow: winner + " is in the net before the war is declared.",
      salvo: winner + " wins the opening sky.",
      sea: winner + " takes the convoys.",
      land: winner + " decides the ground.",
      yards: winner + " outbuilds the other two.",
    }[p.id];
  }

  function durationLabel(simResult) {
    if (simResult.kind === "exchange") return "Ends at first release";
    if (simResult.kind === "armed-peace") return "Frozen short of a finish";
    if (simResult.kind === "stalemate") return "No clean end on the clock";
    if (simResult.kind === "decisive") return "A short, brutal campaign";
    return "A long campaign";
  }

  function verdictHeadline(simResult, countries) {
    const leader = nm(byId(countries, simResult.leaderId));
    if (simResult.kind === "armed-peace") {
      return leader + " is ahead. " + nm(byId(countries, simResult.coercers[0])) + " will not let it count.";
    }
    if (simResult.kind === "exchange") return "The arsenal is used. The model stops.";
    if (simResult.kind === "stalemate") return "Three wars. None of them finished.";
    if (simResult.kind === "decisive") return leader + " breaks the war open.";
    return leader + " leads, and cannot relax.";
  }

  function verdictDek(simResult, countries) {
    const leader = byId(countries, simResult.leaderId);
    const second = byId(countries, simResult.secondId);
    if (simResult.kind === "armed-peace") {
      const coercer = byId(countries, simResult.coercers[0]);
      return (coercer.leader || nm(coercer)) + " does not dispute the conventional arithmetic. " + comma(coercer.nukes) + " warheads are a veto, and the veto is used without a launch.";
    }
    if (simResult.kind === "exchange") {
      return nm(byId(countries, simResult.launchers[0])) + " spends a limited strike to change a losing sum. The exercise has no honest winner after that.";
    }
    if (simResult.kind === "stalemate") {
      return "Separate the files and they cancel. Each power holds the kind of war it built, and none of them holds the other two.";
    }
    const pct = Math.round(simResult.gap * 100);
    if (simResult.kind === "decisive") {
      return nm(leader) + " finishes " + pct + " percent clear of " + nm(second) + ". Another season does not repair that.";
    }
    return nm(leader) + " finishes " + pct + " percent ahead of " + nm(second) + " — a lead with splinters still in it.";
  }

  function verdictParas(simResult, countries, tone) {
    if (tone === "cold") {
      const leader = nm(byId(countries, simResult.leaderId));
      const second = nm(byId(countries, simResult.secondId));
      const third = nm(byId(countries, simResult.thirdId));
      const pct = Math.round(simResult.gap * 100);
      const line1 = simResult.kind === "stalemate"
        ? "NO LEAD OUTSIDE THE NOISE. NUMERIC TOP " + leader + " BY " + pct + "% OVER " + second + ". THIRD " + third + "."
        : "CONVENTIONAL LEAD " + leader + " BY " + pct + "% OVER " + second + ". THIRD " + third + ".";
      const files = simResult.phases.map((p) => p.title.toUpperCase() + " " + (p.contested ? "CONTESTED" : nm(byId(countries, p.winnerId)).toUpperCase())).join(" · ");
      return [line1, files, nuclearCold(simResult, countries) + " JUDGMENT: " + KIND_LABEL[simResult.kind] + "."];
    }
    const taken = [];
    countries.forEach((c) => {
      const files = simResult.phases.filter((p) => p.id !== "brink" && !p.contested && p.winnerId === c.id).map((p) => p.short);
      if (files.length) taken.push(nm(c) + " takes " + humanJoin(files));
    });
    simResult.phases.filter((p) => p.contested && p.id !== "brink").forEach((p) => {
      taken.push(nm(byId(countries, p.winnerId)) + " merely edges " + p.short);
    });
    const p1 = (taken.join(". ") || "No file produces a clean owner") + ".";

    const shadowW = byId(countries, simResult.phases[0].winnerId);
    const yardsW = byId(countries, simResult.phases.find((p) => p.id === "yards").winnerId);
    let p2;
    if (shadowW.id !== yardsW.id) {
      p2 = "The opening favors " + nm(shadowW) + ": cyber " + comma(shadowW.cyber) + ", " + comma(shadowW.aircraft) + " combat aircraft, " + art(DOCTRINES[shadowW.doctrine].label.toLowerCase() + " doctrine") + ". The long file favors " + nm(yardsW) + " — industry " + comma(yardsW.industry) + ", GDP " + fixed(yardsW.gdp, 1) + " trillion, energy security " + comma(yardsW.energy) + ".";
    } else {
      p2 = nm(shadowW) + " leads the shadow war and still leads when the yards are counted — industry " + comma(shadowW.industry) + ", GDP " + fixed(shadowW.gdp, 1) + " trillion, cyber " + comma(shadowW.cyber) + ". The advantage survives a longer calendar.";
    }
    p2 += noteQuote(yardsW);

    const leader = byId(countries, simResult.leaderId);
    const second = byId(countries, simResult.secondId);
    let p3;
    if (simResult.kind === "armed-peace") {
      const coercer = byId(countries, simResult.coercers[0]);
      const behind = Math.round(simResult.postures.find((p) => p.id === coercer.id).gap * 100);
      p3 = nm(leader) + " leads the conventional sum by " + pct(simResult.gap) + " percent over " + nm(second) + " — close enough to argue across a table. " + nm(coercer) + " trails that sum by " + behind + " percent and answers with the arsenal, not with another offensive. Nothing is launched. The advance stops with the lights still on.";
    } else if (simResult.kind === "exchange") {
      p3 = "Once a warhead is used as a sentence, this model stops pretending to be a campaign. Combat-power indexes after that are ruins, not scores.";
    } else if (simResult.kind === "stalemate") {
      const shares = simResult.totals.map((t) => nm(byId(countries, t.id)) + " " + Math.round(t.total / 5 * 100) + "%");
      p3 = "Conventional weight sits at " + humanJoin(shares) + ". The war can continue. It cannot conclude.";
    } else {
      const ahead = pct(simResult.gap);
      const alerts = simResult.alertIds.filter((id) => id !== leader.id).map((id) => byId(countries, id));
      p3 = nm(leader) + (simResult.kind === "decisive"
        ? " is " + ahead + " percent clear of " + nm(second) + " on the conventional sum, wide enough that another season does not flip the peace. "
        : " is " + ahead + " percent ahead of " + nm(second) + ". That is a lead, not a rout. ");
      if (alerts.length) {
        p3 += humanJoin(alerts.map(nm)) + " keeps the arsenal on alert and does not release it. ";
      }
      p3 += simResult.kind === "decisive"
        ? "The campaign is short enough to brief and hard enough to mean it."
        : "Any peace will look like exhaustion with a winner's stamp.";
      p3 += noteQuote(leader);
    }
    return [p1, p2, p3];
  }

  function signatureItems(simResult, countries) {
    return countries.map((c) => {
      const files = simResult.phases.filter((p) => p.id !== "brink" && !p.contested && p.winnerId === c.id).map((p) => p.title);
      const edged = simResult.phases.filter((p) => p.contested && p.winnerId === c.id).map((p) => "edged " + p.short);
      const extra = [];
      if (simResult.coercers.indexOf(c.id) !== -1) extra.push("nuclear veto");
      if (simResult.launchers.indexOf(c.id) !== -1) extra.push("limited release");
      if (simResult.retaliators.indexOf(c.id) !== -1) extra.push("retaliates");
      if (simResult.alertIds.indexOf(c.id) !== -1) extra.push("arsenal on alert");
      const parts = [];
      if (files.length) parts.push(humanJoin(files));
      if (edged.length) parts.push(humanJoin(edged));
      if (extra.length) parts.push(humanJoin(extra));
      return { id: c.id, name: nm(c), text: parts.length ? parts.join("; ") : "No clean fighting file" };
    });
  }

  function plateWho(p, simResult, countries) {
    if (p.id === "brink") {
      if (simResult.kind === "exchange") return "Release";
      if (simResult.kind === "armed-peace") return "Veto";
      if (simResult.alertIds.length) return "Alert";
      return "Held";
    }
    if (p.contested) return "Split";
    return codeOf(nm(byId(countries, p.winnerId)));
  }

  function plateColor(p, simResult, countries) {
    if (p.id === "brink") return KIND_COLOR[simResult.kind];
    if (p.contested) return "#c6a15b";
    const i = countries.findIndex((c) => c.id === p.winnerId);
    return PALETTE[i] || PALETTE[0];
  }

  function narrate(simResult, current) {
    const countries = current.countries;
    const tone = current.meta.tone === "cold" ? "cold" : "operatic";
    const year = displayYear(current.meta);
    const title = (current.meta.title || "").trim() || "Untitled exercise";
    return {
      kicker: year + " · " + title + " · " + durationLabel(simResult),
      kind: simResult.kind,
      kindLabel: KIND_LABEL[simResult.kind],
      kindColor: KIND_COLOR[simResult.kind],
      headline: verdictHeadline(simResult, countries),
      dek: verdictDek(simResult, countries),
      paragraphs: verdictParas(simResult, countries, tone),
      items: signatureItems(simResult, countries),
      reading: simResult.flipped
        ? "A close file could be read more than one honest way. This is the sharper reading."
        : "No close file needed a second reading. The figures carry the war.",
      strengths: countries.map((c, i) => ({
        name: nm(c),
        value: simResult.strength[c.id],
        color: PALETTE[i],
      })),
      phases: simResult.phases.map((p) => ({
        id: p.id,
        title: p.title,
        when: p.when,
        who: plateWho(p, simResult, countries),
        bar: plateColor(p, simResult, countries),
        headline: phaseHeadline(p, simResult, countries),
        paragraphs: p.id === "brink"
          ? (tone === "cold" ? [coldBrink(simResult, countries)] : brinkHot(simResult, countries))
          : (tone === "cold" ? [coldPhase(p, simResult, countries)] : hotPhase(p, countries)),
        edge: edgeLine(p, countries),
        contested: p.contested,
        marginLabel: p.id === "brink"
          ? "Weight of the arsenal"
          : (p.contested ? "Inside the noise" : "Separated by " + Math.round(p.margin * 100) + "%"),
        shares: countries.map((c, i) => ({
          name: nm(c),
          share: p.shares[c.id] || 0,
          color: PALETTE[i],
        })),
      })),
    };
  }

  function signatureIndex(simResult) {
    if (simResult.kind === "exchange" || simResult.kind === "armed-peace") {
      return simResult.phases.findIndex((p) => p.id === "brink");
    }
    const yards = simResult.phases.findIndex((p) => p.id === "yards");
    if (simResult.phases[0].winnerId !== simResult.phases[yards].winnerId && !simResult.phases[yards].contested) return yards;
    let best = 0;
    let m = -1;
    simResult.phases.forEach((p, i) => {
      if (p.id === "brink" || p.contested) return;
      if (p.margin > m) { m = p.margin; best = i; }
    });
    return best;
  }

  function countryKey(c) {
    return JSON.stringify([
      c.name, c.leader, c.note, c.doctrine,
    ].concat(FIELDS.map(([k]) => c[k])));
  }

  function ordersAreSample() {
    return state.countries.every((c, i) => countryKey(c) === countryKey(SAMPLE.countries[i]));
  }

  function sanitize(data) {
    const base = clone(SAMPLE);
    if (!data || typeof data !== "object") return base;
    if (data.meta && typeof data.meta === "object") {
      if (typeof data.meta.title === "string") base.meta.title = data.meta.title.slice(0, 64);
      const y = Math.round(num(data.meta.year));
      if (y >= 1939 && y <= 2200) base.meta.year = y;
      if (data.meta.tone === "cold" || data.meta.tone === "operatic") base.meta.tone = data.meta.tone;
    }
    if (!Array.isArray(data.countries) || data.countries.length !== 3) return base;
    base.countries = data.countries.map((raw, i) => {
      const c = clone(SAMPLE.countries[i]);
      c.id = IDS[i];
      if (!raw || typeof raw !== "object") return c;
      if (typeof raw.name === "string") c.name = raw.name.slice(0, 42);
      if (typeof raw.leader === "string") c.leader = raw.leader.slice(0, 48);
      if (typeof raw.note === "string") c.note = raw.note.slice(0, 180);
      if (DOCTRINES[raw.doctrine]) c.doctrine = raw.doctrine;
      FIELDS.forEach(([key]) => {
        if (raw[key] == null || raw[key] === "") return;
        c[key] = clampField(key, raw[key]);
      });
      return c;
    });
    return base;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(SAMPLE);
      return sanitize(JSON.parse(raw));
    } catch (err) {
      return clone(SAMPLE);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ meta: state.meta, countries: state.countries }));
      return true;
    } catch (err) {
      return false;
    }
  }

  function pHTML(paragraphs) {
    return paragraphs.filter((p) => p && String(p).trim()).map((p) => "<p>" + esc(p) + "</p>").join("");
  }

  function renderStamp(saved) {
    const sample = ordersAreSample();
    const stamp = document.getElementById("stamp");
    stamp.textContent = sample ? "Sample data" : "Local draft";
    stamp.classList.toggle("is-draft", !sample);
    document.getElementById("banner-dyn").textContent = sample
      ? "Sample order of battle is loaded — three invented powers, so the war is already underway."
      : "You replaced the sample order of battle. This browser is keeping your specs.";
    const label = document.getElementById("save-state");
    if (!saved) label.textContent = "This browser refused local save — the exercise still runs";
    else label.textContent = sample ? "Sample data kept on this device" : "Saved on this device";
  }

  function renderTone() {
    document.querySelectorAll("[data-tone]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.tone === state.meta.tone));
    });
  }

  function renderIdentity() {
    state.countries.forEach((c) => {
      const card = document.querySelector('.card[data-id="' + c.id + '"]');
      if (!card) return;
      card.querySelector(".code").textContent = codeOf(nm(c));
      card.querySelector(".blurb").textContent = (DOCTRINES[c.doctrine] || DOCTRINES.hybrid).blurb;
      card.querySelectorAll("[data-doctrine]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.doctrine === c.doctrine));
      });
    });
  }

  function leanWord(value, best) {
    const ratio = best > 0 ? value / best : 1;
    if (ratio >= 0.97) return "Leads";
    if (ratio >= 0.78) return "Contends";
    return "Trails";
  }

  function renderLeans() {
    const powers = state.countries.map(powerOf);
    const keys = ["opening", "land", "late", "strategic"];
    const labels = ["Shock", "Land", "Depth", "Arsenal"];
    const best = {};
    keys.forEach((k) => { best[k] = Math.max.apply(null, powers.map((p) => p[k])); });
    state.countries.forEach((c, i) => {
      const el = document.querySelector('.leans[data-id="' + c.id + '"]');
      if (!el) return;
      el.innerHTML = keys.map((k, ki) => {
        const word = leanWord(powers[i][k], best[k]);
        return '<span class="lean lean-' + word.toLowerCase() + '"><b>' + labels[ki] + "</b>" + word + "</span>";
      }).join("");
    });
  }

  function renderBalance() {
    const powers = state.countries.map(powerOf);
    const rows = [
      ["Opening shock", "opening"],
      ["Sea control", "sea"],
      ["Land power", "land"],
      ["Staying power", "late"],
      ["Arsenal", "strategic"],
    ];
    const legend = '<div class="legend">' + state.countries.map((c, i) =>
      '<span><i class="pip" style="background:' + PALETTE[i] + '"></i>' + esc(nm(c)) + "</span>"
    ).join("") + "</div>";
    const bars = rows.map(([label, key]) => {
      const vals = powers.map((p) => Math.max(0.0001, p[key]));
      const sum = vals.reduce((s, v) => s + v, 0);
      const segs = vals.map((v, i) => {
        const share = v / sum;
        const text = share >= 0.12 ? String(Math.round(share * 100)) : "";
        return '<span style="flex:' + share.toFixed(4) + " 1 0;background:" + PALETTE[i] + '">' + text + "</span>";
      }).join("");
      return '<div class="share"><div class="share-label">' + label + '</div><div class="share-track">' + segs + "</div></div>";
    }).join("");
    document.getElementById("balance").innerHTML = legend + bars;
  }

  function renderVerdict() {
    const el = document.getElementById("verdict");
    el.innerHTML =
      '<p class="kind" style="--kind:' + pack.kindColor + '">' + esc(pack.kindLabel) + "</p>" +
      "<h3>" + esc(pack.headline) + "</h3>" +
      '<p class="dek">' + esc(pack.dek) + "</p>" +
      '<p class="meta-line">' + esc(pack.kicker) + "</p>" +
      '<div class="end">' + pack.strengths.map((s) =>
        '<div class="end-row"><i class="pip" style="background:' + s.color + '"></i><span class="end-name">' + esc(s.name) + '</span><span class="end-track"><span style="width:' + s.value + "%;background:" + s.color + '"></span></span><span class="end-num">' + s.value + "</span></div>"
      ).join("") + "</div>" +
      '<p class="micro">Combat-power index after the conventional files — an exercise abstraction, not a casualty count. 100 is the force they started with.</p>' +
      '<ul class="sig">' + pack.items.map((item) => {
        const i = state.countries.findIndex((c) => c.id === item.id);
        return '<li><i class="pip" style="background:' + PALETTE[i] + '"></i><span><strong>' + esc(item.name) + "</strong> — " + esc(item.text) + "</span></li>";
      }).join("") + "</ul>" +
      '<div class="prose">' + pHTML(pack.paragraphs) + "</div>" +
      '<p class="reading">' + esc(pack.reading) + "</p>";
  }

  function renderPlates() {
    document.getElementById("plates").innerHTML = pack.phases.map((p, i) =>
      '<button type="button" class="plate' + (i === viewPhase ? " is-on" : "") + '" role="tab" aria-selected="' + (i === viewPhase) + '" data-i="' + i + '" title="' + esc(p.title) + '">' +
        '<span class="plate-kicker">0' + (i + 1) + " · " + esc(p.when) + "</span>" +
        '<span class="plate-title">' + esc(p.title) + "</span>" +
        '<span class="plate-who">' + esc(p.who) + "</span>" +
        '<span class="plate-bar" style="background:' + p.bar + '"></span>' +
      "</button>"
    ).join("");
  }

  function renderDossier() {
    const p = pack.phases[viewPhase];
    const el = document.getElementById("dossier");
    el.className = state.meta.tone === "cold" ? "dossier cold" : "dossier";
    const bars = '<div class="mini" aria-hidden="true">' + p.shares.map((s) =>
      '<div class="mini-row"><span>' + esc(s.name) + '</span><span class="mini-track"><span style="width:' + (s.share * 100).toFixed(1) + "%;background:" + s.color + '"></span></span><span class="mono">' + Math.round(s.share * 100) + "</span></div>"
    ).join("") + "</div>";
    el.innerHTML =
      '<p class="kicker">File 0' + (viewPhase + 1) + " · " + esc(p.when) + " · " + esc(p.marginLabel) + "</p>" +
      "<h3>" + esc(p.headline) + "</h3>" +
      '<p class="edge">' + esc(p.edge) + "</p>" +
      bars +
      '<div class="prose">' + pHTML(p.paragraphs) + "</div>";
  }

  function run() {
    sim = bestSimulation(state.countries);
    if (!userPickedPhase) viewPhase = signatureIndex(sim);
    if (viewPhase < 0 || viewPhase >= sim.phases.length) viewPhase = 0;
    pack = narrate(sim, state);
    renderVerdict();
    renderPlates();
    renderDossier();
  }

  function queueWar() {
    clearTimeout(warTimer);
    warTimer = setTimeout(run, 220);
  }

  function afterEdit(immediate) {
    const saved = save();
    renderIdentity();
    renderLeans();
    renderBalance();
    renderStamp(saved);
    renderTone();
    if (immediate) run();
    else queueWar();
  }

  function cardOf(node) {
    const card = node.closest(".card");
    if (!card) return null;
    return state.countries.find((c) => c.id === card.dataset.id) || null;
  }

  function onOrdersInput(e) {
    const t = e.target;
    const field = t.dataset.field;
    const c = cardOf(t);
    if (!c || !field) return;
    if (field === "name") c.name = t.value.slice(0, 42);
    else if (field === "leader") c.leader = t.value.slice(0, 48);
    else if (field === "note") c.note = t.value.slice(0, 180);
    else c[field] = t.value === "" ? 0 : clampField(field, t.value);
    afterEdit(false);
  }

  function onBlur(e) {
    const t = e.target;
    if (t.id === "year") {
      state.meta.year = displayYear({ year: t.value });
      t.value = state.meta.year;
      afterEdit(true);
      return;
    }
    const field = t.dataset.field;
    if (!field || !FIELDS.some((f) => f[0] === field)) return;
    const c = cardOf(t);
    if (!c) return;
    t.value = String(c[field]);
  }

  function onDoctrine(e) {
    const btn = e.target.closest("[data-doctrine]");
    if (!btn) return;
    const c = cardOf(btn);
    if (!c || !DOCTRINES[btn.dataset.doctrine]) return;
    c.doctrine = btn.dataset.doctrine;
    afterEdit(true);
  }

  function onMeta(e) {
    if (e.target.id === "title") state.meta.title = e.target.value.slice(0, 64);
    if (e.target.id === "year") state.meta.year = e.target.value;
    afterEdit(false);
  }

  function onTone(e) {
    const btn = e.target.closest("[data-tone]");
    if (!btn) return;
    state.meta.tone = btn.dataset.tone === "cold" ? "cold" : "operatic";
    afterEdit(true);
  }

  function onPlate(e) {
    const btn = e.target.closest("[data-i]");
    if (!btn) return;
    userPickedPhase = true;
    viewPhase = Number(btn.dataset.i) || 0;
    renderPlates();
    renderDossier();
  }

  function onKey(e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const el = document.activeElement;
    const tag = el && el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (tag === "BUTTON" && el.closest("#cards")) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (!sim) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    viewPhase = (viewPhase + dir + sim.phases.length) % sim.phases.length;
    userPickedPhase = true;
    renderPlates();
    renderDossier();
  }

  function onReset() {
    const btn = document.getElementById("reset");
    const now = Date.now();
    if (now - resetArm > 2200) {
      resetArm = now;
      btn.textContent = "Confirm restore";
      setTimeout(() => {
        if (Date.now() - resetArm >= 2100 && btn.textContent === "Confirm restore") btn.textContent = "Restore sample";
      }, 2300);
      return;
    }
    resetArm = 0;
    btn.textContent = "Restore sample";
    userPickedPhase = false;
    state = clone(SAMPLE);
    fill();
    afterEdit(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function buildCards() {
    document.getElementById("cards").innerHTML = IDS.map((id, i) => `
      <article class="card" data-id="${id}" style="--c:${PALETTE[i]}">
        <span class="ghost">${String(i + 1).padStart(2, "0")}</span>
        <header class="card-h"><span class="code"></span><span class="idx">Power ${i + 1}</span></header>
        <label class="name-label">Country name
          <input class="name-input" data-field="name" maxlength="42" autocomplete="off" spellcheck="false">
        </label>
        <label>Leader
          <input data-field="leader" maxlength="48" autocomplete="off" spellcheck="false">
        </label>
        <div class="doctrines" role="radiogroup" aria-label="Doctrine for power ${i + 1}">
          ${Object.keys(DOCTRINES).map((k) => `<button type="button" data-doctrine="${k}" aria-pressed="false">${DOCTRINES[k].label}</button>`).join("")}
        </div>
        <p class="blurb"></p>
        <div class="fields">
          ${FIELDS.map(([key, label, min, max, step]) => `<label>${label}<input type="number" data-field="${key}" min="${min}" max="${max}" step="${step}" inputmode="decimal" autocomplete="off"></label>`).join("")}
        </div>
        <label>Staff note, quoted if it matters
          <textarea data-field="note" maxlength="180" rows="3"></textarea>
        </label>
        <div class="leans" data-id="${id}"></div>
      </article>
    `).join("");
  }

  function fill() {
    document.getElementById("year").value = state.meta.year;
    document.getElementById("title").value = state.meta.title;
    state.countries.forEach((c) => {
      const card = document.querySelector('.card[data-id="' + c.id + '"]');
      card.querySelector('[data-field="name"]').value = c.name;
      card.querySelector('[data-field="leader"]').value = c.leader;
      card.querySelector('[data-field="note"]').value = c.note;
      FIELDS.forEach(([key]) => {
        card.querySelector('[data-field="' + key + '"]').value = c[key];
      });
    });
    renderTone();
  }

  function bind() {
    const cards = document.getElementById("cards");
    cards.addEventListener("input", onOrdersInput);
    cards.addEventListener("click", onDoctrine);
    cards.addEventListener("focusout", onBlur);
    cards.addEventListener("wheel", (e) => {
      if (e.target.matches && e.target.matches('input[type="number"]')) e.target.blur();
    }, { passive: true });
    document.getElementById("year").addEventListener("input", onMeta);
    document.getElementById("title").addEventListener("input", onMeta);
    document.getElementById("tone").addEventListener("click", onTone);
    document.getElementById("reset").addEventListener("click", onReset);
    document.getElementById("plates").addEventListener("click", onPlate);
    document.addEventListener("keydown", onKey);
  }

  function init() {
    state = load();
    buildCards();
    bind();
    fill();
    afterEdit(true);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }

  const api = { bestSimulation, narrate, powerOf, SAMPLE, simulate };
  if (typeof globalThis !== "undefined") globalThis.WW3 = api;
})();
