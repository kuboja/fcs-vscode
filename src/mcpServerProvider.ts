import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ExtensionData } from "./extensionData";

/**
 * Returns the path to flimcp.exe using the same lookup order as FemcadRunner:
 * local override first, then the flivs cache.
 */
function findFlimcpPath(extData: ExtensionData): string | undefined {
    const overrideDir = extData.localOverridePath;
    if (overrideDir) {
        const p = path.join(overrideDir, "flimcp.exe");
        if (fs.existsSync(p)) { return p; }
    }

    const flivsFolder = extData.flivsFolderPath;
    if (flivsFolder) {
        const p = path.join(flivsFolder, "flimcp.exe");
        if (fs.existsSync(p)) { return p; }
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
    const extensionVersion: string = context.extension.packageJSON.version as string;

    const provider: vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> = {
        provideMcpServerDefinitions(
            _token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
            const flimcpPath = findFlimcpPath(extData);

            if (!flimcpPath) {
                console.warn("FCS MCP: flimcp.exe not found, MCP server not registered.");
                return [];
            }

            return [
                new vscode.McpStdioServerDefinition(
                    "Fcs MCP Server",
                    flimcpPath,
                    [],
                    {},
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
