// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

interface TestUsingRecording {
    (expectation: string, recordingNames: string[], assertion?: () => void): Mocha.ITest;
    (expectation: string, recordingNames: string[], assertion?: (done: MochaDone) => void): Mocha.ITest;
    only(expectation: string, recordingNames: string[], assertion?: () => void): Mocha.ITest;
    only(expectation: string, recordingNames: string[], assertion?: (done: MochaDone) => void): Mocha.ITest;
    skip(expectation: string, recordingNames: string[], assertion?: () => void): void;
    skip(expectation: string, recordingNames: string[], assertion?: (done: MochaDone) => void): void;
}

export interface IRecordingConsumer {
    loadRecordingFromName(recordingName: string): Q.Promise<void>;
}

/* This class makes it easy to create a test using a recording. Recommended usage is:
     const testWithRecordings = new RecordingsHelper(() => recordingConsumer).test;
     testWithRecordings("expects to do some test thing",
    [
        "path/to/recording",
        "path/to/recording"
    ], () => {
        // test code here
    });
*/
export class RecordingsHelper {
    public test: TestUsingRecording;

    constructor(private getRecordingConsumer: () => IRecordingConsumer) {
        this.initializeTest();
    }

    private initializeTest(): void {
        this.test = <TestUsingRecording>((testName: string, recordingNames: string[], code: () => Q.Promise<void>): void => {
            recordingNames.forEach(recordingName => {
                test(`${testName} using recording ${recordingName}`, () => {
                    return this.getRecordingConsumer().loadRecordingFromName(recordingName).then(code);
                });
            });
        });
        this.test.skip = (expectation: string, recordingNames: string[], assertion?: (done: MochaDone) => void) => {
            test.skip(expectation, assertion);
        };
    }
}