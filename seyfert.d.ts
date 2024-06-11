import type { Command } from "seyfert";

declare module "seyfert" {

    export interface SubCommand {
        /** this only works using YunaCommands.prepare */
        parent: Command
    }

}
