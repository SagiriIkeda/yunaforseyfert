import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

const ReadmeFileContent = await readFile("./README.md", "utf-8");

const branch = "main";

const githubUrl = `https://github.com/SagiriIkeda/yunaforseyfert/blob/${branch}/`;

const newReadmeFileContent = ReadmeFileContent.replace(/(?<=\[.*?\]\()\.\/(?=.*?\))/g, `${githubUrl}`);

await writeFile(".npm/README.md", newReadmeFileContent, "utf-8");

const moveFiles = [".npmignore"];

const move = (src: string) => copyFile(src, `.npm/${src}`);
for (const file of moveFiles) move(file);

await cp("build", ".npm/build", { recursive: true });
