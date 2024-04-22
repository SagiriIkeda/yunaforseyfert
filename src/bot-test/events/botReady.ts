import { createEvent } from "seyfert";

export default createEvent({
    data: { once: true, name: "botReady" },
    run(user, client, shard) {
        client.logger.info(`${user.username} is ready on shard #${shard}`);
    },
});
