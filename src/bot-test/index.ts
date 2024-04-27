import { Client } from "seyfert";
import { YunaParser } from "../package/utils/parser/parser";

const client = new Client({
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
        argsParser: YunaParser({
            logResult: true,
            // enabled: {
            //     longTextTags: ["'", "`"],
            //     namedOptions: ["-", "--"],
            // },
            // useUniqueNamedSyntaxAtSameTime: true,
            disableLongTextTagsInLastOption: true,
            // breakSearchOnConsumeAllOptions: true
        }),
    },
});

client.start();