import { Command, Declare, Groups, Options } from "seyfert";
import { DeclareFallbackSubCommand } from "../../../package/utils/commandsResolver/decorators";
import CreateCommand from "./create";
import OtherCommand from "./other";

@Declare({
    name: "account",
    description: "account command",
    aliases: ["pinwino"],
})
// Being in the same folder with @AutoLoad() you can save this
@Options([CreateCommand, OtherCommand])
@Groups({
    pengu: {
        aliases: ["pingu"],
        shortcut: true,
        fallbackSubCommand: CreateCommand,
        defaultDescription: "si",
    },
})
@DeclareFallbackSubCommand(OtherCommand)
export default class AccountCommand extends Command {}
