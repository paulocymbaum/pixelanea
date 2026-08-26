#!/usr/bin/env node
/**
 * Loop management decision layer.
 *
 * Runs a bash check script against loop sensors and returns JSON indicating
 * whether the orchestration loop should continue or stop.
 *
 * Prefer the runner gate (Develop/Deliver):
 *   1. Optionally run `.cursor/tools/run_runners.sh` (writes loop/runners/*.json)
 *   2. `check_condition.sh` reads runners only — ignores EVALUATION / STATUS in RESPONSE_FILE
 *
 * Check script contract:
 *   - RESPONSE_FILE env var points at the previous agent output (critic / context only).
 *   - Exit 0  → complete (loop should stop).
 *   - Exit 1  → continue (loop should continue).
 *   - Exit 2  → interrupted / misconfigured (loop should stop).
 *
 * Status classes on the decision JSON:
 *   complete | continue | capped | interrupted
 *
 * Usage:
 *   node .cursor/tools/loop_management.js --loop-config path/to/loop/loop_config.json
 *   node .cursor/tools/loop_management.js --loop-config path/to/loop/loop_config.json \
 *       --response-file path/to/loop/last_agent_response.md
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_RUN_RUNNERS = path.join(PROJECT_ROOT, ".cursor", "tools", "run_runners.sh");
/** Check-only read should stay short; runners run in a prior step (or via run_runners). */
const CHECK_TIMEOUT_MS = 120000;
/** Develop lint+unit can exceed 2 minutes. */
const RUN_RUNNERS_TIMEOUT_MS = 900000;

function parseArgs(argv) {
  const args = {
    loopConfig: null,
    responseFile: null,
    maxIterationsExceeded: false,
    skipRunners: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--loop-config") {
      args.loopConfig = argv[++i];
    } else if (arg === "--response-file") {
      args.responseFile = argv[++i];
    } else if (arg === "--max-iterations-exceeded") {
      args.maxIterationsExceeded = true;
    } else if (arg === "--skip-runners") {
      args.skipRunners = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.loopConfig) {
    throw new Error("Missing required --loop-config <path>");
  }

  return args;
}

function printHelp() {
  process.stdout.write(
    "Usage: node .cursor/tools/loop_management.js --loop-config <path> [options]\n\n" +
      "Options:\n" +
      "  --response-file <path>         Override response file from loop config\n" +
      "  --max-iterations-exceeded      Force stop with status=capped\n" +
      "  --skip-runners                 Do not invoke run_runners.sh even if configured\n" +
      "  --help                         Show this help\n",
  );
}

function resolveRepoPath(p) {
  const resolved = path.isAbsolute(p) ? p : path.join(PROJECT_ROOT, p);
  return path.normalize(resolved);
}

function readJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function formatHumanBanner(decision) {
  const lines = [
    "",
    "╔══════════════════════════════════════════════════════════════╗",
    "║              LOOP MANAGEMENT — ORCHESTRATOR DECISION         ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
  ];

  if (decision.continue_loop) {
    lines.push(
      "  ▶ ACTION REQUIRED: continue loop (delegate to next agent step)",
      "",
      `  action:          ${decision.action}`,
      `  status:          ${decision.status}`,
      `  reason:          ${decision.reason}`,
      `  iteration:       ${decision.iteration}/${decision.max_iterations}`,
      `  check_script:    ${decision.check_script}`,
      `  response_file:   ${decision.response_file}`,
      `  check_exit_code: ${decision.check_exit_code}`,
      "",
      "  Read the JSON `prompt` field and pass it to the next subagent if set.",
      "  Prefer loop/runners/summary.json + failing log tails over EVALUATION.",
      "",
    );
  } else {
    lines.push(
      `  ✓ STOP — status=${decision.status}`,
      "",
      `  action:          ${decision.action}`,
      `  status:          ${decision.status}`,
      `  reason:          ${decision.reason}`,
      `  iteration:       ${decision.iteration}/${decision.max_iterations}`,
      `  check_exit_code: ${decision.check_exit_code}`,
      "",
    );
  }

  lines.push("  (JSON decision object is printed after this banner.)", "");
  return lines.join("\n");
}

function runnersDirForCheck(checkScriptPath) {
  return path.join(path.dirname(checkScriptPath), "runners");
}

function summaryIsStale(loopDir, responseFilePath) {
  const summaryPath = path.join(loopDir, "runners", "summary.json");
  if (!fs.existsSync(summaryPath)) {
    return true;
  }
  if (!fs.existsSync(responseFilePath)) {
    return false;
  }
  const summaryMtime = fs.statSync(summaryPath).mtimeMs;
  const responseMtime = fs.statSync(responseFilePath).mtimeMs;
  return responseMtime > summaryMtime;
}

function resolveRunRunnersPath(config, checkScriptPath) {
  if (config.run_runners === false) {
    return null;
  }
  if (typeof config.run_runners === "string" && config.run_runners.length > 0) {
    return resolveRepoPath(config.run_runners);
  }
  const sibling = path.join(path.dirname(checkScriptPath), "run_runners.sh");
  if (fs.existsSync(sibling)) {
    return sibling;
  }
  // Default: invoke shared writer when loop/runners is expected (recursive gate).
  if (config.harness_profile || config.require_e2e || config.auto_run_runners) {
    return DEFAULT_RUN_RUNNERS;
  }
  return null;
}

