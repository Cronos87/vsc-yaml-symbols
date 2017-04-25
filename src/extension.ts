'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml'

/**
 * Regex used to extract upper levels keys
 */
const keyRegex: RegExp = /^[a-zA-Z_\\]+/;

/**
 * Regex used to extract spaced keys
 */
const keySpaceRegex: RegExp = /^[\s]+[a-zA-Z_]+/;

/**
 * Regex used to count the number of spaces
 * in front of a key
 */
const spaceRegex: RegExp = /\S|$/;

interface Key {
    value: string,
    indentation: number
}

/**
 * YAMLDocumentSymbolProvider
 */
class YAMLDocumentSymbolProvider {
    analyze(contentLines) {
        let key: Key;
        let composedKey: Key[] = [];
        let data: { key: string, range: vscode.Range }[] = [];
        let line: string;
        let previousSpaceLength: number = 0;

        contentLines.forEach((line, index) => {
            // Continue to the next line of it's an empty line
            if (line.trim().length === 0) {
                return;
            }

            if (keyRegex.test(line)) {
                key = {
                    value: line.match(keyRegex)[0],
                    indentation: 0
                }

                // Reset the previous key with the new key as it's a new block
                composedKey = [key];

                // Reset previous space length to 0
                previousSpaceLength = 0;
            } else if (keySpaceRegex.test(line)) {
                // Find the key position compared to the previous indented one
                const nbSpaces = line.search(spaceRegex);

                key = {
                    value: line.trim().match(keyRegex)[0],
                    indentation: nbSpaces
                }

                if (nbSpaces > previousSpaceLength) {
                    composedKey.push(key);
                } else if (nbSpaces === previousSpaceLength) {
                    composedKey.splice(-1, 1, key);
                } else {
                    composedKey.forEach((element, index) => {
                        if (element.indentation === nbSpaces) {
                            composedKey.splice(index);
                            composedKey.push(key);

                            return false;
                        }
                    });
                }

                previousSpaceLength = nbSpaces;
            } else {
                return;
            }

            // Find the range
            const positionStart = line.search(/[a-zA-Z_]+/);
            const positionEnd = positionStart + key.value.length;

            data.push({
                key: Array.from(composedKey, element => element.value).join('.'),
                range: new vscode.Range(new vscode.Position(index, positionStart), new vscode.Position(index, positionEnd))
            })
        });

        return data;
    }

    provideDocumentSymbols(document, token) {
        const contentLines = fs.readFileSync(document.fileName, 'utf8').trim().split('\n');

        const keys = this.analyze(contentLines);

        let symbols = [];

        for (let key of keys) {
            symbols.push(new vscode.SymbolInformation(key.key, vscode.SymbolKind.Key, key.range));
        }

        return symbols;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "yaml-symbols" is now active!');

    const selector: vscode.DocumentSelector = {
        language: 'yaml'
    }

    let disposable = vscode.languages.registerDocumentSymbolProvider(selector, new YAMLDocumentSymbolProvider());

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
