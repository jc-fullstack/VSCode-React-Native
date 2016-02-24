// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import * as Q from "q";

import {Log} from "../../common/log";
import {ChildProcess} from "../../common/node/childProcess";
import {CommandExecutor} from "../../common/commandExecutor";
import {IAppPlatform} from "../platformResolver";
import {Compiler} from "./compiler";
import {DeviceDeployer} from "./deviceDeployer";
import {DeviceRunner} from "./deviceRunner";
import {IRunOptions} from "../launchArgs";
import {PlistBuddy} from "../../common/ios/plistBuddy";
import {IOSDebugModeManager} from "../../common/ios/iOSDebugModeManager";

export class IOSPlatform implements IAppPlatform {
    private static deviceString = "device";
    private static simulatorString = "simulator";

    private plistBuddy = new PlistBuddy();

    private projectPath: string;
    private simulatorTarget: string;
    private isSimulator: boolean;

    public runApp(launchArgs: IRunOptions): Q.Promise<void> {
        // Compile, deploy, and launch the app on either a simulator or a device
        this.consumeArguments(launchArgs);

        if (this.isSimulator) {
            // React native supports running on the iOS simulator from the command line
            let runArguments: string[] = [];
            if (this.simulatorTarget.toLowerCase() !== IOSPlatform.simulatorString) {
                runArguments.push("--simulator");
                runArguments.push(this.simulatorTarget);
            }

            const runIos = new CommandExecutor(this.projectPath).spawnReactCommand("run-ios", runArguments);
            const deferred = Q.defer<void>();
            runIos.on("error", (err: Error) => {
                deferred.reject(err);
            });
            runIos.stderr.on("data", (data: Buffer) => {
                const dataString = data.toString();
                if (dataString.indexOf("No devices are booted") !== -1 // No emulators are started
                    || dataString.indexOf("FBSOpenApplicationErrorDomain") !== -1) { // The incorrect emulator is started
                    deferred.reject(new Error("Unable to launch iOS simulator. Try specifying a different target."));
                }
            });
            runIos.on("exit", (code: number) => {
                if (code !== 0) {
                    const err = new Error(`Command failed with exit code ${code}`);
                    Log.commandFailed(["react-native", "run-ios"].concat(runArguments).join(" "), err);
                    deferred.reject(err);
                } else {
                    deferred.resolve(void 0);
                }
            });
            return deferred.promise;
        }

        return new Compiler(this.projectPath).compile().then(() => {
            return new DeviceDeployer(this.projectPath).deploy();
        }).then(() => {
            return new DeviceRunner(this.projectPath).run();
        });
    }

    public enableJSDebuggingMode(launchArgs: IRunOptions): Q.Promise<void> {
        // Configure the app for debugging
        this.consumeArguments(launchArgs);

        if (this.simulatorTarget.toLowerCase() === IOSPlatform.deviceString) {
            // Note that currently we cannot automatically switch the device into debug mode.
            Log.logMessage("Application is running on a device, please shake device and select 'Debug in Chrome' to enable debugging.");
            return Q.resolve<void>(void 0);
        }

        const iosDebugModeManager = new IOSDebugModeManager(this.projectPath);

        // Wait until the configuration file exists, and check to see if debugging is enabled
        return Q.all([
            iosDebugModeManager.getSimulatorJSDebuggingModeSetting(),
            this.plistBuddy.getBundleId(launchArgs.projectRoot)
        ]).spread((debugModeSetting: string, bundleId: string) => {
            if (debugModeSetting !== IOSDebugModeManager.WEBSOCKET_EXECUTOR_NAME) {
                // Debugging must still be enabled
                const commandExecutor = new CommandExecutor();
                const childProcess = new ChildProcess();
                const launchAppString = `xcrun simctl launch booted ${bundleId}`;
                // simctl launch returns the process ID of the app in the simulator
                return childProcess.exec(launchAppString).outcome.then((buffer: Buffer) => {
                    // Kill the simulated app
                    const pidMatch = buffer.toString().match(/: ([0-9]+)/);
                    const pid = pidMatch[1];
                    return commandExecutor.execute(`kill ${pid} # Restarting app`);
                }).then(() => {
                    // Give the process some time to exit
                    return Q.delay(1000);
                }).then(() => {
                    // Write to the settings file while the app is not running to avoid races
                    return iosDebugModeManager.setSimulatorJSDebuggingModeSetting(/*enable=*/ true);
                }).then(() => {
                    // Relaunch the app
                    return this.runApp(launchArgs);
                });
            }
        });
    }

    private consumeArguments(launchArgs: IRunOptions): void {
        this.projectPath = launchArgs.projectRoot;
        this.simulatorTarget = launchArgs.target || IOSPlatform.simulatorString;
        this.isSimulator = this.simulatorTarget.toLowerCase() !== IOSPlatform.deviceString;
    }
}
