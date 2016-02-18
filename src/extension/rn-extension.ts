// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {FileSystem} from "../common/node/fileSystem";
import * as path from "path";
import * as vscode from "vscode";
import {CommandPaletteHandler} from "./commandPaletteHandler";
import {ReactNativeProjectHelper} from "../common/reactNativeProjectHelper";
import {ReactDirManager} from "./reactDirManager";
import {IntellisenseHelper} from "./IntellisenseHelper";
import {Telemetry} from "../common/telemetry";


export function activate(context: vscode.ExtensionContext): void {
    // Asynchronously enable telemetry
    Telemetry.init("react-native", require("../../package.json").version, true)
        .then(() => {
            const reactNativeProjectHelper = new ReactNativeProjectHelper(vscode.workspace.rootPath);
            return reactNativeProjectHelper.isReactNativeProject()
                .then(isRNProject => {
                    if (isRNProject) {
                        setupReactNativeDebugger();
                        IntellisenseHelper.setupReactNativeIntellisense();
                        context.subscriptions.push(new ReactDirManager());
                    }
                }).then(() => {
                    const commandPaletteHandler = new CommandPaletteHandler(vscode.workspace.rootPath);

                    // Register React Native commands
                    context.subscriptions.push(vscode.commands.registerCommand("reactNative.runAndroid",
                        () => commandPaletteHandler.runAndroid()));
                    context.subscriptions.push(vscode.commands.registerCommand("reactNative.runIos",
                        () => commandPaletteHandler.runIos()));
                    context.subscriptions.push(vscode.commands.registerCommand("reactNative.startPackager",
                        () => commandPaletteHandler.startPackager()));
                    context.subscriptions.push(vscode.commands.registerCommand("reactNative.stopPackager",
                        () => commandPaletteHandler.stopPackager()));

                    const nodeDebugPath = vscode.extensions.getExtension("andreweinand.node-debug").extensionPath;
                    const fsUtil = new FileSystem();
                    fsUtil.writeFile(path.resolve(__dirname, "../", "debugger", "nodeDebugLocation.json"), JSON.stringify({ nodeDebugPath })).done();
                });
        }).done();
}

/**
 * Sets up the debugger for the React Native project by dropping
 * the debugger stub into the workspace
 */
function setupReactNativeDebugger(): void {
    const launcherPath = require.resolve("../debugger/launcher");
    const pkg = require("../../package.json");
    const extensionVersionNumber = pkg.version;
    const extensionName = pkg.name;

    let debuggerEntryCode =
        `// This file is automatically generated by ${extensionName}@${extensionVersionNumber}
// Please do not modify it manually. All changes will be lost.
try {
    var path = require("path");
    var Launcher = require(${JSON.stringify(launcherPath)}).Launcher;
    new Launcher(path.resolve(__dirname, "..")).launch();
} catch (e) {
    throw new Error("Unable to launch application. Try deleting .vscode/launchReactNative.js and restarting vscode.");
}`;

    const vscodeFolder = path.join(vscode.workspace.rootPath, ".vscode");
    const debugStub = path.join(vscodeFolder, "launchReactNative.js");
    const fsUtil = new FileSystem();

    fsUtil.ensureDirectory(vscodeFolder)
        .then(() => fsUtil.ensureFileWithContents(debugStub, debuggerEntryCode))
        .catch((err: Error) => {
            vscode.window.showErrorMessage(err.message);
        });
}
