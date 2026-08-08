"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

// CI and packaging runners do not need local git hooks.
if (process.env.CI === "true") {
  process.exit(0);
}

const root = path.join(__dirname, "..");
const hookScript = path.join(__dirname, "install-git-hooks.sh");

function runGitHooksInstall() {
  const bash = process.platform === "win32" ? "bash" : "bash";
  const result = spawnSync(bash, [hookScript], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT" && process.platform === "win32") {
    console.warn(
      "prepare: bash not found — skipping git hooks (install Git for Windows or run pnpm hooks:install)",
    );
    process.exit(0);
  }

  process.exit(result.status ?? 1);
}

runGitHooksInstall();
