import type { Command } from "seyfert";
import type { CommandHandler } from "seyfert/lib/commands/handler";
import type { YunaCommandsResolverConfig } from "./src/package/utils/commandsResolver/resolver";
import type { MessageWatcherCollector, MessageWatcherCollectorOptions } from "./src/package/utils/messageWatcher/messageWatcher";

declare module "seyfert" {

    export interface SubCommand {
        /** this only works using YunaCommandsResolver enabled */
        parent?: Command
    }

    export interface UsingClient {
        commands?: CommandHandler & {
            /** this only works using YunaCommandsResolver enabled */
            resolve?(query: string | string[], config?: YunaCommandsResolverConfig): Command | SubCommand;
        }
    }

    export interface Message {
        /** prefix used for the user */
        prefix?: string
    }

    export interface CommandContext {
        /** ### Yuna's Message Watcher 
         * 
         * This will notify you each time the user edits the `command message`, updating the options received.
        */
        createWatcher(options?: MessageWatcherCollectorOptions): MessageWatcherCollector
    }

}
