import type {
    Command,
    CommandBaseOption,
    SeyfertAttachmentOption,
    SeyfertBooleanOption,
    SeyfertChannelOption,
    SeyfertIntegerOption,
    SeyfertMentionableOption,
    SeyfertNumberOption,
    SeyfertRoleOption,
    SeyfertStringOption,
    SeyfertUserOption,
} from "seyfert";
import type { ApplicationCommandOptionType } from "seyfert/lib/types";
import type { Instantiable, YunaGroupType } from "./things";

export type ExtendedOption = {
    /**
     * with this, you can only use this option as a namedOption and not in a normal way
     *
     * @requires {YunaParser}
     */
    flag?: boolean;
    /**
     * This will cause options with the named syntax to only accept one value instead of all the remaining content.
     * which can be useful with flags.
     * For example:
     * ```sh
     * --named its value
     * ```
     * named option only take "its", and "value" will be taken whichever option is next in the count.
     * @default {false}
     */
    useNamedWithSingleValue?: boolean;
} & CommandBaseOption;

type Extended<O> = O & ExtendedOption;

// hate this
type ExtendedStringOption = Extended<SeyfertStringOption>;
type ExtendedIntegerOption = Extended<SeyfertIntegerOption>;
type ExtendedBooleanOption = Extended<SeyfertBooleanOption>;
type ExtendedUserOption = Extended<SeyfertUserOption>;
type ExtendedChannelOption = Extended<SeyfertChannelOption>;
type ExtendedRoleOption = Extended<SeyfertRoleOption>;
type ExtendedMentionableOption = Extended<SeyfertMentionableOption>;
type ExtendedNumberOption = Extended<SeyfertNumberOption>;
type ExtendedAttachmentOption = Extended<SeyfertAttachmentOption>;

declare module "seyfert" {
    export interface SubCommand {
        /** This property is part of YunaCommandsResolver, without using it, it may not be available. */
        parent?: Command;
    }
    // hate this
    export function createStringOption<T extends ExtendedStringOption = ExtendedStringOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.String;
    };
    export function createIntegerOption<T extends ExtendedIntegerOption = ExtendedIntegerOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Integer;
    };
    export function createBooleanOption<T extends ExtendedBooleanOption = ExtendedBooleanOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Boolean;
    };
    export function createUserOption<T extends ExtendedUserOption = ExtendedUserOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.User;
    };
    export function createChannelOption<T extends ExtendedChannelOption = ExtendedChannelOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Channel;
    };
    export function createRoleOption<T extends ExtendedRoleOption = ExtendedRoleOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Role;
    };
    export function createMentionableOption<T extends ExtendedMentionableOption = ExtendedMentionableOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Mentionable;
    };
    export function createNumberOption<T extends ExtendedNumberOption = ExtendedNumberOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Number;
    };
    export function createAttachmentOption<T extends ExtendedAttachmentOption = ExtendedAttachmentOption>(
        data: T,
    ): T & {
        readonly type: ApplicationCommandOptionType.Attachment;
    };

    export function Groups(groups: Record<string, YunaGroupType>): <T extends Instantiable<any>>(target: T) => T;
}
