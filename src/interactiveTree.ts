"use strict";

import * as vscode from "vscode";
import * as rpc from 'vscode-jsonrpc';
import { ChildProcess, spawn } from "child_process";

import { FileSystemManager } from "./fileSystemManager";


export class InteractiveTree {

    private treeDataProvider: ImplementationProvider;
    private tree: vscode.TreeView<Entry>;

	constructor(context: vscode.ExtensionContext) {

		this.treeDataProvider = new ImplementationProvider(context);
        this.tree = vscode.window.createTreeView('fcstree', { treeDataProvider: this.treeDataProvider });

		vscode.commands.registerCommand('fcs-vscode.startTreeFli', () => this.openFromEditor());
        vscode.commands.registerCommand('fcs-vscode.treeitemResolve', (resource) => this.resolve(resource));
    }
    
    private async openFromEditor(){

        let editor = vscode.window.activeTextEditor;

        if (!editor){
            console.log("Není otevřen žádný editor?");
            return;
        }

        let filePath = editor.document.uri.fsPath;
        let name = editor.document.fileName;
        //let filePath = "C:\\GitHub\\fcs-gsi\\Gsi_StorageSystems\\Silo_Round\\ExpertSystem\\Snow\\SnowAction.fcs";

        if (!filePath){
            console.log("Soubor nemá cestu na disku!");
            return;
        }

        try {
            
            await this.tree.reveal({
                name,
                filePath, 
                path: "",
                hasChildren: true,
                isResolved: false,
                isValue: false,
                type: "fcsFile",
                category: BitCategory.RootFile,
                rootId: FileSystemManager.rndName(),
            }, {select: true, expand: false});
        }
        catch (e) {
            console.error(e);    
        }
       // this.treeDataProvider.openFcs(filePath);
    }

    private async resolve(resource: Entry | undefined){
        await this.treeDataProvider.resolve(resource);
    }
}


export class InteractiveManager implements vscode.Disposable {
    
    private pathFli = "C:\\GitHub\\fcs-histruct2\\bin\\FliVS\\Debug\\net47\\flivs.exe"; 
   
    public pathFcs: string;
    private fliProcess?: ChildProcess;
    private connection?: rpc.MessageConnection;

    constructor(fcsPath:string) {
        this.pathFcs = fcsPath;
    }

    private sessionStarted: boolean = false;

    public canSendRequest(): boolean{
        return this.connection !== undefined && this.sessionStarted;
    }

    public async startConnection(): Promise<boolean> {

        if (this.connection){ return this.sessionStarted; }
        if (this.canSendRequest()) {return true;}


        let pipeName = rpc.generateRandomPipeName();

        console.log("Fli path: " + this.pathFli);
        console.log("Pipe name: " + pipeName);

        let logger = new ConsoleLogger();

        try {
            let pipe = await rpc.createClientPipeTransport(pipeName);

            this.fliProcess = spawn(this.pathFli, ["--c", pipeName], { shell: false, windowsHide: false });
            this.fliProcess.stdout.setEncoding("utf8");
            this.fliProcess.stdout.on("data", (data: string) => this.onGetOutputData(data));
            this.fliProcess.stderr.on("data", (data: string) => this.onGetOutputData(data));
            this.fliProcess.on("close", (code) => this.onCloseEvent(code));

            let [messageReader, messageWriter] = await pipe.onConnected();
       
            this.connection = rpc.createMessageConnection(messageReader, messageWriter, logger);
            this.connection.onError((e) => {
                console.error("Chyba ve spojení: " + e);
            });
            this.connection.trace(rpc.Trace.Verbose, {
                log: (data: any, data2?: any) => {
                    console.log(data);
                    if (data2) { console.log(data2); }
                }
            });
            this.connection.onClose((e)=>{
                
                if (this.fliProcess) {
                    this.fliProcess.kill();
                    this.fliProcess = undefined;
                }
                this.sessionStarted = false;
            });
            this.connection.listen();
        }
        catch (error) {
            console.error("Chyba při vytváření spojení: " + error);
            return false;
        }

        let response = await this.sendStartRequest();
        if (!response){
            this.disconect();
        }

        return response;
    }

    disconect(){
        if (this.connection) {
            this.connection.dispose();
            this.connection = undefined;
        }
        if (this.fliProcess) {
            this.fliProcess.kill();
            this.fliProcess = undefined;
        }
        this.sessionStarted = false;
    }

    onCloseEvent(code: number): void {
        console.log("Fli was closed: " + code);
        this.disconect();
    }

    onGetOutputData(data: string): void {
        console.log(data);
    }

