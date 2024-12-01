import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Vault,
	Platform,
} from "obsidian";
import Matcher from "./matcher";

interface TemplateByNoteNameSettings {
	templateFolder: string;
	templateOnRename: boolean;
	matchers: Matcher[];
}

const DEFAULT_SETTINGS: TemplateByNoteNameSettings = {
	templateFolder: "Templates",
	templateOnRename: false,
	matchers: [],
};

export default class TemplateByNoteNamePlugin extends Plugin {
	settings: TemplateByNoteNameSettings;

	async logFileContent(file: TFile) {
		console.log(await this.app.vault.read(file));
	}

	async writeToFile(file: TFile, content: string) {
		await this.app.vault.modify(file, content);
	}

	findMatcherForFile(file: TFile): Matcher | undefined {
		return this.settings.matchers.find((matcher) =>
			matcher.matches(file.basename),
		);
	}

	async getTemplateContent(templatePath: string): Promise<string> {
		const template = this.app.vault.getFileByPath(templatePath);

		if (!template) {
			console.error(`Template ${templatePath} not found`);
			return "";
		}

		const templateContent = await this.app.vault.read(template);
		return templateContent;
	}

	async templateOnCreate(file: TFile) {
		const templatePath = this.findMatcherForFile(file)?.templatePath;

		if (templatePath) {
			const templateContent = await this.getTemplateContent(templatePath);
			await this.writeToFile(file, templateContent);
		}
	}

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
			const oldBaseName = oldName.split("/").pop()?.slice(0, -3);
			if (matcher.matches(oldBaseName ?? "")) {
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

	async loadSettings() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/* Obsidian advertises that onunload is async, but it is not.
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

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async onunload() {
		this.settings.matchers = [];
		await this.saveSettings();
	}
}

class TemplateByNoteNameSettingTab extends PluginSettingTab {
	plugin: TemplateByNoteNamePlugin;

	constructor(app: App, plugin: TemplateByNoteNamePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Template by Note Name" });

		new Setting(containerEl)
			.setName("Template Folder Location")
			.setDesc(
				"Notes in this folder and any subfolders will be available as templates",
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates")
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Matching Rules")
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
		// if user deletes all of them
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
			.setName("Template on Rename")
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
	}
}
