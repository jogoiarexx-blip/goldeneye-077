/**
 * GoldenEye 077 v2.8 — modo seguro do soldado Meshy.
 * O rig v2.7 tinha pesos inferidos incorretos, quebrando braços, peito e pernas.
 * Esta camada mantém a geometria inteira rígida: o sway v2.5, o recuo e a
 * queda v2.6 animam o grupo, não os vértices do modelo.
 */
(() => {
  'use strict';
  if (typeof GuardAgent === 'undefined') return;
  const original = GuardAgent.prototype.update;
  GuardAgent.prototype.update = function(dt,...args) {
    const result = original.call(this,dt,...args);
    if (this.meshySpecialVisual && this.state !== 'DEAD') {
      // Pequena postura de mira/tiro sobre o corpo inteiro, sem deformar malha.
      const alerted = this.state === 'ALERTED';
      const kick = Math.min(1,Math.max(0,this.guardShotKick||0));
      this.meshySpecialVisual.rotation.x = (alerted ? -.018 : 0)-kick*.024;
    }
    return result;
  };
  if (typeof window !== 'undefined') window.GoldenEyeMeshySafe = {
    version:'2.8', mode:'rigid-visual', autoSkinning:false
  };
})();
