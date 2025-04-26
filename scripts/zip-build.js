const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);
const version = pkg.version;
const outFile = `dist/ai-context-vault-v${version}.zip`;

execSync(`zip -r ${outFile} dist/`, { stdio: "inherit" });
console.log(`Created ${outFile}`);

// Copy to ../releases folder
const releasesDir = path.join(__dirname, "../releases");
if (!fs.existsSync(releasesDir)) fs.mkdirSync(releasesDir);
const destination = path.join(releasesDir, path.basename(outFile));
fs.copyFileSync(outFile, destination);
console.log(`Copied to ${destination}`);

// Git commit the release
execSync(`git commit -am "🚀 Release ${version}"`, { stdio: "inherit" });
console.log(`🚀 Committed release ${version} to Git`);

// Tag the release
execSync(`git tag -a v${version} -m "Release v${version}"`, {
  stdio: "inherit",
});
console.log(`🏷️ Tagged release v${version}`);
