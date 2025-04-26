const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SOURCE_IMAGE = "public/icons/icon-grey-transparent.png";
const OUTPUT_DIR = "public/icons";

// Define the sizes we want to generate
const SIZES = [
  { size: 16, name: "icon-grey-16.png" },
  { size: 48, name: "icon-grey-48.png" },
  { size: 128, name: "icon-grey-128.png" },
  { size: 512, name: "icon-grey-512.png" },
  // Also create the base icon.png at 128px
  { size: 128, name: "icon-grey.png" },
];

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Load the source image
    const image = sharp(SOURCE_IMAGE);

    // Generate each size
    for (const { size, name } of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);

      await image
        .clone()
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`Generated ${outputPath} (${size}x${size})`);
    }

    console.log("Icon generation complete!");
  } catch (error) {
    console.error("Error generating icons:", error);
    process.exit(1);
  }
}

generateIcons();
