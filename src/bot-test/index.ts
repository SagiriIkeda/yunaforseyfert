import { Client, type ParseClient, definePlugins } from "seyfert";
import { Yuna } from "../package/index";

const client = new Client({
    plugins: definePlugins(
        Yuna.plugin({
            parser: {
                logResult: true,
                useRepliedUserAsAnOption: {
                    requirePing: false,
                },
                // useNamedWithSingleValue: true,
                // useCodeBlockLangAsAnOption: true,
            },
        }),
    ),
    commands: {
        prefix(message) {
            return ["yuna", "y", `<@${message.client.botId}>`];
        },
    },
});

client.start();

declare module "seyfert" {
    interface SeyfertRegistry {
        client: ParseClient<Client<true>>;
    }
}
