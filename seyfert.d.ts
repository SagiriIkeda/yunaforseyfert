import type { Command } from "seyfert";

declare module "seyfert" {

    export interface SubCommand {
        /** This property is part of YunaCommandsResolver, without using it, it may not be available. */
        parent?: Command
    }

    export interface Message {
        /** This property is necessary for Yuna's MessageWatcher to work.  */
        prefix?: string
    }
}
