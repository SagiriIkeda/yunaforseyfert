import { Client } from "seyfert";
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "../package";

const client = new Client({
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
    },
});

class YunaCommandHandle extends HandleCommand {
    resolveCommandFromContent = Yuna.resolver({
        client: this.client,
        afterPrepare: () => {
            this.client.logger.debug("prepared commands");
        },
    });

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
