import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import packageJson from "../../../package.json";

await rm(".npm", { recursive: true, force: true });
await mkdir(".npm").catch(() => null);

const {
    scripts: _s,
    "lint-staged": _l,
    private: _p,
    devDependencies: _dev,
    ...newPackageJsonRaw
} = packageJson as typeof packageJson & { private: boolean };

await writeFile(".npm/package.json", JSON.stringify(newPackageJsonRaw, null, 4), "utf-8");

const moveFiles = [".npmignore", "README.md", "build"];

for (const file of moveFiles) await cp(file, `.npm/${file}`, { recursive: true });
