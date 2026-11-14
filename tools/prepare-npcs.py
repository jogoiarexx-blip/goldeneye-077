"""Run with Blender: blender -b --python tools/prepare-npcs.py -- DOCTOR.glb SCIENTIST.zip OUTPUT_DIR.
Preserves uploaded geometry/UV/skin, authors gentle NPC clips, retains the supplied jump.
Texture compression is performed separately by tools/compress-glb-textures.py.
"""
import bpy,sys,pathlib,zipfile,tempfile,math
from mathutils import Vector,Quaternion
source_doctor,source_scientist,out=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True)
for kind in ['dra','scientist']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 if kind=='dra':
  bpy.ops.import_scene.gltf(filepath=source_doctor)
 else:
  folder=pathlib.Path(tempfile.mkdtemp(prefix='scientist-'))
  with zipfile.ZipFile(source_scientist) as z:z.extractall(folder)
  bpy.ops.import_scene.fbx(filepath=str(next(folder.rglob('*.fbx'))))
  # The FBX contains names from the original export, rather than the ZIP's names.
  for image in bpy.data.images:
   suffix='_normal.png' if 'normal' in image.name else '_roughness.png' if 'roughness' in image.name else '_metallic.png' if 'metallic' in image.name else None
   path=next((p for p in folder.rglob('*.png') if p.name.endswith(suffix) if suffix),None) if suffix else next(p for p in folder.rglob('*.png') if not any(x in p.name for x in ['_normal','_metallic','_roughness']))
   image.filepath=str(path);image.reload();image.pack()
 arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 # Rig-display helper is not part of the doctor's character.
 for obj in list(bpy.data.objects):
  if obj.type=='MESH' and not any(m.type=='ARMATURE' for m in obj.modifiers):bpy.data.objects.remove(obj,do_unlink=True)
 arm.animation_data_clear()
 for a in bpy.data.actions:a.name='PowerSpinJump'  # preserved, never selected for idle
 if kind=='dra':
  names=dict(spine='Bone_005',chest='Bone_003',head='Bone_017',la='Bone_022',ra='Bone_027',lf='Bone_021',rf='Bone_026',ll='Bone_015',rl='Bone_010',lk='Bone_014',rk='Bone_009')
 else:
  names={k:'mixamorig:'+v for k,v in dict(spine='Spine',chest='Spine2',head='Head',la='LeftArm',ra='RightArm',lf='LeftForeArm',rf='RightForeArm',ll='LeftUpLeg',rl='RightUpLeg',lk='LeftLeg',rk='RightLeg').items()}
 scene=bpy.context.scene;scene.render.fps=30
 # Express rotations in each bone's rest-local coordinates; avoids twisting UV/skin.
 def rotate(pb,world_axis,angle):
  axis=pb.bone.matrix_local.to_3x3().inverted() @ (arm.matrix_world.to_3x3().inverted() @ Vector(world_axis))
  pb.rotation_quaternion=pb.rotation_quaternion @ Quaternion(axis.normalized(),angle)
 for clip,frames in [('Idle',90),('Talk',75),('Walking',30)]:
  action=bpy.data.actions.new(clip);action.use_fake_user=True;arm.animation_data_create();arm.animation_data.action=action
  for frame in range(1,frames+2,3):
   t=(frame-1)/frames*math.tau
   for pb in arm.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0);pb.scale=(1,1,1)
   for key,amp in [('spine',.012),('chest',.012),('head',.024)]:rotate(arm.pose.bones[names[key]],(1,0,0),math.sin(t)*amp)
   if clip=='Talk':
    rotate(arm.pose.bones[names['head']],(0,0,1),math.sin(t)*.08)
    rotate(arm.pose.bones[names['lf']],(1,0,0),-.3-.12*math.sin(t))
   if clip=='Walking':
    for key,amp,phase in [('ll',.22,0),('rl',.22,math.pi),('lk',.3,0),('rk',.3,math.pi),('la',.12,math.pi),('ra',.12,0)]:
     value=math.sin(t+phase)*amp
     if key in ['lk','rk']:value=max(0,value)
     rotate(arm.pose.bones[names[key]],(1,0,0),value)
   for key in names:
    pb=arm.pose.bones[names[key]];pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
  for fc in action.fcurves:
   for point in fc.keyframe_points:point.interpolation='LINEAR'
 arm.animation_data.action=None
 for pb in arm.pose.bones:pb.rotation_quaternion=Quaternion()
 scene.frame_set(1)
 bpy.ops.export_scene.gltf(filepath=str(out/(kind+'.glb')),export_format='GLB',export_animations=True,export_nla_strips=False,export_force_sampling=True,export_skins=True,export_yup=True,export_image_format='AUTO')
 print('EXPORTED',kind)
