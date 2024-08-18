import type { CommandOption } from "seyfert";
import type { ApplicationCommandOptionType } from "seyfert/lib/types";

export type ValidLongTextTags = "'" | '"' | "`";
export type ValidNamedOptionSyntax = "-" | "--" | ":";
export type CommandOptionWithType = CommandOption & { type: ApplicationCommandOptionType };

export interface YunaParserCreateOptions {
    /**
     * this only show console.log with the options parsed.
     * @defaulst false */
    logResult?: boolean;

    /** syntaxes enabled */

    syntax?: {
        /** especify what longText tags you want
         *
         * ` " ` => `"penguin life"`
         *
         * ` ' ` => `'beautiful sentence'`
         *
         * **&#96;** => **\`Eve『Insomnia』 is a good song\`**
         *
         * @default 🐧 all enabled
         */
        longTextTags?: [ValidLongTextTags?, ValidLongTextTags?, ValidLongTextTags?];
        /** especify what named syntax you want
         *
         * ` - ` -option content value
         *
         * ` -- ` --option content value
         *
         * ` : ` option: content value
         *
         * @default 🐧 all enabled
         */
        namedOptions?: [ValidNamedOptionSyntax?, ValidNamedOptionSyntax?, ValidNamedOptionSyntax?];
    };

    /**
     * Turning it on can be useful for when once all the options are obtained,
     * the last one can take all the remaining content, ignoring any other syntax.
     * @default {false}
     */
    breakSearchOnConsumeAllOptions?: boolean;

    /**
     * Limit that you can't use named syntax "-" and ":" at the same time,
     * but only the first one used, sometimes it's useful to avoid confusion.
     * @default {false}
     */
    useUniqueNamedSyntaxAtSameTime?: boolean;

    /**
     * This disables the use of longTextTags in the last option
     * @default {false}
     */
    disableLongTextTagsInLastOption?:
        | boolean
        | {
              /**
               * @default {false}
               */
              excludeCodeBlocks?: boolean;
          };

    /** Use Yuna's choice resolver instead of the default one, put null if you don't want it,
     *
     * YunaChoiceResolver allows you to search through choices regardless of case or lowercase,
     * as well as allowing direct use of an choice's value,
     * and not being forced to use only the name.
     *
     * @default enabled
     */
    resolveCommandOptionsChoices?: {
        /** Allow you to use the value of a choice directly, not necessarily search by name
         * @default {true}
         */
        canUseDirectlyValue?: boolean;
    } | null;

    /** If the first option is of the 'User' type,
     *  it can be taken as the user to whom the message is replying.
     *  @default {null} (not enabled)
     */
    useRepliedUserAsAnOption?: {
        /** need to have the mention enabled (@PING) */
        requirePing: boolean;
    } | null;

    /**
     *  Allow the use of code block's language as an option
     *
     *  This will always use two options for every code block
     *  The first option is the language (Although it is not specified)
     *  The second option is the code
     *  For this reason, it's not recommended to set this globally
     *  Use it only where needed
     *
     * @default {false}
     */
    useCodeBlockLangAsAnOption?: boolean;
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
