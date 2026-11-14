'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const context = vm.createContext({});
vm.runInContext(read('src/guards.js') + '\nthis.Guard = GuardAgent;', context);
// Exercise the real hit-resolution block and GuardAgent damage/death logic.
const source = read('src/game.js');
const start = source.indexOf('        if (closestGuard && hitPoint) {');
const end = source.indexOf('\n        this.updateHUD();', start);
assert.ok(start >= 0 && end > start);
const resolveHit = new Function('closestGuard', 'hitPoint', 'w', source.slice(start, end));
vm.runInContext(read('src/missions.js') + '\nthis.missions = MISSIONS_DATA;', context);
const hpByDifficulty = Object.values(context.missions.dam.difficulties).map(d => d.guardHp);
for (const hp of [...hpByDifficulty, 500]) {
  for (const damage of [26, 36, 95]) {
    for (const headshot of [true, false]) {
      const guard = Object.create(context.Guard.prototype);
      Object.assign(guard, { hp, state: 'PATROL', statusOrb: { visible: true },
        mesh: { rotation: {}, position: {} }, setAlerted() {} });
      const game = { stats: { shotsHit: 0, kills: 0 }, player: { pos: null },
        spawnSpark() {}, notifyHUD() {} };
      resolveHit.call(game, guard, { y: headshot ? 1.7 : 1.2 }, { damage });
      assert.equal(guard.state === 'DEAD', headshot || damage >= hp,
        `headshot=${headshot}, HP=${hp}, damage=${damage}`);
      assert.equal(game.stats.shotsHit, 1);
      assert.equal(game.stats.kills, headshot || damage >= hp ? 1 : 0);
      if (!headshot) assert.equal(guard.hp, hp - damage, 'Body damage unchanged');
    }
  }
}
console.log('OK headshots: one-shot kills at every difficulty and HP; body damage and kill counts preserved.');
