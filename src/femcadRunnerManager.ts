"use strict";

import * as fs from "fs";
import * as kill from "tree-kill";
import * as vscode from "vscode";
import { ChildProcess, spawn, exec, spawnSync } from "child_process";
import { join } from "path";
import { AppInsightsClient } from "./appInsightsClient";
import * as psTree from "ps-tree";

import { FileSystemManager } from "./fileSystemManager";
import { ExtensionData } from "./extensionData";


export class FliCommand {

    readonly command: string;
    readonly autoStop: boolean;
    readonly stopText: string;

    constructor(fliCommand: string, autostop: boolean = false, stopText: string = null) {
        this.command = fliCommand;
        if (stopText == null || stopText === "") {
            this.autoStop = false;
            this.stopText = null;
        } else {
            this.autoStop = autostop;
            this.stopText = stopText;
        }
    }
}


export class FemcadRunner {

    private extData: ExtensionData;
    private appInsightsClient: AppInsightsClient;

    readonly IsInitialized: boolean;

    private femCadFolder: string;
    private femcadPath: string;
    private fliPath: string;

    constructor(extData: ExtensionData) {
        this.extData = extData;
        this.appInsightsClient = extData.appInsightsClient;

        let femcadFolder: string = extData.femcadFolderPath;
        let fliPath: string = join(femcadFolder, "fli.exe");
        let femcadPath: string = join(femcadFolder, "femcad.exe");

        // kontrola jetli je v nastavení zadán adresář femcadu
        if (!(femcadFolder)) {
            vscode.window.showErrorMessage("Není nastaven FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            return;
        }

        let isOk: boolean = true;

        // kontrola jestli je adresář femcadu dostupný
        fs.access(femcadFolder, (err) => {
            if (err) {
                isOk = false;
                vscode.window
                    .showErrorMessage("Nebyl nalezen zadaný FemCAD adresář. Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            }
        });

        if (!isOk) { return; }

        // kontrola jestli je v adresáři femcad dostupný soubor femcad.exe
        fs.access(femcadPath, (err) => {
            if (err) {
                isOk = false;
                vscode.window.showErrorMessage("Nenalezen femcad.exe! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            }
        });

        // kontrola jestli je v adresáři femcad dostupný soubor fli.exe
        fs.access(fliPath, (err) => {
            if (err) {
                isOk = false;
                vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            }
        });

        if (!isOk) { return; }

        vscode.window.onDidCloseTerminal(term => {
            if ( term.name === "FemCAD" ) {
                this._terminal.dispose();
                this._terminal = undefined;
            }
        });

        this.femCadFolder = femcadFolder;
        this.fliPath = fliPath;
        this.femcadPath = femcadPath;
        this.IsInitialized = true;
    }


    private _terminal : vscode.Terminal;
    private get terminal(): vscode.Terminal {
        if (this._terminal === undefined) {
            this._terminal = vscode.window.createTerminal("FemCAD");
        }
        return this._terminal;
    }

    private _outputChannel : vscode.OutputChannel;
    private get outputChannel(): vscode.OutputChannel {
        if (this._outputChannel === undefined) {
            this._outputChannel = vscode.window.createOutputChannel("FemCAD");
        }
        return this._outputChannel;
    }

    private isRunning: boolean;
    private lineBuffer: string;
    private outputLineCount: number;
    private startTime: Date;
    private process: ChildProcess;
    private commandData: FliCommand;

    public executeFliCommand(commandData: FliCommand): void {
        this.commandData = commandData;
        let command: string = commandData.command;

        if (this.isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }

        fs.access(this.fliPath, (err) => {
            if (err) {
                vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
                return;
            }
        });

        this.isRunning = true;
        this.outputLineCount = 0;
        this.lineBuffer = "";

        this.outputChannel.show(this.extData.preserveFocusInOutput);

        if (this.extData.clearPreviousOutput) {
            this.outputChannel.clear();
        }

        if (this.extData.showExecutionMessage) {
            this.outputChannel.appendLine("[Running] " + command);
        }

    //    this.appInsightsClient.sendEvent(command);
        this.startTime = new Date();

        let fullCommand: string = "cmd /c chcp 65001 >nul && " + FileSystemManager.quoteFileName(this.fliPath) + " " + command;

        console.log("Fli path: " + this.fliPath);
        console.log("Full cmd command: " + fullCommand);

        this.process = spawn(fullCommand, [], { shell: true });
        this.process.stdout.setEncoding("utf8");
        this.process.stdout.on("data", (data: string) => this.onGetOutputData(data));
        this.process.stderr.on("data", (data: string) => this.onGetOutputData(data));
        this.process.on("close", (code) => this.onCloseEvent(code));
    }

    public stopExecutionFliCommand(): void {
    //    this.appInsightsClient.sendEvent("Stop executin fli command");
        this.killProcess();
    }

    private printOut: boolean = false;

    private onGetOutputData(data: string): void {
        if (!this.isRunning) {return;}

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

            if ( line === "" ) { continue; }

            if (line.includes(this.commandData.stopText)) {
                this.killProcess();
                return;
            }

            if (this.extData.removeTraceInfo) {
                this.outputLineCount++;

                if (this.outputLineCount <= 4) { continue; }

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
    }

    private killProcess(): void {
        if (this.isRunning) {
            this.isRunning = false;
            kill(this.process.pid);
        }
    }

    public openInFemcad(fcsFilePath: string): void {
    //    this.appInsightsClient.sendEvent("Open in FemCAD");

        if (!this.IsInitialized) {
            return;
        }

        fs.access(this.femcadPath, (err) => {
            if (err) {
                vscode.window.showErrorMessage("Nenalezen femcad.exe! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
            } else {
                let femcadPath: string = FileSystemManager.quoteFileName(this.femcadPath);
                let filePath: string = FileSystemManager.quoteFileName(fcsFilePath);
                let cmdToExec: string = femcadPath + " " + filePath;
                console.log(cmdToExec);

                exec(cmdToExec);
            }
        });
    }

    private killProcessId(processId: number): void {
        if (processId) {
            spawnSync("Taskkill", ["/PID", processId.toString(), "/T", "/F"], { shell: true });
        }
    }

    public openFcsFile(fcsPath: string): void {
        var term: vscode.Terminal = this.terminal;

        try {
            fs.access(this.fliPath, (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'fcs-vscode.femcadFolder'.");
                    return;
                }
            });

            var terminalCommand: string = this.fliPath + " " + FileSystemManager.quoteFileName(fcsPath);

            term.processId.then(pid => {
                var processId: number = pid;

                psTree(processId, (err, children) => {
                    if (children.length > 0) {
                        for (const child of children) {
                            this.killProcessId(child.PID);
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
                });

            });

        } catch (error) {
            vscode.window.showErrorMessage("Nastala chyba při pokusu o spuštění souboru v terminálu.");

            console.log("Open terminal: Error");
            console.log(error);
        }
    }
}