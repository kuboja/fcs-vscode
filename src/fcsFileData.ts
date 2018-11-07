"use strict";

import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import * as path from "path";
import opn = require("opn");

import { FileSystemManager } from "./fileSystemManager";
import { FliCommand, IFliCommandMethods } from "./femcadRunnerManager";

export enum OutputFunctionType {

    None = 1,
    Print = 2,
    Document = 4,
    Json = 8,
    Image = 16,
}

export enum ExecutionMethodType {

    Straight = 1,
    WithTempFile = 2,
}


export class FcsFileData {

    readonly textDocument: vscode.TextDocument;
    readonly filePath: string;
    readonly fileName: string;
    readonly lineNumber: number;

    readonly rawLineCode: string;

    readonly clearlineCode: string;
    readonly clearCode: string;
    readonly commandType: OutputFunctionType;

    constructor(textDocunet: vscode.TextDocument, lineNumber: number) {
        this.filePath = textDocunet.fileName;

        this.fileName = path.basename(this.filePath, path.extname(this.filePath));

        let rawLineText: string = FcsFileData.getLineFromScript(textDocunet, lineNumber);
        let clearlineCode: string = FcsFileData.getRawCommandFromLine(rawLineText);

        this.textDocument = textDocunet;
        this.lineNumber = lineNumber;
        this.rawLineCode = rawLineText;
        this.clearlineCode = clearlineCode;
        this.commandType = FcsFileData.getCommandType(clearlineCode);
        this.clearCode = FcsFileData.clearRawCommand(clearlineCode, this.commandType);
    }

