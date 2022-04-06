import { buildInsomniaDataFile } from "./insomnia";
import introspectionQueryString from "./introspectionQueryString";

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

  const schema = await getSchema(
    url,
    introspectionQueryString,
    requestHeaders
  );

  return buildInsomniaDataFile(schema, url);
}
