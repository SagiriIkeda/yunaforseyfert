import { describe, expect, test } from "vitest";
import ChoicesNumberTestCommand, { ChoicesTestCommand } from "../bot-test/commands/choicesTest";
import TestCommand from "../bot-test/commands/test";
import { ParserRecommendedConfig, YunaParser } from "../package";
import type { YunaUsableCommand } from "../package/things";
import type { YunaParserCreateOptions } from "../package/utils/parser/createConfig";

const testCommand = new TestCommand();
const choicesCommand = new ChoicesTestCommand();
const choicesNumberCommand = new ChoicesNumberTestCommand();

const testParser = (
    text: string,
    equalTo: Record<string, string>,
    config?: YunaParserCreateOptions,
    command: YunaUsableCommand = testCommand,
) => {
    return expect(YunaParser(config)(text, command)).toEqual(equalTo);
};

describe("words", () => {
    test("one words", () => testParser("penguin world", { first: "penguin", second: "world" }));

    test("last long word", () => {
        testParser("penguin world life", { first: "penguin", second: "world life" });
        testParser("penguin world life --first surprise", { first: "surprise", second: "world life" });
    });
});

describe("long text tags", () => {
    test("common", () => testParser("\"penguin life\" 'beautiful sentence'", { first: "penguin life", second: "beautiful sentence" }));

    test("mixted", () => {
        testParser("penguin 'beautiful sentence'", { first: "penguin", second: "beautiful sentence" });
        testParser("'penguin life'why not", { first: "penguin life", second: "why not" });
        testParser("whyNotA'penguin life'", { first: "whyNotA", second: "penguin life" });
    });

    test("disableLongTextTagsInLastOption", () =>
        testParser(
            "penguin 'beautiful sentence'",
            { first: "penguin", second: "'beautiful sentence'" },
            { disableLongTextTagsInLastOption: true },
        ));

    test("configured", () =>
        testParser(
            "\"penguin\" 'beautiful sentence'",
            { first: '"penguin"', second: "beautiful sentence" },
            {
                enabled: {
                    longTextTags: ["`", "'"],
                },
            },
        ));
});

describe("named options", () => {
    test("common", () => testParser("--first penguin life -second test first: take this", { first: "take this", second: "test" }));

    test("configured", () =>
        testParser(
            "-first test --second take this",
            { first: "test -", second: "take this" },
            {
                enabled: {
                    namedOptions: ["-"],
                },
            },
        ));
    test("configured, ignoring :", () =>
        testParser(
            "--first penguin life second: test --second take this",
            { first: "penguin life second: test", second: "take this" },
            {
                enabled: {
                    namedOptions: ["-", "--"],
                },
            },
        ));

    test("useUniqueNamedSyntaxAtSameTime", () =>
        testParser(
            "--first penguin life -second test first: take this",
            { first: "penguin life", second: "test first: take this" },
            {
                useUniqueNamedSyntaxAtSameTime: true,
            },
        ));
});

describe("escaping", () => {
    test("long text tags", () => testParser('penguin \\"world" penguin', { first: "penguin", second: '"world" penguin' }));

    test("backescapes", () => {
        testParser("penguin \\\\", { first: "penguin", second: "\\" });
        testParser("penguin \\\\text", { first: "penguin", second: "\\text" });
    });

    test("named options", () => {
        testParser("penguin \\-second test", { first: "penguin", second: "-second test" });
        testParser("penguin -second test \\-first de hecho", { first: "penguin", second: "test -first de hecho" });
        testParser("penguin -second test \\\\-first de hecho", { first: "de hecho", second: "test \\" });
        testParser("penguin -second test \\\\\\--first de hecho", { first: "penguin", second: "test \\--first de hecho" });
        testParser("penguin -second test \\\\\\--first de hecho", { first: "penguin", second: "test \\--first de hecho" });
        testParser("penguin -second test first\\: de hecho", { first: "penguin", second: "test first: de hecho" });
        testParser("penguin second\\: pengu", { first: "penguin", second: "second: pengu" });
    });
});

describe("choices", () => {
    test("common", () => {
        // choices resolver need to return choice name always.

        testParser("ganyu", { choice: "Ganyu" }, {}, choicesCommand);
        testParser("gAnYU", { choice: "Ganyu" }, {}, choicesCommand);
        testParser("gAnYU Supremacy", { choice: "Ganyu" }, {}, choicesCommand);

        testParser("arlecchino", { choice: "Arlecchino" }, {}, choicesNumberCommand);
        testParser("5.5344342", { choice: "Arlecchino" }, {}, choicesNumberCommand);

        testParser(
            "Ganyu Supremacy",
            { choice: "Ganyu Supremacy" },
            { resolveCommandOptionsChoices: { canUseDirectlyValue: false } },
            choicesCommand,
        );
        // not using Yuna's command options choices resolver
        testParser("gAnYU", { choice: "gAnYU" }, { resolveCommandOptionsChoices: null }, choicesCommand);
    });
});
describe("RecommendedConfig", () => {
    test("Eval", () => {
        const code = `const h = 5;
            for (let i = 1; i <= h; i++) {
                console.log(' '.repeat(h - i) + '*'.repeat(2 * i - 1));
            }`;

        testParser('typescript "world" penguin', { first: "typescript", second: '"world" penguin' }, ParserRecommendedConfig.Eval);
        testParser('"typescript" "world" penguin', { first: "typescript", second: '"world" penguin' }, ParserRecommendedConfig.Eval);
        testParser(`"typescript" ${code}`, { first: "typescript", second: code }, ParserRecommendedConfig.Eval);
    });
});
