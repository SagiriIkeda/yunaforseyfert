import {
    type Client,
    type Command,
    CommandContext,
    type ContextOptionsResolved,
    type Message,
    type OnOptionsReturnObject,
    OptionResolver,
    type OptionsRecord,
    type SubCommand,
    type User,
    type UsingClient,
    type WorkerClient,
} from "seyfert";
import { Transformers } from "seyfert/lib/client/transformers";
import { type MakeRequired, toSnakeCase } from "seyfert/lib/common";
import type { APIMessage, APIUser, GatewayMessageCreateDispatchData, GatewayMessageUpdateDispatchData } from "seyfert/lib/types";
import { type CommandUsable, Keys } from "../../things";
import { type WatchersController, createId } from "./Controller";
import { MessageWatcher } from "./Watcher";
import type { WatcherOptions } from "./types";

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

const createFakeApiUser = (user: User) => {
    const created: Record<string, any> = {};

    for (const [key, value] of Object.entries(user)) {
        if (typeof value === "function" || key === "client") continue;
        created[key.replace(/[A-Z]+/g, (r) => `_${r.toLowerCase()}`)] = value;
    }

    return created as APIUser;
};

type EventKeys<O extends OptionsRecord> = Extract<keyof MessageWatcher<O>, `on${string}Event`>;
type EventParams<O extends OptionsRecord, E extends EventKeys<O>> = Parameters<OmitThisParameter<NonNullable<MessageWatcher<O>[E]>>>;

type MessageResolvable = Pick<Message, "id" | "channelId"> | Pick<APIMessage, "id" | "channel_id"> | string;

export type MakeCommand<C> = { command: C };

export class MessageWatcherManager<const O extends OptionsRecord = any, Context = any, __Command extends CommandUsable = any> {
    message: Message;
    /** key where this is stored */
    readonly id: string;

    controller: WatchersController;

    client: Client | WorkerClient;
    command: __Command;
    shardId: number;

    declare context: Context;

    originCtx?: CommandContext<O> & MakeCommand<__Command>;
    ctx?: CommandContext<O> & MakeCommand<__Command>;

    watchers = new Set<MessageWatcher<O, Context, __Command>>();

    constructor(
        controller: WatchersController,
        client: Client | WorkerClient,
        message: Message,
        command: Command | SubCommand,
        shardId?: number,
        ctx?: CommandContext<O>,
    ) {
        this.originCtx = ctx as CommandContext<O> & MakeCommand<__Command>;
        this.ctx = ctx as CommandContext<O> & MakeCommand<__Command>;

        this.client = client;
        this.shardId = shardId ?? 1;
        this.controller = controller;
        this.command = command as __Command;

        this.message = message;

        this.id = createId(message);

        this.__fakeUser = createFakeApiUser(this.message.author);
        this.__fakeMessage = this.__createFakeApiMessage();
    }

    /** @internal */
    __fakeUser: APIUser;

    /** @internal */
    __fakeMessage: ReturnType<MessageWatcherManager<O>["__createFakeApiMessage"]>;
    /** @internal */
    __createFakeApiMessage(): Omit<GatewayMessageCreateDispatchData, "mentions" | `mention_${string}`> {
        const { message } = this;

        return {
            id: message.id,
            content: message.content,
            // biome-ignore lint/style/useNamingConvention: api
            channel_id: message.channelId,
            // biome-ignore lint/style/useNamingConvention: api
            guild_id: message.guildId,
            timestamp: message.timestamp?.toString() ?? "",
            // biome-ignore lint/style/useNamingConvention: api
            edited_timestamp: message.editedTimestamp!,
            tts: message.tts,
            embeds: message.embeds.map((embed) => embed.toJSON()),
            pinned: message.pinned,
            type: this.message.type,
            attachments: this.message.attachments.map(toSnakeCase),
            author: this.__fakeUser,
        };
    }

    #oldContent?: string;
    /** @internal */
    prefixes?: string[];

    /** @internal */
    emit<E extends EventKeys<O>>(event: E, ...parameters: EventParams<O, E>) {
        //@ts-expect-error
        for (const watcher of this.watchers) watcher[event]?.(...parameters);
    }

