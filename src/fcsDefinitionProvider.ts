import * as vscode from "vscode";
import { FcsSymbolProvider } from "./fcsSymbolUtil";


export class FcsDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Promise<vscode.Location | vscode.Location[] | undefined> {

        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange === undefined) { return; }

        const word = document.getText(wordRange);
        if (!word) { return; }

        // 1. Search in current document first
        const symbolsInDoc = FcsSymbolProvider.getSymbolsInDocument(document, token);
        for (const sym of symbolsInDoc) {
            if (sym.name === word) {
                return sym.location;
            }
        }

        // 2. Recursively search imported files
        return this.findInImports(document, word, token, new Set([document.uri.fsPath]));
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