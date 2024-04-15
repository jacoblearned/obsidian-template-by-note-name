import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

interface TemplateByNoteNameSettings {
	templateFolder: string;
	templateOnRename: boolean;
	matchers: string[];
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
					console.log("File created", file.path);
					if (file instanceof TFile) {
						await this.writeToFile(
							file,
							"Hello, world on layout ready!",
						);
						await this.logFileContent(file);
					}
				}),
			);
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
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
				text.setButtonText("Create").onClick(async () => {
					this.plugin.settings.matchers.push("Foo");
					await this.plugin.saveSettings();
					console.log("Matchers", this.plugin.settings.matchers);
					this.display();
				}),
			);

		this.plugin.settings.matchers.forEach((matcher, index) => {
			new Setting(containerEl)
				.setName(`Matcher ${index + 1}`)
				.setDesc("A matcher to match note names to templates")
				.addText((text) =>
					text
						.setPlaceholder("Foo")
						.setValue(matcher)
						.onChange(async (value) => {
							this.plugin.settings.matchers[index] = value;
							await this.plugin.saveSettings();
						}),
				)
				.addDropdown((dropdown) => {
					dropdown
						.addOption("Foo", "Foo")
						.addOption("Bar", "Bar")
						.setValue(matcher)
						.onChange(async (value) => {
							this.plugin.settings.matchers[index] = value;
							await this.plugin.saveSettings();
						});
				})
				.addButton((text) =>
					text.setButtonText("Delete").onClick(() => {
						this.plugin.settings.matchers.splice(index, 1);
						this.display();
					}),
				);
		});

		/*
		If matchers is empty, show a message saying "No matchers found"
		and a description of what matchers are and how to add them.
		*/

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