    async sendStartRequest(): Promise<boolean> {
        if (!this.connection) { return false; }
        if (this.canSendRequest()) { return true; }

        //let req = new rpc.RequestType1<string,any,any,any>("start");
        let req2 = new rpc.RequestType2<string, string, any, any, any>("start");

        try {
            this.connection.inspect();
            //"C:\\GitHub\\fcs-gsi\\Gsi_StorageSystems\\Silo_Round\\ExpertSystem\\Snow\\SnowAction.fcs"
            let response = await this.connection.sendRequest(req2, this.pathFcs, "");
            this.sessionStarted = response;
        } catch (error) {
            this.sessionStarted = false;
            console.error("Chyba při volání metody start: " + error);
        }

        return this.sessionStarted;
    }

    async sendCommand(command: string) {
        this.getList("");
    }

    async getList(path: string)  {
        if (!this.connection){ return; }

        //let req = new rpc.RequestType1<string,any,any,any>("list");
        let req2 = new rpc.RequestType2<string,string,Bits,any,any>("list");
        
        try {
            return await this.connection.sendRequest(req2, path, "");
        } catch (e) {
            console.error("Error with " + req2.method + " request: " + e );
        }
    }

    sendAdd(): void {
        if (!this.connection) {return;}

        let req = new rpc.RequestType2<number,number,number,rpc.ResponseError<any>,any>("Add");
        
        this.connection.sendRequest(req,1,2)
            .then(
                a => this.posRes(a),
                 e => this.errRes(e)
                 );
    }

    posRes(a: any) {
        console.log(a);
    }

    errRes(e: any) {
        console.log(e);
    }

    dispose() {
        if (this.fliProcess) {
            this.fliProcess.kill();
        }
    }
}

class ConsoleLogger implements rpc.Logger {
    public error(message: string): void {
        console.error(message);
    }
    public warn(message: string): void {
        console.warn(message);
    }
    public info(message: string): void {
        console.info(message);
    }
    public log(message: string): void {
        console.log(message);
    }
}

interface Bits {
    Category: BitCategory;
    Items?: Bit[];
    ErrorMessage?: string;
    Value?: string;
    Type?: string;
}

enum BitCategory {
    RootFile = -2,
    Any = -1,
    Error = 0,
    Value = 1,
    Sequence = 2,
    Class = 3,
}

interface Bit {
    Name: string;
    Evaluated: boolean;
    Value: BitValue;
    FilePath: string;
}

interface BitValue {
    Value?: string;
    Error?: string;
    Type?: string;
    Category: BitCategory;
}


export class ImplementationProvider implements vscode.TreeDataProvider<Entry> {

    private context: vscode.ExtensionContext;
    private _onDidChangeTreeData: vscode.EventEmitter<Entry>;
    private managers : {[index: string]:  InteractiveManager}= {};

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

    private async getManager(element: Entry){
        let man: InteractiveManager | undefined = this.managers[element.rootId];
        
        if (!man && element.category === BitCategory.RootFile) {
            man = await this.addManager(element);
        }

        return man;
    }

    get onDidChangeTreeData(): vscode.Event<Entry | undefined> {
		return this._onDidChangeTreeData.event;
    }
   
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter<Entry>();
    }

    private getElementState(e : Entry){
        if (e.category === BitCategory.Sequence || e.category === BitCategory.Class || e.category === BitCategory.Any || e.category === BitCategory.RootFile ) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        else {
            return vscode.TreeItemCollapsibleState.None;
        }
    }

    private rootLeafs: vscode.TreeItem[] = [];

    public getTreeItem(element: Entry): vscode.TreeItem {

        let id = element.filePath +":>>"+ element.path;

        if (element.category === BitCategory.RootFile){
            let leaf = this.rootLeafs.find( r => r.id === id);
            if (leaf){
                return leaf;
            }
        }

        const treeItem = new vscode.TreeItem(element.name);
        
        treeItem.id = id;
        treeItem.description = (element.value ? "" + element.value : "");
        treeItem.label = element.name;
        treeItem.tooltip = "Path: " + element.path + "\nFile: " + element.filePath + "\nType: " + element.type + "\nCategory: " + BitCategory[ element.category ];
        treeItem.collapsibleState = this.getElementState( element );
        treeItem.contextValue = !element.value ? "notUpdated" : "fullResolved";
        treeItem.iconPath = this.getIconByTokenType(element.category);
        
        if (element.category === BitCategory.RootFile){
            this.rootLeafs.push(treeItem);
        }

		return treeItem;
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

    private roots: Entry[] = [];

    public getParent(child: Entry): Entry|undefined{
        if (child.category === BitCategory.RootFile){
            if (!this.roots.some( r => r.rootId === child.rootId )){
                this.roots.push(child);
                if (this.roots.length > 1){
                    this._onDidChangeTreeData.fire(undefined);
                }
            }
            return undefined;
        }
    }

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

    public resolve(resource: any): any {
   //     let element = resource as Entry;
   //     if (element){
   //         element.isResolved = true;
   //     }
   //     this._onDidChangeTreeData.fire(element);
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

export interface EntryEvent {
	path: string;
}

interface ThenableTreeIconPath {
    light: string;
    dark: string;
}