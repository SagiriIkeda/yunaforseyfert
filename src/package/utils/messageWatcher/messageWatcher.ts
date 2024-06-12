import type { APIUser, GatewayMessageCreateDispatchData, GatewayMessageUpdateDispatchData } from "discord-api-types/v10";
import {
    type Client,
    type Command,
    CommandContext,
    type ContextOptions,
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
import { type MakeRequired, toSnakeCase } from "seyfert/lib/common";
import { type YunaMessageWatcherController, createId } from "./watcherController";

export type MessageWatcherCollectorOptions = {
    idle?: number;
    time?: number;
    abortOnUsageError?: boolean;
};

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

type OnChangeEvent<O extends OptionsRecord = any> = (result: ContextOptions<O>, rawMessage: RawMessageUpdated) => any;
type OnStopEvent = (reason: string) => any;
type OnOptionsErrorEvent = (metadata: OnOptionsReturnObject) => any;

type OnUsageErrorEvent = (reason: "PrefixChanged" | "CommandChanged") => any;

const createFakeAPIUser = (user: User) => {
    const created: Record<string, any> = {};

    for (const [key, value] of Object.entries(user)) {
        if (typeof value === "function" || key === "client") continue;
        created[key.replace(/[A-Z]+/g, (r) => `_${r.toLowerCase()}`)] = value;
    }

    return created as APIUser;
};

export class MessageWatcherCollector<const O extends OptionsRecord = any> {
    readonly options: MessageWatcherCollectorOptions;

    message: Message;

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    readonly id: string;

    invoker: YunaMessageWatcherController;

    protected user: APIUser;

    prefix: string;
    command: Command | SubCommand;
    shardId: number;

    constructor(
        invoker: YunaMessageWatcherController,
        message: Message,
        prefix: string,
        command: Command | SubCommand,
        shardId?: number,
        options?: MessageWatcherCollectorOptions,
    ) {
        this.shardId = shardId ?? 1;
        this.invoker = invoker;
        this.prefix = prefix;
        this.command = command;

        this.options = options ?? {};
        this.message = message;

        this.id = createId(message);
        this.refresh();

        this.user = this.instances[0]?.user ?? createFakeAPIUser(this.message.author);

        if (options?.abortOnUsageError) {
            for (const instance of this.instances) {
                instance.options.abortOnUsageError = true;
            }
        }
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

    resetTimers() {
        return this.refresh(true);
    }

    get instances() {
        return this.invoker.collectors.get(this.id) ?? [];
    }

    async update(message: GatewayMessageUpdateDispatchData) {
        if (!message.content) return;
        if (this.options.idle) this.refresh();

        const prefix = this.message.prefix!;
        const c = message.content.trimStart();

        type EventKeys = Extract<keyof MessageWatcherCollector<O>, `on${string}Event`>;
        type EventParams<E extends EventKeys> = Parameters<NonNullable<MessageWatcherCollector<O>[E]>>;

        const runForAll = <E extends EventKeys>(event: E, ...parameters: EventParams<E>) => {
            //@ts-expect-error
            for (const instance of this.instances) instance[event]?.(...parameters);
        };

        const abortAll = (reason: string) => {
            if (this.options.abortOnUsageError) {
                this.stopAll(reason);
            }
        };

        const usageError = (error: EventParams<"onUsageErrorEvent">[0]) => {
            abortAll(error);
            return runForAll("onUsageErrorEvent", error);
        };

        if (!c.startsWith(prefix)) return usageError("PrefixChanged");

        const client = this.message.client as Client | WorkerClient;

        const { resolver, argsParser, optionsParser } = client.options.commands ?? {};

        if (!(resolver && argsParser && optionsParser)) return;

        const { argsContent, command, parent } = resolver(client as UsingClient, prefix, c.slice(prefix.length), this.message);

        if (command !== this.command) return usageError("CommandChanged");

        const args = argsParser(argsContent, command, this.message);

        /**
         * THIS IS BASED IN
         * https://github.com/tiramisulabs/seyfert/blob/main/src/client/onmessagecreate.ts
         */

        const resolved: MakeRequired<ContextOptionsResolved> = {
            channels: {},
            roles: {},
            users: {},
            members: {},
            attachments: {},
        };

        /** i hate need to do this. */
        const fakeAPIMessage: GatewayMessageCreateDispatchData = {
            ...message,
            content: (message.content ?? this.message.content)!,
            timestamp: message.timestamp!,
            edited_timestamp: message.edited_timestamp!,
            tts: message.tts ?? this.message.tts,
            mention_everyone: message.mention_everyone ?? this.message.mentionEveryone,
            mention_roles: message.mention_roles ?? this.message.mentionRoles,
            mention_channels: message.mention_channels ?? this.message.mentionChannels?.map(toSnakeCase) ?? [],
            embeds: message.embeds ?? this.message.embeds.map((embed) => embed.toJSON()),
            pinned: message.pinned ?? this.message.pinned,
            type: this.message.type,
            attachments: message.attachments ?? this.message.attachments.map(toSnakeCase),
            author: this.user,
        };

        const { options: resolverOptions, errors } = await optionsParser(client as UsingClient, command, fakeAPIMessage, args, resolved);

        const optionsError = (descriptor: OnOptionsReturnObject) => {
            abortAll("OptionsError");
            runForAll("onOptionsErrorEvent", descriptor);
        };

        if (errors) {
            const descriptor: OnOptionsReturnObject = Object.fromEntries(
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
            optionsError(descriptor);
        }

        const optionsResolver = new OptionResolver(
            client as UsingClient,
            resolverOptions,
            parent as Command,
            this.message.guildId,
            resolved,
        );

        const ctx = new CommandContext<O>(client as UsingClient, this.message, optionsResolver, this.shardId, command);
        /** @ts-expect-error */
        const [erroredOptions] = await command.__runOptions(ctx, optionsResolver);

        if (erroredOptions) return optionsError(erroredOptions);

        runForAll("onChangeEvent", ctx.options, message as RawMessageUpdated);
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

    stopAll(reason: string) {
        for (const instance of this.instances) {
            instance.stop(reason);
        }
    }

    stop(reason: string) {
        clearTimeout(this.#idle);
        clearTimeout(this.#timeout);

        const { instances } = this;

        const instanceId = instances.indexOf(this);

        if (instanceId !== -1) instances.splice(instanceId, 1);
        if (instances.length === 0) this.invoker.collectors.delete(this.id);

        this.onStopEvent?.(reason);
        return this;
    }
}
