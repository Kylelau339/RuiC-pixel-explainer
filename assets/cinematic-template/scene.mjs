import {drawPaper,drawInventory,drawRecallPanel,drawOpenBook,drawQuizBoard,drawMarkerFlag,drawFeedback,drawRewardBadge,drawCompareCards,drawStepBar,setLocale} from './components.mjs';
import {buildPresetCanvas,resolveScenePair,SCENE_IDS} from './scene-presets.mjs';
import {FONT_FAMILY,t} from './i18n.mjs';
// Coarse pixel cinematic scene kit. All geometry, actors and props are drawn
// from independent primitives. No recovered video frames or AI backdrop used.
const W=1920,H=1080;
const C={ink:'#171d1b',dark:'#0e1212',gold:'#cfab57',paper:'#e9dec0',warm:'#b79558',teal:'#77b9ac'};
export const clamp=x=>Math.max(0,Math.min(1,x));
export {SCENE_IDS,resolveScenePair};
const ease=x=>1-Math.pow(1-clamp(x),3);
const lerp=(a,b,k)=>a+(b-a)*k;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function frame(c,x,y,w,h,color,n=4){rect(c,x,y,w,n,color);rect(c,x,y+h-n,w,n,color);rect(c,x,y,n,h,color);rect(c,x+w-n,y,n,h,color);}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function text(c,s,x,y,size=30,color=C.paper,align='left'){c.font=`${size}px ${FONT_FAMILY}`;c.textAlign=align;c.textBaseline='top';c.fillStyle=color;c.fillText(s,Math.round(x),Math.round(y));}
function books(c,x,y,count=5,scale=1){
 const colors=['#66513c','#736149','#495a49','#826346','#51594d'];c.save();c.translate(x,y);c.scale(scale,scale);
 for(let i=0;i<count;i++){const w=155+(i%3)*20,yy=-i*25;rect(c,0,yy,w,23,'#191f1b');rect(c,4,yy+3,w-8,13,colors[i%colors.length]);rect(c,10,yy+16,w-20,4,'#a08a62');rect(c,15,yy+3,8,13,'#262c24');}c.restore();
}
function spotlight(c,x,y,bottom,width,strength=.15){
 c.save();c.beginPath();c.moveTo(x-25,y);c.lineTo(x+25,y);c.lineTo(x+width/2,bottom);c.lineTo(x-width/2,bottom);c.closePath();c.clip();const g=c.createLinearGradient(0,y,0,bottom);g.addColorStop(0,`rgba(242,230,180,${strength*.48})`);g.addColorStop(.4,`rgba(229,219,173,${strength})`);g.addColorStop(1,`rgba(223,204,146,${strength*.35})`);c.fillStyle=g;c.fillRect(x-width,y,width*2,bottom-y);c.restore();
 const glow=c.createRadialGradient(x,y+22,3,x,y+22,110);glow.addColorStop(0,'rgba(255,234,166,.13)');glow.addColorStop(1,'rgba(255,234,166,0)');c.fillStyle=glow;c.fillRect(x-110,y-88,220,220);
}
function vignette(c){const g=c.createRadialGradient(960,440,270,960,485,1100);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.7,'rgba(0,0,0,.30)');g.addColorStop(1,'rgba(0,0,0,.75)');c.fillStyle=g;c.fillRect(0,0,W,H);const lower=c.createLinearGradient(0,855,0,H);lower.addColorStop(0,'rgba(0,0,0,0)');lower.addColorStop(1,'rgba(0,0,0,.86)');c.fillStyle=lower;c.fillRect(0,855,W,H-855);}
function panel(c,x,y,w,h){rect(c,x,y,w,h,'#15221e');frame(c,x,y,w,h,'#b69a59',3);for(const [a,b]of [[x,y],[x+w-6,y],[x,y+h-6],[x+w-6,y+h-6]])rect(c,a,b,6,6,'#e0cd8b');}

