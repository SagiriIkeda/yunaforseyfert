import type { Command, SubCommand, UsingClient } from "seyfert";
import type { CommandFromContent, HandleCommand } from "seyfert/lib/commands/handle";
import type { MakeRequired } from "seyfert/lib/common";
import { fullNameOf } from "../../lib/utils";
import { baseResolver } from "./base";
import { addCommandsEvents, getCommandsMetadata } from "./prepare";

export interface YunaCommandsResolverConfig {
    /**
     * It will allow that in case an unrecognized subcommand is used,
     * use a specified default one or the first one you have.
     */
    useFallbackSubCommand?: boolean;
    logResult?: boolean;
    afterPrepare?(this: UsingClient, metadata: ReturnType<typeof getCommandsMetadata>): any;

    whilePreparing?(
        this: UsingClient,
        metadata: ReturnType<typeof getCommandsMetadata>,
    ): {
        onCommand?(command: Command): any;
        onSubCommand?(subCommand: SubCommand): any;
    };

    mapResult?(result: MakeRequired<CommandFromContent, "parent">): CommandFromContent;
}

export function YunaCommandsResolver({
    client,
    useFallbackSubCommand = false,
    logResult = false,
    afterPrepare,
    whilePreparing,
    mapResult,
}: YunaCommandsResolverConfig & { client: UsingClient }) {
    const config = {
        useFallbackSubCommand,
        afterPrepare,
        whilePreparing,
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
