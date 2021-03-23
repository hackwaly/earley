export const NIL = Symbol();

export class Cons<T> {
    constructor(public head: T, public tail: List<T>) {}
}

export type List<T> = typeof NIL | Cons<T>;

export function isList<T>(obj: any): obj is List<T> {
    return obj === NIL || obj instanceof Cons;
}
