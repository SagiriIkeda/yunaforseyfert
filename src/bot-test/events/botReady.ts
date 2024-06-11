import { createEvent } from "seyfert";
import { UseYuna } from "../../package";

export default createEvent({
    data: { once: true, name: "botReady" },
    run(user, client, shard) {
        UseYuna.commands.prepare(client);
        client.logger.info(`${user.username} is ready on shard #${shard}`);
    },
});
