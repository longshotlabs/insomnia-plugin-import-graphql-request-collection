# Import GraphQL Request Collection Insomnia Plugin

A plugin for the [Insomnia app](https://insomnia.rest/)

Gets the GraphQL schema from a URL and creates a request collection for all possible queries and mutations

## Install

Clone this repo, and then in the cloned project folder:

```
# pick correct one
npm run install-on-ubuntu
npm run install-on-mac
```

Then open Insomnia and go to Application > Preferences > Plugins. It should show up automatically. Make sure it's enabled.

## Use

1. Make sure the GraphQL server is running and has schema introspection enabled.
2. Create a new request collection in Insomnia, or open an existing collection.
3. In the upper left of the window, by the name of the collection, click the drop down.
4. Choose Generate Requests for a GraphQL Server
5. Enter the server URL, such as http://localhost:3000/graphql.
6. Click Create Requests.
