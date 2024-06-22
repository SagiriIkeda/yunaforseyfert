import type { CommandContext, OptionsRecord } from "seyfert";
import type { Awaitable } from "seyfert/lib/common";
import type { YunaUsable } from "../../things";
import type {
    MessageWatcherCollector,
    MessageWatcherCollectorOptions,
    OnChangeEvent,
    OnOptionsErrorEvent,
    OnStopEvent,
    OnUsageErrorEvent,
} from "./WatcherCollector";
import { createWatcher } from "./controllerUtils";

type Event<E extends (...args: any[]) => any, O extends OptionsRecord> = (
    this: MessageWatcherCollector<O>,
    ...args: Parameters<E>
) => ReturnType<E>;

interface WatchOptions<C extends YunaUsable, O extends OptionsRecord> extends MessageWatcherCollectorOptions {
    /**
     * It will be emitted before creating the watcher,
     * if you return `false` it will not be created.
     */
    beforeCreate?(this: C, ctx: CommandContext<O>): Awaitable<boolean> | void;
    filter?(...args: Parameters<OnChangeEvent<O>>): boolean;
    onStop?: Event<OnStopEvent, O>;
    onChange?: Event<OnChangeEvent<O>, O>;
    onUsageError?: Event<OnUsageErrorEvent, O>;
    onOptionsError?: Event<OnOptionsErrorEvent, O>;
}

export function Watch<
    const C extends YunaUsable,
    O extends Parameters<NonNullable<C["run"]>>[0] extends CommandContext<infer O> ? O : never,
>(options: WatchOptions<C, O>) {
    return (target: C, _propertyKey: "run", descriptor: PropertyDescriptor) => {
        const commandRun = target.run;

        const run = descriptor.value;

        if (run !== commandRun) return run;

        descriptor.value = async (ctx: CommandContext<O>) => {
            run.call(target, ctx);

            if (!(ctx.message && ctx.command.options?.length)) return;

            if ((await options.beforeCreate?.call(ctx.command as C, ctx)) === false) return;

            const watcher = createWatcher(ctx, options);

            watcher.onChange(async (ctx, msg) => {
                if (options.filter?.(ctx, msg) === false) return;

                await run.call(target, ctx);
                options.onChange?.call(watcher, ctx, msg);
            });

            options.onOptionsError && watcher.onOptionsError(options.onOptionsError.bind(watcher));
            options.onUsageError && watcher.onUsageError(options.onUsageError.bind(watcher) as OnUsageErrorEvent);
            options.onStop && watcher.onStop(options.onStop.bind(watcher));
            options.onOptionsError && watcher.onOptionsError(options.onOptionsError.bind(watcher));
        };
    };
}
