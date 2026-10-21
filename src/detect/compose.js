'use strict';

const KNOWN = ['postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'rabbitmq', 'kafka', 'elasticsearch'];
const FILES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];

function detectServices(repo, f) {
  for (const c of FILES) {
    if (!repo.has(c)) continue;
    const text = repo.read(c);
    const re = /image:\s*["']?([^\s"']+)/g;
    let m;
    while ((m = re.exec(text))) {
      const last = m[1].split('/').pop();
      const [base, tag] = last.split(':');
      const type = KNOWN.find((k) => base.startsWith(k));
      if (type && !f.services.some((s) => s.type === type)) f.services.push({ type, version: tag || null });
    }
  }
}

module.exports = { detectServices };
