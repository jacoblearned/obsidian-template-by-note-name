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
	 * @param caseSensitive Whether to compare file names and match strings case-sensitively
	 * @returns Whether the file matches the Matcher's rule
	 */
	matches(fileName: string, caseSensitive: boolean): boolean {
		if (this.matchString.trim() === "") {
			return false;
		}

		fileName = caseSensitive ? fileName : fileName.toLowerCase();
		const matchString = caseSensitive
			? this.matchString
			: this.matchString.toLowerCase();

		switch (this.matchMethod) {
			case "prefix":
				return fileName.startsWith(matchString);
			case "suffix":
				return fileName.endsWith(matchString);
			case "contains":
				return fileName.includes(matchString);
			default:
				return false;
		}
	}
}
