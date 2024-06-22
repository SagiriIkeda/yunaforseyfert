import type { APIUser } from "discord-api-types/v10";
import {
    Client,
    Command,
    Message,
    type MessageData,
    Options,
    User,
    type UsingClient,
    createBooleanOption,
    createStringOption,
    createUserOption,
} from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { describe, expect, test } from "vitest";
import ChoicesNumberTestCommand, { ChoicesTestCommand } from "../bot-test/commands/choicesTest";
import TestCommand from "../bot-test/commands/test";
import { ParserRecommendedConfig, Yuna } from "../package";
import type { YunaUsable } from "../package/things";
import type { YunaParserCreateOptions } from "../package/utils/parser/createConfig";

const testCommand = new TestCommand();
const choicesCommand = new ChoicesTestCommand();
const choicesNumberCommand = new ChoicesNumberTestCommand();

const client = new Client() as UsingClient;

const testParser = (
    text: string,
    equalTo: Record<string, string>,
    config?: YunaParserCreateOptions,
    command: YunaUsable = testCommand,
    message?: Message,
) => {
    return expect(Yuna.parser(config).call(client.handleCommand, text, command, message)).toEqual(equalTo);
};

const YunaParser = Yuna.parser();
class YunaHandleCommand extends HandleCommand {
    argsParser = YunaParser;
}

client.setServices({ handleCommand: YunaHandleCommand });

describe("assignation to seyfert", () => {
    test("assignation", () => {
        expect(client.handleCommand.argsParser).toBe(YunaParser);
    });
});

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
                syntax: {
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
                syntax: {
                    namedOptions: ["-"],
                },
            },
        ));
    test("configured, ignoring :", () =>
        testParser(
            "--first penguin life second: test --second take this",
            { first: "penguin life second: test", second: "take this" },
            {
                syntax: {
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

@Options({
    first: createStringOption({
        description: "pengu",
        required: true,
    }),
    devmode: createBooleanOption({
        description: "pengu",
        required: true,
    }),
})
class BaseBooleanCommand extends Command {}

const BooleanCommand = new BaseBooleanCommand();

describe("boolean: --option", () => {
    test("--option", () => {
        testParser("hello --devmode", { first: "hello", devmode: "true" }, undefined, BooleanCommand);
        testParser("hello --devmode true", { first: "hello", devmode: "true" }, undefined, BooleanCommand);
        testParser("hello --devmode false", { first: "hello", devmode: "false" }, undefined, BooleanCommand);
    });
});

@Options({
    user: createUserOption({
        description: "pengu",
        required: true,
    }),
    message: createStringOption({
        description: "pengu",
        required: true,
    }),
})
class BaseUserCommand extends Command {}
const UserCommand = new BaseUserCommand();

const NoboAndJusto: APIUser = {
    id: "391283181665517568",
    username: "/**@時間*/ M",
    discriminator: "0",
    global_name: "pengu",
    avatar: "penguin",
};

const Sagiwin: APIUser = {
    id: "388415190225518602",
    username: "sagiwin",
    global_name: "pengu",
    discriminator: "0",
    avatar: "penguin",
};

const message = new Message(client, {
    author: NoboAndJusto,
    referenced_message: {
        author: Sagiwin,
    } as unknown as MessageData,
    embeds: [],
} as unknown as MessageData);

describe("aggregateUserFromMessageReference", () => {
    test("requirePing: false", () => {
        testParser(
            "happy day",
            { user: Sagiwin.id, message: "happy day" },
            { useRepliedUserAsAnOption: { requirePing: false } },
            UserCommand,
            message,
        );
    });
    test("requirePing: true (not PING enabled)", () => {
        testParser(
            "happy day",
            { user: "happy", message: "day" },
            { useRepliedUserAsAnOption: { requirePing: true } },
            UserCommand,
            message,
        );
    });

    test("requirePing: true (PING enabled)", () => {
        message.mentions.users.push(new User(client, Sagiwin));
        testParser(
            "happy day",
            { user: Sagiwin.id, message: "happy day" },
            { useRepliedUserAsAnOption: { requirePing: true } },
            UserCommand,
            message,
        );
    });
    test("without reply", () => {
        testParser(
            `${Sagiwin.id} happy day`,
            { user: Sagiwin.id, message: "happy day" },
            { useRepliedUserAsAnOption: { requirePing: true } },
            UserCommand,
            new Message(client, { author: NoboAndJusto, embeds: [] } as unknown as MessageData),
        );
    });
});
