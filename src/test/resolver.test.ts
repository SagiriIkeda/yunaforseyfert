import { Client, type Command, type UsingClient } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { describe, expect, test } from "vitest";
import AccountCommand from "../bot-test/commands/account/account";
import CreateCommand from "../bot-test/commands/account/create";
import OtherCommand from "../bot-test/commands/account/other";
import EvalCommand from "../bot-test/commands/eval";
import PingCommand from "../bot-test/commands/ping";
import TestCommand from "../bot-test/commands/test";
import { Yuna } from "../package/index";
import { type Instantiable, type YunaUsable, fallbackSubNameKey, keySubCommands } from "../package/things";
import { type YunaGroup, prepareCommands } from "../package/utils/commandsResolver/prepare";
import type { YunaCommandsResolverConfig } from "../package/utils/commandsResolver/resolver";

const client = new Client() as UsingClient;

const YunaResolver = Yuna.resolver({
    client,
});

const testInstance = new TestCommand() as YunaUsable<Command>;
const accountInstance = new AccountCommand() as YunaUsable<Command>;
const evalInstance = new EvalCommand() as YunaUsable<Command>;
const pingInstance = new PingCommand() as YunaUsable<Command>;

client.commands?.values.push(testInstance, accountInstance, evalInstance, pingInstance);

prepareCommands(client);

class YunaHandleCommand extends HandleCommand {
    resolveCommandFromContent = YunaResolver;
}
client.setServices({ handleCommand: YunaHandleCommand });

const testResolver = (query: string, options: Omit<YunaCommandsResolverConfig, "client"> = {}) => {
    const resolved = Yuna.resolver({ client, ...options }).call(client.handleCommand, query);

    return {
        log(...args: any[]) {
            client.logger.debug(resolved, ...args);
        },
        is(command: Instantiable<YunaUsable> | undefined) {
            if (!command) {
                expect(resolved.command).toBeUndefined();
                return { nameIs(_name: string) {} };
            }
            expect(resolved.command).toBeInstanceOf(command);
            return {
                nameIs(name: string) {
                    expect(resolved.fullCommandName).toBe(name);
                },
            };
        },
        argsContentToBe(args: string, command?: Instantiable<YunaUsable>) {
            if (command) return expect(resolved.command instanceof command && resolved.argsContent === args).toBe(true);
            return expect(resolved.argsContent).toBe(args);
        },
    };
};

describe("seyfert", () => {
    test("assignation", () => {
        expect(client.handleCommand.resolveCommandFromContent).toBe(YunaResolver);
    });
});

describe("Case", () => {
    test("lowercase", () => {
        testResolver("account pengu create").is(CreateCommand);
        testResolver("account others").is(OtherCommand);
        testResolver("t").is(TestCommand);
    });
    test("UPPERCASE", () => {
        testResolver("ACCOUNT PENGU CREATE").is(CreateCommand);
        testResolver("ACCOUNT OTHERS").is(OtherCommand);
        testResolver("T").is(TestCommand);
    });

    test("Mix", () => {
        testResolver("acCouNt peNgU cReAte").is(CreateCommand);
        testResolver("ACCOUNT Others").is(OtherCommand);
        testResolver("t").is(TestCommand);
    });
});

describe("shortcuts", () => {
    test("subcommands", () => {
        testResolver("create").is(CreateCommand);
        testResolver("pengu create").is(CreateCommand);
        testResolver("others").is(OtherCommand);
    });
    test("groups", () => {
        testResolver("pengu create").is(CreateCommand);
    });
});

describe("shortcuts", () => {
    test("subcommands", () => {
        testResolver("create").is(CreateCommand);
        testResolver("pengu create").is(CreateCommand);
        testResolver("others").is(OtherCommand);
    });
    test("groups", () => {
        testResolver("pengu create").is(CreateCommand);
    });
    test("fullName", () => {
        testResolver("account pengu create").is(CreateCommand).nameIs("account pengu create");
        testResolver("pengu create").is(CreateCommand).nameIs("account pengu create");
        testResolver("create").is(CreateCommand).nameIs("account pengu create");
    });
});

describe("argsContent", () => {
    test("normal", () => {
        testResolver("account penguin world").argsContentToBe("penguin world");
    });
    test("group", () => {
        testResolver("account pengu penguin world").argsContentToBe("penguin world");
    });
    test("subcommand", () => {
        testResolver("account pengu create penguin world").argsContentToBe("penguin world");
    });
    test("shortcuts", () => {
        testResolver("create penguin world").argsContentToBe("penguin world");
        testResolver("pengu create penguin world").argsContentToBe("penguin world");
    });
    test("fallback", () => {
        testResolver("account penguin world").argsContentToBe("penguin world", OtherCommand);
        testResolver("account pengu penguin world").argsContentToBe("penguin world", CreateCommand);
        testResolver("pengu penguin world").argsContentToBe("penguin world", CreateCommand);
    });
});

describe("fallbackSubCommand", () => {
    test("in-command", () => {
        testResolver("account").is(OtherCommand);
    });
    test("in-groups", () => {
        testResolver("account pengu").is(CreateCommand);
    });
    test("in-group shortcuts", () => {
        testResolver("pengu").is(CreateCommand);
    });

    const applySetting = (fallback?: null) => {
        const setting = {
            fallback,
            fallbackName: undefined,
        };

        accountInstance[keySubCommands] = setting;
        const group = accountInstance.groups?.pengu as YunaGroup;
        if (!group) return;
        group.fallbackSubCommand = fallback;
        group[fallbackSubNameKey] = undefined;
    };
    test("global useFallbackSubCommand", () => {
        applySetting(undefined);
        testResolver("account", { useFallbackSubCommand: true }).is(OtherCommand);
        testResolver("account pengu", { useFallbackSubCommand: true }).is(CreateCommand);
        testResolver("pengu", { useFallbackSubCommand: true }).is(CreateCommand);
    });

    test("local null", () => {
        applySetting(null);
        testResolver("account", { useFallbackSubCommand: true }).is(AccountCommand);
        testResolver("account pengu", { useFallbackSubCommand: true }).is(AccountCommand);
        testResolver("pengu", { useFallbackSubCommand: true }).is(AccountCommand);
    });
});

describe("aliases", () => {
    test("command", () => {
        testResolver("pinwino").is(AccountCommand);
    });
    test("group", () => {
        testResolver("account pingu").is(AccountCommand);
        testResolver("pinwino pingu").is(AccountCommand).nameIs("account");
    });
    test("subcommand", () => {
        testResolver("pinwino pingu cr").is(CreateCommand).nameIs("account pengu create");
        testResolver("pinwino pengu cr").is(CreateCommand).nameIs("account pengu create");
        testResolver("account pingu cr").is(CreateCommand).nameIs("account pengu create");
        testResolver("account pengu cr").is(CreateCommand).nameIs("account pengu create");
        testResolver("pinwino pingu create").is(CreateCommand).nameIs("account pengu create");
        testResolver("pinwino pengu create").is(CreateCommand).nameIs("account pengu create");
        testResolver("account pingu create").is(CreateCommand).nameIs("account pengu create");
        testResolver("account pengu create").is(CreateCommand).nameIs("account pengu create");
    });
});