// Both actors share identity colors, but have independently authored shapes.
// Optional visual fields: hairStyle (bob/long/short), headwear (none/cap/beret),
// headwearColor, headwearLight, headwearAccent, eye/eyeLeft/eyeRight, eyePatch.
// Existing episode.actor color tables remain valid; no image asset is required.
function actorPalette(skin={}){
 return {outline:'#171d1e',hair:'#282c29',hairLight:'#41433a',coat:'#334637',coatLight:'#50634c',scarf:'#a55437',skin:'#ddb18c',skinLight:'#edc49c',skinShade:'#bf926c',clip:'#c79c4a',eye:'#425e6d',eyeWhite:'#f1e6cc',blush:'#cd927d',mouth:'#493b37',collar:'#e4e0c4',pants:'#373b35',hairStyle:'bob',headwear:'none',...skin};
}
function headwear(r,p,f,mini=false){
 const hat=f.headwearColor||f.hair,light=f.headwearLight||f.hairLight,accent=f.headwearAccent;
 if(f.headwear==='cap'){
  if(mini){p([[6,0],[18,0],[18,1],[21,1],[21,4],[22,4],[22,7],[2,7],[2,4],[3,4],[3,2],[6,2]],f.outline);r(5,2,14,4,hat);r(5,2,14,1,light);r(3,6,19,2,f.outline);if(accent)r(6,3,2,2,accent);}
  else{p([[8,0],[24,0],[24,1],[27,1],[27,3],[29,3],[29,7],[3,7],[3,3],[5,3],[5,1],[8,1]],f.outline);r(6,2,20,4,hat);r(6,2,20,1,light);r(4,6,25,2,f.outline);if(accent)r(8,3,3,2,accent);}
 }else if(f.headwear==='beret'){
  if(mini){p([[8,0],[18,0],[18,1],[21,1],[21,3],[22,3],[22,6],[3,6],[3,3],[5,3],[5,1],[8,1]],f.outline);r(6,2,14,3,hat);r(7,2,10,1,light);if(accent)r(18,3,2,2,accent);}
  else{p([[10,0],[24,0],[24,1],[27,1],[27,3],[29,3],[29,6],[4,6],[4,3],[7,3],[7,1],[10,1]],f.outline);r(8,2,18,3,hat);r(9,2,13,1,light);if(accent)r(24,3,2,2,accent);}
 }
}

export function frontActor(c,x,y,s,t,skin,speaking=false){
 const f=actorPalette(skin),outline=f.outline;
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 const r=(xx,yy,ww,hh,col)=>rect(c,xx*s,yy*s,ww*s,hh*s,col),p=(pts,col)=>poly(c,pts.map(([a,b])=>[a*s,b*s]),col);
 // Independent 32×35 WAIST-UP design: complete head, broad shoulders, sleeves,
 // hands and a continuous waist hem. No legs or enlarged walking-body geometry.
 if(f.hairStyle==='long'){r(4,13,5,22,outline);r(5,14,3,20,f.hair);r(6,17,1,14,f.hairLight);r(25,13,4,22,outline);r(26,14,2,20,f.hair);}
 p([[10,23],[23,23],[23,25],[27,25],[27,27],[29,27],[29,35],[4,35],[4,27],[6,27],[6,25],[10,25]],outline);
 p([[10,24],[23,24],[23,26],[26,26],[26,28],[28,28],[28,34],[5,34],[5,28],[7,28],[7,26],[10,26]],f.coat);
 r(8,27,4,7,f.coatLight);r(22,27,3,7,f.coatLight);r(12,25,9,9,f.coat);
 p([[11,24],[15,26],[16,28],[17,26],[22,24],[21,28],[18,30],[15,30],[12,28]],f.collar);
 r(14,24,6,2,f.scarf);r(16,26,2,7,f.scarf);r(7,34,20,1,outline);
 p([[10,0],[22,0],[22,1],[25,1],[25,3],[27,3],[27,7],[29,7],[29,19],[27,19],[27,22],[24,22],[24,24],[8,24],[8,22],[5,22],[5,19],[3,19],[3,7],[5,7],[5,4],[7,4],[7,2],[10,2]],outline);
 p([[10,1],[22,1],[22,2],[24,2],[24,4],[26,4],[26,8],[28,8],[28,18],[26,18],[26,21],[23,21],[23,23],[9,23],[9,21],[6,21],[6,18],[4,18],[4,8],[6,8],[6,5],[8,5],[8,3],[10,3]],f.hair);
 // Flat cheek/chin outline; the center face remains a skin-color plane.
 p([[11,7],[21,7],[21,9],[24,9],[24,19],[22,19],[22,21],[11,21],[11,20],[8,20],[8,11],[10,11],[10,9],[11,9]],f.skinShade);
 p([[11,8],[21,8],[21,10],[23,10],[23,19],[21,19],[21,21],[12,21],[12,20],[9,20],[9,12],[10,12],[10,10],[11,10]],f.skin);
 r(12,10,10,9,f.skinLight);r(11,17,12,2,f.skinLight);
 r(8,3,15,3,f.hairLight);r(6,6,10,2,f.hair);r(7,8,6,2,f.hair);r(7,10,4,2,f.hair);r(21,7,4,3,f.hair);r(23,10,3,8,f.hair);
 if(f.hairStyle==='short'){r(5,15,3,6,outline);r(6,15,2,5,f.hair);r(25,15,3,6,outline);r(25,15,2,5,f.hair);}
 if(f.clip){r(7,6,3,1,f.clip);r(8,7,3,1,f.clip);}
 headwear(r,p,f);
 const blink=Math.floor(t/100)%43>=40;
 for(const [xx,eye,side]of [[11,f.eyeLeft||f.eye,'left'],[19,f.eyeRight||f.eye,'right']]){
  r(xx,11,4,1,outline);
  if(f.eyePatch===side)r(xx,12,4,4,outline);
  else if(blink)r(xx,14,4,1,outline);
  else{r(xx,12,4,4,f.eyeWhite);r(xx+1,13,2,3,eye);r(xx+1,12,2,1,outline);}
 }
 r(10,17,2,1,f.blush);r(22,17,2,1,f.blush);
 const mouth=speaking&&Math.floor(t/125)%3!==0;r(15,19,3,mouth?2:1,f.mouth);
 if(mouth)r(16,20,1,1,f.blush);
 const gesture=speaking&&t>2800&&t<6100?2:0;
 r(3,28-gesture,5,6,outline);r(4,28-gesture,3,3,f.coatLight);r(4,31-gesture,3,2,f.skinLight);
 r(25,28-gesture,5,6,outline);r(26,28-gesture,3,3,f.coatLight);r(26,31-gesture,3,2,f.skinLight);
 c.restore();
}

