#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const BASELINE_VERSION = "1.6.0";
const BASELINE_SHA = "8576bcf7e2d1942d2ffec2a1f449d3d5cc1cef73";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeCommand = process.execPath;

process.chdir(ROOT);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return options.capture ? String(result.stdout || "").trim() : "";
}

function gitObjectExists(ref) {
  const result = spawnSync("git", ["cat-file", "-e", `${ref}^{commit}`], {
    cwd: ROOT,
    stdio: "ignore",
  });
  return result.status === 0;
}

function resolveBaselineRef() {
  const candidates = [
    process.env.VEIL_PERF_BASELINE,
    "origin/stable",
    "stable",
    BASELINE_VERSION,
    BASELINE_SHA,
  ].filter(Boolean);
  const ref = candidates.find((candidate) => gitObjectExists(candidate));
  if (!ref) {
    throw new Error(
      `Could not resolve a ${BASELINE_VERSION} baseline. Fetch origin/stable or the ${BASELINE_VERSION} tag and retry.`,
    );
  }
  return ref;
}

function gitShow(ref, path) {
  return run("git", ["show", `${ref}:${path}`], { capture: true });
}

function block(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return "";
  const endIndex = source.indexOf(end, startIndex + start.length);
  return source.slice(startIndex, endIndex < 0 ? source.length : endIndex);
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function percentChange(base, next) {
  if (base === 0) return next === 0 ? 0 : Infinity;
  return ((next - base) / base) * 100;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "∞";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function printRow(label, baseline, candidate, expectedCandidate) {
  const pass = candidate === expectedCandidate;
  const status = pass ? "PASS" : "FAIL";
  process.stdout.write(
    `${status.padEnd(5)}  ${label.padEnd(39)} ${String(baseline).padEnd(10)} -> ${String(candidate)}\n`,
  );
  return pass;
}

function analyzeSourceContracts(baselineMain, candidateMain) {
  const baselineScene = block(baselineMain, "private setManualScene", "private resolveForContext");
  const candidateScene = block(candidateMain, "private setManualScene", "private scheduleSave");
  const baselineShuffle = block(baselineMain, "public shuffleWallpaperPool", "public openWallpaperLibrary");
  const candidateShuffle = block(candidateMain, "public shuffleWallpaperPool", "public openWallpaperLibrary");

  const contracts = [
    {
      label: "active-leaf broad workspace refresh",
      baseline: /active-leaf-change[\s\S]{0,350}?refreshWallpaper\(\)/.test(baselineMain),
      candidate: /active-leaf-change[\s\S]{0,350}?refreshWallpaper\(\)/.test(candidateMain),
      expected: false,
    },
    {
      label: "file-open broad workspace refresh",
      baseline: /file-open[\s\S]{0,220}?refreshWallpaper\(\)/.test(baselineMain),
      candidate: /file-open[\s\S]{0,220}?refreshWallpaper\(\)/.test(candidateMain),
      expected: false,
    },
    {
      label: "layout-change broad workspace refresh",
      baseline: /layout-change[\s\S]{0,450}?refreshWallpaper\(\)/.test(baselineMain),
      candidate: /layout-change[\s\S]{0,450}?refreshWallpaper\(\)/.test(candidateMain),
      expected: false,
    },
    {
      label: "css-change broad workspace refresh",
      baseline: /css-change[\s\S]{0,700}?refreshWallpaper\(\)/.test(baselineMain),
      candidate: /css-change[\s\S]{0,700}?refreshWallpaper\(\)/.test(candidateMain),
      expected: false,
    },
    {
      label: "settings normalized no-op guard",
      baseline: /veilSettingsEqual\(previous, next\)/.test(baselineMain),
      candidate: /veilSettingsEqual\(previous, next\)/.test(candidateMain),
      expected: true,
    },
    {
      label: "settings impact classifier",
      baseline: /classifySettingsChange\(previous, next\)/.test(baselineMain),
      candidate: /classifySettingsChange\(previous, next\)/.test(candidateMain),
      expected: true,
    },
    {
      label: "document-scoped scheduling",
      baseline: /scheduleApplyToDocuments\(/.test(baselineMain),
      candidate: /scheduleApplyToDocuments\(/.test(candidateMain),
      expected: true,
    },
    {
      label: "theme dependency gate",
      baseline: /contextRulesDependOnTheme/.test(baselineMain),
      candidate: /contextRulesDependOnTheme/.test(candidateMain),
      expected: true,
    },
    {
      label: "scene switch bumps global source revision",
      baseline: /sourceRevision\s*\+=\s*1/.test(baselineScene),
      candidate: /sourceRevision\s*\+=\s*1/.test(candidateScene),
      expected: false,
    },
    {
      label: "pool shuffle bumps global source revision",
      baseline: /sourceRevision\s*\+=\s*1/.test(baselineShuffle),
      candidate: /sourceRevision\s*\+=\s*1/.test(candidateShuffle),
      expected: false,
    },
    {
      label: "vault path targeted invalidation",
      baseline: /refreshDocumentsAffectedByVaultPath/.test(baselineMain),
      candidate: /refreshDocumentsAffectedByVaultPath/.test(candidateMain),
      expected: true,
    },
  ];

  process.stdout.write("\nOptimization work-contract comparison\n");
  process.stdout.write(`Baseline: ${BASELINE_VERSION}\n\n`);
  let passed = true;
  for (const contract of contracts) {
    passed = printRow(
      contract.label,
      yesNo(contract.baseline),
      yesNo(contract.candidate),
      yesNo(contract.expected),
    ) && passed;
  }
  return passed;
}

function buildBaseline(ref) {
  const parent = mkdtempSync(join(tmpdir(), "veil-perf-baseline-"));
  const worktree = join(parent, "worktree");
  try {
    process.stdout.write(`\nBuilding ${BASELINE_VERSION} baseline from ${ref}...\n`);
    run("git", ["worktree", "add", "--detach", worktree, ref]);
    run(npmCommand, ["ci", "--prefer-offline", "--no-audit", "--no-fund"], { cwd: worktree });
    run(npmCommand, ["run", "build"], { cwd: worktree });
    return statSync(join(worktree, "main.js")).size;
  } finally {
    if (existsSync(worktree)) {
      spawnSync("git", ["worktree", "remove", "--force", worktree], {
        cwd: ROOT,
        stdio: "ignore",
      });
    }
    rmSync(parent, { recursive: true, force: true });
  }
}

function ensureDependencies() {
  const tsxBinary = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  if (existsSync(tsxBinary)) return;
  process.stdout.write("Dependencies are missing; running npm ci first...\n");
  run(npmCommand, ["ci", "--prefer-offline", "--no-audit", "--no-fund"]);
}

function main() {
  const baselineRef = resolveBaselineRef();
  const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  process.stdout.write(`Veil performance gate: ${BASELINE_VERSION} -> ${packageJson.version}\n`);

  ensureDependencies();

  process.stdout.write("\n[1/5] Running deterministic performance contracts...\n");
  run(npmCommand, ["run", "test:perf"]);

  process.stdout.write("\n[2/5] Building and verifying candidate production bundle...\n");
  run(npmCommand, ["run", "build"]);
  run(nodeCommand, ["--check", "main.js"]);
  run(nodeCommand, ["verify-build.mjs"]);

  process.stdout.write("\n[3/5] Comparing runtime control-flow contracts...\n");
  const baselineMain = gitShow(baselineRef, "src/main.ts");
  const candidateMain = readFileSync(join(ROOT, "src", "main.ts"), "utf8");
  const contractsPass = analyzeSourceContracts(baselineMain, candidateMain);

  process.stdout.write("\n[4/5] Comparing production bundle size...\n");
  const candidateBundleBytes = statSync(join(ROOT, "main.js")).size;
  const baselineBundleBytes = process.env.VEIL_PERF_SKIP_BASELINE_BUILD === "1"
    ? null
    : buildBaseline(baselineRef);
  let bundlePass = true;
  if (baselineBundleBytes === null) {
    process.stdout.write(`Candidate main.js: ${candidateBundleBytes.toLocaleString()} bytes (baseline build skipped)\n`);
  } else {
    const growth = percentChange(baselineBundleBytes, candidateBundleBytes);
    const threshold = Number(process.env.VEIL_PERF_MAX_BUNDLE_GROWTH_PCT || "20");
    bundlePass = Number.isFinite(growth) && growth <= threshold;
    process.stdout.write(`Baseline main.js:  ${baselineBundleBytes.toLocaleString()} bytes\n`);
    process.stdout.write(`Candidate main.js: ${candidateBundleBytes.toLocaleString()} bytes\n`);
    process.stdout.write(`Bundle change:      ${formatPercent(growth)} (limit +${threshold.toFixed(2)}%) ${bundlePass ? "PASS" : "FAIL"}\n`);
  }

  process.stdout.write("\n[5/5] Running informational settings-path microbenchmark...\n");
  run(npmCommand, ["run", "bench:settings"]);

  if (!contractsPass || !bundlePass) {
    process.stderr.write("\nPERF GATE: FAIL\n");
    process.exitCode = 1;
    return;
  }
  process.stdout.write("\nPERF GATE: PASS\n");
  process.stdout.write("The candidate preserves all optimization work contracts. Timing output is informational, not a CI threshold.\n");
}

try {
  main();
} catch (error) {
  process.stderr.write(`\nPERF GATE: ERROR\n${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
}