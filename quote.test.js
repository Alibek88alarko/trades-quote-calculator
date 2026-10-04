// Run: node quote.test.js
const assert = require("assert");
const rules = require("./pricing.json");
const { estimate, whatsappText } = require("./quote.js");

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok -", name); }

const base = { jobType: "floor", area: 10, tileSize: "standard", removal: "none", prep: [], tiles: "customer", zone: "local", timing: "month" };

test("floor 10 m², standard tiles: 10 x 38 = 380", () => {
  const e = estimate(rules, base);
  assert.strictEqual(e.point, 380);
  assert.strictEqual(e.low, 330);
  assert.strictEqual(e.high, 430);
});

test("every line comes from the price list", () => {
  const e = estimate(rules, { ...base, jobType: "bathroom", tileSize: "large", removal: "stripout", prep: ["tanking"], tiles: "standard", zone: "mid", timing: "asap" });
  const labels = e.lines.map(l => l.label).join(" | ");
  assert.ok(labels.includes("Labour"));
  assert.ok(labels.includes("Full bathroom strip-out"));
  assert.ok(labels.includes("Waterproofing"));
  assert.ok(labels.includes("Tiles"));
  assert.ok(labels.includes("Travel"));
  assert.ok(labels.includes("Timing"));
  // 10*48*1.3+600=1224; +450; +150; +10*1.1*25=275; +40 => 2139; +10% => 2352.9
  assert.strictEqual(e.point, 2350);
});

test("minimum charge applies to tiny jobs", () => {
  const e = estimate(rules, { ...base, jobType: "splashback", area: 1 });
  assert.strictEqual(e.point, 250);
  assert.strictEqual(e.low, 250);
  assert.ok(e.minimumApplied);
});

test("unknown option is refused, never guessed", () => {
  assert.throws(() => estimate(rules, { ...base, tileSize: "giant" }), /Unknown tile size/);
});

test("bad area is refused", () => {
  assert.throws(() => estimate(rules, { ...base, area: 0 }), /Area/);
  assert.throws(() => estimate(rules, { ...base, area: "abc" }), /Area/);
});

test("WhatsApp text carries the job details and the estimate", () => {
  const e = estimate(rules, base);
  const t = whatsappText(rules, base, e, 2);
  assert.ok(t.includes("Job: Floor tiling"));
  assert.ok(t.includes("Area: about 10 m²"));
  assert.ok(t.includes("Online estimate: €330 to €430"));
  assert.ok(t.includes("Photos: 2"));
});

console.log(`\n${passed} tests passed`);
