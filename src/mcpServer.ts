/**
 * FCS MCP Server — runs as a standalone Node.js subprocess launched by VS Code.
 *
 * Exposes three tools:
 *   fcs_evaluate       – evaluates a FCS expression and returns text output  (like #print)
 *   fcs_evaluate_json  – evaluates a FCS expression and returns JSON output   (like #fli_json)
 *   fcs_export         – exports a FCS expression to a file in a given format (like #fli_html, #fli_pdf, …)
 *
 * The path to fliw.exe / fli.exe is passed via the FLI_PATH environment variable
 * set by FcsMcpServerProvider in the VS Code extension.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync } from "fs";

const FLI_PATH: string = process.env["FLI_PATH"] ?? "";

if (!FLI_PATH) {
    process.stderr.write("FCS MCP: FLI_PATH environment variable is not set.\n");
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Helper – run fliw.exe and collect stdout
// ---------------------------------------------------------------------------

function runFli(filePath: string, expression: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Mirror the existing FemcadRunner approach: use cmd to set UTF-8 code page
        // before running fli so that output is decoded correctly.
        const quotedFli = `"${FLI_PATH}"`;
        const quotedFile = `"${filePath}"`;
        const quotedExpr = `"${expression.replace(/"/g, '\\"')}"`;
        const fullCmd = `cmd /c chcp 65001 >nul && ${quotedFli} ${quotedFile} ${quotedExpr}`;

        const proc = spawn(fullCmd, [], { shell: true });

        let stdout = "";
        let stderr = "";

        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");

        proc.stdout.on("data", (chunk: string) => { stdout += chunk; });
        proc.stderr.on("data", (chunk: string) => { stderr += chunk; });

        proc.on("close", (code) => {
            const output = stdout || stderr;
            if (code === 0 || stdout) {
                resolve(output.trim());
            } else {
                reject(new Error(`fli exited with code ${code}:\n${output}`));
            }
        });

        proc.on("error", (err) => reject(err));
    });
}

// ---------------------------------------------------------------------------
// Helper – run fliw.exe in export mode and return the output file path
// ---------------------------------------------------------------------------

const EXPORT_FORMATS = ["HTML", "PDF", "PNG", "JPG", "DXF", "DOCX", "XLSX", "RTF", "IFC", "SVG", "ZIP"] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

const FORMAT_EXTENSION: Record<ExportFormat, string> = {
    HTML:  "html",
    PDF:   "pdf",
    PNG:   "png",
    JPG:   "jpg",
    DXF:   "dxf",
    DOCX:  "docx",
    XLSX:  "xlsx",
    RTF:   "rtf",
    IFC:   "ifc",
    SVG:   "svg",
    ZIP:   "zip",
};

function buildOutputPath(format: ExportFormat): string {
    const ts   = Date.now();
    const rnd  = Math.random().toString(36).replace(/[^a-z]+/g, "").substring(0, 6);
    const ext  = FORMAT_EXTENSION[format];
    return join(tmpdir(), `fcs_mcp_${ts}_${rnd}.${ext}`);
}

function runFliExport(filePath: string, expression: string, format: ExportFormat, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const quotedFli    = `"${FLI_PATH}"`;
        const quotedFile   = `"${filePath}"`;
        const quotedExpr   = `"${expression.replace(/"/g, '\\"')}"`;
        const quotedOutput = `"${outputPath}"`;
        const fullCmd = `cmd /c chcp 65001 >nul && ${quotedFli} ${quotedFile} ${quotedExpr} --t ${format} --o ${quotedOutput}`;

        const proc = spawn(fullCmd, [], { shell: true });

        let stderr = "";
        proc.stderr.setEncoding("utf8");
        proc.stderr.on("data", (chunk: string) => { stderr += chunk; });

        proc.on("close", (code) => {
            if (code === 0 && existsSync(outputPath)) {
                resolve();
            } else {
                reject(new Error(`fli export failed (code ${code}):\n${stderr.trim()}`));
            }
        });

        proc.on("error", (err) => reject(err));
    });
}

// ---------------------------------------------------------------------------
// MCP Server definition
// ---------------------------------------------------------------------------

const server = new McpServer({
    name: "fcs-mcp",
    version: "1.0.0",
});

const inputSchema = {
    file_path: z.string().describe("Absolute path to the .fcs file"),
    expression: z.string().describe(
        "FCS expression to evaluate (e.g. 'myVar', 'myVar.Length', 'myObject.Area')"
    ),
};

// Tool 1 – plain text output (equivalent to #print)
server.registerTool(
    "fcs_evaluate",
    {
        description:
            "Evaluate a FCS expression in the context of a .fcs file and return the text output. " +
            "Use this to inspect variable values, computed properties, or any FCS expression.",
        inputSchema,
    },
    async ({ file_path, expression }) => {
        const output = await runFli(file_path, expression);
        return { content: [{ type: "text", text: output }] };
    }
);

// Tool 2 – JSON output (equivalent to #fli_json)
server.registerTool(
    "fcs_evaluate_json",
    {
        description:
            "Evaluate a FCS expression in the context of a .fcs file and return the result serialised as JSON. " +
            "Prefer this tool when you need to inspect structured data (objects, lists, geometry).",
        inputSchema,
    },
    async ({ file_path, expression }) => {
        const jsonExpr = `Fcs.Converters.ToJson( ${expression} )`;
        const output = await runFli(file_path, jsonExpr);
        return { content: [{ type: "text", text: output }] };
    }
);

// Tool 3 – export to file (equivalent to #fli_html, #fli_pdf, #fli_png, …)
server.registerTool(
    "fcs_export",
    {
        description:
            "Export a FCS expression to a file in the requested format (HTML, PDF, PNG, JPG, DXF, DOCX, XLSX, RTF, IFC, SVG, ZIP). " +
            "Equivalent to the #fli_html / #fli_pdf / … commands in the FCS extension. " +
            "Returns the absolute path of the generated output file.",
        inputSchema: {
            file_path: z.string().describe("Absolute path to the .fcs file"),
            expression: z.string().describe(
                "FCS expression to export (e.g. 'myReport', 'myObject')"
            ),
            format: z.enum(EXPORT_FORMATS).describe(
                "Output format: HTML | PDF | PNG | JPG | DXF | DOCX | XLSX | RTF | IFC | SVG | ZIP"
            ),
        },
    },
    async ({ file_path, expression, format }) => {
        const outputPath = buildOutputPath(format);
        await runFliExport(file_path, expression, format, outputPath);
        return { content: [{ type: "text", text: outputPath }] };
    }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
server.connect(transport).catch((err: unknown) => {
    process.stderr.write(`FCS MCP: Failed to start server: ${err}\n`);
    process.exit(1);
});
