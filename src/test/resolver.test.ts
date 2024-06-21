import { Client, type SubCommand, type UsingClient } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { describe, expect, test as vtest } from "vitest";
import CreateCommand from "../bot-test/commands/account/create";
import OtherCommand from "../bot-test/commands/account/other";
import TestCommand from "../bot-test/commands/test";
import { Yuna } from "../package";
import type { Instantiable, YunaUsableCommand } from "../package/things";

const client = new Client() as UsingClient;

const YunaResolver = Yuna.resolver({
    client,
    afterPrepare() {
        console.log(Yuna.commands.getMetadata(client));
        console.log("ready to use");
    },
});
class YunaHandleCommand extends HandleCommand {
    resolveCommandFromContent = YunaResolver;
}
client.setServices({ handleCommand: YunaHandleCommand });

const loading = client.loadCommands(`${process.cwd()}/dist/bot-test/commands`).then(() => console.log("loaded"));
const testResolver = (query: string) => {
    const resolved = Yuna.resolver({ client }).call(client.handleCommand, query);

    return {
        isCommand(command: Instantiable<YunaUsableCommand> | undefined) {
            const cmd = command && (new command() as SubCommand | undefined);
            const res = resolved.command as SubCommand | undefined;

            expect(res?.name === cmd?.name && res?.group === cmd?.group).toBe(true);
            return () => {};
        },
        isName(name: string) {
            return expect(resolved.fullCommandName).toBe(name);
        },
        argsContentToBe(args: string) {
            return expect(resolved.argsContent).toBe(args);
        },
    };
};

const test = (message: string, callback: () => void) => {
    vtest(message, async () => {
        await loading;
        callback();
    });
};

describe("assignation to seyfert", () => {
    test("assignation", () => {
        expect(client.handleCommand.resolveCommandFromContent).toBe(YunaResolver);
    });
});

describe("common", () => {
    test("simple", () => {
        testResolver("account pengu create").isCommand(CreateCommand);
        testResolver("account others").isCommand(OtherCommand);
        testResolver("t").isCommand(TestCommand);
    });

    test("shortcuts", () => {
        testResolver("create").isCommand(CreateCommand);
    });
});
