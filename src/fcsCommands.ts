import * as vscode from "vscode";
import * as path from "path";
import { FileSystemManager } from "./fileSystemManager";
import { FliCommand } from "./femcadRunnerManager";
import { Tools } from "./tools";
import { ExtensionData } from "./extensionData";

interface FliParameter {
    fli: string | undefined;
    outputFile?: string | undefined;
}

interface CommandLine {
    projectDirectory?: string;
    filePath: string;
    rawLine: string;
    trimedLine: string;
    outputFolder: string;
    fromSelection: boolean;
}

interface CommandDefinition {
    commandStart: string | RegExp;
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
        // if (wrkspc === undefined || line.isEmptyOrWhitespace) {
        //     return;
        // }

        let isSelection = !selection.isEmpty;
        if (isSelection) {
            let selStart = selection.start.character;
            let selEnd = selection.end.character;

            lineText = lineText.substring(selStart, selEnd);
        }

        let outFolder = (this.extData.outputFolder === "") ? FileSystemManager.getReportFolderPath() : this.extData.outputFolder;

        let lineData = {
            projectDirectory: wrkspc?.uri?.fsPath,
            filePath: doc.fileName,
            rawLine: lineText,
            trimedLine: lineText.trim(),
            outputFolder: outFolder,
            fromSelection: isSelection,
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
                    if (cmd.canBeOpened && this.extData.openAfterExport && fliParametres.outputFile) {
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
                new FliPrintCommand({ commandStart: /^#[ \t]*print/, exportType: "", fileExtension: "", canBeOpened: false }),
                new FliJsonPrintCommand({ commandStart: /^#[ \t]*fli_json/, exportType: "", fileExtension: "", canBeOpened: false }),
                
                new FliExportCommand({ commandStart: /^#[ \t]*fli_zip/, exportType: "ZIP", fileExtension: "zip", canBeOpened: false }),
                new FliExportCommand({ commandStart: /^#[ \t]*browse_report/, exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_report/, exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_html/, exportType: "HTML", fileExtension: "html", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_png/, exportType: "PNG", fileExtension: "png", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_jpg/, exportType: "JPG", fileExtension: "jpg", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_3js/, exportType: "3JS", fileExtension: "json", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_image/, exportType: "PNG", fileExtension: "png", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*browse_image/, exportType: "PNG", fileExtension: "png", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_dxf/, exportType: "DXF", fileExtension: "dxf", canBeOpened: false }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_rtf/, exportType: "RTF", fileExtension: "rtf", canBeOpened: false }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_ifc/, exportType: "IFC", fileExtension: "ifc", canBeOpened: false }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_docx/, exportType: "DOCX", fileExtension: "docx", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_xlsx/, exportType: "XLSX", fileExtension: "xlsx", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_pdf/, exportType: "PDF", fileExtension: "pdf", canBeOpened: true }),
                new FliExportCommand({ commandStart: /^#[ \t]*fli_svg/, exportType: "SVG", fileExtension: "svg", canBeOpened: true }),

                new FliSciaExportCommand({ commandStart: /^#[ \t]*fli_esazip/, exportType: "ESAZIP", fileExtension: "zip", canBeOpened: false }),
                new FliSciaExportCommand({ commandStart: /^#[ \t]*exportesaxml/, exportType: "ESAZIP", fileExtension: "zip", canBeOpened: false }),

                new FliExpressionCommand({ commandStart: "", exportType: "", fileExtension: "", canBeOpened: false }),
                new FliExpressionCommand({ commandStart: "#", exportType: "", fileExtension: "", canBeOpened: false }),

                new FliPrintCommand({ commandStart: "", exportType: "", fileExtension: "", canBeOpened: false }),
            ];
        }

        return FcsCommandsToFliMamanager.commands;
    }

}

class FliPrintCommand {

    protected readonly commandStart: string | RegExp;
    public readonly canBeOpened: boolean;

    constructor(commandDefinition: CommandDefinition) {
        this.commandStart = commandDefinition.commandStart;
        this.canBeOpened = commandDefinition.canBeOpened;
    }

    public getFliParameters(line: CommandLine): FliParameter {
        let expression = this.getCommandParameter(line);

        if (expression !== "") {
            return {
                fli: `"${line.filePath}" "${expression.replace(/\"/g, "\\\"")}"`,
            };
        }

        return { fli: undefined };
    }

    public isThisCommand(line: CommandLine): boolean {
        return CommandTools.checkIfLineStartWith(line.trimedLine, this.commandStart);
    }

    protected getCommandParameter(line: CommandLine): string {
        let para = CommandTools.removeCommandFromLine(line.trimedLine, this.commandStart);
        
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

class FliExpressionCommand extends FliPrintCommand {
    public isThisCommand(line: CommandLine): boolean {
        return CommandTools.checkIfLineStartWith(line.trimedLine, this.commandStart) && !line.fromSelection;
    }

    protected getCommandParameter(line: CommandLine): string {

        // >value := expression  
        //  ^^^^^
        let reg = /^([a-zA-Z][a-zA-Z0-9_]*)\s*:?=/;
        let match = reg.exec(line.rawLine);

        if (match && match.length > 1) {
            return match[1].toString();
        }

        // >#value   
        //   ^^^^^
        let reg2 = /^(?:#[ \t]*)?([a-zA-Z][a-zA-Z0-9_.]*)\s*/;
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
            fli: `"${line.filePath}" "${expression.replace(/\"/g, "\\\"")}" --t ${this.exportType} --o "${outputFilePath}"`,
            outputFile: outputFilePath
        };
    }

    protected getOutputFilePath(line: CommandLine, expression: string | undefined): string {
        let outFolder = line.outputFolder;
        let timestamp = Tools.getTimestamp();
        let baseFileName = path.basename(line.filePath, path.extname(line.filePath));
        let expr = (expression) ? "_" + expression : "";

        return path.join(outFolder, timestamp + "_" + baseFileName + expr + "." + this.fileExtension);
    }
}

class FliSciaExportCommand extends FliExportCommand {

    public getFliParameters(line: CommandLine): FliParameter {
        let templatePath = this.getCommandParameter(line);

        // zjištění jestli je zadána absolutní nebo relativní cesta
        if (!path.isAbsolute(templatePath) && line.projectDirectory) {
            templatePath = path.join(line.projectDirectory, templatePath);
        }

        let outputFilePath = this.getOutputFilePath(line, "");

        return {
            fli: `"${line.filePath}" --t ${this.exportType} -template "${templatePath}" --o "${outputFilePath}"`,
            outputFile: outputFilePath
        };
    }

    protected getCommandParameter(line: CommandLine): string {
        let para = CommandTools.removeCommandFromLine(line.trimedLine, this.commandStart);

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

class CommandTools {
    public static removeCommandFromLine(line: string, commandStart: string | RegExp) {
        if (typeof commandStart === "string") {
            return line.substr(commandStart.length);
        } else {
            return line.replace(commandStart, "");
        }
    }

    public static checkIfLineStartWith(line: string, commandStart: string | RegExp) {
        if (typeof commandStart === "string") {
            return line.startsWith(commandStart);
        } else {
            return commandStart.test(line);
        }
    }
}