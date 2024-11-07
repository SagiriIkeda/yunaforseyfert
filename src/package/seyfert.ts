import type { ChoiceableTypes, ChoiceableValues, Command, ReturnOptionsTypes, SeyfertAttachmentOption, SeyfertChoice } from "seyfert";
import type { CommandOptionWithType } from "seyfert/lib/commands/handle";
import type { ApplicationCommandOptionType } from "seyfert/lib/types";
import { type ArgsResultMetadata, type Instantiable, Keys, type YunaGroupType } from "./things";

interface BaseExtendedOption {
    /**
     * with this, you can only use this option as a namedOption and not in a normal way
     *
     * @requires {YunaParser}
     */
    flag?: boolean;
    /**
     * This will cause options with the named syntax to only accept one value instead of all the remaining content.
     * which can be useful with flags at the start.
     * For example:
     * ```sh
     * --named its value
     * ```
     * named option only take "its", and "value" will be taken whichever option is next in the count.
     * @default {false}
     */
    useNamedWithSingleValue?: boolean;
}

export type ExtendedOption = BaseExtendedOption & CommandOptionWithType;

declare module "seyfert" {
    export interface SubCommand {
        /** This property is part of Yuna.resolver, without using it, it may not be available. */
        parent?: Command;
    }

    interface SeyfertBasicOption<T extends keyof ReturnOptionsTypes, R = true | false> extends BaseExtendedOption {}

    interface SeyfertBaseChoiceableOption<
        T extends keyof ReturnOptionsTypes,
        C = T extends ChoiceableTypes ? SeyfertChoice<ChoiceableValues[T]>[] : never,
        R = true | false,
        VC = never,
    > extends BaseExtendedOption {}

    function createAttachmentOption<
        R extends boolean,
        T extends Omit<SeyfertAttachmentOption<R>, keyof BaseExtendedOption> = Omit<SeyfertAttachmentOption<R>, keyof BaseExtendedOption>,
    >(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Attachment;
    };

    export function Groups(groups: Record<string, YunaGroupType>): <T extends Instantiable<any>>(target: T) => T;

    export interface Message {
        [Keys.messageArgsResult]?: ArgsResultMetadata;
    }
}
