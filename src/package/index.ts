import { fullNameOf } from "./lib/utils.js";
import { getCommandsMetadata, prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import { createController, createWatcher, getController } from "./utils/messageWatcher/controllerUtils.js";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig.js";
import { YunaParser } from "./utils/parser/parser.js";

export { Watch } from "./utils/messageWatcher/decorator.js";
export { DeclareParserConfig } from "./utils/parser/createConfig.js";

export { createWatcher } from "./utils/messageWatcher/controllerUtils.js";

export const ParserRecommendedConfig = {
    /** things that I consider necessary in an Eval command. */
    Eval: {
        breakSearchOnConsumeAllOptions: true,
        disableLongTextTagsInLastOption: true,
    },
} satisfies Record<string, YunaParserCreateOptions>;

class BaseYuna {
    /**
     * 🐧 
     * @example
     * ```js
     * import { Yuna } from "yunaforseyfert"
     * 
     * new Client({ 
         commands: {
             argsParser: Yuna.parser()
        }
    });
    * ```
    */
    parser = YunaParser;
    resolver = YunaCommandsResolver;

    commands = {
        prepare: prepareCommands,
        resolve,
        /**
         * if it is a subcommand,
         * it will need to have the `parent` property (using YunaCommandsResolver will be added)
         */
        fullNameOf,
        getMetadata: getCommandsMetadata,
    };

    watchers = {
        create: createWatcher,
        createController,
        getController,
    };
}
export const Yuna = new BaseYuna();
