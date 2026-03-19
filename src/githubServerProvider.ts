/**
 * githubServerProvider.ts
 *
 * Handles GitHub authentication, access-check against a private repository,
 * and download of the proprietary language-server binary from a private
 * GitHub Release asset.
 *
 * Flow:
 *  1. Request a GitHub OAuth session (VS Code built-in auth provider).
 *  2. Use the token to verify the user has read access to PRIVATE_REPO.
 *  3. Find the latest release in PRIVATE_REPO and download the matching asset.
 *  4. Cache the binary in context.globalStorageUri so re-downloads only happen
 *     when a newer release is available.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { exec } from "child_process";
import { IncomingMessage } from "http";

// ── Configuration ────────────────────────────────────────────────────────────

/** Owner and name of the PRIVATE repository that hosts the language server. */
const PRIVATE_REPO_OWNER = "HiStructClient";
const PRIVATE_REPO_NAME  = "fcs-flivs";

/** Name of the zip asset uploaded to the GitHub Release. */
const ASSET_NAME = "flivs.zip";

/** Name of the EXE inside the zip that acts as the language server. */
const EXE_IN_ZIP = "flils.exe";

/** Name of the info/compatibility JSON file inside the zip. */
const FLIVS_INFO_FILENAME = "flivs-info.json";

/** Subdirectory inside globalStorageUri where the zip is extracted. */
const EXTRACT_DIR = "flivs";

/** File that stores the tag of the currently cached release. */
const CACHED_TAG_FILE = "flivs-release-tag.txt";

/** File that stores the timestamp of the last GitHub API version check. */
const LAST_CHECK_FILE = "flivs-last-check.txt";

/** File that stores a user-pinned version tag (optional). */
const PINNED_TAG_FILE = "flivs-pinned-tag.txt";

/** Tag file written into flivs-staging/ after extraction so its version is always known. */
const STAGING_TAG_FILE = "flivs-staging-tag.txt";

// ── Status bar ───────────────────────────────────────────────────────────────

/**
 * Returns the currently cached flivs release tag (e.g. "v1.2.3"), or
 * `undefined` when no release has been downloaded yet.
 */
export function getCachedFlivsTag(context: vscode.ExtensionContext): string | undefined {
    const tagPath = path.join(context.globalStorageUri.fsPath, CACHED_TAG_FILE);
    if (!fs.existsSync(tagPath)) { return undefined; }
    const tag = fs.readFileSync(tagPath, "utf-8").trim();
    return tag || undefined;
}

/** Skip the GitHub API version check if last check was within this interval. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** How often the background update timer fires (ms). */
const BACKGROUND_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Lock file preventing concurrent updates from multiple VS Code windows. */
const LOCK_FILE = "flivs-update.lock";

/** Lock older than this is considered stale (owner process probably crashed). */
const LOCK_STALE_MS = 5 * 60 * 1000;

/** Temporary directory used during download + extraction of a new release. */
const STAGING_DIR = "flivs-staging";

/** Temporary name for the current active directory during an atomic swap. */
const OLD_DIR = "flivs-old";

// ── Types ────────────────────────────────────────────────────────────────────

interface GitHubRelease {
    tag_name: string;
    published_at: string;
    assets: { name: string; url: string }[];
}

/** Contents of flivs-info.json bundled inside flivs.zip. */
interface FlivsInfo {
    /** Minimum extension version required to work with this flivs release. */
    minExtensionVersion?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Check whether a process with the given PID is still alive. */
function isProcessAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true; } catch { return false; }
}

/**
 * Try to acquire an exclusive file-based lock.
 * Returns true if this process now owns the lock, false if another live
 * process already holds it.
 */
