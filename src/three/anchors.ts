import * as THREE from 'three'

/**
 * Anchor points were measured on the supplied GLB (model space, bind pose) by
 * ray-casting the skinned mesh and by reading bone world positions:
 *   - chest reactor disc centre  ≈ (0, 3.81, 0.451), surface normal ≈ (-0.05, 0.32, 0.95)
 *   - left palm surface          ≈ (0.905, 2.57, 0.045), normal ≈ (-0.98, -0.17, -0.06) (palm faces the thigh in this A-pose)
 * Right palm mirrors the left across X.
 * Bone names are shown as three.js sanitises them (dots removed).
 */
export const BONES = {
  chest: 'DEF-spine003',
  spine1: 'DEF-spine001',
  spine2: 'DEF-spine002',
  neck: 'DEF-spine005',
  head: 'DEF-spine006',
  handL: 'DEF-handL',
  handR: 'DEF-handR',
  forearmL: 'DEF-forearmL',
  forearmR: 'DEF-forearmR',
} as const

export const ANCHOR_SPECS = {
  chest: { bone: BONES.chest, point: [0, 3.81, 0.451], normal: [-0.05, 0.32, 0.95], lift: 0.006 },
  palmL: { bone: BONES.handL, point: [0.905, 2.57, 0.045], normal: [-0.98, -0.17, -0.06], lift: 0.012 },
  palmR: { bone: BONES.handR, point: [-0.905, 2.57, 0.045], normal: [0.98, -0.17, -0.06], lift: 0.012 },
  // visor eye slits (bind pose, measured from the baked emissive texture), parented to the head bone
  eyeL: { bone: BONES.head, point: [0.1, 4.545, 0.347], normal: [0.12, 0, 0.99], lift: 0.02 },
  eyeR: { bone: BONES.head, point: [-0.1, 4.545, 0.347], normal: [-0.12, 0, 0.99], lift: 0.02 },
  // boot soles: thruster nozzles point straight down in the bind pose
  soleL: { bone: 'DEF-footL', point: [0.428, 0.03, 0.12], normal: [0, -1, 0], lift: 0 },
  soleR: { bone: 'DEF-footR', point: [-0.428, 0.03, 0.12], normal: [0, -1, 0], lift: 0 },
} as const

export type AnchorKey = keyof typeof ANCHOR_SPECS

const Z = new THREE.Vector3(0, 0, 1)

/**
 * Creates an Object3D parented to `bone` that sits at `point` (+ lift along `normal`)
 * with local +Z aligned to `normal`, compensating for any bone scale so effects are
 * authored in plain model units. Must be called while the model is in its bind pose
 * and un-transformed (before it is placed in the scene).
 */
export function createAnchor(root: THREE.Object3D, bone: THREE.Object3D, point: readonly number[], normal: readonly number[], lift: number): THREE.Object3D {
  root.updateMatrixWorld(true)
  const n = new THREE.Vector3(...normal).normalize()
  const p = new THREE.Vector3(...point).addScaledVector(n, lift)

  const anchor = new THREE.Object3D()
  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert()
  anchor.position.copy(p.applyMatrix4(inv))

  const boneQ = bone.getWorldQuaternion(new THREE.Quaternion())
  anchor.quaternion.copy(boneQ.invert().multiply(new THREE.Quaternion().setFromUnitVectors(Z, n)))

  const ws = bone.getWorldScale(new THREE.Vector3())
  anchor.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z)
  bone.add(anchor)
  return anchor
}
