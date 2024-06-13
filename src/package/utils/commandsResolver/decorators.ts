import type { Command, SubCommand } from "seyfert";
import { type InstantiableSubCommand, keyRoot, keySubCommands } from "../../things";

/**
 * ### Yuna's Text Shortcuts
 * They allow you to access a subcommand more easily,
 * as if it were a normal command.
 * @example
 * ```
 *  // normal way to access
 *  music play
 *  // can now be accessed as
 *  play
 * ```
 * @requires YunaCommandsResolver to work.
 */
export function Shortcut() {
    return <T extends InstantiableSubCommand>(target: T) => {
        return class extends target {
            [keyRoot] = true;
            declare run: SubCommand["run"];
        };
    };
}
/**
 * Allows you to set a subcommand that will be used when one is not found.
 * if not set the first subcommand will be used.
 * @requires  YunaCommandsResolver setting `useFallbackSubCommand` be `true` (by default).
 * use `null` to disable this option for this command.
 */
export function DeclareFallbackSubCommand(command: InstantiableSubCommand | null) {
    return <T extends { new (...args: any[]): Command }>(target: T) => {
        return class extends target {
            [keySubCommands] = { default: command };
        };
    };
}
