import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { type Command, type CommandOption, SubCommand } from "seyfert";

type ValidLongTextTags = "'" | '"' | "`";
type ValidNamedOptionSyntax = "-" | "--" | ":";

export interface YunaParserCreateOptions {
    /**
     * this only show console.log with the options parsed.
     * @defaulst false */
    logResult?: boolean;

    enabled?: {
        /** especify what longText tags you want
         *
         * ` " ` => `"penguin life"`
         *
         * ` ' ` => `'beautiful sentence'`
         *
         * **&#96;** => **\`LiSA『Shouted Serenade』 is a good song\`**
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
}

type EscapeModeType = Record<string, RegExp | undefined>;

const RemoveNamedEscapeModeKeys = ["All", "forNamed", "forNamedDotted"];

export const RemoveNamedEscapeMode = (EscapeMode: EscapeModeType, text: "\\-" | ":") => {
    for (const mode of RemoveNamedEscapeModeKeys) {

        const regx = EscapeMode[mode];
        if (!regx) continue;

        const regexStr = regx.source.replace(text, "");

        EscapeMode[mode] = new RegExp(regexStr, EscapeMode[mode]?.flags);
    }
};

export const createRegexs = ({ enabled }: YunaParserCreateOptions) => {
    const hasAnyLongTextTag = (enabled?.longTextTags?.length ?? 0) >= 1;
    const hasAnyNamedSyntax = (enabled?.namedOptions?.length ?? 0) >= 1;

    const hasAnyEspecialSyntax = hasAnyNamedSyntax || hasAnyLongTextTag;

    const backescape = hasAnyEspecialSyntax ? "\\\\" : "";

    const escapeModes: EscapeModeType = {};

    const syntaxes: string[] = [];

    const has1HaphenSyntax = enabled?.namedOptions?.includes("-");
    const has2HaphenSyntax = enabled?.namedOptions?.includes("--");
    const hasDottedSyntax = enabled?.namedOptions?.includes(":");

    const escapedLongTextTags =
        enabled?.longTextTags
            ?.map((tag) => {
                escapeModes[tag!] = new RegExp(`(\\\\+)([${tag}\\s])`, "g");

                return `\\${tag}`;
            })
            .join("") ?? "";

    escapeModes.All = new RegExp(`(\\+)([${escapedLongTextTags}\s:\\-])`);

    if (hasAnyEspecialSyntax) {
        const extras: string[] = [];

        (has1HaphenSyntax || has2HaphenSyntax) && extras.push("-");
        hasDottedSyntax && extras.push(":");

        syntaxes.push(`(?<tag>[${escapedLongTextTags}${extras.join("")}])`);
    }

    syntaxes.push(`(?<value>[^\\s\\x7F${escapedLongTextTags}${backescape}]+)`);

    if (hasAnyNamedSyntax) {
        const namedSyntaxes: string[] = [];

        if (has1HaphenSyntax || has2HaphenSyntax) {
            const HaphenLength = [];

            has1HaphenSyntax && HaphenLength.push(1);
            has2HaphenSyntax && HaphenLength.push(2);

            namedSyntaxes.push(`(?<hyphens>-{${HaphenLength.join(",")}})(?<hyphensname>[a-zA-Z_\\d]+)`);
            escapeModes.forNamed = /(\\+)([\:\s\-])/g;
        } else {
            RemoveNamedEscapeMode(escapeModes, "\\-");
        }

        if (hasDottedSyntax) {
            namedSyntaxes.push("(?<dotsname>[a-zA-Z_\\d]+)(?<dots>:)(?!\\/\\/[^\\s\\x7F]))");
            escapeModes.forNamedDotted = /(\\+)([\:\s\-\/])/g;
        } else {
            RemoveNamedEscapeMode(escapeModes, ":");
        }

        namedSyntaxes.length && syntaxes.unshift(`(?<named>(\\\\*)(?:${namedSyntaxes.join("|")}))`);
    }

    if (backescape) {
        syntaxes.push("(?<backescape>\\\\+)");
    }

    return {
        elementsRegex: RegExp(syntaxes.join("|"), "g"),
        escapeModes: escapeModes,
    };
};

const removeDuplicates = <A>(arr: A extends Array<infer R> ? R[] : never[]): A => {
    return [...new Set(arr)] as A;
}


export const createConfig = (config: YunaParserCreateOptions, isfull = true) => {

    if (isfull || config.enabled) {

        config.enabled ??= {};

        if (isfull || config.enabled.longTextTags) config.enabled.longTextTags = removeDuplicates(config?.enabled?.longTextTags ?? ['"', "'", "`"]);
        if (isfull || config.enabled.namedOptions) config.enabled.namedOptions = removeDuplicates(config?.enabled?.namedOptions ?? ["-", "--", ":"]);
    }

    if (isfull || "breakSearchOnConsumeAllOptions" in config) config.breakSearchOnConsumeAllOptions = config.breakSearchOnConsumeAllOptions === true;
    if (isfull || "useUniqueNamedSyntaxAtSameTime" in config) config.useUniqueNamedSyntaxAtSameTime = config.useUniqueNamedSyntaxAtSameTime === true;
    if (isfull || "logResult" in config) config.logResult = config.logResult === true;

    return config;

}

interface CommandYunaMetaData {
    options: CommandOption[];
    depth: number;
    config?: YunaParserCreateOptions,
    regexes?: ReturnType<typeof createRegexs>,
}

const keyMetadata = Symbol("YunaParserMetaData");
const keyConfig = Symbol("YunaParserConfig");


export const ParserRecommendedConfig = {
    Eval: {
        breakSearchOnConsumeAllOptions: true,
        enabled: {
            longTextTags: []
        }
    }
} satisfies Record<string, YunaParserCreateOptions>

export function DeclareParserConfig(config: YunaParserCreateOptions = {}) {

    return <T extends { new(...args: any[]): {} }>(target: T) => {

        if (!Object.keys(config).length) return target;

        return class extends target {
            [keyConfig] = createConfig(config, false);
        };
    }
}


type Object = Record<string | number | symbol, any>;

const isObject = (obj: unknown): obj is Object => typeof obj === "object" && obj !== null && !Array.isArray(obj)

const mergeObjects = <A, B>(obj: A, obj2: B): (A & B) | B => {

    if (!(isObject(obj) && isObject(obj2))) return obj2;

    const merged = { ...obj };
    
    if (!isObject(obj)) return obj2;

    for (const key of Object.keys(obj2)) {
        const oldValue = merged[key];
        const value = obj2[key];

        merged[key as keyof A & B] = mergeObjects(oldValue, value);
    }

    return merged as A & B;
}

const InvalidOptionType = new Set([
    ApplicationCommandOptionType.Attachment,
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
]);

export const getYunaMetaDataFromCommand = (config: YunaParserCreateOptions, command: (Command | SubCommand) & { [keyMetadata]?: CommandYunaMetaData;[keyConfig]?: YunaParserCreateOptions }) => {
    const InCache = command[keyMetadata];
    if (InCache) return InCache;

    const metadata: CommandYunaMetaData = {
        options: command.options?.filter((option) => "type" in option && !InvalidOptionType.has(option.type)) as CommandOption[],
        depth: command instanceof SubCommand ? (command.group ? 3 : 2) : 1,
    };


    const commandConfig = command[keyConfig]

    if (commandConfig) {

        const realConfig = mergeObjects(config, commandConfig)

        metadata.config = realConfig;
        metadata.regexes = createRegexs(realConfig);
    }

    command[keyMetadata];

    return metadata;
};



