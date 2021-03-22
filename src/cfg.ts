export type Symbol = string;

export class Rule {
    constructor(public lhs: Symbol, public rhs: Symbol[], public userdata?: any) {}

    toString(dot?: number) {
        const len = this.rhs.length;

        let buf = `${this.lhs} →`;

        if (len === 0) {
            buf += ` ε`;
        } else {
            for (let i = 0; i < len; i++) {
                if (i === dot) {
                    buf += " •";
                }

                const sym = this.rhs[i];
                buf += ` ${sym}`;
            }
            if (dot === len) {
                buf += " •";
            }
        }

        return buf;
    }
}

export class Grammar {
    constructor(public rulesByNT: Map<Symbol, Rule[]>, public startNT: Symbol) {
        const superStartNT = `${startNT}'`;
        if (!rulesByNT.has(superStartNT)) {
            rulesByNT.set(superStartNT, [new Rule(superStartNT, [startNT])]);
        }
    }

    *rules() {
        for (const rules of this.rulesByNT.values()) {
            yield* rules;
        }
    }

    get superStartNT() {
        return `${this.startNT}'`;
    }

    get superStartRule() {
        return this.rulesByNT.get(this.superStartNT)![0]!;
    }

    isTerminal(sym: Symbol) {
        return !this.rulesByNT.has(sym);
    }

    isNonterminal(sym: Symbol) {
        return this.rulesByNT.has(sym);
    }

    static isSuperStartNT(sym: Symbol) {
        return sym.endsWith("'");
    }
}

export class GrammarBuilder<T extends Grammar> {
    private rulesByNT = new Map<Symbol, Rule[]>();

    constructor(public Grammar: { new(rulesByNT: Map<Symbol, Rule[]>, startNT: Symbol): T }) {}

    addRule(rule: Rule) {
        if (!this.rulesByNT.has(rule.lhs)) {
            this.rulesByNT.set(rule.lhs, []);
        }
        this.rulesByNT.get(rule.lhs)!.push(rule);
    }

    build(startNT: Symbol): T {
        return new this.Grammar(this.rulesByNT, startNT);
    }
}
