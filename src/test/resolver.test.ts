import { Client, type UsingClient } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { describe, expect, test as vtest } from "vitest";
import CreateCommand from "../bot-test/commands/account/create";
import { Yuna } from "../package";
import type { Instantiable, YunaUsableCommand } from "../package/things";

const client = new Client() as UsingClient;

// const testParser = (
//     text: string,
//     equalTo: Record<string, string>,
//     config?: YunaParserCreateOptions,
//     command: YunaUsableCommand = testCommand,
//     message?: Message,
// ) => {
//     return expect(Yuna.parser(config).call(client.handleCommand, text, command, message)).toEqual(equalTo);
// };

const YunaResolver = Yuna.resolver({
    client,
    afterPrepare() {
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
        command(command: Instantiable<YunaUsableCommand>) {
            // console.log(command.prototype)
            // console.log(Object.getPrototypeOf(resolved.command.prototype))
            // const isInstance = Object.getPrototypeOf(resolved.command) === Object.getPrototypeOf(command);

            return expect(resolved.command?.constructor).toBeInstanceOf(command);
        },
        name(name: string) {
            return expect(resolved.fullCommandName).toBe(name);
        },
        argsContent(args: string) {
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
        testResolver("account pengu create").command(CreateCommand);
    });
});
