"use strict";

import * as vscode from "vscode";
import * as rpc from 'vscode-jsonrpc';
import { ChildProcess } from "child_process";

import { FileSystemManager } from "./fileSystemManager";


export class InteractiveTree {
	constructor(context: vscode.ExtensionContext) {
		const treeDataProvider = new ImplementationProvider(context);
        vscode.window.createTreeView('fcstree', { treeDataProvider });
        
		vscode.commands.registerCommand('fcs-vscode.treeitemResolve', (resource) => treeDataProvider.resolve(resource));
		vscode.commands.registerCommand('fcs-vscode.startTreeFli', (resource) => treeDataProvider.startFli(resource));
	}
}


export class InteractiveManager implements vscode.Disposable {
    
    private pathFli = "C:\\GitHub\\fcs-histruct2\\bin\\FliVS\\Debug\\net47\\flivs.exe"; 
   
    public pathFcs: string;
    private process?: ChildProcess;
    private connection?: rpc.MessageConnection;

    constructor(fcsPath:string) {
        this.pathFcs = fcsPath;
    }

    private sessionStarted: boolean = false;

    public canSendReques(): boolean{
        return this.connection !== undefined && this.sessionStarted;
    }

    public async startFli(): Promise<boolean> {

        if (this.connection){ return this.sessionStarted; }
        if (this.canSendReques()) {return true;}

        let fullCommand: string = "cmd /c chcp 65001 >nul && " + FileSystemManager.quoteFileName(this.pathFli);

        console.log("Fli path: " + this.pathFli);
        console.log("Full cmd command: " + fullCommand);

        //  let process = spawn(fullCommand, [], { shell: true });

        //   process.stdout.setEncoding("utf8");
        //   process.stdout.on("data", (data: string) => this.onGetOutputData(data));
        //   process.stderr.on("data", (data: string) => this.onGetOutputData(data));
        //   process.on("close", (code) => this.onCloseEvent(code));
        //     this.process = process;
        let [messageReader, messageWriter] = rpc.createServerPipeTransport("\\\\.\\pipe\\StreamJsonRpcSamplePipe");

        this.connection = rpc.createMessageConnection( messageReader, messageWriter );
        this.connection.listen();

        return await this.sendStart();
    }

    onCloseEvent(code: number): void {
        console.log("Error: " + code);
    }

    onGetOutputData(data: string): void {
        console.log(data);
    }

    async sendStart(): Promise<boolean>{
        if (!this.connection){ return false; }
        if (this.canSendReques()) {return true;}

        //let req = new rpc.RequestType1<string,any,any,any>("start");
        let req2 = new rpc.RequestType2<string,string,any,any,any>("start");
        
        try {
            let response = await this.connection.sendRequest(req2,"C:\\GitHub\\fcs-gsi\\Gsi_StorageSystems\\Silo_Round\\ExpertSystem\\Snow\\SnowAction.fcs","");
            this.sessionStarted = true;
            this.posRes(response);
        } catch (error) {
            this.sessionStarted = false;
            console.log(error);
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
            let data = await this.connection.sendRequest(req2,path,"");
            this.posRes(data);
            console.log(data.Category === BitCategory.Class);
            return data;
        } catch (e) {
            console.log(e);
            
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
        if (this.process) {
            this.process.kill();
        }
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
    private manager?: InteractiveManager;

    get onDidChangeTreeData(): vscode.Event<Entry | undefined> {
		return this._onDidChangeTreeData.event;
    }
   
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter<Entry>();
    }


    private getElementState(e : Entry){
        if (e.category === BitCategory.Sequence || e.category === BitCategory.Class || e.category === BitCategory.Any ) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        else {
            return vscode.TreeItemCollapsibleState.None;
        }
    }


    getTreeItem(element: Entry): vscode.TreeItem {

        const treeItem = new vscode.TreeItem(element.name);
        
        treeItem.description = (element.value ? "" + element.value : "");
        treeItem.label = element.name;
        treeItem.id = element.path;
        treeItem.tooltip = element.path + "\n" + element.filePath + "\nType: " + element.stype + "\nCategory: " + BitCategory[ element.category ];
        treeItem.collapsibleState = this.getElementState( element );
        treeItem.contextValue = !element.value ? "notUpdated" : "fullResolved";
        treeItem.iconPath = this.getIconByTokenType(element.category);
     
		return treeItem;
    }

    async getChildren(element?: Entry): Promise<Entry[]| undefined> {

        if (!this.manager) {
            return [];
        } else {
            let a = element ? element.path : "";
        
            let data = await this.manager.getList(a);
            let tre: Entry[] | undefined;
          
            if (data) { 

                if (element){
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
                    let type = data.Category ? data.Category : BitCategory.Class ;
                    tre = data.Items.map( b => { 
                        let val: string | undefined;
                        let typ: string | undefined;
                        let cat: BitCategory = BitCategory.Any;
                        if (b.Value && b.Value.Value && b.Value.Type){
                            val = b.Value.Value.toString();
                            typ = b.Value.Type;
                            cat = b.Value.Category;
                        }

                        return {
                        name: b.Name,
                        path: this.namefn(a, b, type),
                        filePath: b.FilePath,
                        type: vscode.CompletionItemKind.Enum, 
                        hasChildren: true,
                        isResolved: false,
                        isValue: val ? true : false,
                        value: val,
                        stype: typ,
                        category: cat,
                    }; } );
                }
            }

            return tre;
        }
    }

    getIconByTokenType(cat: BitCategory): ThenableTreeIconPath | undefined {
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

    namefn(path: string | undefined, b: Bit, parentType: BitCategory){
        let p = path ? path : "";
        let t = parentType === BitCategory.Sequence ? "" : ".";
        let n = b.Name ? b.Name : "";
        return (p === "") ? n : p + t + n;
    }

    resolve(resource: any): any {
   //     let element = resource as Entry;
   //     if (element){
   //         element.isResolved = true;
   //     }
   //     this._onDidChangeTreeData.fire(element);
    }

    async startFli(resource: any) {
        let editor = vscode.window.activeTextEditor;
        if (editor && !this.manager){
            let filePath = editor.document.uri.fsPath;
            //let filePath = "C:\\GitHub\\fcs-gsi\\Gsi_StorageSystems\\Silo_Round\\ExpertSystem\\Snow\\SnowAction.fcs";
            this.manager = new InteractiveManager(filePath);

            if (await this.manager.startFli()){
                this._onDidChangeTreeData.fire();
            }
        }
    }
}

export interface Entry {
    name: string;
	path: string;
    type: vscode.CompletionItemKind;
    filePath: string;
    hasChildren: boolean;
    isResolved: boolean;
    value?: string;
    isValue: boolean;
    stype?: string;
    category: BitCategory;
}

export interface EntryEvent {
	path: string;
}

interface ThenableTreeIconPath {
    light: string;
    dark: string;
}