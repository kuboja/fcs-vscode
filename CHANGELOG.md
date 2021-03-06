# Changelog

## [1.7.0] - 2020-03-27

### Added
- Support for Web Model Viewer. (Right Click in opened fcs file in editor and select "Open in Viewer". You mush have installed supported fliw.)

## [1.6.0] - 2019-10-04

### Added
- New test explorer. Tests are loaded from *.tests.json files in root directory.

## [1.5.0] - 2019-06-03

### Added
- New interactive tree.

## [1.4.5] - 2019-04-04

### Added
- New beam hinge api.

## [1.4.0] - 2018-10-25

### Added
- Add firts version of definition provider - only for navigation in document.

### Change
- Add gclass and gblock to symbol provider.
- Add new steelib grammar.

## [1.3.4] - 2018-08-01

### Change
- Fixes. Speed improvement of symbols provider.

## [1.3.3] - 2018-07-24

### Change
- Packages updated.

## [1.3.2] - 2018-03-11

### Change
- Add better support for reporting.
- Add command #image for creating image.
- Fix/add some code proposals.
- Add progress in status bar.

## [1.3.1] - 2018-03-11

### Change
- Fix rerun fli in terminal.
- Fix some syntax highlighting.
- Fix/add some code proposals.


## [1.3.0] - 2018-01-12

### Added
- Show code completion proposals for builtin FemCAD functions, properties and other objects.

### Change
- Fixed file saving when you run command Open in Terminal.



## [1.2.0] - 2017-12-10

### Added
- Add command for open fcs files in a terminal. (Right Click in editor -> Open in terminal).

### Change
- Fix text output and fli runner.



## [1.1.4] - 2017-12-04

### Change
- Fix saving before run.

## [1.1.3] - 2017-11-27

### Added
- Script line runner. Set a path to the FemCAD instaltion folder in the settings file. 
- Keybinding for run code to F5 key.
- Add Run button for start task to a editor top menu and to a editor conetex menu.
- Add Stop buttom to context menu of Output window.
- Add default setting for fcs languages.

### Change
- Syntax highlighting of all fcs-json-like files to vs code JSON syntax.

### Removed
- C# runner.
- Fcs-json-like syntax.



## [1.0.4] - 2017-07-29

### Added
- Support for latex highlighting in string.
- Add != oprator hightlighting.

### Change
- Fix strings, numbers, and buildin functions syntax matcher.



## [1.0.3] - 2017-07-12

### Added
- Support for highlighting of Aggregate function.

### Change
- Change syntax highlighting of dot functions and lambda function parameters.
- Many syntax speed optimalizations.



## [1.0.0] - 2017-07-09
### Added
- Syntax highlighting.
- File symbol provider.
