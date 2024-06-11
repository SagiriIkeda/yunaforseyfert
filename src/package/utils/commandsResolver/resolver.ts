import type { Command, Message, UsingClient } from "seyfert"
import { baseResolver } from "./base"
import { createResolver, prepareCommands } from "./prepare"
import { once } from "../pengu"

export interface YunaCommandsResolverConfig {
    useDefaultSubCommand?: boolean,
}

export const YunaCommandsResolver = ({ useDefaultSubCommand = true }: YunaCommandsResolverConfig = {}) => {

    const config = {
        useDefaultSubCommand,
    }

    const init = once((client: UsingClient) => {
        prepareCommands(client)
        createResolver(client, config)
    })

    return (client: UsingClient, prefix: string, content: string, message: Message) => {

        init(client)

        message.prefix = prefix;

        const { endPad = 0, command, parent } = baseResolver(client, content, config) ?? {};

        const argsContent = content.slice(endPad);

        const fullCommandName = [parent?.name, command && "group" in command ? command?.group : undefined, command?.name].filter(x => x).join(" ");

        return {
            parent: parent,
            command: command as Command,
            fullCommandName,
            argsContent,
        }

    }
}