function acquireLock(storageDir: string): boolean {
    const lockPath = path.join(storageDir, LOCK_FILE);

    if (fs.existsSync(lockPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(lockPath, "utf-8")) as { pid: number; ts: number };
            const stale = (Date.now() - data.ts) > LOCK_STALE_MS;
            const dead  = !isProcessAlive(data.pid);
            if (!stale && !dead) {
                return false; // another live VS Code window is updating
            }
            // Stale or dead lock — remove it so the exclusive-create write below succeeds.
            try { fs.unlinkSync(lockPath); } catch { /* ignore race — the wx write will handle it */ }
        } catch {
            // Corrupt lock — try to remove it before stealing.
            try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
        }
    }

    // Use exclusive create flag to avoid a TOCTOU race between the check above
    // and the write. If two processes reach here simultaneously, only one wins.
    try {
        fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: "wx" });
        return true;
    } catch (e: any) {
        if (e.code === "EEXIST") { return false; }
        throw e;
    }
}

/** Release the file-based lock. */
function releaseLock(storageDir: string): void {
    try { fs.unlinkSync(path.join(storageDir, LOCK_FILE)); } catch { /* ignore */ }
}

/**
 * Remove leftover staging and old directories from a previous crashed update.
 * Called once at the beginning of each update check.
 */
function cleanupStaleDirs(storageDir: string): void {
    // Only attempt cleanup when no lock is held (no update in progress)
    if (fs.existsSync(path.join(storageDir, LOCK_FILE))) { return; }
    for (const name of [STAGING_DIR, OLD_DIR]) {
        const dir = path.join(storageDir, name);
        if (fs.existsSync(dir)) {
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* files still in use */ }
        }
    }
}

/**
 * Atomic directory swap: flivs-staging/ → flivs/ (the active cache dir).
 *
 * Strategy:
 *  1. Rename existing flivs/ → flivs-old/  (works on Windows even with running
 *     executables — processes hold handles by inode, not by path).
 *  2. Rename flivs-staging/ → flivs/.
 *  3. Attempt async deletion of flivs-old/ — may fail silently if exes are
 *     still in use; cleanupStaleDirs() will finish the job next time.
 */
function atomicSwap(storageDir: string): void {
    const activeDir  = path.join(storageDir, EXTRACT_DIR);
    const stagingDir = path.join(storageDir, STAGING_DIR);
    const oldDir     = path.join(storageDir, OLD_DIR);

    if (fs.existsSync(activeDir)) {
        if (fs.existsSync(oldDir)) {
            try { fs.rmSync(oldDir, { recursive: true, force: true }); } catch { /* ignore */ }
        }
        fs.renameSync(activeDir, oldDir);
    }

    fs.renameSync(stagingDir, activeDir);

    // Best-effort async cleanup — silently ignore EPERM (exe still running)
    setImmediate(() => {
        try { fs.rmSync(oldDir, { recursive: true, force: true }); } catch { /* ignore */ }
    });
}

/** Perform an authenticated HTTPS GET that returns the full body as a string. */
function httpsGet(url: string, token: string, accept: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent":    "fcs-vscode",
                "Authorization": `Bearer ${token}`,
                "Accept":        accept,
            },
        };

        const req = https.get(url, options, (res: IncomingMessage) => {
            // Follow a single redirect (GitHub asset downloads use 302 → S3)
            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                httpsGet(res.headers.location, token, accept).then(resolve).catch(reject);
                return;
            }

            let body = "";
            res.on("data", (chunk: Buffer) => (body += chunk.toString()));
            res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        });

        req.on("error", reject);
        req.end();
    });
}

/** Download a binary asset into `destPath` using the GitHub API asset endpoint. */
function downloadBinary(assetApiUrl: string, token: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                "User-Agent":    "fcs-vscode",
                "Authorization": `Bearer ${token}`,
                "Accept":        "application/octet-stream",
            },
        };

        function follow(url: string): void {
            https.get(url, options, (res: IncomingMessage) => {
                if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                    follow(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed with HTTP ${res.statusCode}`));
                    return;
                }
                const file = fs.createWriteStream(destPath);
                res.pipe(file);
                file.on("finish", () => file.close(() => resolve()));
                file.on("error", (err) => { fs.unlink(destPath, () => undefined); reject(err); });
            }).on("error", reject);
        }

        follow(assetApiUrl);
    });
}

/** Extract a zip file using PowerShell's Expand-Archive (Windows built-in). */
function extractZip(zipPath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // -Force overwrites existing files; no external tools needed
        const cmd = `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force"`;
        exec(cmd, (err) => {
            if (err) { reject(err); } else { resolve(); }
        });
    });
}

/** Compare two dot-separated version strings (e.g. "1.9.0" vs "1.8.11"). */
function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) { return diff; }
    }
    return 0;
}

