import { Client, type Message } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "../package";

const client = new Client({ commands: { defaultPrefix: ["yuna", "y"] } });

class YunaCommandHandle extends HandleCommand {
    getPrefix(message: Message) {
        return ["yuna", "y", `<@${message.client.botId}>`];
    }

    resolveCommandFromContent = Yuna.resolver();

    argsParser = Yuna.parser({
        logResult: true,
        useRepliedUserAsAnOption: {
            requirePing: false,
        },
    });
}

client.setServices({
    handleCommand: YunaCommandHandle,
});

client.start();
