"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as AdmZip from "adm-zip";
import { promisify, isNumber } from "util";

import { FileSystemManager } from "../fileSystemManager";
import { ExtensionData } from "../extensionData";

const readdirAsync = promisify(fs.readdir);

declare const IS_DEV_BUILD: boolean; // The value is supplied by Webpack during the build

export class FliUpdater {
    readonly requiredMainVersion = 2;

    private context: vscode.ExtensionContext;
    private extData: ExtensionData;
    private statusItem: vscode.StatusBarItem;

    private localFliDirName = "fliVS";

    private sourceBasePath: string;
    private sourceMainVersionPath: string;

    constructor(context: vscode.ExtensionContext, extData: ExtensionData) {
        this.context = context;
        this.extData = extData;

        this.sourceBasePath = this.extData.autoupdateFliVSsource;
        this.sourceMainVersionPath = path.join(this.sourceBasePath, this.numToFixLengthString(this.requiredMainVersion, 2));

        this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        this.statusItem.hide();
    }

    private numToFixLengthString(value: number, length: number) {
        return ("0".repeat(length) + value.toFixed(0)).slice(-length);
    }

    private async getLastVersion() {
        let ver = this.numToFixLengthString(this.requiredMainVersion, 2);
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
        let mainVer = this.numToFixLengthString(this.requiredMainVersion, 2);

        return path.join(this.sourceMainVersionPath, "flivc." + mainVer + "." + this.numToFixLengthString(ver, 2) + ".zip");
    }

    public getFliDir() {
        return path.join(this.context.globalStoragePath, this.localFliDirName);
    }

    public getFliPath() {
        let folder = (IS_DEV_BUILD) ? "C:/GitHub/fcs-histruct/Apps/FCS.Apps.FliVS/bin/Debug/net472" : this.getFliDir();
        return path.join(folder, "flivs.exe");
    }

    private async getcreatedFliDir() {
        let dirPath = this.getFliDir();
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

    private getCurrentMainVersion() {
        let curVer = this.context.globalState.get("fliVS_versionMain");
        if (curVer && isNumber(curVer)) {
            return curVer;
        }
        return 0;
    }

    private async setCurrentVersion(version: number) {
        await this.context.globalState.update("fliVS_versionMain", this.requiredMainVersion);
        await this.context.globalState.update("fliVS_version", version);
    }

    private async updateFliVS(): Promise<boolean> {

        this.statusItem.text = "FliVS updater: check current version...";
        this.statusItem.show();

        let currentVersion = this.getCurrentVersion();
        let currentMainVersion = this.getCurrentMainVersion();
        let lastVersion = await this.getLastVersion();

        console.log("FliVS updater: current version: " + currentVersion);
        console.log("FliVS updater: last version: " + lastVersion);

        // pokud není přístup ke zdroji aktualizací -> použije se stávající instalace flivs, pokud není dostupná ani ta -> konec
        if (!lastVersion) {
            vscode.window.showWarningMessage("FliVS updater: Failed to load current version information.");

            try {
                fs.accessSync(this.getFliPath());
            } catch (error) {
                console.error("FliVS updater: Failed to load current version information. And flivs is not accesible.");
                return false;
            }

            return true;
        }

        // test jeslti je dostupný flivs.exe -> pokud ne, tak proběhne aktulaizace vždy, jinak pouze pokud je dostupná nová verze
        try {
            fs.accessSync(this.getFliPath());

            if (currentMainVersion === this.requiredMainVersion && lastVersion <= currentVersion) {
                console.info("FliVS updater: The fliVS version is current.", lastVersion);
                return true;
            }
        } catch (error) {
            console.error("FliVS updater: FliVs in not currenty instaled -> will be install");
        }

        let fliDir = await this.getcreatedFliDir();
        let lastVersionZip = this.getLastVersionZip(lastVersion);

        console.log("FliVS updater: fli dir: " + fliDir);
        console.log("FliVS updater: last version zip path: " + lastVersionZip);

        if (!fliDir) {
            console.error("FliVS updater: Error accessing FliVS folder.");
            return false;
        }

        console.log("FliVS updater: update starting");
        this.statusItem.text = "FliVS updater: new version - updating...";

        try {
            fs.unlinkSync(this.getFliPath());

            try {
                FileSystemManager.deleteFolderRecursive(fliDir);
                fs.mkdirSync(fliDir, { recursive: true });
            } catch  {
                // chyba při mazání souborů - moc nevadí...
            }
        }
        catch (error) {
            /// pokud je fli otevřeno - neaktualizovat, ale umožnit spouštění...
            if ((<NodeJS.ErrnoException>error).code === "EPERM") {
                return true;
            }
            /// pokud fli neexistuje, tak pokračovat dále... při jiné chybě error konec.
            if ((<NodeJS.ErrnoException>error).code !== "ENOENT") {
                console.error("FliVS updater: Removing old version failed: " + error);
                return false;
            }
        }

        try {
            let zipFile = new AdmZip(lastVersionZip);

            let unAll = promisify(zipFile.extractAllToAsync);
            await unAll(fliDir, true);
        } catch (error) {
            console.error("FliVS updater: Downloading and unzipping the zip with the new version failed: " + error);
            return false;
        }

        console.log("FliVS updater: update success.");

        this.statusItem.text = "FliVS updater: update success...";
        this.statusItem.hide();

        await this.setCurrentVersion(lastVersion);
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
                this.statusItem.hide();
                return true;
            }
        } catch (error) {
            console.error("FliVS updater: An attempt to update the fliVS failed.");
        }

        this.statusItem.hide();
        return false;
    }
}