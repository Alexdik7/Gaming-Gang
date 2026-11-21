// Asset-Pipeline: CC0-Quellmodelle → schlanke GLBs in assets/models/ (nur benötigte Animationen, kleine Texturen).
// Aufruf (ESM braucht die Pakete neben dem Skript): npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 sharp meshoptimizer@0.21
//   in einem Hilfsordner, Skript dorthin kopieren, dann: node <hilfsordner>/models.mjs <quellordner> beastforge/assets/models
// Quellen (alle CC0): Quaternius „Ultimate Monsters“ (glTF/), Quaternius „Ultimate Animated Animals“ (animals/), Vuena „Free Low-Poly Animals“ (vuena/),
//   KayKit „Adventurers“ + „Character Animations“ (kaykit/, kkanim/; aus series-ai/jam-ready-assets, LFS über media.githubusercontent.com)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = process.argv[2], OUT = process.argv[3] || new URL('../assets/models/', import.meta.url).pathname;
// name: [quelle, { altName: neuerName }, optionen]  (simp: Anteil der Dreiecke, der bleibt – Gegner erscheinen zu Hunderten)
const LIST = {
  // Gegner (Ultimate Monsters)
  blob:      ['glTF/GreenBlob.gltf',        { Walk: 'walk' }, { simp: 0.5 }],
  ghost:     ['glTF/Ghost.gltf',            { Fast_Flying: 'walk' }, { simp: 0.4 }],
  skull:     ['glTF/Ghost_Skull.gltf',      { Fast_Flying: 'walk' }, { simp: 0.4 }],
  wizard:    ['glTF/Wizard.gltf',           { Walk: 'walk' }, { simp: 0.5 }],
  mushking:  ['glTF/Mushnub_Evolved.gltf',  { Walk: 'walk' }, { simp: 0.4 }],
  bee:       ['glTF/Armabee.gltf',          { Fast_Flying: 'walk' }, { simp: 0.35 }],
  bee2:      ['glTF/Armabee_Evolved.gltf',  { Fast_Flying: 'walk' }, { simp: 0.4 }],
  rockling:  ['glTF/Goleling_Evolved.gltf', { Fast_Flying: 'walk', Flying_Idle: 'idle', Punch: 'attack', HitReact: 'hit' }],
  demon:     ['glTF/Demon.gltf',            { Flying_Idle: 'walk' }, { simp: 0.35 }],
  orc:       ['glTF/Orc.gltf',              { Walk: 'walk' }, { simp: 0.55 }],
  dragon:    ['glTF/Dragon_Evolved.gltf',   { Flying_Idle: 'walk', Fast_Flying: 'fly', Headbutt: 'attack', HitReact: 'hit', Death: 'death' }],
  // Tiere (Animated Animals)
  wolf:      ['animals/Wolf.gltf',          { Gallop: 'walk', Idle: 'idle', Attack: 'attack', Idle_HitReact_Left: 'hit' }, { simp: 0.6 }],
  bull:      ['animals/Bull.gltf',          { Walk: 'walk' }, { simp: 0.55 }],
  husky:     ['animals/Husky.gltf',         { Idle: 'idle', Attack: 'attack', Idle_HitReact_Left: 'hit' }],
  deer2:     ['animals/Deer.gltf',          { Idle: 'idle', Attack_Headbutt: 'attack', Idle_HitReact_Left: 'hit' }],
  fox2:      ['animals/Fox.gltf',           { Idle: 'idle', Attack: 'attack', Idle_HitReact_Left: 'hit' }],
  shiba:     ['animals/ShibaInu.gltf',      { Idle: 'idle', Attack: 'attack', Idle_HitReact_Left: 'hit' }],
  pigeon:    ['glTF/Pigeon.gltf',           { Flying_Idle: 'idle', Punch: 'attack', HitReact: 'hit' }],
  goleling:  ['glTF/Goleling.gltf',         { Flying_Idle: 'idle', Punch: 'attack', HitReact: 'hit' }],
  stag:      ['animals/Stag.gltf',          { Idle: 'idle', Attack_Headbutt: 'attack', Idle_HitReact_Left: 'hit' }],
  // Vuena (Textur, Mobil-LOD)
  fox:       ['vuena/animal_fox.glb',       { idle: 'idle', attack: 'attack', hit: 'hit', call: 'call' }, { lod: true }],
  owl:       ['vuena/animal_owl.glb',       { idle: 'idle', attack: 'attack', hit: 'hit', call: 'call' }, { lod: true }],
  cat:       ['vuena/animal_cat.glb',       { idle: 'idle', attack: 'attack', hit: 'hit', call: 'call' }, { lod: true }],
  // Helden (KayKit): Figuren ohne Animation, Animationen getrennt (gleiches Skelett „Rig_Medium“)
  kk_ninja:  ['kk2/Ninja.glb', {}, { tex: 256 }],
  kk_golem:  ['kk2/FrostGolem.glb', {}, { simp: 0.6 }],
  kk_large1: ['kk2/Rig_Large_General.glb', { Idle_A: 'idle', Hit_A: 'hit' }, { noMesh: true }],
  kk_large2: ['kk2/Rig_Large_CombatMelee.glb', { Melee_Unarmed_Smash: 'smash' }, { noMesh: true }],
  kk_raizen: ['kaykit/Rogue.glb', {}, { tex: 256 }],
  kk_mage:   ['kaykit/Mage.glb', {}, { tex: 256 }],
  kk_anim1:  ['kkanim/Rig_Medium_General.glb', { Idle_A: 'idle', Hit_A: 'hit', Throw: 'throw', Spawn_Ground: 'spawn' }, { noMesh: true }],
  kk_anim2:  ['kkanim/Rig_Medium_CombatRanged.glb', { Ranged_Magic_Shoot: 'magic', Ranged_Magic_Spellcasting: 'cast' }, { noMesh: true }],
  kk_anim3:  ['kkanim/Rig_Medium_CombatMelee.glb', { Melee_Dualwield_Attack_Slice: 'slash' }, { noMesh: true }],
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
let total = 0;
for (const [name, [file, clips, o = {}]] of Object.entries(LIST)) {
  const doc = await io.read(path.join(SRC, file)), root = doc.getRoot();
  for (const a of root.listAnimations()) { const n = clips[a.getName()]; if (n) a.setName(n); else { a.listSamplers().forEach(x => x.dispose()); a.listChannels().forEach(x => x.dispose()); a.dispose(); } }
  if (o.lod) for (const n of root.listNodes()) if (/_LOD0$/.test(n.getName())) { n.getMesh()?.dispose(); n.dispose(); }
  for (const m of root.listMaterials()) { m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setNormalTexture(null); m.setEmissiveTexture(null); }
  await doc.transform(prune(), dedup(), resample({ tolerance: 0.002 }));
  if (o.lod) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512], quality: 82 }));
  if (o.tex) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'png', resize: [o.tex, o.tex] }));
  if (o.noMesh) { for (const n of root.listNodes()) if (n.getMesh()) { n.setSkin(null); n.getMesh().dispose(); n.dispose(); } for (const k of root.listSkins()) k.dispose(); for (const m of root.listMaterials()) m.dispose(); }
  if (o.simp) { for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) p.setAttribute('NORMAL', null); await MeshoptSimplifier.ready; await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: o.simp, error: 0.01 })); }
  await doc.transform(prune());
  const buf = await io.writeBinary(doc); fs.writeFileSync(path.join(OUT, name + '.glb'), buf); total += buf.length;
  const tris = root.listMeshes().flatMap(m => m.listPrimitives()).reduce((a, p) => a + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  console.log(name.padEnd(9), (buf.length / 1024).toFixed(0).padStart(5) + ' KB', String(tris).padStart(6) + ' Dreiecke', root.listAnimations().map(a => a.getName()).join(','));
}
console.log('Summe', (total / 1024).toFixed(0), 'KB');
