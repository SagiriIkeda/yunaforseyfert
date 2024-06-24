import type { OptionsRecord, UsingClient } from "seyfert";
import type { AvailableClients } from "../../things";
import type { MessageWatcherCollectorOptions } from "./WatcherCollector";
import { YunaMessageWatcherController, type YunaMessageWatcherControllerConfig, type watcherCreateData } from "./WatcherController";

const controllerKey = Symbol("YunaMessageWatcherController");

type YunaMessageWatcherClient = UsingClient & {
    [controllerKey]?: YunaMessageWatcherController;
};

export const createController = ({ client, cache }: YunaMessageWatcherControllerConfig) => {
    const self = client as YunaMessageWatcherClient;
    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[controllerKey] ??= new YunaMessageWatcherController({ client, cache }));
};

export const getController = (client: AvailableClients) => {
    return (client as YunaMessageWatcherClient)[controllerKey];
};

export const createWatcher = <const O extends OptionsRecord | undefined = undefined, const C extends watcherCreateData = watcherCreateData>(
    ctx: C,
    options?: MessageWatcherCollectorOptions,
) => {
    return createController({ client: ctx.client }).create<O, C>(ctx, options);
};
