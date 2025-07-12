import type { Command, SubCommand } from "seyfert";

export const fullNameOf = (command: Command | SubCommand) => {
    const names: string[] = [command.name];

    if ("group" in command && command.group) names.unshift(command.group);
    if ("parent" in command && command.parent?.name) names.unshift(command.parent.name);

    return names.join(" ");
};

export function MemoizeMethod(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cacheProp = `__${propertyKey}`;

    descriptor.value = function (...args: any[]) {
        const self = this as any;

        let cached = self[cacheProp];

        if (!cached) {
            cached = originalMethod.apply(self, args);
            Object.defineProperty(self, cacheProp, {
                value: cached,
                writable: false,
                configurable: false,
                enumerable: false,
            });
        }

        return cached;
    };

    return descriptor;
}
