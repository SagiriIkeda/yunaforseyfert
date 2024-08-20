import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import packageJson from "../../../package.json";

await rm(".npm", { recursive: true, force: true });
await mkdir(".npm").catch(() => null);

const {
    scripts: _s,
    "lint-staged": _l,
    private: _p,
    devDependencies: _d,
    ...newPackageJson
} = packageJson as typeof packageJson & { private: boolean };

await writeFile(".npm/package.json", JSON.stringify(newPackageJson, null, 4), "utf-8");

const moveFiles = [".npmignore", "README.md", "build"];

const move = (src: string) => cp(src, `.npm/${src}`, { recursive: true });

for (const file of moveFiles) await move(file);
