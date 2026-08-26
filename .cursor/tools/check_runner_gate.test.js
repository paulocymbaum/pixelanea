#!/usr/bin/env node
/**
 * Fixture tests for harness runner gate (no product build required).
 *
 * Run: node .cursor/tools/check_runner_gate.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const { evaluateRunners } = require("./check_runner_gate.js");
const LOOP_MGMT = path.join(__dirname, "loop_management.js");

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function withTempRunners(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-runners-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function testAllGreenExits0() {
  withTempRunners((dir) => {
    writeJson(path.join(dir, "lint.json"), { exit: 0, log: "logs/lint.log" });
    writeJson(path.join(dir, "unit.json"), { exit: 0, log: "logs/unit.log" });
    const result = evaluateRunners(dir);
    assert.strictEqual(result.exit, 0);
    assert.strictEqual(result.status, "complete");
  });
}

function testAnyRedExits1() {
  withTempRunners((dir) => {
    writeJson(path.join(dir, "lint.json"), { exit: 1, log: "logs/lint.log" });
    writeJson(path.join(dir, "unit.json"), { exit: 0, log: "logs/unit.log" });
    const result = evaluateRunners(dir);
    assert.strictEqual(result.exit, 1);
    assert.strictEqual(result.status, "continue");
  });
}

function testMarkdownCompleteStillRedWhenLintFails() {
  withTempRunners((dir) => {
    const loopDir = path.join(dir, "loop");
    const runners = path.join(loopDir, "runners");
    fs.mkdirSync(runners, { recursive: true });
    writeJson(path.join(runners, "lint.json"), { exit: 1, log: "logs/lint.log" });
    writeJson(path.join(runners, "unit.json"), { exit: 0, log: "logs/unit.log" });

    const response = path.join(loopDir, "last_agent_response.md");
    fs.writeFileSync(
      response,
      [
        "# Fake perfect stroke",
        "",
        "**EVALUATION**: 100",
        "",
        "STATUS: complete",
        "",
        "No critical findings.",
      ].join("\n"),
      "utf8",
    );

    // Gate ignores RESPONSE_FILE — only runners matter.
    const result = evaluateRunners(runners);
    assert.strictEqual(result.exit, 1, "EVALUATION 100 must not green a red lint.json");

    const checkScript = path.join(loopDir, "check_condition.sh");
    fs.writeFileSync(
      checkScript,
      `#!/usr/bin/env bash
set -euo pipefail
ROOT="${ROOT}"
LOOP_DIR="$(cd "$(dirname "\$0")" && pwd)"
node "\${ROOT}/.cursor/tools/check_runner_gate.js" --runners-dir "\${LOOP_DIR}/runners"
`,
      "utf8",
    );
    fs.chmodSync(checkScript, 0o755);

    const proc = spawnSync("bash", [checkScript], {
      env: { ...process.env, RESPONSE_FILE: response },
      encoding: "utf8",
    });
    assert.strictEqual(proc.status, 1, `check_condition exit=${proc.status} stderr=${proc.stderr}`);
  });
}

function testMissingRunnersDirExits2() {
  const missing = path.join(os.tmpdir(), `no-runners-${Date.now()}`);
  const result = evaluateRunners(missing);
  assert.strictEqual(result.exit, 2);
  assert.strictEqual(result.status, "interrupted");
}

function testCapStatusCapped() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-loop-"));
  try {
    const loopDir = path.join(tmp, "loop");
    fs.mkdirSync(loopDir, { recursive: true });
    const checkScript = path.join(loopDir, "check_condition.sh");
    fs.writeFileSync(checkScript, "#!/usr/bin/env bash\nexit 1\n", "utf8");
    fs.chmodSync(checkScript, 0o755);
    fs.writeFileSync(path.join(loopDir, "last_agent_response.md"), "incomplete\n", "utf8");

    const configPath = path.join(loopDir, "loop_config.json");
    writeJson(configPath, {
      name: "fixture-cap",
      max_iterations: 5,
      check_script: path.relative(ROOT, checkScript),
      response_file: path.relative(ROOT, path.join(loopDir, "last_agent_response.md")),
      iteration_file: path.relative(ROOT, path.join(loopDir, "loop_iteration.json")),
    });

    const proc = spawnSync(
      process.execPath,
      [LOOP_MGMT, "--loop-config", configPath, "--max-iterations-exceeded"],
      { cwd: ROOT, encoding: "utf8" },
    );
    assert.strictEqual(proc.status, 0, `loop_management exit=${proc.status} stderr=${proc.stderr}`);
    const jsonStart = proc.stdout.indexOf("{");
    assert.ok(jsonStart >= 0, `expected JSON on stdout, got: ${proc.stdout}`);
    const decision = JSON.parse(proc.stdout.slice(jsonStart));
    assert.strictEqual(decision.continue_loop, false);
    assert.strictEqual(decision.status, "capped");
    assert.strictEqual(decision.max_iterations_exceeded, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function testDeliverRequiresE2e() {
  withTempRunners((dir) => {
    writeJson(path.join(dir, "lint.json"), { exit: 0 });
    writeJson(path.join(dir, "unit.json"), { exit: 0 });
    const missing = evaluateRunners(dir, { requireE2e: true });
    assert.strictEqual(missing.exit, 2);

    writeJson(path.join(dir, "e2e.json"), { exit: 0 });
    const ok = evaluateRunners(dir, { requireE2e: true });
    assert.strictEqual(ok.exit, 0);
  });
}

function main() {
  const tests = [
    ["all green → exit 0", testAllGreenExits0],
    ["any red → exit 1", testAnyRedExits1],
    ["EVALUATION 100 + red lint → exit 1", testMarkdownCompleteStillRedWhenLintFails],
    ["missing runners/ → exit 2", testMissingRunnersDirExits2],
    ["--max-iterations-exceeded → status capped", testCapStatusCapped],
    ["deliver requires e2e.json", testDeliverRequiresE2e],
  ];

  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      fn();
      process.stdout.write(`ok — ${name}\n`);
    } catch (err) {
      failed += 1;
      process.stderr.write(`FAIL — ${name}\n${err.stack || err}\n`);
    }
  }

  if (failed > 0) {
    process.stderr.write(`${failed} fixture test(s) failed\n`);
    process.exit(1);
  }
  process.stdout.write(`All ${tests.length} harness gate fixture tests passed.\n`);
}

main();
