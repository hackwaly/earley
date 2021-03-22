import { Grammar } from "./cfg";
import { BootDSLParser, defineGrammar, defineRule, plus, question, star } from "./dsl";

const tempateGrammar = defineGrammar(() => {
    defineRule("template", [plus("rule")], () => {});
    defineRule("rule", ["lhs", "→", "rhs", question("action")], ($: any[]) => defineRule($[0], $[2], $[3]));
    defineRule("lhs", ["symbol"], ($: any[]) => $[0]);
    defineRule("rhs", [plus("element")], ($: any[]) => $[0]);
    defineRule("rhs", ["epsilon"], ($: any[]) => []);
    defineRule("element", ["symbol"], ($: any[]) => $[0]);
    defineRule("element", ["plus"], ($: any[]) => $[0]);
    defineRule("element", ["star"], ($: any[]) => $[0]);
    defineRule("element", ["question"], ($: any[]) => $[0]);
    defineRule("plus", ["symbol", "+"], ($: any[]) => plus($[0]));
    defineRule("star", ["symbol", "*"], ($: any[]) => star($[0]));
    defineRule("question", ["symbol", "?"], ($: any[]) => question($[0]));
});

const bootTemplateParser = new BootDSLParser<Grammar>(tempateGrammar);

export default bootTemplateParser;
