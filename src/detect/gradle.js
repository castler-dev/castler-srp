'use strict';

function detectGradle(repo, f) {
  if (!repo.has('build.gradle') && !repo.has('build.gradle.kts')) return false;
  const g = repo.has('gradlew') ? './gradlew' : 'gradle';
  f.ecosystem = 'java-gradle';
  f.toolchain.java = null;
  f.pinned = repo.has('gradlew') ? 'gradlew' : null;
  f.build.push(`${g} build -x test`);
  return true;
}

module.exports = { detectGradle };
