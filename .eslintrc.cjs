module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "detect" } },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  rules: {
    "react/prop-types": "off",
    // Components import React explicitly by convention.
    "react/jsx-uses-react": "error",
  },
  overrides: [
    {
      // react-three-fiber elements take three.js props.
      files: ["src/Components/Model/**", "src/Components/Home/Hero/Hero3D.jsx"],
      rules: {
        "react/no-unknown-property": [
          "error",
          { ignore: ["intensity", "position", "object", "rotation", "scale"] },
        ],
      },
    },
    {
      files: ["**/*.test.{js,jsx}", "src/setupTests.js"],
      env: { node: true },
      globals: {
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  ],
};
