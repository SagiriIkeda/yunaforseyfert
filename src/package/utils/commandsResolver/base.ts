import { ApplicationCommandType } from "discord-api-types/v10";
import { type Command, type ContextMenuCommand, SubCommand, type UsingClient } from "seyfert";
import { type YunaUsableCommand, keySubCommands } from "../../things";
import { type GroupLink, LinkType, type UseYunaCommandsClient, commandsConfigKey } from "./prepare";
import type { YunaCommandsResolverConfig } from "./resolver";

type UsableCommand = Command | SubCommand;

interface YunaCommandsResolverData {
    parent?: Command;
    command: UsableCommand;
    endPad?: number;
}

export function baseResolver(
    client: UsingClient,
    query: string | string[],
    config: YunaCommandsResolverConfig,
): YunaCommandsResolverData | undefined;
export function baseResolver(client: UsingClient, query: string | string[], config?: undefined): UsableCommand | undefined;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 🐧
export function baseResolver(
    client: UsingClient,
    query: string | string[],
    config?: YunaCommandsResolverConfig,
): UsableCommand | YunaCommandsResolverData | undefined {
    const metadata = (client as UseYunaCommandsClient)[commandsConfigKey];
    if (!metadata) return;

    const matchs = typeof query === "string" ? Array.from(query.matchAll(/[^\s\x7F\n]+/g)).slice(0, 3) : undefined;

    const queryArray =
        (matchs?.map(([val]) => val.toLowerCase()) ?? (Array.isArray(query) && query.slice(0, 3).map((t) => t.toLowerCase()))) || [];

    if (!(queryArray.length && client.commands)) return;

    let [parent, group, sub] = queryArray;

    const searchFn = (command: Command | ContextMenuCommand | SubCommand | GroupLink) =>
        (command.type === ApplicationCommandType.ChatInput || command.type === LinkType.Group) &&
        (command.name === parent || ("aliases" in command && command.aliases?.includes(parent)));

    let parentCommand = client.commands.values.find(searchFn) as YunaUsableCommand | undefined;

    const inRoot = parentCommand ? undefined : metadata.shortcuts.find(searchFn);
    const isGroupLink = inRoot?.type === LinkType.Group;

    if (!(parentCommand || inRoot)) return undefined;

    if (isGroupLink) {
        parentCommand = inRoot.parent;
        parent = inRoot.parent.name;
        [group, sub] = [parent, group];
    }

    const getPadEnd = (id: number) => {
        return matchs && matchs[id]?.index + matchs[id]?.[0]?.length;
    };

    if (!parentCommand) return;

    const parentMetadata = parentCommand?.[keySubCommands];

    const groupKeyName = sub && group;

    let padIdx = 0;

    const groupName =
        "groups" in parentCommand
            ? parentCommand.groupsAliases?.[groupKeyName] || (groupKeyName in (parentCommand.groups ?? {}) ? groupKeyName : undefined)
            : undefined;

    if (!isGroupLink) groupName && padIdx++;

    const subName = sub ?? group;

    const virtualInstance = isGroupLink ? inRoot.useDefaultSubCommand : parentMetadata?.default;

    let virtualSubCommand: SubCommand | undefined;
    let firstGroupSubCommand: SubCommand | undefined;

    const subCommand =
        (("options" in parentCommand &&
            parentCommand.options?.find((s) => {
                if (!(s instanceof SubCommand && s.group === groupName)) return false;
                firstGroupSubCommand ??= s;

                if (virtualInstance && s.constructor === virtualInstance) {
                    virtualSubCommand = s;
                }

                return s.name === subName || s.aliases?.includes(subName);
            })) as SubCommand | undefined) || undefined;

    if (!virtualSubCommand) {
        if (
            (groupName && isGroupLink && inRoot.useDefaultSubCommand !== null) ||
            parentMetadata?.default !== null ||
            config?.useFallbackSubCommand === true
        )
            virtualSubCommand = firstGroupSubCommand;
    }

    subCommand && padIdx++;

    const useSubCommand = subCommand ?? virtualSubCommand;

    const resultCommand = useSubCommand ?? parentCommand;

    return config && resultCommand
        ? {
              parent: parentCommand as Command,
              command: resultCommand,
              endPad: getPadEnd(padIdx),
          }
        : resultCommand;
}
