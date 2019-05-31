"use strict";

import * as vscode from "vscode";

import { FileSystemManager } from "../fileSystemManager";
import { InteractiveManager, BitCategory, Bit } from "./interactiveManager";


export class TreeInteractionProvider implements vscode.TreeDataProvider<Entry> {
    private context: vscode.ExtensionContext;
    private _onDidChangeTreeData: vscode.EventEmitter<Entry>;
    private managers : {[index: string]: InteractiveManager | undefined}= {};
    private roots: Entry[] = [];

    public constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter<Entry>();
    }


    /// TreeDataProvider

    public get onDidChangeTreeData(): vscode.Event<Entry | undefined> {
		return this._onDidChangeTreeData.event;
    }
    
    public async getChildren(element?: Entry): Promise<Entry[]| undefined> {
        if (!element){
            return this.roots;
        }

        let man = await this.getManager(element);
        if (!man){
            return;
        }

        let fcsPath = element ? element.path : "";
        let data = await man.getList(fcsPath);

        if (!data) { 
            return;
        }

        if (element && element.category !== BitCategory.RootFile){
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
            let items = data.Items.map( b => this.bitToEntry(element, b));
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
        
        treeItem.id = element.rootId +":>>"+ element.path;
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
                name = "Class";
                break;
            case BitCategory.Sequence:
                name = "Enumerator";
                break;
            case BitCategory.Value:
                name = "Constant";
                break;
            case BitCategory.Any:
                name = "Empty";
                break;
            case BitCategory.RootFile:
                name = "Document";
                break;
            default:
                name = "";
                break;
        }

        if (!name) {
            return;
        }

        let normalName = name + "_16x.svg";
        let inverseName = name + "_inverse_16x.svg";
        let lightIconPath = this.context.asAbsolutePath("media/icons/"+normalName);
        let darkIconPath = this.context.asAbsolutePath("media/icons/"+inverseName);
        
        return {
            light: lightIconPath,
            dark: darkIconPath
        };
    }

    private getElementState(e : Entry){
        if (e.category === BitCategory.Sequence || e.category === BitCategory.Class || e.category === BitCategory.Any || e.category === BitCategory.RootFile ) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        else {
            return vscode.TreeItemCollapsibleState.None;
        }
    }

    private getElementContext(e: Entry){
        if (e.category === BitCategory.RootFile){
            return "root";
        }

        return !e.value ? "notUpdated" : "fullResolved";
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
            isResolved: false,
            isValue: value ? true : false,
            value,
            type,
            category,
            rootId: parent ? parent.rootId : "root",
        };

        return entry;
    }

    private createPath(parent: Entry | undefined, b: Bit){
        if (!parent){
            return b.Name;
        }

        let parentType = parent.category ? parent.category : BitCategory.Class ;
        let p = parent.path ? parent.path : "";
        let t = parentType === BitCategory.Sequence ? "" : ".";
        let n = b.Name ? b.Name : "";
        return (p === "") ? n : p + t + n;
    }


    /// Actions

    public open(filePath: string) {
        let root = this.roots.find( r => r.filePath === filePath);

        if (!root){
            let name = filePath.replace("\\", "//").split("//").pop();

            root = {
                name: name ? name : filePath,
                filePath, 
                path: "",
                hasChildren: true,
                isResolved: false,
                isValue: false,
                type: "fcsFile",
                category: BitCategory.RootFile,
                rootId: FileSystemManager.rndName(),
            };

            this.roots.push(root);
            this._onDidChangeTreeData.fire();
        } 

        return root;
    }

    public async close(element: Entry){
        if (element.category === BitCategory.RootFile){
            if (this.roots.some( r => r.rootId === element.rootId )){
                this.roots = this.roots.filter( r => r.rootId !== element.rootId);
                await this.closeManager(element);

                this._onDidChangeTreeData.fire();
            }
        }
    }

    public resolve(resource: any): any {

    }


    /// Managers

    private async addManager(element: Entry) {
        let man = this.managers[element.rootId];

        if (man) { return; }

        man = new InteractiveManager(element.filePath);

        if (!await man.startConnection()) {
            return;
        }

        this.managers[element.rootId] = man;
        return man;
    }

    private async getManager(element: Entry, createIfNotexist = true){
        let man: InteractiveManager | undefined = this.managers[element.rootId];
        
        if (createIfNotexist && !man && element.category === BitCategory.RootFile) {
            man = await this.addManager(element);
        }

        return man;
    }

    private async closeManager(element: Entry){
        let man = await this.getManager(element);

        if(man){
            man.dispose();
        }

        this.managers[element.rootId] = undefined;
    }
}

export interface Entry {
    name: string;
	path: string;
    filePath: string;
    hasChildren: boolean;
    isResolved: boolean;
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