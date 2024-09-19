import type { Client, Message, OptionsRecord, WorkerClient } from "seyfert";
import type { CommandUsable } from "../../things";
import type { WatchersController } from "./Controller";
import type { MessageWatcherManager } from "./Manager";
import type {
    WatcherOnChangeEvent,
    WatcherOnOptionsErrorEvent,
    WatcherOnResponseDelete,
    WatcherOnStopEvent,
    WatcherOnUsageErrorEvent,
    WatcherOptions,
} from "./types";

export class MessageWatcher<const O extends OptionsRecord = any, Context = any, __Command extends CommandUsable = any> {
    readonly options: WatcherOptions;

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    #endTimeout = 0;
    #endIdle = 0;

    message: Message;
    controller: WatchersController;
    manager: MessageWatcherManager<O, Context, __Command>;
    client: Client | WorkerClient;
    command: __Command;
    shardId: number;

    /** context of the watcher manager */
    get context() {
        return this.manager.context as Context;
    }

    constructor(manager: MessageWatcherManager<O>, options: WatcherOptions = {}) {
        this.options = options;
        this.message = manager.message;
        this.manager = manager;
        this.controller = manager.controller;
        this.client = manager.client;
        this.command = manager.command as __Command;
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

    get remainingTime() {
        const self = this;

        return {
            get idle() {
                return self.#endIdle - Date.now();
            },
            get timeout() {
                return self.#endTimeout - Date.now();
            },
        };
    }
    /** Original command.run without being modified by @Watch decorator **/
    get commandRun() {
        return this.manager.commandRun;
    }

    get ctx() {
        return this.manager.ctx;
    }

    get originCtx() {
        return this.manager.originCtx;
    }
    refreshTimers(all = false) {
        const { idle, time } = this.options;

        if (time && (all || !this.#timeout)) {
            clearTimeout(this.#timeout);
            this.#timeout = setTimeout(() => this.stop("timeout"), time);
            this.#endTimeout = Date.now() + time;
        }

        if (!idle) return;

        clearTimeout(this.#idle);

        this.#idle = setTimeout(() => this.stop("idle"), idle);
        this.#endIdle = Date.now() + idle;
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
    onResponseDeleteEvent?: WatcherOnResponseDelete<this>;

    onResponseDelete(callback: WatcherOnResponseDelete<this>) {
        this.onResponseDeleteEvent = callback.bind(this);
        return this;
    }

    get responses() {
        return this.manager.responses;
    }
    get watchResponseDelete() {
        return this.manager.watchResponseDelete.bind(this.manager);
    }

    get createId() {
        return this.manager.createId.bind(this.manager);
    }

    /** @internal */
    onStopEvent?: WatcherOnStopEvent<this>;

    onStop(callback: WatcherOnStopEvent<this>) {
        this.onStopEvent = callback.bind(this);
        return this;
    }

    endReason?: string;

    /** stop this watcher */
    stop(reason: string) {
        return this.manager.stopWatcher(this, reason);
    }
    /** literally stop, but without emitting the `onStop` event */
    break() {
        return this.manager.stopWatcher(this, "WatcherBreak", false);
    }

    setContext<const C extends Context>(context: C) {
        this.manager.context = context;
        return this as unknown as MessageWatcher<O, C, __Command>;
    }
}
