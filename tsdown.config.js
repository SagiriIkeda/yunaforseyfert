const { defineConfig } = require("tsdown");

module.exports = defineConfig({
    dts: true,
    entry: ["./src/index.ts"],
    ignoreWatch: ["**/node_modules/**", "**/.git/**"],
    splitting: false,
    minify: true,
    treeshake: true,
    outDir: "build",
    clean: true,
    format: ["cjs", "esm"],
    tsconfig: "./tsconfig.json",
    target: false,
    deps: {
        skipNodeModulesBundle: true,
    },
    checks: {
        pluginTimings: false,
    },
});
