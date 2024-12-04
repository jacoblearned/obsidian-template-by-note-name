import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			"version-bump.mjs",
			"eslint.config.js",
			"rollup.config.js",
			"rollup.prod.config.js",
			"docs/**",
			"dist/**",
		],
	},
);
