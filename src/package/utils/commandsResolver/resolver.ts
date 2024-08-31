import type { Command } from "seyfert";
import type { CommandFromContent, HandleCommand } from "seyfert/lib/commands/handle";
import type { MakeRequired } from "seyfert/lib/common";
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
    logResult?: boolean;
    afterPrepare?(this: AvailableClients, metadata: ReturnType<typeof getCommandsMetadata>): any;
    mapResult?(result: MakeRequired<CommandFromContent, "parent">): CommandFromContent;
}

export function YunaCommandsResolver({
    client,
    useFallbackSubCommand = false,
    logResult = false,
    afterPrepare,
    mapResult,
}: YunaCommandsResolverConfig & { client: AvailableClients }) {
    const config = {
        useFallbackSubCommand,
        afterPrepare,
        logResult,
    };

    addCommandsEvents(client);
    getCommandsMetadata(client).config = config;

    const baseResolverConfig = { ...config, inMessage: true };

    return function (this: HandleCommand, content: string) {
        const { endPad = 0, command, parent } = baseResolver(client, content, baseResolverConfig) ?? {};

        const argsContent = content.slice(endPad).trimStart();

        const result = {
            parent: parent ?? (command as Command),
            command: command,
            fullCommandName: (command && fullNameOf(command)) ?? "",
            argsContent,
        };

        const mappedResult = mapResult ? { argsContent, ...mapResult(result) } : result;

        if (config.logResult === true) {
            const logResult: Record<string, CommandFromContent> = {
                resolverResult: result,
            };

            if (mappedResult !== result) {
                logResult.mappedResult = mappedResult;
            }

            client.logger.debug("[Yuna.resolver]");
        }

        return mappedResult;
    };
}
