import type { Command, SubCommand } from "seyfert";
import { type Instantiable, keyShortcut, keySubCommands } from "../../things";

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
    return <T extends Instantiable<SubCommand>>(target: T) => {
        return class extends target {
            [keyShortcut] = true;
            declare run: SubCommand["run"];
        };
    };
}

export const getFallbackCommandName = (command: Instantiable<SubCommand> | null | string) => {
    if (!command) return;
    if (typeof command === "string") return command;
    return new command().name;
};

/**
 * Allows you to set a subcommand that will be used when one is not found.
 * if not set the first subcommand will be used.
 * @requires  YunaCommandsResolver setting `useFallbackSubCommand` be `true` (by default).
 * use `null` to disable this option for this command.
 */
export function DeclareFallbackSubCommand(command: Instantiable<SubCommand> | null | string) {
    return <T extends Instantiable<Command>>(target: T) => {
        return class extends target {
            [keySubCommands] = { fallback: command, fallbackName: getFallbackCommandName(command) };
        };
    };
}
