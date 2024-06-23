import { fullNameOf } from "./lib/utils.js";
import "./seyfert.js";
import { getCommandsMetadata, prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig.js";
import { YunaParser } from "./utils/parser/parser.js";

import { YunaWatcherUtils } from "./utils/messageWatcher/watcherUtils.js";
export { Watch } from "./utils/messageWatcher/watcherUtils.js";
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
     * ```ts
     * import { HandleCommand } from "seyfert/lib/commands/handle";
     * import { Yuna } from "yunaforseyfert";
     *
     * class YourHandleCommand extends HandleCommand {
     *     argsParser = Yuna.parser(); // Here are the settings
     * }
     * // your bot's client
     * client.setServices({
     *     handleCommand: YourHandleCommand,
     * });
     * ```
     */
    parser = YunaParser;
    /**
     * 🐧
     * @example
     * ```ts
     * import { HandleCommand } from "seyfert/lib/commands/handle";
     * import { Yuna } from "yunaforseyfert";
     *
     * class YourHandleCommand extends HandleCommand {
     *      resolveCommandFromContent = Yuna.resolver({
     *          // You need to pass the client in order to prepare the commands that the resolver will use.
     *          client: this.client,
     *          // Event to be emitted each time the commands are prepared.
     *          afterPrepare: (metadata) => {
     *              this.client.logger.debug(`Ready to use ${metadata.commands.length} commands !`);
     *          },
     *      });
     * }
     * // your bot's client
     * client.setServices({
     *     handleCommand: YourHandleCommand,
     * });
     * ```
     */
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

    watchers = YunaWatcherUtils;
}

export const Yuna = new BaseYuna();
