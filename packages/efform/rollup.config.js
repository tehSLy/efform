import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import commonjs from "rollup-plugin-commonjs";

export default {
  input: "./src/index.ts",
  plugins: [
    typescript({ module: "CommonJS" }),
    commonjs({ extensions: [".js", ".ts"] }),
    babel({ babelHelpers: "bundled" }),
  ],
  output: {
    dir: "./dist",
  },
};
