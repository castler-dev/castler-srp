'use strict';

function detectMaven(repo, f) {
  if (!repo.has('pom.xml')) return false;
  const pom = repo.read('pom.xml');
  const m = pom.match(/<maven\.compiler\.release>([^<]+)</) ||
            pom.match(/<maven\.compiler\.source>([^<]+)</) ||
            pom.match(/<java\.version>([^<]+)</);
  const win = repo.platform === 'win32';
  const mvn = win ? (repo.has('mvnw.cmd') ? 'mvnw.cmd' : 'mvn') : (repo.has('mvnw') ? './mvnw' : 'mvn');
  f.ecosystem = 'java-maven';
  f.toolchain.java = m && !m[1].trim().startsWith('$') ? m[1].trim() : null;
  f.pinned = repo.has('mvnw') ? 'mvnw' : repo.has('mvnw.cmd') ? 'mvnw.cmd' : null;
  f.install = `${mvn} -B dependency:go-offline`;
  f.build.push(`${mvn} -B package -DskipTests`);
  return true;
}

module.exports = { detectMaven };
