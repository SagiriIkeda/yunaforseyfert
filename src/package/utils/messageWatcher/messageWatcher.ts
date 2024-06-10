import type { GatewayMessageUpdateDispatchData } from "discord-api-types/v10";
import type { BaseMessage, CommandContext } from "seyfert";
import MessageWatcherController, { createId } from "./watcherController";

export type MessageWatcherCollectorOptions = {
    idle?: number;
    /** @default 10min */
    time?: number;
};

type OnChangeEvent = (options: any) => any;
type OnStopEvent = (reason: string) => any;

export class MessageWatcherCollector {
    readonly options: MessageWatcherCollectorOptions;

    message: BaseMessage;

    #timer?: NodeJS.Timeout;
    ctx: CommandContext;

    readonly id: string;

    constructor(message: BaseMessage, ctx: CommandContext, options?: MessageWatcherCollectorOptions) {
        const TenMinutes = 1000 * 60 * 10;

        this.ctx = ctx;
        this.options = { time: TenMinutes, ...(options ?? {}) };
        this.message = message;

        this.id = createId(message);
        this.refresh();
    }

    refresh() {
        const timeout = this.options.idle ?? this.options.time;

        clearTimeout(this.#timer);

        this.#timer = setTimeout(() => {
            this.stop(this.options.idle ? "idle" : "timeout")
        }, timeout);
    }

    update(message: GatewayMessageUpdateDispatchData) {
        if (this.options.idle) this.refresh();

        for (const callback of this.#onStopEvents) callback("🐧");
    }

    /** @internal */
    #onChangeEvents: OnChangeEvent[] = [];

    onChange(callback: OnChangeEvent) {
        this.#onChangeEvents.push(callback);
        return this;
    }

    #onStopEvents: OnStopEvent[] = [];

    onStop(callback: OnStopEvent) {
        this.#onStopEvents.push(callback);
        return this;
    }

    stop(reason: string) {
        clearTimeout(this.#timer);
        MessageWatcherController.values.delete(this.id);

        for (const callback of this.#onStopEvents) callback(reason);
    }
}
