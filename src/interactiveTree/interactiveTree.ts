"use strict";

import * as vscode from "vscode";

import { Entry, TreeInteractionProvider } from "./treeInteractionProvider";


export class InteractiveTree implements vscode.Disposable {
    private treeDataProvider: TreeInteractionProvider;
    private tree: vscode.TreeView<Entry>;

    constructor(context: vscode.ExtensionContext) {
        this.treeDataProvider = new TreeInteractionProvider(context);
        this.tree = vscode.window.createTreeView('fcstree', { treeDataProvider: this.treeDataProvider });

        vscode.commands.registerCommand('fcs-vscode.intOpen', () => this.openFromEditor());

        vscode.commands.registerCommand('fcs-vscode.intClose', (resource) => this.close(resource));
        vscode.commands.registerCommand('fcs-vscode.intOpenSource', (resource) => this.resolve(resource));
        vscode.commands.registerCommand('fcs-vscode.intRefresh', (resource) => this.refresh(resource));
        vscode.commands.registerCommand('fcs-vscode.intResolve', (resource) => this.resolve(resource));
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

    private async resolve(element: Entry | undefined) {
        if (!element) { return; }
        await this.treeDataProvider.resolve(element);
    }

    private async refresh(element: Entry | undefined) {
        if (!element) { return; }
        await this.treeDataProvider.refresh(element);
    }

    private async openSource(element: Entry | undefined) {
       
    }

    public dispose(){
        this.treeDataProvider.dispose();
        this.tree.dispose();
    }
}
