import { GatewayDispatchEvents } from "discord-api-types/v10";
import type { Client } from "seyfert";
import {
    type BaseMessage,
    type Command,
    CommandContext,
    type LimitedCollection,
    type OptionsRecord,
    type SubCommand,
    type UsingClient,
    type WorkerClient,
} from "seyfert";
import { MessageWatcher } from "./MessageWatcher";
import type { MessageObserver, ObserverOptions } from "./WatcherObserver";

export function createId(message: string, channelId: string): string;
export function createId(message: BaseMessage): string;
export function createId(message: BaseMessage | string, channelId?: string): string {
    if (typeof message === "string") return `${channelId}.${message}`;
    return `${message.channelId}.${message.id}`;
}

type CollectorsCacheAdapter = Map<string, MessageWatcher> | LimitedCollection<string, MessageWatcher>;

export interface YunaMessageWatcherControllerConfig {
    client: UsingClient;
    cache?: CollectorsCacheAdapter;
}

export type FindWatcherQuery =
    | {
          messageId?: string;
          channelId?: string;
          guildId?: string;
          userId?: string;
          command?: Command | SubCommand;
      }
    | ((watcher: MessageWatcher) => boolean);

export type WatcherCreateData = Pick<CommandContext, "client" | "command" | "message" | "shardId">;

export class WatchersController {
    watchers: CollectorsCacheAdapter = new Map<string, MessageWatcher>();

    watching = false;

    client: UsingClient;

    constructor({ cache = new Map(), client }: YunaMessageWatcherControllerConfig) {
        this.client = client;
        this.watchers = cache;
    }

    init() {
        if (this.watching) return;
        const { client } = this;

        this.watching = true;

        const cache = this.watchers;

        const deleteBy = (data: { channelId: string } | { guildId: string }) => {
            const isChannel = "channelId" in data;

            const id = isChannel ? data.channelId : data.guildId;
            const key = isChannel ? "channelId" : "guildId";
            const errorName = isChannel ? "channelDelete" : "guildDelete";

            for (const instancesData of cache.values()) {
                const watcher = (instancesData as Exclude<typeof instancesData, MessageWatcher>).value ?? instancesData;

                if (watcher.message[key] !== id) continue;
                watcher.stop(errorName);
            }
        };

        const get = (messageId: string, channelId: string) => {
            const id = createId(messageId, channelId);
            return cache.get(id);
        };

        const deleteByMessage = (messageId: string, channelId: string, reason: string) => {
            const watcher = get(messageId, channelId);
            watcher?.stop(reason);
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
                        get(data.id, data.channel_id)?.__handleUpdate(data);
                        break;
                    }
                }
            },
        });
    }

    create<const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(
        ctx: C,
        options?: ObserverOptions,
    ) {
        const { message, command, client } = ctx;
        if (!message) throw Error("CommandContext does not have a message");
        if (!command.options?.length) throw Error("The command has no options to watch");

        const id = createId(message);

        const watcher = this.watchers.get(id);

        this.init();

        type OptionsType = O extends undefined ? (C extends CommandContext<infer R> ? R : {}) : O;

        if (!watcher)
            this.watchers.set(
                id,
                new MessageWatcher<OptionsType>(
                    this,
                    client as Client | WorkerClient,
                    message,
                    command,
                    ctx.shardId,
                    ctx instanceof CommandContext ? ctx : undefined,
                ),
            );

        const observer = this.watchers.get(id)!.observe(options) as MessageObserver<MessageWatcher<OptionsType>>;

        return observer;
    }

    getWatcherFromContext({ message }: Pick<CommandContext, "message">) {
        if (!message) return;
        const id = createId(message);
        return this.watchers.get(id);
    }

    #baseSearch(query: Exclude<FindWatcherQuery, Function>, watcher: MessageWatcher) {
        if (query.guildId && watcher.message.guildId !== query.guildId) return false;
        if (query.channelId && watcher.message.channelId !== query.channelId) return false;
        if (query.messageId && watcher.message.id !== query.messageId) return false;
        if (query.userId && watcher.message.author.id !== query.userId) return false;
        if (query.command && watcher.command !== query.command) return false;
        return true;
    }

    *#findWatchers(query: FindWatcherQuery): Generator<MessageWatcher> {
        const searchFn = typeof query === "function" ? query : this.#baseSearch.bind(this, query);

        for (const value of this.watchers.values()) {
            const watcher = (value as Exclude<typeof value, MessageWatcher<any>>).value ?? value;

            if (watcher && searchFn(watcher) === true) {
                yield watcher;
            }
        }
    }

    findWatcher(query: FindWatcherQuery): MessageWatcher | undefined {
        return this.#findWatchers(query).next().value;
    }

    findManyWatchers(query: FindWatcherQuery) {
        return Array.from(this.#findWatchers(query));
    }
}
