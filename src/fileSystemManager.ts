"use strict";

import * as fs from "fs";
import * as os from "os";
import * as shelljs from "shelljs";
import { dirname, join } from "path";


export class FileSystemManager {

    public static createFolderIfNotExist(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            shelljs.mkdir("-p", dirPath);
        }
    }

    public static createRandomNameTextFile(content: string, folder: string, fileExtension: string): string {
        const tmpFileName: string = "temp_" + this.rndName() + fileExtension;
        let fullPath: string = join(folder, tmpFileName);
        fs.writeFileSync(fullPath, content);

        return fullPath;
    }

    public static getTempFolderPath(): string {
        let tempDir: string = join(os.tmpdir(), "fcs-vscode", "runner");
        this.createFolderIfNotExist(tempDir);

        return tempDir;
    }

    public static getReportFolderPath(): string {
        let tempDir: string = join(os.tmpdir(), "FcsReports");
        this.createFolderIfNotExist(tempDir);

        return tempDir;
    }

    public static rndName(): string {
        return Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 10);
    }

    /**
     * Includes double quotes around a given file name.
     */
    public static quoteFileName(fileName: string): string {
        return "\"" + fileName + "\"";
    }
}