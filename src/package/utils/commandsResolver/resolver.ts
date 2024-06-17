import type { Command, Message, UsingClient } from "seyfert";
import type { HandleCommand } from "seyfert/lib/commands/handle";
import { fullNameOf, once } from "../../lib/utils";
import { baseResolver } from "./base";
import { type UseYunaCommandsClient, commandsConfigKey, prepareCommands } from "./prepare";

export interface YunaCommandsResolverConfig {
    /**
     * It will allow that in case an unrecognized subcommand is used,
     * use a specified default one or the first one you have.
     */
    useFallbackSubCommand?: boolean;
}

export function YunaCommandsResolver({ useFallbackSubCommand = true }: YunaCommandsResolverConfig = {}) {
    const config = {
        useFallbackSubCommand,
    };

    const init = once((client: UsingClient) => {
        prepareCommands(client);
        const metadata = (client as UseYunaCommandsClient)[commandsConfigKey];
        if (metadata) metadata.config = config;
    });

    return function (this: HandleCommand, content: string, prefix: string, message: Message) {
        const { client } = this;

        init(client);

        message.prefix = prefix;

        const { endPad = 0, command, parent } = baseResolver(client, content, config) ?? {};

        const argsContent = content.slice(endPad);

        return {
            parent: parent,
            command: command as Command,
            fullCommandName: (command && fullNameOf(command)) ?? "",
            argsContent,
        };
    };
}
