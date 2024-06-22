import { ApplicationCommandOptionType, ApplicationCommandType } from "discord-api-types/v10";
import type { Command, SubCommand } from "seyfert";
import { IgnoreCommand } from "seyfert";
import { type AvailableClients, type YunaUsable, fallbackSubNameKey, keySubCommands } from "../../things";
import { type GroupLink, ShortcutType, type UseYunaCommandsClient, type YunaGroup, commandsConfigKey } from "./prepare";
import type { YunaCommandsResolverConfig } from "./resolver";

type UsableCommand = Command | SubCommand;

interface YunaCommandsResolverData {
    parent?: Command;
    command: UsableCommand;
    endPad?: number;
}

type Config = YunaCommandsResolverConfig & { inMessage?: boolean };

export function baseResolver(client: AvailableClients, query: string | string[], config: Config): YunaCommandsResolverData | undefined;
export function baseResolver(client: AvailableClients, query: string | string[], config?: undefined): UsableCommand | undefined;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 🐧
export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config?: Config,
): UsableCommand | YunaCommandsResolverData | undefined {
    const metadata = (client as UseYunaCommandsClient)[commandsConfigKey];
    const matchs = typeof query === "string" ? Array.from(query.matchAll(/[^\s\x7F\n]+/g)).slice(0, 3) : undefined;

    const queryArray =
        (matchs?.map(([val]) => val.toLowerCase()) ?? (Array.isArray(query) && query.slice(0, 3).map((t) => t.toLowerCase()))) || [];

    if (!(queryArray.length && client.commands)) return;

    let [parent, group, sub] = queryArray;

    const searchFn = (command: Command | SubCommand | GroupLink) => command.name === parent || command.aliases?.includes(parent);

    let parentCommand = (
        metadata?.commands
            ? metadata.commands.find(searchFn)
            : client.commands.values.find((command) => command.type === ApplicationCommandType.ChatInput && searchFn(command))
    ) as Exclude<YunaUsable, SubCommand> | undefined;

    const shortcut = parentCommand ? undefined : metadata?.shortcuts.find(searchFn);
    const isGroupShortcut = shortcut?.type === ShortcutType.Group;

    if (!(parentCommand || shortcut)) return;

    const getPadEnd = (id: number) => {
        return matchs && matchs[id]?.index + matchs[id]?.[0]?.length;
    };

    const parentSubCommandsMetadata = parentCommand?.[keySubCommands];

    const availableInMessage = (command: YunaUsable) => (config?.inMessage === true ? command.ignore !== IgnoreCommand.Message : true);

    if (isGroupShortcut) {
        parentCommand = shortcut.parent;
        [parent, group, sub] = [shortcut.parent.name, parent, group];
    } else if (shortcut || (parentCommand && parentSubCommandsMetadata === null)) {
        const Shortcut = shortcut as SubCommand | undefined;
        const useCommand = Shortcut || parentCommand;

        if (parentCommand && !availableInMessage(parentCommand)) return;
        if (Shortcut && !availableInMessage(Shortcut)) return;

        return config
            ? useCommand && {
                  parent: (useCommand as SubCommand).parent,
                  command: useCommand,
                  endPad: getPadEnd(0),
              }
            : useCommand;
    }

    if (!(parentCommand && availableInMessage(parentCommand))) return;

    let padIdx = 0;

    const groupName = parentCommand.groupsAliases?.[group] || (group in (parentCommand.groups ?? {}) ? group : undefined);

    if (!isGroupShortcut && groupName) padIdx++;

    const groupData = groupName !== undefined ? (parentCommand as Command).groups?.[groupName] : undefined;

    const subName = groupName ? sub : group;

    const fallbackSubCommandName = groupData ? (groupData as YunaGroup)[fallbackSubNameKey] : parentSubCommandsMetadata?.fallbackName;

    let virtualSubCommand: SubCommand | undefined;
    let firstGroupSubCommand: SubCommand | undefined;

    const subCommand = parentCommand.options?.find((s) => {
        const sub = s as SubCommand;

        if (!(sub.type === ApplicationCommandOptionType.Subcommand && sub.group === groupName)) return false;

        firstGroupSubCommand ??= sub;

        if (sub.name === fallbackSubCommandName) {
            virtualSubCommand = sub;
        }

        return sub.name === subName || sub.aliases?.includes(subName);
    }) as SubCommand | undefined;

    if (!(subCommand || virtualSubCommand)) {
        const fallbackData = groupData ? groupData.fallbackSubCommand : parentSubCommandsMetadata?.fallback;
        const allowed = fallbackData !== null && fallbackData !== undefined;
        const global = config?.useFallbackSubCommand === true && fallbackData === undefined;

        if (global || allowed) {
            virtualSubCommand = firstGroupSubCommand;
        }
    }

    subCommand && padIdx++;

    const useSubCommand = subCommand ?? virtualSubCommand;

    const resultCommand = useSubCommand ?? parentCommand;

    if (useSubCommand && !availableInMessage(useSubCommand)) return;

    return config && resultCommand
        ? {
              parent: parentCommand,
              command: resultCommand,
              endPad: getPadEnd(padIdx),
          }
        : resultCommand;
}
