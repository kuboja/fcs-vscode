# FemCAD Script

FemCAD Script language support for Visual Studio Code. More information about [FemCAD](http://www.femcad.com).


## Features

- Syntax highlighting
- File symbols provider (Ctrl+Shift+O)
- Fcs command runner (F5)
- Open .fcs files in FemCAD or VS Code Terminal
- Show code completion proposals for builtin FemCAD functions, properties and other "objects".
- Interaction tree
- Tests explorer

### Command runner
You can start a task with the F5 key or click on button Run in Editor menu or context menu of text editor. For stop running task use button Close in fli runner dialog. You can open an fcs file in FemCAD via the command in the context menu of text editor.

### Test explorer
Tests are loaded from *.tests.json files in root directory. Example of definition: (file: `silo.tests.json`):
```
[
  {
    "name": "Test Silo Main - Quick",
    "filePath": "Gsi_StorageSystems\\Silo_Round\\Geometry\\_Tests\\TestSiloMain.fcs",
    "tests": [
      {
        "name": "Volume Tests",
        "path": "VolumeTestSuite"
      },
      "CapacityTestSuite",
      "ComodityTestSuite"
    ]
  },
  {
    "name": "Test Silo Main - Slow",
    "filePath": "Gsi_StorageSystems\\Silo_Round\\Geometry\\_Tests\\TestSiloMain.fcs",
    "tests": [
      "DesignTestSuite",
    ]
  }
]
```

## Requirements

- Localy "instaled" not-packaged femcad with `fli.exe` or `fliw.exe`.
- Access to shared folder with flivs.


## Extension Settings

This extension contributes the following settings:

- `fcs-vscode.femcadFolder`: full path do Femcad folder, must be set for Code runner
- `fcs-vscode.saveAllFilesBeforeRun`: enable/disable save all files before run
- `fcs-vscode.saveFileBeforeRun`: enable/disable save current file before run
- and many others settings...


## Release Notes - main new features

- 1.7 - Model viewer
- 1.6 - Test explorer
- 1.5 - Interactive tree
- 1.4 - Goto symbol definition.
- 1.3 - Code completion proposals for builtin FemCAD functions, properties and other objects.
- 1.2 - Commmad for opening fcs file in VS Code Terminal (Right Click in editor -> Open in terminal).
- 1.1 - Fcs command runner. 
- 1.0 - Syntax highlighting and file symbols provider.
