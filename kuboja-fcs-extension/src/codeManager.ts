"use strict";

import * as fs from "fs";
import * as os from "os";
import { dirname, join } from "path";
import * as kill from "tree-kill";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";

enum OutputFunctionType {
    None = 1,
    Print = 2,
    Document = 4,
    Json = 8,
}

class CommandManager {

    public static stopText = "--FcsScriptEnD--"
    private static gclassName = "cls"

    public static createRunScriptFile(lineCode: string, scriptFileName: string): string {

        let tempDirPath = this.getTempFolderPath();
        let tempFileContent = CommandManager.getTempFileContent(lineCode, scriptFileName);
        let tempFilePath = this.createRandomFile(tempFileContent, tempDirPath, ".fcs");

        return tempFilePath;
    }


    private static getTempFileContent(lineCode: string, scriptFileName: string): string {

        let rawCommand = CommandManager.getRawCommand(lineCode);

        let commandType = CommandManager.getCommandType(rawCommand);
        let command = CommandManager.clearRawCommand(rawCommand);

        let fullCommand = CommandManager.getFullCommand(this.gclassName, commandType, command);

        const eol = require('os').EOL;

        let fileContent = "";
        fileContent += `gclass {${this.gclassName}} filename (\"${scriptFileName}\")` + eol;
        fileContent += fullCommand + eol;
        fileContent += `UkoncujiciPrikaz = \"${this.stopText}\"` + eol;
        fileContent += "print UkoncujiciPrikaz" + eol;

        return fileContent;
    }

    private static getFullCommand(gclass: string, commandType: OutputFunctionType, command: string): string {
        let beforeVariable = "";
        let afterVariable = "";
        switch (commandType) {
            case OutputFunctionType.None:
                break;

            case OutputFunctionType.Print:
                beforeVariable = "print";
                break;

            case OutputFunctionType.Document:
                beforeVariable = "browse_report";
                break;

            case OutputFunctionType.Json:
                beforeVariable = "Fcs.Converters.ToJson(";
                afterVariable = ")";
                break;

            default:
                break;
        }

        return `${beforeVariable} ${gclass}.${command} ${afterVariable}`;
    }

