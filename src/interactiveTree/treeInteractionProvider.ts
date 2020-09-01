import * as vscode from "vscode";

import { FileSystemManager } from "../fileSystemManager";
import { InteractiveManager, BitCategory, Bit } from "./interactiveManager";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";


export class TreeInteractionProvider implements vscode.TreeDataProvider<Entry>, vscode.Disposable {
    private context: vscode.ExtensionContext;
    private extData: ExtensionData;
    private fliUpdater: FliUpdater;

    private _onDidChangeTreeData: vscode.EventEmitter<Entry | undefined>;
    private managers: { [index: string]: InteractiveManager | undefined } = {};
    private roots: Entry[] = [];

    public constructor(context: vscode.ExtensionContext, fliUpdater: FliUpdater, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;
        this.fliUpdater = fliUpdater;
        this._onDidChangeTreeData = new vscode.EventEmitter<Entry>();
    }


    /// TreeDataProvider

    public get onDidChangeTreeData(): vscode.Event<Entry | undefined> {
        return this._onDidChangeTreeData.event;
    }

    public async getChildren(element?: Entry): Promise<Entry[] | undefined> {
        if (!element) {
            return this.roots;
        }

        let man = await this.getManager(element);
        if (!man) {
            return;
        }

        let fcsPath = element ? element.path : "";
        let force = element ? element.forceEvaluation : false;
        let data = await man.getList(fcsPath, force);

        if (!data) {
            return;
        }

        if (element && element.category !== BitCategory.RootFile) {
            let elementChanged = false;

            if (element.category !== data.Category) {
                element.category = data.Category;
                elementChanged = true;
            }

            if (!element.value) {
                element.value = data.Value ? data.Value : "";
                elementChanged = true;
            }

            if (elementChanged) {
                this._onDidChangeTreeData.fire(element);
                return;
            }
        }

        if (data.Items && data.Items.length > 0) {
            let items = data.Items
                .sort((a, b) => a.Name.localeCompare(b.Name))
                .map(b => this.bitToEntry(element, b));
            return items;
        }
    }

    public getParent(child: Entry): Entry | undefined {
        if (child.category === BitCategory.RootFile) {
            return undefined;
        }
    }

