'use strict';

// Wrapper script selection per platform: ./mvnw and ./gradlew on macOS/Linux,
// mvnw.cmd and gradlew.bat on Windows.

const test = require('node:test');
const assert = require('node:assert');
const { detect } = require('../src/detect');

function fakeRepo(platform, files) {
  return { root: '/x', name: 'x', platform, has: (f) => f in files, read: (f) => files[f], write: () => {} };
}

const POM = { 'pom.xml': '<project/>' };
const GRADLE = { 'build.gradle': '' };

test('maven: wrapper command per platform', () => {
  const both = { ...POM, mvnw: '', 'mvnw.cmd': '' };
  assert.deepStrictEqual(detect(fakeRepo('linux', both)).build, ['./mvnw -B package -DskipTests']);
  assert.deepStrictEqual(detect(fakeRepo('darwin', both)).build, ['./mvnw -B package -DskipTests']);
  assert.deepStrictEqual(detect(fakeRepo('win32', both)).build, ['mvnw.cmd -B package -DskipTests']);
  assert.strictEqual(detect(fakeRepo('win32', both)).install, 'mvnw.cmd -B dependency:go-offline');
});

test('maven: falls back to mvn when this platform has no wrapper, but still counts as pinned', () => {
  const winOnly = detect(fakeRepo('linux', { ...POM, 'mvnw.cmd': '' }));
  assert.deepStrictEqual(winOnly.build, ['mvn -B package -DskipTests']);
  assert.strictEqual(winOnly.pinned, 'mvnw.cmd');
  const posixOnly = detect(fakeRepo('win32', { ...POM, mvnw: '' }));
  assert.deepStrictEqual(posixOnly.build, ['mvn -B package -DskipTests']);
  assert.strictEqual(posixOnly.pinned, 'mvnw');
  assert.strictEqual(detect(fakeRepo('win32', POM)).pinned, null);
});

test('gradle: wrapper command per platform', () => {
  const both = { ...GRADLE, gradlew: '', 'gradlew.bat': '' };
  assert.deepStrictEqual(detect(fakeRepo('linux', both)).build, ['./gradlew build -x test']);
  assert.deepStrictEqual(detect(fakeRepo('win32', both)).build, ['gradlew.bat build -x test']);
  const winOnly = detect(fakeRepo('linux', { ...GRADLE, 'gradlew.bat': '' }));
  assert.deepStrictEqual(winOnly.build, ['gradle build -x test']);
  assert.strictEqual(winOnly.pinned, 'gradlew.bat');
  assert.strictEqual(detect(fakeRepo('win32', GRADLE)).pinned, null);
});
