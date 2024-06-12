import { type Client, Command, SubCommand, type UsingClient } from "seyfert";
import { type YunaUsableCommand, keyRoot, keySubCommands } from "../../things";
import { baseResolver } from "./base";
import type { YunaCommandsResolverConfig } from "./resolver";

export const preparedKey = Symbol("YunaCommands");

export type UseYunaCommandsClient = UsingClient & {
    [preparedKey]?: {
        links: SubCommand[];
    };
};

export function prepareCommands(client: Client | UsingClient) {
    if (!client.commands?.values.length)
        return client.logger.warn("UseYuna.commands.prepare The commands have not been loaded yet or there are none at all.");

    const self = client as UseYunaCommandsClient;
    const isFirst = !self[preparedKey];

    self[preparedKey] ??= {
        links: [],
    };

    const metadata = self[preparedKey];

    metadata.links = [];

    for (const command of client.commands?.values ?? []) {
        if (!(command instanceof Command)) continue;

        const subCommandsMetadata = (command as YunaUsableCommand)[keySubCommands] ?? {};

        if (command.options?.[0] instanceof SubCommand)
            (command as YunaUsableCommand)[keySubCommands] = { ...subCommandsMetadata, has: true };
        else {
            delete (command as YunaUsableCommand)[keySubCommands];
        }

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            sub.parent = command;
            if ((sub as YunaUsableCommand)[keyRoot] === true) metadata.links.push(sub);
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

export const createResolver = (client: UseYunaCommandsClient, gConfig: YunaCommandsResolverConfig) => {
    if (!client.commands || client.commands.resolve) return;

    Object.defineProperty(client.commands, "resolve", {
        value(query: string | string[], config: YunaCommandsResolverConfig) {
            return baseResolver(client, query, { ...gConfig, ...config })?.command;
        },
    });
};
