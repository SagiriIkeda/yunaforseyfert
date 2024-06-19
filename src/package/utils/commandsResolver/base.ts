import { ApplicationCommandOptionType, ApplicationCommandType } from "discord-api-types/v10";
import type { Command, ContextMenuCommand, SubCommand } from "seyfert";
import { type AvailableClients, type YunaUsableCommand, keySubCommands } from "../../things";
import { type GroupLink, ShortcutType, type UseYunaCommandsClient, commandsConfigKey } from "./prepare";
import type { YunaCommandsResolverConfig } from "./resolver";

type UsableCommand = Command | SubCommand;

interface YunaCommandsResolverData {
    parent?: Command;
    command: UsableCommand;
    endPad?: number;
}

export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config: YunaCommandsResolverConfig,
): YunaCommandsResolverData | undefined;
export function baseResolver(client: AvailableClients, query: string | string[], config?: undefined): UsableCommand | undefined;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 🐧
export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config?: YunaCommandsResolverConfig,
): UsableCommand | YunaCommandsResolverData | undefined {
    const metadata = (client as UseYunaCommandsClient)[commandsConfigKey];
    const matchs = typeof query === "string" ? Array.from(query.matchAll(/[^\s\x7F\n]+/g)).slice(0, 3) : undefined;

    const queryArray =
        (matchs?.map(([val]) => val.toLowerCase()) ?? (Array.isArray(query) && query.slice(0, 3).map((t) => t.toLowerCase()))) || [];

    if (!(queryArray.length && client.commands)) return;

    let [parent, group, sub] = queryArray;

    const searchFn = (command: Command | ContextMenuCommand | SubCommand | GroupLink) =>
        command.name === parent || (command as Command).aliases?.includes(parent);

    let parentCommand = (
        metadata?.commands
            ? metadata.commands.find(searchFn)
            : client.commands.values.find((command) => command.type === ApplicationCommandType.ChatInput && searchFn(command))
    ) as Exclude<YunaUsableCommand, SubCommand> | undefined;

    const shortcut = parentCommand ? undefined : metadata?.shortcuts.find(searchFn);
    const isGroupShortcut = shortcut?.type === ShortcutType.Group;

    if (!(parentCommand || shortcut)) return;

    const getPadEnd = (id: number) => {
        return matchs && matchs[id]?.index + matchs[id]?.[0]?.length;
    };

    const parentMetadata = parentCommand?.[keySubCommands];

    if (isGroupShortcut) {
        parentCommand = shortcut.parent;
        [parent, group, sub] = [shortcut.parent.name, parent, group];
    } else if (shortcut || (parentCommand && parentMetadata === null)) {
        const useCommand = (shortcut as SubCommand | undefined) || parentCommand;

        return (
            useCommand && {
                parent: (useCommand as SubCommand).parent,
                command: useCommand,
                endPad: getPadEnd(0),
            }
        );
    }

    if (!parentCommand) return;

    let padIdx = 0;

    const groupName = parentCommand.groupsAliases?.[group] || (group in (parentCommand.groups ?? {}) ? group : undefined);

    if (!isGroupShortcut && groupName) padIdx++;

    const groupData = groupName !== undefined ? (parentCommand as Command).groups?.[groupName] : undefined;

    const subName = groupName ? sub : group;

    const virtualInstance = groupData ? groupData.fallbackSubCommand : parentMetadata?.default;

    let virtualSubCommand: SubCommand | undefined;
    let firstGroupSubCommand: SubCommand | undefined;

    const subCommand = parentCommand.options?.find((s) => {
        const sub = s as SubCommand;

        if (!(sub.type === ApplicationCommandOptionType.Subcommand && sub.group === groupName)) return false;

        firstGroupSubCommand ??= sub;

        if (virtualInstance && sub.constructor === virtualInstance) {
            virtualSubCommand = sub;
        }

        return sub.name === subName || sub.aliases?.includes(subName);
    }) as SubCommand | undefined;

    if (
        (!virtualSubCommand && (groupData?.fallbackSubCommand !== null || parentMetadata?.default !== null)) ||
        config?.useFallbackSubCommand === true
    ) {
        virtualSubCommand ??= firstGroupSubCommand;
    }

    subCommand && padIdx++;

    const useSubCommand = subCommand ?? virtualSubCommand;

    const resultCommand = useSubCommand ?? parentCommand;

    return config && resultCommand
        ? {
              parent: parentCommand,
              command: resultCommand,
              endPad: getPadEnd(padIdx),
          }
        : resultCommand;
}
