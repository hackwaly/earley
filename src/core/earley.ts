import { Rule, Symbol } from "./cfg";
import { AHFAState, AHFA } from "./ahfa";
import { NNFGrammar } from "./nnf";
import { assert, AssertionFailure, Comparator, genericMin } from "./misc";

export class TerminalData {
    constructor(public data: unknown) {}
}

export class Link {
    constructor(public predecessor: EarleyItem, public causal: EarleyItem | TerminalData, public next: Link | null) {}

    assertNTCausal() {
        assert(this.causal instanceof EarleyItem);
        return this.causal as EarleyItem;
    }
}

export class EarleyItem {
    public link: Link | null = null;

    constructor(public state: AHFAState, public origin: EarleySet | null) {}

    addLink(predecessor: EarleyItem, causal: EarleyItem | TerminalData) {
        this.link = new Link(predecessor, causal, this.link);
    }

    *links() {
        let link = this.link;
        while (link !== null) {
            yield link;
            link = link.next;
        }
    }
}

export class EarleySet {
    public items: EarleyItem[] = [];
    public accepted: EarleyItem | null = null;

    constructor(public pos: number) {}

    addItem(item: EarleyItem, queue: EarleyItem[] | null = null): EarleyItem {
        const existItem = this.items.find(
            (existItem) => existItem.state === item.state && existItem.origin === item.origin
        );
        if (existItem !== undefined) {
            return existItem;
        }
        this.items.push(item);
        if (item.state.acceptedNT !== null) {
            this.accepted = item;
        }
        if (queue !== null) {
            queue.push(item);
        }
        return item;
    }
}

export function newStartSet(ahfa: AHFA) {
    const newSet = new EarleySet(0);
    newSet.addItem(new EarleyItem(ahfa.startState, null));
    if (ahfa.startState.epsilonTransition !== null) {
        newSet.addItem(new EarleyItem(ahfa.startState.epsilonTransition, newSet));
    }
    return newSet;
}

export function advance(startSet: EarleySet, sym: Symbol, data: unknown): EarleySet {
    const newSet = new EarleySet(startSet.pos + 1);

    for (const item of startSet.items) {
        const { state, origin } = item;
        const kernel = state.transitions.get(sym);
        if (kernel != null) {
            let newItem = new EarleyItem(kernel, origin);
            newItem = newSet.addItem(newItem);
            newItem.addLink(item, new TerminalData(data));
            const nonKernel = kernel.epsilonTransition;
            if (nonKernel !== null) {
                let newItem = new EarleyItem(nonKernel, newSet);
                newItem = newSet.addItem(newItem);
            }
        }
    }

    const itemQueue = [...newSet.items];

    while (itemQueue.length > 0) {
        const item = itemQueue.pop()!;
        const { state, origin } = item;

        if (origin === null || origin === newSet) continue;

        for (const symbol of state.completeRules.keys()) {
            for (const oitem of origin.items) {
                const { state: ostate, origin: oorigin } = oitem;
                const kernel = ostate.transitions.get(symbol);
                if (kernel != null) {
                    let newItem = new EarleyItem(kernel, oorigin);
                    newItem = newSet.addItem(newItem, itemQueue);
                    newItem.addLink(oitem, item);
                    const nonKernel = kernel.epsilonTransition;
                    if (nonKernel !== null) {
                        let newItem = new EarleyItem(nonKernel, newSet);
                        newItem = newSet.addItem(newItem, itemQueue);
                    }
                }
            }
        }
    }

    return newSet;
}

function selectRule(rules: Iterable<Rule>, compareRulePriority: (r1: Rule, r2: Rule) => number) {
    return genericMin(rules, compareRulePriority)!;
}

function selectLink(
    item: EarleyItem,
    nt: Symbol,
    compareRulePriority: (r1: Rule, r2: Rule) => number
): { link: Link; rule: Rule } {
    const derivations = function* (): Generator<{ rule: Rule; link: Link }> {
        for (const link of item.links()) {
            const causal = link.assertNTCausal();
            const rules = causal.state.completeRules.get(nt)!;
            const rule = selectRule(rules, compareRulePriority);
            yield { rule, link };
        }
    };
    return genericMin(
        derivations(),
        Comparator.by((derivation) => derivation.rule, compareRulePriority)
    )!;
}

function deriveEpsilonNT(ent: Symbol, grammar: NNFGrammar, evaluateRule: (rule: Rule, data: any[]) => any): any {
    assert(grammar.rulesByNT.get(ent)?.length === 1);
    const rule = grammar.rulesByNT.get(ent)![0]!;
    const data = [];
    for (const sym of rule.rhs) {
        data.push(deriveEpsilonNT(sym, grammar, evaluateRule));
    }
    return evaluateRule(rule, data);
}

function evaluate(
    rule: Rule,
    end: EarleyItem,
    grammar: NNFGrammar,
    evaluateRule: (rule: Rule, data: any[]) => any,
    compareRulePriority: (r1: Rule, r2: Rule) => number
): any {
    let data = [];
    let node = end;
    for (let j = rule.rhs.length; --j >= 0; ) {
        const sym = rule.rhs[j];
        if (NNFGrammar.isEpsilonNT(sym)) {
            data.push(() => deriveEpsilonNT(sym, grammar, evaluateRule));
        } else {
            if (grammar.isTerminal(sym)) {
                const link = node.link!;
                const causal = link.causal;
                if (!(causal instanceof TerminalData)) throw new AssertionFailure();
                data.push(() => causal.data);
                node = link.predecessor;
            } else {
                const { link, rule } = selectLink(node, sym, compareRulePriority);
                const causal = link.causal;
                if (!(causal instanceof EarleyItem)) throw new AssertionFailure();
                data.push(() => evaluate(rule, causal, grammar, evaluateRule, compareRulePriority));
                node = link.predecessor;
            }
        }
    }
    data = data.reverse();
    data = data.map(f => f());
    if (NNFGrammar.isSuperStartNT(rule.lhs)) {
        return data[0];
    }
    return evaluateRule(rule, data);
}

export function finish(
    set: EarleySet,
    grammar: NNFGrammar,
    evaluateRule: (rule: Rule, data: any[]) => any,
    compareRulePriority: (r1: Rule, r2: Rule) => number
): any {
    assert(set.accepted !== null);
    const acceptedItem = set.accepted!;
    const acceptedNT = acceptedItem.state.acceptedNT!;
    const rule = acceptedItem.state.completeRules.get(acceptedNT)![0];
    return evaluate(rule, acceptedItem, grammar, evaluateRule, compareRulePriority);
}
