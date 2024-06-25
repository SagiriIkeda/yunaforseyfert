import type { Command } from "seyfert";
import type { Instantiable, YunaGroupType } from "./things";

declare module "seyfert" {
    export interface SubCommand {
        /** This property is part of YunaCommandsResolver, without using it, it may not be available. */
        parent?: Command;
    }

    export function Groups(groups: Record<string, YunaGroupType>): <T extends Instantiable<any>>(target: T) => T;
}
