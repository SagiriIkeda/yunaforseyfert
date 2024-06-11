import { Client } from "seyfert";
import { YunaParser } from "../package/utils/parser/parser";
import YunaCommands from "../package/utils/commandsResolver/init";

const client = new Client({
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
        argsParser: YunaParser({
            logResult: true,
            //disableLongTextTagsInLastOption: true,
        }),
    },
});

YunaCommands.prepare(client)

client.start();