/**
 * Read flivs-info.json from the extract directory and show a warning
 * if the current extension version is older than minExtensionVersion.
 */
function checkExtensionCompatibility(extractDir: string, context: vscode.ExtensionContext): void {
    const infoPath = path.join(extractDir, FLIVS_INFO_FILENAME);
    if (!fs.existsSync(infoPath)) { return; }

    let info: FlivsInfo;
    try {
        const raw = fs.readFileSync(infoPath, "utf-8").replace(/^\uFEFF/, "");
        info = JSON.parse(raw) as FlivsInfo;
    } catch (e) {
        console.warn(`FCS Apps: failed to parse ${FLIVS_INFO_FILENAME}: ${e}`);
        return;
    }

    if (!info.minExtensionVersion) { return; }

    const current = context.extension.packageJSON.version as string;
    if (compareVersions(current, info.minExtensionVersion) < 0) {
        vscode.window.showWarningMessage(
            `FCS Apps requires extension version ${info.minExtensionVersion} or newer ` +
            `(you have ${current}). Please update the extension.`,
            "Update Extension"
        ).then((choice) => {
            if (choice === "Update Extension") {
                vscode.commands.executeCommand("workbench.extensions.action.checkForUpdates");
            }
        });
    }
}

/** Fetch a specific release by tag, or the latest release if tag is undefined. */
async function fetchRelease(token: string, tag?: string): Promise<GitHubRelease | undefined> {
    const url = tag
        ? `https://api.github.com/repos/${PRIVATE_REPO_OWNER}/${PRIVATE_REPO_NAME}/releases/tags/${tag}`
        : `https://api.github.com/repos/${PRIVATE_REPO_OWNER}/${PRIVATE_REPO_NAME}/releases/latest`;
    const resp = await httpsGet(url, token, "application/vnd.github+json").catch(() => null);
    if (!resp || resp.status !== 200) { return undefined; }
    try { return JSON.parse(resp.body) as GitHubRelease; } catch { return undefined; }
}

/** List all release tag names from the private repository. */
async function fetchAllTags(token: string): Promise<string[]> {
    const url = `https://api.github.com/repos/${PRIVATE_REPO_OWNER}/${PRIVATE_REPO_NAME}/releases?per_page=50`;
    const resp = await httpsGet(url, token, "application/vnd.github+json").catch(() => null);
    if (!resp || resp.status !== 200) { return []; }
    try {
        const releases = JSON.parse(resp.body) as GitHubRelease[];
        return releases.map((r) => r.tag_name);
    } catch { return []; }
}

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * Returns the path to a named executable from flivs cache.
 * Checks localOverridePath setting first (for development), then the GitHub cache.
 * Does NOT check whether the file actually exists — caller must verify.
 */
