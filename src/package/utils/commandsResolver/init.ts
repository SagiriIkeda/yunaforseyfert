import { type Client, Command, SubCommand, BaseCommand } from "seyfert";
import { CommandHandler } from "seyfert/lib/commands/handler";
import { type YunaUsableCommand, keySubCommands, keyRoot, type InstantiableSubCommand } from "../parser/createConfig";

export function LinkToRootPath() {
    return <T extends { new(...args: any[]): {} }>(target: T) => {
        return class extends target {
            [keyRoot] = true;
        };
    };
}

export function UseDefaultSubCommand(command: InstantiableSubCommand) {
    return <T extends { new(...args: any[]): {} }>(target: T) => {
        return class extends target {
            [keySubCommands] = { default: command };
        };
    };
}

class BaseYunaCommands {

    eventCreated = false;

    linkedSubCommands: SubCommand[] = [];

    decore(client: Client<boolean>) {
        this.linkedSubCommands = []

        for (const command of client.commands?.values ?? []) {
            if (!(command instanceof Command)) continue;

            const subCommandsMetadata = (command as YunaUsableCommand)[keySubCommands] ?? {};

            if (command.options?.[0] instanceof SubCommand) (command as YunaUsableCommand)[keySubCommands] = { ...subCommandsMetadata, has: true };
            else { delete (command as YunaUsableCommand)[keySubCommands] }

            for (const sub of command.options ?? []) {
                if (!(sub instanceof SubCommand)) continue;
                sub.parent = command;
                if ((sub as YunaUsableCommand)[keyRoot] === true) this.linkedSubCommands.push(sub)
            }

        }

    }

    prepare(client: Client<boolean>) {

        if (this.eventCreated) return;
        this.eventCreated = true

        const createEvent = <T extends { new(...args: any[]): any, prototype: any }>(clas: T, method: keyof T["prototype"], callback: (instance: T) => any) => {
            const def = clas.prototype[method];

            Object.defineProperty(clas.prototype, method, {
                async value(...args: Parameters<typeof def>) {
                    const val = await def.apply(this, args);
                    callback(this)
                    return val;
                }
            })
        }

        const decore = () => this.decore(client);

        createEvent(CommandHandler, "load", decore)
        createEvent(BaseCommand, "reload", () => decore)
    }
}

const YunaCommands = new BaseYunaCommands();
export default YunaCommands;