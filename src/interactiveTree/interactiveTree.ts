"use strict";

import * as vscode from "vscode";

import { Entry, TreeInteractionProvider } from "./treeInteractionProvider";


export class InteractiveTree {
    private treeDataProvider: TreeInteractionProvider;
    private tree: vscode.TreeView<Entry>;

    constructor(context: vscode.ExtensionContext) {
        this.treeDataProvider = new TreeInteractionProvider(context);
        this.tree = vscode.window.createTreeView('fcstree', { treeDataProvider: this.treeDataProvider });

        vscode.commands.registerCommand('fcs-vscode.intOpen', () => this.openFromEditor());
        vscode.commands.registerCommand('fcs-vscode.intClose', (resource) => this.close(resource));
        vscode.commands.registerCommand('fcs-vscode.treeitemResolve', (resource) => this.resolve(resource));
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

        let root = this.treeDataProvider.open(filePath);

        try {
            await this.tree.reveal(root, { select: true, expand: true, focus: true });
        }
        catch (e) {
            console.error(e);
        }
    }

    private async close(element: Entry | undefined) {
        if (!element) {
            return;
        }

        await this.treeDataProvider.close(element);
    }

    private async resolve(resource: Entry | undefined) {
        await this.treeDataProvider.resolve(resource);
    }
}
