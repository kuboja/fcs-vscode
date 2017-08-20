# FemCAD Script

FemCAD Script language support for Visual Studio Code. 

## Features

- Syntax highlighting
- File symbols provider ( Ctrl+Shift+O )
- Fcs command runner (F5)

## Requirements

- Localy "instaled" not-packaged femcad with `fli.exe`.

## Extension Settings

This extension contributes the following settings:

- `kuboja-fcs.femcadFolder`: full path do Femcad folder, must be set for Code runner
- `kuboja-fcs.saveAllFilesBeforeRun`: enable/disable save all files before run
- `kuboja-fcs.saveFileBeforeRun`: enable/disable save current file before run
- and many others...

## Release Notes

### 1.1.0-alfa

The new main feature of this version is fcs comman runner. You can start task with F5 key or click on button Run in Editor menu or in Context menu in text. For stop running task use option Stop from command menu in Output window.

### 1.0.4

Update syntax highlighting (numbers, buildin function, != operator, latex syntax in string).

### 1.0.3

Update syntax highlighting.

### 1.0.0

Initial release of femcad extension for visual studio code. Added support for Syntax highlighting and file symbols provider.
