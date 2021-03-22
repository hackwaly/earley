import { parseStringScannerless } from "./parser";
import { parserTag } from "./parserTag";

// const parser = parserTag`
//     X -> X + X
//     X -> X * X
//     X -> a
// `;
// const source = "a+a*a";
const parser = parserTag`
    S -> A A A A
    A -> E
    A -> a
    E -> ε
`;
const source = "aaa";
parseStringScannerless(parser, source);
