const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
    files: "out/test/suite/**/*.test.js",
    workspaceFolder: ".",
    mocha: {
        ui: "tdd",
        color: true,
        timeout: 20000,
    },
});
