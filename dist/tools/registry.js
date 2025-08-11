import { ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
export const toolRegistry = [];
export function toolExists(name) { return toolRegistry.some(t => t.name === name); }
export function getToolDefinitions() {
    return toolRegistry.map(t => {
        const raw = zodToJsonSchema(t.zodSchema, t.name);
        const def = raw.definitions?.[t.name] ?? raw;
        return {
            name: t.name,
            description: t.description,
            inputSchema: {
                type: "object",
                properties: def.properties || {},
                required: def.required || [],
            }
        };
    });
}
export function getPromptDefinitions() {
    return toolRegistry.filter(t => t.prompt).map(t => ({
        name: t.name,
        description: t.prompt.description,
        arguments: t.prompt.arguments || extractPromptArguments(t.zodSchema),
    }));
}
export function getPromptMessage(toolName, args) {
    const tool = toolRegistry.find(t => t.name === toolName);
    if (!tool?.prompt)
        throw new Error(`No prompt defined for tool: ${toolName}`);
    const bits = [];
    if (args.prompt)
        bits.push(args.prompt);
    for (const [k, v] of Object.entries(args)) {
        if (k === "prompt" || v === undefined || v === null || v === false)
            continue;
        if (typeof v === "boolean")
            bits.push(`[${k}]`);
        else
            bits.push(`(${k}: ${v})`);
    }
    return `Use the ${toolName} tool${bits.length ? ": " + bits.join(" ") : ""}`;
}
export async function executeTool(toolName, args, onProgress) {
    const tool = toolRegistry.find(t => t.name === toolName);
    if (!tool)
        throw new Error(`Unknown tool: ${toolName}`);
    try {
        const validated = tool.zodSchema.parse(args);
        return await tool.execute(validated, onProgress);
    }
    catch (err) {
        if (err instanceof ZodError) {
            const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            throw new Error(`Invalid arguments for ${toolName}: ${issues}`);
        }
        throw err;
    }
}
function extractPromptArguments(zodSchema) {
    const json = zodToJsonSchema(zodSchema);
    const props = json.properties || {};
    const req = json.required || [];
    return Object.entries(props).map(([name, prop]) => ({
        name,
        description: prop.description || `${name} parameter`,
        required: req.includes(name),
    }));
}
