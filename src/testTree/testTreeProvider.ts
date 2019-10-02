"use strict";

import * as vscode from "vscode";
import * as uuid from "uuid/v4";
import * as fs from "fs";
import { join } from "path";

import { FileSystemManager } from "../fileSystemManager";
import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";
import { TestManager, TestInfo } from "./testManager";


export class TestTreeProvider implements vscode.TreeDataProvider<TestNode>, vscode.Disposable {
    private context: vscode.ExtensionContext;
    private extData: ExtensionData;
    private fliUpdater: FliUpdater;

    private _onDidChangeTreeData: vscode.EventEmitter<TestNode>;
    private roots: TestNode[] | undefined;

    public constructor(context: vscode.ExtensionContext, fliUpdater: FliUpdater, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;
        this.fliUpdater = fliUpdater;
        this._onDidChangeTreeData = new vscode.EventEmitter<TestNode>();
    }


    /// TreeDataProvider

    public get onDidChangeTreeData(): vscode.Event<TestNode | undefined> {
        return this._onDidChangeTreeData.event;
    }

    public async getChildren(element?: TestNode): Promise<TestNode[] | undefined> {
        if (!element) {
            return this.roots;
        }

        if (element.nodes && element.nodes.length > 0) {
            return element.nodes;
        }
        else if (element.tests) {
            return element.tests.map(t => this.infoToNode(t, element));
        }
    }

    public getParent(child: TestNode): TestNode | undefined {
        return undefined;
    }

