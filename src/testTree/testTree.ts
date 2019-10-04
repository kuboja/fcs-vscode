"use strict";

import * as vscode from "vscode";

import { TestNode, TestTreeProvider } from "./testTreeProvider";
import { FcsSymbolProvider } from "../fcsSymbolUtil";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";
import { Disposable } from "vscode-jsonrpc";


export class TestTree implements vscode.Disposable {

    private fliUpdater: FliUpdater;
    private treeDataProvider: TestTreeProvider;
    private tree: vscode.TreeView<TestNode>;
    private disposable: Disposable[];

    constructor(context: vscode.ExtensionContext, extData: ExtensionData, fliUpdater: FliUpdater) {
        this.disposable = [];
        
        this.fliUpdater = fliUpdater;

        this.treeDataProvider = new TestTreeProvider(context, this.fliUpdater, extData);
        this.tree = vscode.window.createTreeView('fcstesttree', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

        this.treeDataProvider.tree = this.tree;

        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesEvaluateTests', async (resource) => await this.evaluteTests(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesReloadTests', async (resource) => await this.refreshTests(resource)));
    }

    private async evaluteTests(element: TestNode | undefined) {
        await this.treeDataProvider.evalutateTests(element);
    }

    private async refreshTests(element: TestNode | undefined) {
        await this.treeDataProvider.refreshTests();
    }

    public dispose() {
        this.treeDataProvider.dispose();
        this.tree.dispose();

        for (const d of this.disposable) {
            d.dispose();
        }
    }
}
