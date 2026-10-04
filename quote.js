// Pure pricing logic: every number comes from pricing.json, nothing is guessed.
(function (root) {
  function pick(table, key, what) {
    if (!table || !Object.prototype.hasOwnProperty.call(table, key)) {
      throw new Error("Unknown " + what + ": " + key);
    }
    return table[key];
  }

  function round(n, step) {
    return Math.round(n / step) * step;
  }

  function estimate(rules, a) {
    var area = Number(a.area);
    if (!(area > 0) || area > 500) throw new Error("Area must be between 0 and 500 m²");

    var job = pick(rules.jobTypes, a.jobType, "job type");
    var size = pick(rules.tileSizes, a.tileSize, "tile size");
    var removal = pick(rules.removal, a.removal, "removal option");
    var tiles = pick(rules.tiles, a.tiles, "tile supply option");
    var zone = pick(rules.zones, a.zone, "location");
    var timing = pick(rules.timing, a.timing, "timeframe");

    var lines = [];
    var labour = area * job.perM2 * size.multiplier + (job.base || 0);
    lines.push({ label: "Labour: " + job.label + ", " + size.label.toLowerCase(), amount: labour });

    var removalCost = (removal.fixed || 0) + area * (removal.perM2 || 0);
    if (removalCost) lines.push({ label: removal.label, amount: removalCost });

    (a.prep || []).forEach(function (key) {
      var p = pick(rules.prep, key, "preparation option");
      lines.push({ label: p.label, amount: area * p.perM2 });
    });

    if (tiles.perM2) {
      lines.push({
        label: "Tiles (" + tiles.label.replace("You supply, ", "") + ", incl. " + Math.round(rules.tiles.wastage * 100) + "% wastage)",
        amount: area * (1 + rules.tiles.wastage) * tiles.perM2
      });
    }

    if (zone.travel) lines.push({ label: "Travel: " + zone.label, amount: zone.travel });

    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    if (timing.adjust) {
      lines.push({ label: "Timing: " + timing.label, amount: subtotal * timing.adjust });
    }

    var total = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var minimumApplied = false;
    if (total < rules.minimumCharge) {
      lines.push({ label: "Minimum job charge", amount: rules.minimumCharge - total });
      total = rules.minimumCharge;
      minimumApplied = true;
    }

    var step = rules.roundTo || 10;
    var spread = rules.rangeSpread || 0;
    return {
      lines: lines.map(function (l) { return { label: l.label, amount: round(l.amount, 1) }; }),
      point: round(total, step),
      low: Math.max(rules.minimumCharge, round(total * (1 - spread), step)),
      high: round(total * (1 + spread), step),
      minimumApplied: minimumApplied
    };
  }

  function whatsappText(rules, a, est, photoCount) {
    var c = rules.business.currency;
    var prep = (a.prep || []).map(function (k) { return rules.prep[k].label; }).join(", ") || "None";
    var rows = [
      "Hi " + rules.business.name + ", I'd like a quote.",
      "Job: " + rules.jobTypes[a.jobType].label,
      "Area: about " + a.area + " m²",
      "Tiles: " + rules.tileSizes[a.tileSize].label,
      "Removal: " + rules.removal[a.removal].label,
      "Prep: " + prep,
      "Tile supply: " + rules.tiles[a.tiles].label,
      "Location: " + rules.zones[a.zone].label,
      "Timing: " + rules.timing[a.timing].label,
      "Online estimate: " + c + est.low.toLocaleString("en-GB") + " to " + c + est.high.toLocaleString("en-GB")
    ];
    if (photoCount) rows.push("Photos: " + photoCount + " (I'll send them in this chat)");
    return rows.join("\n");
  }

  var api = { estimate: estimate, whatsappText: whatsappText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Quote = api;
})(this);
