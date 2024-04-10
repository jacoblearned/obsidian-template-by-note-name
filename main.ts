import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

// Remember to rename these classes and interfaces!

interface NoteNameTemplaterSettings {
	templateFolder: string;
}

const DEFAULT_SETTINGS: NoteNameTemplaterSettings = {
	templateFolder: "Templates",
};

export default class NoteNameTemplaterPlugin extends Plugin {
	settings: NoteNameTemplaterSettings;

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
		this.addSettingTab(new NoteNameTemplaterSettingTab(this.app, this));
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

class NoteNameTemplaterSettingTab extends PluginSettingTab {
	plugin: NoteNameTemplaterPlugin;

	constructor(app: App, plugin: NoteNameTemplaterPlugin) {
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
	}
}
