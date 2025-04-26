const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);
const version = pkg.version;
const outFile = `dist/ai-context-vault-v${version}.zip`;

// Push changes and tags
execSync(`git push && git push --tags`, {
  stdio: "inherit",
});
console.log(`Pushed to remote`);

// Create GitHub release and upload asset
try {
  execSync(
    `gh release create v${version} --title "Release v${version}" --notes "Release v${version}" ${outFile}`,
    {
      stdio: "inherit",
    }
  );
  console.log(`📦 Created GitHub release v${version} and uploaded asset`);
} catch (error) {
  console.error("Failed to create GitHub release:", error.message);
  process.exit(1);
}
