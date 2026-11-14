"""Compress embedded GLB textures, retaining geometry, skin weights and animation bytes.
Usage: python tools/compress-glb-textures.py input.glb output.glb
"""
import io,json,struct,sys
from pathlib import Path
from PIL import Image
source,target=map(Path,sys.argv[1:]);raw=source.read_bytes()
size=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+size]);start=20+size+8;binary=raw[start:]
images={i['bufferView']:i for i in g.get('images',[])};result=bytearray()
for idx,view in enumerate(g['bufferViews']):
 data=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
 if idx in images:
  info=images[idx];image=Image.open(io.BytesIO(data));orm='metallic' in info.get('name','').lower()
  image.thumbnail((1024,1024) if orm else (2048,2048),Image.Resampling.LANCZOS)
  stream=io.BytesIO()
  if orm:image.save(stream,format='PNG',optimize=True);info['mimeType']='image/png'
  else:image.convert('RGB').save(stream,format='JPEG',quality=93,subsampling=0,optimize=True);info['mimeType']='image/jpeg'
  data=stream.getvalue()
 while len(result)%4:result.append(0)
 view['byteOffset']=len(result);view['byteLength']=len(data);result.extend(data)
while len(result)%4:result.append(0)
g['buffers'][0]['byteLength']=len(result)
meta=json.dumps(g,separators=(',',':')).encode();meta+=b' '*((-len(meta))%4)
output=struct.pack('<III',0x46546c67,2,28+len(meta)+len(result))+struct.pack('<I4s',len(meta),b'JSON')+meta+struct.pack('<I4s',len(result),b'BIN\0')+result
target.write_bytes(output);print(target,len(raw),'->',len(output))
