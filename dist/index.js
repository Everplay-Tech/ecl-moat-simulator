"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const DIM = 10;
// Math Utilities
const MathUtils = {
    zeros: (n) => new Array(n).fill(0),
    zerosMat: (n) => Array.from({ length: n }, () => new Array(n).fill(0)),
    randomVec: (n) => {
        let v = Array.from({ length: n }, () => (Math.random() - 0.5) * 2);
        return MathUtils.normalize(v);
    },
    norm: (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)),
    normalize: (v) => {
        const n = MathUtils.norm(v);
        return n === 0 ? v : v.map(x => x / n);
    },
    sub: (a, b) => a.map((x, i) => x - b[i]),
    add: (a, b) => a.map((x, i) => x + b[i]),
    scale: (v, s) => v.map(x => x * s),
    matVecMul: (M, v) => M.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0)),
    outer: (u, v) => u.map(x => v.map(y => x * y)),
    matAdd: (A, B) => A.map((row, i) => row.map((val, j) => val + B[i][j])),
    trace: (A) => A.reduce((sum, row, i) => sum + row[i], 0)
};
let state = {
    theta: MathUtils.randomVec(DIM),
    Q: MathUtils.zerosMat(DIM),
    history: [],
    rank: 0,
};
function lithifyConstraint(u) {
    const Qu = MathUtils.matVecMul(state.Q, u);
    const u_orth = MathUtils.sub(u, Qu);
    const n = MathUtils.norm(u_orth);
    if (n < 1e-7)
        return false;
    const u_new = MathUtils.scale(u_orth, 1 / n);
    const P = MathUtils.outer(u_new, u_new);
    state.Q = MathUtils.matAdd(state.Q, P);
    state.history.push(u);
    state.rank++;
    return true;
}
// MCP Server Setup
const server = new index_js_1.Server({
    name: "ecl-moat-simulator",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
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
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
        case "initialize_manifold":
            state = {
                theta: MathUtils.randomVec(DIM),
                Q: MathUtils.zerosMat(DIM),
                history: [],
                rank: 0,
            };
            return { content: [{ type: "text", text: "Manifold initialized." }] };
        case "execute_usage_event":
            if (state.rank >= DIM) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, "Constraint saturation reached.");
            }
            const u = MathUtils.randomVec(DIM);
            const success = lithifyConstraint(u);
            if (success) {
                const g = MathUtils.randomVec(DIM);
                const Qg = MathUtils.matVecMul(state.Q, g);
                const g_fossil = MathUtils.sub(g, Qg);
                state.theta = MathUtils.normalize(MathUtils.add(state.theta, MathUtils.scale(g_fossil, 0.5)));
                return { content: [{ type: "text", text: `Usage event lithified. Rank(Q) is now ${state.rank}.` }] };
            }
            return { content: [{ type: "text", text: "Constraint already exists in this direction." }] };
        case "get_metrics":
            const codim = DIM - state.rank;
            const vol = Math.exp(-state.rank);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            rank: state.rank,
                            codimension: codim,
                            volume_decay: `${(vol * 100).toFixed(2)}%`,
                        }, null, 2),
                    }],
            };
        case "probe_divergence":
            if (state.rank === 0) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, "Add scars before testing divergence.");
            }
            const steps = args?.steps || 10;
            const eta = args?.eta || 0.3;
            let thetaClone = [...state.theta];
            let currentTheta = [...state.theta];
            const results = [];
            for (let i = 0; i < steps; i++) {
                const g = MathUtils.randomVec(DIM);
                const Qg = MathUtils.matVecMul(state.Q, g);
                const g_fossil = MathUtils.sub(g, Qg);
                currentTheta = MathUtils.normalize(MathUtils.add(currentTheta, MathUtils.scale(g_fossil, eta)));
                thetaClone = MathUtils.normalize(MathUtils.add(thetaClone, MathUtils.scale(g, eta)));
                const diff = MathUtils.sub(currentTheta, thetaClone);
                const divergence = MathUtils.norm(diff);
                results.push({ step: i + 1, divergence: divergence.toFixed(4) });
            }
            state.theta = currentTheta;
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
                        text: JSON.stringify({
                            theta: state.theta,
                            Q: state.Q,
                            rank: state.rank,
                        }, null, 2),
                    }],
            };
        default:
            throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("ECL Moat Simulator MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
