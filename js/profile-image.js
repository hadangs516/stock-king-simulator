import {escape as e} from './format.js';
export const validAvatar=value=>typeof value==='string'&&value.length<=24576&&/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export function profileAvatar(p){return `<span class="friend-avatar">${validAvatar(p.avatar)?`<img src="${e(p.avatar)}" alt="${e(p.nickname)} 프로필 사진">`:e((p.nickname||'?').slice(0,1))}</span>`;}
export async function prepareAvatar(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5000000)throw new Error('5MB 이하의 PNG·JPG·WebP 사진을 선택해 주세요.');
 const bitmap=await createImageBitmap(file);try{const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;const size=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,160,160);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));if(!blob||blob.size>18000)throw new Error('사진 크기가 너무 커요. 다른 사진을 선택해 주세요.');
 const bytes=new Uint8Array(await blob.arrayBuffer());return 'data:image/webp;base64,'+btoa(String.fromCharCode(...bytes));
 }finally{bitmap.close();}
}
