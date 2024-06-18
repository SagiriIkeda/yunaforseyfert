import type { Command, SubCommand } from "seyfert";
import type { YunaParserCommandMetaData, YunaParserCreateOptions } from "./utils/parser/createConfig";

export const keyMetadata = Symbol("YunaParserMetaData");
export const keyConfig = Symbol("YunaParserConfig");
export const keySubCommands = Symbol("YunaSubCommands");
export const keyShortcut = Symbol("YunaShortcut");

export type Instantiable<C> = { new (...args: any[]): C };

export type YunaUsableCommand = (Command | SubCommand) & {
    [keyMetadata]?: YunaParserCommandMetaData;
    [keyConfig]?: YunaParserCreateOptions;
    [keySubCommands]?: { default?: Instantiable<SubCommand> | null } | null;
    [keyShortcut]?: boolean;
};
