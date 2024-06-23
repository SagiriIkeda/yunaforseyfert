import type { CommandContext, OptionsRecord } from "seyfert";
import type { Awaitable } from "seyfert/lib/common";
import type { AvailableClients, YunaUsable } from "../../things";
import type {
    MessageWatcherCollector,
    MessageWatcherCollectorOptions,
    OnChangeEvent,
    OnOptionsErrorEvent,
    OnStopEvent,
    OnUsageErrorEvent,
} from "./WatcherCollector";
import type { FindWatcherQuery, WatcherQueryResult } from "./WatcherController";
import { createController, createWatcher, getController } from "./controllerUtils";

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

function DecoratorWatcher<
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

export interface WatchUtils {
    create: typeof createWatcher;
    createController: typeof createController;
    getController: typeof getController;
    /**  Get the list of `watchers` (there may be more than one) associated to a `CommandContext`. */
    getFromContext(ctx: CommandContext): MessageWatcherCollector<any>[] | undefined;
    /**
     * Find watchers from a query.
     * This method returns the key (id where it is stored) of the watcher, and its instances in an array.
     */
    findInstances(client: AvailableClients, query: FindWatcherQuery): WatcherQueryResult | undefined;
    /** Similar to `findInstances` but this one will filter through all, it is used in the same way, but it will return all matches */
    getManyInstances(client: AvailableClients, query: FindWatcherQuery): WatcherQueryResult[] | undefined;
    /**
     * Use it to know when a `CommandContext` is being observed.
     */
    isWatching(ctx: CommandContext): boolean;
}

export const YunaWatcherUtils: WatchUtils = {
    create: createWatcher,
    createController,
    getController,
    getFromContext(ctx: CommandContext) {
        return getController(ctx.client)?.getWatcherInstancesFromContext(ctx);
    },
    findInstances(client: AvailableClients, query: FindWatcherQuery) {
        return getController(client)?.findWatcherInstances(query);
    },
    getManyInstances(client: AvailableClients, query: FindWatcherQuery) {
        return getController(client)?.getManyWatcherInstances(query);
    },
    isWatching(ctx: CommandContext) {
        return this.getFromContext(ctx) !== undefined;
    },
};

export const Watch = DecoratorWatcher as typeof DecoratorWatcher & WatchUtils;

Object.defineProperties(Watch, {
    create: { value: createWatcher },
    createController: { value: createController },
    getController: { value: getController },
    getFromContext: { value: YunaWatcherUtils.getFromContext },
    findInstances: { value: YunaWatcherUtils.findInstances },
    getManyInstances: { value: YunaWatcherUtils.getManyInstances },
    isWatching: { value: YunaWatcherUtils.isWatching.bind(YunaWatcherUtils) },
});
