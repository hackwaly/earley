import { parseStringScannerless } from "./parser";
import { parserTag } from "./parserTag";

// const parser = parserTag`
//     X -> X + X
//     X -> X * X
//     X -> a
// `;
// const source = "a+a*a";
const parser = parserTag`
    S -> a* ${(d: any) => {debugger}}
`;
const source = "aaa";
parseStringScannerless(parser, source);
