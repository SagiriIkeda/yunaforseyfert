import type { BaseMessage, CommandContext } from "seyfert";
import MessageWatcherController, { createId } from "./watcherController";
import type { GatewayMessageUpdateDispatchData } from "discord-api-types/v10";

export type MessageWatcherCollectorOptions = {
    idle?: number;
    /** @default 10min */
    time?: number;
};



type OnChangeEvent = (message: GatewayMessageUpdateDispatchData) => any;
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

    get instances() {
        return MessageWatcherController.values.get(this.id) ?? [];
    }

    update(message: GatewayMessageUpdateDispatchData) {
        if (this.options.idle) this.refresh();


        for (const instance of this.instances) instance.onChangeEvent?.(message)
    }

    private onChangeEvent?: OnChangeEvent;

    onChange(callback: OnChangeEvent) {
        this.onChangeEvent = callback;
        return this;
    }

    #onStopEvent?: OnStopEvent;

    onStop(callback: OnStopEvent) {
        this.#onStopEvent = callback;
        return this;
    }

    stop(reason: string) {
        clearTimeout(this.#timer);

        const { instances } = this;

        const instanceId = instances.indexOf(this);

        if (instanceId !== -1) instances.splice(instanceId, 1);
        if (instances.length === 0) MessageWatcherController.values.delete(this.id)

        this.#onStopEvent?.(reason);
        return this;
    }
}
