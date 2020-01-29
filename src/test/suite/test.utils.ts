import * as fs from "fs";
import { parseRawGrammar, Registry, ITokenizeLineResult } from "vscode-textmate";

async function readFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (error, data) => error ? reject(error) : resolve(data));
  });
}

const registry = new Registry({
  loadGrammar: async (scopeName: string) => {
    if (scopeName === "source.fcs") {
      let data = await readFile(__dirname + "../../../../syntaxes/fcs.tmLanguage.json");
      let grammar = parseRawGrammar(data, __dirname + "../../../../syntaxes/fcs.tmLanguage.json");
      return grammar;
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