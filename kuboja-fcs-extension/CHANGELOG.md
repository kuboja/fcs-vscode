# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0-alfa] - 2017-08

### Added
- Script line runner. Set a path to the FemCAD instaltion folder in the settings file. 
- Keybinding for run code to F5 key.
- Add Run button for start task to a editor top menu and to a editor conetex menu.
- Add Stop buttom to context menu of Output window.
- Add default setting for fcs languages.

### Change
- Syntax highlighting of all fcs-json-like files to vs code JSON syntax.

## Removed
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