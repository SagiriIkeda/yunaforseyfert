import type { Command, CommandContext, Message, OnOptionsReturnObject, OptionsRecord, SubCommand } from "seyfert";
import type { Awaitable, MakeRequired } from "seyfert/lib/common";
import type { GatewayMessageUpdateDispatchData } from "seyfert/lib/types";
import type { YunaUsable } from "../../things";
import type { MessageWatcher } from "./Watcher";

export type WatcherOptions = {
    idle?: number;
    time?: number;
};

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

export type WatcherOnChangeEvent<M extends MessageWatcher, O extends OptionsRecord> = (
    this: M,
    ctx: CommandContext<O>,
    rawMessage: RawMessageUpdated,
) => any;

export type WatcherOnMessageResponseDelete<M extends MessageWatcher> = (this: M, message: Pick<Message, "id" | "channelId">) => any;
export type WatcherOnStopEvent<M extends MessageWatcher> = (this: M, reason: string) => any;
export type WatcherOnOptionsErrorEvent<M extends MessageWatcher> = (this: M, data: OnOptionsReturnObject) => any;

interface WatcherUsageErrorEvents {
    // biome-ignore lint/style/useNamingConvention: 🐧
    UnspecifiedPrefix: [];
    // biome-ignore lint/style/useNamingConvention: 🐧
    CommandChanged: [newCommand: Command | SubCommand | undefined];
}

export type WatcherOnUsageErrorEvent<M extends MessageWatcher> = <E extends keyof WatcherUsageErrorEvents>(
    this: M,
    reason: E,
    ...params: WatcherUsageErrorEvents[E]
) => any;

export interface DecoratorWatchOptions<
    C extends YunaUsable,
    O extends OptionsRecord,
    Context,
    M extends MessageWatcher<O, Context, C> = MessageWatcher<O, Context, C>,
> extends WatcherOptions {
    /**
     * It will be emitted before creating the watcher,
     * if you return `false` it will not be created.
     */
    beforeCreate?(this: C, ctx: CommandContext<O>): Awaitable<boolean> | void;
    /** filters the execution of the `onChange` event */
    filter?(...args: Parameters<WatcherOnChangeEvent<MessageWatcher<O>, O>>): boolean;
    onStop?: WatcherOnStopEvent<M>;
    onChange?: WatcherOnChangeEvent<M, O>;
    onUsageError?: WatcherOnUsageErrorEvent<M>;
    onOptionsError?: WatcherOnOptionsErrorEvent<M>;
    onMessageResponseDelete?: WatcherOnMessageResponseDelete<M>;
}
