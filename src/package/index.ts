import { fullNameOf } from "./lib/utils.js";
import "./seyfert.js";
import { getCommandsMetadata, prepareCommands, resolve } from "./utils/commandsResolver/prepare.js";
import { YunaCommandsResolver } from "./utils/commandsResolver/resolver.js";
import { YunaParser } from "./utils/parser/parser.js";

import { type Command, CommandContext, type Message, type SubCommand } from "seyfert";
import type { CommandOptionWithType } from "seyfert/lib/commands/handle.js";
import { ApplicationCommandOptionType } from "seyfert/lib/types/index.js";
import { Keys } from "./things.js";
import { YunaWatcherUtils } from "./utils/messageWatcher/watcherUtils.js";
import type { YunaParserCreateOptions } from "./utils/parser/configTypes.js";
import { mergeConfig } from "./utils/parser/createConfig.js";

export { DeclareFallbackSubCommand, Shortcut } from "./utils/commandsResolver/decorators.js";
export { Watch } from "./utils/messageWatcher/watcherUtils.js";
export { DeclareParserConfig } from "./utils/parser/createConfig.js";

export { createWatcher } from "./utils/messageWatcher/controllerUtils.js";

export type { MessageWatcherManager } from "./utils/messageWatcher/Manager.js";
export type { MessageWatcher } from "./utils/messageWatcher/Watcher.js";

export type { ArgPosition, ArgsResult, ArgsResultMetadata } from "./things.js";
export type { InferWatcherContext } from "./utils/messageWatcher/Controller.js";

export type {
    DecoratorWatchOptions,
    InferWatcher,
    InferWatcherManager,
    WatcherOnChangeEvent,
    WatcherOnOptionsErrorEvent,
    WatcherOnStopEvent,
    WatcherOnUsageErrorEvent,
    WatcherOptions,
} from "./utils/messageWatcher/types.js";

export const ParserRecommendedConfig = {
    /** things that I consider necessary in an Eval command. */
    // biome-ignore lint/style/useNamingConvention: i want Eval :)
    Eval: {
        breakSearchOnConsumeAllOptions: true,
        disableLongTextTagsInLastOption: {
            excludeCodeBlocks: true,
        },
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

    mergeParserConfig = mergeConfig;

    commands = {
        prepare: prepareCommands,
        resolve,
        /**
         * if it is a subcommand,
         * it will need to have the `parent` property (using Yuna.resolver will be added)
         */
        fullNameOf,
        getMetadata: getCommandsMetadata,
        isParent(command: Command | SubCommand): command is Command & { options: SubCommand[] } {
            if (!command.options?.length) return false;
            const [firstOption] = command.options as CommandOptionWithType[];
            return (
                firstOption.type === ApplicationCommandOptionType.Subcommand ||
                firstOption.type === ApplicationCommandOptionType.SubcommandGroup
            );
        },
    };

    getArgsResult(resolvable?: CommandContext | Message) {
        const message = resolvable instanceof CommandContext ? resolvable.message : resolvable;
        return message?.[Keys.messageArgsResult];
    }

    watchers = YunaWatcherUtils;
}

export const Yuna = new BaseYuna();
