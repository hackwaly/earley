import { Grammar } from "./cfg";
import templateParser from "./bootTemplateParser";
import { IParser, IParserClass, parseGeneric } from "./parser";
import { BootDSLParser, defineGrammar } from "./dsl";

export type CreateParserTagOptions = {
    templateParser: IParser<Grammar>;
    Parser: IParserClass;
};

export const DEFAULT_OPTIONS: CreateParserTagOptions = {
    templateParser,
    Parser: BootDSLParser,
};

export function createParserTag({ templateParser, Parser }: CreateParserTagOptions = DEFAULT_OPTIONS) {
    return <T>(parts: TemplateStringsArray, ...userdatas: any[]): IParser<T> => {
        let buf = ``;
        parts.forEach((part, index) => {
            if (index !== 0) {
                buf += `__ACTION_${index}`;
            }
            buf += part;
        });
        const tokens = buf
            .trim()
            .replace(/->/g, "→")
            .replace(/([+*?])/g, " $1 ")
            .split(/\s+/g);
        const grammar = defineGrammar(() => {
            parseGeneric(
                templateParser,
                (function* () {
                    for (const token of tokens) {
                        if (token === 'ε') {
                            yield { symbol: 'epsilon', data: token };
                        } else if (token.startsWith("__ACTION_")) {
                            yield { symbol: "action", data: userdatas[parseInt(token.slice("__ACTION_".length))]! };
                        } else if (/^[→+*?]$/.test(token)) {
                            yield { symbol: token, data: token };
                        } else {
                            yield { symbol: "symbol", data: token };
                        }
                    }
                })()
            );
        });
        return new Parser(grammar);
    };
}

export const parserTag = createParserTag(DEFAULT_OPTIONS);
