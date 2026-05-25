import { Client } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "../src";

const client = new Client({
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
    },
});

class YunaCommandHandle extends HandleCommand {
    override resolveCommandFromContent = Yuna.resolver({
        client: this.client,
        afterPrepare: () => {
            this.client.logger.debug("prepared commands");
        },
        // logResult: true,
    });

    override argsParser = Yuna.parser({
        logResult: true,
        useRepliedUserAsAnOption: {
            requirePing: false,
        },
        // useNamedWithSingleValue: true,
        // useCodeBlockLangAsAnOption: true,
    });
}

client.setServices({
    handleCommand: YunaCommandHandle,
});

client.start();
