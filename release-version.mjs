function parseVersion(value, label) {
  const match = String(value || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`${label} must be a numeric semantic version.`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareVersions(left, right) {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function latestPublishedVersion(values) {
  let latest = null;
  for (const value of values) {
    const source = String(value || "").trim();
    if (!/^\d+\.\d+\.\d+$/.test(source)) continue;
    const parsed = parseVersion(source, "Published version");
    if (!latest || compareVersions(parsed, latest) > 0) latest = parsed;
  }
  return latest ? formatVersion(latest) : "";
}

export function nextReleaseVersion(candidateValue, latestPublishedValue = "") {
  const candidate = parseVersion(candidateValue, "Candidate version");
  const latestValue = String(latestPublishedValue || "").trim();
  if (!latestValue) return formatVersion(candidate);

  const latest = parseVersion(latestValue, "Latest published version");
  if (compareVersions(candidate, latest) > 0) return formatVersion(candidate);
  return formatVersion({ ...latest, patch: latest.patch + 1 });
}

if (process.argv[1]?.endsWith("release-version.mjs")) {
  try {
    if (process.argv[2] === "--latest") {
      process.stdout.write(`${latestPublishedVersion(process.argv.slice(3))}\n`);
    } else {
      process.stdout.write(`${nextReleaseVersion(process.argv[2], process.argv[3])}\n`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
