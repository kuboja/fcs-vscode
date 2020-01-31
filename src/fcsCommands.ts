import * as vscode from "vscode";
import * as path from "path";
import { FileSystemManager } from "./fileSystemManager";
import { FliCommand } from "./femcadRunnerManager";
import { Tools } from "./tools";
import { ExtensionData } from "./extensionData";

interface FliParameter {
    fli : string | undefined;
    outputFile?: string | undefined;
}

interface CommandLine {
    projectDirectory: string;
    filePath: string;
    rawLine: string;
    trimedLine: string;
    outputFolder: string;
}

interface CommandDefinition {
    commandStart: string;
    exportType: string;
    fileExtension: string;
    canBeOpened: boolean;
}

export class FcsCommandsToFliMamanager {

    private static commands: FliPrintCommand[] = [];

    private readonly extData: ExtensionData;

    constructor(extData: ExtensionData) {
        this.extData = extData;
    }

    public getFliParameters(editor: vscode.TextEditor): FliCommand | undefined {

        let doc = editor.document;
        let selection = editor.selection;

        if (!selection.isSingleLine) {
            return;
        }

        let line = doc.lineAt(selection.active.line);
        let lineText = line.text;

        let wrkspc = vscode.workspace.getWorkspaceFolder(doc.uri);
        if (wrkspc === undefined || line.isEmptyOrWhitespace) {
            return;
        }

        if (!selection.isEmpty) {
            let selStart = selection.start.character;
            let selEnd = selection.end.character;

            lineText = lineText.substring(selStart, selEnd);
        }

        let outFolder = (this.extData.outputFolder === "") ? FileSystemManager.getReportFolderPath() : this.extData.outputFolder;

        let lineData = {
            projectDirectory: wrkspc.uri.fsPath,
            filePath: doc.fileName,
            rawLine: lineText,
            trimedLine: lineText.trim(),
            outputFolder: outFolder,
        };

        let commands = FcsCommandsToFliMamanager.getCommands();

        for (const cmd of commands) {
            if (cmd.isThisCommand(lineData)) {
                let fliParametres = cmd.getFliParameters(lineData);

                if (!fliParametres.fli) {
                    return;
                }

                let fliCommand = new FliCommand(fliParametres.fli);

                fliCommand.afterSuccessExecution = () => {
                    if (cmd.canBeOpened && this.extData.openAfterExport && fliParametres.outputFile){
                        let uri = vscode.Uri.file(fliParametres.outputFile);
                        vscode.env.openExternal(uri);
                    }
                };

                return fliCommand;
            }
        }
    }

    private static getCommands(): FliPrintCommand[] {
        if (FcsCommandsToFliMamanager.commands.length === 0) {
            FcsCommandsToFliMamanager.commands = [
                new FliPrintCommand({ commandStart: "#print", exportType: "", fileExtension: "", canBeOpened: false }),
                new FliJsonPrintCommand({ commandStart: "#fli_json", exportType: "", fileExtension: "", canBeOpened: false }),

                new FliExportCommand({ commandStart: "#browse_report", exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: "#fli_report", exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: "#fli_html", exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: "#fli_image", exportType: "PNG", fileExtension: "png", canBeOpened: true }),
                new FliExportCommand({ commandStart: "#browse_image", exportType: "PNG", fileExtension: "png", canBeOpened: true }),
                new FliExportCommand({ commandStart: "#fli_dxf", exportType: "DXF", fileExtension: "dxf", canBeOpened: false }),
                new FliExportCommand({ commandStart: "#fli_rtf", exportType: "RTF", fileExtension: "rtf", canBeOpened: false }),
                new FliExportCommand({ commandStart: "#fli_ifc", exportType: "IFC", fileExtension: "ifc", canBeOpened: false }),

                new FliSciaExportCommand({ commandStart: "#fli_esazip", exportType: "ESAZIP", fileExtension: "zip", canBeOpened: false }),
                new FliSciaExportCommand({ commandStart: "#exportesaxml", exportType: "ESAZIP", fileExtension: "zip", canBeOpened: false }),

                new FliWithoutPrintCommand({ commandStart: "", exportType: "", fileExtension: "", canBeOpened: false }),
                new FliWithoutPrintCommand({ commandStart: "#", exportType: "", fileExtension: "", canBeOpened: false }),
            ];
        }

        return FcsCommandsToFliMamanager.commands;
    }

}

