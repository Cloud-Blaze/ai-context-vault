const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "development",
  entry: {
    content: ["./src/content.ts", "./src/content/inject.css"],
    popup: "./src/popup.ts",
    background: "./src/background.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                declaration: false,
                declarationMap: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "icons/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CopyPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        { from: "popup.html", to: "popup.html" },
        { from: "public/icons/icon.png", to: "icons/icon.png" },
        { from: "public/icons/icon16.png", to: "icons/icon16.png" },
        { from: "public/icons/icon48.png", to: "icons/icon48.png" },
        { from: "public/icons/icon128.png", to: "icons/icon128.png" },
        { from: "public/icons/icon512.png", to: "icons/icon512.png" },
        { from: "public/icons/icon.svg", to: "icons/icon.svg" },
        { from: "public/icons/icon-grey.png", to: "icons/icon-grey.png" },
        { from: "public/icons/icon-grey-16.png", to: "icons/icon-grey-16.png" },
        { from: "public/icons/icon-grey-48.png", to: "icons/icon-grey-48.png" },
        {
          from: "public/icons/icon-grey-128.png",
          to: "icons/icon-grey-128.png",
        },
        {
          from: "public/icons/icon-grey-512.png",
          to: "icons/icon-grey-512.png",
        },
        { from: "public/icons/icon-grey.svg", to: "icons/icon-grey.svg" },
      ],
    }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      src: path.resolve(__dirname, "src"),
    },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 3000,
  },
};
