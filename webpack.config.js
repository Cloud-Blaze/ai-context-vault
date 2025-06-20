const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    background: "./src/background/background.js",
    inject: "./src/content/inject.js",
    options: "./src/options/options.js",
    "inject-combined": "./src/content/inject-combined.css",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    publicPath: "",
    clean: true,
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "public",
          to: ".",
        },
      ],
    }),
    // Custom plugin to copy the generated CSS file
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("CopyCSSPlugin", (compilation) => {
          const fs = require("fs");
          const sourcePath = path.join(
            __dirname,
            "dist",
            "inject-combined.css"
          );
          const targetPath = path.join(__dirname, "dist", "inject.css");

          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log("Copied inject-combined.css to inject.css");
          }
        });
      },
    },
  ],
  resolve: {
    extensions: [".js", ".jsx"],
  },
};

// To develop/debug your extension:
// 1. Run `npm run dev` (webpack --watch --mode development)
// 2. Load the 'dist/' directory as an unpacked extension in chrome://extensions/
// 3. After edits, let webpack rebuild, then refresh the extension and your page
