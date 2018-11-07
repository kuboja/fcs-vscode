//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { WordTools } from '../src/fcsCompletionItemProvider';
import { Brackets } from '../src/fcsSymbolUtil';
//import * as myExtension from '../src/extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    // Defines a Mocha unit test
    test("Something 1", () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    test("DocumentWord", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asdasda"});
        assert.equal(doc.getText(), "asdasda");
    })

    test("Bracket find close", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asd asd{saasd{asdasd}dasd}sddfas"});
        let position = WordTools.findClosingBracket(doc, 0, 6, Brackets.CurlyBracket);
        assert.equal(position ? position.character : undefined, 25);

        position = WordTools.findClosingBracket(doc, 2, 6, Brackets.CurlyBracket);
        assert.equal(position ? position.line : undefined, undefined, "number line is out of limit");

        position = WordTools.findClosingBracket(doc, 0, 50, Brackets.CurlyBracket);
        assert.equal(position ? position.character : undefined, undefined, "end character is out of limit");

        doc = await vscode.workspace.openTextDocument({content: "asd asd{saa\nsd{asd\nasd}dasd}sddfas"});
        position = WordTools.findClosingBracket(doc, 0, 7, Brackets.CurlyBracket);
        assert.equal(position ? position.line : undefined, 2, "2nd: line");
        assert.equal(position ? position.character : undefined, 8, "2nd: end character");

        position = WordTools.findClosingBracket(doc, 1, 2, Brackets.CurlyBracket);
        assert.equal(position ? position.line : undefined, 2, "3rd: line");
        assert.equal(position ? position.character : undefined, 3, "3rd: end character");
    })

    test("Bracket find open", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asd asd{saasd{asdasd}dasd}sddfas"});
        let position = WordTools.findStaringBracket(doc, 0, 25, Brackets.CurlyBracket);
        assert.equal(position ? position.character : undefined, 7, "1st: start character");

        position = WordTools.findStaringBracket(doc, 2, 6, Brackets.CurlyBracket);
        assert.equal(position ? position.character : undefined, undefined, "number line is out of limit");

        position = WordTools.findStaringBracket(doc, 0, 50, Brackets.CurlyBracket);
        assert.equal(position ? position.character : undefined, undefined, "start character is out of limit");

        doc = await vscode.workspace.openTextDocument({content: "asd asd{saa\nsd{asd\nasd}dasd}sddfas"});
        position = WordTools.findStaringBracket(doc, 2, 8, Brackets.CurlyBracket);
        assert.equal(position ? position.line : undefined, 0, "2nd: line");
        assert.equal(position ? position.character : undefined, 7, "2nd: start character");

        position = WordTools.findStaringBracket(doc, 2, 3, Brackets.CurlyBracket);
        assert.equal(position ? position.line : undefined, 1, "3rd: line");
        assert.equal(position ? position.character : undefined, 2, "3rd: start character");
    })

    test("Position of expresion start", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asd asd{saa\nsd{asd\nasd}dasd}sddfas"});
        let position = WordTools.getWordStartPosition(doc, 2, 6);
        assert.equal(position ? position.line : undefined, 1, "1st: start line");
        assert.equal(position ? position.character : undefined, 0, "1st: start character");
       
        doc = await vscode.workspace.openTextDocument({content: "asd := ads{ \n saa := [1,2,3], \n a := sd{asd,\nasd }, \ndasd}.sddfas"});
        position = WordTools.getWordStartPosition(doc, 4, 8);
        assert.equal(position ? position.line : undefined, 0, "2st: start line");
        assert.equal(position ? position.character : undefined, 7, "2st: start character");
    })

    test("Position of expresion end", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asd asd{saa\nsd{asd\nasd}dasd}sddfas"});
        let position = WordTools.getWordEndPosition(doc, 0, 4);
        assert.equal(position ? position.line : undefined, 2, "1st: end line");
        assert.equal(position ? position.character : undefined, 14, "1st: end character");
       
        doc = await vscode.workspace.openTextDocument({content: "asd := ads{ \n saa := [1,2,3], \n a := sd{asd,\nasd }, \ndasd}.sddfas + 1"});
        position = WordTools.getWordEndPosition(doc, 0, 8);
        assert.equal(position ? position.line : undefined, 4, "2st: end line");
        assert.equal(position ? position.character : undefined, 11, "2st: end character");
    })




    test("Word under cursor", async () => {
        let doc = await vscode.workspace.openTextDocument({content: "asdasda Fcs.Ahoj.Test"});
        let pos = new vscode.Position(0, 10);

        let word = WordTools.lookWordStart(doc, pos);

        assert.equal(word, undefined);
    })
});