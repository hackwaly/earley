import { AHFA, buildAHFA } from "./ahfa";
import { Symbol, Grammar, Rule } from "./cfg";
import { advance, EarleySet, finish, newStartSet } from "./earley";
import { Comparator, computeRuleIndexMap } from "./misc";
import { NNFGrammar, nnfTransform } from "./nnf";
import { IParser, ParserState } from "./parser";

export class BootParser<T> implements IParser<T> {
    public grammar: Grammar;
    public nnfGrammar: NNFGrammar;
    public ahfa: AHFA;
    public ruleIndexMap: Map<Rule, number>;

    constructor(grammar: Grammar) {
        this.grammar = grammar;
        this.nnfGrammar = nnfTransform(grammar);
        this.ahfa = buildAHFA(this.nnfGrammar);
        this.ruleIndexMap = computeRuleIndexMap(this.nnfGrammar.rules());
    }

    newStartState(): ParserState {
        return newStartSet(this.ahfa);
    }

    isDead(state: ParserState): boolean {
        const set = state as EarleySet;
        return set.items.length === 0;
    }

    isAcceptable(state: ParserState): boolean {
        const set = state as EarleySet;
        return set.accepted !== null;
    }

    advance(state: ParserState, sym: Symbol, data: unknown): ParserState {
        const set = state as EarleySet;
        return advance(set, sym, data);
    }

    protected evaluateRule(rule: Rule, data: any[]): any {
        if (typeof rule.userdata === 'function') {
            return rule.userdata(data);
        }
    }

    protected compareRulePriority(rule1: Rule, rule2: Rule): number {
        return Comparator.by((rule: Rule) => this.ruleIndexMap.get(rule)!)(rule1, rule2);
    }

    finish(state: ParserState): T {
        const set = state as EarleySet;
        return finish(set, this.nnfGrammar, this.evaluateRule.bind(this), this.compareRulePriority.bind(this));
    }
}
