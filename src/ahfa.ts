import { Symbol, Rule } from "./cfg";
import { assert, computeRuleIndexMap } from "./misc";
import { NNFGrammar } from "./nnf";

export class LR0Item {
    constructor(public rule: Rule, public dot: number) {}

    get postdot() {
        return this.rule.rhs[this.dot];
    }

    get next() {
        return new LR0Item(this.rule, this.dot + 1);
    }

    get completed() {
        return this.dot === this.rule.rhs.length;
    }

    toString() {
        return this.rule.toString(this.dot);
    }
}

export class AHFAState {
    number: number;
    items: LR0Item[];
    lookahead: Map<Symbol, LR0Item[]> = new Map();
    transitions: Map<Symbol, AHFAState> = new Map();
    epsilonTransition: AHFAState | null = null;
    completeRules: Map<Symbol, Rule[]> = new Map();
    acceptedNT: Symbol | null = null;

    constructor(number: number, items: LR0Item[]) {
        this.number = number;
        this.items = items;
        for (const item of items) {
            if (item.completed) {
                const rule = item.rule;
                const nt = rule.lhs;
                if (!this.completeRules.has(nt)) {
                    this.completeRules.set(nt, []);
                }
                this.completeRules.get(nt)!.push(rule);
                if (NNFGrammar.isSuperStartNT(nt)) {
                    this.acceptedNT = nt;
                }
            } else {
                const sym = item.postdot;
                if (!this.lookahead.has(sym)) {
                    this.lookahead.set(sym, []);
                }
                this.lookahead.get(sym)!.push(item);
            }
        }
    }

    addTransition(sym: Symbol, state: AHFAState) {
        assert(!this.transitions.has(sym));
        this.transitions.set(sym, state);
    }

    setEpsilonTransition(state: AHFAState) {
        assert(this.epsilonTransition === null);
        this.epsilonTransition = state;
    }

    toString() {
        let buf = "";
        buf += `AHFAState(${this.number}) {\n`;
        buf += `  items:\n`;
        for (const item of this.items) {
            buf += `    ${item}\n`;
        }
        if (this.epsilonTransition !== null || this.transitions.size > 0) {
            buf += `  transitions:\n`;
        }
        if (this.epsilonTransition) {
            buf += `    ε : AHFAState(${this.epsilonTransition.number})\n`;
        }
        for (const [symbol, toState] of this.transitions) {
            buf += `    ${symbol} : AHFAState(${toState.number})\n`;
        }
        buf += "}";
        return buf;
    }
}

export type AHFA = {
    states: AHFAState[];
    startState: AHFAState;
};

export function buildAHFA(grammar: NNFGrammar): AHFA {
    const rulesByNT = grammar.rulesByNT;
    const ruleIndexMap = computeRuleIndexMap(grammar.rules());

    const stateRegistry = new Map<string, AHFAState>();
    const stateQueue: AHFAState[] = [];

    const getItemKey = (item: LR0Item) => {
        return ruleIndexMap.get(item.rule)! + item.dot * ruleIndexMap.size;
    };
    const LR0ItemSet = class {
        private map: Map<number, LR0Item> = new Map();

        addItem(item: LR0Item, queue: LR0Item[] | null = null) {
            const itemKey = getItemKey(item);
            if (!this.map.has(itemKey)) {
                this.map.set(itemKey, item);
                if (queue !== null) {
                    queue.push(item);
                }
            }
        }

        getState() {
            if (this.map.size === 0) {
                return null;
            }
            const items = [...this.map.values()];
            items.sort((a, b) => getItemKey(a) - getItemKey(b));
            const key = items.map((it) => getItemKey(it)).join(",");
            if (stateRegistry.has(key)) {
                return stateRegistry.get(key)!;
            }
            const state = new AHFAState(stateRegistry.size, items);
            stateRegistry.set(key, state);
            stateQueue.push(state);
            return state;
        }
    };

    const startItemSet = new LR0ItemSet();
    startItemSet.addItem(new LR0Item(grammar.superStartRule, 0));
    if (grammar.epsilonSuperStartRule !== null) {
        startItemSet.addItem(new LR0Item(grammar.epsilonSuperStartRule, 1));
    }
    const startState = startItemSet.getState()!;
    const nonKernelStates = new Set<AHFAState>();

    const skipEpsilonNTs = (item: LR0Item) => {
        while (!item.completed && NNFGrammar.isEpsilonNT(item.postdot)) {
            item = item.next;
        }
        return item;
    };

    const computeNonKernelState = (kernelState: AHFAState) => {
        const nonKernelItemSet = new LR0ItemSet();
        const itemQueue: LR0Item[] = [...kernelState.items];

        while (itemQueue.length > 0) {
            const item = itemQueue.pop()!;
            if (!item.completed && rulesByNT.has(item.postdot)) {
                for (const rule of rulesByNT.get(item.postdot)!) {
                    nonKernelItemSet.addItem(skipEpsilonNTs(new LR0Item(rule, 0)), itemQueue);
                }
            }
        }

        return nonKernelItemSet.getState();
    };

    const processState = (originalState: AHFAState) => {
        for (const symbol of originalState.lookahead.keys()) {
            const newItemSet = new LR0ItemSet();
            for (const wantedByItem of originalState.lookahead.get(symbol)!) {
                newItemSet.addItem(skipEpsilonNTs(wantedByItem.next));
            }
            const newState = newItemSet.getState();
            if (newState !== null) {
                originalState.addTransition(symbol, newState);
            }
        }
        if (!nonKernelStates.has(originalState)) {
            let nonKernelState = computeNonKernelState(originalState);
            if (nonKernelState !== null) {
                nonKernelStates.add(nonKernelState);
                originalState.setEpsilonTransition(nonKernelState);
            }
        }
    };

    while (stateQueue.length > 0) {
        processState(stateQueue.pop()!);
    }

    const states = [...stateRegistry.values()];
    states.sort((a, b) => a.number - b.number);

    return {
        states,
        startState,
    };
}
