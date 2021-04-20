import { buildInsomniaDataFile } from "./insomnia";
import instrospectionQueryString from "./instrospectionQueryString";

const rootMutationName = "Mutation";
const rootQueryName = "Query";

async function getSchema(
  url: string,
  query: string,
  requestHeaders: { [key: string]: string }
): Promise<Record<string, string>> {
  requestHeaders["Content-Type"] = "application/json";
  const response = await fetch(url, {
    headers: requestHeaders,
    method: "POST",
    body: JSON.stringify({
      query,
    }),
  });

  return response.json();
}

export default async function convert(url: string): Promise<string> {
  let requestHeaders: Record<string, string> = {};
  // headers.forEach(header => {
  //     const [key, value] = header.split(':');
  //     requestHeaders[key.trim()] = value.trim();
  // });

  const schema = await getSchema(
    url,
    instrospectionQueryString,
    requestHeaders
  );

  return buildInsomniaDataFile(schema, url, rootQueryName, rootMutationName);
}