export function getFlivsExePath(context: vscode.ExtensionContext, exeName: string): string {
    const config = vscode.workspace.getConfiguration("fcs-vscode");
    const overrideDir = config.get<string>("localOverridePath", "");
    if (overrideDir) {
        const candidate = path.join(overrideDir, exeName);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return path.join(context.globalStorageUri.fsPath, EXTRACT_DIR, exeName);
}

/**
 * Schedule a silent hourly background update check.
 * Only fires if the user is already signed in to GitHub — no login prompt.
 * Registers the timer in context.subscriptions so it’s disposed on deactivation.
 *
 * @param onUpdated  Optional callback invoked when a new version was downloaded.
 *                   Use this to restart the language server or notify the user.
 */
export function scheduleBackgroundUpdates(
    context: vscode.ExtensionContext,
    onUpdated?: () => Promise<void>
): void {
    const timer = setInterval(async () => {
        try {
            await resolveServerPathFromGitHub(context, false, onUpdated);
        } catch (e) {
            console.error("FCS Apps: background update check failed.", e);
        }
    }, BACKGROUND_CHECK_INTERVAL_MS);

    context.subscriptions.push({ dispose: () => clearInterval(timer) });
}
/**
 * Try to obtain the path to the language-server binary via GitHub.
 *
 * Returns `undefined` when:
 *  - the user refuses to sign in, or
 *  - the user has no read access to the private repository, or
 *  - the download fails.
 *
 * The caller should treat `undefined` as "no server available" and fall back
 * to the regex-based providers (same behaviour as when flils.exe is absent).
 */
export async function resolveServerPathFromGitHub(
    context: vscode.ExtensionContext,
    promptForLogin = true,
    onUpdated?: () => Promise<void>,
    suppressPinnedWarning = false
): Promise<string | undefined> {

    // 1. Determine cache paths (no auth needed)
    const storageDir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }

    // If a previous update extracted to staging but the atomic swap failed (e.g. due
    // to another VS Code window holding flils.exe), try to complete it now before
    // doing anything else — this avoids a redundant re-download.
    const stagingTagPath = path.join(storageDir, STAGING_TAG_FILE);
    if (fs.existsSync(path.join(storageDir, STAGING_DIR)) && fs.existsSync(stagingTagPath)) {
        try {
            atomicSwap(storageDir);
            const resumedTag = fs.readFileSync(stagingTagPath, "utf-8").trim();
            fs.writeFileSync(path.join(storageDir, CACHED_TAG_FILE), resumedTag, "utf-8");
            fs.writeFileSync(path.join(storageDir, LAST_CHECK_FILE), String(Date.now()), "utf-8");
            try { fs.unlinkSync(stagingTagPath); } catch { /* ignore */ }
        } catch {
            // Still locked — cleanupStaleDirs will remove staging on next start
        }
    }

    // Clean up leftover staging/old dirs from any previously crashed update
    cleanupStaleDirs(storageDir);

    const extractDir       = path.join(storageDir, EXTRACT_DIR);
    const stagingDir       = path.join(storageDir, STAGING_DIR);
    const cachedBinaryPath = path.join(extractDir, EXE_IN_ZIP);
    const cachedTagPath    = path.join(storageDir, CACHED_TAG_FILE);
    const lastCheckPath    = path.join(storageDir, LAST_CHECK_FILE);
    const pinnedTagPath    = path.join(storageDir, PINNED_TAG_FILE);

    const pinnedTag = fs.existsSync(pinnedTagPath) ? fs.readFileSync(pinnedTagPath, "utf-8").trim() : "";
    const cachedTag = fs.existsSync(cachedTagPath) ? fs.readFileSync(cachedTagPath, "utf-8").trim() : "";
    const lastCheck      = fs.existsSync(lastCheckPath) ? Number(fs.readFileSync(lastCheckPath, "utf-8").trim()) : 0;
    const sinceLastCheck = Date.now() - lastCheck;

    // Fast path: binary is cached and the version check was done recently — skip GitHub API.
    // Always skipped when promptForLogin=false (background timer handles its own cadence).
    if (promptForLogin && fs.existsSync(cachedBinaryPath) && sinceLastCheck < CHECK_INTERVAL_MS) {
        checkExtensionCompatibility(extractDir, context);
        return cachedBinaryPath;
    }

    // 2. Authenticate with GitHub
    let session: vscode.AuthenticationSession | undefined = undefined;
    try {
        session = await vscode.authentication.getSession(
            "github",
            ["repo"],
            { createIfNone: promptForLogin, silent: !promptForLogin }
        );
    } catch {
        // User dismissed the login dialog — use cached binary if available
    }

    if (!session) {
        return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
    }

    const token = session.accessToken;

    // 3. Check repository access
    const repoUrl = `https://api.github.com/repos/${PRIVATE_REPO_OWNER}/${PRIVATE_REPO_NAME}`;
    const repoResp = await httpsGet(repoUrl, token, "application/vnd.github+json").catch(() => null);
    if (!repoResp || repoResp.status !== 200) {
        if (promptForLogin) {
            vscode.window.showWarningMessage(
                `FCS Apps: GitHub account '${session.account.label}' does not have access ` +
                `to ${PRIVATE_REPO_OWNER}/${PRIVATE_REPO_NAME}. Advanced features are disabled.`
            );
        }
        return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
    }

    // 4. Fetch target release (pinned or latest)
    const targetRelease = await fetchRelease(token, pinnedTag || undefined);
    if (!targetRelease) {
        return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
    }

    const asset = targetRelease.assets.find((a) => a.name === ASSET_NAME);
    if (!asset) {
        return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
    }

    // 6. If pinned, warn when a newer release exists (skip when user just selected the version)
    if (pinnedTag && !suppressPinnedWarning) {
        const latestRelease = await fetchRelease(token);
        if (latestRelease && latestRelease.tag_name !== pinnedTag) {
            const publishedAt = new Date(targetRelease.published_at).toLocaleDateString();
            vscode.window.showWarningMessage(
                `FCS Apps: you are using pinned version ${pinnedTag} (released ${publishedAt}). ` +
                `A newer version ${latestRelease.tag_name} is available.`,
                "Switch to latest"
            ).then((choice) => {
                if (choice === "Switch to latest") {
                    fs.unlinkSync(pinnedTagPath);
                }
            });
        }
    }

    // 7. Re-use cache if the binary is already up to date (tag matches)
    if (cachedTag === targetRelease.tag_name && fs.existsSync(cachedBinaryPath)) {
        fs.writeFileSync(lastCheckPath, String(Date.now()), "utf-8");
        checkExtensionCompatibility(extractDir, context);
        return cachedBinaryPath;
    }

    // 8. Acquire update lock — only one VS Code window performs the download at a time.
    //    If another window is already updating, return the current cache and let the
    //    other window finish. On the next check the new version will be present.
    if (!acquireLock(storageDir)) {
        console.log("FCS Apps: update already in progress in another window, using cached binary.");
        return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
    }

    // 9. Download zip → extract to staging → atomic swap (rename-based, safe for running exes)
    const zipPath = path.join(storageDir, ASSET_NAME);
    let downloadSucceeded = false;
    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `FCS Apps: downloading ${targetRelease.tag_name}…`,
                cancellable: false,
            },
            async () => {
                // Ensure staging dir is empty before extraction
                if (fs.existsSync(stagingDir)) {
                    fs.rmSync(stagingDir, { recursive: true, force: true });
                }

                await downloadBinary(asset.url, token, zipPath);

                // Extract into staging — never touches the live flivs/ directory
                await extractZip(zipPath, stagingDir);
                fs.unlink(zipPath, () => undefined);

                // Record the version so staging can be resumed after a failed swap
                fs.writeFileSync(path.join(storageDir, STAGING_TAG_FILE), targetRelease.tag_name, "utf-8");

                // Atomic swap: flivs/ → flivs-old/, flivs-staging/ → flivs/
                // Retry with back-off: on Windows another VS Code window may hold
                // flils.exe open, which prevents the rename until it releases the handle.
                let swapped = false;
                for (let attempt = 1; attempt <= 6; attempt++) {
                    try { atomicSwap(storageDir); swapped = true; break; }
                    catch { if (attempt < 6) { await new Promise(r => setTimeout(r, attempt * 400)); } }
                }
                if (!swapped) {
                    vscode.window.showErrorMessage(
                        "FCS Apps: could not replace the installation — " +
                        "the files are locked by VS Code window. " +
                        "Close all VS Code windows."
                    );
                    return; // leave flivs-staging/ intact so the next attempt can retry
                }

                fs.writeFileSync(cachedTagPath, targetRelease.tag_name, "utf-8");
                fs.writeFileSync(lastCheckPath, String(Date.now()), "utf-8");
                try { fs.unlinkSync(path.join(storageDir, STAGING_TAG_FILE)); } catch { /* ignore */ }
                checkExtensionCompatibility(extractDir, context);

                downloadSucceeded = true;
                // NOTE: onUpdated is intentionally NOT called here so the progress
                // notification closes immediately after the download finishes.
            }
        );
    } finally {
        // Always release the lock, even if an error occurred mid-download
        releaseLock(storageDir);
        // Clean up any leftover zip if download/extraction failed
        if (fs.existsSync(zipPath)) { fs.unlink(zipPath, () => undefined); }
    }

    // Notify caller after the spinner has already closed.
    if (downloadSucceeded && onUpdated) {
        await onUpdated();
    }

    return fs.existsSync(cachedBinaryPath) ? cachedBinaryPath : undefined;
}