export function sideActor(c,x,foot,s,t,skin,walking=false){
 const f=actorPalette(skin),outline=f.outline;
 // Keep boolean callers intact. New callers may request 'idle', 'walk' or
 // 'celebrate'; motion stays on the same time axis and preserves foot anchoring.
 const pose=typeof walking==='string'?walking:walking?'walk':'idle',walk=pose==='walk',celebrate=pose==='celebrate',phase=Math.floor(t/170)%2;
 c.save();c.translate(Math.round(x),Math.round(foot-31*s-((walk||celebrate)&&phase?s:0)));c.imageSmoothingEnabled=false;
 const r=(xx,yy,ww,hh,col)=>rect(c,xx*s,yy*s,ww*s,hh*s,col),p=(pts,col)=>poly(c,pts.map(([a,b])=>[a*s,b*s]),col);
 // 24×31 front / slight-three-quarter action sprite, head about 65% of height.
 // The named sideActor API now uses a readable flat face during travel.
 if(f.hairStyle==='long'){r(2,11,4,17,outline);r(3,12,2,15,f.hair);r(18,11,4,17,outline);r(19,12,2,15,f.hair);}
 r(6,18,13,9,outline);r(7,19,11,7,f.coat);r(8,20,3,6,f.coatLight);r(15,20,2,6,f.coatLight);
 r(9,19,7,2,f.collar);r(11,19,3,2,f.scarf);r(12,21,2,4,f.scarf);
 p([[7,0],[17,0],[17,1],[20,1],[20,3],[22,3],[22,6],[23,6],[23,15],[21,15],[21,18],[19,18],[19,20],[5,20],[5,18],[3,18],[3,15],[1,15],[1,6],[2,6],[2,3],[4,3],[4,1],[7,1]],outline);
 p([[7,1],[17,1],[17,2],[19,2],[19,4],[21,4],[21,7],[22,7],[22,14],[20,14],[20,17],[18,17],[18,19],[6,19],[6,17],[4,17],[4,14],[2,14],[2,7],[3,7],[3,4],[5,4],[5,2],[7,2]],f.hair);
 p([[8,6],[17,6],[17,8],[19,8],[19,16],[17,16],[17,18],[7,18],[7,16],[5,16],[5,9],[7,9],[7,7],[8,7]],f.skinShade);
 r(7,8,11,9,f.skin);r(8,10,10,7,f.skinLight);r(8,17,9,1,f.skinLight);
 r(6,3,12,3,f.hairLight);r(4,6,7,2,f.hair);r(5,8,4,2,f.hair);r(17,6,3,3,f.hair);r(19,8,2,7,f.hair);
 if(f.hairStyle==='short'){r(3,14,3,4,outline);r(4,14,2,3,f.hair);r(19,14,3,4,outline);r(19,14,2,3,f.hair);}
 if(f.clip){r(5,5,3,1,f.clip);r(6,6,2,1,f.clip);}
 headwear(r,p,f,true);
 const blink=!walk&&Math.floor(t/100)%43>=40;
 for(const [xx,eye,side]of [[7,f.eyeLeft||f.eye,'left'],[14,f.eyeRight||f.eye,'right']]){
  r(xx,10,3,1,outline);
  if(f.eyePatch===side)r(xx,11,3,3,outline);
  else if(blink)r(xx,13,3,1,outline);
  else{r(xx,11,3,3,f.eyeWhite);r(xx+1,11,2,3,eye);r(xx+1,11,2,1,outline);}
 }
 r(6,15,2,1,f.blush);r(17,15,2,1,f.blush);r(11,17,2,1,f.mouth);
 const swing=walk?(phase?1:-1):0,armY=celebrate?14:23;
 r(4,armY-swing,4,4,outline);r(5,armY-swing+1,2,2,celebrate?f.skinLight:f.coatLight);
 r(18,armY+swing,4,4,outline);r(19,armY+swing+1,2,2,celebrate?f.skinLight:f.coatLight);
 if(!celebrate){r(5,armY-swing+3,2,1,f.skinLight);r(19,armY+swing+3,2,1,f.skinLight);}
 if(walk&&phase){r(8,27,3,3,f.pants);r(7,30,5,1,outline);r(13,27,3,2,f.pants);r(15,29,4,2,outline);}
 else{r(8,27,3,3,f.pants);r(8,30,4,1,outline);r(14,27,3,3,f.pants);r(14,30,5,1,outline);}
 c.restore();
}

