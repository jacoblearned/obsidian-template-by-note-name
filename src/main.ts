import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Vault,
	Platform,
	normalizePath,
} from "obsidian";
import Matcher from "./matcher";

/**
 * TemplateByNoteNameSettings represents the user-provided settings for the plugin.
 */
export interface TemplateByNoteNameSettings {
	/** Path to folder from vault root where user stores their templates */
	templateFolder: string;

	/** Whether to apply a template to a note when it is renamed to match a rule */
	templateOnRename: boolean;

	/** Whether to match note names against user-provided rule match strings in a case-sensitive manner */
	caseSensitive: boolean;

	/** Collection of user-provided matching rules to determine which template to apply to a new or renamed note */
	matchers: Matcher[];
}

const DEFAULT_SETTINGS: TemplateByNoteNameSettings = {
	templateFolder: "Templates",
	templateOnRename: true,
	caseSensitive: true,
	matchers: [],
};

/**
 * TemplateByNoteNamePlugin is the main class that handles the plugin's lifecycle.
 * @extends Plugin
 */
export default class TemplateByNoteNamePlugin extends Plugin {
	/**  Collection of user-provided settings values set in plugin settings tab  */
	settings: TemplateByNoteNameSettings;

	/**
	 * Write the given content to the provided file.
	 * @param file The Obsidian file object representing an existing note
	 * @param content The content to write to the note, overwriting the existing content
	 */
	async writeToFile(file: TFile, content: string) {
		await this.app.vault.modify(file, content);
	}

	/**
	 * Find the first Matcher instance in the user-provided settings that matches the given file.
	 * @param file The Obsidian file object representing an existing note
	 * @returns The first Matcher whose rule matches the file, or undefined if no match is found
	 */
	findMatcherForFile(file: TFile): Matcher | undefined {
		return this.settings.matchers.find((matcher) =>
			matcher.matches(file.basename, this.settings.caseSensitive),
		);
	}

	/**
	 * Get the content of the template note at the provided path.
	 * @param templatePath Full path to a template note from the vault root
	 * @returns The content of the template file
	 */
	async getTemplateContent(templatePath: string): Promise<string> {
		const template = this.app.vault.getFileByPath(templatePath);

		if (!template) {
			console.error(`Template ${templatePath} not found`);
			return "";
		}

		const templateContent = await this.app.vault.read(template);
		return templateContent;
	}

	/**
	 * Apply a template to a new note if the note name matches a user-provided rule.
	 * @param file The Obsidian file object representing the newly created note
	 */
	async templateOnCreate(file: TFile) {
		const templatePath = this.findMatcherForFile(file)?.templatePath;

		if (templatePath) {
			const templateContent = await this.getTemplateContent(templatePath);
			await this.writeToFile(file, templateContent);
		}
	}

	/**
	 * Apply a template to a renamed note if the new name matches a user-provided rule.
	 * @param file The Obsidian file object representing the renamed note
	 * @param oldName The full path to the note from the vault root before it was renamed
	 */
	async templateOnRename(file: TFile, oldName: string) {
		const matcher = this.findMatcherForFile(file);

		if (matcher) {
			const templatePath = matcher.templatePath;
			if (!this.settings.templateOnRename) {
				return;
			}

			/* We only want to prepend the template content if the note was renamed to match a rule
			and the oldName does not match the rule the note now matches.
			This prevents the template content from being prepended multiple times on subsequent renames.

			oldName is the full path to the note from the vault root, e.g. "Path/To/Note.md"
			*/
			const oldBaseName = oldName.split("/").pop()?.slice(0, -3) ?? "";
			if (matcher.matches(oldBaseName, this.settings.caseSensitive)) {
				return;
			}

			const templateContent = await this.getTemplateContent(templatePath);
			const fileContent = await this.app.vault.read(file);

			if (this.settings.templateOnRename) {
				await this.writeToFile(
					file,
					`${templateContent}\n\n${fileContent}`,
				);
			}
		}
	}

	/**
	 * Load the plugin's user-provided settings and register event listeners.
	 */
	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", async (file) => {
					if (file instanceof TFile) {
						await this.templateOnCreate(file);
					}
				}),
			);

			this.registerEvent(
				this.app.vault.on("rename", async (file, oldName) => {
					if (file instanceof TFile) {
						await this.templateOnRename(file, oldName);
					}
				}),
			);
		});

		// Adds tab for Template by Note Name under
		// Settings -> Community plugins -> Template by Note Name
		this.addSettingTab(new TemplateByNoteNameSettingTab(this.app, this));
	}

	/**
	 * Load the plugin's current user-provided settings on top of the default settings.
	 */
	async loadSettings() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	/**
	 * Save the plugin's current settings to disk
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* Obsidian advertises that onunload() is async, but it is not.
	See 'Anatomy of a Plugin' in the Obsidian API documentation.
	https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin

	The first code snippet in that doc contains the following:
		async onunload() {
    		// Release any resources configured by the plugin.
  		}

	While it isn't ideal to disable no-misused-promises, it is necessary
	in this case because we need to ensure that we delete all matchers
	when the user disables the plugin. Without clearing the matchers,
	the plugin will fail if a user re-enables it and tries to create a note
	that matches a rule that was previously set.
	*/

	/**
	 * Clear all matchers when the plugin is disabled.
	 */
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async onunload() {
		this.settings.matchers = [];
		await this.saveSettings();
	}
}

