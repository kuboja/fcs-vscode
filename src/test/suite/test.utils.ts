import * as fs from "fs";
import * as path from "path";
import { parseRawGrammar, Registry, ITokenizeLineResult } from "vscode-textmate";
import { loadWASM, createOnigScanner, createOnigString } from "vscode-oniguruma";

async function readFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (error, data) => error ? reject(error) : resolve(data));
  });
}

async function readFileBuffer(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, data) => error ? reject(error) : resolve(data));
  });
}

const onigLibPromise = (async () => {
  const wasmPath = path.join(require.resolve("vscode-oniguruma"), "../onig.wasm");
  const wasmBin = await readFileBuffer(wasmPath);
  await loadWASM(wasmBin.buffer as ArrayBuffer);
  return { createOnigScanner, createOnigString };
})();

const registry = new Registry({
  onigLib: onigLibPromise,
  loadGrammar: async (scopeName: string) => {
    if (scopeName === "source.fcs") {
      const grammarPath = path.resolve(__dirname, "../../../syntaxes/fcs.tmLanguage.json");
      const data = await readFile(grammarPath);
      return parseRawGrammar(data, grammarPath);
    }
    return null;
  },
});

export async function tokenizeLine(line: string) {

  const grammar = await registry.loadGrammar("source.fcs");
  if (grammar) {
    return grammar.tokenizeLine(line, null);
  }
}

export function getTokenOnCharRange(
  lineToken: ITokenizeLineResult | undefined,
  startIndex: number,
  endIndex: number) {
  if (!lineToken) { return null; }
  const tokens = lineToken.tokens.filter((token) => token.startIndex === startIndex && token.endIndex === endIndex);
  return tokens.length === 1 ? tokens[0] : null;
}

export function hasScope(scopes: string[] | undefined | null, scope: string) {
  if (!scopes) { return false; }
  const foundScopes = scopes.filter((s) => s === scope);
  return foundScopes.length === 1;
}

export function writeOut(lineToken: ITokenizeLineResult, text: string) {
  for (const lt of lineToken.tokens) {
    // tslint:disable-next-line:no-console
    console.log(`${lt.startIndex} - ${lt.endIndex} => ${text.substring(lt.startIndex, lt.endIndex)}`);
    for (const s of lt.scopes) {
      // tslint:disable-next-line:no-console
      console.log(`- ${s}`);
    }
  }
}