import {
  FullArgumentMap,
  Root,
  RequestGroup,
  Request,
  RequestBody,
} from "./types";
import type { IntrospectionObjectType, IntrospectionSchema } from "graphql";
import { buildField, buildQueryArgs, getDefaultValueForArg } from "./utils";

export function buildInsomniaDataFile(
  schema: any,
  url: string,
  rootQueryName: string,
  rootMutationName: string
): string {
  let rootExport = new Root();
  const types: IntrospectionSchema["types"] = schema.data.__schema.types;
  let graphQLRequestsGroup = new RequestGroup(url);
  rootExport.addResource(graphQLRequestsGroup);

  types.forEach((type) => {
    if (type.name === rootQueryName || type.name === rootMutationName) {
      let requestGroup = new RequestGroup(type.name);
      requestGroup.parentId = graphQLRequestsGroup._id;
      rootExport.addResource(requestGroup);

      let requestType = type.name == rootQueryName ? "query" : "mutation";

      let fields = [...(type as IntrospectionObjectType).fields];
      fields.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });

      fields.forEach((rootField) => {
        let request = new Request(rootField.name);
        request.url = url;
        request.parentId = requestGroup._id;

        const variables: FullArgumentMap = new Map();
        const requestMainBody = buildField(rootField, { variables, types });

        let queryArgsText = buildQueryArgs(variables);
        if (queryArgsText.length > 0) queryArgsText = " " + queryArgsText;

        let bodyText =
          requestType + queryArgsText + " {\n" + requestMainBody + "\n}";

        const variablesObj: Record<string, any> = {};
        for (const [variableName, { arg }] of variables.entries()) {
          variablesObj[variableName] = getDefaultValueForArg(arg);
        }

        request.body = new RequestBody(
          bodyText,
          JSON.stringify(variablesObj, null, 2)
        );
        rootExport.addResource(request);
      });
    }
  });

  return JSON.stringify(rootExport, null, 2);
}
