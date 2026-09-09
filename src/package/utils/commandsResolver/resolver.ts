import type { Command, SubCommand } from "seyfert";
import type { BaseClient } from "seyfert/lib/client/base";
import type { CommandFromContent, HandleCommand } from "seyfert/lib/commands/handle";
import type { Awaitable, MakeRequired } from "seyfert/lib/common";
import { fullNameOf } from "../../lib/utils";
import { baseResolver } from "./base";
import { type GroupLink, type YunaCommandsMetadata, addCommandsEvents, getCommandsMetadata } from "./prepare";

export interface SearchPlugin {
    findShortcut?(shortcutName: string, shortcuts?: (SubCommand | GroupLink)[]): (SubCommand | GroupLink) | undefined;
    findCommand?(commandName: string): Command | undefined;
    findGroupName?(possiblyGroup: string, command: Command): string | undefined;
    findSubCommand?(query: string, command: Command, groupName?: string): SubCommand | undefined;
}

export interface YunaCommandsResolverConfig<ClientType extends BaseClient = BaseClient> {
    /**
     * It will allow that in case an unrecognized subcommand is used,
     * use a specified default one or the first one you have.
     */
    useFallbackSubCommand?: boolean;
    logResult?: boolean;
    afterPrepare?(this: ClientType, metadata: YunaCommandsMetadata<ClientType>): any;

    whilePreparing?(
        this: ClientType,
        metadata: YunaCommandsMetadata<ClientType>,
    ): Awaitable<{
        onCommand?(command: Command): any;
        onSubCommand?(subCommand: SubCommand): any;
    } | null>;

    mapResult?(result: MakeRequired<CommandFromContent, "parent">): CommandFromContent;
    /** @experimental
     * extend search functions if not found
     */
    extendSearch?(): SearchPlugin;
}

export function YunaCommandsResolver<ClientType extends BaseClient>({
    client,
    useFallbackSubCommand = false,
    logResult = false,
    afterPrepare,
    whilePreparing,
    mapResult,
    extendSearch,
}: YunaCommandsResolverConfig<ClientType> & { client: ClientType }) {
    const config = {
        useFallbackSubCommand,
        afterPrepare,
        whilePreparing,
        logResult,
    };

    addCommandsEvents(client);
    getCommandsMetadata(client).config = config;

    const baseResolverConfig = { ...config, inMessage: true };

    const plugin = extendSearch?.();

    return function YunaCommandsResolverInstance(this: HandleCommand, content: string) {
        const { endPad = 0, command, parent } = baseResolver(client, content, baseResolverConfig, plugin) ?? {};

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

            client.logger.debug("[Yuna.resolver]", logResult);
        }

        return mappedResult;
    };
}
