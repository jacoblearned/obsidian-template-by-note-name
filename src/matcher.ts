/**
 * A Matcher represents a single user-provided templating rule as specified in the settings tab.
 */
export default class Matcher {
	/** Substring to match in a note name */
	matchString: string;
	templatePath: string;
	matchMethod: string;

	/**
	 * Create a new Matcher.
	 * @param matchString Substring to match in a note name
	 * @param template Template to prepend to the note when it matches
	 * @param matchMethod Method to match the substring, e.g. 'prefix' or 'suffix'
	 */
	constructor(matchString: string, template: string, matchMethod: string) {
		this.matchString = matchString;
		this.templatePath = template;
		this.matchMethod = matchMethod.toLowerCase().trim();
	}

	/**
	 * Check if a file matches the rule.
	 * @param fileName Basename of the file to check,
	 * 	e.g. "my_template" for a note with path "Templates/my_template.md"
	 * @returns {boolean} Whether or not the file matches the Matcher's rule
	 */
	matches(fileName: string): boolean {
		if (this.matchString.trim() === "") {
			return false;
		}

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
