import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import packageJson from "./package.json";
import babel from '@rollup/plugin-babel';

export default {
  input: "./src/index.ts",
  output: [
    {
      file: packageJson.main,
      format: "cjs",
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(), 
    // typescript(), 
    resolve(), 
    // commonjs(),
    typescript({ module: "CommonJS" }),
    commonjs({ extensions: [".js", ".ts"] }),
    babel({ babelHelpers: "bundled" }),
  ],
  // external: ["effector", "react", "effector-react", "efform", "react-dom"],
};
