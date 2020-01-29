import * as assert from "assert";
import { suite, test } from "mocha";
import { getTokenOnCharRange, hasScope, tokenizeLine } from "./test.utils";

import * as vscode from "vscode";

suite("Extension Test Suite", () => {

    test("Sample test", () => {


        assert.equal([1, 2, 3].indexOf(5), -1);
        assert.equal([1, 2, 3].indexOf(0), -1);

    });

    test("test string quoted", async () => {
        // arrange
        const scope = "string.quoted.double.fcs";

        // act
        const lineToken = await tokenizeLine(`"test"`);
        
        // assert
        const token = getTokenOnCharRange(lineToken, 1, 5);
        assert.ok(hasScope(token?.scopes, scope));
    });
});