/**
 * Command: Let the user pick a specific release version to pin, or clear the pin.
 * Shows a QuickPick with all available release tags + "Latest version" option.
 */
export async function selectServerVersionCommand(
    context: vscode.ExtensionContext,
    onUpdated: () => Promise<void>,
    stopServer?: () => Promise<void>
): Promise<void> {

    let session: vscode.AuthenticationSession;
    try {
        session = await vscode.authentication.getSession("github", ["repo"], { createIfNone: true });
    } catch {
        vscode.window.showErrorMessage("FCS Apps: GitHub sign-in is required to select a version.");
        return;
    }

    const token = session.accessToken;
    const storageDir    = context.globalStorageUri.fsPath;
    const pinnedTagPath = path.join(storageDir, PINNED_TAG_FILE);
    const currentPin    = fs.existsSync(pinnedTagPath) ? fs.readFileSync(pinnedTagPath, "utf-8").trim() : "";

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "FCS Apps: fetching version list…", cancellable: false },
        async () => { /* zobrazí spinner během fetchAllTags */ }
    );

    const tags = await fetchAllTags(token);
    if (tags.length === 0) {
        vscode.window.showErrorMessage("FCS Apps: failed to fetch version list.");
        return;
    }

    const LATEST_LABEL = "$(rocket) Latest version (automatic)";

    const items: vscode.QuickPickItem[] = [
        {
            label: LATEST_LABEL,
            description: currentPin ? "" : "$(check) currently selected",
        },
        ...tags.map((tag) => ({
            label: `$(tag) ${tag}`,
            description: tag === currentPin ? "$(check) currently selected" : "",
        })),
    ];

    const picked = await vscode.window.showQuickPick(items, {
        title: "FCS Apps – select version",
        placeHolder: currentPin ? `Currently pinned: ${currentPin}` : "Currently: latest version",
    });

    if (!picked) { return; }

    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }

    const selectedTag = picked.label === LATEST_LABEL
        ? ""
        : picked.label.replace("$(tag) ", "");

    // Bail out early if the user picked the same version that is already active.
    if (selectedTag === currentPin) { return; }

    if (selectedTag === "") {
        if (fs.existsSync(pinnedTagPath)) { fs.unlinkSync(pinnedTagPath); }
    } else {
        fs.writeFileSync(pinnedTagPath, selectedTag, "utf-8");
    }

    // Clear only the throttle file so resolveServerPathFromGitHub bypasses the
    // 1-hour check and downloads immediately. CACHED_TAG_FILE is intentionally
    // preserved: if the subsequent atomic swap fails, the old installed version
    // is still tagged correctly and the status bar doesn't show "not installed".
    const lastCheckPath = path.join(storageDir, LAST_CHECK_FILE);
    if (fs.existsSync(lastCheckPath)) { try { fs.unlinkSync(lastCheckPath); } catch { /* ignore */ } }

    // Stop the language server before swapping the flivs directory so that
    // flils.exe is not held open during the rename and the atomic swap succeeds.
    await stopServer?.();

    await resolveServerPathFromGitHub(context, true, onUpdated, true);
}

