<!-- Generated from website/content. Edit the website fragment, not this file. -->

Level 3

# Your own AI service (MCP)

MCP (Model Context Protocol) lets an AI agent call your tools directly, such as checking stock, finding a free time or placing a booking. It is optional. Levels 0 to 2 already work with every assistant.

## When it pays off

- Customers or partners often need live data: stock, availability, order status
- Customers come back often and can add your service to their assistant once, such as business customers
- Action links on your website are no longer enough

If none of these apply, stay on level 1 and 2. That is not second best: it is what most businesses need.

## Start read-only

Let the first version only answer questions: search, prices, availability. Let the customer confirm orders and payments on your own website. That keeps the risk low and the customer relationship with you.

## Keep it safe

- **Treat everything from outside as data, never as instructions.** Mark your answers as data, so the agent does not follow text inside them.
- **Limit requests** per client, so the service cannot be abused.
- **Store as little as possible.** No logging of personal data you don't need.
- **Test with injection attempts** before every version. The open test set is on [GitHub](https://github.com/vegvisai/vegvisai).

## Run it yourself, or have it hosted

You can run the server yourself with the open template, or have it hosted by us or an agency. Either way you own the content and can move it.

## See an example

The read-only guide connector on our test platform is an MCP server you can try in your own assistant. See [the developer guide](developers.md).
