import * as fs from "fs";
import { join } from "path";
import * as vscode from "vscode";
import * as treekill from "tree-kill";
import * as psTree from "ps-tree";
import { ChildProcess, spawn, exec } from "child_process";

import { AppInsightsClient } from "./appInsightsClient";
import { FileSystemManager } from "./fileSystemManager";
import { ExtensionData } from "./extensionData";


export interface IFliCommandMethods {
    afterExit(): void;
}

export class FliCommand {

    readonly command: string;
    readonly autoStop: boolean;
    readonly stopText: string | undefined;

    public commandClass: IFliCommandMethods | undefined;

    constructor(fliCommand: string, autostop: boolean = false, stopText: string = "") {
        this.command = fliCommand;
        if (stopText === "") {
            this.autoStop = false;
            this.stopText = undefined;
        } else {
            this.autoStop = autostop;
            this.stopText = stopText;
        }
    }

    public afterSuccessExecution(): void {
        if (this.commandClass !== undefined) {
            this.commandClass.afterExit();
        }
    }
}


export class FemcadRunner {

    private extData: ExtensionData;
    private appInsightsClient: AppInsightsClient;

    private readonly outputChannel: vscode.OutputChannel;
    private readonly IsInitialized: boolean;

    private getFemcadFolder(): string {
        return this.extData.femcadFolderPath;
    }

