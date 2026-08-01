#!/usr/bin/env node
/**
 * Loop management decision layer.
 *
 * Runs a bash check script against a previous agent's response file and returns
 * JSON indicating whether the orchestration loop should continue or stop.
 *
 * Check script contract:
 *   - RESPONSE_FILE env var points at the previous agent output.
 *   - Exit 0  → stop condition met (loop should stop).
 *   - Exit ≠0 → stop condition not met (loop should continue).
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

function parseArgs(argv) {
  const args = {
    loopConfig: null,
    responseFile: null,
    maxIterationsExceeded: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--loop-config") {
      args.loopConfig = argv[++i];
    } else if (arg === "--response-file") {
      args.responseFile = argv[++i];
    } else if (arg === "--max-iterations-exceeded") {
      args.maxIterationsExceeded = true;
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
      "  --max-iterations-exceeded      Force stop with iteration-cap reason\n" +
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
      `  reason:          ${decision.reason}`,
      `  iteration:       ${decision.iteration}/${decision.max_iterations}`,
      `  check_script:    ${decision.check_script}`,
      `  response_file:   ${decision.response_file}`,
      `  check_exit_code: ${decision.check_exit_code}`,
      "",
      "  Read the JSON `prompt` field and pass it to the next subagent if set.",
      "",
    );
  } else {
    lines.push(
      "  ✓ STOP — loop condition satisfied or cap reached",
      "",
      `  action:          ${decision.action}`,
      `  reason:          ${decision.reason}`,
      `  iteration:       ${decision.iteration}/${decision.max_iterations}`,
      `  check_exit_code: ${decision.check_exit_code}`,
      "",
    );
  }

  lines.push("  (JSON decision object is printed after this banner.)", "");
  return lines.join("\n");
}

function runCheckScript(checkScriptPath, responseFilePath) {
  const env = {
    ...process.env,
    RESPONSE_FILE: responseFilePath,
    LOOP_RESPONSE_FILE: responseFilePath,
  };

  try {
    execFileSync(checkScriptPath, [], {
      env,
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });
    return 0;
  } catch (err) {
    if (err.status !== undefined) {
      return err.status;
    }
    throw new Error(`Failed to run check script: ${err.message}`);
  }
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
      reason: `Check script not found: ${config.check_script}`,
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — check script missing; fix loop artifacts before continuing.",
    };
  }

  if (!fs.existsSync(responseFile)) {
    return {
      action: "stop",
      continue_loop: false,
      reason: `Response file not found: ${config.response_file}`,
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — previous agent response file missing.",
    };
  }

  if (options.maxIterationsExceeded || iteration >= maxIterations) {
    return {
      action: "stop",
      continue_loop: false,
      reason: "Maximum loop iterations reached; reporting current state.",
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: true,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: null,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — iteration cap reached.",
    };
  }

  const checkExitCode = runCheckScript(checkScript, responseFile);
  const stopConditionMet = checkExitCode === 0;

  if (stopConditionMet) {
    return {
      action: "stop",
      continue_loop: false,
      reason: config.stop_reason ?? "Stop condition met by check script (exit 0).",
      iteration,
      max_iterations: maxIterations,
      max_iterations_exceeded: false,
      check_script: config.check_script,
      response_file: config.response_file,
      check_exit_code: checkExitCode,
      loop_name: config.name ?? "unnamed-loop",
      prompt: null,
      action_summary: "STOP — bash check succeeded; loop goal achieved.",
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
      updated_at: new Date().toISOString(),
    });
  }

  return {
    action: "continue",
    continue_loop: true,
    reason:
      config.continue_reason ??
      "Stop condition not met by check script (non-zero exit); loop continues.",
    iteration: nextIteration,
    max_iterations: maxIterations,
    max_iterations_exceeded: false,
    check_script: config.check_script,
    response_file: config.response_file,
    check_exit_code: checkExitCode,
    loop_name: config.name ?? "unnamed-loop",
    prompt: config.next_prompt ?? null,
    action_summary: "CONTINUE — delegate next loop step using `prompt` if set.",
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
