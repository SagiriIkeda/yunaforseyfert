import type { BaseMessage, CommandContext, Message, UsingClient } from "seyfert";
import { MessageWatcherCollector, type MessageWatcherCollectorOptions } from "./messageWatcher";
import { GatewayDispatchEvents } from "discord-api-types/v10";

export function createId(message: string, channelId: string): string
export function createId(message: BaseMessage): string
export function createId(message: BaseMessage | string, channelId?: string): string {
    if (typeof message === "string") return `${channelId}.${message}`;
    return `${message.channelId}.${message.id}`;
}

class BaseMessageWatcherController {
    values = new Map<string, MessageWatcherCollector[]>();

    watching = false;

    init(client: UsingClient) {

        if (this.watching) return;

        this.watching = true;

        const cache = this.values;

        const deleteBy = (data: { channelId: string } | { guildId: string }) => {

            const isChannel = "channelId" in data;

            const id = isChannel ? data.channelId : data.guildId;
            const key = isChannel ? "channelId" : "guildId";
            const errorName = isChannel ? "channelDelete" : "guildDelete";

            for (const instances of cache.values()) {
                const [zero] = instances;
                if (!zero || zero.message[key] !== id) continue;

                for (const instance of instances) instance.stop(errorName);

            }
        }

        const get = (messageId: string, channelId: string) => {
            const id = createId(messageId, channelId);
            return cache.get(id);
        }

        const deleteByMessage = (messageId: string, channelId: string, reason: string) => {
            const instances = get(messageId, channelId) ?? [];
            for (const instance of instances) instance.stop(reason);
        }

        client.collectors.create({
            event: "RAW",

            filter() { return true },

            run({ t: event, d: data }) {

                switch (event) {

                    case GatewayDispatchEvents.GuildDelete:
                        deleteBy({ guildId: data.id })
                        break;
                    case GatewayDispatchEvents.ThreadDelete:
                        deleteBy({ channelId: data.id })
                        break;
                    case GatewayDispatchEvents.ChannelDelete:
                        deleteBy({ channelId: data.id })
                        break;
                    case GatewayDispatchEvents.MessageDeleteBulk:
                        for (const id of data.ids) {
                            deleteByMessage(id, data.channel_id, "MessageBulkDelete")
                        }
                        break;
                    case GatewayDispatchEvents.MessageDelete:
                        deleteByMessage(data.id, data.channel_id, "MessageDelete")
                        break;
                    case GatewayDispatchEvents.MessageUpdate: {
                        const instances = get(data.id, data.channel_id) ?? [];
                        instances[0].update(data);
                        break;
                    }
                }
            },
        })
    }
}
const MessageWatcherController = new BaseMessageWatcherController();
export default MessageWatcherController;

export function createMessageWatcher(
    this: { message: Message; ctx: CommandContext },
    options: Omit<MessageWatcherCollectorOptions, "ctx">,
) {
    const { message, ctx } = this;

    const id = createId(message);

    const inCache = MessageWatcherController.values.get(id)

    MessageWatcherController.init(ctx.client)

    const watcher = new MessageWatcherCollector(message, ctx, options);

    if (!inCache) MessageWatcherController.values.set(id, []);

    MessageWatcherController.values.get(id)?.push(watcher)

    return watcher;
}