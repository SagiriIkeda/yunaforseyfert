import { BaseCommand, type Client, Command, SubCommand, type UsingClient } from "seyfert";
import { type InstantiableSubCommand, type YunaUsableCommand, keyRoot } from "../../things";
import { baseResolver } from "./base";
import type { YunaCommandsResolverConfig } from "./resolver";

export const commandsConfigKey = Symbol("YunaCommands");
export const LinkType = {
    Group: Symbol(),
};

export interface GroupLink {
    name: string;
    parent: Command;
    aliases?: string[];
    description?: string[];
    useDefaultSubCommand?: InstantiableSubCommand | null;
    type: typeof LinkType.Group;
}

export type UseYunaCommandsClient = UsingClient & {
    [commandsConfigKey]?: {
        links: (SubCommand | GroupLink)[];
        config?: YunaCommandsResolverConfig;
    };
};

export function prepareCommands(client: Client | UsingClient) {
    if (!client.commands?.values.length)
        return client.logger.warn("UseYuna.commands.prepare The commands have not been loaded yet or there are none at all.");

    const self = client as UseYunaCommandsClient;
    const isFirst = !self[commandsConfigKey];

    self[commandsConfigKey] ??= {
        links: [],
    };

    const metadata = self[commandsConfigKey];

    metadata.links = [];

    const defaultReload = BaseCommand.prototype.reload;

    let commandsPrepareCooldown: NodeJS.Timeout | undefined;

    /** @experimental */
    const applyReload = (to: YunaUsableCommand) => {
        if (!isFirst || to.reload !== BaseCommand.prototype.reload) return;
        Object.defineProperty(to, "reload", {
            async value(...args: Parameters<typeof defaultReload>) {
                await defaultReload.apply(this, args);

                clearTimeout(commandsPrepareCooldown);
                commandsPrepareCooldown = setTimeout(() => {
                    commandsPrepareCooldown = undefined;
                    prepareCommands(client);
                }, 1_500);

                return;
            },
        });
    };

    for (const command of client.commands?.values ?? []) {
        if (!(command instanceof Command)) continue;

        if (command.groups)
            for (const [name, group] of Object.entries(command.groups)) {
                if (!group.linkToRootPath) continue;
                metadata.links.push({
                    name,
                    parent: command,
                    aliases: group.aliases,
                    type: LinkType.Group,
                    useDefaultSubCommand: group.useDefaultSubCommand,
                });
            }

        applyReload(command);

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            sub.parent = command;
            if ((sub as YunaUsableCommand)[keyRoot] === true) metadata.links.push(sub);
            applyReload(sub);
        }
    }

    if (!isFirst) return;

    for (const event of ["load", "reloadAll"]) {
        const def = client.commands[event as "load"];

        Object.defineProperty(client.commands, event, {
            async value(...args: Parameters<typeof def>) {
                const val = await def.apply(this, args);
                prepareCommands(client);
                return val;
            },
        });
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
