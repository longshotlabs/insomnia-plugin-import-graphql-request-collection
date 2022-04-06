import {
  Root,
  RequestGroup,
  Request,
  RequestBody,
} from "./types";
import type { IntrospectionSchema } from "graphql";
import { processSchema } from "./utils";

export function buildInsomniaDataFile(
  schema: any,
  url: string
): string {
  let rootExport = new Root();
  const types: IntrospectionSchema["types"] = schema.data.__schema.types;
  let graphQLRequestsGroup = new RequestGroup(url);
  rootExport.addResource(graphQLRequestsGroup);

  const { mutations, queries } = processSchema(schema);

  // queries
  const queriesRequestGroup = new RequestGroup("queries");
  queriesRequestGroup.parentId = graphQLRequestsGroup._id;
  for (const query of queries) {
    const request = new Request(query.name);
    request.url = '_.graphQlUrl';
    request.headers.push({ 'Authorization': 'Bearer _.token' })
    request.parentId = queriesRequestGroup._id;
    request.body = new RequestBody(
      query.gql,
      JSON.stringify(query.variables, null, 2)
    );
    rootExport.addResource(request);
  }
  rootExport.addResource(queriesRequestGroup);

  const mutationsRequestGroup = new RequestGroup("mutations");
  mutationsRequestGroup.parentId = graphQLRequestsGroup._id;
  for (const query of queries) {
    const request = new Request(query.name);
    request.url = '_.graphQlUrl';
    request.headers.push({ 'Authorization': 'Bearer _.token' })
    request.parentId = mutationsRequestGroup._id;
    request.body = new RequestBody(
      query.gql,
      JSON.stringify(query.variables, null, 2)
    );
    rootExport.addResource(request);
  }
  rootExport.addResource(mutationsRequestGroup);

  return JSON.stringify(rootExport, null, 2);
}
