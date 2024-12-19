# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2024-12-19

### Fixed

- Sets "template on rename" setting to be disabled by default.
  Prophylactic measure to prevent potential issues with template rules being applied to notes that are renamed when undesired.
  See https://github.com/jacoblearned/obsidian-template-by-note-name/issues/57

## [1.1.1] - 2024-12-15

### Fixed

- Removes the need to clear template rules at plugin unload events by persisting match rules in a simpler way.
  User template rules are now preserved across plugin updates and disable/enable events.

## [1.1.0] - 2024-12-14

### Added

- Added date and time expression evaluation support (https://github.com/jacoblearned/obsidian-template-by-note-name/issues/52).
- Added settings for date and time formats to evaluate in templates.

## [1.0.0] - 2024-12-13

### Added

- Initial release supporting the following:
    - Templating new notes automatically when created if they match a user-provided templating rule
    - Allowing users to customize the templates folder they want to use
    - Supporting prefix, suffix, and generic substring matching in user-provided templating rules
    - Supporting templating on note rename if the note is changed to a matching rule
    - Support for optional case-insensitive matching
