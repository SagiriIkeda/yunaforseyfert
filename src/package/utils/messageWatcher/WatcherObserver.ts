import type { GatewayMessageUpdateDispatchData } from "discord-api-types/v10";

import type { Client, Command, CommandContext, Message, OnOptionsReturnObject, OptionsRecord, SubCommand, WorkerClient } from "seyfert";
import type { MakeRequired } from "seyfert/lib/common";
import type { MessageWatcher } from "./MessageWatcher";
import type { WatchersController } from "./WatcherController";

export type ObserverOptions = {
    idle?: number;
    time?: number;
};

type RawMessageUpdated = MakeRequired<GatewayMessageUpdateDispatchData, "content">;

export type OnChangeEvent<M extends MessageObserver, O extends OptionsRecord> = (
    this: M,
    ctx: CommandContext<O>,
    rawMessage: RawMessageUpdated,
) => any;
export type OnStopEvent<M extends MessageObserver> = (this: M, reason: string) => any;
export type OnOptionsErrorEvent<M extends MessageObserver> = (this: M, data: OnOptionsReturnObject) => any;

interface UsageErrorEvents {
    UnspecifiedPrefix: [];
    CommandChanged: [newCommand: Command | SubCommand | undefined];
}

export type OnUsageErrorEvent<M extends MessageObserver> = <E extends keyof UsageErrorEvents>(
    this: M,
    reason: E,
    ...params: UsageErrorEvents[E]
) => any;

type Options<M extends MessageWatcher> = M extends MessageWatcher<infer R> ? R : any;

export class MessageObserver<const M extends MessageWatcher = any> {
    readonly options: ObserverOptions;

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    message: Message;
    controller: WatchersController;
    watcher: M;
    client: Client | WorkerClient;
    command: Command | SubCommand;
    shardId: number;

    constructor(watcher: M, options?: ObserverOptions) {
        this.options = options ?? {};
        this.message = watcher.message;
        this.watcher = watcher;
        this.controller = watcher.controller;
        this.client = watcher.client;
        this.command = watcher.command;
        this.shardId = watcher.shardId;

        this.refresh();
    }
    /** key where the watcher is stored */
    get id() {
        return this.watcher.id;
    }

    get position() {
        let i = 0;

        for (const watcher of this.watcher.observers) {
            if (watcher === this) return i;
            i++;
        }

        return null;
    }

    get ctx(): CommandContext<Options<M>> | undefined {
        return this.watcher.ctx;
    }

    get originCtx(): CommandContext<Options<M>> | undefined {
        return this.watcher.originCtx;
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

    stopTimers() {
        clearTimeout(this.#idle);
        clearTimeout(this.#timeout);
    }

    /** @internal */
    onOptionsErrorEvent?: OnOptionsErrorEvent<this>;

    onOptionsError(callback: OnOptionsErrorEvent<this>) {
        this.onOptionsErrorEvent = callback.bind(this);
        return this;
    }
    /** @internal */
    onChangeEvent?: OnChangeEvent<this, Options<M>>;

    onChange(callback: OnChangeEvent<this, Options<M>>) {
        this.onChangeEvent = callback.bind(this);
        return this;
    }

    /** @internal */
    onUsageErrorEvent?: OnUsageErrorEvent<this>;

    onUsageError(callback: OnUsageErrorEvent<this>) {
        this.onUsageErrorEvent = callback.bind(this) as OnUsageErrorEvent<this>;
        return this;
    }
    /** @internal */
    onStopEvent?: OnStopEvent<this>;

    onStop(callback: OnStopEvent<this>) {
        this.onStopEvent = callback.bind(this);
        return this;
    }
    /** stop all observers to this watcher */
    stopAll(reason: string) {
        return this.watcher.stop(reason);
    }
    /** stop this observer */
    stop(reason: string) {
        return this.watcher.stopObserver(this, reason);
    }
}
