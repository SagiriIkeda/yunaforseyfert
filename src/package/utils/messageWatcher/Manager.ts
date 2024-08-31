import {
    type Client,
    type Command,
    CommandContext,
    type ContextOptionsResolved,
    type Message,
    type OnOptionsReturnObject,
    type OptionsRecord,
    type SubCommand,
    type UsingClient,
    type WorkerClient,
} from "seyfert";
import { Transformers } from "seyfert/lib/client/transformers";
import type { MakeRequired } from "seyfert/lib/common";
import type { APIMessage, GatewayMessageUpdateDispatchData } from "seyfert/lib/types";
import { type CommandUsable, Keys } from "../../things";
import { type WatchersController, createId } from "./Controller";
import { MessageWatcher } from "./Watcher";
import type { WatcherOptions } from "./types";

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

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
    async __handleUpdate(apiMessage: GatewayMessageUpdateDispatchData) {
        if (!apiMessage.content) return;

        /**
         * THIS IS BASED ON
         * https://github.com/tiramisulabs/seyfert/blob/main/src/commands/handle.ts
         */

        const content = apiMessage.content.trimStart();

        const { client } = this;

        const self = client as UsingClient;

        const newMessage = Transformers.Message(self, apiMessage);

        const { handleCommand } = client;

        this.prefixes ??= await client.options.commands?.prefix?.(newMessage);

        const prefix = this.prefixes?.reduce(
            (oldPrefix, prefix) => (content.startsWith(prefix) && prefix.length > (oldPrefix?.length ?? 0) ? prefix : oldPrefix),
            undefined as undefined | string,
        );

        if (!prefix) return this.emit("onUsageErrorEvent", "UnspecifiedPrefix");

        const slicedContent = content.slice(prefix.length);

        if (slicedContent === this.#oldContent) return;

        const { argsContent, command, parent } = handleCommand.resolveCommandFromContent(slicedContent, prefix, apiMessage);

        if (command !== this.command) return this.emit("onUsageErrorEvent", "CommandChanged", command);

        if (argsContent === undefined) return;

        const oldMessage = this.ctx?.messageResponse;

        const args = handleCommand.argsParser(argsContent, command, this.message);

        const resolved: MakeRequired<ContextOptionsResolved> = {
            channels: {},
            roles: {},
            users: {},
            members: {},
            attachments: {},
        };

        const { options: resolverOptions, errors } = await handleCommand.argsOptionsParser(command, apiMessage, args, resolved);

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

        const optionsResolver = handleCommand.makeResolver(self, resolverOptions, parent as Command, this.message.guildId, resolved);

        const ctx = new CommandContext<O>(self, newMessage, optionsResolver, this.shardId, command);
        //@ts-expect-error
        const [erroredOptions] = await command.__runOptions(ctx, optionsResolver);

        if (erroredOptions) return this.emit("onOptionsErrorEvent", erroredOptions);

        this.#oldContent = slicedContent;

        ctx.messageResponse = oldMessage;

        Object.assign(ctx, client.options.context?.(newMessage));
        this.ctx = ctx as CommandContext<O> & MakeCommand<__Command>;

        for (const watcher of this.watchers) {
            watcher.refreshTimers();
            watcher.onChangeEvent?.(ctx, apiMessage as RawMessageUpdated);
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
