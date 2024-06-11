import type { BaseMessage, CommandContext } from "seyfert";
import { type YunaMessageWatcherController, createId } from "./watcherController";
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

    #idle?: NodeJS.Timeout;
    #timeout?: NodeJS.Timeout;

    ctx: CommandContext;

    readonly id: string;

    invoker: YunaMessageWatcherController;

    constructor(invoker: YunaMessageWatcherController, message: BaseMessage, ctx: CommandContext, options?: MessageWatcherCollectorOptions) {
        const TenMinutes = 1000 * 60 * 10;

        this.invoker = invoker;

        this.ctx = ctx;
        this.options = { time: TenMinutes, ...(options ?? {}) };
        this.message = message;

        this.id = createId(message);
        this.refresh();
    }

    refresh() {
        const { idle, time } = this.options;

        if (time && !this.#timeout) {
            this.#timeout = setTimeout(() => this.stop("timeout"), time);
        }

        if (!idle) return;

        clearTimeout(this.#idle);

        this.#idle = setTimeout(() => this.stop("idle"), idle);
    }

    get instances() {
        return this.invoker.collectors.get(this.id) ?? [];
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
        clearTimeout(this.#idle);
        clearTimeout(this.#timeout);

        const { instances } = this;

        const instanceId = instances.indexOf(this);

        if (instanceId !== -1) instances.splice(instanceId, 1);
        if (instances.length === 0) this.invoker.collectors.delete(this.id)

        this.#onStopEvent?.(reason);
        return this;
    }
}
