import { type Command, SubCommand, type UsingClient } from "seyfert";
import { ApplicationCommandType } from "seyfert/lib/types";
import { type AvailableClients, type Instantiable, Keys, type YunaCommandUsable, type YunaGroupType } from "../../things";
import { baseResolver } from "./base";
import { getFallbackCommandName } from "./decorators";
import type { YunaCommandsResolverConfig } from "./resolver";

export type UseYunaCommandsClient = UsingClient & {
    [Keys.clientResolverMetadata]?: {
        shortcuts: (SubCommand | GroupLink)[];
        commands: Command[];
        config?: YunaCommandsResolverConfig;
    };
};

export const ShortcutType = {
    // biome-ignore lint/style/useNamingConvention: i want
    Group: Symbol(),
};
export type YunaGroup = YunaGroupType & {
    [Keys.resolverFallbackSubCommand]?: string;
};

export interface GroupLink {
    name: string;
    parent: Command;
    aliases?: string[];
    description?: string[];
    fallbackSubCommandName?: string;
    fallbackSubCommand?: Instantiable<SubCommand> | null | string;
    type: typeof ShortcutType.Group;
}

export const addCommandsEvents = (client: UsingClient) => {
    const self = client as AvailableClients & {
        commands: AvailableClients["commands"] & { [Keys.clientResolverAlreadyModdedEvents]?: true };
    };
    if (!client.commands) return client.logger.warn("[Yuna.resolver] Client.commands is undefined");
    if (self.commands[Keys.clientResolverAlreadyModdedEvents] === true) return;

    for (const event of ["load", "reloadAll"]) {
        const def = client.commands[event as "load"];
        if (!def) continue;

        Object.defineProperty(client.commands, event, {
            async value(...args: Parameters<typeof def>) {
                const val = await def.apply(this, args);
                prepareCommands(client);
                return val;
            },
        });
    }

    self.commands[Keys.clientResolverAlreadyModdedEvents] = true;
};

export const getCommandsMetadata = (client: AvailableClients) => {
    const self = client as UseYunaCommandsClient;

    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[Keys.clientResolverMetadata] ??= {
        shortcuts: [],
        commands: [],
    });
};

export async function prepareCommands(client: UsingClient) {
    const metadata = getCommandsMetadata(client);

    metadata.shortcuts = [];
    metadata.commands = [];

    if (!client.commands?.values.length)
        return client.logger.warn("[Yuna.commands.prepare] The commands have not been loaded yet or there are none at all.");

    const whilePreparing = await metadata.config?.whilePreparing?.call(client, metadata);

    const onCommand = whilePreparing?.onCommand;
    const onSubCommand = whilePreparing?.onSubCommand;

    for (const command of client.commands.values) {
        if (command.type !== ApplicationCommandType.ChatInput) continue;

        metadata.commands.push(command);

        if (command.groups)
            for (const [name, group] of Object.entries(command.groups)) {
                if (!group.shortcut) continue;
                const gr = group as YunaGroup;

                const fallbackSubName = group.fallbackSubCommand ? getFallbackCommandName(group.fallbackSubCommand) : undefined;

                gr[Keys.resolverFallbackSubCommand] = fallbackSubName;

                metadata.shortcuts.push({
                    name,
                    parent: command,
                    aliases: group.aliases,
                    type: ShortcutType.Group,
                    fallbackSubCommand: group.fallbackSubCommand,
                    fallbackSubCommandName: fallbackSubName,
                });
            }

        let hasSubCommands = false;

        onCommand?.call(client, command);

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            hasSubCommands = true;
            sub.parent = command;
            if ((sub as YunaCommandUsable)[Keys.resolverIsShortcut] === true) metadata.shortcuts.push(sub);
            onSubCommand?.call(client, sub);
        }

        if (!hasSubCommands) (command as YunaCommandUsable)[Keys.resolverSubCommands] = null;
    }

    metadata.config?.afterPrepare?.call(client, metadata);
}

export const resolve = (
    client: UseYunaCommandsClient,
    query: string | string[],
    config?: YunaCommandsResolverConfig,
): Command | SubCommand | undefined => {
    const gConfig = getCommandsMetadata(client).config ?? {};
    return baseResolver(client, query, { ...gConfig, ...config })?.command;
};
