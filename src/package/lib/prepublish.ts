import { copyFileSync, writeFileSync } from "node:fs";
import packageJSON from "../../../package.json";

const { scripts: _s, "lint-staged": _l, ...newPackageJSON } = packageJSON;

const move = (src: string) => copyFileSync(src, `.npm/${src}`);

writeFileSync(".npm/package.json", JSON.stringify(newPackageJSON, null, 4), "utf-8");

const moveFiles = [".npmignore", "README.md"];

for (const file of moveFiles) move(file);