/**
 * TemplateByNoteNameSettingTab represents the view for the user-specific plugin settings
 * like the template folder location and matching rules.
 * @extends PluginSettingTab
 */
class TemplateByNoteNameSettingTab extends PluginSettingTab {
	/** Plugin instance */
	plugin: TemplateByNoteNamePlugin;

	/**
	 * Create a new TemplateByNoteNameSettingTab.
	 * @param app The Obsidian application instance
	 * @param plugin The plugin instance
	 */
	constructor(app: App, plugin: TemplateByNoteNamePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Create the HTML elements for the settings tab.
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.addClass("template-by-note-name-settings");

		new Setting(containerEl)
			.setName("Template folder location")
			.setDesc(
				"Notes in this folder and any subfolders will be available as templates",
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates")
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder =
							normalizePath(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Matching rules")
			.setDesc(
				`A matching rule determines which template to apply to a note based on its title at creation time.
				If a portion of the note's title matches the rule, the template specified by the rule will be applied to the note.
				Only one template can be applied to a note.`,
			)
			.setHeading()
			.addButton((text) =>
				text
					.setButtonText("Add")
					.setClass("template-by-note-name-add-matcher-button")
					.setIcon("plus")
					.onClick(async () => {
						this.plugin.settings.matchers.push(
							new Matcher("", "", "prefix"),
						);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		// Ensure we always display at least one empty matcher
		// if user deletes attempts to delete all of them
		if (this.plugin.settings.matchers.length === 0) {
			this.plugin.settings.matchers.push(new Matcher("", "", "prefix"));
		}

		this.plugin.settings.matchers.forEach((matcher, index) => {
			const setting = new Setting(containerEl);

			if (!Platform.isMobile) {
				setting.controlEl.appendText("If note name");
			}

			setting.setClass("template-by-note-name-matcher-row");
			setting.addDropdown((dropdown) =>
				dropdown
					.addOption("prefix", "starts with")
					.addOption("contains", "contains")
					.addOption("suffix", "ends with")
					.setValue(matcher.matchMethod)
					.onChange(async (value) => {
						this.plugin.settings.matchers[index].matchMethod =
							value;
						await this.plugin.saveSettings();
					}),
			);

			setting.addText((text) =>
				text
					.setPlaceholder("e.g. 'TODO'")
					.setValue(matcher.matchString)
					.onChange(async (value) => {
						this.plugin.settings.matchers[index].matchString =
							value;
						await this.plugin.saveSettings();
					}),
			);

			if (!Platform.isMobile) {
				setting.controlEl.appendText("use template");
			}

			setting
				.addDropdown((dropdown) => {
					const templateFolder =
						this.plugin.app.vault.getFolderByPath(
							this.plugin.settings.templateFolder,
						);

					if (!templateFolder) {
						console.error(
							`Template folder ${this.plugin.settings.templateFolder} not found`,
						);
						return;
					}

					Vault.recurseChildren(templateFolder, (file) => {
						if (file instanceof TFile) {
							dropdown.addOption(file.path, file.basename);
						}
					});

					dropdown
						.setValue(matcher.templatePath)
						.onChange(async (value) => {
							this.plugin.settings.matchers[index].templatePath =
								value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((text) =>
					text
						.setButtonText("Delete")
						.setClass("delete-button")
						.setIcon("minus")
						.onClick(async () => {
							this.plugin.settings.matchers.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);
		});

		new Setting(containerEl).setName("Advanced").setHeading();

		new Setting(containerEl)
			.setName("Template on rename")
			.setDesc(
				"When an existing note's name is changed to one that matches a rule, the plugin will prepend the rule's template to the note's content.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.templateOnRename)
					.onChange(async (value) => {
						this.plugin.settings.templateOnRename = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Case-Sensitive matching")
			.setDesc(
				"When disabled, note names will be matched against rules in a case-insensitive manner, e.g. 'todo' will match 'TODO'.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.caseSensitive)
					.onChange(async (value) => {
						this.plugin.settings.caseSensitive = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
