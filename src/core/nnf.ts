import { Grammar, GrammarBuilder, Rule, Symbol } from "./cfg";
import { computeNullableNTs, computeNullNTs } from "./misc";

export class NNFGrammar extends Grammar {
    constructor(rulesByNT: Map<Symbol, Rule[]>, startNT: Symbol) {
        super(rulesByNT, startNT);
    }

    get epsilonSuperStartRule() {
        const epsilonSuperStartNT = `${this.superStartNT}ε`;
        if (this.rulesByNT.has(epsilonSuperStartNT)) {
            return this.rulesByNT.get(epsilonSuperStartNT)![0]!;
        }
        return null;
    }

    static isSuperStartNT(sym: Symbol) {
        return sym.endsWith("'") || sym.endsWith("'ε");
    }

    static isEpsilonNT(sym: Symbol) {
        return sym.endsWith("ε");
    }

    static getEpsilonNT(sym: Symbol) {
        if (NNFGrammar.isEpsilonNT(sym)) {
            return sym;
        }
        return `${sym}ε`;
    }
}

export function nnfTransform(grammar: Grammar): NNFGrammar {
    const nullNTs = computeNullNTs(grammar.rulesByNT);
    const nullableNTs = computeNullableNTs(grammar.rulesByNT);

    const generate = (rhs: Symbol[], index: number) => {
        const newRhs: Symbol[] = [];
        for (const symbol of rhs) {
            if (nullableNTs.has(symbol) && !nullNTs.has(symbol)) {
                newRhs.push((index & 1) === 0 ? symbol : `${symbol}ε`);
                index = index >> 1;
            } else {
                newRhs.push(nullNTs.has(symbol) ? `${symbol}ε` : symbol);
            }
        }
        return newRhs;
    };

    const enumerate = function* (rhs: string[]) {
        const k = rhs.reduce((n, symbol) => (nullableNTs.has(symbol) && !nullNTs.has(symbol) ? n + 1 : n), 0);
        const n = 1 << k;
        for (let i = 0; i < n; i++) {
            yield generate(rhs, i);
        }
    };

    const builder = new GrammarBuilder(NNFGrammar);

    for (const rule of grammar.rules()) {
        for (const rhs of enumerate(rule.rhs)) {
            const lhs = rhs.every((symbol) => symbol.endsWith("ε")) ? `${rule.lhs}ε` : rule.lhs;
            builder.addRule(new Rule(lhs, rhs, rule.userdata));
        }
    }

    return builder.build(grammar.startNT);
}
