import type { BaseMessage, CommandContext, Message } from "seyfert";

const cache = new Map<string, MessageWatcherCollector>();

const id = (message: BaseMessage) => `${message.channelId}.${message.id}`;

type MessageWatcherCollectorOptions = {
    idle?: number;

    /** @default 10min */
    time?: number;
};

let isStarted = false;

export function createMessageWatcher(
    this: { message: Message; ctx: CommandContext },
    options: Omit<MessageWatcherCollectorOptions, "ctx">,
) {
    const { message, ctx } = this;
    const wId = id(message);

    if (cache.has(wId)) throw Error("Already Watching this.");

    if (!isStarted) {
        isStarted = true;
    }

    const watcher = new MessageWatcherCollector(message, ctx, options);

    return watcher;
}

type OnChangeEvent = (options: any) => any;
type OnStopEvent = (reason: string) => any;

class MessageWatcherCollector {
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

        this.id = id(message);

        cache.set(this.id, this);
        this.refresh();
    }

    refresh() {
        const timeout = this.options.idle ?? this.options.time;

        clearTimeout(this.#timer);

        this.#timer = setTimeout(() => { }, timeout);
    }

    update(message: Message) {
        if (this.options.idle) this.refresh();

        this.#onChange?.("🐧")
    }

    /** @internal */
    #onChange?: OnChangeEvent;

    onChange(callback: OnChangeEvent) {
        this.#onChange = callback;
        return this;
    }

    #onStop?: OnStopEvent;

    onStop(callback: OnStopEvent) {
        this.#onStop = callback;
        return this;
    }

    stop(reason: string) {
        clearTimeout(this.#timer);
        cache.delete(this.id);
        this.#onStop?.(reason);
    }
}
