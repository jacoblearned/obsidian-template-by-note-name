import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

class Matcher {
	prefix: string;
	templatePath: string;

	constructor(prefix: string, template: string) {
		this.prefix = prefix;
		this.templatePath = template;
	}
}

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
							(matcher) =>
								file.basename.startsWith(matcher.prefix),
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
			.setHeading()
			.addButton((text) =>
				text.setButtonText("Add").onClick(async () => {
					this.plugin.settings.matchers.push(new Matcher("", ""));
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		// Ensure we have the empty matcher in order to display the help message
		// in the first matcher element name and description.
		if (this.plugin.settings.matchers.length === 0) {
			this.plugin.settings.matchers.push(new Matcher("", ""));
		}

		this.plugin.settings.matchers.forEach((matcher, index) => {
			const setting = new Setting(containerEl);

			if (index === 0) {
				setting.setName("Template by note prefix");
				setting.setDesc(
					`Provide a prefix and select a template from the dropdown.
					Notes that are created with the prefix will be populated with the selected template automatically.`,
				);
			}

			setting.addText((text) =>
				text
					.setPlaceholder("Note Prefix")
					.setValue(matcher.prefix)
					.onChange(async (value) => {
						this.plugin.settings.matchers[index].prefix = value;
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

					for (const template of templateFolder.children) {
						/* This will only load the templates that are files
					in the root of the template folder. Next step is to
					allow templates to be in subfolders using
					TFolder.recurseChildren()
					https://docs.obsidian.md/Reference/TypeScript+API/Vault/recurseChildren

					Getting working in simplest case for PoC
					*/
						if (template instanceof TFile) {
							dropdown.addOption(
								template.path,
								template.basename,
							);
						}
					}
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
