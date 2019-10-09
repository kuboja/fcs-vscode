import * as vscode from "vscode";

import { TestNode, TestTreeProvider } from "./testTreeProvider";
import { FcsSymbolProvider } from "../fcsSymbolUtil";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";
import { Disposable } from "vscode-jsonrpc";


export class TestTree implements vscode.Disposable {

    private extData: ExtensionData;
    private fliUpdater: FliUpdater;
    private treeDataProvider: TestTreeProvider;
    private tree: vscode.TreeView<TestNode>;
    private disposable: Disposable[];

    constructor(context: vscode.ExtensionContext, extData: ExtensionData, fliUpdater: FliUpdater) {
        this.disposable = [];
        this.extData = extData;
        this.fliUpdater = fliUpdater;

        this.treeDataProvider = new TestTreeProvider(context, this.fliUpdater, extData);
        this.tree = vscode.window.createTreeView('fcstesttree', { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

        this.treeDataProvider.tree = this.tree;

        if (this.tree) {
            this.tree.onDidExpandElement(this.treeDataProvider.expandEvent, this.treeDataProvider, this.disposable);
            this.tree.onDidCollapseElement(this.treeDataProvider.collapseEvent, this.treeDataProvider, this.disposable);
            this.tree.onDidChangeVisibility(this.onVisibleEvent, this, this.disposable);
        }

        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesEvaluateTests', async (resource) => await this.evaluteTests(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesReloadTests', async (resource) => await this.refreshTests(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesCompareValues', async (resource) => await this.compareValues(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesCopyResult', async (resource) => await this.copyResult(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesCopyResultClear', async (resource) => await this.copyResultClear(resource)));
        this.disposable.push(vscode.commands.registerCommand('fcs-vscode.tesMessageToOutput', async (resource) => await this.messageToOutput(resource)));
    }

    private async evaluteTests(element: TestNode | undefined) {
        await this.treeDataProvider.evalutateTests(element);
    }

    private async refreshTests(element: TestNode | undefined) {
        await this.treeDataProvider.refreshTests();
    }

    private async compareValues(element: TestNode | undefined) {
        await this.treeDataProvider.compareValues(element);
    }

    private async copyResult(element: TestNode | undefined) {
        await this.treeDataProvider.copyResult(element, false);
    }

    private async copyResultClear(element: TestNode | undefined) {
        await this.treeDataProvider.copyResult(element, true);
    }

    private async messageToOutput(element: TestNode | undefined) {
        this.treeDataProvider.messageToOutput(element);
    }

    private onVisibleRised = false;
    private async onVisibleEvent(event: vscode.TreeViewVisibilityChangeEvent) {
        if (event.visible && !this.onVisibleRised && this.extData.testsAutoload) {
            await this.treeDataProvider.refreshTests();
            this.onVisibleRised = true;
        }
    }

    public dispose() {
        this.treeDataProvider.dispose();
        this.tree.dispose();

        for (const d of this.disposable) {
            d.dispose();
        }
    }
}