/**
 * Command: Force an immediate GitHub version check, bypassing the 1-hour
 * throttle. Shows a message when already up to date.
 */
export async function checkForUpdatesCommand(
    context: vscode.ExtensionContext,
    onUpdated: () => Promise<void>
): Promise<void> {
    const storageDir    = context.globalStorageUri.fsPath;
    const lastCheckPath = path.join(storageDir, LAST_CHECK_FILE);

    // Remove throttle file so the next call always hits the GitHub API
    if (fs.existsSync(lastCheckPath)) { fs.unlinkSync(lastCheckPath); }

    const before = getCachedFlivsTag(context);
    await resolveServerPathFromGitHub(context, true, onUpdated);
    const after = getCachedFlivsTag(context);

    if (after && after === before) {
        vscode.window.showInformationMessage(`FCS Apps: already up to date (${after}).`);
    }
}

/** Try to delete a path (file or directory), retrying with back-off while it stays locked. */
async function deleteWithRetry(target: string, isDir: boolean, maxAttempts = 6): Promise<boolean> {
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            if (isDir) {
                fs.rmSync(target, { recursive: true, force: true });
            } else {
                fs.unlinkSync(target);
            }
            return true;
        } catch {
            if (i < maxAttempts) {
                // Back-off: 300 ms, 600 ms, 900 ms, 1200 ms, 1500 ms
                await new Promise(r => setTimeout(r, i * 300));
            }
        }
    }
    return false;
}