    private static getRawCommandFromLine(lineText: string): string {
        let rawCommand: string = "";

        let symbolReg: RegExp = /^([#a-zA-Z][\w\.\(\)\[\] ]*)/;
        let matches: RegExpMatchArray | null = lineText.match(symbolReg);

        if (matches === null) { 
            return "";
        }

        if (matches.length >= 1) {
            rawCommand = matches[0];
        }

        // remove comment
        if (rawCommand.startsWith("#")) {
            rawCommand = rawCommand.replace("#", "");
        }

        return rawCommand;
    }

    private static getCommandType(rawCommand: string): OutputFunctionType {
        let textLine: string = rawCommand.replace(/^(#+ *)/, "");

        if (textLine.startsWith("browse_report ") || textLine.startsWith("report ")) {
            return OutputFunctionType.Document;
        }
        if (textLine.startsWith("print ")) {
            return OutputFunctionType.Print;
        }
        if (textLine.startsWith("json ")) {
            return OutputFunctionType.Json;
        }
        if (textLine.startsWith("image ")) {
            return OutputFunctionType.Image;
        }

        return OutputFunctionType.Print;
    }

    private static clearRawCommand(rawCommand: string, _commandType: OutputFunctionType): string {
        let textLine: string = rawCommand.replace(/^#/, "");
        textLine = textLine.trim();

        textLine = textLine.replace(/^#* *(print|(browse_)?report|json|image) +/, "");

        return textLine;
    }

    /**
     * Načtení zadaného řádku z dokumentu
     */
    private static getLineFromScript(textDocunet: vscode.TextDocument, lineNumber: number): string {
        // načtení vybraného řádku
        return textDocunet.lineAt(lineNumber).text;
    }
}



export class LineRunnerCommandCreator implements IFliCommandMethods {

    private static stopText = "--FcsScriptEnD--";
    private static gclassName = "cls";

    private tempFilePath: string;
    private fcsFile: FcsFileData;

    private executionMethod: ExecutionMethodType | undefined;
    private fliCommand: FliCommand | undefined;

    constructor(fcsFile: FcsFileData) {
        this.fcsFile = fcsFile;
        
        let tempDirPath: string = FileSystemManager.getTempFolderPath();
        this.tempFilePath = FileSystemManager.getRandomTempName(tempDirPath, ".fcs")
    }

    public getFliCommand(): FliCommand {
        if (this.fliCommand){
            return this.fliCommand
        }

        this.executionMethod = LineRunnerCommandCreator.getExecutionMethod(this.fcsFile);

        let fliCommand : FliCommand;
        switch (this.executionMethod) {
            case ExecutionMethodType.Straight:
                fliCommand = this.ExecuteStraight(this.fcsFile);
                break;
            case ExecutionMethodType.WithTempFile:
                fliCommand = this.ExecuteWithTempFile(this.fcsFile);
                break;
            default:
                fliCommand = this.ExecuteWithTempFile(this.fcsFile);
                break;
        }

        this.fliCommand = fliCommand;
        return fliCommand;
    }

    private ExecuteWithTempFile(fcsFile: FcsFileData): FliCommand {
        let scriptFileName: string = fcsFile.filePath;

        let tempFileContent: string = LineRunnerCommandCreator.getTempFileContent(fcsFile, scriptFileName);
        FileSystemManager.createAndSaveTextFile(tempFileContent, this.tempFilePath);

        let command: string = FileSystemManager.quoteFileName(this.tempFilePath);

        return new FliCommand(command, true, LineRunnerCommandCreator.stopText);
    }

    private ExecuteStraight(fcsFile: FcsFileData): FliCommand {
        this.tempFilePath  = LineRunnerCommandCreator.getOutputFilePath(fcsFile.commandType, fcsFile.fileName);

        let command: string = LineRunnerCommandCreator.getCommandForStraightExecution(
            fcsFile,
            fcsFile.clearCode,
            this.tempFilePath );

        let fli : FliCommand = new FliCommand(command);
        fli.commandClass = this;

        return fli;
    }

    public afterExit(): void {
        switch (this.executionMethod) {
            case ExecutionMethodType.Straight:
                opn( this.tempFilePath );
                break;
            case ExecutionMethodType.WithTempFile:
                fs.unlinkSync(this.tempFilePath);
                break;
        }
    }

    private static getTempFileCommand(gclass: string, commandType: OutputFunctionType, command: string): string {
        let beforeVariable: string = "";
        let afterVariable: string = "";
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

    private static getExecutionMethod(fcsFile: FcsFileData): ExecutionMethodType {
        let method: ExecutionMethodType = ExecutionMethodType.WithTempFile;

        switch (fcsFile.commandType) {
            case OutputFunctionType.Document:
                method = ExecutionMethodType.Straight;
                break;

            case OutputFunctionType.Image:
                method = ExecutionMethodType.Straight;
                break;
        }

        return method;
    }

    private static getOutputFilePath(commandType: OutputFunctionType, fileName: string): string {
        let extension: string = "";
        switch (commandType) {
            case OutputFunctionType.Document:
                extension = ".html";
                break;

            case OutputFunctionType.Image:
                extension = ".png";
                break;
        }

        let tempFolderPath: string = FileSystemManager.getReportFolderPath() + "\\";

        let currentdate: Date = new Date();

        var date: string = currentdate.getFullYear() + "_"
            + ("0" + (currentdate.getMonth() + 1).toString()).slice(-2) + ""
            + ("0" + currentdate.getDate()).slice(-2) + "_"
            + ("0" + currentdate.getHours()).slice(-2) + ""
            + ("0" + currentdate.getMinutes()).slice(-2) + ""
            + ("0" + currentdate.getSeconds()).slice(-2);

        let outputFilePath: string = tempFolderPath + fileName + "_" + date + extension;

        return outputFilePath;
    }

    private static getCommandForStraightExecution(fcsFile: FcsFileData, command: string, outputFilePath: string): string {
        let commandType: OutputFunctionType = fcsFile.commandType;
        let filePathCmd: string = FileSystemManager.quoteFileName(fcsFile.filePath);

        let typeCmd: string = "";
        let outputFileCmd: string = "";
        let cmd: string = command;

        switch (commandType) {
            case OutputFunctionType.Document:
                typeCmd = "--t HTML";
                break;

            case OutputFunctionType.Json:
                cmd = `Fcs.Converters.ToJson( ${command} )`;
                break;

            case OutputFunctionType.Image:
                typeCmd = "--t PNG";
                break;
        }

        if (typeCmd !== "") {
            outputFileCmd = "--o " + FileSystemManager.quoteFileName(outputFilePath);
        }

        return `${filePathCmd} ${cmd} ${typeCmd} ${outputFileCmd}`;
    }

    private static getTempFileContent(fcsFile: FcsFileData, scriptFileName: string): string {
        let fullCommand: string = this.getTempFileCommand(this.gclassName, fcsFile.commandType, fcsFile.clearCode);

        const eol: string = os.EOL;

        let fileContent: string = "";
        fileContent += `gclass {${this.gclassName}} filename (\"${scriptFileName.replace("\\", "/")}\")` + eol;
        fileContent += fullCommand + eol;
        fileContent += `UkoncujiciPrikaz = \"${this.stopText}\"` + eol;
        fileContent += "print UkoncujiciPrikaz" + eol;

        return fileContent;
    }
}