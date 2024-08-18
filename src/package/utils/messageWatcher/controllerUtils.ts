import type { OptionsRecord, UsingClient } from "seyfert";
import { type AvailableClients, Keys } from "../../things";
import { type WatcherCreateData, WatchersController, type YunaMessageWatcherControllerConfig } from "./Controller";
import type { WatcherOptions } from "./types";

type YunaMessageWatcherClient = UsingClient & {
    [Keys.clientWatcherController]?: WatchersController;
};

export const createController = ({ client, cache }: YunaMessageWatcherControllerConfig) => {
    const self = client as YunaMessageWatcherClient;
    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[Keys.clientWatcherController] ??= new WatchersController({ client, cache }));
};

export const getController = (client: AvailableClients) => {
    return (client as YunaMessageWatcherClient)[Keys.clientWatcherController];
};

export const createWatcher = <const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(
    ctx: C,
    options?: WatcherOptions,
) => {
    return createController({ client: ctx.client }).create<O, C>(ctx, options);
};
