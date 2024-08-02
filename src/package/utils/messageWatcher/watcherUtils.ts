import type { CommandContext } from "seyfert";
import { type AvailableClients, Keys, type YunaUsable } from "../../things";
import type { FindWatcherQuery, InferWatcherContext, InferWatcherFromCtx, InferWatcherFromQuery } from "./Controller";
import { createController, createWatcher, getController } from "./controllerUtils";
import type { DecoratorWatchOptions } from "./types";

function DecoratorWatcher<
    const C extends YunaUsable,
    O extends Parameters<NonNullable<C["run"]>>[0] extends CommandContext<infer O> ? O : never,
    Context = InferWatcherContext<C>,
>(options: DecoratorWatchOptions<C, O, Context>) {
    return (target: C, _propertyKey: "run", descriptor: PropertyDescriptor) => {
        const commandRun = target.run;

        const run = descriptor.value;

        if (run !== commandRun) return run;

        descriptor.value = async (ctx: CommandContext<O>) => {
            const firstRun = run.call(target, ctx);

            if ((firstRun && firstRun[Keys.watcherBreak] === true) || !(ctx.message && ctx.command.options?.length)) return;

            if ((await options.beforeCreate?.call(ctx.command as C, ctx)) === false) return;

            const watcher = createWatcher(ctx, options);

            const addContext = (result: any) => {
                if (result instanceof WatcherContext) watcher.manager.context = result.value;
            };

            const handleBreak = (result: WatcherBreakPayload) => {
                if (result && result[Keys.watcherBreak] === true) {
                    watcher.stop(result.reason ?? "WatcherBreak");
                    return true;
                }
                return false;
            };

            const handle = (result: any) => {
                if (handleBreak(result)) return;
                addContext(result);
            };

            addContext(firstRun);

            watcher.onChange(async (ctx, msg) => {
                if (options.filter?.(ctx, msg) === false) return;

                const result = await run.call(target, ctx, msg);

                handle(result);

                options.onChange?.call(watcher, ctx, msg);
            });

            const decorate = <const C extends (...args: any[]) => any>(callback: C) => {
                return (async (...args: Parameters<C>) => {
                    const result = await callback.call(watcher, ...args);
                    handle(result);
                    return result;
                }) as C;
            };

            options.onOptionsError && watcher.onOptionsError(decorate(options.onOptionsError));
            options.onUsageError && watcher.onUsageError(decorate(options.onUsageError));
            options.onStop && watcher.onStop(options.onStop);
            options.onOptionsError && watcher.onOptionsError(decorate(options.onOptionsError));
        };
    };
}

export class WatcherContext<const V> {
    readonly value: V;

    constructor(value: V) {
        this.value = value;
    }
}

interface WatcherBreakPayload {
    [Keys.watcherBreak]: true;
    reason?: string;
}

export interface WatchUtils {
    create: typeof createWatcher;
    createController: typeof createController;
    getController: typeof getController;
    /**  Get `MessageWatcherManager` associated to a `CommandContext`. */
    getFromContext<Ctx extends CommandContext, Command extends YunaUsable>(
        ctx: Ctx,
        command?: Command,
    ): InferWatcherFromCtx<Ctx, Command> | undefined;
    /**
     * Find an `MessageWatcherManager` from a query.
     */
    find<Query extends FindWatcherQuery>(client: AvailableClients, query: Query): InferWatcherFromQuery<Query> | undefined;
    /** Similar to `find` but this one will filter through all, it is used in the same way, but it will return all matches */
    findMany<Query extends FindWatcherQuery>(client: AvailableClients, query: Query): InferWatcherFromQuery<Query>[] | undefined;
    /**
     * Use it to know when a `CommandContext` is being watched.
     */
    isWatching(ctx: CommandContext): boolean;

    context<V>(value: V): WatcherContext<V>;

    break(reason?: string): WatcherBreakPayload;
}

export const YunaWatcherUtils: WatchUtils = {
    create: createWatcher,
    createController,
    getController,
    getFromContext<Ctx extends CommandContext, Command extends YunaUsable>(ctx: Ctx, _command?: Command) {
        return getController(ctx.client)?.getWatcherFromContext<Ctx, Command>(ctx);
    },
    find<Query extends FindWatcherQuery>(client: AvailableClients, query: Query) {
        return getController(client)?.findWatcher(query);
    },
    findMany<Query extends FindWatcherQuery>(client: AvailableClients, query: Query) {
        return getController(client)?.findManyWatchers(query);
    },
    isWatching(ctx: CommandContext) {
        return this.getFromContext(ctx) !== undefined;
    },
    context<V>(value: V) {
        return new WatcherContext(value);
    },

    break(reason = "WatcherBreak"): WatcherBreakPayload {
        return {
            [Keys.watcherBreak]: true,
            reason,
        };
    },
};

export const Watch = DecoratorWatcher as typeof DecoratorWatcher & WatchUtils;

type UtilsDescriptor = {
    [K in keyof WatchUtils]: { value: WatchUtils[K] };
};

Object.defineProperties(Watch, {
    create: { value: createWatcher },
    createController: { value: createController },
    getController: { value: getController },
    getFromContext: { value: YunaWatcherUtils.getFromContext },
    find: { value: YunaWatcherUtils.find },
    findMany: { value: YunaWatcherUtils.findMany },
    isWatching: { value: YunaWatcherUtils.isWatching.bind(YunaWatcherUtils) },
    context: { value: YunaWatcherUtils.context },
    break: { value: YunaWatcherUtils.break },
} satisfies UtilsDescriptor);
