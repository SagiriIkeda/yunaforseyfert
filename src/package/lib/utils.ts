import type { Command, SubCommand } from "seyfert";

export const once = <F extends (...args: any[]) => any>(callback: F) => {
    let isCalled = false;

    return (...args: Parameters<F>) => {
        if (isCalled) return;
        isCalled = true;
        return callback(...args);
    };
};
/**
 * if it is a subcommand,
 * it will need to have the `parent` property (using YunaCommandsResolver will be added)
 */
export const fullNameOf = (command: Command | SubCommand) => {
    const names: string[] = [command.name];

    if ("group" in command && command.group) names.unshift(command.group);
    if ("parent" in command && command.parent?.name) names.unshift(command.parent.name);

    return names.join(" ");
};
