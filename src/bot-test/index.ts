import { Client, type Message } from "seyfert";
import { HandleCommand, type HandleResolver } from "seyfert/lib/commands/handle";
import { YunaCommandsResolver } from "../package/utils/commandsResolver/resolver";
import { YunaParser } from "../package/utils/parser/parser";

const client = new Client({ commands: { defaultPrefix: ["yuna", "y"] } });

class YunaCommandHandle<HR extends HandleResolver = HandleResolver> extends HandleCommand<HR> {
    getPrefix(message: Message) {
        return ["yuna", "y", `<@${message.client.botId}>`];
    }

    resolveCommandFromContent = YunaCommandsResolver();

    argsParser = YunaParser({
        logResult: true,
        //disableLongTextTagsInLastOption: true,
    });
}

client.setServices({
    handleCommand: YunaCommandHandle,
});

client.start();
