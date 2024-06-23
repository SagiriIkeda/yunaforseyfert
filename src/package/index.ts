import type { CommandContext } from "seyfert";
import { fullNameOf } from "./lib/utils.js";
import type { AvailableClients } from "./things.js";
import { getCommandsMetadata, prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import type { FindWatcherQuery } from "./utils/messageWatcher/WatcherController.js";
import { createController, createWatcher, getController } from "./utils/messageWatcher/controllerUtils.js";
import type { YunaParserCreateOptions } from "./utils/parser/createConfig.js";
import { YunaParser } from "./utils/parser/parser.js";
import "./seyfert.js";

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

    watchers = {
        create: createWatcher,
        createController,
        getController,
        /**  Get the list of `watchers` (there may be more than one) associated to a `CommandContext`. */
        getFromContext(ctx: CommandContext) {
            return getController(ctx.client)?.getWatcherInstancesFromContext(ctx);
        },
        /**
         * Find watchers from a query.
         * This method returns the key (id where it is stored) of the watcher, and its instances in an array.
         */
        findInstances(client: AvailableClients, query: FindWatcherQuery) {
            return getController(client)?.findWatcherInstances(query);
        },
        /** Similar to `findInstances` but this one will filter through all, it is used in the same way, but it will return all matches */
        getManyInstances(client: AvailableClients, query: FindWatcherQuery) {
            return getController(client)?.getManyWatcherInstances(query);
        },
        /**
         * Use it to know when a `CommandContext` is being observed.
         */
        isWatching(ctx: CommandContext) {
            return Yuna.watchers.getFromContext(ctx) !== undefined;
        },
    };
}

export const Yuna = new BaseYuna();
