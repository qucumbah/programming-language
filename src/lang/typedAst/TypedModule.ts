import TypedFunc from "./TypedFunc.ts";
import TypedMemory from "./TypedMemory.ts";

export default interface TypedModule {
  funcs: TypedFunc[];
  memory?: TypedMemory;
}