class FliPrintCommand {

    protected readonly commandStart: string;
    public readonly canBeOpened: boolean;

    constructor(commandDefinition: CommandDefinition) {
        this.commandStart = commandDefinition.commandStart;
        this.canBeOpened = commandDefinition.canBeOpened;
    }

    public getFliParameters(line: CommandLine): FliParameter {
        let expression = this.getCommandParameter(line);

        if (expression !== "") {
            return { 
                fli: `"${line.filePath}" "${expression}"`,
            };
        }

        return { fli : undefined };
    }

    public isThisCommand(line: CommandLine): boolean {
        return line.trimedLine.startsWith(this.commandStart);
    }

    protected getCommandParameter(line: CommandLine): string {
        let para = line.trimedLine.substr(this.commandStart.length);

        // remove comments from line
        let commentHashIdx = para.indexOf("#");
        if (commentHashIdx > 0) {
            para = para.substring(0, commentHashIdx);
        }

        return para.trim();
    }
}

class FliJsonPrintCommand extends FliPrintCommand {
    public getFliParameters(line: CommandLine): FliParameter {
        let expression = this.getCommandParameter(line);

        return { fli: `"${line.filePath}" "Fcs.Converters.ToJson( ${expression} )"` };
    }
}

class FliWithoutPrintCommand extends FliPrintCommand {
    protected getCommandParameter(line: CommandLine): string {

        // >value := expression  
        //  ^^^^^
        let reg = /^([a-zA-Z][a-zA-Z0-9_]+)\s*:?=/;
        let match = reg.exec(line.rawLine);

        if (match && match.length > 1) {
            return match[1].toString();
        }

        // >#value   
        //   ^^^^^
        let reg2 = /^#?([a-zA-Z][a-zA-Z0-9_.]+)\s*/;
        let match2 = reg2.exec(line.rawLine);

        if (match2 && match2.length > 1) {
            return match2[1].toString();
        }

        return "";
    }
}

class FliExportCommand extends FliPrintCommand {

    protected readonly exportType: string;

    protected readonly fileExtension: string;

    constructor(commandDefinition: CommandDefinition) {
        super(commandDefinition);
        this.exportType = commandDefinition.exportType;
        this.fileExtension = commandDefinition.fileExtension;
    }

    public getFliParameters(line: CommandLine): FliParameter {
        let expression = this.getCommandParameter(line);
        let outputFilePath = this.getOutputFilePath(line, expression);

        return { 
            fli: `"${line.filePath}" "${expression}" --t ${this.exportType} --o "${outputFilePath}"`,
            outputFile: outputFilePath
        };
    }

    protected getOutputFilePath(line: CommandLine, expression: string | undefined): string {
        let outFolder = line.outputFolder;
        let timestamp = Tools.getTimestamp();
        let baseFileName = path.basename(line.filePath, path.extname(line.filePath));
        let expr = (expression) ? "_" + expression : "";

        return path.join(outFolder, timestamp + "_" + baseFileName + expr + "." + this.fileExtension );
    }
}

class FliSciaExportCommand extends FliExportCommand {

    public getFliParameters(line: CommandLine): FliParameter {
        let templatePath = this.getCommandParameter(line);

        // zjištění jestli je zadána absolutní nebo relativní cesta
        if (!path.isAbsolute(templatePath)) {
            templatePath = path.join(line.projectDirectory, templatePath);
        }

        let outputFilePath = this.getOutputFilePath(line, "");

        return { 
            fli: `"${line.filePath}" --t ${this.exportType} -template "${templatePath}" --o "${outputFilePath}"`,
            outputFile: outputFilePath
        };
    }

    protected getCommandParameter(line: CommandLine): string {
        let para = line.trimedLine.substr(this.commandStart.length);

        // remove comments from line
        let commentHashIdx = para.indexOf("#");
        if (commentHashIdx > 0) {
            para = para.substring(0, commentHashIdx);
        }

        let templateIdx = para.indexOf("templates");
        if (templateIdx >= 0) {
            para = para.substr(templateIdx + "templates".length);
        }

        para = para.replace(/"/g, "").trim();

        return para;
    }
}