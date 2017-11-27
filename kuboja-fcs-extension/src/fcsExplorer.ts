"use strict";

import {
    Event, EventEmitter, ExtensionContext, SymbolKind, SymbolInformation,
    TextDocument, TextEditor, TreeDataProvider, TreeItem, TreeItemCollapsibleState,
    commands, window, workspace
} from "vscode";
import * as path from "path";

// code from: https://github.com/patrys/vscode-code-outline  Many thanks!


export class SymbolNode {
    symbol: SymbolInformation;
    children?: SymbolNode[];

    constructor(symbol?: SymbolInformation) {
        this.children = [];
        this.symbol = symbol;
    }

    private getKindOrder(kind: SymbolKind): number {
        switch (kind) {
            case SymbolKind.Constructor:
            case SymbolKind.Function:
            case SymbolKind.Method:
                return 3;
            case SymbolKind.Class:
                return 2;
            case SymbolKind.Interface:
                return 1;
            case SymbolKind.Constant:
                return -1;
            case SymbolKind.Module:
                return -2;
            default:
                return 0;
        }
    }

    private compareSymbols(a: SymbolNode, b: SymbolNode): number {
        const kindOrder: number = this.getKindOrder(a.symbol.kind) - this.getKindOrder(b.symbol.kind);
        if (kindOrder !== 0) {
            return kindOrder;
        }
        if (a.symbol.name.toLowerCase() > b.symbol.name.toLowerCase()) {
            return 1;
        }
        return -1;
    }

    public sort(): void {
        this.children.sort(this.compareSymbols.bind(this));
        this.children.forEach((child) => child.sort());
    }

    public addChild(child: SymbolNode): void {
        this.children.push(child);
    }
}


export class FcsExplorerProvider implements TreeDataProvider<SymbolNode> {
    private _onDidChangeTreeData: EventEmitter<SymbolNode | null> = new EventEmitter<SymbolNode | null>();
    readonly onDidChangeTreeData: Event<SymbolNode | null> = this._onDidChangeTreeData.event;

    private context: ExtensionContext;
    private tree: SymbolNode;
    private editor: TextEditor;

    private getSymbols(document: TextDocument): Thenable<SymbolInformation[]> {
        return commands.executeCommand<SymbolInformation[]>("vscode.executeDocumentSymbolProvider", document.uri);
    }

    private async updateSymbols(editor: TextEditor): Promise<void> {
        if (!editor) {
            return;
        }
        const tree: SymbolNode = new SymbolNode();
        this.editor = editor;
        const symbols: SymbolInformation[] = await this.getSymbols(editor.document);
        symbols.reduce((knownContainerScopes, symbol) => {
            let parent: SymbolNode;
            const node: SymbolNode = new SymbolNode(symbol);
            if (!(symbol.containerName in knownContainerScopes)) {
                return knownContainerScopes;
            }
            parent = knownContainerScopes[symbol.containerName];
            parent.addChild(node);
            return { ...knownContainerScopes, [symbol.name]: node };
        }, { "": tree });
        tree.sort();
        this.tree = tree;
    }

    public constructor(context: ExtensionContext) {
        this.context = context;
        window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this._onDidChangeTreeData.fire();
            }
        });
        workspace.onDidChangeTextDocument(event => {
            if (!event.document.isDirty && event.document === this.editor.document) {
                this._onDidChangeTreeData.fire();
            }
        });
        workspace.onDidSaveTextDocument(document => {
            if (document === this.editor.document) {
                this._onDidChangeTreeData.fire();
            }
        });
    }

    async getChildren(node?: SymbolNode): Promise<SymbolNode[]> {
        if (node) {
            return node.children;
        } else {
            await this.updateSymbols(window.activeTextEditor);
            return this.tree.children;
        }
    }

    private getIcon(kind: SymbolKind): { dark: string; light: string } {
        let icon: string;
        switch (kind) {
            case SymbolKind.Class:
                icon = "class";
                break;
            case SymbolKind.Constant:
                icon = "constant";
                break;
            case SymbolKind.Constructor:
            case SymbolKind.Function:
            case SymbolKind.Method:
                icon = "function";
                break;
            case SymbolKind.Interface:
                icon = "interface";
            case SymbolKind.Module:
            case SymbolKind.Namespace:
            case SymbolKind.Object:
            case SymbolKind.Package:
                icon = "module";
                break;
            case SymbolKind.Property:
                icon = "property";
                break;
            default:
                icon = "variable";
                break;
        }
        icon = `icon-${icon}.svg`;
        return {
            dark: this.context.asAbsolutePath(path.join("resources", "dark", icon)),
            light: this.context.asAbsolutePath(path.join("resources", "light", icon))
        };
    }

    public getTreeItem(node: SymbolNode): TreeItem {
        const { kind } = node.symbol;
        let treeItem: TreeItem = new TreeItem(node.symbol.name);
        treeItem.collapsibleState = node.children.length ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None;
        treeItem.command = {
            command: "fcsExplorer.revealRange",
            title: "",
            arguments: [this.editor, node.symbol.location.range]
        };
        treeItem.iconPath = this.getIcon(kind);
        return treeItem;
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}