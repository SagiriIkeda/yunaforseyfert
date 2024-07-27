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
import type { APIUser, GatewayMessageCreateDispatchData, GatewayMessageUpdateDispatchData } from "seyfert/lib/types";
import { type WatchersController, createId } from "./Controller";
import { MessageWatcher } from "./Watcher";
import type { WatcherOptions } from "./types";

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

const createFakeAPIUser = (user: User) => {
    const created: Record<string, any> = {};

    for (const [key, value] of Object.entries(user)) {
        if (typeof value === "function" || key === "client") continue;
        created[key.replace(/[A-Z]+/g, (r) => `_${r.toLowerCase()}`)] = value;
    }

    return created as APIUser;
};

type EventKeys<O extends OptionsRecord> = Extract<keyof MessageWatcher<O>, `on${string}Event`>;
type EventParams<O extends OptionsRecord, E extends EventKeys<O>> = Parameters<OmitThisParameter<NonNullable<MessageWatcher<O>[E]>>>;

export class MessageWatcherManager<const O extends OptionsRecord = any> {
    message: Message;
    /** key where this is stored */
    readonly id: string;

    controller: WatchersController;

    client: Client | WorkerClient;
    command: Command | SubCommand;
    shardId: number;

    originCtx?: CommandContext<O>;
    ctx?: CommandContext<O>;

    watchers = new Set<MessageWatcher<O>>();

    constructor(
        controller: WatchersController,
        client: Client | WorkerClient,
        message: Message,
        command: Command | SubCommand,
        shardId?: number,
        ctx?: CommandContext<O>,
    ) {
        this.originCtx = ctx;
        this.ctx = ctx;

        this.client = client;
        this.shardId = shardId ?? 1;
        this.controller = controller;
        this.command = command;

        this.message = message;

        this.id = createId(message);

        this.__fakeUser = createFakeAPIUser(this.message.author);
        this.__fakeMessage = this.__createFakeAPIMessage();
    }

    /** @internal */
    __fakeUser: APIUser;

    /** @internal */
    __fakeMessage: ReturnType<MessageWatcherManager<O>["__createFakeAPIMessage"]>;
    /** @internal */
    __createFakeAPIMessage(): Omit<GatewayMessageCreateDispatchData, "mentions" | `mention_${string}`> {
        const { message } = this;

        return {
            id: message.id,
            content: message.content,
            channel_id: message.channelId,
            guild_id: message.guildId,
            timestamp: message.timestamp?.toString() ?? "",
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

        const fakeAPIMessage: GatewayMessageCreateDispatchData = {
            ...this.__fakeMessage,
            ...message,
            author: this.__fakeUser,
            mention_everyone: message.mention_everyone ?? this.message.mentionEveryone,
            mention_roles: message.mention_roles ?? this.message.mentionRoles,
            mention_channels: message.mention_channels ?? this.message.mentionChannels?.map(toSnakeCase) ?? [],
        };

        const newMessage = Transformers.Message(self, fakeAPIMessage);

        const { handleCommand } = client;

        this.prefixes ??= await client.options.commands?.prefix?.(newMessage);

        const prefix = this.prefixes?.find((prefix) => content.startsWith(prefix));

        if (!prefix) return this.emit("onUsageErrorEvent", "UnspecifiedPrefix");

        const slicedContent = content.slice(prefix.length);

        if (slicedContent === this.#oldContent) return;

        const { argsContent, command, parent } = handleCommand.resolveCommandFromContent(slicedContent, prefix, fakeAPIMessage);

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

        const { options: resolverOptions, errors } = await handleCommand.argsOptionsParser(command, fakeAPIMessage, args, resolved);

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

        ctx.messageResponse = this.originCtx?.messageResponse;

        Object.assign(ctx, client.options.context?.(newMessage));
        this.ctx = ctx;

        this.emit("onChangeEvent", ctx, message as RawMessageUpdated);
    }

    /** @internal */
    stopWatcher(watcher: MessageWatcher<O>, reason: string) {
        const isDeleted = this.watchers.delete(watcher);
        if (!isDeleted) return;

        watcher.stopTimers();
        watcher.onStopEvent?.(reason);

        if (this.watchers.size) return;

        this.controller.managers.delete(this.id);
    }

    /** stop this and all watchers in this manager */
    stop(reason: string) {
        for (const observer of this.watchers) this.stopWatcher(observer, reason);
    }

    watch(options: WatcherOptions = {}) {
        const observer = new MessageWatcher(this, options);

        this.watchers.add(observer);

        return observer;
    }
}
