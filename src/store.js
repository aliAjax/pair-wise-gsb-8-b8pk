// 本地存档：读写 localStorage；打开旧存档时先过 migrate，给现有角色补上中立关系。
import{migrate,neutralRelations,applyChoice}from'./relationships.js';

const KEY='campaign-log';

// 给种子角色预置几笔账，打开页面就能看到账本的样子。
const seeded=spec=>{
  const relations=neutralRelations();
  for(const[factionId,entry]of spec)relations[factionId]=applyChoice(relations[factionId],entry).rel;
  return relations;
};

export const seed={
  name:'暮光边境',
  system:'D&D 5E',
  sessions:[
    {id:1,date:'2024-06-08',title:'第一章：灰港的钟声',summary:'队伍抵达灰港，在失落的钟楼发现了神秘符文。',tag:'主线',color:'#d8a153'},
    {id:2,date:'2024-06-15',title:'第二章：雾中来客',summary:'与流浪法师伊琳结盟，追踪海雾中的脚印。',tag:'主线',color:'#93b7a6'},
    {id:3,date:'2024-06-22',title:'支线：深林采药',summary:'帮助村民寻找月光草，获得一枚古老铜币。',tag:'支线',color:'#b9a6d1'},
  ],
  characters:[
    {name:'艾德里安',role:'圣骑士',player:'林默',color:'#d8a153',relations:seeded([
      ['grayport',{chapterId:'1',choiceId:'守护钟楼',label:'守护钟楼',delta:2}],
      ['bell',{chapterId:'1',choiceId:'交出符文',label:'把符文交给遗民',delta:1}],
    ])},
    {name:'瑟琳',role:'游侠',player:'安然',color:'#93b7a6',relations:seeded([
      ['mistwalker',{chapterId:'2',choiceId:'共享篝火',label:'与雾行者共享篝火',delta:1}],
    ])},
    {name:'莫尔',role:'术士',player:'周岳',color:'#b9a6d1',relations:seeded([
      ['bell',{chapterId:'1',choiceId:'私藏符文',label:'私藏了一枚符文',delta:-2}],
      ['grayport',{chapterId:'2',choiceId:'顶撞卫兵',label:'顶撞灰港卫兵',delta:-1}],
    ])},
  ],
  loot:[
    {id:1,name:'月光草 ×3',kind:'消耗品',faction:null,holder:null},
    {id:2,name:'古老铜币',kind:'遗物',faction:'bell',holder:null},
    {id:3,name:'灰港守卫徽章 ×2',kind:'任务物品',faction:'grayport',holder:null},
  ],
};

export const load=()=>{
  try{
    const raw=localStorage.getItem(KEY);
    return migrate(raw?JSON.parse(raw):seed);
  }catch{
    return migrate(seed);
  }
};

export const save=data=>{
  try{localStorage.setItem(KEY,JSON.stringify(data))}catch{/* 存储不可用时不打断使用 */}
};
