const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: {
    background: "./src/background/background.js",
    inject: "./src/content/inject.js",
    options: "./src/options/options.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
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
        use: [MiniCssExtractPlugin.loader, "css-loader"],
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
  ],
  resolve: {
    extensions: [".js", ".jsx"],
  },
};

// To develop/debug your extension:
// 1. Run `npm run dev` (webpack --watch --mode development)
// 2. Load the 'dist/' directory as an unpacked extension in chrome://extensions/
// 3. After edits, let webpack rebuild, then refresh the extension and your page
