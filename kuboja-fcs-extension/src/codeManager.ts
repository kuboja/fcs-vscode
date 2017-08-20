"use strict";
import * as fs from "fs";
import * as os from "os";
import { dirname, join } from "path";
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

    public static createRunScriptFile(lineCode: string, scriptFileName: string) : string {

        let tempDirPath = this.getTempFolderPath();
        let tempFileContent = CommandManager.getTempFileContent(lineCode, scriptFileName);
        let tempFilePath = this.createRandomFile(tempFileContent, tempDirPath, ".fcs");

        return tempFilePath;
    }


    private static getTempFileContent(lineCode: string, scriptFileName: string) : string {

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
        if (rawCommand.startsWith("browse_report ") || rawCommand.startsWith("report ")) {
            return OutputFunctionType.Document;
        }
        if (rawCommand.startsWith("print ")) {
            return OutputFunctionType.Print;
        }
        if (rawCommand.startsWith("json ")) {
            return OutputFunctionType.Json;
        }

        return OutputFunctionType.Print;
    }

    private static clearRawCommand(rawCommand: string): string {
        rawCommand = rawCommand.trim();
        if (rawCommand.startsWith("print ")) {
            rawCommand = rawCommand.substring("print".length);
        }
        if (rawCommand.startsWith("browse_report ")) {
            rawCommand = rawCommand.substring("browse_report".length);
        }
        if (rawCommand.startsWith("report ")) {
            rawCommand = rawCommand.substring("report".length);
        }
        if (rawCommand.startsWith("json ")) {
            rawCommand = rawCommand.substring("json".length);
        }

        return rawCommand.trim();
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

    private static createRandomFile(content: string, folder: string, fileExtension: string) : string {
        const tmpFileName = "temp" + this.rndName() + fileExtension;
        let fullPath = join(folder, tmpFileName);
        fs.writeFileSync(fullPath, content);

        return fullPath;
    }

    private static rndName(): string {
        return Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 10);
    }

    private static createFolderIfNotExist(dirPath : string): void{
        if (!fs.existsSync( dirPath )){
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
    private _editor : vscode.TextEditor
    private _outputChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal;
    private _isRunning: boolean;
    private _process;
    private _outputLineCount : number

    private _codeFile: string;
    private _isTmpFile: boolean;
    private _cwd: string; // složka pro vykonávání příkazů - temp složka
    

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._outputChannel = vscode.window.createOutputChannel("fcs");
        this._terminal = null;
        this._appInsightsClient = new AppInsightsClient();

        this._appInsightsClient.sendEvent("Startup");
    }

    // akce při zavření termninálu
    public onDidCloseTerminal(): void {
        this._terminal = null;
    }

    // příkaz pro spuštění kodu
    public run(): void {
        console.log("Run!");
        this._appInsightsClient.sendEvent("Run CodeLine");

        if (this._isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }
        this._outputLineCount = 0;

        this._editor = vscode.window.activeTextEditor;
        if (!this._editor) {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        const editor = this._editor

        this.initialize(editor);

        const executor = join(this._context.extensionPath,"commandRunner", "CommandRunner.exe")

        let fcsFile = editor.document.fileName;
        let lineNumber = editor.selection.active.line;
        let femCADfolder = "C:\\Users\\kuboj\\ownCloud\\FemCAD\\FemCAD_app\\app current";
        let fliPath = join(femCADfolder, "fli.exe");
        let command = this.quoteFileName(executor) + " -s " + this.quoteFileName(fcsFile) + " -l " + lineNumber + " -f " + this.quoteFileName(femCADfolder)

        // undefined or null
        fs.access(executor, (err) => {
            if (err){
                vscode.window.showInformationMessage("Nenalezen spouštěč!");
                this._appInsightsClient.sendEvent("Command runner not found.")
            } else  {
                console.log("Vše v pořádku.");
                console.log(command);
                
                this.getCodeFileAndExecute(editor, command);
            }
        })       
    }

    // příkaz pro násilné ukončenení běhu příkazu
    public stop(): void {
        this._appInsightsClient.sendEvent("stop");
        if (this._isRunning) {
            this._isRunning = false;
            const kill = require("tree-kill");
            kill(this._process.pid);
        }
    }

    private createFolderIfNotExist(dirPath : string): void{
        if (!fs.existsSync( dirPath )){
            fs.mkdirSync(dirPath);
        }
    }

    private initialize(editor: vscode.TextEditor): void {
        this._config = vscode.workspace.getConfiguration("kuboja-fcs");

        // výchozí složka pro soubory rozšíření
        let tempDir = this._context.storagePath;
        this.createFolderIfNotExist(tempDir);
        this._cwd = tempDir;
    }

    private getCodeFileAndExecute(editor: vscode.TextEditor, executor: string, appendFile: boolean = true): any {

        let fcsFile = editor.document.fileName;
        let lineNumber = editor.selection.active.line;

        let lineText = this.getLineFromScript(fcsFile, lineNumber);
        console.log(lineText);

        let tempScriptPath = CommandManager.createRunScriptFile(lineText, fcsFile);
        console.log(tempScriptPath);

        let femCADfolder = "C:\\Users\\kuboj\\ownCloud\\FemCAD\\FemCAD_app\\app current";
        let fliPath = join(femCADfolder, "fli.exe");
        console.log(fliPath);
        
        let command = `${this.quoteFileName(fliPath)} ${this.quoteFileName(tempScriptPath)}`;
        console.log(command);

        /*
        const selection = editor.selection;
        const ignoreSelection = this._config.get<boolean>("ignoreSelection");

        if ((selection.isEmpty || ignoreSelection) && !editor.document.isUntitled) {
            this._isTmpFile = false;
            this._codeFile = editor.document.fileName;

            if (this._config.get<boolean>("saveAllFilesBeforeRun")) {
                return vscode.workspace.saveAll().then(() => {
                    this.executeCommand(executor, appendFile);
                });
            }

            if (this._config.get<boolean>("saveFileBeforeRun")) {
                return editor.document.save().then(() => {
                    this.executeCommand(executor, appendFile);
                });
            }
        } else {
            let text = (selection.isEmpty || ignoreSelection) ? editor.document.getText() : editor.document.getText(selection);

            if (this._languageId === "php") {
                text = text.trim();
                if (!text.startsWith("<?php")) {
                    text = "<?php\r\n" + text;
                }
            }

            this._isTmpFile = true;
            const folder = editor.document.isUntitled ? this._cwd : dirname(editor.document.fileName);
            this.createRandomFile(text, folder, fileExtension);
        }
        */
        this.executeCommand(command, appendFile);
        
    }

    private executeCommand(executor: string, appendFile: boolean = true) {
      /* if (this._config.get<boolean>("runInTerminal") && !this._isTmpFile) {
            this.executeCommandInTerminal(executor, appendFile);
        } else {*/
            this.executeCommandInOutputChannel(executor, appendFile);
       // }
    }

    private getWorkspaceRoot(codeFileDir: string): string {
        return vscode.workspace.rootPath ? vscode.workspace.rootPath : codeFileDir;
    }

    /**
     * Gets the base name of the code file, that is without its directory.
     */
    private getCodeBaseFile(): string {
        const regexMatch = this._codeFile.match(/.*[\/\\](.*)/);
        return regexMatch.length ? regexMatch[1] : this._codeFile;
    }

    /**
     * Gets the code file name without its directory and extension.
     */
    private getCodeFileWithoutDirAndExt(): string {
        const regexMatch = this._codeFile.match(/.*[\/\\](.*(?=\..*))/);
        return regexMatch.length ? regexMatch[1] : this._codeFile;
    }

    /**
     * Gets the directory of the code file.
     */
    private getCodeFileDir(): string {
        const regexMatch = this._codeFile.match(/(.*[\/\\]).*/);
        return regexMatch.length ? regexMatch[1] : this._codeFile;
    }

    /**
     * Gets the directory of the code file without a trailing slash.
     */
    private getCodeFileDirWithoutTrailingSlash(): string {
        return this.getCodeFileDir().replace(/[\/\\]$/, "");
    }

    /**
     * Includes double quotes around a given file name.
     */
    private quoteFileName(fileName: string): string {
        return '\"' + fileName + '\"';
    }

    private getLineFromScript(scriptFilePath: string, lineNumber: number) : string {
        // načtení vybraného řádku
        return this._editor.document.lineAt(lineNumber).text;
    }




    private changeExecutorFromCmdToPs(executor: string): string {
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
            if (windowsShell && windowsShell.toLowerCase().indexOf("powershell") > -1 && executor.indexOf(" && ") > -1) {
                let replacement = "; if ($?) {";
                executor = executor.replace("&&", replacement);
                replacement = "} " + replacement;
                executor = executor.replace(/&&/g, replacement);
                executor = executor.replace(/\$dir\$fileNameWithoutExt/g, ".\\$fileNameWithoutExt");
                return executor + " }";
            }
        }
        return executor;
    }

    private changeFilePathForBashOnWindows(command: string): string {
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
            const terminalRoot = this._config.get<string>("terminalRoot");
            if (windowsShell && terminalRoot) {
                command = command
                    .replace(/([A-Za-z]):\\/g, (match, p1) => `${terminalRoot}${p1.toLowerCase()}/`)
                    .replace(/\\/g, "/");
            } else if (windowsShell && windowsShell.toLowerCase().indexOf("bash") > -1 && windowsShell.toLowerCase().indexOf("windows") > -1) {
                command = command.replace(/([A-Za-z]):\\/g, this.replacer).replace(/\\/g, "/");
            }
        }
        return command;
    }

    private replacer(match: string, p1: string): string {
        return `/mnt/${p1.toLowerCase()}/`;
    }



    private executeCommandInOutputChannel(executor: string, appendFile: boolean = true) {
        this._isRunning = true;

        const clearPreviousOutput = this._config.get<boolean>("clearPreviousOutput");
        if (clearPreviousOutput) {
            this._outputChannel.clear();
        }

        this._outputChannel.show(this._config.get<boolean>("preserveFocus"));

        const exec = require("child_process").exec;

        const command = executor // this.getFinalCommandToRunCodeFile(executor, appendFile);

        const showExecutionMessage = true; //this._config.get<boolean>("showExecutionMessage");
        if (showExecutionMessage) {
            this._outputChannel.appendLine("[Running] " + command);
        }

        this._appInsightsClient.sendEvent(executor);
        const startTime = new Date();
        this._process = exec(command, { cwd: this._cwd });

        this._process.stdout.on("data", (data) => {
            let lines = data.split(/\r?\n/);
            let lineCount = lines.length;

            for (var iLine = 0; iLine < lineCount; iLine++) {
                var line = lines[iLine];

                if (line.includes(CommandManager.stopText)) {
                    this.killProcess();
                }

                this._outputLineCount++;
                if (this._outputLineCount <= 4) continue;

                if (this._isRunning) {
                    if (iLine == lineCount - 1) {
                        this._outputChannel.append(line);
                    }
                    else {
                        this._outputChannel.appendLine(line);
                    }
                }
            }

            lines.forEach(line => {
                
            });
        });

        this._process.stderr.on("data", (data) => {
            this._outputChannel.append(data);
        });

        this._process.on("close", (code) => {
            this._isRunning = false;
            const endTime = new Date();
            const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this._outputChannel.appendLine("");
            if (showExecutionMessage) {
                this._outputChannel.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
                this._outputChannel.appendLine("");
            }
            if (this._isTmpFile) {
                fs.unlink(this._codeFile);
            }
        });
    }

    private killProcess(){
        if (this._isRunning) {
            this._isRunning = false;
            const kill = require("tree-kill");
            kill(this._process.pid);
        }
    }
}