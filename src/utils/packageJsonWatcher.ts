// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as fs from "fs";
import * as path from "path";
import * as Q from "q";
import * as vscode from "vscode";

import {TsConfigHelper} from "../utils/tsconfigHelper";
import {TsdHelper} from "../utils/tsdHelper";
import {FileSystem} from "../utils/node/fileSystem";


export class PackageJsonWatcher {
    private fileSystemWatcher: vscode.FileSystemWatcher;
    constructor() {
        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher("package.json");
    }

    public startWatching(): void {
        this.fileSystemWatcher.onDidChange((changeEvent: vscode.Uri) => this.configureReactNativeWorkspace());
        this.fileSystemWatcher.onDidCreate((changeEvent: vscode.Uri) => this.configureReactNativeWorkspace());
        this.configureReactNativeWorkspace();
    }

    private dropDebuggerStub(): void {
        let launcherPath = require.resolve("../debugger/launcher");
        const extensionVersionNumber = require("../../package.json").version;
        let debuggerEntryCode =
`// This file is automatically generated. version:${extensionVersionNumber}
try {
    var path = require("path");
    var Launcher = require(${JSON.stringify(launcherPath)}).Launcher;
    new Launcher(path.resolve(__dirname, "..")).launch();
} catch (e) {
    throw new Error("Unable to launch application. Try deleting .vscode/launchReactNative.js and restarting vscode.");
}`;
        let vscodeFolder = path.join(vscode.workspace.rootPath, ".vscode");
        let debugStub = path.join(vscodeFolder, "launchReactNative.js");

        let fsUtil = new FileSystem();

        fsUtil.ensureDirectory(vscodeFolder).then(() => {
            fsUtil.ensureFileWithContents(debugStub, debuggerEntryCode);
        }).catch((err: Error) => {
            vscode.window.showErrorMessage(err.message);
        });
    }

    private configureReactNativeWorkspace(): void {
        let packageJsonPath = path.join(vscode.workspace.rootPath, "package.json");
        Q.nfcall(fs.readFile, packageJsonPath, "utf-8").then((contents: string) => {
            let packageJsonContents = JSON.parse(contents);
            if (packageJsonContents && packageJsonContents.dependencies
                && "react-native" in packageJsonContents.dependencies) {
                // Looks like a react native project: Set it up for debugging
                this.dropDebuggerStub();

                // Enable JavaScript intellisense through Salsa language service
                TsConfigHelper.compileJavaScript(true);

                var fileSystem:FileSystem = new FileSystem();

                var reactTypeDefsPath = path.resolve(__dirname, "..", "..", "reactTypings.json");
                var reactTypeDefs:any = {};
                var typeDefsToInstall:string[] = [];

                if (fileSystem.existsSync(reactTypeDefsPath)) {
                    reactTypeDefs = require(reactTypeDefsPath);
                    typeDefsToInstall = reactTypeDefs.map(function(listing:{id:string, typingFile:string}){ return listing.typingFile });
                }

                // Add typings for React and React Native
                TsdHelper.installTypings(fileSystem.getOrCreateTypingsTargetPath(vscode.workspace.rootPath),typeDefsToInstall);
            }
        }).catch(() => {});
        // If the readFile fails, or the JSON.parse fails, then we ignore the exception
        // and assume this is not a react-native project.
    }
}