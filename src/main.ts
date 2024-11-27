import { App, Plugin, PluginSettingTab, Setting, TFile, Vault } from "obsidian";
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
		await this.app.vault.append(file, content);
	}

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", async (file) => {
					if (file instanceof TFile) {
						const templatePath = this.settings.matchers.find(
							(matcher) => matcher.matches(file),
						)?.templatePath;

						if (templatePath) {
							const template =
								this.app.vault.getFileByPath(templatePath);

							if (!template) {
								console.error(
									`Template ${templatePath} not found`,
								);
								return;
							}

							const templateContent =
								await this.app.vault.read(template);
							await this.writeToFile(file, templateContent);
						}
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

	While in

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

		new Setting(containerEl)
			.setName("Template Folder Location")
			.setDesc("Files in this folder will be used as templates")
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
			.setName("Matchers")
			.setDesc(
				`A matcher is a rule that determines which template to apply to a note.
				Notes that are created with the prefix will be populated with the selected template automatically.`,
			)
			.setHeading()
			.addButton((text) =>
				text.setButtonText("Add").onClick(async () => {
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

			setting.addDropdown((dropdown) =>
				dropdown
					.addOption("prefix", "Prefix")
					.addOption("suffix", "Suffix")
					.addOption("contains", "Contains")
					.setValue(matcher.matchMethod)
					.onChange(async (value) => {
						this.plugin.settings.matchers[index].matchMethod =
							value;
						await this.plugin.saveSettings();
					}),
			);

			setting.addText((text) =>
				text
					.setPlaceholder("Match String, e.g. 'Meeting'")
					.setValue(matcher.matchString)
					.onChange(async (value) => {
						this.plugin.settings.matchers[index].matchString =
							value;
						await this.plugin.saveSettings();
					}),
			);

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
					text.setButtonText("Delete").onClick(async () => {
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
				"When an existing note's name is changed to a matching template, prepend the matching template to the note's content.",
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
