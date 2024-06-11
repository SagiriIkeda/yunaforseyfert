import { type UsingClient, BaseCommand, Command, SubCommand, type Client } from "seyfert";
import { type YunaUsableCommand, keySubCommands, keyRoot } from "../../things";
import type { YunaCommandsResolverConfig } from "./resolver";
import { baseResolver } from "./base";

export const preparedKey = Symbol("YunaCommands");

export type UseYunaCommandsClient = UsingClient & {
    [preparedKey]?: {
        links: SubCommand[]
    }
}

export function prepare(client: Client | UsingClient) {

    if (!client.commands) return;
    const self = client as UseYunaCommandsClient;
    const isFirst = !self[preparedKey];

    self[preparedKey] ??= {
        links: [],
    }

    const metadata = self[preparedKey];

    const defaultReload = BaseCommand.prototype.reload;

    const applyReload = (to: YunaUsableCommand) => {
        if (!isFirst || to.reload !== BaseCommand.prototype.reload) return;
        Object.defineProperty(to, "reload", {
            async value(...args: Parameters<typeof defaultReload>) {
                const val = await defaultReload.apply(this, args);
                prepare(client);
                return val;
            }
        })
    }

    for (const command of client.commands?.values ?? []) {
        if (!(command instanceof Command)) continue;

        const subCommandsMetadata = (command as YunaUsableCommand)[keySubCommands] ?? {};

        if (command.options?.[0] instanceof SubCommand) (command as YunaUsableCommand)[keySubCommands] = { ...subCommandsMetadata, has: true };
        else { delete (command as YunaUsableCommand)[keySubCommands] }


        applyReload(command);

        for (const sub of command.options ?? []) {
            if (!(sub instanceof SubCommand)) continue;
            applyReload(sub);
            sub.parent = command;
            if ((sub as YunaUsableCommand)[keyRoot] === true) metadata.links.push(sub)
        }


    }

    if (!isFirst) return;

    for (const event of ["load", "reloadAll"]) {

        const def = client.commands[event as "load"];

        Object.defineProperty(client.commands, event, {
            async value(...args: Parameters<typeof def>) {
                const val = await def.apply(this, args);
                prepare(client);
                return val;
            }
        })
    }



}

export const createResolver = (client: UseYunaCommandsClient, gConfig: YunaCommandsResolverConfig) => {
    if (!client.commands || client.commands.resolve) return;

    Object.defineProperty(client.commands, "resolve", {
        value(query: string | string[], config: YunaCommandsResolverConfig) {
            return baseResolver(client, query, { ...gConfig, ...config })?.command
        }
    })
}