// Prepares the hero avatar for the game: textures to 512 px, unused data pruned. Geometry and skeleton untouched.
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {prune,dedup,textureCompress} from '@gltf-transform/functions';import sharp from 'sharp';
const [src,dst]=process.argv.slice(2);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const doc=await io.read(src);
await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,resize:[512,512],quality:85}));await io.write(dst,doc);
