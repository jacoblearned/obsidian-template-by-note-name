# Template by Note Name

<a href="https://www.buymeacoffee.com/jacoblearned" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

This is a simple [Obsidian](https://obsidian.md/) plugin to automatically template notes
based on their name when created or renamed. Users can template notes that match
their desired naming conventions with any template that exists in their
specified templates folder (including sub-folders).

Examples:

- Create notes that start with `Meeting` with the content of `Templates/meeting.md`
- Create notes that end with `Task` with the content of `Templates/task.md`
- Create notes that contain `Idea` with the content of `Templates/idea.md`

## Features

- **Quicker templating**: Automatically template notes based on their name at creation time
- **Customizable**: Users can create rules to template notes based on their personal naming conventions
- **Multiple match options**: Choose from prefix, suffix, or contains to template notes
- **Optionally template on rename**: Choose whether or not to template notes when they are renamed
  If a note is renamed to a matching template, the template content will be prepended to the existing note.
- **Case sensitivity options**: Choose whether or not to match note names against rules in a case-sensitive manner

## Installation

You can install the plugin via the Community Plugins tab within Obsidian or by [direct link here](https://obsidian.md/plugins?id=template-by-note-name).

## Zettelkasten Inspiration

While the plugin supports general usage beyond [Zettelkasten](https://en.wikipedia.org/wiki/Zettelkasten),
my primary motivation for building the plugin was quicker templating of notes in a Zettelkasten system.

In Zettelkasten, notes are generally one of three types: reference notes, literature notes, or permanent notes
(although many variations exist based on personal preference).

- **Reference notes** contain information that is useful for reference, such as direct quotes from a source
- **Literature notes** contain concise summaries in your own words a key point or idea made in a reference note's source.
- **Permanent notes** contain fully-worked original thoughts or ideas inspired by one or more literature notes.

To manage these, I prefix each note type with a different color emoji for easy visual identification within Obsidian:
🟦 for reference notes, 🟨 for literature notes, and 🟩 for permanent notes.

I then have a template for each note type in my `Templates` folder, for example `Templates/reference_note.md`:

```txt
---
type: Note
tags:
  - reference-note
  - inbox
date:
source:
author(s):
reviewed: false
---
**Summary**:

**Highlights**:
```

Using the plugin, it's simple to create new Zettelkasten notes that are already populated
with the Obsidian page properties I like to include for each note type.

![alt text](assets/Zettelkasten.png)

## Settings

![Plugin Settings](assets/PluginSettingsScreenshot.png)