    private static getCommandType(rawCommand: string): OutputFunctionType {
        let textLine = rawCommand.replace(/^(#+ *)/, "");

        if (textLine.startsWith("browse_report ") || textLine.startsWith("report ")) {
            return OutputFunctionType.Document;
        }
        if (textLine.startsWith("print ")) {
            return OutputFunctionType.Print;
        }
        if (textLine.startsWith("json ")) {
            return OutputFunctionType.Json;
        }

        return OutputFunctionType.Print;
    }

    private static clearRawCommand(rawCommand: string): string {
        let textLine = rawCommand.replace(/^#/, "");
        textLine = textLine.trim();

        textLine = textLine.replace(/^#* *(print|(browse_)?report|json) +/, "")

        return textLine;
    }

    private static getRawCommand(lineText: string): string {

        // výběr příkazu z řádku
        let rawCommand = "";

        let symbolReg = /^([#a-zA-Z][\w\.\(\)\[\] ]*)/;
        let matches = lineText.match(symbolReg);

        if (matches.length >= 1) {
            rawCommand = matches[0];
        }

        let prvniZnak = rawCommand.charAt(0);
        if (rawCommand.startsWith('#'))
            rawCommand = rawCommand.replace('#', '');

        return rawCommand;
    }

    private static createRandomFile(content: string, folder: string, fileExtension: string): string {
        const tmpFileName = "temp_" + this.rndName() + fileExtension;
        let fullPath = join(folder, tmpFileName);
        fs.writeFileSync(fullPath, content);

        return fullPath;
    }

    private static rndName(): string {
        return Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 10);
    }

    private static createFolderIfNotExist(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }

    private static getTempFolderPath(): string {
        let tempDir = join(os.tmpdir(), "kuboja-fcs", "runner");
        this.createFolderIfNotExist(tempDir);
        return tempDir;
    }
}

export class CodeManager {
    private _context: vscode.ExtensionContext;
    private _config: vscode.WorkspaceConfiguration;
    private _appInsightsClient: AppInsightsClient;
    private _editor: vscode.TextEditor;
    private _outputChannel: vscode.OutputChannel;
    private _isRunning: boolean;
    private _process;
    private _outputLineCount: number;
    private _showExecutionMessage: boolean;
    private _startTime: Date;
    private _codeFile: string;
    private _femCadFolder: string;
    private _fliPath: string;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._outputChannel = vscode.window.createOutputChannel("fcs");

        this._appInsightsClient = new AppInsightsClient();
        this._appInsightsClient.sendEvent("Startup");
    }

    public run(): void {
        this._appInsightsClient.sendEvent("Run CodeLine");

        if (this._isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }

        this._config = vscode.workspace.getConfiguration("kuboja-fcs");
        this._showExecutionMessage = this._config.get<boolean>("showExecutionMessage");

        this._editor = vscode.window.activeTextEditor;
        if (!this._editor) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        this._femCadFolder = this._config.get<string>("femcadFolder");
        this._fliPath = join(this._femCadFolder, "fli.exe");

        fs.access(this._fliPath, (err) => {
            if (err) {
                vscode.window.showErrorMessage("Nenalezen fli.exe! Zkontrolujte nastavení parametru 'kuboja-fcs.femcadFolder'.");
            } else {
                this.getCodeFileAndExecute();
            }
        })
    }

    public stop(): void {
        this._appInsightsClient.sendEvent("stop");
        if (this._isRunning) {
            this._isRunning = false;
            const kill = require("tree-kill");
            kill(this._process.pid);
        }
    }

    private createFolderIfNotExist(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }

    private getCodeFileAndExecute(): any {

        let fcsFile = this._editor.document.fileName;
        let lineNumber = this._editor.selection.active.line;

        let lineText = this.getLineFromScript(lineNumber);
        this._codeFile = CommandManager.createRunScriptFile(lineText, fcsFile);

        let command = `cmd /c chcp 65001 >nul && ${this.quoteFileName(this._fliPath)} ${this.quoteFileName(this._codeFile)}`;

        console.log(lineText);
        console.log(this._codeFile);
        console.log(this._fliPath);
        console.log(command);

        const selection = this._editor.selection;
        const ignoreSelection = this._config.get<boolean>("ignoreSelection");

        if (this._editor.document.isUntitled) {
            vscode.window.showErrorMessage("Nelze spustit. Uložte nejdříve aktuální soubor.");
            return;
        }

        if (this._config.get<boolean>("saveAllFilesBeforeRun")) {
            return vscode.workspace.saveAll().then(() => {
                this.executeCommand(command);
            });
        }

        if (!this._editor.document.isDirty) {
            return this.executeCommand(command);
        }

        if (this._config.get<boolean>("saveFileBeforeRun")) {
            return this._editor.document.save().then(() => {
                this.executeCommand(command);
            });
        }

        vscode.window.showErrorMessage("Nelze spustit. Uložte nejdříve aktuální soubor, nebo povolte ukládání v nastavení.");
    }

    private executeCommand(executor: string) {
        this.executeCommandInOutputChannel(executor);
    }

    /**
     * Includes double quotes around a given file name.
     */
    private quoteFileName(fileName: string): string {
        return '\"' + fileName + '\"';
    }

    /**
     * Načtení zadaného řádku z dokumentu
     */
    private getLineFromScript(lineNumber: number): string {
        // načtení vybraného řádku
        return this._editor.document.lineAt(lineNumber).text;
    }

    private _lineBuffer = "";

    private executeCommandInOutputChannel(command: string) {
        this._isRunning = true;
        this._outputLineCount = 0;

        const clearPreviousOutput = this._config.get<boolean>("clearPreviousOutput");
        if (clearPreviousOutput) {
            this._outputChannel.clear();
        }

        this._outputChannel.show(this._config.get<boolean>("preserveFocus"));

        const exec = require("child_process").exec;

        if (this._showExecutionMessage) {
            this._outputChannel.appendLine("[Running] " + command);
        }

        this._appInsightsClient.sendEvent(command);
        this._startTime = new Date();

        this._process = exec(command);
        this._process.stdout.setEncoding('utf8');
        this._process.stdout.on("data", (data: string) => this.onGetOutputData(data));
        this._process.stderr.on("data", (data: string) => this.onGetOutputData(data));
        this._process.on("close", (code) => this.onCloseEvent(code));
    }

    private onGetOutputData(data: string) {
        let lines = data.split(/\r?\n/);
        let lineCount = lines.length;

        for (var iLine = 0; iLine < lineCount; iLine++) {
            var line = lines[iLine];
            if (iLine != lineCount - 1) {
                line += "\r\n";
            }
            else {
                if (line.endsWith("\n")) {
                    this._lineBuffer = line
                }
            }

            if (line.includes(CommandManager.stopText)) {
                this.killProcess();
                return;
            }

            if (this._config.get<boolean>("removeTraceInfo")) {
                this._outputLineCount++;
                if (this._outputLineCount <= 4) continue;

                let printLine = true;

                const hiddingLines = [
                    "Interpreting",
                    "Opening",
                    "Analysing",
                    "Read+Parsing",
                    "Creating GClass",
                    "Running",
                    "..."
                ];

                for (var iHide = 0; iHide < hiddingLines.length; iHide++) {
                    if (line.includes(hiddingLines[iHide])) {
                        printLine = false;
                        break;
                    }
                }
                if (!printLine) continue;

                line = line.replace(/^(\| +)+/, "");
            }

            if (this._isRunning) {
                this._outputChannel.append(line);
            }
        }
    }

    private onCloseEvent(code) {
        this._isRunning = false;
        const endTime = new Date();
        const elapsedTime = (endTime.getTime() - this._startTime.getTime()) / 1000;
        this._outputChannel.appendLine("");
        if (this._showExecutionMessage) {
            this._outputChannel.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
            this._outputChannel.appendLine("");
        }

        fs.unlink(this._codeFile);
    }

    private killProcess() {
        if (this._isRunning) {
            this._isRunning = false;
            kill(this._process.pid);
        }
    }
}