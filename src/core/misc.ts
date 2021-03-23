import { Symbol, Rule } from "./cfg";

export class AssertionFailure extends Error {}

export function assert(condition: boolean): asserts condition is true {
    if (!condition) {
        throw new AssertionFailure();
    }
}

export function genericMin<T>(items: Iterable<T>, compare: (a: T, b: T) => number): T | undefined {
    let result: T | undefined;
    for (const item of items) {
        if (result === undefined) {
            result = item;
        } else {
            if (compare(item, result) < 0) {
                result = item;
            }
        }
    }
    return result;
}

export namespace Comparator {
    export const DEFAULT = (a: any, b: any) => {
        if (a === b) return 0;
        if (a > b) return 1;
        return -1;
    };

    export function by<T, U>(f: (t: T) => U, compare: (a: U, b: U) => number = DEFAULT) {
        return (a: T, b: T) => {
            return compare(f(a), f(b));
        };
    }
}

export function computeRuleIndexMap(rules: Iterable<Rule>): Map<Rule, number> {
    const map = new Map<Rule, number>();
    let i = 0;
    for (const rule of rules) {
        map.set(rule, i);
        i += 1;
    }
    return map;
}

export function computeNullNTs(rulesByNT: Map<Symbol, Rule[]>): Set<Symbol> {
    const nullNTs = new Set<Symbol>();

    for (const [nt, rules] of rulesByNT) {
        if (rules.length === 1 && rules[0].rhs.length === 0) {
            nullNTs.add(nt);
        }
    }

    return nullNTs;
}

export function computeNullableNTs(rulesByNT: Map<Symbol, Rule[]>): Set<Symbol> {
    const nullableNTs = new Set<Symbol>();

    while (true) {
        const oldSize = nullableNTs.size;

        for (const [nt, ntRules] of rulesByNT.entries()) {
            if (ntRules.some((rule) => rule.rhs.every((it) => nullableNTs.has(it)))) {
                nullableNTs.add(nt);
            }
        }

        if (nullableNTs.size === oldSize) {
            break;
        }
    }

    return nullableNTs;
}
