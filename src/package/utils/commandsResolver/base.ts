import type { Command, SubCommand } from "seyfert";
import { IgnoreCommand } from "seyfert";
import { ApplicationCommandOptionType, ApplicationCommandType } from "seyfert/lib/types";
import { type AvailableClients, Keys, type YunaCommandUsable, type YunaGroupType } from "../../things";
import { type GroupLink, ShortcutType, type UseYunaCommandsClient, type YunaGroup } from "./prepare";
import type { SearchPlugin, YunaCommandsResolverConfig } from "./resolver";

type UseableCommand = Command | SubCommand;

export interface YunaResolverResult {
    parent?: Command;
    group?: YunaGroupType;
    command: UseableCommand;
    endPad?: number;
}

type Config = YunaCommandsResolverConfig & { inMessage?: boolean };

const getMatches = (query: string) => {
    const result: RegExpMatchArray[] = [];
    const values: string[] = [];

    const matches = query.matchAll(/[^\s\x7F\n]+/g);

    for (let i = 0; i < 3; i++) {
        const match = matches.next().value as RegExpMatchArray | undefined;
        if (!match) continue;
        result.push(match);
        values.push(match[0].toLowerCase());
    }

    return { result, values };
};

export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config: Config,
    plugin?: SearchPlugin,
): YunaResolverResult | undefined;
export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config?: undefined,
    plugin?: SearchPlugin,
): UseableCommand | undefined;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 🐧
export function baseResolver(
    client: AvailableClients,
    query: string | string[],
    config?: Config,
    plugin?: SearchPlugin,
): UseableCommand | YunaResolverResult | undefined {
    const metadata = (client as UseYunaCommandsClient)[Keys.clientResolverMetadata];

    const matchsData = typeof query === "string" ? getMatches(query) : undefined;
    const matchs = matchsData?.result;

    const queryArray = matchsData?.values ?? (Array.isArray(query) ? query.slice(0, 3) : []).map((t) => t.toLowerCase());

    if (!(queryArray.length && client.commands)) return;

    let [parent, group, sub] = queryArray;

    const searchFn = (command: Command | SubCommand | GroupLink) => command.name === parent || command.aliases?.includes(parent);

    let parentCommand = ((metadata?.commands
        ? metadata.commands.find(searchFn)
        : client.commands.values.find((command) => command.type === ApplicationCommandType.ChatInput && searchFn(command))) ??
        plugin?.findCommand?.(parent)) as YunaCommandUsable<Command> | undefined;

    const shortcut =
        (parentCommand ? undefined : metadata?.shortcuts.find(searchFn)) ?? plugin?.findShortcut?.(parent, metadata?.shortcuts);
    const isGroupShortcut = shortcut?.type === ShortcutType.Group;

    if (!(parentCommand || shortcut)) return;

    const getPadEnd = (id: number) => {
        const match = matchs?.[id];
        return match && (match?.index ?? 0) + match[0]?.length;
    };

    const parentSubCommandsMetadata = parentCommand?.[Keys.resolverSubCommands];

    const availableInMessage = (command: YunaCommandUsable) =>
        config?.inMessage === true ? command.ignore !== IgnoreCommand.Message : true;

    if (isGroupShortcut) {
        parentCommand = shortcut.parent;
        [parent, group, sub] = [shortcut.parent.name, parent, group];
        // when is shortcut or is known when command doesnt have sub commands
    } else if (shortcut || (parentCommand && parentSubCommandsMetadata === null)) {
        const Shortcut = shortcut as SubCommand | undefined;
        const useCommand = Shortcut || parentCommand;

        const group = Shortcut?.group ? parentCommand?.groups?.[Shortcut.group] : undefined;

        if (parentCommand && !availableInMessage(parentCommand)) return;
        if (Shortcut && !availableInMessage(Shortcut)) return;

        return config
            ? useCommand && {
                  group,
                  parent: (useCommand as SubCommand).parent,
                  command: useCommand,
                  endPad: getPadEnd(0),
              }
            : useCommand;
    }

    if (!(parentCommand && availableInMessage(parentCommand))) return;

    let padIdx = 0;

    const groupName =
        parentCommand.groupsAliases?.[group] ||
        (group in (parentCommand.groups ?? {}) ? group : plugin?.findGroupName?.(group, parentCommand));

    if (!isGroupShortcut && groupName) padIdx++;

    const groupData = groupName !== undefined ? (parentCommand as Command).groups?.[groupName] : undefined;

    const subName = groupName ? sub : group;

    const fallbackSubCommandName = groupData
        ? (groupData as YunaGroup)[Keys.resolverFallbackSubCommand]
        : parentSubCommandsMetadata?.fallbackName;

    let virtualSubCommand: SubCommand | undefined;
    let firstGroupSubCommand: SubCommand | undefined;

    const subCommand = (parentCommand.options?.find((s) => {
        const sub = s as SubCommand;

        if (!(sub.type === ApplicationCommandOptionType.Subcommand && sub.group === groupName)) return false;

        firstGroupSubCommand ??= sub;

        if (sub.name === fallbackSubCommandName) {
            virtualSubCommand = sub;
        }

        return sub.name === subName || sub.aliases?.includes(subName);
    }) ?? plugin?.findSubCommand?.(subName, parentCommand, groupName)) as SubCommand | undefined;

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
              group: groupData,
              parent: parentCommand,
              command: resultCommand,
              endPad: getPadEnd(padIdx),
          }
        : resultCommand;
}
