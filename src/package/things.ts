import type { Command, SubCommand } from "seyfert"
import type { CommandYunaMetaDataConfig, YunaParserCreateOptions } from "./utils/parser/createConfig";
import { prepare } from "./utils/commandsResolver/prepare";

export const keyMetadata = Symbol("YunaParserMetaData");
export const keyConfig = Symbol("YunaParserConfig");
export const keySubCommands = Symbol("hasSubCommands");
export const keyRoot = Symbol("LinkedToRootPath");

export type InstantiableSubCommand = { new(...args: any[]): SubCommand };

export type YunaUsableCommand = (Command | SubCommand) & {
    [keyMetadata]?: CommandYunaMetaDataConfig;
    [keyConfig]?: YunaParserCreateOptions;
    [keySubCommands]?: { default?: InstantiableSubCommand, has: boolean };
    [keyRoot]?: boolean;
};


export const UseYuna = {
    commands: {
        prepare,
    }
}