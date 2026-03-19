import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ExtensionData } from "./extensionData";

/**
 * Returns the path to fliw.exe (preferred) or fli.exe using the same
 * lookup order as FemcadRunner: local override first, then the flivs cache.
 */
function findFliPath(extData: ExtensionData): string | undefined {
    const candidates = ["fliw.exe", "fli.exe"];

    const overrideDir = extData.localOverridePath;
    if (overrideDir) {
        for (const name of candidates) {
            const p = path.join(overrideDir, name);
            if (fs.existsSync(p)) { return p; }
        }
    }

    const flivsFolder = extData.flivsFolderPath;
    if (flivsFolder) {
        for (const name of candidates) {
            const p = path.join(flivsFolder, name);
            if (fs.existsSync(p)) { return p; }
        }
    }

    return undefined;
}

/**
 * Registers an MCP server definition provider so that VS Code (and agents
 * running inside it) can discover and call the FCS evaluation tools.
 *
 * The provider is registered under the id "fcs-vscode.mcpServer" which
 * must match the entry in contributes.mcpServerDefinitionProviders in
 * package.json.
 */
export function registerMcpServerProvider(
    context: vscode.ExtensionContext,
    extData: ExtensionData
): void {
    const mcpServerScript = path.join(context.extensionUri.fsPath, "dist", "mcpServer.js");
    const extensionVersion: string = context.extension.packageJSON.version as string;

    const provider: vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> = {
        provideMcpServerDefinitions(
            _token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
            const fliPath = findFliPath(extData);

            if (!fliPath) {
                // flivs not yet downloaded — return empty list; VS Code will
                // retry on the next invocation.
                console.warn("FCS MCP: fliw.exe / fli.exe not found, MCP server not registered.");
                return [];
            }

            return [
                new vscode.McpStdioServerDefinition(
                    "FemCAD Script (FCS)",
                    // Use the editor's own Node.js binary so the bundled script
                    // always runs in a compatible environment.
                    process.execPath,
                    [mcpServerScript],
                    { FLI_PATH: fliPath },
                    extensionVersion
                ),
            ];
        },
    };

    context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider("fcs-vscode.mcpServer", provider)
    );

    console.log("FCS MCP: MCP server provider registered.");
}
