import type { Command } from "seyfert";
import type { HandleCommand } from "seyfert/lib/commands/handle";
import { fullNameOf } from "../../lib/utils";
import type { AvailableClients } from "../../things";
import { baseResolver } from "./base";
import { type UseYunaCommandsClient, commandsConfigKey, prepareCommands } from "./prepare";

export interface YunaCommandsResolverConfig {
    /**
     * It will allow that in case an unrecognized subcommand is used,
     * use a specified default one or the first one you have.
     */
    useFallbackSubCommand?: boolean;
}

export function YunaCommandsResolver({ client, useFallbackSubCommand = true }: YunaCommandsResolverConfig & { client: AvailableClients }) {
    const config = {
        useFallbackSubCommand,
    };

    prepareCommands(false, client);

    const metadata = (client as UseYunaCommandsClient)[commandsConfigKey];
    if (metadata) metadata.config = config;

    return function (this: HandleCommand, content: string) {
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