    private async getFemcadFilepath(fileName: string, quiteOnFile: boolean = false): Promise<string | undefined> {
        let femcadFolder: string = this.getFemcadFolder();

        if (!(femcadFolder)) {
            throw new Error("Není nastaven FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
        }

        // kontrola jestli je adresář femcadu dostupný
        if (!await AsyncTools.fsAccess(femcadFolder)) {
            throw new Error("Nebyl nalezen zadaný FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
        }

        let filePath = join(femcadFolder, fileName);

        // kontrola jestli je v adresáři femcad dostupný soubor
        if (!await AsyncTools.fsAccess(filePath)) {
            if (quiteOnFile) {
                return;
            }
            else {
                throw new Error("Nenalezen " + filePath + "! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            }
        }

        return filePath;
    }

    private async getFliFilepath(fileName: string, quiteOnFile: boolean = false): Promise<string | undefined> {
        let fliFolder: string = this.extData.fliFolderPath;

        if (!(fliFolder)) {
            throw new Error("Není nastaven FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder', případně 'fcs-vscode.fliFolder'.");
        }

        // kontrola jestli je adresář femcadu dostupný
        if (!await AsyncTools.fsAccess(fliFolder)) {
            throw new Error("Nebyl nalezen zadaný FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder', případně 'fcs-vscode.fliFolder'.");
        }

        let filePath = join(fliFolder, fileName);

        // kontrola jestli je v adresáři femcad dostupný soubor
        if (!await AsyncTools.fsAccess(filePath)) {
            if (quiteOnFile) {
                return;
            }
            else {
                throw new Error("Nenalezen " + filePath + "! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder', případně 'fcs-vscode.fliFolder'.");
            }
        }

        return filePath;
    }

    private async getFliPath(): Promise<string | undefined> {
        try {
            var fliPath = await this.getFliFilepath("fliw.exe", true);
            if (!fliPath) {
                fliPath = await this.getFliFilepath("fli.exe");
            }
            return fliPath;
        } catch (ex) {
            vscode.window.showErrorMessage(ex.message);
        }
    }

    private async getFemcadPath(): Promise<string | undefined> {
        try {
            return await this.getFemcadFilepath("femcad.exe");
        } catch (ex) {
            vscode.window.showErrorMessage(ex.message);
        }
    }

    constructor(extData: ExtensionData, outputChannelName: string | undefined = undefined) {
        this.IsInitialized = false;
        this.extData = extData;
        this.appInsightsClient = extData.appInsightsClient;

        this.outputLineCount = 0;
        this.startTime = new Date();

        vscode.window.onDidCloseTerminal(term => {
            if (term.name === "FemCAD") {
                this.disposeTerminal();
            }
        });

        if (!outputChannelName){
            outputChannelName = extData.defaultOutpuChannelName;
        }
        this.outputChannel = extData.getOutputChannel(outputChannelName);

        this.IsInitialized = true;
    }

    private _terminal: vscode.Terminal | undefined;
    private get terminal(): vscode.Terminal {
        if (this._terminal === undefined) {
            this._terminal = vscode.window.createTerminal("FemCAD");
        }
        return this._terminal;
    }

    private disposeTerminal() {
        if (this._terminal) {
            this._terminal.dispose();
            this._terminal = undefined;
        }
    }

    private isRunning?: boolean;
    private lineBuffer?: string;
    private outputLineCount: number;
    private startTime: Date;
    private process?: ChildProcess;
    private commandData?: FliCommand;

    public async executeFliCommand(commandData: FliCommand, withProgress: boolean = true): Promise<void> {
        this.commandData = commandData;
        let command: string = commandData.command;

        if (this.isRunning) {
            vscode.window.showInformationMessage("Fli is already running!");
            return;
        }

        let fliPath = await this.getFliPath();

        if (!fliPath) {
            return;
        }

        this.isRunning = true;
        this.outputLineCount = 0;
        this.lineBuffer = "";

        if (withProgress) {
            let progressOptions: vscode.ProgressOptions = {
                title: "Fli runner",
                location: vscode.ProgressLocation.Notification,
                cancellable: true,
            };

            vscode.window.withProgress(progressOptions, async (p, calcelationToken) => {
                return new Promise<void>((resolve, _) => {

                    p.report({ message: "Fli running..." });

                    calcelationToken.onCancellationRequested(() => this.killProcess());

                    const handle: NodeJS.Timer = setInterval(() => {

                        if (!this.isRunning) {
                            p.report({ message: "Fli ended." });
                            clearInterval(handle);
                            resolve();
                        }
                    }, 1000);

                });
            });
        }


        this.outputChannel.show(this.extData.preserveFocusInOutput);

        if (this.extData.clearPreviousOutput) {
            this.outputChannel.clear();
        }

        if (this.extData.showExecutionMessage) {
            this.outputChannel.appendLine("[Running] " + command);
        }

        //    this.appInsightsClient.sendEvent(command);
        this.startTime = new Date();

        let fullCommand: string = "cmd /c chcp 65001 >nul && " + FileSystemManager.quoteFileName(fliPath) + " " + command;

        console.log("Fli path: " + fliPath);
        console.log("Full cmd command: " + fullCommand);

        const process = spawn(fullCommand, [], { shell: true });
        if (process) {
            process.stdout.setEncoding("utf8");
            process.stdout.on("data", (data: string) => this.onGetOutputData(data));
            process.stderr.on("data", (data: string) => this.onGetOutputData(data));
            process.on("close", (code) => this.onCloseEvent(code));
        }
        this.process = process;
    }

    public async stopExecutionFliCommand(): Promise<void> {
        //    this.appInsightsClient.sendEvent("Stop executin fli command");
        await this.killProcess();
    }

    private async onGetOutputData(data: string): Promise<void> {
        if (!this.isRunning) { return; }

        data = this.lineBuffer + data;

        let linesAll: string[] = data.split(/\r?\n/);
        let lines: string[];

        if (data.endsWith("\n")) {
            lines = linesAll;
            this.lineBuffer = "";
        } else {
            if (linesAll.length === 1) {
                lines = [];
                this.lineBuffer = linesAll[0];
            } else {
                lines = linesAll.slice(0, linesAll.length - 1);
                this.lineBuffer = linesAll[linesAll.length - 1];
            }
        }

        for (var iLine: number = 0; iLine < lines.length; iLine++) {
            var line: string = lines[iLine];

            if (line === "") { continue; }

            if (this.commandData && this.commandData.stopText && line.includes(this.commandData.stopText)) {
                await this.killProcess();
                return;
            }

            if (this.extData.removeTraceInfo) {
                this.outputLineCount++;

                //if (this.outputLineCount <= 2) { continue; }

                let printLine: boolean = true;

                const hiddingLines: string[] = [
                    "Interpreting :",
                    "Opening :",
                    "Opening '",
                    "Analysing :",
                    "Read+Parsing",
                    "Creating GClass",
                    "Running  :",
                ];

                for (var iHide: number = 0; iHide < hiddingLines.length; iHide++) {
                    if (line.includes(hiddingLines[iHide])) {
                        printLine = false;
                        break;
                    }
                }

                if (!printLine) { continue; }
            }

            if (this.isRunning) {
                this.outputChannel.append(line + "\n");
            }
        }
    }

    private onCloseEvent(code: number): void {
        this.isRunning = false;
        const endTime: Date = new Date();
        const elapsedTime: number = (endTime.getTime() - this.startTime.getTime()) / 1000;
        this.outputChannel.appendLine("");

        if (this.extData.showExecutionMessage) {
            this.outputChannel.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
            this.outputChannel.appendLine("");
        }
        if (code === 0 && this.commandData) {
            this.commandData.afterSuccessExecution();
        }
    }

    private async killProcess(): Promise<void> {
        if (this.process && this.isRunning) {
            this.isRunning = false;
            await AsyncTools.treekillAsync(this.process.pid);
        }
    }

    public async openInFemcad(fcsFilePath: string): Promise<void> {
        this.appInsightsClient.sendEvent("Open in FemCAD");

        if (!this.IsInitialized) {
            return;
        }

        let femcadPath = await this.getFemcadPath();

        if (femcadPath) {
            let femcadPathqQuoted: string = FileSystemManager.quoteFileName(femcadPath);
            let filePath: string = FileSystemManager.quoteFileName(fcsFilePath);
            let cmdToExec: string = femcadPathqQuoted + " " + filePath;
            console.log(cmdToExec);

            exec(cmdToExec);
        }
    }

    public async openInFemcadProfiling(fcsFilePath: string): Promise<void> {
        this.appInsightsClient.sendEvent("Open in FemCAD with profiling");

        if (!this.IsInitialized) {
            return;
        }

        let femcadPath = await this.getFemcadPath();

        if (femcadPath) {
            let femcadPathqQuoted: string = FileSystemManager.quoteFileName(femcadPath);
            let filePath: string = FileSystemManager.quoteFileName(fcsFilePath);
            let cmdToExec: string = femcadPathqQuoted + " " + filePath + " -profileExpressionsXml";
            console.log(cmdToExec);

            exec(cmdToExec);
        }
    }

    public async openFcsFile(fcsPath: string): Promise<void> {
        var term: vscode.Terminal = this.terminal;

        try {
            let fliPath: string | undefined = await this.getFliPath();

            if (!fliPath) {
                return;
            }

            var terminalCommand: string = fliPath + " " + FileSystemManager.quoteFileName(fcsPath);

            let processId: number | undefined = await term.processId;

            if (!processId){
                return;
            }

            let children = await AsyncTools.psTreeAsync(processId);

            if (children.length > 0) {
                for (const child of children) {
                    if (child) {
                        await AsyncTools.treekillAsync(parseInt(child.PID));
                    }
                }
            }

            term.show(true);

            console.log("Open terminal:");
            console.log(terminalCommand);

            if (this.extData.clearPreviousOutput) {
                term.sendText("cls");
            }
            term.sendText(terminalCommand);

            vscode.commands.executeCommand("workbench.action.terminal.focus");

        } catch (error) {
            vscode.window.showErrorMessage("Nastala chyba při pokusu o spuštění souboru v terminálu.");

            console.log("Open terminal: Error");
            console.log(error);
        }
    }
}

class AsyncTools {

    public static async psTreeAsync(processId: number): Promise<readonly psTree.PS[]> {
        return new Promise((resolve, reject) => {
            psTree(processId, (err, children) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(children);
                }
            });
        });
    }

    public static async treekillAsync(processId: number | undefined): Promise<void> {
        if (!processId) {
            return;
        }

        return new Promise((resolve, reject) => {
            treekill(processId, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }

    public static async fsAccess(filepath: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.access(filepath, (err) => {
                if (err) {
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
        });
    }

}