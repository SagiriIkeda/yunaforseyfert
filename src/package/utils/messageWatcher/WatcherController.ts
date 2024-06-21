import { GatewayDispatchEvents } from "discord-api-types/v10";
import {
    type BaseMessage,
    type Command,
    CommandContext,
    type LimitedCollection,
    type Message,
    type OptionsRecord,
    type SubCommand,
    type UsingClient,
    type WorkerClient,
} from "seyfert";
import type { Client } from "seyfert";
import { MessageWatcherCollector, type MessageWatcherCollectorOptions } from "./WatcherCollector";

export function createId(message: string, channelId: string): string;
export function createId(message: BaseMessage): string;
export function createId(message: BaseMessage | string, channelId?: string): string {
    if (typeof message === "string") return `${channelId}.${message}`;
    return `${message.channelId}.${message.id}`;
}

type CollectorsCacheAdapter = Map<string, MessageWatcherCollector<any>[]> | LimitedCollection<string, MessageWatcherCollector<any>[]>;

export interface YunaMessageWatcherControllerConfig {
    client: UsingClient;
    cache?: CollectorsCacheAdapter;
}

export interface WatcherCreateData {
    client: UsingClient;
    message: Message;
    prefix: string;
    command: Command | SubCommand;
    shardId?: number;
}

export type watcherCreateData = WatcherCreateData | Pick<CommandContext, "client" | "command" | "message" | "shardId">;

export class YunaMessageWatcherController {
    collectors: CollectorsCacheAdapter = new Map<string, MessageWatcherCollector<any>[]>();

    watching = false;

    client: UsingClient;

    constructor({ cache = new Map(), client }: YunaMessageWatcherControllerConfig) {
        this.client = client;
        this.collectors = cache;
    }

    init() {
        if (this.watching) return;
        const { client } = this;

        this.watching = true;

        const cache = this.collectors;

        const deleteBy = (data: { channelId: string } | { guildId: string }) => {
            const isChannel = "channelId" in data;

            const id = isChannel ? data.channelId : data.guildId;
            const key = isChannel ? "channelId" : "guildId";
            const errorName = isChannel ? "channelDelete" : "guildDelete";

            for (const instancesData of [...cache.values()]) {
                const instances = "value" in instancesData ? instancesData?.value : instancesData;

                const [zero] = instances;
                if (!zero || zero.message[key] !== id) continue;

                for (const instance of instances) instance.stop(errorName);
            }
        };

        const get = (messageId: string, channelId: string) => {
            const id = createId(messageId, channelId);
            return cache.get(id);
        };

        const deleteByMessage = (messageId: string, channelId: string, reason: string) => {
            const instances = get(messageId, channelId) ?? [];
            for (const instance of instances) instance.stop(reason);
        };

        client.collectors.create({
            event: "RAW",

            filter() {
                return true;
            },

            run({ t: event, d: data }) {
                switch (event) {
                    case GatewayDispatchEvents.GuildDelete:
                        deleteBy({ guildId: data.id });
                        break;
                    case GatewayDispatchEvents.ThreadDelete:
                        deleteBy({ channelId: data.id });
                        break;
                    case GatewayDispatchEvents.ChannelDelete:
                        deleteBy({ channelId: data.id });
                        break;
                    case GatewayDispatchEvents.MessageDeleteBulk:
                        for (const id of data.ids) {
                            deleteByMessage(id, data.channel_id, "MessageBulkDelete");
                        }
                        break;
                    case GatewayDispatchEvents.MessageDelete:
                        deleteByMessage(data.id, data.channel_id, "MessageDelete");
                        break;
                    case GatewayDispatchEvents.MessageUpdate: {
                        const instances = get(data.id, data.channel_id);
                        instances?.[0]?.update(data);
                        break;
                    }
                }
            },
        });
    }

    create<const O extends OptionsRecord | undefined = undefined, const C extends watcherCreateData = watcherCreateData>(
        ctx: C,
        options?: MessageWatcherCollectorOptions,
    ) {
        const { message, command, client } = ctx;
        if (!message) throw Error("CommandContext does not have a message");
        if (!command.options?.length) throw Error("The command has no options to watch");

        const id = createId(message);

        const instancesList = this.collectors.get(id);

        this.init();

        type OptionsType = O extends undefined ? (C extends CommandContext<infer R> ? R : {}) : O;

        const watcher = new MessageWatcherCollector<OptionsType>(
            this,
            client as Client | WorkerClient,
            message,
            command,
            ctx.shardId,
            options,
            ctx instanceof CommandContext ? ctx : undefined,
        );

        if (!instancesList) this.collectors.set(id, []);

        this.collectors.get(id)?.push(watcher);

        return watcher;
    }
}
