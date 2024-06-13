import type { Command } from "seyfert";
import type { InstantiableSubCommand } from "./src/package/things";

declare module "seyfert" {
    export interface SubCommand {
        /** This property is part of YunaCommandsResolver, without using it, it may not be available. */
        parent?: Command;
    }

    export interface Message {
        /** This property is necessary for Yuna's MessageWatcher to work.  */
        prefix?: string;
    }

    export function Groups(
        groups: Record<
            string,
            {
                name?: [language: LocaleString, value: string][];
                description?: [language: LocaleString, value: string][];
                defaultDescription: string;
                aliases?: string[];
                linkToRootPath?: boolean;
                useDefaultSubCommand?: InstantiableSubCommand | null;
            }
        >,
    ): ReturnType<typeof Groups>;
}
