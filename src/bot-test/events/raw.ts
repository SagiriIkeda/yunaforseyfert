import { createEvent } from "seyfert";

export default createEvent({
    data: { name: "raw" },
    run(data, client, shard) {
        /** @ts-ignore */
        client.collectors.run('RAW', data)
    },
});
