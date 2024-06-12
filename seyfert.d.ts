import type { CommandHandler } from "seyfert/lib/commands/handler";
import type { YunaCommandsResolverConfig } from "./src/package/utils/commandsResolver/resolver";
import type { Command } from "seyfert";

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
}
