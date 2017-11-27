"use strict";

import * as fs from "fs";
import * as kill from "tree-kill";
import * as vscode from "vscode";
import { exec, ChildProcess } from "child_process";
import { join } from "path";
import { AppInsightsClient } from "./appInsightsClient";

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
    private outputChannel: vscode.OutputChannel;

    readonly IsInitialized: boolean;

    private femCadFolder: string;
    private femcadPath: string;
    private fliPath: string;

    constructor(config: vscode.WorkspaceConfiguration, extData: ExtensionData) {

        this.extData = extData;
        this.appInsightsClient = extData.appInsightsClient;
        this.outputChannel = extData.outputChannel;

        let femcadFolder: string = config.get<string>("femcadFolder");
        let fliPath: string = join(femcadFolder, "fli.exe");
        let femcadPath: string = join(femcadFolder, "femcad.exe");

        // kontrola jetli je v nastevení zadán adresář femcadu
        if (!(femcadFolder)) {
            vscode.window.showErrorMessage("Není nastaven FemCAD adresář. Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            return;
        }

        let isOk: boolean = true;

        // kontrola jestli je adresář femcadu dostupný
        fs.access(femcadFolder, (err) => {
            if (err) {
                isOk = false;
                vscode.window
                    .showErrorMessage("Nebyl nalezen FemCAD adresář. Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            }
        });

        if (!isOk) { return; }

        // kontrola jestli je v adresáři femcad dostupný soubor femcad.exe
        fs.access(femcadPath, (err) => {
            if (err) {
                isOk = false;
                vscode.window.showErrorMessage("Nenalezen femcad.exe! Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            }
        });

        // kontrola jestli je v adresáři femcad dostupný soubor fli.exe
        fs.access(fliPath, (err) => {
            if (err) {
                isOk = false;
                vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            }
        });

        if (!isOk) { return; }

        this.femCadFolder = femcadFolder;
        this.fliPath = fliPath;
        this.femcadPath = femcadPath;
        this.IsInitialized = true;
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
                vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
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

        this.appInsightsClient.sendEvent(command);
        this.startTime = new Date();

        let fullCommand: string = "cmd /c chcp 65001 >nul && " + FileSystemManager.quoteFileName(this.fliPath) + " " + command;

        console.log("Fli path: " + this.fliPath);
        console.log("Full cmd command: " + fullCommand);

        this.process = exec(fullCommand, (error, stout, stderr) => {
            console.log(error);
            console.log(stout);
            console.log(stderr);
        });
        this.process.stdout.setEncoding("utf8");
        this.process.stdout.on("data", (data: string) => this.onGetOutputData(data));
        this.process.stderr.on("data", (data: string) => this.onGetOutputData(data));
        this.process.on("close", (code) => this.onCloseEvent(code));
    }

    public stopExecutionFliCommand(): void {
        this.appInsightsClient.sendEvent("Stop executin fli command");
        this.killProcess();
    }

    private onGetOutputData(data: string): void {
        let lines: string[] = data.split(/\r?\n/);
        let lineCount: number = lines.length;

        for (var iLine: number = 0; iLine < lineCount; iLine++) {
            var line: string = lines[iLine];
            if (iLine !== lineCount - 1) {
                line += "\r\n";
            } else {
                if (line.endsWith("\n")) {
                    this.lineBuffer = line;
                }
            }

            if (line.includes(this.commandData.stopText)) {
                this.killProcess();
                return;
            }

            if (this.extData.removeTraceInfo) {
                this.outputLineCount++;
                if (this.outputLineCount <= 4) { continue; }

                let printLine: boolean = true;

                const hiddingLines: string[] = [
                    "Interpreting",
                    "Opening",
                    "Analysing",
                    "Read+Parsing",
                    "Creating GClass",
                    "Running",
                    "...",
                ];

                for (var iHide: number = 0; iHide < hiddingLines.length; iHide++) {
                    if (line.includes(hiddingLines[iHide])) {
                        printLine = false;
                        break;
                    }
                }
                if (!printLine) { continue; }

                line = line.replace(/^(\| +)+/, "");
            }

            if (this.isRunning) {
                this.outputChannel.append(line);
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
        this.appInsightsClient.sendEvent("Open in FemCAD");

        if (!this.IsInitialized) {
            return;
        }

        fs.access(this.femcadPath, (err) => {
            if (err) {
                vscode.window.showErrorMessage("Nenalezen femcad.exe! Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            } else {
                let femcadPath: string = FileSystemManager.quoteFileName(this.femcadPath);
                let filePath: string = FileSystemManager.quoteFileName(fcsFilePath);
                let cmdToExec: string = femcadPath + " " + filePath;
                console.log(cmdToExec);

                exec(cmdToExec);
            }
        });
    }
}