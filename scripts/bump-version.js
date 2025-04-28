const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "../public/manifest.json");
const pkgPath = path.join(__dirname, "../package.json");
const optionsPath = path.join(__dirname, "..", "public", "options.html");

function bump(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
pkg.version = bump(pkg.version);
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
manifest.version = pkg.version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const html = fs
  .readFileSync(optionsPath, "utf-8")
  .replace(/v[0-9]+\.[0-9]+\.[0-9]+/, `v${pkg.version}`);
fs.writeFileSync(optionsPath, html);

console.log(`Bumped to version ${pkg.version}`);
