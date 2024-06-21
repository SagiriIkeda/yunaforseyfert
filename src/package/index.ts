import type { CommandContext } from "seyfert";
import { fullNameOf } from "./lib/utils.js";
import type { AvailableClients } from "./things.js";
import { getCommandsMetadata, prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import type { FindWatcherQuery } from "./utils/messageWatcher/WatcherController.js";
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
        getFromContext(ctx: CommandContext) {
            return this.getController(ctx.client)?.getWatcherInstancesFromContext(ctx);
        },
        findInstances(client: AvailableClients, query: FindWatcherQuery) {
            return this.getController(client)?.findWatcherInstances(query);
        },
        getManyInstances(client: AvailableClients, query: FindWatcherQuery) {
            return this.getController(client)?.getManyWatcherInstances(query);
        },
        isWatching(ctx: CommandContext) {
            return this.getFromContext(ctx) !== undefined;
        },
    };
}
export const Yuna = new BaseYuna();