function runRunnersIfNeeded(config, checkScriptPath, responseFilePath, options) {
  if (options.skipRunners) {
    return;
  }
  const runPath = resolveRunRunnersPath(config, checkScriptPath);
  if (!runPath) {
    return;
  }
  if (!fs.existsSync(runPath)) {
    throw new Error(`run_runners script not found: ${runPath}`);
  }

  const loopDir = path.dirname(checkScriptPath);
  if (!summaryIsStale(loopDir, responseFilePath) && config.force_run_runners !== true) {
    return;
  }

  const profile = config.harness_profile || (config.require_e2e ? "deliver" : "develop");
  const args = ["--loop-dir", loopDir, "--profile", profile];
  if (config.include_backend) {
    args.push("--include-backend");
  }

  execFileSync("bash", [runPath, ...args], {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: config.run_runners_timeout_ms ?? RUN_RUNNERS_TIMEOUT_MS,
    env: {
      ...process.env,
      HARNESS_PROFILE: profile,
      HARNESS_INCLUDE_BACKEND: config.include_backend ? "1" : "0",
    },
  });
}

function runCheckScript(checkScriptPath, responseFilePath) {
  const env = {
    ...process.env,
    PIXELANEA_ROOT: PROJECT_ROOT,
    RESPONSE_FILE: responseFilePath,
    LOOP_RESPONSE_FILE: responseFilePath,
    RUNNERS_DIR: runnersDirForCheck(checkScriptPath),
  };

  try {
    execFileSync(checkScriptPath, [], {
      env,
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: CHECK_TIMEOUT_MS,
    });
    return 0;
  } catch (err) {
    if (err.status !== undefined && err.status !== null) {
      return err.status;
    }
    throw new Error(`Failed to run check script: ${err.message}`);
  }
}

function statusFromCheckExit(checkExitCode) {
  if (checkExitCode === 0) {
    return "complete";
  }
  if (checkExitCode === 2) {
    return "interrupted";
  }
  return "continue";
}

function buildDecision(config, options) {
  const checkScript = resolveRepoPath(config.check_script);
  const responseFile = resolveRepoPath(
    options.responseFile || config.response_file,
  );
  const maxIterations = config.max_iterations ?? 5;
  const iterationFile = config.iteration_file
    ? resolveRepoPath(config.iteration_file)
    : null;

  let iteration = config.iteration ?? 0;
  if (iterationFile && fs.existsSync(iterationFile)) {
    const state = readJson(iterationFile);
    iteration = state.iteration ?? iteration;
  }

  if (!fs.existsSync(checkScript)) {
    return {
      action: "stop",
      continue_loop: false,
      status: "interrupted",
      reason: `Check script not found: ${config.check_script}`,
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary:
        "STOP — check script missing; fix loop artifacts before continuing (status=interrupted).",
    };
  }

  if (!fs.existsSync(responseFile)) {
    return {
      action: "stop",
      continue_loop: false,
      status: "interrupted",
      reason: `Response file not found: ${config.response_file}`,
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — previous agent response file missing (status=interrupted).",
    };
  }

  if (options.maxIterationsExceeded || iteration >= maxIterations) {
    return {
      action: "stop",
      continue_loop: false,
      status: "capped",
      reason:
        "Maximum loop iterations reached; setpoints may still be red (status=capped, not complete).",
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: true,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — iteration cap reached (status=capped).",
    };
  }

  try {
    runRunnersIfNeeded(config, checkScript, responseFile, options);
  } catch (err) {
    return {
      action: "stop",
      continue_loop: false,
      status: "interrupted",
      reason: `run_runners failed: ${err.message}`,
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: 2,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — runner writer failed (status=interrupted).",
    };
  }

  const checkExitCode = runCheckScript(checkScript, responseFile);
  const status = statusFromCheckExit(checkExitCode);

  if (status === "complete") {
    return {
      action: "stop",
      continue_loop: false,
      status: "complete",
      reason:
        config.stop_reason ??
        "Stop condition met by check script (exit 0) — required runners green.",
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: checkExitCode,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — bash check succeeded; loop goal achieved (status=complete).",
    };
  }

  if (status === "interrupted") {
    return {
      action: "stop",
      continue_loop: false,
      status: "interrupted",
      reason:
        config.interrupt_reason ??
        "Check script exit 2 — misconfigured runners or missing artifacts.",
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: checkExitCode,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — gate misconfigured (status=interrupted).",
    };
  }

  const nextIteration = iteration + 1;
  if (iterationFile) {
    const dir = path.dirname(iterationFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    writeJson(iterationFile, {
      iteration: nextIteration,
      loop_name: config.name ?? "unnamed-loop",
      last_check_exit_code: checkExitCode,
      status: "continue",
      updated_at: new Date().toISOString(),
    });
  }

  return {
    action: "continue",
    continue_loop: true,
    status: "continue",
    reason:
      config.continue_reason ??
      "Stop condition not met by check script (exit 1); required runners still red.",
    iteration: nextIteration,
    max_iterations: maxIterations,
    max_iterations_exceeded: false,
    check_script: config.check_script,
    response_file: config.response_file,
    check_exit_code: checkExitCode,
    loop_name: config.name ?? "unnamed-loop",
    prompt: config.next_prompt ?? null,
    action_summary:
      "CONTINUE — delegate next loop step using `prompt`; feed summary.json + failing tails.",
  };
}

function main() {
  try {
    const options = parseArgs(process.argv);
    const configPath = resolveRepoPath(options.loopConfig);

    if (!fs.existsSync(configPath)) {
      process.stderr.write(`loop config not found: ${options.loopConfig}\n`);
      process.exit(2);
    }

    const config = readJson(configPath);
    const decision = buildDecision(config, options);

    process.stderr.write(formatHumanBanner(decision));
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}

main();
