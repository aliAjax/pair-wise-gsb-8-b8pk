import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import'./styles.css';
import{load,save}from'./store.js';
import{FACTIONS,MIN_SCORE,MAX_SCORE,tierOf,applyChoice,reconcile,hostileCause,lootLock}from'./relationships.js';

const TIER_COLOR={敌对:'#b4553f',冷淡:'#c08a3e',中立:'#8a9892',友善:'#7fa06a',同盟:'#4f8f7b'};
const factionName=id=>FACTIONS.find(f=>f.id===id)?.name||'未知阵营';
const fmt=v=>(v>0?`+${v}`:`${v}`);

function App(){
  const[data,setData]=useState(load);
  const[tab,setTab]=useState('timeline');
  const[active,setActive]=useState(1);
  const[show,setShow]=useState(false);
  const[notice,setNotice]=useState('');
  const[form,setForm]=useState({title:'',date:'2024-07-01',summary:'',tag:'主线'});
  // 关系账本
  const[charSel,setCharSel]=useState(null);
  const[entry,setEntry]=useState({factionId:FACTIONS[0].id,chapterId:'1',choice:'',delta:1});
  const[lockNote,setLockNote]=useState({}); // lootId -> 锁定说明

  useEffect(()=>save(data),[data]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2800);return()=>clearTimeout(t)},[notice]);

  const cur=data.sessions.find(x=>x.id===active)||data.sessions[0];
  const selChar=data.characters.find(c=>c.name===charSel)||data.characters[0];
  const chapTitle=id=>data.sessions.find(s=>String(s.id)===String(id))?.title||'未知章节';
  const entryChapter=data.sessions.some(s=>String(s.id)===String(entry.chapterId))?entry.chapterId:String(data.sessions[0]?.id);
  const latestChapter=String(data.sessions[data.sessions.length-1]?.id);

  const add=()=>{if(!form.title)return;const s={...form,id:Date.now(),color:'#d8a153'};setData({...data,sessions:[...data.sessions,s]});setActive(s.id);setForm({title:'',date:'2024-07-01',summary:'',tag:'主线'});setShow(false);setNotice('新章节已加入时间线')};
  const exportData=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='campaign.json';a.click();setNotice('战役记录已导出')};

  // —— 关系账本 ——
  const patchRelations=(name,factionId,rel)=>setData(d=>({...d,characters:d.characters.map(c=>c.name===name?{...c,relations:{...c.relations,[factionId]:rel}}:c)}));

  const recordChoice=()=>{
    const label=entry.choice.trim();
    if(!label||!selChar)return;
    const{rel,applied}=applyChoice(selChar.relations[entry.factionId],{chapterId:entryChapter,choiceId:label,label,delta:Number(entry.delta)});
    if(!applied){setNotice(`「${label}」在${chapTitle(entryChapter)}已记过，不重复计分`);return;}
    patchRelations(selChar.name,entry.factionId,rel);
    setEntry({...entry,choice:''});
    setNotice(`已入账：${selChar.name} 对${factionName(entry.factionId)} ${fmt(entry.delta)}，现为 ${fmt(rel.score)}`);
  };

  const doReconcile=factionId=>{
    const{rel,applied}=reconcile(selChar.relations[factionId],{chapterId:latestChapter});
    if(!applied){setNotice(`${chapTitle(latestChapter)}已经记过和解了`);return;}
    patchRelations(selChar.name,factionId,rel);
    setNotice(`${selChar.name} 与${factionName(factionId)}和解，关系先回到中立`);
  };

  // —— 战利品 ——
  const assign=(item,char)=>{
    if(item.faction){
      const{locked,cause}=lootLock(char.relations[item.faction]);
      if(locked){
        setLockNote({...lockNote,[item.id]:`${char.name} 与${factionName(item.faction)}已敌对，无法交接。起因：${chapTitle(cause.chapterId)} ·「${cause.label}」`});
        return;
      }
    }
    setData(d=>({...d,loot:d.loot.map(l=>l.id===item.id?{...l,holder:char.name}:l)}));
    setLockNote({...lockNote,[item.id]:null});
    setNotice(`${item.name} 已分给 ${char.name}`);
  };
  const unassign=item=>setData(d=>({...d,loot:d.loot.map(l=>l.id===item.id?{...l,holder:null}:l)}));

  return <div className="shell"><aside><div className="logo"><span>✦</span> CAMPAIGNER</div><div className="campaign"><small>当前战役</small><strong>{data.name}</strong><span>{data.system} · 2024</span></div><nav>{[['timeline','◌','时间线'],['characters','♙','角色与阵营'],['places','⌖','地点图鉴'],['loot','◇','战利品']].map(([id,i,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><i>{i}</i>{t}</button>)}</nav><div className="side-bottom"><button>⚙ 偏好设置</button><small>本地存储已开启</small></div></aside><main><header><div><span className="crumb">MY CAMPAIGN / {data.system}</span><h1>{tab==='timeline'?'战役时间线':tab==='characters'?'角色与阵营':tab==='places'?'地点图鉴':'战利品'}</h1></div><div className="actions"><button onClick={exportData} className="outline">↓ 导出</button><button onClick={()=>setShow(true)} className="primary">＋ 新建章节</button></div></header>

  {tab==='timeline'&&<div className="timeline-layout"><section className="timeline"><div className="timeline-intro"><div><span>THE CHRONICLE</span><h2>记录每一次冒险</h2></div><span className="count">{data.sessions.length} CHAPTERS</span></div>{data.sessions.map((s,i)=><button className={'chapter '+(active===s.id?'selected':'')} onClick={()=>setActive(s.id)} key={s.id}><div className="date"><b>{new Date(s.date).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})}</b><small>{new Date(s.date).getFullYear()}</small></div><div className="line"><span style={{background:s.color}}></span>{i<data.sessions.length-1&&<i/>}</div><div className="chapter-copy"><div className="tag">{s.tag}</div><h3>{s.title}</h3><p>{s.summary}</p></div><span className="arrow">↗</span></button>)}</section><section className="detail-panel"><div className="detail-cover" style={{background:cur?.color}}><span>CHAPTER {String(data.sessions.findIndex(x=>x.id===active)+1).padStart(2,'0')}</span><i>✦</i></div><div className="detail-body"><span className="tag">{cur?.tag}</span><h2>{cur?.title}</h2><p>{cur?.summary}</p><div className="meta-grid"><div><small>游戏日期</small><strong>{cur?.date}</strong></div><div><small>参与者</small><strong>{data.characters.length} 位玩家</strong></div></div><div className="note"><span>✎</span><div><strong>笔记</strong><p>点击编辑这一章节的剧情细节、重要决定和未解线索。</p></div><button onClick={()=>setNotice('笔记编辑已开启')}>编辑</button></div></div></section></div>}

  {tab==='characters'&&<div className="ledger-layout">
    <section className="char-rail">
      <div className="section-note">队伍中有 {data.characters.length} 位冒险者，点选角色查看关系账本。</div>
      {data.characters.map(c=><button className={'char-card '+(selChar?.name===c.name?'selected':'')} onClick={()=>setCharSel(c.name)} key={c.name}>
        <div className="avatar" style={{background:c.color}}>{c.name[0]}</div>
        <div><small>{c.role}</small><h3>{c.name}</h3><p>玩家 · {c.player}</p></div>
        <span className="rail-arrow">↗</span>
      </button>)}
    </section>
    {selChar&&<section className="ledger">
      <div className="ledger-head"><span className="crumb">RELATION LEDGER</span><h2>{selChar.name} 的关系账本</h2></div>
      <div className="entry-form">
        <select value={entry.factionId} onChange={e=>setEntry({...entry,factionId:e.target.value})}>{FACTIONS.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>
        <select value={entryChapter} onChange={e=>setEntry({...entry,chapterId:e.target.value})}>{data.sessions.map(s=><option value={String(s.id)} key={s.id}>{s.title}</option>)}</select>
        <input value={entry.choice} onChange={e=>setEntry({...entry,choice:e.target.value})} placeholder="触发抉择，例：放走俘虏"/>
        <select value={entry.delta} onChange={e=>setEntry({...entry,delta:Number(e.target.value)})}>{[-5,-4,-3,-2,-1,1,2,3,4,5].map(d=><option value={d} key={d}>{fmt(d)}</option>)}</select>
        <button className="primary" onClick={recordChoice}>记一笔</button>
      </div>
      <div className="rel-grid">
        {FACTIONS.map(f=>{
          const rel=selChar.relations[f.id];
          const tier=tierOf(rel.score);
          const cause=hostileCause(rel);
          return <article className="rel-panel" key={f.id}>
            <header><strong>{f.name}</strong><span className="tier" style={{background:TIER_COLOR[tier]}}>{tier}</span></header>
            <div className="score-line"><b>{fmt(rel.score)}</b><small>{MIN_SCORE} ~ {MAX_SCORE}</small></div>
            <div className="meter"><i style={{left:`calc(${(rel.score-MIN_SCORE)/(MAX_SCORE-MIN_SCORE)*100}% - 5px)`,background:TIER_COLOR[tier]}}/></div>
            <ul className="hist">
              {rel.history.length===0&&<li className="none">还没有记录，保持中立。</li>}
              {rel.history.map((h,i)=><li key={i}>
                <span className={'delta '+(h.delta>0?'up':h.delta<0?'down':'')}>({fmt(h.delta)})</span>
                <div><b>{h.label}</b><small>{chapTitle(h.chapterId)}</small></div>
                <em>{fmt(h.score)}</em>
              </li>)}
            </ul>
            {cause&&<div className="hostile-note">已敌对 —— 因 {chapTitle(cause.chapterId)} ·「{cause.label}」</div>}
            {rel.score<0&&<button className="outline reconcile" onClick={()=>doReconcile(f.id)}>♡ 和解（回到中立）</button>}
          </article>;
        })}
      </div>
    </section>}
  </div>}

  {tab==='places'&&<section className="empty"><div>⌖</div><h2>地点图鉴</h2><p>从章节笔记中收集地点。当前已记录灰港、雾林和失落钟楼。</p><div className="place-list"><span>01　灰港 <b>已探索</b></span><span>02　失落钟楼 <b>已探索</b></span><span>03　雾林 <b>待探索</b></span></div></section>}

  {tab==='loot'&&<section className="loot">
    <div className="section-note">把战利品分给队员；与物品关联阵营敌对的成员会被锁定，并标出翻脸的那次抉择。</div>
    {data.loot.map(item=>{
      const fac=FACTIONS.find(f=>f.id===item.faction);
      return <article className="loot-item" key={item.id}>
        <div className="loot-main">
          <div><h3>{item.name}</h3><p>{item.kind}{fac?` · 关联阵营：${fac.name}`:' · 无阵营关联'}</p></div>
          {item.holder
            ?<span className="holder">持有者：{item.holder} <button onClick={()=>unassign(item)}>收回</button></span>
            :<span className="holder none">未分配</span>}
        </div>
        <div className="assign">
          {data.characters.map(c=>{
            const lock=item.faction?lootLock(c.relations[item.faction]):{locked:false};
            return <button key={c.name} className={'chip '+(lock.locked?'locked ':'')+(item.holder===c.name?'current':'')} onClick={()=>assign(item,c)}>{lock.locked?'🔒 ':''}{c.name}</button>;
          })}
        </div>
        {lockNote[item.id]&&<div className="lock-note">🔒 {lockNote[item.id]}</div>}
      </article>;
    })}
  </section>}

  </main>{show&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW CHAPTER</span><h2>记录新的章节</h2><label>章节标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="例：第三章：月下集市"/></label><label>游戏日期<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>章节摘要<textarea rows="3" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="发生了什么？"/></label><label>章节类型<select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})}><option>主线</option><option>支线</option><option>番外</option></select></label><button className="primary full" onClick={add}>保存章节</button></div></div>}{notice&&<div className="toast">{notice}</div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
