import { fullNameOf } from "./lib/utils.js";
import { prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import { getController, prepareWatchers } from "./utils/messageWatcher/prepare.js";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig.js";
import { YunaParser } from "./utils/parser/parser.js";

export { DeclareParserConfig } from "./utils/parser/createConfig.js";

export const ParserRecommendedConfig = {
    /** things that I consider necessary in an Eval command. */
    Eval: {
        breakSearchOnConsumeAllOptions: true,
        disableLongTextTagsInLastOption: true,
    },
} satisfies Record<string, YunaParserCreateOptions>;

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
        prepare: prepareCommands.bind(null, true),
        resolve,
        fullNameOf,
    },
    watchers: {
        prepare: prepareWatchers,
        getController,
    },
};
