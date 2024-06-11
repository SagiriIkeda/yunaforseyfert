import { Command, Declare, Groups, Options } from "seyfert";
import CreateCommand from "./create";
import { UseDefaultSubCommand } from "../../../package/utils/commandsResolver/decorators";
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
        defaultDescription: "si",
    }
})
@UseDefaultSubCommand(OtherCommand)
export default class AccountCommand extends Command { }
