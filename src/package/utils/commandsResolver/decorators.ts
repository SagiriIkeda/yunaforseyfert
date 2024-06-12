import { type InstantiableSubCommand, keyRoot, keySubCommands } from "../../things";

export function LinkToRootPath() {
    return <T extends { new (...args: any[]): {} }>(target: T) => {
        return class extends target {
            [keyRoot] = true;
        };
    };
}

export function UseDefaultSubCommand(command: InstantiableSubCommand) {
    return <T extends { new (...args: any[]): {} }>(target: T) => {
        return class extends target {
            [keySubCommands] = { default: command };
        };
    };
}
