import TypedFunc, { TypedFuncWithBody } from "../typedAst/TypedFunc.ts";
import TypedParameterDeclaration from "../typedAst/TypedParameterDeclaration.ts";
import { NonVoidType } from "../ast/Type.ts";
import TypedStatement, {
  TypedVariableDeclarationStatement,
} from "../typedAst/TypedStatement.ts";

/**
 * There can be multiple locals with the same name in the source code, so all identifiers are
 * transformed into numeric IDs. Thus, we'll have to create a mapping from each declaration
 * statement to the local ID.
 * Each time we encounter a param/var declaration during generation, we're going to switch
 * to the appropriate alias. Thus, we need to store the current name-to-id mapping too.
 */
export type Environment = {
  parent?: Environment;
  children: Map<TypedStatement, Environment>;
  /**
   * This is used to check which ID the declaration statement switches the local name to.
   * Filled before generation (as soon as we enter the function generation).
   */
  declarationIds: Map<
    TypedParameterDeclaration | TypedVariableDeclarationStatement,
    number
  >;
  /**
   * This stores the current IDs for variables.
   * Filled with parameters before generation.
   * Filled with variables during generation.
   */
  currentVariableIds: Map<string, number>;
};

/**
 * Since variables can be re-declared, we need to know exactly which variable an identifier refers
 * to at any given point. To do this, we go through the function's AST before code generation.
 * During this walk-through, we check every variable declaration and assign a numeric ID to the
 * identifier of this variable.
 * In WAST, we can access locals (params and variables) by numeric IDs in order of their appearance.
 *
 * All of the param/var declarations and their types are collected to be converted into local
 * declarations during function generation.
 *
 * @param func function to build the environment for
 *
 * @returns first result is the built environment which is more thoroughly explained in the
 * Environment type declaration. The second part of the result is a mapping from each ID to the
 * appropriate type.
 */
export function buildEnvironment(
  func: TypedFuncWithBody,
): [Environment, Map<number, NonVoidType>] {
  const resultingEnvironment: Environment = createEmptyEnvironment();
  const idTypeMapping = new Map<number, NonVoidType>();

  // Handle args first: add them to the current variables list right now because they are visible
  // before the function code executes.
  for (const parameter of func.signature.parameters) {
    const id = getNextId(resultingEnvironment);
    resultingEnvironment.declarationIds.set(parameter, id);
    // Parameters are visible as soon as function execution starts, so add them immediately.
    resultingEnvironment.currentVariableIds.set(parameter.name, id);
  }

  // How handle variable declarations. IDs are going to be assigned in the same order in which
  // declaration statements appear.
  buildEnvironmentInner(func.body, resultingEnvironment, idTypeMapping);

  return [resultingEnvironment, idTypeMapping];
}

function buildEnvironmentInner(
  statements: TypedStatement[],
  resultingEnvironment: Environment,
  idTypeMapping: Map<number, NonVoidType>,
  takenLabels = new Set<string>(),
): void {
  for (const statement of statements) {
    switch (statement.kind) {
      case "variableDeclaration":
        const variableId: number = getNextId(resultingEnvironment);
        resultingEnvironment.declarationIds.set(statement, variableId);
        idTypeMapping.set(variableId, statement.variableType);
        break;
      case "conditional":
      case "loop":
        const innerEnvironment: Environment = createEmptyEnvironment(
          resultingEnvironment,
        );
        resultingEnvironment.children.set(statement, innerEnvironment);
        buildEnvironmentInner(
          statement.body,
          innerEnvironment,
          idTypeMapping,
          takenLabels,
        );
        break;
    }
  }
}

function getNextId(environment: Environment): number {
  return Array.from(environment.declarationIds.entries()).length;
}

function createEmptyEnvironment(parent?: Environment): Environment {
  return {
    parent,
    children: new Map<TypedStatement, Environment>(),
    declarationIds: new Map<
      TypedParameterDeclaration | TypedVariableDeclarationStatement,
      number
    >(),
    currentVariableIds: new Map<string, number>(),
  };
}

/**
 * This should always return a result. Otherwise we have a validation issue.
 *
 * Locals/parameters have no names in the resulting WAST code, they are accessed by numeric IDs.
 * This function looks up the locals id.
 *
 * There can be multiple identifiers with the same name in the source code, so we have to respect
 * the current environment.
 *
 * @param identifier identifier to find the id for
 * @param environment environment to look for the id in
 *
 * @returns the local id
 */
export function lookupLocalId(
  identifier: string,
  environment: Environment,
): number {
  if (environment.currentVariableIds.has(identifier)) {
    return environment.currentVariableIds.get(identifier)!;
  }

  if (environment.parent) {
    return lookupLocalId(identifier, environment.parent);
  }

  throw new Error(`Internal error: could not find alias for ${identifier}`);
}
