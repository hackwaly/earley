import { Grammar, Symbol } from '../core/cfg';

export interface IParserClass {
    new<T>(grammar: Grammar): IParser<T>;
}

export type ParserState = unknown;

export interface IParser<T> {
    newStartState(): ParserState;
    advance(state: ParserState, sym: Symbol, data: any): ParserState
    finish(state: ParserState): T;
}

export function parseGeneric<T>(parser: IParser<T>, source: Iterable<{symbol: Symbol, data: any}>): T {
    let state = parser.newStartState();
    for (const input of source) {
        state = parser.advance(state, input.symbol, input.data);
    }
    return parser.finish(state);
}

export function parseStringScannerless<T>(parser: IParser<T>, source: string): T {
    let state = parser.newStartState();
    const len = source.length;
    for (let i = 0; i < len; i++) {
        const input = source.charAt(i);
        state = parser.advance(state, input, input);
    }
    return parser.finish(state);
}
