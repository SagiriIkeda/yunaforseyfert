import { Client } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { describe, expect, test } from "vitest";
import { Yuna } from "../package";

const client = new Client({
    plugins: [
        Yuna.plugin({
            parser: true,
            resolver: true,
        }),
    ],
    // biome-ignore lint/style/useNamingConvention: that is the method name
    getRC() {
        return {
            token: "TOKEN",
            locations: {
                base: "",
            },
        };
    },
});

class TestHandleCommand extends HandleCommand {
    test = true;
    myMethod() {
        return true;
    }
}

client.setServices({
    handleCommand: TestHandleCommand,
});

describe("plugin", async () => {
    try {
        await client.start();
    } catch (e) {
        if (typeof e === "object" && e && "code" in e && e.code !== "API_Unauthorized_0") {
            console.error(e);
        }
    }

    test("parser assignation to seyfert", () => {
        expect(client.handleCommand.argsParser.name).toBe("YunaParserInstance");
    });
    test("resolver assignation to seyfert", () => {
        expect(client.handleCommand.resolveCommandFromContent.name).toBe("YunaCommandsResolverInstance");
    });
    test("custom methods and properties in HandleCommand not overridden by YunaPlugin", () => {
        const handleCommand = client.handleCommand as TestHandleCommand;

        expect(handleCommand.test).toBe(true);
        expect(handleCommand.myMethod()).toBe(true);
    });
});
