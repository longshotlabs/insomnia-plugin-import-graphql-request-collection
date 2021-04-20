import convert from "./convert";

interface Request {}

interface Workspace {
  _id: string;
  created: number;
  description: string;
  modified: number;
  name: string;
  parentId: string | null;
  scope: "collection";
  type: "Workspace";
}

interface RequestGroup {}

interface ContextDataExport {
  har: (options: { includePrivate?: boolean }) => Promise<string>;
  insomnia: (options: {
    includePrivate?: boolean;
    format?: "json" | "yaml";
  }) => Promise<string>;
}

interface ContextDataImport {
  raw: (text: string, options: { workspaceId?: string }) => Promise<void>;
  uri: (uri: string, options: { workspaceId?: string }) => Promise<void>;
}

interface ContextApp {
  alert: (title: string, message?: string) => Promise<void>;
  prompt: (
    title: string,
    options?: {
      label?: string;
      defaultValue?: string;
      submitName?: string;
      cancelable?: boolean;
    }
  ) => Promise<string>;
}

interface ContextData {
  export: ContextDataExport;
  import: ContextDataImport;
}

interface Context {
  app: ContextApp;
  data: ContextData;
}

interface Info {
  requestGroup: RequestGroup[];
  requests: Request[];
  workspace: Workspace;
}

interface WorkspaceAction {
  action: (context: Context, info: Info) => Promise<void>;
  icon?: string;
  label: string;
}

const generateRequestsAction: WorkspaceAction = {
  label: "Generate Requests for a GraphQL Server",
  icon: "fa-project-diagram",
  action: async (context: Context, info: Info) => {
    let url = "";
    let hasValidUrl = false;

    do {
      try {
        url = await context.app.prompt("GraphQL server URL", {
          cancelable: true,
          defaultValue: url,
          submitName: "Create Requests",
        });
      } catch (error) {
        if (!error.message.includes("cancelled")) {
          console.error(error.message);
        }
        return;
      }

      if (url.length === 0) {
        console.log("No URL entered. Aborting GQL request generation.");
        return;
      }

      try {
        const urlObj = new URL(url);
        url = urlObj.href;
        hasValidUrl = true;
      } catch (error) {
        await context.app.alert("Invalid URL", `${url} is not a valid URL`);
      }
    } while (!hasValidUrl);

    const result = await convert(url);

    await context.data.import.raw(result, {
      workspaceId: info.workspace._id,
    });
  },
};

export const workspaceActions = [generateRequestsAction];
