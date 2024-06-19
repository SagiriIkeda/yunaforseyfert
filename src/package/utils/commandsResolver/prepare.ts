import { Command, SubCommand, type UsingClient } from "seyfert";
import { type AvailableClients, type Instantiable, type YunaUsableCommand, keyShortcut, keySubCommands } from "../../things";
import { baseResolver } from "./base";
import type { YunaCommandsResolverConfig } from "./resolver";

export const commandsConfigKey = Symbol("YunaCommands");

export type UseYunaCommandsClient = UsingClient & {
    [commandsConfigKey]?: {
        shortcuts: (SubCommand | GroupLink)[];
        commands: Command[];
        config?: YunaCommandsResolverConfig;
    };
};

export const ShortcutType = {
    Group: Symbol(),
};

export interface GroupLink {
    name: string;
    parent: Command;
    aliases?: string[];
    description?: string[];
    fallbackSubCommand?: Instantiable<SubCommand> | null;
    type: typeof ShortcutType.Group;
}

const addEvents = (client: AvailableClients) => {
    for (const event of ["load", "reloadAll"]) {
        const def = client.commands?.[event as "load"];
        if (!def) continue;

        Object.defineProperty(client.commands, event, {
            async value(...args: Parameters<typeof def>) {
                const val = await def.apply(this, args);
                prepareCommands(false, client);
                return val;
            },
        });
    }
};

export function prepareCommands(showWarn: boolean, client: AvailableClients) {
    const self = client as UseYunaCommandsClient;
    const isFirst = !self[commandsConfigKey];

    self[commandsConfigKey] ??= {
        shortcuts: [],
        commands: [],
    };

    const metadata = self[commandsConfigKey];

    metadata.shortcuts = [];
    metadata.commands = [];

    if (isFirst) addEvents(client);

    if (!client.commands?.values.length) {
        showWarn && client.logger.warn("[Yuna.commands.prepare] The commands have not been loaded yet or there are none at all.");
        return;
    }

    for (const command of client.commands?.values ?? []) {
        if (!(command instanceof Command)) continue;
        metadata.commands.push(command);

        if (command.groups)
            for (const [name, group] of Object.entries(command.groups)) {
                if (!group.shortcut) continue;
                metadata.shortcuts.push({
                    name,
                    parent: command,
                    aliases: group.aliases,
                    type: ShortcutType.Group,
                    fallbackSubCommand: group.fallbackSubCommand,
                });
            }

        let hasSubCommands = false;

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            hasSubCommands = true;
            sub.parent = command;
            if ((sub as YunaUsableCommand)[keyShortcut] === true) metadata.shortcuts.push(sub);
        }

        if (!hasSubCommands) (command as YunaUsableCommand)[keySubCommands] = null;
    }
}

export const resolve = (
    client: UseYunaCommandsClient,
    query: string | string[],
    config?: YunaCommandsResolverConfig,
): Command | SubCommand | undefined => {
    const gConfig = (client as UseYunaCommandsClient)[commandsConfigKey]?.config ?? {};
    return baseResolver(client, query, { ...gConfig, ...config })?.command;
};
