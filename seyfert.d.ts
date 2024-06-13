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
                 * @requires  YunaCommandsResolver setting `useFallbackSubCommand` be `true` (by default).
                 * use `null` to disable this option for this command group.
                 */
                fallbackSubCommand?: InstantiableSubCommand | null;
            }
        >,
    ): ReturnType<typeof Groups>;
}
