const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Path to the extension in Chrome/Arc
const EXTENSION_PATH = path.join(
  process.env.HOME,
  "Library/Application Support/Arc/User Data/Default/Extensions/ai-context-vault"
);

function reloadExtension() {
  // Find the extension ID directory
  fs.readdir(EXTENSION_PATH, (err, files) => {
    if (err) {
      console.error("Error reading extension directory:", err);
      return;
    }

    // The extension directory should be the only one in this folder
    const extensionDir = files[0];
    if (!extensionDir) {
      console.error("No extension directory found");
      return;
    }

    const fullPath = path.join(EXTENSION_PATH, extensionDir);

    // Execute the reload command
    exec(
      `osascript -e 'tell application "Arc" to activate' -e 'delay 1' -e 'tell application "System Events" to keystroke "r" using {command down, shift down}'`,
      (error) => {
        if (error) {
          console.error("Error reloading extension:", error);
          return;
        }
        console.log("Extension reloaded successfully");
      }
    );
  });
}

// Watch for changes in the dist directory
fs.watch(path.join(__dirname, "../dist"), (eventType, filename) => {
  if (eventType === "change" && filename) {
    console.log(`File ${filename} changed, reloading extension...`);
    reloadExtension();
  }
});

console.log("Watching for changes in dist directory...");
