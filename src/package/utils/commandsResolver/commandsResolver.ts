import { type Command, SubCommand, type UsingClient } from "seyfert";
import { type YunaUsableCommand, keyHasSubcommands } from "../parser/createConfig";

type Cmd = Command | SubCommand;

interface YunaCommandsResolverData {
    parent?: Command | YunaUsableCommand
    command: Cmd,
    endPad?: number
}

interface YunaCommandsResolverOptions {
    useDefaultSubCommand?: boolean,
}

export function commandsResolver(client: UsingClient, query: string | string[], forMessage: YunaCommandsResolverOptions): YunaCommandsResolverData | undefined;
export function commandsResolver(client: UsingClient, query: string | string[], forMessage?: undefined): Cmd | undefined;
export function commandsResolver(client: UsingClient, query: string | string[], forMessage?: YunaCommandsResolverOptions | undefined): Cmd | YunaCommandsResolverData | undefined {

    const matchs = typeof query === "string" ? Array.from(query.matchAll(/[^\s\x7F\n]+/g)).slice(0, 3) : undefined;

    const queryArray = (matchs?.map(([val]) => val.toLowerCase()) ?? (Array.isArray(query) && query.slice(0, 3).map(t => t.toLowerCase()))) || []

    if (!queryArray.length) return;

    const [parent, group, sub] = queryArray;

    const parentCommand = client.commands?.values.find((command) => command.name === parent || "aliases" in command && command.aliases?.includes(parent)) as YunaUsableCommand | undefined

    if (!parentCommand) return undefined;

    if ((parentCommand as YunaUsableCommand)[keyHasSubcommands] === false) return forMessage ? {
        command: parentCommand,
        endPad: matchs && matchs[0]?.index + matchs[0]?.[0]?.length
    } : parentCommand;

    const groupKeyName = sub && group;

    const groupName = "groups" in parentCommand ? (parentCommand.groupsAliases?.[groupKeyName] || ((groupKeyName in (parentCommand.groups ?? {})) ? groupKeyName : undefined)) : undefined;

    const subName = sub ?? group;

    let hasSubCommands = false;

    const subCommand = ("options" in parentCommand && parentCommand.options?.find(
        (o) => {
            if (!(o instanceof SubCommand)) return false;

            hasSubCommands = true;

            return (o.name === subName || o.aliases?.includes(subName)) && o.group === groupName;
        }
    )) as SubCommand | undefined || undefined;

    (parentCommand as YunaUsableCommand)[keyHasSubcommands] = hasSubCommands;

    const padIdx = groupName && subCommand ? 2 : (subCommand) ? 1 : 0;

    const endPad = matchs && matchs[padIdx]?.index + matchs[padIdx]?.[0]?.length;

    return forMessage && subCommand ? {
        parent: parentCommand,
        command: subCommand,
        endPad
    } : subCommand;

}