import * as vscode from "vscode";
import * as rpc from "vscode-jsonrpc";
import { ChildProcess, spawn } from "child_process";
import { ExtensionData } from "../extensionData";
import { TextDecoder } from "util";


export class TestManager implements vscode.Disposable {

    public static currentMainVersion = 1;

    private pathFli: string;
    public pathFcs: string;

    private extData: ExtensionData;
    private fliProcess?: ChildProcess;
    private connection?: rpc.MessageConnection;
    private sessionStarted: boolean = false;

    private showOutputsFromFli = true;

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
          
            this.fliProcess = spawn(this.pathFli, ["--t", "--c", pipeName], { shell: false, windowsHide: false });
            this.fliProcess.stdout?.setEncoding("utf8");
            this.fliProcess.stdout?.on("data", (data: string | OutBuffer) => this.onGetOutputData(data));
            this.fliProcess.stderr?.on("data", (data: string) => this.onGetOutputData(data));
            this.fliProcess.on("close", (code) => this.onCloseEvent(code));

            console.log("Fli process spawned");

            let [messageReader, messageWriter] = await pipe.onConnected();

            console.log("Pipe connected")

            this.connection = rpc.createMessageConnection(messageReader, messageWriter, logger);

            this.connection.onError((e) => {
                console.error("RPC: Chyba ve spojení:", e);
            });

            this.connection.trace(rpc.Trace.Messages, {
                log: (message: string, data?: string) => {
                    console.log("RPC: trace message: " + message, data);
                }
            });

            this.connection.onClose((e) => {
                console.log("RPC: connection closed ", e);

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

    onCloseEvent(code: number | null): void {
        if (this.showOutputsFromFli) { console.log("Fli was closed: " + code); }
        this.disconect();
    }

    onGetOutputData(data: string | OutBuffer): void {
        if (this.showOutputsFromFli) {
            let message = "";
            if (isOutBuffer(data)) {
                message = new TextDecoder().decode(new Uint8Array(data.data));
            } else {
                message = data;
            }
            console.log("Fli output (" + typeof(data) + "): ", message);
        }
    }

    public async sendStartRequest(): Promise<boolean> {
        if (!this.connection) { return false; }
        if (this.canSendRequest()) { return true; }

        //let req = new rpc.RequestType1<string,any,any,any>("start");
        let req2 = new rpc.RequestType2<string, string, boolean, any, any>("start");

        try {
            this.sessionStarted = await this.connection.sendRequest(req2, this.pathFcs, "");
        } catch (error) {
            this.sessionStarted = false;
            console.error("Chyba při volání metody start: " + error);
        }

        return this.sessionStarted;
    }

    public async executeTests(path: string) {
        if (!this.connection) { return; }

        let req = new rpc.RequestType2<string, string, TestInfo, any, any>("executeTests");

        try {
            return await this.connection.sendRequest(req, path, "");
        } catch (e) {
            let outChan = this.extData.getDefaultOutputChannel();
            outChan.show(this.extData.preserveFocusInOutput);
            outChan.appendLine("[IntFli.Error]: " + e);
            console.error("Error with " + req.method + " request: " + e);
        }
    }

    dispose() {
        if (this.fliProcess) {
            this.fliProcess.kill();
        }
    }
}

export interface TestInfo {
    Name: string;
    IsOk: boolean;
    Message: string | undefined;
    Items: TestInfo[];
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

function isOutBuffer(data: string | OutBuffer): data is OutBuffer {
    return !!data && data.hasOwnProperty("type");
}

type OutBuffer = { type: "buffer", data: number[] };