/**
 * Command: Force re-download of the language-server binary for the currently
 * active version (pinned or latest). Clears the cache and runs the full
 * download flow so the user gets a fresh copy immediately.
 *
 * @param stopServer          Stop the running language server.
 * @param startServer         Download the latest version and start the server.
 * @param restartFromCache    Start the server from whatever binary is already on disk
 *                            (used when deletion failed and we can't download).
 */
export async function redownloadServerCommand(
    context: vscode.ExtensionContext,
    stopServer: () => Promise<void>,
    startServer: () => Promise<void>,
    restartFromCache: () => Promise<void>
): Promise<void> {

    const storageDir = context.globalStorageUri.fsPath;

    // Stop the language server in this window BEFORE touching the files it holds open.
    await stopServer();

    // Delete the extracted flivs directory and all cache/state files so that
    // the subsequent startServer triggers a full fresh download.
    // The pinned-tag file is intentionally preserved so the user keeps their
    // version selection.
    // Use retries with back-off: flils.exe may still hold file handles for a
    // brief moment after stopServer() returns.
    let anyFailed = false;
    for (const name of [EXTRACT_DIR, STAGING_DIR, OLD_DIR]) {
        const dir = path.join(storageDir, name);
        if (fs.existsSync(dir) && !await deleteWithRetry(dir, true)) {
            anyFailed = true;
        }
    }
    for (const file of [CACHED_TAG_FILE, LAST_CHECK_FILE, LOCK_FILE, ASSET_NAME]) {
        const filePath = path.join(storageDir, file);
        if (fs.existsSync(filePath) && !await deleteWithRetry(filePath, false)) {
            anyFailed = true;
        }
    }

    if (anyFailed) {
        vscode.window.showErrorMessage(
            "FCS Apps: some installation files could not be deleted — " +
            "they may be locked by another VS Code window. " +
            "Close all other VS Code windows that use FCS and try again.",
            "Reload Window"
        ).then(choice => {
            if (choice === "Reload Window") {
                vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
        });
        // Restart the server from whatever binary is still on disk.
        // Do NOT attempt a download — atomicSwap would fail with the same EPERM.
        await restartFromCache();
        return;
    }

    try {
        await startServer();
        vscode.window.showInformationMessage("FCS Apps: re-download complete.");
    } catch (err) {
        vscode.window.showErrorMessage(`FCS Apps: re-download failed. ${err}`);
    }
}
