import * as vscode from "vscode";

import { Entry, TreeInteractionProvider } from "./treeInteractionProvider";
import { FcsSymbolProvider } from "../fcsSymbolUtil";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";


export class InteractiveTree implements vscode.Disposable {
    private fliUpdater: FliUpdater;
    private treeDataProvider: TreeInteractionProvider;
    private tree: vscode.TreeView<Entry>;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData, fliUpdater: FliUpdater) {
        this.fliUpdater = fliUpdater;

        this.treeDataProvider = new TreeInteractionProvider(context, this.fliUpdater, extData);
        this.tree = vscode.window.createTreeView('fcstree', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

        vscode.commands.registerCommand('fcs-vscode.intOpen', async () => await this.openFromEditor());

        vscode.commands.registerCommand('fcs-vscode.intClose', async (resource) => await this.close(resource));
        vscode.commands.registerCommand('fcs-vscode.intOpenSource', async (resource) => await this.openSource(resource));
        vscode.commands.registerCommand('fcs-vscode.intRefresh', async (resource) => await this.refresh(resource));
        vscode.commands.registerCommand('fcs-vscode.intEvaluate', async (resource) => await this.evaluate(resource));
        vscode.commands.registerCommand('fcs-vscode.intValueToOutput', async (resource) => await this.valueToOutput(resource));
    }

    private async openFromEditor() {
        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            console.log("Není otevřen žádný editor?");
            return;
        }

        let filePath = editor.document.uri.fsPath;
        if (!filePath) {
            console.log("Soubor nemá cestu na disku!");
            return;
        }

        let root = await this.treeDataProvider.open(filePath);

        if (!root) { return; }

        try {
            await this.tree.reveal(root, { select: true, expand: true, focus: true });
        }
        catch (e) {
            console.error(e);
        }
    }

    private async updateFlivs() {
        return await this.fliUpdater.runUpdate();
    }

    private async close(element: Entry | undefined) {
        if (!element) {
            return;
        }

        await this.treeDataProvider.close(element);
    }

    private async evaluate(element: Entry | undefined) {
        if (!element) { return; }
        this.treeDataProvider.evaluate(element);
    }

    private async refresh(element: Entry | undefined) {
        if (!element) { return; }
        this.treeDataProvider.refresh(element);
    }

    private async valueToOutput(element: Entry | undefined) {
        if (!element) { return; }
        this.treeDataProvider.valueToOutput(element);
    }

    private async openSource(element: Entry | undefined) {
        if (!element) { return; }
        try {
            let doc = await vscode.workspace.openTextDocument(element.filePath);

            let symbs = FcsSymbolProvider.getSymbolsInDocument(doc);
            let symb = symbs.find(s => s.name === element.name);
            let sel = symb ? symb.location.range : undefined;

            await vscode.window.showTextDocument(doc, { selection: sel });
        } catch (error) {
            console.error(error);
        }
    }

    public dispose() {
        this.treeDataProvider.dispose();
        this.tree.dispose();
    }
}
