import type { LocaleString } from "discord-api-types/v10";
import type { Command } from "seyfert";
import type { Instantiable } from "./src/package/things";

declare module "seyfert" {
    export interface SubCommand {
        /** This property is part of YunaCommandsResolver, without using it, it may not be available. */
        parent?: Command;
    }

    export function Groups(
        groups: Record<
            string,
            {
                name?: [language: LocaleString, value: string][];
                description?: [language: LocaleString, value: string][];
                defaultDescription: string;
                aliases?: string[];
                /**
                 * ### Yuna's Text Shortcuts
                 * They allow you to access to a group more easily,
                 * as if it were a normal command.
                 * @example
                 * ```
                 *  // normal way to access
                 *  fun music play
                 *  // can now be accessed as
                 *  music play
                 * ```
                 * @requires YunaCommandsResolver to work.
                 */
                shortcut?: boolean;
                /**
                 * Allows you to set a subcommand that will be used when one is not found.
                 * if not set the first subcommand of this group will be used.
                 *
                 * use `null` to disable this option for this group.
                 * @requires  YunaCommandsResolver to work.
                 */
                fallbackSubCommand?: Instantiable<SubCommand> | string | null;
            }
        >,
    ): ReturnType<typeof Groups>;
}
