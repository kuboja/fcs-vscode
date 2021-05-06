import * as vscode from "vscode";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import { join } from "path";

import { FliUpdater } from "../fliUpdater/fliUpdater";
import { ExtensionData } from "../extensionData";
import { TestManager, TestInfo } from "./testManager";
import { AppInsightsClient } from "../appInsightsClient";


export class TestTreeProvider implements vscode.TreeDataProvider<TestNode>, vscode.Disposable {

    private context: vscode.ExtensionContext;
    private extData: ExtensionData;
    private appInsightsClient: AppInsightsClient;
    private fliUpdater: FliUpdater;

    public tree: vscode.TreeView<TestNode> | undefined;

    private _onDidChangeTreeData: vscode.EventEmitter<TestNode | undefined>;
    private roots: TestNode[] | undefined;

    public constructor(context: vscode.ExtensionContext, fliUpdater: FliUpdater, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;
        this.appInsightsClient = extData.appInsightsClient;
        this.fliUpdater = fliUpdater;

        this._onDidChangeTreeData = new vscode.EventEmitter<TestNode>();
        this.expandedTests = [];
    }


    /// TreeDataProvider

    public get onDidChangeTreeData(): vscode.Event<TestNode | undefined> {
        return this._onDidChangeTreeData.event;
    }

    public async getChildren(element?: TestNode): Promise<TestNode[] | undefined> {
        if (!element) {
            return this.roots;
        }

        if (element.dirty) {
            await this.evalutateNode(element, element.root);
            element.dirty = false;
            if (this.extData.collapseTestAfterRun && !this.isExpanded(element) && element.isOk) {
                element.id = uuid();
            }
            this._onDidChangeTreeData.fire(element.root);
        }

        if (element.nodes && element.nodes.length > 0) {
            return element.nodes;
        }
        else if (element.tests) {
            return element.tests.map(t => this.infoToNode(t, element));
        }
    }

    public getParent(child: TestNode): TestNode | undefined {
        if (child.type === NodeType.root) {
            return undefined;
        }

        else {
            return child.root;
        }
    }

    public getTreeItem(element: TestNode): vscode.TreeItem {
        return this.toTreeItem(element);
    }

    public expandEvent(e: vscode.TreeViewExpansionEvent<TestNode>) {
        this.addToExpandedItems(e.element);
    }

    public collapseEvent(e: vscode.TreeViewExpansionEvent<TestNode>) {
        this.removeFromExpandedItems(e.element);
    }


    /// Tree item

    private toTreeItem(element: TestNode) {
        const treeItem = new vscode.TreeItem(element.name);

        treeItem.id = element.id;
        let description = "";
        if (element.message) {
            description = element.message.replace(/\r?\n|\r/g, "").substr(0, 120);
            description += element.message.length > 120 ? "..." : "";
            treeItem.description = description;
        }
        treeItem.label = element.name;
        treeItem.collapsibleState = this.getElementState(element);
        treeItem.contextValue = this.getElementContext(element);
        treeItem.iconPath = this.getIconByTokenType(element);
        treeItem.tooltip = element.name +
            "\n" + description +
            "\n\nFile: " + element.filePath + ", path: " + element.path +
            "\nContex: " + treeItem.contextValue + ", type: " + element.type.toString();

        if (element.type !== NodeType.test) {
            treeItem.tooltip += "\nTime: " + element.elapsedTime + " s";
        }

        if (element.result && element.expectation) {
            treeItem.tooltip += "\n\nResult: " + element.result.replace(/\s/g, "");
            treeItem.tooltip += "\nExpected: " + element.expectation.replace(/\s/g, "");
        }

        return treeItem;
    }

    private getIconByTokenType(e: TestNode): ThenableTreeIconPath | undefined {
        let name: string;

        if (!e.isEvaluated) {
            name = "questionCircle";
        }
        else if (e.isOk) {
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
            if (e.type === NodeType.root || e.dirty) {
                return vscode.TreeItemCollapsibleState.Expanded;
            }
            return vscode.TreeItemCollapsibleState.Collapsed;
        }

        return vscode.TreeItemCollapsibleState.None;
    }

