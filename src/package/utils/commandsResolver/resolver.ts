import type { Command, Message, UsingClient } from "seyfert"
import { baseResolver } from "./base"
import { createResolver, prepare } from "./prepare"

export interface YunaCommandsResolverConfig {
    useDefaultSubCommand?: boolean,
}

export const YunaCommandsResolver = ({ useDefaultSubCommand = true }: YunaCommandsResolverConfig = {}) => {

    const config = {
        useDefaultSubCommand,
    }

    return (client: UsingClient, prefix: string, content: string, message: Message) => {

        prepare(client)
        createResolver(client, config)

        const { endPad = 0, command, parent } = baseResolver(client, content, config) ?? {};

        const argsContent = content.slice(endPad);

        const fullCommandName = [parent?.name, command && "group" in command ? command?.group : undefined, command?.name].filter(x => x).join(" ");

        console.log(fullCommandName)

        return {
            parent: parent,
            command: command as Command,
            fullCommandName,
            argsContent,
        }

    }
}