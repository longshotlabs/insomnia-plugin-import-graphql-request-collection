import {
  IntrospectionInputValue,
  IntrospectionField,
  IntrospectionSchema,
  IntrospectionType,
} from "graphql";
import { FullArgumentMap } from "./types";

interface GqlType {
  kind: string;
  name?: string | null;
  ofType?: GqlType | null;
}

export function getMostSpecificType(type: GqlType): GqlType {
  if (type.kind !== "NON_NULL" && type.kind !== "LIST") return type;
  if (type.ofType == null) return type;
  return getMostSpecificType(type.ofType);
}

function getVariableNameForArg(
  arg: IntrospectionInputValue,
  prefix: string
): string {
  if (prefix.length > 0) {
    return `${prefix}_${arg.name}`;
  }
  return arg.name;
}

export function getDefaultValueForArg(
  arg: IntrospectionInputValue
): string | number | boolean | {} {
  const type = getMostSpecificType(arg.type);
  if (type.kind === "OBJECT") return {};
  if (type.kind === "SCALAR") {
    if (type.name === "String" || type.name === "ID") return "";
    if (type.name === "Boolean") return true;
    if (type.name === "Int" || type.name === "Float") return 10;
  }
  return "";
}

export function buildQueryArgs(variables: FullArgumentMap): string {
  if (variables.size === 0) {
    return "";
  }

  const argStrings = [...variables.entries()].map(([variableName, { arg }]) => {
    let isRequired = arg.type.kind === "NON_NULL";
    let innerType;
    if (isRequired) {
      // @ts-expect-error
      innerType = arg.type.ofType;
    } else {
      innerType = arg.type;
    }

    let argString;
    if (innerType.kind == "LIST") {
      argString = `$${variableName}: [${getMostSpecificType(innerType).name}]`;
    } else {
      argString = `$${variableName}: ${getMostSpecificType(innerType).name}`;
    }

    if (isRequired) argString += "!";

    return argString;
  });

  return `(${argStrings.join(", ")})`;
}

export function buildEndpointArgs(
  args: readonly IntrospectionInputValue[],
  prefix: string = ""
): string {
  if (args.length == 0) {
    return "";
  }

  let argString = args
    .map((arg) => `${arg.name}: $${getVariableNameForArg(arg, prefix)}`)
    .join(", ");

  return `(${argString})`;
}

const MAX_DEPTH = 3;

interface BuildFieldOptions {
  currentDepth?: number;
  types: IntrospectionSchema["types"];
  variables: FullArgumentMap;
}

/**
 * @summary Outputs field name, optional args, and optional subfields if object
 * @param field The field to build request body for
 */
export function buildField(
  field: IntrospectionField,
  { currentDepth = 1, variables, types }: BuildFieldOptions
): string {
  let result = "";

  let specificType = getMostSpecificType(field.type);

  let typeName = specificType.name;
  if (typeName == null || typeName.length === 0) return result;

  const tabs = new Array(currentDepth).fill("\t").join("");
  let variableNamePrefix = currentDepth > 1 ? field.name : "";

  result +=
    tabs + field.name + buildEndpointArgs(field.args, variableNamePrefix);

  for (const arg of field.args) {
    variables.set(getVariableNameForArg(arg, variableNamePrefix), {
      arg,
    });
  }

  const returnType = types.find(
    (type) => type.name === typeName
  ) as IntrospectionType;

  // Add subfields if it's an object type
  if (
    returnType != null &&
    "fields" in returnType &&
    Array.isArray(returnType.fields) &&
    returnType.fields.length > 0
  ) {
    // If it has subfields but we've hit max depth, don't include the field at all
    if (currentDepth === MAX_DEPTH) return "";

    result += " {\n";

    result += returnType.fields
      .map((childField) =>
        buildField(childField, {
          currentDepth: currentDepth + 1,
          variables,
          types,
        })
      )
      .filter((line) => line.length > 0)
      .join("\n");

    result += "\n" + tabs + "}";
  }

  return result;
}
