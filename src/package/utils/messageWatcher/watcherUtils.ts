import type { CommandContext } from "seyfert";
import { type AvailableClients, Keys, type YunaUsable } from "../../things";
import type { FindWatcherQuery, InferWatcherContext, InferWatcherFromQuery, InferWatcherManagerFromCtx } from "./Controller";
import { createController, createWatcher, getController } from "./controllerUtils";
import type { DecoratorWatchOptions, InferCommandOptions } from "./types";

function DecoratorWatcher<const C extends YunaUsable, O extends InferCommandOptions<C>, Context = InferWatcherContext<C>>(
    options: DecoratorWatchOptions<C, O, Context>,
) {
    return (_target: C, _propertyKey: "run", descriptor: PropertyDescriptor) => {
        const run = descriptor.value;

        if (descriptor.value.name !== "run") return run;

        descriptor.value = async function (this: C, ctx: CommandContext<O>) {
            this[Keys.watcherRawCommandRun] ??= run.bind(this);

            const firstRun = await run.call(this, ctx);

            if ((firstRun && firstRun[Keys.watcherStop] === true) || !(ctx.message && ctx.command.options?.length)) return;

            if ((await options.beforeCreate?.call(ctx.command as C, ctx)) === false) return;

            const watcher = createWatcher(ctx, options);

            const assingMessageResponse = (ctx: CommandContext) => {
                ctx.messageResponse && watcher.watchResponseDelete(ctx.messageResponse);
            };

            assingMessageResponse(ctx);

            const addContext = (result: any) => {
                if (result instanceof WatcherContext) watcher.manager.context = result.value;
            };

            const handleStop = (result: WatcherStopPayload) => {
                if (result && result[Keys.watcherStop] === true) {
                    watcher.stop(result.reason ?? "WatcherStop");
                    return true;
                }
                return false;
            };

            const handle = (result: any) => {
                if (handleStop(result)) return;
                addContext(result);
            };

            addContext(firstRun);

            watcher.onChange(async (ctx, msg) => {
                if (options.filter?.(ctx, msg) === false) return;

                const result = await (options.onChange ? options.onChange.call(watcher, ctx, msg) : run.call(this, ctx));

                assingMessageResponse(ctx);

                handle(result);
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
            options.onResponseDelete && watcher.onResponseDelete(decorate(options.onResponseDelete));
        };
    };
}

export class WatcherContext<const V> {
    readonly value: V;

    constructor(value: V) {
        this.value = value;
    }
}

interface WatcherStopPayload {
    [Keys.watcherStop]: true;
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
    ): InferWatcherManagerFromCtx<Ctx, Command> | undefined;
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

    stop(reason?: string): WatcherStopPayload;
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

    stop(reason = "WatcherStop"): WatcherStopPayload {
        return {
            [Keys.watcherStop]: true,
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
    stop: { value: YunaWatcherUtils.stop },
} satisfies UtilsDescriptor);
