import { IntrospectionInputValue } from "graphql";

export type Maybe<T> = T | null | undefined;
export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ArgumentInfo {
  arg: IntrospectionInputValue;
}

export type FullArgumentMap = Map<string, ArgumentInfo>;

export class RequestBody {
  mimeType: string = "application/graphql";
  text: string = "";

  constructor(text: string, variables: string) {
    let tempText: any = {};
    tempText.query = text;
    tempText.variables = variables;
    this.text = JSON.stringify(tempText);
  }
}

export class Request {
  _type: string = "request";
  _id: string;
  created: number;
  name: string;
  method: HTTPMethod = "POST";
  headers: any[] = [];
  parentId: Maybe<string>;
  modified: Maybe<number>;
  url: Maybe<string>;
  body: Maybe<RequestBody>;

  constructor(name: string) {
    var ts = Math.round(new Date().getTime() / 1000);
    this.name = name;
    this._id = name + ts;
    this.created = ts;
    this.headers.push({
      name: "Content-Type",
      value: "application/json",
      disabled: false,
    });
  }
}

export class RequestGroup {
  _type: string = "request_group";
  _id: string;
  name: string;
  created: number;
  parentId: Maybe<string>;
  modified: Maybe<number>;
  metaSortKey: Maybe<number>;

  constructor(name: string) {
    var ts = Math.round(new Date().getTime() / 1000);
    this.name = name;
    this._id = name + ts;
    this.created = ts;
  }
}

export class Root {
  _type: string = "export";
  __export_format: number = 3;
  resources: any[] = [];
  __export_date: Maybe<string>;
  __export_source: Maybe<string>;

  addResource(resource: any) {
    this.resources.push(resource);
  }
}
