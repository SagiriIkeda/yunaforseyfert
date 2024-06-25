import type { Command, SubCommand } from "seyfert";

export const fullNameOf = (command: Command | SubCommand) => {
    const names: string[] = [command.name];

    if ("group" in command && command.group) names.unshift(command.group);
    if ("parent" in command && command.parent?.name) names.unshift(command.parent.name);

    return names.join(" ");
};
