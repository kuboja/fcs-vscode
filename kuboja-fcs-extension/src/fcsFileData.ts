"use strict";

import * as fs from "fs";
import * as vscode from "vscode";

import { FileSystemManager } from "./fileSystemManager";
import { FliCommand } from "./femcadRunnerManager";


export enum OutputFunctionType {

    None = 1,
    Print = 2,
    Document = 4,
    Json = 8,
}


export class FcsFileData {

    readonly textDocument: vscode.TextDocument;
    readonly filePath: string;
    readonly lineNumber: number;

    readonly rawLineCode: string;

    readonly clearlineCode: string;
    readonly clearCode: string;
    readonly commandType: OutputFunctionType;

    constructor(textDocunet: vscode.TextDocument, lineNumber: number) {
        this.filePath = textDocunet.fileName;

        let rawLineText: string = FcsFileData.getLineFromScript(textDocunet, lineNumber);
        let clearlineCode: string = FcsFileData.getRawCommandFromLine(rawLineText);

        this.textDocument = textDocunet;
        this.lineNumber = lineNumber;
        this.rawLineCode = rawLineText;
        this.clearlineCode = clearlineCode;
        this.clearCode = FcsFileData.clearRawCommand(clearlineCode);
        this.commandType = FcsFileData.getCommandType(clearlineCode);
    }

    private static getRawCommandFromLine(lineText: string): string {
        let rawCommand: string = "";

        let symbolReg: RegExp = /^([#a-zA-Z][\w\.\(\)\[\] ]*)/;
        let matches: RegExpMatchArray = lineText.match(symbolReg);
        if (matches.length >= 1) {
            rawCommand = matches[0];
        }

        // remove comment
        let prvniZnak: string = rawCommand.charAt(0);
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

        return OutputFunctionType.Print;
    }

    private static clearRawCommand(rawCommand: string): string {
        let textLine: string = rawCommand.replace(/^#/, "");
        textLine = textLine.trim();

        textLine = textLine.replace(/^#* *(print|(browse_)?report|json) +/, "");

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


export class LineRunnerCommandCreator {

    private static stopText = "--FcsScriptEnD--";
    private static commandName = "output";
    private static gclassName = "cls";

    readonly fliCommand: FliCommand;

    private tempFilePath: string;

    constructor(fcsFile: FcsFileData) {
        let scriptFileName: string = fcsFile.filePath;

        let tempDirPath: string = FileSystemManager.getTempFolderPath();
        let tempFileContent: string = LineRunnerCommandCreator.getTempFileContent(fcsFile, scriptFileName);
        this.tempFilePath = FileSystemManager.createRandomNameTextFile(tempFileContent, tempDirPath, ".fcs");

        let command: string = FileSystemManager.quoteFileName(this.tempFilePath);

        this.fliCommand = new FliCommand(command, true, LineRunnerCommandCreator.stopText, this.afterStopExecution);
    }

    private afterStopExecution(): void {
        fs.unlink(this.tempFilePath);
    }

    private static getTempFileCommand(gclass: string, commandType: OutputFunctionType, command: string): string {
        let beforeVariable: string = "";
        let afterVariable: string = "";
        switch (commandType) {
            case OutputFunctionType.None:
                break;

            case OutputFunctionType.Print:
                beforeVariable = "";
                break;

            case OutputFunctionType.Document:
                beforeVariable = "";
                break;

            case OutputFunctionType.Json:
                beforeVariable = "Fcs.Converters.ToJson(";
                afterVariable = ")";
                break;

            default:
                break;
        }

        return `${this.commandName} = ${beforeVariable} ${gclass}.${command} ${afterVariable}`;
    }

    private static getTempFileContent(fcsFile: FcsFileData, scriptFileName: string): string {
        let fullCommand: string = this.getTempFileCommand(this.gclassName, fcsFile.commandType, fcsFile.clearCode);

        const eol: string = require("os").EOL;

        let fileContent: string = "";
        fileContent += `gclass {${this.gclassName}} filename (\"${scriptFileName.replace("\\", "/")}\")` + eol;
        fileContent += fullCommand + eol;
        fileContent += `UkoncujiciPrikaz = \"${this.stopText}\"` + eol;
        fileContent += "print UkoncujiciPrikaz" + eol;

        return fileContent;
    }
}