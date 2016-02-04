// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/**
 * Logging utility class.
 */

import {OutputChannel} from "vscode";

export class Log {

    private static TAG: string = "[vscode-react-native]";
    private static formatStringForOutputChannel(message: string) {
        return  "######### " + message + " ##########";
    }

    public static appendStringToOutputChannel(message: string, outputChannel: OutputChannel) {
        outputChannel.appendLine(Log.formatStringForOutputChannel(message));
        outputChannel.show();
    }

    public static commandStarted(command: string, outputChannel?: OutputChannel) {
        Log.logMessage(`Executing command: ${command}`, outputChannel);
    }

    public static commandEnded(command: string, outputChannel?: OutputChannel) {
        Log.logMessage(`Finished executing: ${command}\n`);
    }

    public static commandFailed(command: string, error: any, outputChannel?: OutputChannel) {
        Log.logError(`Error while executing: ${command}`, error, outputChannel);
    }

    /**
     * Logs a message to the console.
     */
    public static logMessage(message: string, outputChannel?: OutputChannel) {
        let messageToLog = outputChannel ? message : `${Log.TAG} ${message}`;

        if (outputChannel) {
            Log.appendStringToOutputChannel(messageToLog, outputChannel);
        } else {
            console.log(messageToLog);
        }

    }

    /**
     * Logs an error message to the console.
     */
    public static logError(message: string, error?: any, outputChannel?: OutputChannel, logStack = true) {
        let errorMessageToLog = outputChannel ? `${message} ${Log.getErrorMessage(error)}` : `${Log.TAG} ${message} ${Log.getErrorMessage(error)}`;

        if (outputChannel) {
            Log.appendStringToOutputChannel(errorMessageToLog, outputChannel);
        } else {
            console.error(errorMessageToLog);
        }

        // We will not need the stack trace when logging to the OutputChannel in VS Code
        if (!outputChannel && logStack && error && (<Error>error).stack) {
            console.error(`Stack: ${(<Error>error).stack}`);
        }
    }

    /**
     * Gets the message of an error, if any. Otherwise it returns the empty string.
     */
    public static getErrorMessage(e: Error): string {
        return e && e.message || e && e.toString() || "";
    }
}