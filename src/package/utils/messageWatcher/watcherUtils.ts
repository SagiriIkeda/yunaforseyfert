import type { CommandContext, OptionsRecord } from "seyfert";
import type { Awaitable } from "seyfert/lib/common";
import type { AvailableClients, YunaUsable } from "../../things";
import type { FindWatcherQuery, inferWatcherFromCtx } from "./Controller";
import type { MessageWatcherManager } from "./Manager";
import type { MessageObserver, OnChangeEvent, OnOptionsErrorEvent, OnStopEvent, OnUsageErrorEvent } from "./Watcher";
import type { ObserverOptions } from "./Watcher";
import { createController, createWatcher, getController } from "./controllerUtils";

interface WatchOptions<C extends YunaUsable, O extends OptionsRecord> extends ObserverOptions {
    /**
     * It will be emitted before creating the watcher,
     * if you return `false` it will not be created.
     */
    beforeCreate?(this: C, ctx: CommandContext<O>): Awaitable<boolean> | void;
    filter?(...args: Parameters<OnChangeEvent<MessageObserver<O>, O>>): boolean;
    onStop?: OnStopEvent<MessageObserver<O>>;
    onChange?: OnChangeEvent<MessageObserver<O>, O>;
    onUsageError?: OnUsageErrorEvent<MessageObserver<O>>;
    onOptionsError?: OnOptionsErrorEvent<MessageObserver<O>>;
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

            options.onOptionsError && watcher.onOptionsError(options.onOptionsError);
            options.onUsageError && watcher.onUsageError(options.onUsageError);
            options.onStop && watcher.onStop(options.onStop);
            options.onOptionsError && watcher.onOptionsError(options.onOptionsError);
        };
    };
}

export interface WatchUtils {
    create: typeof createWatcher;
    createController: typeof createController;
    getController: typeof getController;
    /**  Get the list of `watchers` (there may be more than one) associated to a `CommandContext`. */
    getFromContext<C extends CommandContext>(ctx: C): inferWatcherFromCtx<C> | undefined;
    /**
     * Find watchers from a query.
     * This method returns the key (id where it is stored) of the watcher, and its instances in an array.
     */
    find(client: AvailableClients, query: FindWatcherQuery): MessageWatcherManager | undefined;
    /** Similar to `findInstances` but this one will filter through all, it is used in the same way, but it will return all matches */
    findMany(client: AvailableClients, query: FindWatcherQuery): MessageWatcherManager[] | undefined;
    /**
     * Use it to know when a `CommandContext` is being observed.
     */
    isWatching(ctx: CommandContext): boolean;
}

export const YunaWatcherUtils: WatchUtils = {
    create: createWatcher,
    createController,
    getController,
    getFromContext<C extends CommandContext>(ctx: C) {
        return getController(ctx.client)?.getWatcherFromContext(ctx);
    },
    find(client: AvailableClients, query: FindWatcherQuery) {
        return getController(client)?.findWatcher(query);
    },
    findMany(client: AvailableClients, query: FindWatcherQuery) {
        return getController(client)?.findManyWatchers(query);
    },
    isWatching(ctx: CommandContext) {
        return this.getFromContext(ctx) !== undefined;
    },
};

export const Watch = DecoratorWatcher as typeof DecoratorWatcher & WatchUtils;

type UtilsDescriptor = {
    [k in keyof WatchUtils]: { value: WatchUtils[k] };
};

Object.defineProperties(Watch, {
    create: { value: createWatcher },
    createController: { value: createController },
    getController: { value: getController },
    getFromContext: { value: YunaWatcherUtils.getFromContext },
    find: { value: YunaWatcherUtils.find },
    findMany: { value: YunaWatcherUtils.findMany },
    isWatching: { value: YunaWatcherUtils.isWatching.bind(YunaWatcherUtils) },
} satisfies UtilsDescriptor);
