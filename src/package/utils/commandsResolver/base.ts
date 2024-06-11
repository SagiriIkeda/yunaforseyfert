import { type Command, SubCommand, type UsingClient, type ContextMenuCommand } from "seyfert";
import { ApplicationCommandType } from "discord-api-types/v10";
import { keySubCommands, type YunaUsableCommand } from "../../things";
import type { YunaCommandsResolverConfig } from "./resolver";
import { type UseYunaCommandsClient, preparedKey } from "./prepare";

type UsableCommand = Command | SubCommand;

interface YunaCommandsResolverData {
    parent?: Command
    command: UsableCommand,
    endPad?: number
}

export function baseResolver(client: UsingClient, query: string | string[], forMessage: YunaCommandsResolverConfig): YunaCommandsResolverData | undefined;
export function baseResolver(client: UsingClient, query: string | string[], forMessage?: undefined): UsableCommand | undefined;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 🐧
export function baseResolver(client: UsingClient, query: string | string[], forMessage?: YunaCommandsResolverConfig): UsableCommand | YunaCommandsResolverData | undefined {

    const metadata = (client as UseYunaCommandsClient)[preparedKey];
    if (!metadata) return;

    const matchs = typeof query === "string" ? Array.from(query.matchAll(/[^\s\x7F\n]+/g)).slice(0, 3) : undefined;

    const queryArray = (matchs?.map(([val]) => val.toLowerCase()) ?? (Array.isArray(query) && query.slice(0, 3).map(t => t.toLowerCase()))) || []

    if (!(queryArray.length && client.commands)) return;

    const [parent, group, sub] = queryArray;

    const searchFn = (command: Command | ContextMenuCommand | SubCommand) =>
        command.type === ApplicationCommandType.ChatInput && (command.name === parent || "aliases" in command && command.aliases?.includes(parent));

    const parentCommand = client.commands.values.find(searchFn) as YunaUsableCommand | undefined;
    const inRoot = parentCommand ? undefined : metadata.links.find(searchFn);

    if (!(parentCommand || inRoot)) return undefined;


    const parentSubCommandsMetadata = parentCommand?.[keySubCommands];
    const useCommand = (parentCommand ?? inRoot!);

    const getPadEnd = (id: number) => {
        return matchs && matchs[id]?.index + matchs[id]?.[0]?.length;
    }

    if (!parentCommand || inRoot || parentSubCommandsMetadata?.has !== true) return forMessage ? {
        parent: inRoot?.parent,
        command: useCommand,
        endPad: getPadEnd(0)
    } : useCommand;

    const groupKeyName = sub && group;

    let padIdx = 0;

    const groupName = "groups" in parentCommand ? (parentCommand.groupsAliases?.[groupKeyName] || ((groupKeyName in (parentCommand.groups ?? {})) ? groupKeyName : undefined)) : undefined;

    groupName && padIdx++;

    const subName = sub ?? group;

    const subCommand = ("options" in parentCommand && parentCommand.options?.find(
        (o) => o instanceof SubCommand && o.group === groupName && (o.name === subName || o.aliases?.includes(subName))
    )) as SubCommand | undefined || undefined;

    subCommand && padIdx++;

    let virtualSubCommand: SubCommand | undefined;

    if (forMessage?.useDefaultSubCommand === true) {
        const defaultInstance = parentSubCommandsMetadata.default;

        virtualSubCommand = ((defaultInstance && parentCommand.options?.find(o => (o as SubCommand & { __proto__: any }).__proto__.constructor === defaultInstance)) ?? parentCommand.options?.[0]) as SubCommand | undefined;
    }

    const useSubCommand = subCommand ?? virtualSubCommand;

    return forMessage && useSubCommand ? {
        parent: parentCommand as Command,
        command: useSubCommand,
        endPad: getPadEnd(padIdx)
    } : useSubCommand;

}