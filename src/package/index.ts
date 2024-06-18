import { fullNameOf } from "./lib/utils.js";
import { prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import { getController, prepareWatchers } from "./utils/messageWatcher/prepare.js";
import { YunaParser } from "./utils/parser/parser.js";

export { DeclareParserConfig, ParserRecommendedConfig } from "./utils/parser/createConfig.js";

export const Yuna = {
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
    parser: YunaParser,
    resolver: YunaCommandsResolver,

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
