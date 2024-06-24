import type { LocaleString } from "discord-api-types/v10";
import type { Client, Command, SubCommand, UsingClient, WorkerClient } from "seyfert";
import type { YunaParserCommandMetaData } from "./utils/parser/CommandMetaData";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig";

export const keyMetadata = Symbol("YunaParserMetaData");
export const keyConfig = Symbol("YunaParserConfig");
export const keySubCommands = Symbol("YunaSubCommands");
export const keyShortcut = Symbol("YunaShortcut");
export const fallbackSubNameKey = Symbol("fallbackSubcommandName");

export type Instantiable<C> = { new (...args: any[]): C };
export type AvailableClients = UsingClient | Client | WorkerClient;
export type ArgsResult = Record<string, string>;

export type YunaUsable<T extends Command | SubCommand = Command | SubCommand> = T & {
    [keyMetadata]?: YunaParserCommandMetaData;
    [keyConfig]?: YunaParserCreateOptions;
    [keySubCommands]?: { fallback?: Instantiable<SubCommand> | null; fallbackName?: string } | null;
    [keyShortcut]?: boolean;
};

export type YunaGroupType = {
    name?: [language: LocaleString, value: string][];
    description?: [language: LocaleString, value: string][];
    defaultDescription?: string;
    aliases?: string[];
    /**
     * ### Yuna's Text Shortcuts
     * They allow you to access to a group more easily,
     * as if it were a normal command.
     * @example
     * ```
     *  // normal way to access
     *  fun music play
     *  // can now be accessed as
     *  music play
     * ```
     * @requires YunaCommandsResolver to work.
     */
    shortcut?: boolean;
    /**
     * Allows you to set a subcommand that will be used when one is not found.
     * if not set the first subcommand of this group will be used.
     *
     * use `null` to disable this option for this group.
     * @requires  YunaCommandsResolver to work.
     */
    fallbackSubCommand?: Instantiable<SubCommand> | string | null;
};
