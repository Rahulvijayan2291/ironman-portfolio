// Rebuilds public/models/*.glb from model-source/ironman.original.glb.
// One-off tooling (not a project dependency):
//   npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp
//   node scripts/optimize-model.mjs
// Drops the three T-pose clips and the unused CC/metarig armatures, resizes textures to WebP, quantizes and meshopt-compresses.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, textureCompress, meshopt, weld, quantize, flatten } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import sharp from 'sharp'
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
async function build(out, size, quality) {
  const doc = await io.read('model-source/ironman.original.glb')
  const root = doc.getRoot()
  // Inspected: all 3 clips are T-pose. Not used -> removed.
  root.listAnimations().forEach(a => a.dispose())
  // remove the unused CC rig + metarig + IK helper armatures (mesh is skinned by Rigify only)
  const keep = root.listNodes().find(n => n.getName() === 'iron man_Rigify')
  for (const n of root.getScene ? root.listScenes()[0].listChildren() : []) { if (n !== keep) n.dispose() }
  await doc.transform(prune({ keepLeaves: false }), dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  await io.write(out, doc)
}
await build('public/models/ironman.glb', 2048, 82)
await build('public/models/ironman-lite.glb', 1024, 78)
