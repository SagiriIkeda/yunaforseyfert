import type { HandleCommand } from "seyfert/lib/commands/handle";
import { fullNameOf } from "../../lib/utils";
import type { AvailableClients } from "../../things";
import { baseResolver } from "./base";
import { addCommandsEvents, getCommandsMetadata } from "./prepare";

export interface YunaCommandsResolverConfig {
    /**
     * It will allow that in case an unrecognized subcommand is used,
     * use a specified default one or the first one you have.
     */
    useFallbackSubCommand?: boolean;

    afterPrepare?(this: AvailableClients, metadata: ReturnType<typeof getCommandsMetadata>): any;
}

export function YunaCommandsResolver({
    client,
    useFallbackSubCommand = true,
    afterPrepare,
}: YunaCommandsResolverConfig & { client: AvailableClients }) {
    const config = {
        useFallbackSubCommand,
        afterPrepare,
    };

    addCommandsEvents(client);
    getCommandsMetadata(client).config = config;

    const baseResolverConfig = { ...config, inMessage: true };

    return function (this: HandleCommand, content: string) {
        const { endPad = 0, command, parent } = baseResolver(client, content, baseResolverConfig) ?? {};

        const argsContent = content.slice(endPad);

        return {
            parent: parent,
            command: command,
            fullCommandName: (command && fullNameOf(command)) ?? "",
            argsContent,
        };
    };
}
