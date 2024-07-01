import type { Client, Command, CommandContext, Message, OptionsRecord, SubCommand, WorkerClient } from "seyfert";
import type { WatchersController } from "./Controller";
import type { MessageWatcherManager } from "./Manager";
import type {
    WatcherOnChangeEvent,
    WatcherOnOptionsErrorEvent,
    WatcherOnStopEvent,
    WatcherOnUsageErrorEvent,
    WatcherOptions,
} from "./types";

export class MessageWatcher<const O extends OptionsRecord = any> {
    readonly options: WatcherOptions;

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    message: Message;
    controller: WatchersController;
    manager: MessageWatcherManager<O>;
    client: Client | WorkerClient;
    command: Command | SubCommand;
    shardId: number;

    constructor(manager: MessageWatcherManager<O>, options: WatcherOptions = {}) {
        this.options = options;
        this.message = manager.message;
        this.manager = manager;
        this.controller = manager.controller;
        this.client = manager.client;
        this.command = manager.command;
        this.shardId = manager.shardId;

        this.refreshTimers();
    }
    /** key where the watcher is stored */
    get id() {
        return this.manager.id;
    }

    get position() {
        let i = 0;

        for (const watcher of this.manager.watchers) {
            if (watcher === this) return i;
            i++;
        }

        return null;
    }

    get ctx(): CommandContext<O> | undefined {
        return this.manager.ctx;
    }

    get originCtx(): CommandContext<O> | undefined {
        return this.manager.originCtx;
    }
    refreshTimers(all = false) {
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
        return this.refreshTimers(true);
    }

    stopTimers() {
        clearTimeout(this.#idle);
        clearTimeout(this.#timeout);
    }

    /** @internal */
    onOptionsErrorEvent?: WatcherOnOptionsErrorEvent<this>;

    onOptionsError(callback: WatcherOnOptionsErrorEvent<this>) {
        this.onOptionsErrorEvent = callback.bind(this);
        return this;
    }
    /** @internal */
    onChangeEvent?: WatcherOnChangeEvent<this, O>;

    onChange(callback: WatcherOnChangeEvent<this, O>) {
        this.onChangeEvent = callback.bind(this);
        return this;
    }

    /** @internal */
    onUsageErrorEvent?: WatcherOnUsageErrorEvent<this>;

    onUsageError(callback: WatcherOnUsageErrorEvent<this>) {
        this.onUsageErrorEvent = callback.bind(this) as WatcherOnUsageErrorEvent<this>;
        return this;
    }
    /** @internal */
    onStopEvent?: WatcherOnStopEvent<this>;

    onStop(callback: WatcherOnStopEvent<this>) {
        this.onStopEvent = callback.bind(this);
        return this;
    }

    /** stop this watcher */
    stop(reason: string) {
        return this.manager.stopWatcher(this, reason);
    }
}
