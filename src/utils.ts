import type {
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionObjectType,
  IntrospectionSchema,
  IntrospectionType,
} from "graphql";
import { FullArgumentMap } from "./types";

const rootMutationName = "Mutation";
const rootQueryName = "Query";

interface GqlType {
  kind: string;
  name?: string | null;
  ofType?: GqlType | null;
}

interface ProcessSchemaResult {
  mutations: QueryInfo[];
  queries: QueryInfo[];
}


type QueryType = "mutation" | "query";

interface QueryIdentifier {
  name?: string;
  type?: QueryType;
}
interface GenerateGraphQLTestFileInput {
  queries: QueryIdentifier[];
  url: string;
}

interface QueryInfo {
  name: string;
  gql: string;
  variables: Record<string, any>; // eslint-disable-line
}

export function getMostSpecificType(
  type: GqlType,
  isParentTypeNonNull = false
): [GqlType, boolean] {
  if (type.kind !== "NON_NULL" && type.kind !== "LIST")
    return [type, isParentTypeNonNull];
  if (type.ofType == null) return [type, isParentTypeNonNull];
  return getMostSpecificType(type.ofType, type.kind === "NON_NULL");
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
): string | number | boolean | Record<string, never> {
  const [type] = getMostSpecificType(arg.type);
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
    const isRequired = arg.type.kind === "NON_NULL";
    let innerType: any; // eslint-disable-line
    if (isRequired) {
      innerType = arg.type.ofType;
    } else {
      innerType = arg.type;
    }

    const [mostSpecificType, isMostSpecificTypeRequired] =
      getMostSpecificType(innerType);

    let argString: string;
    if (innerType.kind == "LIST") {
      argString = `$${variableName}: [${mostSpecificType.name}${
        isMostSpecificTypeRequired ? "!" : ""
      }]`;
    } else {
      argString = `$${variableName}: ${mostSpecificType.name}`;
    }

    if (isRequired) argString += "!";

    return argString;
  });

  return `(${argStrings.join(", ")})`;
}

export function buildEndpointArgs(
  args: readonly IntrospectionInputValue[],
  prefix = ""
): string {
  if (args.length == 0) {
    return "";
  }

  const argString = args
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

  const [specificType] = getMostSpecificType(field.type);

  const typeName = specificType.name;
  if (typeName == null || typeName.length === 0) return result;

  const tabs = new Array(currentDepth).fill("\t").join("");
  const variableNamePrefix = currentDepth > 1 ? field.name : "";

  result +=
    tabs + field.name + buildEndpointArgs(field.args, variableNamePrefix);

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

  // Be sure to keep this after the above `if` block. We don't want to
  // do this if we hit MAX_DEPTH and return "".
  for (const arg of field.args) {
    variables.set(getVariableNameForArg(arg, variableNamePrefix), {
      arg,
    });
  }

  return result;
}

// eslint-disable-next-line
export function processSchema(schema: any): ProcessSchemaResult {
  const result: ProcessSchemaResult = {
    mutations: [],
    queries: [],
  };

  const types: IntrospectionSchema["types"] = schema.data.__schema.types;
  for (const type of types) {
    if (type.name !== rootQueryName && type.name !== rootMutationName) continue;

    const requestType = type.name == rootQueryName ? "query" : "mutation";

    const fields = [...(type as IntrospectionObjectType).fields];
    fields.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    for (const rootField of fields) {
      const variables: FullArgumentMap = new Map();
      const requestMainBody = buildField(rootField, { variables, types });

      let queryArgsText = buildQueryArgs(variables);
      if (queryArgsText.length > 0) queryArgsText = " " + queryArgsText;

      const gql =
        requestType + queryArgsText + " {\n" + requestMainBody + "\n}";

      const variablesObj: Record<string, any> = {}; // eslint-disable-line
      for (const [variableName, { arg }] of variables.entries()) {
        variablesObj[variableName] = getDefaultValueForArg(arg);
      }

      result[requestType === "query" ? "queries" : "mutations"].push({
        gql,
        name: rootField.name,
        variables: variablesObj,
      });
    }
  }

  return result;
}
