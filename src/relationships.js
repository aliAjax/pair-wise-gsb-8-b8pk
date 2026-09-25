// 关系账本的核心计算：态度分、计分、敌对判定、和解与旧存档迁移。
// 只做纯数据变换，不碰 localStorage，也不碰页面。

export const FACTIONS=[
  {id:'grayport',name:'灰港议会',color:'#d8a153'},
  {id:'mistwalker',name:'雾行者部族',color:'#93b7a6'},
  {id:'bell',name:'钟楼遗民',color:'#b9a6d1'},
];

export const MIN_SCORE=-5;
export const MAX_SCORE=5;
export const HOSTILE_AT=-3; // 态度分跌到 -3 及以下视为敌对

export const clampScore=v=>Math.max(MIN_SCORE,Math.min(MAX_SCORE,v));

export const tierOf=score=>
  score<=HOSTILE_AT?'敌对':
  score<0?'冷淡':
  score===0?'中立':
  score<=2?'友善':'同盟';

const keyOf=e=>`${e.chapterId}::${e.choiceId}`;

// 记一笔态度变化。同一章同一抉择（chapterId + choiceId）只计一次分：
// 重复记录时原样返回并标记 applied=false。分数夹在 -5..5。
export const applyChoice=(rel,{chapterId,choiceId,label,delta})=>{
  const k=keyOf({chapterId,choiceId});
  if(rel.history.some(h=>keyOf(h)===k))return{rel,applied:false};
  const score=clampScore(rel.score+delta);
  const entry={chapterId:String(chapterId),choiceId,label,delta,score};
  return{rel:{score,history:[...rel.history,entry]},applied:true};
};

// 和解：先回到中立（0 分），之前的变化记录全部保留在 history 里。
// 复用同一套去重键，同一章只能和解一次。
export const reconcile=(rel,{chapterId,label='和解'})=>
  applyChoice(rel,{chapterId,choiceId:`reconcile:${chapterId}`,label,delta:-rel.score});

// 若当前处于敌对，找出最近一次把关系推进敌对的那次抉择；否则返回 null。
export const hostileCause=rel=>{
  if(!rel||tierOf(rel.score)!=='敌对')return null;
  let prev=0,cause=null;
  for(const h of rel.history){
    if(prev>HOSTILE_AT&&h.score<=HOSTILE_AT)cause=h;
    prev=h.score;
  }
  return cause;
};

// 战利品锁定：关系敌对时锁定，并带上造成敌对的那次抉择。
export const lootLock=rel=>{
  const cause=hostileCause(rel);
  return{locked:!!cause,cause};
};

export const neutralRelations=()=>
  Object.fromEntries(FACTIONS.map(f=>[f.id,{score:0,history:[]}]));

// 旧存档迁移：给现有角色补上缺失的中立关系，越界分数夹回 -5..5，并补 loot 列表。
export const migrate=data=>{
  if(!data)return data;
  const characters=(data.characters||[]).map(c=>{
    const old=c.relations||{};
    const relations={};
    for(const f of FACTIONS){
      const r=old[f.id];
      relations[f.id]={
        score:clampScore(r?.score??0),
        history:Array.isArray(r?.history)?r.history:[],
      };
    }
    return{...c,relations};
  });
  return{...data,characters,loot:Array.isArray(data.loot)?data.loot:[]};
};
