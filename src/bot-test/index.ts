import { Client } from "seyfert";
import { YunaParser } from "../package/utils/parser/parser";
import { YunaCommandsResolver } from "../package/utils/commandsResolver/resolver";

const client = new Client({
    commands: {

        resolver: YunaCommandsResolver(),
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
        argsParser: YunaParser({
            logResult: true,
            //disableLongTextTagsInLastOption: true,
        }),
    },
});


client.start();
