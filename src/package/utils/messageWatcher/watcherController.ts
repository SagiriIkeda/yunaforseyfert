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
    values = new Map<string, MessageWatcherCollector>();

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

            for (const instance of cache.values()) {
                instance.message[key] === id && instance.stop(errorName);
            }
        }

        const get = (messageId: string, channelId: string) => {
            const id = createId(messageId, channelId);
            return cache.get(id);
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
                            get(id, data.channel_id)?.stop("MessageBulkDelete")
                        }
                        break;
                    case GatewayDispatchEvents.MessageDelete:
                        get(data.id, data.channel_id)?.stop("MessageDelete")
                        break;
                    case GatewayDispatchEvents.MessageUpdate:
                        get(data.id, data.channel_id)?.update(data)
                        break;

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

    if (inCache) return inCache;

    MessageWatcherController.init(ctx.client)

    const watcher = new MessageWatcherCollector(message, ctx, options);

    MessageWatcherController.values.set(id, watcher)

    return watcher;
}