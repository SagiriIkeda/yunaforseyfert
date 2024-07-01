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
import { MessageWatcherManager } from "./Manager.js";
import type { WatcherOptions } from "./types.js";

export function createId(message: string, channelId: string): string;
export function createId(message: BaseMessage): string;
export function createId(message: BaseMessage | string, channelId?: string): string {
    if (typeof message === "string") return `${channelId}.${message}`;
    return `${message.channelId}.${message.id}`;
}

type WatchersManagersCacheAdapter = Map<string, MessageWatcherManager> | LimitedCollection<string, MessageWatcherManager>;

export interface YunaMessageWatcherControllerConfig {
    client: UsingClient;
    cache?: WatchersManagersCacheAdapter;
}

export type FindWatcherQuery =
    | {
          messageId?: string;
          channelId?: string;
          guildId?: string;
          userId?: string;
          command?: Command | SubCommand;
      }
    | ((watcher: MessageWatcherManager) => boolean);

export type WatcherCreateData = Pick<CommandContext, "client" | "command" | "message" | "shardId">;

export type inferOptionsFromCtx<C> = C extends CommandContext<infer R> ? R : never;
export type inferWatcherFromCtx<C> = MessageWatcherManager<inferOptionsFromCtx<C>>;

export class WatchersController {
    /** watchers managers cache */
    managers: WatchersManagersCacheAdapter = new Map<string, MessageWatcherManager>();

    watching = false;

    client: UsingClient;

    constructor({ cache = new Map(), client }: YunaMessageWatcherControllerConfig) {
        this.client = client;
        this.managers = cache;
    }

    init() {
        if (this.watching) return;

        const { client } = this;

        this.watching = true;

        const cache = this.managers;

        const deleteBy = (data: { channelId: string } | { guildId: string }) => {
            const isChannel = "channelId" in data;

            const id = isChannel ? data.channelId : data.guildId;
            const key = isChannel ? "channelId" : "guildId";
            const errorName = isChannel ? "channelDelete" : "guildDelete";

            for (const instancesData of cache.values()) {
                const watcher = (instancesData as Exclude<typeof instancesData, MessageWatcherManager>).value ?? instancesData;

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
            filter: () => true,
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
                        for (const id of data.ids) deleteByMessage(id, data.channel_id, "MessageBulkDelete");
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
        options?: WatcherOptions,
    ) {
        const { message, command, client } = ctx;
        if (!message) throw Error("CommandContext does not have a message");
        if (!command.options?.length) throw Error("The command has no options to watch");

        const id = createId(message);

        const manager = this.managers.get(id);

        this.init();

        type OptionsType = O extends undefined ? (C extends CommandContext<infer R> ? R : {}) : O;

        if (!manager)
            this.managers.set(
                id,
                new MessageWatcherManager<OptionsType>(
                    this,
                    client as Client | WorkerClient,
                    message,
                    command,
                    ctx.shardId,
                    ctx instanceof CommandContext ? ctx : undefined,
                ),
            );

        const watcher = (this.managers.get(id) as MessageWatcherManager<OptionsType>)?.watch(options);

        return watcher;
    }

    getWatcherFromContext<C extends CommandContext>({ message }: C) {
        if (!message) return;
        const id = createId(message);
        return this.managers.get(id) as inferWatcherFromCtx<C> | undefined;
    }

    #baseSearch(query: Exclude<FindWatcherQuery, Function>, watcher: MessageWatcherManager) {
        if (query.guildId && watcher.message.guildId !== query.guildId) return false;
        if (query.channelId && watcher.message.channelId !== query.channelId) return false;
        if (query.messageId && watcher.message.id !== query.messageId) return false;
        if (query.userId && watcher.message.author.id !== query.userId) return false;
        if (query.command && watcher.command !== query.command) return false;
        return true;
    }

    *#findWatchers(query: FindWatcherQuery): Generator<MessageWatcherManager> {
        const searchFn = typeof query === "function" ? query : this.#baseSearch.bind(this, query);

        for (const value of this.managers.values()) {
            const watcher = (value as Exclude<typeof value, MessageWatcherManager<any>>).value ?? value;

            if (!watcher || searchFn(watcher) === false) continue;

            yield watcher;
        }
    }

    findWatcher(query: FindWatcherQuery): MessageWatcherManager | undefined {
        return this.#findWatchers(query).next().value;
    }

    findManyWatchers(query: FindWatcherQuery) {
        return Array.from(this.#findWatchers(query));
    }
}
