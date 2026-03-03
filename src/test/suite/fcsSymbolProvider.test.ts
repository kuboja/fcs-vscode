import * as assert from "assert";
import * as vscode from "vscode";
import { FcsSymbolProvider } from "../../fcsSymbolUtil";

// ---------------------------------------------------------------------------
// Minimal TextDocument mock — only the parts getSymbolsInDocument uses
// ---------------------------------------------------------------------------
function makeDoc(lines: string[]): vscode.TextDocument {
    return {
        lineCount: lines.length,
        lineAt: (i: number) => ({ text: lines[i] } as vscode.TextLine),
        uri: vscode.Uri.parse("file:///test.fcs"),
    } as vscode.TextDocument;
}

// Helper: assert exactly one symbol with expected name and kind
function assertSymbol(
    lines: string[],
    expectedName: string,
    expectedKind: vscode.SymbolKind,
    label: string
): void {
    const doc = makeDoc(lines);
    const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
    assert.strictEqual(symbols.length, 1, `${label}: expected 1 symbol, got ${symbols.length}`);
    assert.strictEqual(symbols[0].name, expectedName, `${label}: name`);
    assert.strictEqual(symbols[0].kind, expectedKind, `${label}: kind`);
}

// ---------------------------------------------------------------------------
suite("FcsSymbolProvider - keyword {name} patterns", () => {

    // --- original keywords ---------------------------------------------------

    test("gclass {name}", () => {
        assertSymbol(
            ['gclass {MyClass} filename "MyClass.fcs"'],
            "MyClass", vscode.SymbolKind.Class, "gclass"
        );
    });

    test("gblock {name}", () => {
        assertSymbol(
            ['gblock {AnalysisBlock} gclass (AnalysisClass) lcs (GCS)'],
            "AnalysisBlock", vscode.SymbolKind.Object, "gblock"
        );
    });

    // --- new keywords --------------------------------------------------------

    const keywordCases: [string, string, vscode.SymbolKind][] = [
        ['material {steelS350} rho 7850 alpha 1.2E-05 lambda 40 c 440 linear E (210.0e9) ni 0.3 metadata {esaName:="GSI_S350"} ', "steelS350", vscode.SymbolKind.Object],
        ['thickness {t1} material {Material} t (slabThickness)', "t1", vscode.SymbolKind.Object],
        ['traction {pnlStraightT1} sections { gbInner, gbOuter } layer (res.layers.hopperPanel)', "pnlStraightT1", vscode.SymbolKind.Object],
        ['area {ar1} boundary curve {f2} {f3} {f7} {f5} layer (Layer) styles [ ViewStyle ]', "ar1", vscode.SymbolKind.Object],
        ['curve {f1} vertex {b1} {b2}', "f1", vscode.SymbolKind.Object],
        ['vertex {b4}   xyz prtLen  topWidth/2 0', "b4", vscode.SymbolKind.Object],
        ['layer {layerArea} color (Argb( 50, 255,255,255 ))', "layerArea", vscode.SymbolKind.Object],
        ['volume {volume} prism (fcsArea1Checked) (fcsArea2Checked) layer (solidLayer)', "volume", vscode.SymbolKind.Object],
        ['distribution {dashLine} gclass {line} lcs (Lcs) transformation translation direction {dir[0], dir[1], dir[2]} repetitions count (repetition) spacings (spacing) specialization ithparameters {Layer}', "dashLine", vscode.SymbolKind.Object],
        ['beam {b1} type Frame curve {c1} xsection {cCss} alignment (Alignment) eccentricity { Eccentricity.X, Eccentricity.Y, Eccentricity.Z } lcsRx (0) lcsMirrorZ (LcsMirrorZ) lcsMirrorY (LcsMirrorY) cssMirrorY (CssMirrorY) layer (Layer) styles [ViewStyle] metadata (Metadata)', "b1", vscode.SymbolKind.Object],
        ['cross_section {cCss} geometry_class {gcRectangle}', "cCss", vscode.SymbolKind.Object],
        ['pointlcs {plcsL1} origin {v1} matrix (1/Sin(PI/2)) (1/Sin(-PI/2)) 0 0 0 1 0 (-1) 0', "plcsL1", vscode.SymbolKind.Object],
        ['lcs {plcsL1} origin {v1} matrix (1/Sin(PI/2)) (1/Sin(-PI/2)) 0 0 0 1 0 (-1) 0', "plcsL1", vscode.SymbolKind.Object],
        ['curvelcs {cl1} curve {c1} lcs (LcsStart) (LcsEnd)', "cl1", vscode.SymbolKind.Object],
        ['planestress {ps1} area {geometry.ar1} section {Section} layer (Layer)', "ps1", vscode.SymbolKind.Object],
        ['shell {ps1} area {geometry.ar1} section {Section} layer (Layer)', "ps1", vscode.SymbolKind.Object],
        ['load {vl1} case (LoadCase) curve {c1} linear Fx Fy Fz Mx My Mz Fx2 Fy2 Fz2 Mx2 My2 Mz2', "vl1", vscode.SymbolKind.Object],
        ['support {fcsSupport} vertex {v1} 0 0 0 0 0 0 fixed (supportCondition) ', "fcsSupport", vscode.SymbolKind.Object],
        ['mesharea {ma1} mesh_type Quadrilateral', "ma1", vscode.SymbolKind.Object],
        ['meshcurve {mc1} ...', "mc1", vscode.SymbolKind.Object],
        ['meshvertex {mv1} ...', "mv1", vscode.SymbolKind.Object],
    ];

    for (const [line, expectedName, expectedKind] of keywordCases) {
        const keyword = line.split(" ")[0];
        test(`${keyword} {name}`, () => {
            assertSymbol([line], expectedName, expectedKind, keyword);
        });
    }

    // --- all keywords covered by keywordKinds --------------------------------

    test("all keywords in keywordKinds have at least one test case", () => {
        const testedKeywords = new Set(keywordCases.map(([line]) => line.split(" ")[0]));
        testedKeywords.add("gclass");
        testedKeywords.add("gblock");

        const missing: string[] = [];
        for (const [keyword] of FcsSymbolProvider.keywordKinds) {
            if (!testedKeywords.has(keyword)) {
                missing.push(keyword);
            }
        }
        assert.deepStrictEqual(missing, [], `Keywords without test case: ${missing.join(", ")}`);
    });

    // --- edge cases ----------------------------------------------------------

    test("variable definition is not confused with keyword", () => {
        const doc = makeDoc(["myVar := 42"]);
        const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, "myVar");
        assert.strictEqual(symbols[0].kind, vscode.SymbolKind.Variable);
    });

    test("function definition detected correctly", () => {
        const doc = makeDoc(["myFn := x, y => x + y"]);
        const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, "myFn");
        assert.strictEqual(symbols[0].kind, vscode.SymbolKind.Function);
    });

    test("comment line is skipped", () => {
        const doc = makeDoc(["# material {matName} filename \"mat.fcs\""]);
        const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
        assert.strictEqual(symbols.length, 0);
    });

    test("keyword without braces produces no symbol", () => {
        const doc = makeDoc(["material filename \"mat.fcs\""]);
        const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
        assert.strictEqual(symbols.length, 0);
    });

    test("multiple symbols in document", () => {
        const doc = makeDoc([
            'material {steel} filename "steel.fcs"',
            'beam {b1} filename "b1.fcs"',
            "myVar := 10",
        ]);
        const symbols = FcsSymbolProvider.getSymbolsInDocument(doc);
        assert.strictEqual(symbols.length, 3);
        assert.strictEqual(symbols[0].name, "steel");
        assert.strictEqual(symbols[1].name, "b1");
        assert.strictEqual(symbols[2].name, "myVar");
    });
});
