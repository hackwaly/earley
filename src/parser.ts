import { Grammar, Symbol } from './cfg';
import { EarleySet } from './earley';

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
    // console.log((state as EarleySet).items.flatMap(it => it.state.items).join('\n'));
    for (const input of source) {
        // console.log(`input symbol:${input.symbol} data:${input.data}`);
        state = parser.advance(state, input.symbol, input.data);
        // console.log((state as EarleySet).items.flatMap(it => it.state.items).join('\n'));
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
