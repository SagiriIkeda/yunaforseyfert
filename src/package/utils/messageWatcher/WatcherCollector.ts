import type { APIUser, GatewayMessageCreateDispatchData, GatewayMessageUpdateDispatchData } from "discord-api-types/v10";

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
import { type YunaMessageWatcherController, createId } from "./WatcherController";

export type MessageWatcherCollectorOptions = {
    idle?: number;
    time?: number;
};

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

export type OnChangeEvent<O extends OptionsRecord> = (ctx: CommandContext<O>, rawMessage: RawMessageUpdated) => any;
export type OnStopEvent = (reason: string) => any;
export type OnOptionsErrorEvent = (data: OnOptionsReturnObject) => any;

interface UsageErrorEvents {
    UnspecifiedPrefix: [];
    CommandChanged: [newCommand: Command | SubCommand | undefined];
}

export type OnUsageErrorEvent = <E extends keyof UsageErrorEvents>(reason: E, ...params: UsageErrorEvents[E]) => any;

const createFakeAPIUser = (user: User) => {
    const created: Record<string, any> = {};

    for (const [key, value] of Object.entries(user)) {
        if (typeof value === "function" || key === "client") continue;
        created[key.replace(/[A-Z]+/g, (r) => `_${r.toLowerCase()}`)] = value;
    }

    return created as APIUser;
};

export class MessageWatcherCollector<const O extends OptionsRecord> {
    readonly options: MessageWatcherCollectorOptions;

    message: Message;

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    readonly id: string;

    controller: YunaMessageWatcherController;

    /** @internal */
    fakeUser: APIUser;

    client: Client | WorkerClient;

    command: Command | SubCommand;
    shardId: number;

    originCtx?: CommandContext<O>;
    ctx?: CommandContext<O>;

    constructor(
        invoker: YunaMessageWatcherController,
        client: Client | WorkerClient,
        message: Message,
        command: Command | SubCommand,
        shardId?: number,
        options?: MessageWatcherCollectorOptions,
        ctx?: CommandContext<O>,
    ) {
        this.originCtx = ctx;
        this.ctx = ctx;

        this.client = client;
        this.shardId = shardId ?? 1;
        this.controller = invoker;
        this.command = command;

        this.options = options ?? {};
        this.message = message;

        this.id = createId(message);

        this.fakeUser = this.instances[0]?.fakeUser ?? createFakeAPIUser(this.message.author);
        this.fakeMessage = this.instances[0]?.fakeMessage ?? this.createFakeAPIMessage();
        this.prefixes = this.instances[0]?.prefixes;

        this.refresh();
    }

    refresh(all = false) {
        const { idle, time } = this.options;

        if (time && (all || !this.#timeout)) {
            clearTimeout(this.#timeout);
            this.#timeout = setTimeout(() => this.stop("timeout"), time);
        }

        if (!idle) return;

        clearTimeout(this.#idle);

        this.#idle = setTimeout(() => this.stop("idle"), idle);
    }

    /** @internal */
    fakeMessage: ReturnType<MessageWatcherCollector<O>["createFakeAPIMessage"]>;
    /** @internal */
    createFakeAPIMessage(): Omit<GatewayMessageCreateDispatchData, "mentions" | `mention_${string}`> {
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
            author: this.fakeUser,
        };
    }

    resetTimers() {
        return this.refresh(true);
    }

    get instances() {
        return this.controller.collectors.get(this.id) ?? [];
    }

    #oldContent?: string;
    /** @internal */
    prefixes?: string[];

    /** @internal */
    async update(message: GatewayMessageUpdateDispatchData) {
        if (!message.content) return;

        /**
         * THIS IS BASED ON
         * https://github.com/tiramisulabs/seyfert/blob/main/src/commands/handle.ts
         */

        const content = message.content.trimStart();

        type EventKeys = Extract<keyof MessageWatcherCollector<O>, `on${string}Event`>;
        type EventParams<E extends EventKeys> = Parameters<NonNullable<MessageWatcherCollector<O>[E]>>;

        const runForAll = <E extends EventKeys>(event: E, ...parameters: EventParams<E>) => {
            //@ts-expect-error
            for (const instance of this.instances) instance[event]?.(...parameters);
        };

        const { client } = this;

        const self = client as UsingClient;

        const fakeAPIMessage: GatewayMessageCreateDispatchData = {
            ...this.fakeMessage,
            ...message,
            author: this.fakeUser,
            mention_everyone: message.mention_everyone ?? this.message.mentionEveryone,
            mention_roles: message.mention_roles ?? this.message.mentionRoles,
            mention_channels: message.mention_channels ?? this.message.mentionChannels?.map(toSnakeCase) ?? [],
        };

        const newMessage = Transformers.Message(self, fakeAPIMessage);

        const { handleCommand } = client;

        this.prefixes ??= await client.options.commands?.prefix?.(newMessage);

        const prefix = this.prefixes?.find((prefix) => content.startsWith(prefix));

        if (!prefix) return runForAll("onUsageErrorEvent", "UnspecifiedPrefix");

        const slicedContent = content.slice(prefix.length);

        if (slicedContent === this.#oldContent) return;

        const { argsContent, command, parent } = handleCommand.resolveCommandFromContent(slicedContent, prefix, fakeAPIMessage);

        if (command !== this.command) return runForAll("onUsageErrorEvent", "CommandChanged", command);

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
            runForAll("onOptionsErrorEvent", errorsObject);
            return;
        }

        const optionsResolver = new OptionResolver(self, resolverOptions, parent as Command, this.message.guildId, resolved);

        const ctx = new CommandContext<O>(self, newMessage, optionsResolver, this.shardId, command);
        //@ts-expect-error
        const [erroredOptions] = await command.__runOptions(ctx, optionsResolver);

        if (erroredOptions) return runForAll("onOptionsErrorEvent", erroredOptions);

        this.#oldContent = slicedContent;

        ctx.messageResponse = this.originCtx?.messageResponse;

        Object.assign(ctx, client.options.context?.(newMessage));

        for (const instance of this.instances) instance.ctx = ctx;

        runForAll("onChangeEvent", ctx, message as RawMessageUpdated);
    }

    /** @internal */
    onOptionsErrorEvent?: OnOptionsErrorEvent;

    onOptionsError(callback: OnOptionsErrorEvent) {
        this.onOptionsErrorEvent = callback;
        return this;
    }
    /** @internal */
    onChangeEvent?: OnChangeEvent<O>;

    onChange(callback: OnChangeEvent<O>) {
        this.onChangeEvent = callback;
        return this;
    }

    /** @internal */
    onUsageErrorEvent?: OnUsageErrorEvent;

    onUsageError(callback: OnUsageErrorEvent) {
        this.onUsageErrorEvent = callback;
        return this;
    }
    /** @internal */
    onStopEvent?: OnStopEvent;

    onStop(callback: OnStopEvent) {
        this.onStopEvent = callback;
        return this;
    }
    /** stop all instances */
    stopAll(reason: string) {
        for (const instance of this.instances) {
            instance.stop(reason);
        }
    }
    /** stop this instance */
    stop(reason: string) {
        clearTimeout(this.#idle);
        clearTimeout(this.#timeout);

        const { instances } = this;

        const instanceId = instances.indexOf(this);

        if (instanceId !== -1) instances.splice(instanceId, 1);
        if (instances.length === 0) this.controller.collectors.delete(this.id);

        this.onStopEvent?.(reason);
        return this;
    }
}