function key(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);const a='#d7b758';rect(c,0,8,8,24,'#372e1c');rect(c,8,0,24,8,'#372e1c');rect(c,32,8,8,24,'#372e1c');rect(c,8,32,24,8,'#372e1c');rect(c,8,8,24,5,a);rect(c,8,27,24,5,a);rect(c,8,10,5,18,a);rect(c,27,10,5,18,a);rect(c,35,16,54,8,'#382f1b');rect(c,36,18,52,4,a);rect(c,67,22,7,17,a);rect(c,80,22,7,12,a);rect(c,10,8,15,3,'#f3d989');c.restore();}
function question(c,x,y,k=1){c.save();c.globalAlpha=k;text(c,'?',x,y,72,'#debf6e','center');c.restore();}

export class CinematicScene{
 constructor(episode){
  this.ep=episode;
  setLocale(episode.locale||'zh');
  this.scenePair=resolveScenePair(episode);
  this.backgrounds={};
  this.buildBackgrounds();
 }
 buildBackgrounds(){
  // Build only the presets this episode needs (defaults: workshop + archive).
  const needed=new Set([this.scenePair.big,this.scenePair.small,...SCENE_IDS.filter(id=>this.ep.preloadScenes?.includes(id))]);
  for(const name of needed)this.backgrounds[name]=buildPresetCanvas(name);
 }
 bg(which){return this.backgrounds[which]||this.backgrounds[this.scenePair.big]||Object.values(this.backgrounds)[0];}
 draw(canvas,ms){
  const c=canvas.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;ms=Math.max(0,Math.min(this.ep.durationMs-1,ms));
  if(ms<this.ep.cutMs)this.big(c,ms);else this.small(c,ms-this.ep.cutMs);
  vignette(c);this.hud(c,ms);this.caption(c,ms);
 }
 bigLegacy(c,tm){
  c.drawImage(this.bg(this.scenePair.big),0,0);
  // The opening holds on a portrait. Zoom is short and settles at 1.045.
  const z=lerp(1,1.045,ease(tm/1100));c.save();c.translate(850,510);c.scale(z,z);c.translate(-850,-510);
  spotlight(c,870,118,829,1010,.17);
  const talking=this.ep.voice.some(v=>tm>=v.at&&tm<v.end);frontActor(c,578,268+Math.round(Math.sin(tm/1200)*1.5),16,tm,this.ep.actor,talking);
  // Foreground occlusion is deliberately independent from the portrait.
  rect(c,291,799,1320,21,'#654a2f');rect(c,294,820,1313,32,'#30271e');rect(c,393,801,1081,4,'#b18d4e');
  panel(c,771,804,158,48);text(c,this.ep.actor.name,850,812,30,'#d7bd72','center');
  const booksIn=ease((tm-2200)/480);c.save();c.globalAlpha=booksIn;books(c,1260,770,3+Math.floor(clamp((tm-2250)/2000)*4),1);c.restore();
  if(tm>4350){const k=ease((tm-4350)/400);c.save();c.globalAlpha=k;panel(c,1222,354,335,184);text(c,t('noteSaved'),1248,374,30,'#b7c3a5');rect(c,1248,423,264,71,'#111b17');text(c,t('rememberQ'),1380,434,42,'#d4b063','center');if(tm>6800){rect(c,1291,511,190,3,'#9c7650');}c.restore();}
  c.restore();
 }
 smallLegacy(c,tm){
  c.drawImage(this.bg(this.scenePair.small),0,0);spotlight(c,846,158,828,746,.22);
  // A low-contrast dotted route remains part of the physical world.
  for(let x=358;x<1396;x+=29)rect(c,x,762+Math.sin(x/150)*3,7,5,'#547e65');
  const start=460,end=1392,travel=ease((tm-3100)/4300),x=lerp(start,end,travel),foot=lerp(741,682,clamp((x-1290)/130));
  const walking=tm>3100&&tm<7400;
  books(c,373,747,4,.69);
  sideActor(c,x,foot,6.1,tm,this.ep.actor,tm>8400?'celebrate':walking);
  // The key is authored as a prop; it leaves the archive and follows the hand.
  const pick=ease((tm-3550)/550),kx=lerp(697,x+117,pick),ky=lerp(602,foot-94,pick);if(tm>1300)key(c,kx,ky,.67);
  if(tm<2800)question(c,x+70,foot-251,ease((tm-200)/300));
  if(tm>6100){const open=ease((tm-6100)/900);rect(c,1510,225,174,376,'#151e17');rect(c,1515,228,174*open,370,'#ab985d');rect(c,1518,230,168*open,363,'#e1d19c');rect(c,1510+174*open,225,Math.max(8,174*(1-open)),376,'#354431');}
  if(tm>6900){const k=ease((tm-6900)/400);c.save();c.globalAlpha=k;panel(c,1070,302,330,82);text(c,t('extracted'),1235,325,30,'#acd4af','center');c.restore();}
 }
 big(c,tm){
  if(!this.ep.visualBeats)return this.bigLegacy(c,tm);
  const e=this.ep.visualBeats,l=this.ep.componentLabels||{};
  c.drawImage(this.bg(this.scenePair.big),0,0);
  const z=lerp(1,1.045,ease(tm/1100));c.save();c.translate(850,510);c.scale(z,z);c.translate(-850,-510);
  spotlight(c,870,118,829,1010,.17);
  const talking=this.ep.voice.some(v=>tm>=v.at&&tm<v.end);frontActor(c,578,268+Math.round(Math.sin(tm/1200)*1.5),16,tm,this.ep.actor,talking);
  rect(c,291,799,1320,21,'#654a2f');rect(c,294,820,1313,32,'#30271e');rect(c,393,801,1081,4,'#b18d4e');
  panel(c,771,804,158,48);text(c,this.ep.actor.name,850,812,30,'#d7bd72','center');
  if(e.collectAt!=null){
   const invAlpha=ease((tm-e.collectAt)/330),count=Math.min(7,1+Math.floor(Math.max(0,tm-e.collectAt)/410));
   drawInventory(c,{x:316,y:164,w:265,count,title:l.inventoryTitle,alpha:invAlpha});
   if(tm>e.collectAt){
    const arriving=Math.min(7,Math.floor(Math.max(0,tm-e.collectAt)/410));books(c,1319,773,Math.max(1,arriving),.94);
    for(let i=0;i<7;i++){
     const k=clamp((tm-e.collectAt-i*410)/690);if(k>0&&k<1){const x=lerp(1215,1375,k),y=lerp(160,735,k)-Math.sin(k*Math.PI)*62;drawPaper(c,{x,y,w:97,h:63,alpha:Math.sin(k*Math.PI)*.9});}
    }
   }
  }
  if(e.queryAt!=null&&tm>e.queryAt)drawRecallPanel(c,{x:1223,y:352,w:347,title:l.queryTitle,state:tm>e.queryAt+750?'failed':'empty',alpha:ease((tm-e.queryAt)/300)});
  if(e.contrastAt!=null&&tm>e.contrastAt){
   const k=ease((tm-e.contrastAt)/350);c.save();c.globalAlpha=k;panel(c,1219,573,354,64);text(c,l.contrast||t('contrast'),1396,591,30,'#c29b68','center');c.restore();
  }
  if(e.retrieveAt!=null&&tm>e.retrieveAt){
   const k=ease((tm-e.retrieveAt)/500);c.save();c.globalAlpha=k;panel(c,316,416,265,126);text(c,l.taskTitle||t('taskTitle'),448,432,30,'#d1bc7b','center');key(c,403,480,.9);c.restore();
   for(let i=0;i<9;i++){const q=clamp((tm-e.retrieveAt-i*65)/250);if(q>0)rect(c,326+i*26,577,11,6,'#7eae94');}
  }
  // Optional Phase-1 components: compare cards + step bar (opt-in via visualBeats times).
  if(e.compareAt!=null&&tm>e.compareAt){
   drawCompareCards(c,{x:600,y:160,w:680,title:l.compareTitle,leftTitle:l.compareLeft,rightTitle:l.compareRight,leftBody:l.compareLeftBody||'',rightBody:l.compareRightBody||'',highlight:tm>e.compareAt+1200?'right':null,alpha:ease((tm-e.compareAt)/300)});
  }
  if(e.stepsAt!=null&&tm>e.stepsAt){
   const steps=l.steps||[t('inventoryTitle'),t('queryTitle'),t('reward')];
   const cur=Math.min(steps.length-1,Math.floor(Math.max(0,tm-e.stepsAt)/900));
   drawStepBar(c,{x:510,y:720,w:900,steps,current:cur,title:l.stepBarTitle,alpha:ease((tm-e.stepsAt)/280)});
  }
  c.restore();
 }
 small(c,tm){
  if(!this.ep.visualBeats)return this.smallLegacy(c,tm);
  const e=this.ep.visualBeats,l=this.ep.componentLabels||{},ms=tm+this.ep.cutMs;
  c.drawImage(this.bg(this.scenePair.small),0,0);spotlight(c,846,158,828,746,.22);
  if(e.unlockAt!=null&&ms>e.unlockAt){const open=ease((ms-e.unlockAt)/850);rect(c,1510,225,174,376,'#151e17');rect(c,1515,228,174*open,370,'#ab985d');rect(c,1518,230,168*open,363,'#e1d19c');rect(c,1510+174*open,225,Math.max(8,174*(1-open)),376,'#354431');}
  for(let x=358;x<1396;x+=29)rect(c,x,762+Math.sin(x/150)*3,7,5,'#547e65');
  const start=470,end=1390,walkAt=e.walkAt??15400,travel=ease((ms-walkAt)/3800),x=lerp(start,end,travel),foot=lerp(741,682,clamp((x-1290)/130));
  const walking=ms>walkAt&&ms<walkAt+3800;
  if(e.closeAt!=null)drawOpenBook(c,{x:365,y:640,w:178,h:95,closed:ease((ms-e.closeAt)/650),mark:ms>(e.markAt??0)});
  sideActor(c,x,foot,6.1,tm,this.ep.actor,ms>(e.rewardAt??1e12)?'celebrate':walking);
  if(e.testAt!=null&&ms>e.testAt){
   const correct=ms>(e.correctAt??1e12),reveal=clamp((ms-(e.checkAt??ms))/350),typed=clamp((ms-e.testAt-580)/500);
   const answer=correct?(l.rightAnswer||''):(l.wrongAnswer||'').slice(0,Math.floor(typed*(l.wrongAnswer||'').length));
   drawQuizBoard(c,{x:683,y:249,w:670,prompt:l.prompt,answer,reference:l.rightAnswer,reveal,correct,mark:ms>(e.markAt??0)&&!correct,alpha:ease((ms-e.testAt)/330)});
  }
  if(e.markAt!=null&&ms>e.markAt){drawMarkerFlag(c,{x:671,y:740,alpha:ease((ms-e.markAt)/200)});if(ms<(e.correctAt??1e12))question(c,x+68,foot-246,ease((ms-e.markAt)/220));}
  if(e.checkAt!=null&&ms>e.checkAt)drawFeedback(c,{x:310,y:258,w:331,state:ms>(e.correctAt??1e12)?'correct':'pending',progress:ease((ms-(e.correctAt??ms))/600),alpha:ease((ms-e.checkAt)/250)});
  if(e.correctAt!=null&&ms>e.correctAt){const k=ease((ms-e.correctAt)/600);key(c,lerp(1195,x+118,k),lerp(583,foot-97,k),.76);}
  if(e.rewardAt!=null&&ms>e.rewardAt)drawRewardBadge(c,{x:1390,y:294,label:l.reward||t('reward'),alpha:ease((ms-e.rewardAt)/350)});
  if(e.compareAt!=null&&ms>e.compareAt&&e.compareAt>=this.ep.cutMs){
   drawCompareCards(c,{x:520,y:140,w:700,title:l.compareTitle,leftTitle:l.compareLeft,rightTitle:l.compareRight,leftBody:l.compareLeftBody||'',rightBody:l.compareRightBody||'',highlight:ms>e.compareAt+1000?'right':null,alpha:ease((ms-e.compareAt)/300)});
  }
  if(e.stepsAt!=null&&ms>e.stepsAt&&e.stepsAt>=this.ep.cutMs){
   const steps=l.steps||[t('inventoryTitle'),t('queryTitle'),t('reward')];
   const cur=Math.min(steps.length-1,Math.floor(Math.max(0,ms-e.stepsAt)/900));
   drawStepBar(c,{x:510,y:120,w:900,steps,current:cur,title:l.stepBarTitle,alpha:ease((ms-e.stepsAt)/280)});
  }
 }
 hud(c,ms){
  if(ms<this.ep.cutMs)return;
  const local=ms-this.ep.cutMs,current=this.ep.visualBeats?(ms<(this.ep.visualBeats.checkAt??ms+1)?1:2):(local<3400?0:local<6400?1:2),chapters=this.ep.chapters;
  rect(c,0,0,W,57,'#101512');
  chapters.forEach((name,i)=>{const x=i*W/chapters.length,w=W/chapters.length;if(i<=current)rect(c,x,0,w,57,i===current?'#383c33':'#292e27');if(i>0)rect(c,x,15,2,29,'#676c5b');text(c,name,x+w/2,14,30,i===current?'#e4e3cd':'#818977','center')});
  text(c,`${this.ep.author} · ${this.ep.title}`,1854,82,24,'#778372','right');
 }
 caption(c,ms){
  const line=this.ep.lines.find(v=>ms>=v.at&&ms<v.end);if(!line)return;
  const parts=line.text.split(/(\[\[.*?\]\])/g).filter(Boolean).map(s=>({text:s.replace(/\[\[|\]\]/g,''),kw:s.startsWith('[[')}));
  c.font=`72px ${FONT_FAMILY}`;c.textAlign='left';c.textBaseline='top';c.lineJoin='round';
  const widths=parts.map(p=>c.measureText(p.text).width),total=widths.reduce((a,b)=>a+b,0),x=(W-total)/2,y=971;
  // Pixel face and subtitle glyphs use independent detail scales. Outlines
  // are reference-like paper / ink / paper, not antialiased modern UI text.
  let xx=x;for(let i=0;i<parts.length;i++){const p=parts[i];c.strokeStyle='#eee9d6';c.lineWidth=17;c.strokeText(p.text,xx,y);c.strokeStyle='#182018';c.lineWidth=5;c.strokeText(p.text,xx,y);c.fillStyle=p.kw?'#d9a13e':'#e9e7d3';c.fillText(p.text,xx,y);xx+=widths[i];}
 }
}
