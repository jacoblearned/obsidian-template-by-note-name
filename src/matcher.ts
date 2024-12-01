export default class Matcher {
	matchString: string;
	templatePath: string;
	matchMethod: string;

	constructor(matchString: string, template: string, matchMethod: string) {
		this.matchString = matchString;
		this.templatePath = template;
		this.matchMethod = matchMethod.toLowerCase().trim();
	}

	matches(fileName: string): boolean {
		switch (this.matchMethod) {
			case "prefix":
				return fileName.startsWith(this.matchString);
			case "suffix":
				return fileName.endsWith(this.matchString);
			case "contains":
				return fileName.includes(this.matchString);
			default:
				return false;
		}
	}
}
