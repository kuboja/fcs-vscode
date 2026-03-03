import * as path from "path";
import * as vscode from "vscode";
import { FcsSymbolProvider } from "./fcsSymbolUtil";


export class FcsDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<vscode.Location | vscode.Location[] | undefined> {

        // 1. Check if cursor is inside a filename string on a gclass line
        //    e.g.  gclass {res} filename "_FcsComponentResources.fcs"
        const gclassFilePath = FcsDefinitionProvider.getGclassFilenameAtPosition(document, position);
        if (gclassFilePath) {
            return new vscode.Location(vscode.Uri.file(gclassFilePath), new vscode.Position(0, 0));
        }

        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange === undefined) { return; }

        const word = document.getText(wordRange);
        if (!word) { return; }

        // 2. Search in current document first
        const symbolsInDoc = FcsSymbolProvider.getSymbolsInDocument(document, token);
        for (const sym of symbolsInDoc) {
            if (sym.name === word) {
                return sym.location;
            }
        }

        // 3. Recursively search imported files
        return this.findInImports(document, word, token, new Set([document.uri.fsPath]));
    }

    /**
     * If the cursor is inside the quoted filename string on a `gclass` line
     * (e.g. `gclass {Name} filename "file.fcs"`), returns the resolved absolute path.
     */
    public static getGclassFilenameAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
        const lineText = document.lineAt(position.line).text;

        if (!lineText.trimStart().startsWith("gclass ")) { return undefined; }

        const reg = /\bfilename\s+\(?"([^"]+)"\)?/g;
        let match: RegExpExecArray | null;
        while ((match = reg.exec(lineText)) !== null) {
            const quoteStart = match.index + match[0].indexOf('"');
            const quoteEnd   = match.index + match[0].length; // one past closing quote
            if (position.character >= quoteStart && position.character < quoteEnd) {
                const dir = path.dirname(document.uri.fsPath);
                return path.resolve(dir, match[1]);
            }
        }
        return undefined;
    }

    private async findInImports(
        document: vscode.TextDocument,
        word: string,
        token: vscode.CancellationToken,
        visited: Set<string>
    ): Promise<vscode.Location | undefined> {

        const importPaths = FcsSymbolProvider.getImportPathsInDocument(document);

        for (const importPath of importPaths) {
            if (visited.has(importPath)) { continue; }
            visited.add(importPath);

            try {
                const importedDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(importPath));

                const symbols = FcsSymbolProvider.getSymbolsInDocument(importedDoc, token);
                for (const sym of symbols) {
                    if (sym.name === word) {
                        return sym.location;
                    }
                }

                // Recurse into imports of the imported file
                const found = await this.findInImports(importedDoc, word, token, visited);
                if (found) { return found; }
            } catch {
                // File not accessible — skip silently
            }
        }

        return undefined;
    }
}