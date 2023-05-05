/* eslint-disable no-undef */
/*eslint-env node*/

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest-setup.js"]
};
