import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ECLModel } from "./ecl-core.js";

const model = new ECLModel();

const server = new Server(
  {
    name: "ecl-moat-simulator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "initialize_manifold",
        description: "Resets the manifold to its initial state.",
      },
      {
        name: "execute_usage_event",
        description: "Adds a new scar (lithifies a constraint) to the manifold.",
      },
      {
        name: "get_metrics",
        description: "Returns the current mathematical metrics of the manifold.",
      },
      {
        name: "probe_divergence",
        description: "Runs a trajectory test to measure divergence between a cloned model and the original.",
        inputSchema: {
          type: "object",
          properties: {
            steps: { type: "number", description: "Number of steps in the probe (default 10)." },
            eta: { type: "number", description: "Learning rate for the probe (default 0.3)." },
          },
        },
      },
      {
        name: "get_state",
        description: "Returns the current full state of the model (theta and Q).",
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "initialize_manifold":
      model.reset();
      return { content: [{ type: "text", text: "Manifold initialized." }] };

    case "execute_usage_event":
      const success = model.executeUsageEvent();
      if (success) {
        return { content: [{ type: "text", text: `Usage event lithified. Rank(Q) is now ${model.state.rank}.` }] };
      }
      throw new McpError(ErrorCode.InvalidRequest, "Constraint saturation reached.");

    case "get_metrics":
      const metrics = model.getMetrics();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...metrics,
            volume_decay: `${(metrics.volume_decay * 100).toFixed(2)}%`,
          }, null, 2),
        }],
      };

    case "probe_divergence":
      const results = model.probeDivergence(args?.steps as number, args?.eta as number);
      if (!results) {
        throw new McpError(ErrorCode.InvalidRequest, "Add scars before testing divergence.");
      }
      return {
        content: [{
          type: "text",
          text: `Divergence probe complete. Results:\n${JSON.stringify(results, null, 2)}`,
        }],
      };

    case "get_state":
      return {
        content: [{
          type: "text",
          text: JSON.stringify(model.state, null, 2),
        }],
      };

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ECL Moat Simulator MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
