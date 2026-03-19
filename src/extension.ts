import * as vscode from "vscode";
import { ExtensionData } from "./extensionData";
import { FliCommandRunner, OpenFileInFemCAD, ViewerCommandRunner } from "./commandManager";
import { FcsSymbolProvider } from "./fcsSymbolUtil";
import { FcsCompletionItemProvider } from "./fcsCompletionItemProvider";
import { FcsDefinitionProvider } from "./fcsDefinitionProvider";
import { InteractiveTree } from "./interactiveTree/interactiveTree";
import { TestTree } from "./testTree/testTree";
import { FcsTextContentProvider } from "./fcsTextContentProvider";
import { startLanguageServer, stopLanguageServer, isLanguageServerRunning } from "./fcsLanguageServer";
import { selectServerVersionCommand, redownloadServerCommand, checkForUpdatesCommand, scheduleBackgroundUpdates, resolveServerPathFromGitHub, getCachedFlivsTag } from "./githubServerProvider";
import { registerMcpServerProvider } from "./mcpServerProvider";

let extData: ExtensionData;

function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.command = "fcs-vscode.showFliMenu";
    item.tooltip = "FCS Language Server — click for options";
    context.subscriptions.push(item);
    return item;
}

function updateStatusBar(item: vscode.StatusBarItem, context: vscode.ExtensionContext): void {
    const overridePath = vscode.workspace.getConfiguration("fcs-vscode").get<string>("localOverridePath", "");
    if (overridePath) {
        item.text = `$(folder) fli: local`;
        item.tooltip = `FCS Language Server — local override: ${overridePath}\nAktualizace se nevyhledávají.`;
        item.show();
        return;
    }
    const tag = getCachedFlivsTag(context);
    if (tag) {
        item.text = `$(server) fli ${tag}`;
        item.tooltip = "FCS Language Server — click for options";
        item.show();
    } else {
        item.text = "$(warning) fli: not installed";
        item.tooltip = "FCS Language Server — click for options";
        item.show();
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    extData = new ExtensionData(context);

    registerCommands(extData.context, extData);
    registerMcpServerProvider(extData.context, extData);

    const statusBar = createStatusBarItem(context);
    updateStatusBar(statusBar, context);

    let knownTag = getCachedFlivsTag(context);

    const onUpdated = async () => {
        knownTag = getCachedFlivsTag(context); // keep poll timer in sync — this window did the download
        updateStatusBar(statusBar, context);
        extData.reporter.sendEvent("Language Server: updated", { version: knownTag ?? "unknown" });
        const choice = await vscode.window.showInformationMessage(
            "FCS Language Server: new version downloaded. Reload window to apply.",
            "Reload"
        );
        if (choice === "Reload") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.checkForUpdates", async () => {
            extData.reporter.sendEvent("Command: Check for updates");
            await checkForUpdatesCommand(context, async () => {
                updateStatusBar(statusBar, context);
                await onUpdated();
            });
            updateStatusBar(statusBar, context);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.showFliMenu", async () => {
            type MenuItem = vscode.QuickPickItem & { run: () => Thenable<void> };
            const items: MenuItem[] = [
                {
                    label: "$(sync) Check for Updates",
                    description: "Check GitHub for a newer version",
                    run: () => vscode.commands.executeCommand("fcs-vscode.checkForUpdates"),
                },
                {
                    label: "$(tag) Select Version",
                    description: "Pin or unpin a specific release",
                    run: () => vscode.commands.executeCommand("fcs-vscode.selectLanguageServerVersion"),
                },
                {
                    label: "$(cloud-download) Re-download Language Server",
                    description: "Force a fresh download of the current version",
                    run: () => vscode.commands.executeCommand("fcs-vscode.redownloadLanguageServer"),
                },
            ];
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: "FCS Language Server — choose an action",
            }) as MenuItem | undefined;
            if (picked) { await picked.run(); }
        }));

    const localOverridePath = vscode.workspace.getConfiguration("fcs-vscode").get<string>("localOverridePath", "");

    if (!localOverridePath) {
        // On startup: check GitHub for a new version (with login prompt).
        // Skipped if a check already happened within the last hour (flivs-last-check.txt).
        // On first install (no cache) this downloads the binary before starting the LS.
        await resolveServerPathFromGitHub(context, true, async () => {
            if (!isLanguageServerRunning()) {
                await startLanguageServer(context);
            } else {
                await onUpdated();
            }
        }).catch((e) => console.error("FCS Language Server: startup update check failed.", e));

        // Sync knownTag so the poll timer doesn't mistake our own download for
        // "installed by another window" (happens when the LS wasn't running yet
        // and the startup callback took the startLanguageServer branch instead of onUpdated).
        knownTag = getCachedFlivsTag(context) ?? knownTag;
    }

    updateStatusBar(statusBar, context);

    // Start LSP from cache (instant, no network).
    // Already started above on first install; this covers the normal case where
    // the binary existed before the update check ran.
    await startLanguageServer(context);
    extData.reporter.sendEvent("Language Server: started", { version: getCachedFlivsTag(context) ?? "unknown" });

    if (!localOverridePath) {
        // Hourly silent background update check (no login prompt).
        scheduleBackgroundUpdates(context, onUpdated);

        // Poll every 30 s: if another VS Code window downloaded a new flivs version,
        // update the status bar and show a reload notification.
        const pollTimer = setInterval(() => {
            const currentTag = getCachedFlivsTag(context);
            if (currentTag && currentTag !== knownTag) {
                const wasKnown = !!knownTag; // false on first install → skip notification
                knownTag = currentTag;
                updateStatusBar(statusBar, context);
                if (wasKnown) {
                    vscode.window.showInformationMessage(
                        `FCS Language Server: version ${currentTag} is now available (installed by another window). Reload to apply.`,
                        "Reload"
                    ).then((choice) => {
                        if (choice === "Reload") {
                            vscode.commands.executeCommand("workbench.action.reloadWindow");
                        }
                    });
                }
            }
        }, 30_000);
        context.subscriptions.push({ dispose: () => clearInterval(pollTimer) });
    }

    // Register regex-based providers. Skip definition provider when LSP is
    // active to avoid duplicate "Go to Definition" results.
    registerSymbolManager(extData.context, extData, isLanguageServerRunning());
}


