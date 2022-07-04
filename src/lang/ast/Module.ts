import Func from "./Func.ts";
import Memory from "./Memory.ts";

/**
 * Module is just a collection of functions for now
 */
export default interface Module {
  funcs: Func[];
  memories: Memory[];
}
