"use strict";

import * as fs from "fs";
import * as shelljs from "shelljs";
import { tmpdir } from "os";
import { join } from "path";


export class FileSystemManager {

    public static createFolderIfNotExist(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            shelljs.mkdir("-p", dirPath);
        }
    }

    public static getRandomTempName(folder: string, fileExtension: string): string {
        return join(folder, "temp_" + this.rndName() + fileExtension );
    }

    public static createAndSaveTextFile(content: string, fullPath: string) {
        fs.writeFileSync(fullPath, content);
    }

    public static getTempFolderPath(): string {
        let tempDir: string = join(tmpdir(), "fcs-vscode", "runner");
        this.createFolderIfNotExist(tempDir);

        return tempDir;
    }

    public static getReportFolderPath(): string {
        let tempDir: string = join(tmpdir(), "FcsReports");
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