    /** @internal */
    async __handleUpdate(message: GatewayMessageUpdateDispatchData) {
        if (!message.content) return;

        /**
         * THIS IS BASED ON
         * https://github.com/tiramisulabs/seyfert/blob/main/src/commands/handle.ts
         */

        const content = message.content.trimStart();

        const { client } = this;

        const self = client as UsingClient;

        const fakeApiMessage: GatewayMessageCreateDispatchData = {
            ...this.__fakeMessage,
            ...message,
            author: this.__fakeUser,
            // biome-ignore lint/style/useNamingConvention: api
            mention_everyone: message.mention_everyone ?? this.message.mentionEveryone,
            // biome-ignore lint/style/useNamingConvention: api
            mention_roles: message.mention_roles ?? this.message.mentionRoles,
            // biome-ignore lint/style/useNamingConvention: api
            mention_channels: message.mention_channels ?? this.message.mentionChannels?.map(toSnakeCase) ?? [],
        };

        const newMessage = Transformers.Message(self, fakeApiMessage);

        const { handleCommand } = client;

        this.prefixes ??= await client.options.commands?.prefix?.(newMessage);

        const prefix = this.prefixes?.find((prefix) => content.startsWith(prefix));

        if (!prefix) return this.emit("onUsageErrorEvent", "UnspecifiedPrefix");

        const slicedContent = content.slice(prefix.length);

        if (slicedContent === this.#oldContent) return;

        const { argsContent, command, parent } = handleCommand.resolveCommandFromContent(slicedContent, prefix, fakeApiMessage);

        if (command !== this.command) return this.emit("onUsageErrorEvent", "CommandChanged", command);

        if (argsContent === undefined) return;

        const args = handleCommand.argsParser(argsContent, command, this.message);

        const resolved: MakeRequired<ContextOptionsResolved> = {
            channels: {},
            roles: {},
            users: {},
            members: {},
            attachments: {},
        };

        const { options: resolverOptions, errors } = await handleCommand.argsOptionsParser(command, fakeApiMessage, args, resolved);

        if (errors.length) {
            const errorsObject: OnOptionsReturnObject = Object.fromEntries(
                errors.map((x) => {
                    return [
                        x.name,
                        {
                            failed: true,
                            value: x.error,
                            parseError: x.fullError,
                        },
                    ];
                }),
            );
            this.emit("onOptionsErrorEvent", errorsObject);
            return;
        }

        const optionsResolver = new OptionResolver(self, resolverOptions, parent as Command, this.message.guildId, resolved);

        const ctx = new CommandContext<O>(self, newMessage, optionsResolver, this.shardId, command);
        //@ts-expect-error
        const [erroredOptions] = await command.__runOptions(ctx, optionsResolver);

        if (erroredOptions) return this.emit("onOptionsErrorEvent", erroredOptions);

        this.#oldContent = slicedContent;

        ctx.messageResponse = this.ctx?.messageResponse;

        Object.assign(ctx, client.options.context?.(newMessage));
        this.ctx = ctx as CommandContext<O> & MakeCommand<__Command>;

        for (const watcher of this.watchers) {
            watcher.refreshTimers();
            watcher.onChangeEvent?.(ctx, message as RawMessageUpdated);
        }
    }

    endReason?: string;

    /** @internal */
    stopWatcher(watcher: MessageWatcher<O>, reason: string, emit = true) {
        const isDeleted = this.watchers.delete(watcher);
        if (!isDeleted) return;

        watcher.endReason = reason;

        watcher.stopTimers();
        emit && watcher.onStopEvent?.(reason);

        if (this.watchers.size) return;

        this.controller.managers.delete(this.id);
        for (const id of this.responses.keys()) this.controller.responsesManagers.delete(id);
    }

    /** Original command.run without being modified by @Watch decorator **/
    get commandRun() {
        return (this.command[Keys.watcherRawCommandRun] ?? this.command.run) as __Command["run"];
    }

    /** stop this and all watchers in this manager */
    stop(reason: string) {
        this.endReason = reason;
        for (const watcher of this.watchers) this.stopWatcher(watcher, reason);
    }

    responses = new Map<string, boolean>();

    watchResponseDelete(message: MessageResolvable) {
        const isString = typeof message === "string";

        const id = isString ? message : message.id;
        const channelId = isString ? this.message.channelId : (message as APIMessage).channel_id ?? (message as Message).channelId;

        if (id === this.message.id && channelId === this.message.channelId) return;

        const cacheId = createId(id, channelId);

        if (this.responses.has(cacheId)) return;

        this.responses.set(cacheId, false);

        this.controller.responsesManagers.set(cacheId, this);
    }

    createId(messageId: string, channelId?: string) {
        return createId(messageId, channelId ?? this.message.channelId);
    }

    /** @internal */
    onResponseDeleteEvent(message: Pick<Message, "id" | "channelId">, rawId: string) {
        this.responses.set(rawId, true);
        this.controller.responsesManagers.delete(rawId);
        this.emit("onResponseDeleteEvent", message);
    }

    watch(options: WatcherOptions = {}) {
        const watcher = new MessageWatcher(this, options);

        this.watchers.add(watcher);

        return watcher;
    }
}
