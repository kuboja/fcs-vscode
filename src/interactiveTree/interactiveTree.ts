"use strict";

import * as vscode from "vscode";

import { Entry, TreeInteractionProvider } from "./treeInteractionProvider";
import { FcsSymbolProvider } from "../fcsSymbolUtil";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";


export class InteractiveTree implements vscode.Disposable {
    private fliUpdater: FliUpdater;
    private treeDataProvider: TreeInteractionProvider;
    private tree: vscode.TreeView<Entry>;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData) {
        this.fliUpdater = new FliUpdater(context, extData);
        
        this.treeDataProvider = new TreeInteractionProvider(context, this.fliUpdater);
        this.tree = vscode.window.createTreeView('fcstree', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

        vscode.commands.registerCommand('fcs-vscode.intOpen', () => this.openFromEditor());

        vscode.commands.registerCommand('fcs-vscode.intClose', (resource) => this.close(resource));
        vscode.commands.registerCommand('fcs-vscode.intOpenSource', (resource) => this.openSource(resource));
        vscode.commands.registerCommand('fcs-vscode.intRefresh', (resource) => this.refresh(resource));
        vscode.commands.registerCommand('fcs-vscode.intEvaluate', (resource) => this.evaluate(resource));
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

        try {
            await this.tree.reveal(root, { select: true, expand: true, focus: true });
        }
        catch (e) {
            console.error(e);
        }
    }

    private async updateFlivs(){
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
        await this.treeDataProvider.evaluate(element);
    }

    private async refresh(element: Entry | undefined) {
        if (!element) { return; }
        await this.treeDataProvider.refresh(element);
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

    public dispose(){
        this.treeDataProvider.dispose();
        this.tree.dispose();
    }
}
