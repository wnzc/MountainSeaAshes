
// Browser core for 9:21 preview — mirrors cocos/assets/scripts/BattleCore.ts
export const DESIGN = { width: 1080, height: 2520 };
export const Element = { FIRE: 0, WATER: 1, LIGHTNING: 2, WIND: 3, ICE: 4 };
export const ELEMENT_META = {
  0: { name: '炎', color: '#E85D3A' }, 1: { name: '沧', color: '#3BA7C4' },
  2: { name: '霆', color: '#7B5CFF' }, 3: { name: '岚', color: '#5CB88A' },
  4: { name: '霜', color: '#A8D4E8' },
};
export const SPIRITS = {
  'spirit.red_feather': { id:'spirit.red_feather', name:'赤羽', element:0, cost:40, range:220, attackInterval:0.9, damage:16, attackType:'projectile', splash:40, status:'BURN', statusDuration:2.5, projectileSpeed:420, skill:'fireball', upgradeCost:[50,90], upgradeDamage:[8,12] },
  'spirit.azure_scale': { id:'spirit.azure_scale', name:'沧璃', element:1, cost:50, range:230, attackInterval:1.1, damage:9, attackType:'projectile', status:'WET', statusDuration:3.5, projectileSpeed:380, skill:'water_orb', upgradeCost:[55,100], upgradeDamage:[5,8] },
  'spirit.thunder_horn': { id:'spirit.thunder_horn', name:'雷角', element:2, cost:60, range:240, attackInterval:0.75, damage:18, attackType:'beam', preferWet:true, status:'CHARGED', statusDuration:1.8, skill:'thunder_beam', upgradeCost:[70,120], upgradeDamage:[9,14] },
  'spirit.wind_fox': { id:'spirit.wind_fox', name:'风狸', element:3, cost:55, range:210, attackInterval:0.8, damage:7, attackType:'pulse', pulseRadius:110, spreadEnv:true, skill:'wind_pulse', upgradeCost:[55,100], upgradeDamage:[4,6] },
  'spirit.frost_fox': { id:'spirit.frost_fox', name:'霜狐', element:4, cost:55, range:225, attackInterval:0.9, damage:10, attackType:'projectile', status:'CHILL', statusDuration:2.8, projectileSpeed:400, skill:'ice_shard', upgradeCost:[55,100], upgradeDamage:[5,9] },
};
export const SPIRIT_ORDER = Object.keys(SPIRITS);
export const ENEMIES = {
  'enemy.ink_blob': { id:'enemy.ink_blob', name:'墨团', maxHp:80, speed:70, reward:8, radius:34, tag:'normal' },
  'enemy.ink_hound': { id:'enemy.ink_hound', name:'蚀犬', maxHp:55, speed:110, reward:9, radius:28, tag:'fast' },
  'enemy.ink_shell': { id:'enemy.ink_shell', name:'甲蚀', maxHp:220, speed:48, reward:16, radius:40, tag:'tank' },
  'enemy.ink_worm': { id:'enemy.ink_worm', name:'吞灵虫', maxHp:32, speed:82, reward:4, radius:22, tag:'swarm' },
  'enemy.mist_shade': { id:'enemy.mist_shade', name:'雾影', maxHp:70, speed:75, reward:12, radius:34, tag:'special' },
  'enemy.crack_shell': { id:'enemy.crack_shell', name:'裂壳兽', maxHp:140, speed:60, reward:14, radius:40, tag:'special', crack:true },
  'enemy.spirit_giant': { id:'enemy.spirit_giant', name:'噬灵魁', maxHp:480, speed:42, reward:40, radius:42, tag:'elite' },
  'enemy.ink_tiger': { id:'enemy.ink_tiger', name:'蚀山君', maxHp:1800, speed:38, reward:150, radius:64, tag:'boss', isBoss:true },
};
const REACTIONS = [
  { id:'conduct', name:'导电', a:1, b:2, damage:28 },
  { id:'freeze', name:'冻结', a:1, b:4, damage:12, freeze:true, duration:2.2, env:'ICE' },
  { id:'fire_vortex', name:'火旋风', a:0, b:3, damage:10, env:'FIRE_FIELD', tick:8 },
  { id:'steam', name:'蒸汽', a:0, b:1, damage:8, env:'STEAM' },
  { id:'melt', name:'融裂', a:0, b:4, damage:22, splash:70, env:'STEAM' },
  { id:'storm', name:'雷暴', a:2, b:3, damage:16, env:'STORM', tick:14 },
];
export function findReaction(a, b) {
  return REACTIONS.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)) || null;
}
export const MAP = {
  baseHp: 20, startingGold: 320,
  path: [
    {x:720,y:220},{x:740,y:320},{x:620,y:420},{x:480,y:520},{x:360,y:640},{x:340,y:780},
    {x:420,y:920},{x:560,y:1060},{x:700,y:1200},{x:760,y:1360},{x:720,y:1520},{x:600,y:1680},
    {x:480,y:1840},{x:420,y:2000},{x:480,y:2160},{x:540,y:2320},{x:540,y:2400},
  ],
  base: {x:540,y:2440},
  slots: [
    {id:'S1',pos:{x:480,y:340},neighbors:['S2','S3']},
    {id:'S2',pos:{x:880,y:360},neighbors:['S1','S4']},
    {id:'S3',pos:{x:240,y:700},neighbors:['S1','S5']},
    {id:'S4',pos:{x:700,y:760},neighbors:['S2','S5','S6']},
    {id:'S5',pos:{x:280,y:1160},neighbors:['S3','S4','S6','S7']},
    {id:'S6',pos:{x:860,y:1240},neighbors:['S4','S5','S8']},
    {id:'S7',pos:{x:260,y:1640},neighbors:['S5','S9']},
    {id:'S8',pos:{x:860,y:1700},neighbors:['S6','S10']},
    {id:'S9',pos:{x:300,y:2060},neighbors:['S7','S10']},
    {id:'S10',pos:{x:760,y:2120},neighbors:['S8','S9']},
  ],
  waterZones: [
    {id:'w1',pos:{x:400,y:700},size:{x:280,y:90}},
    {id:'w2',pos:{x:640,y:1780},size:{x:240,y:100}},
  ],
};
export const WAVES = [
  [{enemyId:'enemy.ink_blob',count:8,interval:1.4}],
  [{enemyId:'enemy.ink_blob',count:10,interval:1.15},{enemyId:'enemy.ink_hound',count:3,interval:1.98,delay:4}],
  [{enemyId:'enemy.ink_blob',count:6,interval:1.32},{enemyId:'enemy.ink_hound',count:5,interval:0.99,delay:2},{enemyId:'enemy.ink_shell',count:2,interval:3.3,delay:6}],
  [{enemyId:'enemy.ink_worm',count:12,interval:0.58},{enemyId:'enemy.ink_blob',count:4,interval:1.65,delay:3}],
  [{enemyId:'enemy.ink_shell',count:6,interval:2.31},{enemyId:'enemy.ink_blob',count:8,interval:0.91,delay:1.5},{enemyId:'enemy.mist_shade',count:2,interval:4.12,delay:4}],
  [{enemyId:'enemy.ink_blob',count:8,interval:0.82},{enemyId:'enemy.ink_hound',count:6,interval:0.91,delay:2},{enemyId:'enemy.ink_shell',count:3,interval:2.97,delay:5},{enemyId:'enemy.crack_shell',count:2,interval:4.95,delay:7}],
  [{enemyId:'enemy.ink_worm',count:16,interval:0.46},{enemyId:'enemy.ink_hound',count:8,interval:0.82,delay:2.5},{enemyId:'enemy.spirit_giant',count:1,interval:1.65,delay:10}],
  [{enemyId:'enemy.ink_tiger',count:1,interval:1.65},{enemyId:'enemy.ink_blob',count:6,interval:1.98,delay:3}],
];
export const CHAIN_WINDOW = 2.2;
export const BASE_GAP = 108;

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function smoothPath(src, steps=4) {
  const out=[]; const n=src.length;
  for (let i=0;i<n-1;i++){
    const p0=src[Math.max(i-1,0)], p1=src[i], p2=src[i+1], p3=src[Math.min(i+2,n-1)];
    for (let s=0;s<steps;s++){
      const t=s/steps,t2=t*t,t3=t2*t;
      out.push({
        x:0.5*(2*p1.x+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y:0.5*(2*p1.y+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });
    }
  }
  out.push(src[n-1]); return out;
}
export function pushOffPath(p, path, gap) {
  let bestD=Infinity, bestProj=p;
  for (let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1];
    const abx=b.x-a.x, aby=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*abx+(p.y-a.y)*aby)/((abx*abx+aby*aby)||1)));
    const proj={x:a.x+abx*t,y:a.y+aby*t};
    const d=dist(p,proj);
    if (d<bestD){bestD=d;bestProj=proj;}
  }
  if (bestD>=gap) return p;
  const side={x:p.x-bestProj.x,y:p.y-bestProj.y};
  const sl=Math.hypot(side.x,side.y)||1;
  return {x:bestProj.x+(side.x/sl)*gap, y:bestProj.y+(side.y/sl)*gap};
}
export function pointOnPath(path, t) {
  let total=0; const segs=[];
  for (let i=0;i<path.length-1;i++){const d=dist(path[i],path[i+1]); segs.push(d); total+=d;}
  let target=t*total;
  for (let i=0;i<segs.length;i++){
    if (target<=segs[i]||i===segs.length-1){
      const local=segs[i]===0?0:Math.min(1,target/segs[i]);
      const a=path[i],b=path[i+1];
      return {x:a.x+(b.x-a.x)*local, y:a.y+(b.y-a.y)*local};
    }
    target-=segs[i];
  }
  return path[path.length-1];
}
export class BattleCore {
  constructor(){
    this.path=smoothPath(MAP.path,4);
    this.pathLen=0;
    for(let i=0;i<this.path.length-1;i++) this.pathLen+=dist(this.path[i],this.path[i+1]);
    this.slots={};
    for(const s of MAP.slots) this.slots[s.id]={id:s.id,pos:pushOffPath(s.pos,MAP.path,BASE_GAP),neighbors:s.neighbors,spirit:null};
    this.gold=MAP.startingGold; this.baseHp=MAP.baseHp;
    this.waveIndex=0; this.betweenWaves=true; this.waveDelay=2; this.state='playing';
    this.enemies=[]; this.projectiles=[]; this.spirits=[]; this.spawnQueues=[];
    this.zones=MAP.waterZones.map(w=>({type:'NATURAL_WATER',pos:w.pos,size:w.size,persistent:true,expires:Infinity,tick:0}));
    this.chain=null; this.chainId=0; this.totalKills=0; this.selectedCard=''; this.selectedSlot='';
  }
  placeSpirit(slotId, spiritId){
    const slot=this.slots[slotId]; const cfg=SPIRITS[spiritId];
    if(!slot||!cfg||slot.spirit||this.gold<cfg.cost) return false;
    this.gold-=cfg.cost;
    slot.spirit={id:Math.random(),config:cfg,element:cfg.element,level:1,pos:slot.pos,cd:0,range:cfg.range,damage:cfg.damage,resonanceBonus:1};
    this.spirits.push(slot.spirit);
    let bonus=1;
    for(const nid of slot.neighbors){const o=this.slots[nid]; if(o?.spirit&&o.spirit.element!==slot.spirit.element) bonus+=0.2;}
    slot.spirit.resonanceBonus=Math.min(bonus,1.8);
    return true;
  }
  applyElement(target, incoming, duration){
    const now=performance.now()/1000;
    const existing=(target.element>=0&&now<target.elementUntil)?target.element:-1;
    if(existing>=0&&existing!==incoming){
      const r=findReaction(existing,incoming);
      if(r){ this.executeReaction(target,r); return; }
    }
    target.element=incoming; target.elementUntil=now+duration;
  }
  nextContext(){
    const now=performance.now()/1000;
    if(this.chain&&now-this.chain.lastAt<CHAIN_WINDOW){this.chain.lastAt=now;this.chain.chainLevel+=1;return this.chain;}
    this.chainId++; this.chain={chainId:this.chainId,chainLevel:1,lastAt:now,ultimateFired:false}; return this.chain;
  }
  damage(e, dmg){
    if(!e.alive||e._killed) return false;
    let d=dmg; if(e.config.tag==='tank'&&!e.shellBroken) d*=0.65;
    e.hp-=d;
    if(e.hp<=0){e.hp=0;e.alive=false;e._killed=true;this.totalKills++;this.gold+=e.reward;return true;}
    return false;
  }
  applyHit(e, dmg, element, status, duration){
    if(!e.alive||e._killed) return;
    const died=this.damage(e,dmg);
    if(died) return;
    if(status==='BURN') e.burnUntil=performance.now()/1000+duration;
    if(status==='CHILL'){e.slowUntil=performance.now()/1000+duration;e.slowFactor=0.55;}
    this.applyElement(e,element,duration);
  }
  executeReaction(target, r){
    const ctx=this.nextContext();
    this.damage(target, r.damage*(1+(ctx.chainLevel-1)*0.25));
    target.element=-1;
    if(r.freeze) target.frozenUntil=performance.now()/1000+(r.duration||2);
    if(r.env) this.zones.push({type:r.env,pos:{...target.pos},size:{x:100,y:56},persistent:false,expires:performance.now()/1000+3,tick:r.tick||0});
    if(r.splash) for(const e of this.enemies){ if(e!==target&&e.alive&&dist(target.pos,e.pos)<r.splash+e.radius) this.damage(e,r.damage*0.5); }
  }
  update(dt){
    if(this.state!=='playing') return;
    if(this.betweenWaves){
      this.waveDelay-=dt;
      if(this.waveDelay<=0){
        this.betweenWaves=false;
        this.spawnQueues=WAVES[this.waveIndex].map(e=>({...e,remaining:e.count,timer:e.delay||0}));
      }
    } else {
      for(const q of this.spawnQueues){
        q.timer-=dt;
        while(q.remaining>0&&q.timer<=0){
          const cfg=ENEMIES[q.enemyId];
          this.enemies.push({id:Math.random(),config:cfg,hp:cfg.maxHp,maxHp:cfg.maxHp,speed:cfg.speed,reward:cfg.reward,radius:cfg.radius,isBoss:!!cfg.isBoss,progress:0,pos:pointOnPath(this.path,0),alive:true,reached:false,_killed:false,frozenUntil:0,slowUntil:0,slowFactor:1,element:-1,elementUntil:0,burnUntil:0,burnTick:0,shellBroken:false});
          q.remaining--; q.timer+=q.interval;
        }
      }
      if(!this.spawnQueues.some(q=>q.remaining>0)&&!this.enemies.some(e=>e.alive&&!e.reached)){
        this.waveIndex++;
        if(this.waveIndex>=WAVES.length){this.state='victory';return;}
        this.betweenWaves=true; this.waveDelay=3; this.gold+=20+this.waveIndex*5;
      }
    }
    // spirits
    for(const s of this.spirits){
      s.cd-=dt; if(s.cd>0) continue;
      let best=null,bs=-Infinity;
      for(const e of this.enemies){
        if(!e.alive||e.reached) continue;
        if(dist(s.pos,e.pos)>s.range+e.radius) continue;
        const score=e.progress*1000+(s.config.preferWet&&e.element===1?500:0);
        if(score>bs){bs=score;best=e;}
      }
      if(!best) continue;
      s.cd=s.config.attackInterval;
      if(s.config.attackType==='projectile'){
        this.projectiles.push({pos:{x:s.pos.x,y:s.pos.y-20},target:best,speed:s.config.projectileSpeed||380,damage:s.damage,element:s.element,status:s.config.status||'',statusDuration:(s.config.statusDuration||2)*s.resonanceBonus,splash:s.config.splash||0,alive:true});
      } else if(s.config.attackType==='beam'){
        this.applyHit(best,s.damage,s.element,s.config.status||'',2);
      } else if(s.config.attackType==='pulse'){
        const r=s.config.pulseRadius||110;
        for(const e of this.enemies) if(e.alive&&dist(s.pos,e.pos)<=r+e.radius) this.applyHit(e,s.damage,s.element,s.config.status||'',2);
      }
    }
    // projectiles
    for(const p of this.projectiles){
      if(!p.alive) continue;
      const t=p.target; if(!t||!t.alive){p.alive=false;continue;}
      const dx=t.pos.x-p.pos.x,dy=t.pos.y-p.pos.y,d=Math.hypot(dx,dy)||1;
      const step=p.speed*dt;
      if(d<=step+t.radius){this.applyHit(t,p.damage,p.element,p.status,p.statusDuration);p.alive=false;}
      else {p.pos.x+=dx/d*step;p.pos.y+=dy/d*step;}
    }
    this.projectiles=this.projectiles.filter(p=>p.alive);
    // enemies
    const now=performance.now()/1000;
    for(const e of this.enemies){
      if(!e.alive||e.reached) continue;
      if(now<e.burnUntil){e.burnTick-=dt; if(e.burnTick<=0){e.burnTick=0.4;this.damage(e,4);}}
      if(e.element>=0&&now>e.elementUntil) e.element=-1;
      if(e.config.crack&&!e.shellBroken&&e.hp<e.maxHp*0.45){e.shellBroken=true;e.speed*=1.45;}
      if(e.progress>=1){
        e.alive=false;e.reached=true;this.baseHp-=e.isBoss?5:1;
        if(this.baseHp<=0){this.baseHp=0;this.state='defeat';}
        continue;
      }
      if(now<e.frozenUntil) continue;
      let sp=e.speed; if(now<e.slowUntil) sp*=e.slowFactor;
      e.progress=Math.min(1,e.progress+(sp*dt)/this.pathLen);
      e.pos=pointOnPath(this.path,e.progress);
    }
    this.enemies=this.enemies.filter(e=>e.alive);
    this.zones=this.zones.filter(z=>z.persistent||z.expires>now);
  }
}
