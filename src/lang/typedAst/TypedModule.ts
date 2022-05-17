import Module from "../ast/Module.ts";
import TypedFunc from "./TypedFunc.ts";

export default interface TypedModule extends Module {
  funcs: TypedFunc[],
}
