import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { ExtensionData } from "../extensionData";
import { resolveServerPathFromGitHub } from "../githubServerProvider";

export class FliUpdater {

    private context: vscode.ExtensionContext;
    private extData: ExtensionData;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;
    }

    /** Returns path to flivs.exe — local override first, then GitHub cache. */
    public getFliPath(): string {
        // 1. Local override path (for development)
        const overrideDir = this.extData.localOverridePath;
        if (overrideDir) {
            const overrideExe = path.join(overrideDir, "flivs.exe");
            if (fs.existsSync(overrideExe)) {
                return overrideExe;
            }
        }

        // 2. flivs cache downloaded from GitHub
        return path.join(this.extData.flivsFolderPath, "flivs.exe");
    }

    private countUpdate = 0;
    private lastUpdateTime = 0;

    public async runUpdate(): Promise<boolean> {
        const timeFromLastUpdate = Date.now() - this.lastUpdateTime;

        // Skip if last update was less than 15 minutes ago
        if (this.countUpdate === 0 && timeFromLastUpdate < 1000 * 60 * 15) {
            return true;
        }

        // Warn after 3 failed attempts within 3 minutes
        if (this.countUpdate >= 3 && timeFromLastUpdate > 1000 * 60 * 3) {
            vscode.window.showWarningMessage("FliVS updater: An attempt to update the application failed 3 times in the last 3 minutes.");
            return false;
        }

        this.countUpdate++;
        this.lastUpdateTime = Date.now();

        try {
            const githubPath = await resolveServerPathFromGitHub(this.context);
            if (githubPath) {
                this.countUpdate = 0;
                this.lastUpdateTime = Date.now();
                return true;
            }
        } catch (error) {
            console.error("FliVS updater: An attempt to update flivs failed.", error);
        }

        return false;
    }
}