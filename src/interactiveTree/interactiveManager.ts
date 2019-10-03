"use strict";

import * as vscode from "vscode";
import * as rpc from 'vscode-jsonrpc';
import { ChildProcess, spawn } from "child_process";
import { ExtensionData } from "../extensionData";


export class InteractiveManager implements vscode.Disposable {
    private pathFli: string;
    public pathFcs: string;

    private extData: ExtensionData;
    private fliProcess?: ChildProcess;
    private connection?: rpc.MessageConnection;
    private sessionStarted: boolean = false;

    private showOutputsFromFli = false;

    constructor(fcsPath: string, fliPath: string, extData: ExtensionData) {
        this.extData = extData;
        this.pathFcs = fcsPath;
        this.pathFli = fliPath;
    }

    public canSendRequest(): boolean {
        return this.connection !== undefined && this.sessionStarted;
    }

    public async startConnection(): Promise<boolean> {
        if (this.connection) { return this.sessionStarted; }
        if (this.canSendRequest()) { return true; }

        let pipeName = rpc.generateRandomPipeName();

        console.log("Fli path: " + this.pathFli);
        console.log("Pipe name: " + pipeName);

        let logger = new ConsoleLogger();

        try {
            let pipe = await rpc.createClientPipeTransport(pipeName);

            this.fliProcess = spawn(this.pathFli, ["--i", "--c", pipeName], { shell: false, windowsHide: false });
            this.fliProcess.stdout.setEncoding("utf8");
            this.fliProcess.stdout.on("data", (data: string) => this.onGetOutputData(data));
            this.fliProcess.stderr.on("data", (data: string) => this.onGetOutputData(data));
            this.fliProcess.on("close", (code) => this.onCloseEvent(code));

            let [messageReader, messageWriter] = await pipe.onConnected();

            this.connection = rpc.createMessageConnection(messageReader, messageWriter, logger);

            this.connection.onError((e) => {
                console.error("Chyba ve spojení: " + e);
            });

            this.connection.trace(rpc.Trace.Messages, {
                log: (data: any, data2?: any) => {
                    console.log(data);
                    if (data2) { console.log(data2); }
                }
            });

            this.connection.onClose((e) => {
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
        if (!response) {
            this.disconect();
        }

        return response;
    }

    disconect() {
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
        if (this.showOutputsFromFli) { console.log("Fli was closed: " + code); }
        this.disconect();
    }

    onGetOutputData(data: string): void {
        if (this.showOutputsFromFli) {
            console.log(data);
        }
    }

    async sendStartRequest(): Promise<boolean> {
        if (!this.connection) { return false; }
        if (this.canSendRequest()) { return true; }

        //let req = new rpc.RequestType1<string,any,any,any>("start");
        let req2 = new rpc.RequestType2<string, string, any, any, any>("start");

        try {
            this.sessionStarted = await this.connection.sendRequest(req2, this.pathFcs, "");
        } catch (error) {
            this.sessionStarted = false;
            console.error("Chyba při volání metody start: " + error);
        }

        return this.sessionStarted;
    }

    public async getList(path: string, forceEvaluation: boolean) {
        if (!this.connection) { return; }

        let req = new rpc.RequestType2<string, boolean, Bits, any, any>("list");

        try {
            return await this.connection.sendRequest(req, path, forceEvaluation);
        } catch (e) {
            this.extData.outputChannel.show(this.extData.preserveFocusInOutput);
            this.extData.outputChannel.appendLine("[IntFli.Error]: " + e);
            console.error("Error with " + req.method + " request: " + e);
        }
    }

    dispose() {
        if (this.fliProcess) {
            this.fliProcess.kill();
        }
    }
}

export interface Bits {
    Category: BitCategory;
    Items?: Bit[];
    ErrorMessage?: string;
    Value?: string;
    Type?: string;
}

export enum BitCategory {
    RootFile = -2,
    Any = -1,
    Error = 0,
    Value = 1,
    Sequence = 2,
    Class = 3,
}

export interface Bit {
    Name: string;
    Evaluated: boolean;
    Value: BitValue;
    FilePath: string;
}

export interface BitValue {
    Value?: string;
    Error?: string;
    Type?: string;
    Category: BitCategory;
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