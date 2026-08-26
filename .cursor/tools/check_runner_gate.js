#!/usr/bin/env node
/**
 * Read loop/runners/*.json and return the Develop/Deliver conjunction exit class.
 *
 * Exit codes (CLI and evaluateRunners().exit):
 *   0 — complete (all required runners green)
 *   1 — continue (at least one required runner red)
 *   2 — misconfigured (missing runners dir / required files / bad JSON)
 *
 * Does NOT read last_agent_response.md. EVALUATION / STATUS markers are ignored.
 *
 * Usage:
 *   node .cursor/tools/check_runner_gate.js --runners-dir path/to/loop/runners
 *   node .cursor/tools/check_runner_gate.js --runners-dir path/to/loop/runners --require-e2e
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REQUIRED_DEVELOP = ["lint", "unit"];
const REQUIRED_DELIVER = ["lint", "unit", "e2e"];

/**
 * @param {string} runnersDir
 * @param {{ requireE2e?: boolean }} [options]
 * @returns {{ exit: number, status: "complete"|"continue"|"interrupted", reason: string, runners: Record<string, number|null>, summary: object|null }}
 */
function evaluateRunners(runnersDir, options = {}) {
  const requireE2e = Boolean(options.requireE2e);
  const required = requireE2e ? REQUIRED_DELIVER : REQUIRED_DEVELOP;

  if (!runnersDir || !fs.existsSync(runnersDir) || !fs.statSync(runnersDir).isDirectory()) {
    return {
      exit: 2,
      status: "interrupted",
      reason: `Missing runners directory: ${runnersDir || "(empty)"}`,
      runners: Object.fromEntries(required.map((k) => [k, null])),
      summary: null,
    };
  }

  /** @type {Record<string, number|null>} */
  const exits = {};
  /** @type {string[]} */
  const problems = [];

  for (const name of required) {
    const filePath = path.join(runnersDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      exits[name] = null;
      problems.push(`missing ${name}.json`);
      continue;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (typeof raw.exit !== "number" || !Number.isFinite(raw.exit)) {
        exits[name] = null;
        problems.push(`${name}.json missing numeric exit`);
      } else {
        exits[name] = raw.exit;
        if (raw.exit !== 0) {
          problems.push(`${name} exit=${raw.exit}`);
        }
      }
    } catch (err) {
      exits[name] = null;
      problems.push(`${name}.json invalid: ${err.message}`);
    }
  }

  let summary = null;
  const summaryPath = path.join(runnersDir, "summary.json");
  if (fs.existsSync(summaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch {
      summary = null;
    }
  }

  const misconfigured = Object.values(exits).some((v) => v === null);
  if (misconfigured) {
    return {
      exit: 2,
      status: "interrupted",
      reason: `Runner gate misconfigured: ${problems.join("; ")}`,
      runners: exits,
      summary,
    };
  }

  const failed = Object.entries(exits).filter(([, code]) => code !== 0);
  if (failed.length > 0) {
    return {
      exit: 1,
      status: "continue",
      reason: `Required runners red: ${problems.join("; ")}`,
      runners: exits,
      summary,
    };
  }

  return {
    exit: 0,
    status: "complete",
    reason: "All required CI runners green.",
    runners: exits,
    summary,
  };
}

/**
 * Build summary.json payload from per-runner exits.
 * @param {Record<string, { exit: number, log?: string }>} runnerMap
 * @param {{ profile?: string, requireE2e?: boolean }} [options]
 */
function buildSummary(runnerMap, options = {}) {
  const requireE2e = Boolean(options.requireE2e);
  const required = requireE2e ? REQUIRED_DELIVER : REQUIRED_DEVELOP;
  const exits = {};
  for (const name of required) {
    exits[name] = runnerMap[name]?.exit ?? null;
  }
  const missing = required.filter((n) => exits[n] === null);
  const failed = required.filter((n) => exits[n] !== null && exits[n] !== 0);
  let status = "complete";
  let conjunction = 0;
  if (missing.length > 0) {
    status = "interrupted";
    conjunction = 2;
  } else if (failed.length > 0) {
    status = "continue";
    conjunction = 1;
  }
  return {
    profile: options.profile ?? (requireE2e ? "deliver" : "develop"),
    require_e2e: requireE2e,
    conjunction,
    status,
    runners: exits,
    updated_at: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  const args = { runnersDir: null, requireE2e: false, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--runners-dir") {
      args.runnersDir = argv[++i];
    } else if (arg === "--require-e2e") {
      args.requireE2e = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: node check_runner_gate.js --runners-dir <path> [--require-e2e] [--json]\n",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.runnersDir) {
    throw new Error("Missing required --runners-dir <path>");
  }
  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv);
    const result = evaluateRunners(args.runnersDir, { requireE2e: args.requireE2e });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stderr.write(`check_runner_gate: ${result.status} — ${result.reason}\n`);
    }
    process.exit(result.exit);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateRunners,
  buildSummary,
  REQUIRED_DEVELOP,
  REQUIRED_DELIVER,
};
