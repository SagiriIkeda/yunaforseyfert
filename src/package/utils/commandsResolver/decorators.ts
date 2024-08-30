import type { Command, SubCommand } from "seyfert";
import { type Instantiable, Keys } from "../../things";

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
 * @requires Yuna.resolver to work.
 */
export function Shortcut() {
    return <T extends Instantiable<SubCommand>>(target: T) => {
        return class extends target {
            [Keys.resolverIsShortcut] = true;
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
 * use `null` to disable this option for this command.
 * @requires  Yuna.resolver to work.
 */
export function DeclareFallbackSubCommand(command: Instantiable<SubCommand> | null | string) {
    return <T extends Instantiable<Command>>(target: T) => {
        return class extends target {
            [Keys.resolverSubCommands] = { fallback: command, fallbackName: getFallbackCommandName(command) };
        };
    };
}
