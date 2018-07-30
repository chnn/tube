module.exports = {
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx"
  ],
  setupTestFrameworkScriptFile: "<rootDir>src/setupTests.ts",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  testURL: "http://localhost/",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
};
