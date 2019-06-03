# FemCAD Script

FemCAD Script language support for Visual Studio Code. More information about [FemCAD](http://www.femcad.com).

## Features

- Syntax highlighting
- File symbols provider (Ctrl+Shift+O)
- Fcs command runner (F5)
- Open .fcs files in FemCAD or VS Code Terminal
- Show code completion proposals for builtin FemCAD functions, properties and other "objects".

## Requirements

- Localy "instaled" not-packaged femcad with `fli.exe`.

## Extension Settings

This extension contributes the following settings:

- `fcs-vscode.femcadFolder`: full path do Femcad folder, must be set for Code runner
- `fcs-vscode.saveAllFilesBeforeRun`: enable/disable save all files before run
- `fcs-vscode.saveFileBeforeRun`: enable/disable save current file before run
- and many others settings...

## Release Notes

### 1.5.x
The main new feature is interactive tree.

### 1.4.x
New feature is goto symbol definition.

### 1.3.x
New feature is show code completion proposals for builtin FemCAD functions, properties and other objects.

### 1.2.x
New feature is commmad for opening fcs file in VS Code Terminal (Right Click in editor -> Open in terminal).

### 1.1.x
The new main feature of this version is an fcs command runner. You can start a task with the F5 key or click on button Run in Editor menu or context menu of text editor. For stop running task use option Stop from command menu in the Output window. You can open an fcs file in FemCAD via the command in the context menu of text editor.

### 1.0.x
Initial release of femcad extension for visual studio code. Added support for Syntax highlighting and file symbols provider.