    private getElementContext(e: TestNode) {
        if (e.type !== NodeType.test) {

            if (e.isEvaluated && !e.isOk && !e.tests) {
                return "error";
            }

            return "root";
        }

        if (e.result && e.expectation) {
            return "failTest";
        }

        return "test";
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

        function toTestDefiniton(t: string | TestNamePath, root: TestNode): TestNode {
            let name = "";
            let path = "";
            if (typeof t === "string") {
                name = t;
                path = t;
            }
            else {
                name = t.name;
                path = t.path;
            }

            return {
                name,
                isOk: false,
                message: "",
                path,
                filePath: root.filePath,
                hasChildren: false,
                dirty: false,
                isEvaluated: false,
                elapsedTime: 0,
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
                    dirty: false,
                    isEvaluated: false,
                    elapsedTime: 0,
                    tests: undefined,
                    nodes: undefined,
                    type: NodeType.root,
                    root: undefined,
                    id: uuid(),
                };

                root.nodes = r.tests.map((t: string | TestNamePath) => toTestDefiniton(t, root));
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

            let totalTime = 0;

            let score = { ok: 0, fail: 0 };
            for (const node of element.nodes) {
                if (node.tests && node.tests.length > 0) {
                    var nodeScore = this.getDeepCount(node.tests);
                    score.ok += nodeScore.ok;
                    score.fail += nodeScore.fail;
                    totalTime += node.elapsedTime;
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
            element.elapsedTime = totalTime;
        }
    }

    private infoToNode(b: TestInfo, root: TestNode): TestNode {

        let node: TestNode = {
            name: b.Name,
            isOk: b.IsOk,
            message: b.Message ? b.Message : "",

            path: "",
            filePath: "",

            dirty: false,
            isEvaluated: true,
            elapsedTime: 0,

            tests: b.Items,
            nodes: undefined,
            hasChildren: false,

            type: NodeType.test,
            root,
            id: uuid(),
        };

        if (!b.IsOk) {
            this.updateWhenNotOk(node, b);
        }

        if (b.Items && b.Items.length > 0) {
            node.hasChildren = true;
            node.message = this.getMessage(b);
        }

        return node;
    }

    private getDeepCount(tests: TestInfo[]): { ok: number; fail: number } {
        if (!tests || (tests && tests.length === 0)) {
            return { ok: 0, fail: 0 };
        }

        let child = tests.filter(t => t.Items && t.Items.length > 0).map(t => this.getDeepCount(t.Items));

        let reduced = (child && child.length > 0) ? child.reduce((t1, t2) => { return { ok: t1.ok + t2.ok, fail: t1.fail + t2.fail }; }) : { ok: 0, fail: 0 };

        let ok = tests.filter(t => (!t.Items || (t.Items && t.Items.length === 0)) && t.IsOk).length + reduced.ok;
        let fail = tests.filter(t => (!t.Items || (t.Items && t.Items.length === 0)) && !t.IsOk).length + reduced.fail;

        return { ok, fail };
    }

    private getMessage(info: TestInfo): string {
        let score = this.getDeepCount(info.Items);
        if (!info.Message || info.IsOk) {
            let mes = (score.ok + score.fail > 0) ? `Total tests ${score.ok + score.fail}, Succeeded ${score.ok}, Failed ${score.fail}` : "Empty test suite";
            mes += (info.Message && info.Message.length > 0) ? " | " + info.Message : "";
            return mes;
        } else {
            return (info.Message && info.Message.length > 0) ? info.Message : "Unknown error, empty error message.";
        }
    }

    private updateWhenNotOk(element: TestNode, info: TestInfo) {
        if (!info.Message || info.IsOk) {
            return;
        }

        const RESULT = "( Result= ";
        const EXPECTED = ", Expected= ";

        let msg = info.Message;
        let expectationPosition = msg.indexOf(EXPECTED);

        if (expectationPosition === -1) {
            return;
        }

        let parts = msg.split(EXPECTED);

        if (parts && parts.length !== 2) {
            return;
        }

        let result = parts[0].substring(RESULT.length).trim();
        let expected = parts[1].substr(0, parts[1].length - 1).trim();

        element.result = result;
        element.expectation = expected;
    }


    /// Actions

    public async evalutateTests(element: TestNode | undefined) {
        this.sendEvent("evalutateTests");

        if (!element) {
            if (!this.roots) {
                return;
            }

            for (const elem of this.roots) {
                await this.evalutateTests(elem);
            }
        }

        else if (element.type === NodeType.root) {
            element.message = "running...";
            element.isEvaluated = false;
            this._onDidChangeTreeData.fire(element);

            if (element.nodes) {
                for (let e of element.nodes) {
                    await this.evalutateTests(e);
                }
            }
        }

        else if (element.type === NodeType.definition) {
            element.dirty = true;
            element.isEvaluated = false;
            element.message = "runnig...";
            element.nodes = undefined;
            element.tests = undefined;
            element.hasChildren = true;

            this._onDidChangeTreeData.fire(element);

            if (this.tree) {
                await this.tree.reveal(element, { select: false, expand: true });
            }
        }
    }

    public async refreshTests() {
        this.sendEvent("refreshTests");

        this.roots = await this.loadRootTests();
        this.expandedTests = [];

        this._onDidChangeTreeData.fire(undefined);
    }

    public async compareValues(element: TestNode | undefined) {
        if (!(element && element.result && element.expectation)) {
            return;
        }

        this.sendEvent("compareValues");

        const EXTENSION_SCHEME = "fliText";

        const makeUriString = (textKey: string, timestamp: Date, text: string): string =>
            `${EXTENSION_SCHEME}://${textKey}?_ts=${timestamp.getTime()}&text=${text}`; // `_ts` to avoid cache

        const date = new Date();

        const getUri = (textKey: string, name: string) =>
            vscode.Uri.parse(makeUriString(name, date, textKey));

        let left = getUri(element.expectation, "expected");
        let right = getUri(element.result, "result");

        let option: vscode.TextDocumentShowOptions = {

        };

        await vscode.commands.executeCommand("vscode.diff", left, right, element.name + " E-R", option);
    }

    public async copyResult(element: TestNode | undefined, clear: boolean = false) {
        if (element && element.result) {
            if (clear) {
                this.sendEvent("copyResultClear");
                vscode.env.clipboard.writeText(element.result.replace(/\s/g, ""));
            }
            else {
                this.sendEvent("copyResultClear");
                vscode.env.clipboard.writeText(element.result);
            }
        }
    }

    public messageToOutput(element: TestNode | undefined) {
        if (!element || !element.message) { return; }

        this.sendEvent("messageToOutput");

        let outChan = this.extData.getOutputChannel(this.extData.defaultOutpuChannelName);
        outChan.show(this.extData.preserveFocusInOutput);
        outChan.appendLine("[IntFli.ErrroMessage]: " + element.message);
    }

    private sendEvent(event: string){
        this.appInsightsClient.sendEvent("Test tree: " + event);
    }

    /// Managers

    public async evalutateNode(element: TestNode, rootElement: TestNode | undefined) {
        let man = await this.getManager(element);

        if (!man) {
            console.log("chyba při spuštění testovacího serveru.");
            return;
        }

        let startTime = process.hrtime();

        let response = await man.executeTests(element.path);

        var elapsedSeconds = TestTreeProvider.parseHrtimeToSeconds(process.hrtime(startTime));
        element.elapsedTime = elapsedSeconds;

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

        if (rootElement && rootElement.type === NodeType.root) {
            this.updateRoot(rootElement);
        }

        await this.closeManager(man);
    }

    private static parseHrtimeToSeconds(hrtime: number[]): number {
        let seconds = (hrtime[0] + (hrtime[1] / 1e9));
        return Math.round(seconds * 1000) / 1000;
    }

    private async getManager(element: TestNode) {
        if (!await this.fliUpdater.runUpdate()) {
            return;
        }

        let man = new TestManager(element.filePath, this.fliUpdater.getFliPath(), this.extData);

        if (!await man.startConnection()) {
            return;
        }

        return man;
    }

    private async closeManager(man: TestManager | undefined) {
        if (man) {
            man.dispose();
        }
    }


    /// Expanded items

    private expandedTests: string[];

    private addToExpandedItems(element: TestNode | undefined) {
        if (!element) {
            return;
        }

        if (element.type === NodeType.definition && !element.dirty) {
            this.expandedTests.push(element.id);
        }
    }

    private removeFromExpandedItems(element: TestNode | undefined) {
        if (!element) {
            return;
        }

        if (element.type === NodeType.definition) {
            let id = this.expandedTests.indexOf(element.id);
            if (id > -1) {
                this.expandedTests.splice(id, 1);
            }
        }
    }

    private isExpanded(element: TestNode | undefined): boolean {
        if (!element) {
            return false;
        }

        let id = this.expandedTests.indexOf(element.id);
        return (id > -1);
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
    dirty: boolean;
    isEvaluated: boolean;
    elapsedTime: number;

    path: string;
    filePath: string;

    type: NodeType;

    hasChildren: boolean;
    tests?: TestInfo[];
    nodes?: TestNode[];

    root?: TestNode;

    result?: string;
    expectation?: string;
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
    tests: (string | TestNamePath)[];
}

interface TestNamePath {
    name: string;
    path: string;
}
