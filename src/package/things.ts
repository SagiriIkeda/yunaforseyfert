import type { Client, Command, SubCommand, UsingClient, WorkerClient } from "seyfert";
import type { YunaParserCommandMetaData } from "./utils/parser/CommandMetaData";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig";

export const keyMetadata = Symbol("YunaParserMetaData");
export const keyConfig = Symbol("YunaParserConfig");
export const keySubCommands = Symbol("YunaSubCommands");
export const keyShortcut = Symbol("YunaShortcut");

export type Instantiable<C> = { new (...args: any[]): C };
export type AvailableClients = UsingClient | Client | WorkerClient;
export type ArgsResult = Record<string, string>;

export type YunaUsableCommand = (Command | SubCommand) & {
    [keyMetadata]?: YunaParserCommandMetaData;
    [keyConfig]?: YunaParserCreateOptions;
    [keySubCommands]?: { default?: Instantiable<SubCommand> | null } | null;
    [keyShortcut]?: boolean;
};
