import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import replace from "@rollup/plugin-replace";
import { getBabelOutputPlugin } from "@rollup/plugin-babel";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/index.ts",
  output: {
    file: "dist/smartgrow-card.js",
    format: "es",
    sourcemap: false,
    // Companion-app WebViews can be years behind desktop Chrome. Transpile
    // everything newer than ES2020 (??=, static blocks, .at(), top-level
    // await) so the bundle parses on old Android System WebView builds.
    plugins: [
      getBabelOutputPlugin({
        presets: [
          ["@babel/preset-env", { targets: { chrome: "75" }, bugfixes: true }],
        ],
        allowAllFormats: true,
      }),
    ],
  },
  plugins: [
    typescript({
      // The editor is referenced by the card via a side-effect import; both
      // custom elements land in the single bundle.
      declaration: false,
      outputToFilesystem: false,
    }),
    replace({
      preventAssignment: true,
      values: {
        "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development"),
      },
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    json(),
    ...(production ? [terser({ format: { comments: false } })] : []),
  ],
};