    public getTreeItem(element: Entry): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.name);

        treeItem.id = element.rootId + ":>>" + element.path;
        treeItem.description = (element.value ? "" + element.value : "");
        treeItem.label = element.name;
        treeItem.collapsibleState = this.getElementState(element);
        treeItem.contextValue = this.getElementContext(element);
        treeItem.iconPath = this.getIconByTokenType(element.category);
        treeItem.tooltip = "Path: " + element.path +
            "\nFile: " + element.filePath +
            "\nType: " + element.type +
            "\nCategory: " + BitCategory[element.category] +
            "\nContex: " + treeItem.contextValue;

        return treeItem;
    }

    private getIconByTokenType(cat: BitCategory): ThenableTreeIconPath | undefined {
        let name: string;

        switch (cat) {
            case BitCategory.Class:
                name = "class";
                break;
            case BitCategory.Sequence:
                name = "enumerator";
                break;
            case BitCategory.Value:
                name = "constant";
                break;
            case BitCategory.Any:
                name = "empty";
                break;
            case BitCategory.RootFile:
                name = "interface";
                break;
            default:
                name = "";
                break;
        }

        if (!name) {
            return;
        }

        let normalName = name + ".svg";
        let inverseName = name + ".svg";
        let lightIconPath = this.context.asAbsolutePath("media/icons/types/light/" + normalName);
        let darkIconPath = this.context.asAbsolutePath("media/icons/types/dark/" + inverseName);

        return {
            light: lightIconPath,
            dark: darkIconPath
        };
    }

    private getElementState(e: Entry) {
        switch (e.category) {
            case BitCategory.Sequence:
            case BitCategory.Class:
            case BitCategory.Any:
            case BitCategory.RootFile:
                return vscode.TreeItemCollapsibleState.Collapsed;
        }

        return vscode.TreeItemCollapsibleState.None;
    }

    private getElementContext(e: Entry) {
        if (e.category === BitCategory.RootFile) {
            return "root";
        }

        return !e.value ? "notUpdated" : "forceEvaluated";
    }


    /// Bits

    private bitToEntry(parent: Entry | undefined, b: Bit): Entry {
        let value: string | undefined;
        let type: string | undefined;
        let category = BitCategory.Any;

        if (b.Value && b.Value.Value && b.Value.Type) {
            value = b.Value.Value.toString();
            type = b.Value.Type;
            category = b.Value.Category;
        }

        let entry = {
            name: b.Name,
            path: this.createPath(parent, b),
            filePath: b.FilePath,
            hasChildren: true,
            forceEvaluation: false,
            isValue: value ? true : false,
            value,
            type,
            category,
            rootId: parent ? parent.rootId : "root",
        };

        return entry;
    }

    private createPath(parent: Entry | undefined, b: Bit) {
        if (!parent) {
            return b.Name;
        }

        let parentType = parent.category ? parent.category : BitCategory.Class;
        let p = parent.path ? parent.path : "";
        let t = parentType === BitCategory.Sequence ? "" : ".";
        let n = b.Name ? b.Name : "";
        return (p === "") ? n : p + t + n;
    }


    /// Actions

    public async open(filePath: string) {

        if (!this.managers || Object.values(this.managers).length === 0) {
            if (!await this.fliUpdater.runUpdate()) {
                return;
            }
        }

        let root = this.roots.find(r => r.filePath === filePath);

        if (!root) {
            let name = filePath.replace(/\\/g, "/").split("/").pop();

            root = {
                name: name ? name : filePath,
                filePath,
                path: "",
                hasChildren: true,
                forceEvaluation: false,
                isValue: false,
                type: "fcsFile",
                category: BitCategory.RootFile,
                rootId: FileSystemManager.rndName(),
            };

            this.roots.push(root);
            this._onDidChangeTreeData.fire(undefined);
        }

        return root;
    }

    public async close(element: Entry) {
        if (element.category === BitCategory.RootFile) {
            if (this.roots.some(r => r.rootId === element.rootId)) {
                this.roots = this.roots.filter(r => r.rootId !== element.rootId);
                await this.closeManager(element);
                if (this.roots.length === 0) {
                    this.managers = {};
                }

                this._onDidChangeTreeData.fire(undefined);
            }
        }
    }

    public evaluate(element: Entry): void {
        element.forceEvaluation = true;
        this._onDidChangeTreeData.fire(element);
    }

    public refresh(element: Entry): void {
        this._onDidChangeTreeData.fire(element);
    }

    public valueToOutput(element: Entry): void {
        if (!element || !element.value) { return; }

        let outChan = this.extData.getDefaultOutputChannel();
        outChan.show(this.extData.preserveFocusInOutput);
        outChan.appendLine("[IntFli.Value]: " + element.value);
    }

    /// Managers

    private async addManager(element: Entry) {
        let man = this.managers[element.rootId];

        if (man) { return; }

        man = new InteractiveManager(element.filePath, this.fliUpdater.getFliPath(), this.extData);

        if (!await man.startConnection()) {
            return;
        }

        this.managers[element.rootId] = man;
        return man;
    }

    private async getManager(element: Entry, createIfNotexist = true) {
        let man: InteractiveManager | undefined = this.managers[element.rootId];

        if (createIfNotexist && !man && element.category === BitCategory.RootFile) {
            man = await this.addManager(element);
        }

        return man;
    }

    private async closeManager(element: Entry) {
        let man = await this.getManager(element);

        if (man) {
            man.dispose();
        }

        this.managers[element.rootId] = undefined;
    }


    /// Disposable

    public dispose() {
        if (this.managers) {
            Object.values(this.managers).forEach(element => element!.dispose());
            this.managers = {};
        }
        if (this.roots) {
            this.roots = [];
        }
    }
}

export interface Entry {
    name: string;
    path: string;
    filePath: string;
    hasChildren: boolean;
    forceEvaluation: boolean;
    value?: string;
    isValue: boolean;
    type?: string;
    category: BitCategory;
    rootId: string;
}

interface ThenableTreeIconPath {
    light: string;
    dark: string;
}