    public getTreeItem(element: TestNode): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.name);

        treeItem.id = element.id;
        treeItem.description = (element.message ? "" + element.message : "");
        treeItem.label = element.name;
        treeItem.collapsibleState = this.getElementState(element);
        treeItem.contextValue = this.getElementContext(element);
        treeItem.iconPath = this.getIconByTokenType(element);
        treeItem.tooltip = element.name +
            "\n" + element.message +
            "\n\nFile: " + element.filePath + ", path: " + element.path +
            "\nContex: " + treeItem.contextValue + ", type: " + element.type.toString();

        return treeItem;
    }


    private getIconByTokenType(e: TestNode): ThenableTreeIconPath | undefined {
        let name: string;

        if (!e.isEvaluated){
            name = "questionCircle";
        }
        else if (e.isOk){
            name = "checkCircle";
        }
        else {
            name = "error";
        }

        if (!name) {
            return;
        }

        let normalName = name + ".svg";
        let inverseName = name + ".svg";
        let lightIconPath = this.context.asAbsolutePath("media/icons/light/" + normalName);
        let darkIconPath = this.context.asAbsolutePath("media/icons/dark/" + inverseName);

        return {
            light: lightIconPath,
            dark: darkIconPath
        };
    }

    private getElementState(e: TestNode) {
        if (e.hasChildren) {
            if (e.type === NodeType.root){
                return vscode.TreeItemCollapsibleState.Expanded;
            }
            return vscode.TreeItemCollapsibleState.Collapsed;
        }

        return vscode.TreeItemCollapsibleState.None;
    }

    private getElementContext(e: TestNode) {
        if (e.type === NodeType.test) {
            return "test";
        }

        return e.isEvaluated ? "evaluated" : "notEvaluated";
    }

    /// Test node / info

    private async loadRootTests(): Promise<TestNode[] | undefined> {

        let files = await vscode.workspace.findFiles("*.tests.json");

        let data: TestNode[] = [];

        if (files && files.length > 0) {
            for (const fileUri of files) {

                let wsFolder = vscode.workspace.getWorkspaceFolder(fileUri);

                if (!wsFolder) {
                    return;
                }

                let fileData = fs.readFileSync(fileUri.fsPath, "utf-8");
                let jsonData: TestSetting[] = [];
                try {
                    jsonData = JSON.parse(fileData);
                } catch (error) {
                    vscode.window.showWarningMessage("Erorr in test definition file:\n" + fileUri.fsPath);
                }

                if (jsonData && jsonData.length > 0) {
                    let maped = mapData(jsonData, wsFolder);
                    data.push(...maped);
                }
            }

            return data;
        }

        function toTest(t: string, r: any, root: TestNode): TestNode {
            return {
                name: t,
                isOk: false,
                message: "",
                path: t,
                filePath: root.filePath,
                hasChildren: false,
                isEvaluated: false,
                tests: undefined,
                nodes: undefined,
                type: NodeType.definition,
                root: root,
                id: uuid(),
            };
        }

        function mapData(rootsData: TestSetting[], wrkFolder: vscode.WorkspaceFolder): TestNode[] {
            return rootsData.map(r => {
                let root: TestNode = {
                    name: r.name,
                    isOk: false,
                    message: "",
                    path: "",
                    filePath: join(wrkFolder.uri.fsPath, r.filePath),
                    hasChildren: r.tests && r.tests.length > 0,
                    isEvaluated: false,
                    tests: undefined,
                    nodes: undefined,
                    type: NodeType.root,
                    root: undefined,
                    id: uuid(),
                };

                root.nodes = r.tests.map(t => toTest(t, r, root));
                return root;
            });
        }
    }

    private updateRoot(element: TestNode) {
        if (element.hasChildren && element.nodes) {
            var isEval = element.nodes.every(n => n.isEvaluated);
            var isAnyEval = element.nodes.some(n => n.isEvaluated);
            element.isEvaluated = isEval;
            element.isOk = element.nodes.every(n => n.isOk);

            let score = { ok: 0, fail: 0 };
            for (const node of element.nodes) {
                if (node.tests && node.tests.length > 0) {
                    var nodeScore = this.getDeepCount(node.tests);
                    score.ok += nodeScore.ok;
                    score.fail += nodeScore.fail;
                }
            }

            let mes = "";
            if (isAnyEval) {
                if (score.ok + score.fail > 0) {
                    mes = `Total evaluated tests ${score.ok + score.fail}, Succeeded ${score.ok}, Failed ${score.fail}`;
                } else {
                    mes = "Empty test group";
                }
            }
            element.message = mes;
        }
    }

    private infoToNode(b: TestInfo, root: TestNode): TestNode {
   
        let node: TestNode = {
            name: b.Name,
            isOk: b.IsOk,
            message: b.Message ? b.Message : "",

            path: "",
            filePath: "",

            isEvaluated: true,

            tests: b.Items,
            nodes: undefined,
            hasChildren: false,

            type: NodeType.test,
            root,
            id: uuid(),
        };

        if (b.Items && b.Items.length > 0){
            node.hasChildren = true;
            node.message = this.getMessage(b);
        }

        return node;
    }

    private getDeepCount(tests: TestInfo[]): { ok: number; fail: number}{
        if ( !tests || (tests && tests.length === 0) ){
            return { ok: 0, fail: 0};
        }

        let child = tests.filter(t =>t.Items && t.Items.length > 0).map(t => this.getDeepCount(t.Items));

        let reduced = (child && child.length > 0) ? child.reduce((t1, t2) => { return { ok : t1.ok + t2.ok, fail: t1.fail + t2.fail };}) : { ok : 0, fail: 0 };

        let ok = tests.filter(t => (!t.Items || (t.Items && t.Items.length === 0)) && t.IsOk ).length + reduced.ok;
        let fail = tests.filter(t => (!t.Items || (t.Items && t.Items.length === 0)) && !t.IsOk ).length + reduced.fail;

        return { ok, fail};
    }

    /// Actions

    public async evalutateTests(element: TestNode | undefined){

        if (!element) {
            if (!this.roots) {
                return;
            }

            for (const elem of this.roots) {
                await this.evalutateTests(elem);
            }
        }

        else if (element.type === NodeType.root){
            if (element.nodes){
                for (let e of element.nodes) {
                    await this.evalutateNode(e, element);
                    this._onDidChangeTreeData.fire(element);
                }
            }
        }

        else if ( element.type === NodeType.definition ){
            await this.evalutateNode(element, element.root);
            this._onDidChangeTreeData.fire(element.root);
        }
        
    }

    public async refreshTests(){
        this.roots = await this.loadRootTests();

        this._onDidChangeTreeData.fire();
    }

    /// Managers

    public async evalutateNode(element: TestNode, rootElement: TestNode | undefined){
        let man = await this.getManager(element);

        if (!man) {
            console.log("chyba při spuštění testovacího serveru.");
            return;
        }

        let response = await man.executeTests(element.path);

        if (!response) {
            element.isEvaluated = true;
            element.hasChildren = false;
            element.isOk = false;
            element.message = "Nastala asi nějaká chyba.";
            element.root = rootElement;
        }
        else {
            element.tests = response.Items;
            element.isOk = response.IsOk;
            element.hasChildren = response.Items && response.Items.length > 0;
            element.isEvaluated = true;
            element.message = this.getMessage(response);
            element.root = rootElement;
        }

        if (rootElement && rootElement.type === NodeType.root){
            this.updateRoot(rootElement);
        }

        this.closeManager(man);
    }

    private async getManager(element: TestNode) {
        let man = new TestManager(element.filePath, this.fliUpdater.getFliPath(), this.extData);

        if (!await man.startConnection()) {
            return;
        }

        return man;
    }

    private getMessage(info: TestInfo): string {
        let score = this.getDeepCount(info.Items);
        let mes = (score.ok + score.fail > 0) ? `Total tests ${score.ok + score.fail}, Succeeded ${score.ok}, Failed ${score.fail}` : "Empty test suite";
        mes += (info.Message && info.Message.length > 0) ? " | " + info.Message : "";
        return mes;
    }

    private async closeManager(man: TestManager | undefined) {
        if (man) {
            man.dispose();
        }
    }


    /// Disposable

    public dispose() {
        if (this.roots) {
            this.roots = [];
        }
    }
}

export interface TestNode {
    id: string;
    name: string;
    isOk: boolean;
    message: string;
    isEvaluated: boolean;

    path: string;
    filePath: string;

    type: NodeType;

    hasChildren: boolean;
    tests: TestInfo[] | undefined;
    nodes: TestNode[] | undefined;

    root: TestNode | undefined;
}

export enum NodeType {
    root,
    definition,
    test
}

interface ThenableTreeIconPath {
    light: string;
    dark: string;
}

interface TestSetting {
    name: string;
    filePath: string;
    tests: string[];
}