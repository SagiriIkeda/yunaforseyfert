import { Command, Declare, Options } from "seyfert";
import CreateCommand from "./create";

@Declare({
    name: "account",
    description: "account command",
    aliases: ["pinwino"],
})
// Being in the same folder with @AutoLoad() you can save this
@Options([CreateCommand])
export default class AccountCommand extends Command {}
