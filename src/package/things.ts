import type { Command, SubCommand } from "seyfert";
import { fullNameOf } from "./lib/utils";
import { prepareCommands, resolve } from "./utils/commandsResolver/prepare";
import { getController, prepareWatchers } from "./utils/messageWatcher/prepare";
import type { CommandYunaMetaDataConfig, YunaParserCreateOptions } from "./utils/parser/createConfig";

export const keyMetadata = Symbol("YunaParserMetaData");
export const keyConfig = Symbol("YunaParserConfig");
export const keySubCommands = Symbol("YunaSubCommands");
export const keyShortcut = Symbol("YunaShortcut");

export type InstantiableSubCommand = { new (...args: any[]): SubCommand };

export type YunaUsableCommand = (Command | SubCommand) & {
    [keyMetadata]?: CommandYunaMetaDataConfig;
    [keyConfig]?: YunaParserCreateOptions;
    [keySubCommands]?: { default?: InstantiableSubCommand | null };
    [keyShortcut]?: boolean;
};

export const useYuna = {
    commands: {
        prepare: prepareCommands,
        resolve,
        fullNameOf,
    },
    watchers: {
        prepare: prepareWatchers,
        getController,
    },
};
