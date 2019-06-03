"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as AdmZip from "adm-zip";
import { promisify, isNumber } from "util";

import { FileSystemManager } from "../fileSystemManager";
import { ExtensionData } from "../extensionData";

const readdirAsync = promisify(fs.readdir);

export class FliUpdater {
    private context: vscode.ExtensionContext;
    private extData: ExtensionData;
    private statusItem: vscode.StatusBarItem;

    private localFliDirName = "fliVS";
    private currentMainVersion = 1;

    private sourceBasePath: string;
    private sourceMainVersionPath: string;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;

        this.sourceBasePath = this.extData.autoupdateFliVSsource;
        this.sourceMainVersionPath = path.join(this.sourceBasePath, this.numToFixLengthString(this.currentMainVersion, 2));

        this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2000);
        this.statusItem.hide();
    }

    private numToFixLengthString(value: number, length: number) {
        return ("0".repeat(length) + value.toFixed(0)).slice(-length);
    }

    private async getLastVersion() {
        let ver = this.numToFixLengthString(this.currentMainVersion, 2);
        try {
            let versions = (await readdirAsync(this.sourceMainVersionPath))
                .map(f => parseInt(f.replace("flivc." + ver + ".", "").replace(".zip", "")))
                .filter(f => f);
            let max = Math.max(...versions);

            return max;
        } catch (error) {
            console.log('Unable to scan directory: ' + error);
        }
    }

    private getLastVersionZip(ver: number) {
        let mainVer = this.numToFixLengthString(this.currentMainVersion, 2);

        return path.join(this.sourceMainVersionPath, "flivc." + mainVer + "." + this.numToFixLengthString(ver, 2) + ".zip");
    }

    private async getFliDir() {
        let dirPath = path.join(this.context.globalStoragePath, this.localFliDirName) + path.sep;
        try {
            // in node 10.2 resursive not working!
            fs.mkdirSync(this.context.globalStoragePath, { recursive: true });
        } catch (error) {
            if ((<NodeJS.ErrnoException>error).code !== "EEXIST") {
                console.error("Unable create directory: " + error);
                return;
            }
        }
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (error) {
            if ((<NodeJS.ErrnoException>error).code !== "EEXIST") {
                console.error("Unable create directory: " + error);
                return;
            }
        }
        return dirPath;
    }

    private getCurrentVersion() {
        let curVer = this.context.globalState.get("fliVS_version");
        if (curVer && isNumber(curVer)) {
            return curVer;
        }

        return 0;
    }

    private async setCurrentVersion(version: number) {
        await this.context.globalState.update("fliVS_version", version);
    }

    private async updateFliVS(): Promise<boolean> {
        let currentVersion = this.getCurrentVersion();
        let lastVersion = await this.getLastVersion();

        console.log("FliVS updater: current version: " + currentVersion);
        console.log("FliVS updater: last version: " + lastVersion);

        if (!lastVersion) {
            console.error("FliVS updater: Failed to load current version information.");
            return false;
        }

        if (lastVersion <= currentVersion) {
            console.info("FliVS updater: The fliVS version is current.", lastVersion);
            return true;
        }

        let fliDir = await this.getFliDir();
        let lastVersionZip = this.getLastVersionZip(lastVersion);

        console.log("FliVS updater: fli dir: " + fliDir);
        console.log("FliVS updater: last version zip path: " + lastVersionZip);

        if (!fliDir) {
            console.error("FliVS updater: Error accessing FliVS folder.");
            return false;
        }

        console.log("FliVS updater: update starting");

        try {
            FileSystemManager.deleteFolderRecursive(fliDir);
            fs.mkdirSync(fliDir, { recursive: true });
        } catch (error) {
            console.error("FliVS updater: Removing old version failed: " + error);
            return false;
        }

        let zipFile = new AdmZip(lastVersionZip);

        try {
            let unAll = promisify(zipFile.extractAllTo);
            await unAll(fliDir, true);
        } catch (error) {
            console.error("FliVS updater: Downloading and unzipping the zip with the new version failed: " + error);
            return false;
        }

        console.log("FliVS updater: update success.");

        this.setCurrentVersion(lastVersion);
        return true;
    }

    private countUpdate = 0;
    private lastUpdateTime = 0;

    public async runUpdate() {
        if (!this.extData.autoupdateFliVSenabled) {
            return true;
        }

        let timeFromLastUpdate = (Date.now() - this.lastUpdateTime);

        // pokud od poslední aktualizace uběhlo méně než 15 minut, tak počkat
        if (this.countUpdate === 0 && timeFromLastUpdate < 1000 * 60 * 15) {
            return true;
        }

        // pokud proběhnout 3 nespěšné pokusy do 3 minut, tak čekat...
        if (this.countUpdate >= 3 && timeFromLastUpdate > (1000 * 60 * 3)) {
            vscode.window.showWarningMessage("FliVS updater: An attempt to update the application failed 3 times in the last 3 minutes.");
            return false;
        }

        this.countUpdate++;
        this.lastUpdateTime = Date.now();

        try {
            if (await this.updateFliVS()) {
                this.countUpdate = 0;
                this.lastUpdateTime = Date.now();
                return true;
            }
        } catch (error) {
            console.error("FliVS updater: An attempt to update the fliVS failed.");
        }

        return false;
    }
}