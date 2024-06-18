import { createEvent } from "seyfert";
import { Yuna } from "../../package";

export default createEvent({
    data: { once: true, name: "botReady" },
    run(user, client, shard) {
        Yuna.commands.prepare(client);
        client.logger.info(`${user.username} is ready on shard #${shard}`);
    },
});
