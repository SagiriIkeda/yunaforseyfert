import type { OptionsRecord, UsingClient } from "seyfert";
import type { AvailableClients } from "../../things";
import { type WatcherCreateData, WatchersController, type YunaMessageWatcherControllerConfig } from "./WatcherController";
import type { ObserverOptions } from "./WatcherObserver";

const controllerKey = Symbol("YunaMessageWatcherController");

type YunaMessageWatcherClient = UsingClient & {
    [controllerKey]?: WatchersController;
};

export const createController = ({ client, cache }: YunaMessageWatcherControllerConfig) => {
    const self = client as YunaMessageWatcherClient;
    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[controllerKey] ??= new WatchersController({ client, cache }));
};

export const getController = (client: AvailableClients) => {
    return (client as YunaMessageWatcherClient)[controllerKey];
};

export const createWatcher = <const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(
    ctx: C,
    options?: ObserverOptions,
) => {
    return createController({ client: ctx.client }).create<O, C>(ctx, options);
};
