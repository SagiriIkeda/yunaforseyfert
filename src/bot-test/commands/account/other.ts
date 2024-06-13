import { type CommandContext, Declare, SubCommand } from "seyfert";
import { Shortcut } from "../../../package/utils/commandsResolver/decorators";

@Declare({
    name: "others",
    description: "create a new something",
})
@Shortcut()
export default class OtherCommand extends SubCommand {
    run(ctx: CommandContext) {
        // some logic there

        ctx.write({
            content: "other command executed",
        });
    }
}
