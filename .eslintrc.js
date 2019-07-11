
/**
 * ES LINT - Configuration
 *
 * To use these ESLint configuration, there are dependencies needed to be installed.
 * Install the following NPM packages:
 *
 * babel-eslint
 * eslint-config-recommended
 * eslint-plugin-react
 * eslint-plugin-import
 */

module.exports = {
	"env": {
		"browser": true,
		"commonjs": true,
		"es6": true,
		"node": true
	},
	"extends": [
		"eslint:recommended",
    "plugin:react/recommended",
		"plugin:import/warnings",
		"plugin:import/errors"
	],
	"parser": "babel-eslint",
	"parserOptions": {
		"ecmaFeatures": {
			"experimentalObjectRestSpread": true,
			"jsx": true
		},
		"sourceType": "module"
	},

	/**
	 * Rule to remove the "React is defined but never used" warning
	 * https://github.com/eslint/eslint/issues/1867
	 */
	"plugins": [
		"react",
		"import"
	],

	"rules": {
		// React JSX
		"react/jsx-uses-react": ["error"],
		"react/jsx-uses-vars": ["error"],
		"react/prop-types": ["off"],
		"react/display-name": ["off"],

		// Imports
		"import/no-extraneous-dependencies": ["error", {"devDependencies": true, "optionalDependencies": false, "peerDependencies": false, "packageDir": "./"}],
		"import/no-duplicates": ["off"],

		// Vanilla ES Lint
		"curly": ["warn", "multi-line"],
		"indent": [
			"warn",
			"tab",
			{
				"SwitchCase": 1,
				"MemberExpression": "off",
			}
		],
		"semi": ["warn", "always"],
		"no-undef": ["error"],
		"no-console": ["off"],
		"valid-typeof": ["warn"],
		"default-case": ["off"],
		"no-unused-vars": ["warn"],
		"no-debugger": ["warn"],
		"quotes": ["error", "double"],
	},
};
