import { TFile } from "obsidian";

export default class Matcher {
	matchString: string;
	templatePath: string;
	matchMethod: string;

	constructor(matchString: string, template: string, matchMethod: string) {
		this.matchString = matchString;
		this.templatePath = template;
		this.matchMethod = matchMethod.toLowerCase().trim();
	}

	matches(file: TFile): boolean {
		switch (this.matchMethod) {
			case "prefix":
				return file.basename.startsWith(this.matchString);
			case "suffix":
				return file.basename.endsWith(this.matchString);
			case "contains":
				return file.basename.includes(this.matchString);
			default:
				return false;
		}
	}
}
