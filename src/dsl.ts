import { BootParser } from "./bootParser";
import { Symbol, Rule, Grammar, GrammarBuilder } from "./cfg";
import { Cons, isList, List, NIL } from "./list";

type BuildContext = {
    startNT: Symbol | null;
    builder: GrammarBuilder<Grammar>;
    generatedNTs: Set<Symbol>;
};

let context!: BuildContext;

class GeneratedRuleUserdata {
    constructor(public process: ($: any[]) => any) {}
}

export function defineGrammar(f: () => void): Grammar {
    context = { startNT: null, builder: new GrammarBuilder(Grammar), generatedNTs: new Set() };
    f();
    const grammar = context.builder.build(context.startNT!);
    context = null!;
    return grammar;
}

export function defineRule(lhs: Symbol, rhs: Symbol[], userdata?: any) {
    if (context.startNT === null) {
        context.startNT = lhs;
    }
    context.builder.addRule(new Rule(lhs, rhs, userdata));
}

function listToArray<T>(list: List<T>) {
    const array: T[] = [];
    let node = list;
    while (node !== NIL) {
        array.push(node.head);
        node = node.tail;
    }
    return array;
}

export function plus(sym: Symbol): Symbol {
    const plusSym = `${sym}+`;
    if (!context.generatedNTs.has(plusSym)) {
        defineRule(
            plusSym,
            [sym],
            new GeneratedRuleUserdata(($) => {
                return new Cons($[0], NIL);
            })
        );
        defineRule(
            plusSym,
            [sym, plusSym],
            new GeneratedRuleUserdata(($) => {
                return new Cons($[0], $[1]);
            })
        );
        context.generatedNTs.add(plusSym);
    }
    return plusSym;
}

export function star(sym: Symbol) {
    const starSym = `${sym}*`;
    if (!context.generatedNTs.has(starSym)) {
        defineRule(
            starSym,
            [sym],
            new GeneratedRuleUserdata(() => {
                return NIL;
            })
        );
        defineRule(
            starSym,
            [sym, starSym],
            new GeneratedRuleUserdata(($) => {
                return new Cons($[0], $[1]);
            })
        );
        context.generatedNTs.add(starSym);
    }
    return starSym;
}

export function question(sym: Symbol) {
    const questionSym = `${sym}?`;
    if (!context.generatedNTs.has(questionSym)) {
        defineRule(
            questionSym,
            [],
            new GeneratedRuleUserdata(() => {
                return null;
            })
        );
        defineRule(
            questionSym,
            [sym],
            new GeneratedRuleUserdata(($) => {
                return $[0];
            })
        );
        context.generatedNTs.add(questionSym);
    }
    return questionSym;
}

export class BootDSLParser<T> extends BootParser<T> {
    constructor(grammar: Grammar) {
        super(grammar);
    }

    evaluateRule(rule: Rule, data: any[]): any {
        if (rule.userdata instanceof GeneratedRuleUserdata) {
            return rule.userdata.process(data);
        } else {
            data = data.map(it => {
                if (isList(it)) {
                    return listToArray(it);
                }
                return it;
            });
            return this.evaluateUserRule(rule, data);
        }
    }

    evaluateUserRule(rule: Rule, data: any[]): any {
        return super.evaluateRule(rule, data);
    }
}
