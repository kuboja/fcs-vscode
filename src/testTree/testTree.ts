"use strict";

import * as vscode from "vscode";

import { TestNode, TestTreeProvider } from "./testTreeProvider";
import { FcsSymbolProvider } from "../fcsSymbolUtil";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";


export class TestTree implements vscode.Disposable {

    private fliUpdater: FliUpdater;
    private treeDataProvider: TestTreeProvider;
    private tree: vscode.TreeView<TestNode>;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData, fliUpdater: FliUpdater) {
        this.fliUpdater = fliUpdater;
        
        this.treeDataProvider = new TestTreeProvider(context, this.fliUpdater, extData);
        this.tree = vscode.window.createTreeView('fcstesttree', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

        vscode.commands.registerCommand('fcs-vscode.tesEvaluateTests', async (resource) => await this.evaluteTests(resource));

     //   vscode.commands.registerCommand('fcs-vscode.intClose', async (resource) => await this.close(resource));
     //   vscode.commands.registerCommand('fcs-vscode.intOpenSource', async (resource) => await this.openSource(resource));
        vscode.commands.registerCommand('fcs-vscode.tesReloadTests', async (resource) => await this.refreshTests(resource));
     //   vscode.commands.registerCommand('fcs-vscode.intEvaluate', async (resource) => await this.evaluate(resource));
     //   vscode.commands.registerCommand('fcs-vscode.intValueToOutput', async (resource) => await this.valueToOutput(resource));
    }

    private evaluteTests(element: TestNode | undefined) {
        this.treeDataProvider.evalutateTests(element);
    }

    private refreshTests(element: TestNode | undefined) {
        this.treeDataProvider.refreshTests();
    }

    public dispose(){
        this.treeDataProvider.dispose();
        this.tree.dispose();
    }
}