function registerCommands(context: vscode.ExtensionContext, extData: ExtensionData): void {

    const codeManager: FliCommandRunner = new FliCommandRunner(extData);
    const openFcs: OpenFileInFemCAD = new OpenFileInFemCAD(extData);
    const viewerFcs: ViewerCommandRunner = new ViewerCommandRunner(extData);

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider("fliText", new FcsTextContentProvider()));

    context.subscriptions.push(new InteractiveTree(context, extData));

    context.subscriptions.push(new TestTree(context, extData));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runLine", async () => { await codeManager.runLineCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.stop", async () => { await codeManager.stopCommand(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.runFcsTerminal", async () => { await codeManager.openInTerminal(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcad", async () => { await openFcs.openInFemcad(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInFemcadWithProfiling", async () => { await openFcs.openInFemcadProfiling(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.openInViewer", async () => { await viewerFcs.openInViewer(); }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.selectLanguageServerVersion", async () => {
            await selectServerVersionCommand(context);
        }));

    context.subscriptions.push(
        vscode.commands.registerCommand("fcs-vscode.redownloadLanguageServer", async () => {
            await redownloadServerCommand(context, async () => {
                await stopLanguageServer();
                await startLanguageServer(context);
            });
        }));
}


function registerSymbolManager(context: vscode.ExtensionContext, extData: ExtensionData, lspActive: boolean): void {

    let fcsLang = { language: "fcs", scheme: "" };

    // When LSP is active it provides completions, symbols and definitions itself.
    // Registering the regex-based providers on top would cause duplicates.
    if (!lspActive) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(fcsLang, new FcsCompletionItemProvider(extData), ".")
        );

        context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider(fcsLang, new FcsSymbolProvider())
        );

        context.subscriptions.push(
            vscode.languages.registerDefinitionProvider(fcsLang, new FcsDefinitionProvider())
        );
    }
}

export async function deactivate() {
    await stopLanguageServer();
    if (extData) {
        extData.reporter.sendEvent("Extension deactivated");
        await extData.deactivate();
        console.log("Deactivated");
    }
}