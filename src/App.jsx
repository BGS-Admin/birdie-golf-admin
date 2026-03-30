import React, { useState, useCallback, useEffect } from "react";

/* ─── Supabase & Square ─── */
const SB_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";
const H={"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};
const db={
  get:async(t,q="")=>{try{const r=await fetch(`${SB_URL}/rest/v1/${t}?${q}`,{headers:H});return r.ok?await r.json():[];}catch{return[];}},
  post:async(t,d)=>{try{const r=await fetch(`${SB_URL}/rest/v1/${t}`,{method:"POST",headers:H,body:JSON.stringify(d)});return r.ok?await r.json():null;}catch{return null;}},
  patch:async(t,q,d)=>{try{const r=await fetch(`${SB_URL}/rest/v1/${t}?${q}`,{method:"PATCH",headers:H,body:JSON.stringify(d)});return r.ok?await r.json():null;}catch{return null;}},
  del:async(t,q)=>{try{await fetch(`${SB_URL}/rest/v1/${t}?${q}`,{method:"DELETE",headers:H});return true;}catch{return false;}},
};
const sq=async(action,p={})=>{try{const r=await fetch(`${SB_URL}/functions/v1/square-proxy`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},body:JSON.stringify({action,...p})});return r.ok?await r.json():null;}catch{return null;}};

/* ─── Design System ─── */
const ff="'DM Sans',sans-serif",mono="'JetBrains Mono',monospace";
const GREEN="#2D8A5E",DARK="#0B2E1A",PURPLE="#5B6DCD",ORANGE="#E8890C",RED="#E03928";
const TC={none:"#888",starter:"#4A8B6E",player:GREEN,champion:"#124A2B"};
const TN={none:"Non-Member",starter:"Starter",player:"Player",champion:"Champion"};
const TB={starter:"STR",player:"PLR",champion:"CHP"};
const BK_C={bay_member:GREEN,bay_walkin:"#888",lesson:PURPLE};
const TIERS=[{id:"starter",n:"Starter",p:45,c:"#4A8B6E",badge:"STR",hrs:0,perks:["20% off hourly bay rate"]},{id:"player",n:"Player",p:200,c:GREEN,badge:"PLR",hrs:8,perks:["8 hrs bay rental/mo","20% off additional hours","15% off F&B","10% off retail","Club storage","Members-only events"]},{id:"champion",n:"Champion",p:600,c:"#124A2B",badge:"CHP",hrs:-1,perks:["Unlimited bay rental (max 2hr/booking)","15% off F&B","10% off retail","Club storage","Members-only events"]}];

/* Icons */
const Ic=({d,z=18})=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const X={cal:z=><Ic z={z} d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18"/>,user:z=><Ic z={z} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/>,crown:z=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/></svg>,wrench:z=><Ic z={z} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,search:z=><Ic z={z} d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35"/>,plus:z=><Ic z={z} d="M12 5v14M5 12h14"/>,clock:z=><Ic z={z} d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"/>,bar:z=><Ic z={z} d="M18 20V10M12 20V4M6 20v-6"/>,chevL:z=><Ic z={z} d="M15 18l-6-6 6-6"/>,chevR:z=><Ic z={z} d="M9 18l6-6-6-6"/>,out:z=><Ic z={z} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>,chk:z=><Ic z={z} d="M20 6L9 17l-5-5"/>};

/* Time helpers */
const SLOTS=["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"];
function toH(s){const[t,ap]=s.split(" ");let[h,m]=t.split(":").map(Number);if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return h+m/60;}
function dateKey(d){return d.toISOString().split("T")[0];}
function fmtDateShort(d){return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});}
function fmtDateFull(d){return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
const isWknd=(d)=>d.getDay()===0||d.getDay()===6;
const getSlots=(d)=>isWknd(d)?SLOTS.filter(s=>{const h=toH(s);return h>=9&&h<21;}):SLOTS;

/* ─── Team ─── */
const TEAM=[{id:"TM4y",name:"Daniel Duran",title:"Owner"},{id:"TMBe",name:"Marco Montilla",title:"Owner"}];

/* ═══════════════════════════════════════════════════════════ */
export default function AdminApp(){
  const[logged,setLogged]=useState(false);
  const[uN,setUN]=useState("");
  const[view,setView]=useState("res");
  const[toast,setToast]=useState(null);
  const[cfg,setCfg]=useState({pk:75,op:50,wk:50});
  const[loading,setLoading]=useState(false);

  /* Data */
  const[customers,setCustomers]=useState([]);
  const[bookings,setBookings]=useState([]);
  const[bayBlocks,setBayBlocks]=useState([]);

  /* Reservations */
  const[resDate,setResDate]=useState(new Date());
  const[selB,setSelB]=useState(null);
  const[custSearch,setCustSearch]=useState("");

  /* Members */
  const[memTier,setMemTier]=useState("player");
  const[memModal,setMemModal]=useState(null);

  /* Facility */
  const[facTab,setFacTab]=useState("bays");
  const[newBlock,setNewBlock]=useState({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});

  const fire=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),3200);},[]);
  const cn=(c)=>(c.first_name||"")+" "+(c.last_name||"");

  /* ─── Load ─── */
  const load=useCallback(async()=>{
    setLoading(true);
    const[c,b,bl,pr]=await Promise.all([db.get("customers","select=*&order=created_at.desc"),db.get("bookings","select=*&order=created_at.desc&limit=200"),db.get("bay_blocks","select=*"),db.get("pricing_config","select=*")]);
    setCustomers(c||[]);setBookings(b||[]);setBayBlocks(bl||[]);
    if(pr?.[0])setCfg({pk:pr[0].peak_rate,op:pr[0].off_peak_rate,wk:pr[0].weekend_rate});
    setLoading(false);
  },[]);
  useEffect(()=>{if(logged)load();},[logged,load]);

  /* ─── Login ─── */
  if(!logged)return(<div style={LS.w}><style>{CSS}</style><div style={LS.c}>
    <div style={{textAlign:"center",marginBottom:20}}><h1 style={{fontFamily:mono,fontSize:16,fontWeight:700,color:DARK,letterSpacing:3}}>BIRDIE GOLF STUDIOS</h1><p style={{fontSize:12,color:"#888",marginTop:4}}>Admin Dashboard</p></div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>{TEAM.map(t=><button key={t.id} style={LS.rb} onClick={()=>{setUN(t.name);setLogged(true);}}>
      <div style={LS.ri}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
      <div style={{flex:1,textAlign:"left"}}><p style={{fontSize:14,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:"#888"}}>{t.title}</p></div>
    </button>)}</div>
  </div></div>);

  /* ─── Helpers ─── */
  const dayBookings=bookings.filter(b=>b.date===dateKey(resDate));
  const getBkAt=(bay,slot)=>{
    const si=SLOTS.indexOf(slot);
    return dayBookings.find(b=>{
      if(b.bay!==bay)return false;
      const bsi=SLOTS.indexOf(b.start_time);
      return bsi>=0&&si>=bsi&&si<bsi+(b.duration_slots||2);
    });
  };
  const getBkColor=(b)=>{
    if(!b)return null;
    if(b.type==="lesson")return BK_C.lesson;
    const cust=customers.find(c=>c.id===b.customer_id);
    return(cust?.tier&&cust.tier!=="none")?BK_C.bay_member:BK_C.bay_walkin;
  };
  const isBlocked=(bay,slot)=>{
    const dk=dateKey(resDate);
    return bayBlocks.some(bl=>{
      if(!(bl.bays||[]).includes(bay))return false;
      const from=bl.from_date||bl.from,to=bl.to_date||bl.to;
      if(dk<from||dk>to)return false;
      if(bl.all_day||bl.allDay)return true;
      const tf=bl.time_from||bl.timeFrom,tt=bl.time_to||bl.timeTo;
      if(!tf||!tt)return true;
      const th=toH(slot);return th>=toH(tf)&&th<toH(tt);
    });
  };

  /* ─── Nav ─── */
  const nav=[{k:"res",l:"Reservations",ic:X.cal},{k:"cust",l:"Customers",ic:X.user},{k:"members",l:"Members",ic:X.crown},{k:"reports",l:"Reports",ic:X.bar},{k:"facility",l:"Facility",ic:X.wrench}];
  let content=null;

  /* ═══════════════════════════════════════════
     RESERVATIONS — Bay Grid View
     ═══════════════════════════════════════════ */
  if(view==="res"){
    const slots=getSlots(resDate);
    const isToday=dateKey(resDate)===dateKey(new Date());
    content=<div style={{padding:"20px 20px 40px",overflowX:"auto"}}>
      {/* Header: date nav + new booking */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button style={S.navArr} onClick={()=>setResDate(addDays(resDate,-1))}>{X.chevL(18)}</button>
          <div style={{textAlign:"center",minWidth:200}}>
            <h2 style={{fontSize:18,fontWeight:700}}>{fmtDateFull(resDate)}</h2>
            {isToday&&<span style={{fontSize:10,fontWeight:700,color:GREEN,background:GREEN+"14",padding:"2px 8px",borderRadius:6}}>TODAY</span>}
          </div>
          <button style={S.navArr} onClick={()=>setResDate(addDays(resDate,1))}>{X.chevR(18)}</button>
          <button style={{...S.navArr,fontSize:11,width:"auto",padding:"0 12px"}} onClick={()=>setResDate(new Date())}>Today</button>
        </div>
        <button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={()=>setSelB({isNew:true,type:"bay",bay:1,time:"9:00 AM",dur:"1h",date:dateKey(resDate),cust:"",newCust:false,notes:""})}>{X.plus(14)} New Booking</button>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,marginBottom:12,flexWrap:"wrap"}}>
        {[{l:"Member Bay",c:BK_C.bay_member},{l:"Walk-in Bay",c:BK_C.bay_walkin},{l:"Lesson",c:BK_C.lesson},{l:"Blocked",c:RED}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:3,background:x.c}}/><span style={{fontSize:10,color:"#888"}}>{x.l}</span></div>)}
      </div>

      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:"80px repeat(5,1fr)",border:"1px solid #e8e8e6",borderRadius:12,overflow:"hidden",background:"#fff",minWidth:700}}>
        {/* Header row */}
        <div style={GS.hdr}><span style={{fontSize:11,fontWeight:700,color:"#888"}}>TIME</span></div>
        {[1,2,3,4,5].map(b=><div key={b} style={GS.hdr}><span style={{fontSize:13,fontWeight:700}}>Bay {b}</span></div>)}

        {/* Time rows */}
        {slots.map(slot=>{
          const rendered=new Set();
          return <React.Fragment key={slot}>
            <div style={GS.timeCell}><span style={{fontSize:11,color:"#888",fontFamily:mono}}>{slot}</span></div>
            {[1,2,3,4,5].map(bay=>{
              const bk=getBkAt(bay,slot);
              const blocked=isBlocked(bay,slot);
              const color=getBkColor(bk);
              const bkKey=bk?.id;

              // Only render booking block on first slot
              if(bk&&!rendered.has(bkKey)){
                rendered.add(bkKey);
                const cust=customers.find(c=>c.id===bk.customer_id);
                const name=cust?cn(cust):"Walk-in";
                const isMem=cust?.tier&&cust.tier!=="none";
                const h=Math.max((bk.duration_slots||2)*28,28);
                return <div key={bay} style={{...GS.cell,position:"relative"}}>
                  <div style={{...GS.booking,background:color+"20",borderLeft:`3px solid ${color}`,height:h,cursor:"pointer"}} onClick={()=>setSelB({...bk,custName:name,custTier:cust?.tier,notes:bk.admin_notes||""})}>
                    <p style={{fontSize:10,fontWeight:700,color,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{name}</p>
                    <div style={{display:"flex",gap:4,alignItems:"center",marginTop:1}}>
                      {isMem&&<span style={{fontSize:7,fontWeight:800,color:"#fff",background:TC[cust.tier],padding:"1px 4px",borderRadius:3,fontFamily:mono}}>{TB[cust.tier]}</span>}
                      {bk.type==="lesson"&&bk.coach_name&&<span style={{fontSize:7,fontWeight:800,color:"#fff",background:PURPLE,padding:"1px 4px",borderRadius:3,fontFamily:mono}}>{bk.coach_name.split(" ").map(w=>w[0]).join("")}</span>}
                      <span style={{fontSize:9,color:"#888"}}>{(bk.duration_slots||2)*0.5}hr</span>
                    </div>
                  </div>
                </div>;
              }
              // Already rendered this booking in a previous slot
              if(bk&&rendered.has(bkKey)) return <div key={bay} style={GS.cell}/>;
              // Blocked
              if(blocked) return <div key={bay} style={{...GS.cell,background:RED+"10"}}><div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,color:RED,fontWeight:700}}>BLOCKED</span></div></div>;
              // Empty — clickable to create
              return <div key={bay} style={{...GS.cell,cursor:"pointer"}} onClick={()=>setSelB({isNew:true,type:"bay",bay,time:slot,dur:"1h",date:dateKey(resDate),cust:"",newCust:false,notes:""})}>
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",opacity:0}}><span style={{fontSize:9,color:"#ccc"}}>+</span></div>
              </div>;
            })}
          </React.Fragment>;
        })}
      </div>

      {/* Booking Modal */}
      {selB&&<div style={S.ov} onClick={()=>{setSelB(null);setCustSearch("");}}><div style={{...S.mod,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:14}}>{selB.isNew?"New Booking":"Booking Details"}</h3>

        {/* Customer */}
        {selB.isNew?<>
          <label style={GS.label}>CUSTOMER</label>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button style={{...GS.togBtn,...(!selB.newCust?{background:GREEN,color:"#fff",borderColor:GREEN}:{})}} onClick={()=>setSelB(p=>({...p,newCust:false}))}>Existing</button>
            <button style={{...GS.togBtn,...(selB.newCust?{background:GREEN,color:"#fff",borderColor:GREEN}:{})}} onClick={()=>setSelB(p=>({...p,newCust:true,cust:""}))}>New</button>
          </div>
          {selB.newCust?<div style={{background:"#fafaf8",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            <div style={{display:"flex",gap:8}}><div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FIRST NAME *</label><input style={GS.input} value={selB.firstName||""} onChange={e=>setSelB(p=>({...p,firstName:e.target.value}))}/></div><div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>LAST NAME *</label><input style={GS.input} value={selB.lastName||""} onChange={e=>setSelB(p=>({...p,lastName:e.target.value}))}/></div></div>
            <div><label style={{...GS.label,fontSize:10}}>PHONE *</label><input style={GS.input} value={selB.phone||""} onChange={e=>setSelB(p=>({...p,phone:e.target.value}))}/></div>
            <div><label style={{...GS.label,fontSize:10}}>EMAIL</label><input style={GS.input} value={selB.email||""} onChange={e=>setSelB(p=>({...p,email:e.target.value}))}/></div>
          </div>:<div style={{marginBottom:12}}>
            <input style={GS.input} placeholder="Search by name or phone..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
            {custSearch&&<div style={{border:"1px solid #e8e8e6",borderRadius:8,marginTop:4,maxHeight:150,overflowY:"auto"}}>
              {customers.filter(c=>cn(c).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch)).slice(0,8).map(c=>
                <div key={c.id} style={{padding:"8px 12px",borderBottom:"1px solid #f2f2f0",cursor:"pointer",fontSize:13}} onClick={()=>{setSelB(p=>({...p,cust:cn(c),custId:c.id}));setCustSearch("");}}>
                  <span style={{fontWeight:600}}>{cn(c)}</span> <span style={{color:"#888",fontSize:11}}>{c.phone}</span>
                  {c.tier&&c.tier!=="none"&&<span style={{fontSize:8,fontWeight:700,color:"#fff",background:TC[c.tier],padding:"2px 6px",borderRadius:4,marginLeft:6,fontFamily:mono}}>{TB[c.tier]}</span>}
                </div>)}
            </div>}
            {selB.cust&&<p style={{fontSize:13,fontWeight:600,marginTop:8,color:GREEN}}>✓ {selB.cust}</p>}
          </div>}
        </>:<div style={{marginBottom:12}}><label style={GS.label}>CUSTOMER</label><p style={{fontSize:14,fontWeight:600}}>{selB.custName||"Customer"} {selB.custTier&&selB.custTier!=="none"&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:TC[selB.custTier],padding:"2px 6px",borderRadius:4,fontFamily:mono}}>{TB[selB.custTier]}</span>}</p></div>}

        {/* Type / Bay / Date / Time / Duration */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={GS.label}>TYPE</label><div style={{display:"flex",gap:4}}>{["bay","lesson"].map(t=><button key={t} style={{...GS.togBtn,flex:1,...((selB.type||"bay")===t?{background:t==="lesson"?PURPLE:GREEN,color:"#fff"}:{})}} onClick={()=>setSelB(p=>({...p,type:t}))}>{t==="lesson"?"Lesson":"Bay"}</button>)}</div></div>
          <div><label style={GS.label}>BAY</label><div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(b=><button key={b} style={{...GS.togBtn,flex:1,padding:"7px 4px",...(selB.bay===b?{background:GREEN,color:"#fff"}:{})}} onClick={()=>setSelB(p=>({...p,bay:b}))}>{b}</button>)}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={GS.label}>DATE</label><input type="date" style={GS.input} value={selB.date||dateKey(resDate)} onChange={e=>setSelB(p=>({...p,date:e.target.value}))}/></div>
          <div><label style={GS.label}>TIME</label><select style={GS.select} value={selB.time||selB.start_time||"9:00 AM"} onChange={e=>setSelB(p=>({...p,time:e.target.value}))}>{SLOTS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={GS.label}>DURATION</label><select style={GS.select} value={selB.dur||(selB.duration_slots?({1:"30m",2:"1h",3:"1.5h",4:"2h",5:"2.5h",6:"3h",7:"3.5h",8:"4h"}[selB.duration_slots]):"1h")} onChange={e=>setSelB(p=>({...p,dur:e.target.value}))}>{["30m","1h","1.5h","2h","2.5h","3h","3.5h","4h"].map(d=><option key={d}>{d}</option>)}</select></div>
        </div>
        {(selB.type||"bay")==="lesson"&&<div style={{marginBottom:12}}><label style={GS.label}>COACH</label><div style={{display:"flex",gap:6}}>{["Santiago Espinoza","Nicolas Cavero"].map(c=><button key={c} style={{...GS.togBtn,flex:1,...((selB.coach_name||selB.coach)===c?{background:PURPLE,color:"#fff"}:{})}} onClick={()=>setSelB(p=>({...p,coach_name:c}))}>{c.split(" ")[0]}</button>)}</div></div>}

        {/* Status (existing) */}
        {!selB.isNew&&<div style={{marginBottom:12}}><label style={GS.label}>STATUS</label><div style={{display:"flex",gap:4}}>{["confirmed","checked-in","completed","cancelled"].map(st=><button key={st} style={{...GS.togBtn,fontSize:11,...(selB.status===st?{background:st==="cancelled"?RED:GREEN,color:"#fff"}:{})}} onClick={()=>setSelB(p=>({...p,status:st}))}>{st}</button>)}</div></div>}

        {/* Admin notes */}
        <div style={{marginBottom:12}}><label style={GS.label}>ADMIN NOTES (not visible to customer)</label><textarea style={{...GS.input,minHeight:60,resize:"vertical"}} value={selB.notes||selB.admin_notes||""} onChange={e=>setSelB(p=>({...p,notes:e.target.value}))} placeholder="Internal notes..."/></div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.b1,flex:1}} onClick={async()=>{
            const durMap={"30m":1,"1h":2,"1.5h":3,"2h":4,"2.5h":5,"3h":6,"3.5h":7,"4h":8};
            if(selB.isNew){
              let custId=selB.custId;
              if(selB.newCust&&selB.firstName&&selB.phone){
                const nc=await db.post("customers",{phone:(selB.phone||"").replace(/[^0-9]/g,""),first_name:selB.firstName,last_name:selB.lastName||"",email:selB.email||"",tier:"none"});
                if(nc?.[0])custId=nc[0].id;
                await sq("customer.create",{first_name:selB.firstName,last_name:selB.lastName,phone:(selB.phone||"").replace(/[^0-9]/g,""),email:selB.email});
              }
              await db.post("bookings",{customer_id:custId||null,type:selB.type||"bay",bay:selB.bay||1,date:selB.date||dateKey(resDate),start_time:selB.time||"9:00 AM",duration_slots:durMap[selB.dur||"1h"]||2,status:"confirmed",amount:0,coach_name:selB.type==="lesson"?(selB.coach_name||""):"",admin_notes:selB.notes||""});
              if(custId)await db.post("transactions",{customer_id:custId,description:(selB.type==="lesson"?"Lesson":"Bay Booking")+" · Bay "+(selB.bay||1),date:selB.date||dateKey(new Date()),amount:0,payment_label:"Admin"});
              fire("Booking created ✓");
            }else{
              await db.patch("bookings",`id=eq.${selB.id}`,{status:selB.status,bay:selB.bay,start_time:selB.time||selB.start_time,duration_slots:durMap[selB.dur]||selB.duration_slots,admin_notes:selB.notes||""});
              fire("Booking updated ✓");
            }
            load();setSelB(null);setCustSearch("");
          }}>{selB.isNew?"Create Booking":"Save Changes"}</button>
          {!selB.isNew&&<button style={{...S.b1,background:RED,flex:0,padding:"12px 16px"}} onClick={async()=>{await db.patch("bookings",`id=eq.${selB.id}`,{status:"cancelled"});fire("Booking cancelled");load();setSelB(null);}}>Cancel</button>}
          <button style={{...GS.togBtn,padding:"12px"}} onClick={()=>{setSelB(null);setCustSearch("");}}>Close</button>
        </div>
      </div></div>}
    </div>;
  }

  /* ═══════════════════════════════════════════
     CUSTOMERS
     ═══════════════════════════════════════════ */
  else if(view==="cust"){
    const filtered=custSearch?customers.filter(c=>cn(c).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch)||(c.email||"").includes(custSearch)):customers;
    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:22,fontWeight:700}}>Customers ({customers.length})</h2><button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={load}>↻ Refresh</button></div>
      <div style={S.srch}>{X.search(16)}<input style={S.srchIn} placeholder="Search name, phone, email..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/></div>
      {filtered.length===0?<div style={S.empty}><p>No customers {custSearch?"match":"yet"}</p></div>:
      filtered.map(c=>{const bkCount=bookings.filter(b=>b.customer_id===c.id).length;return <div key={c.id} style={S.cR}>
        <div style={{width:40,height:40,borderRadius:10,background:(TC[c.tier]||"#888")+"18",color:TC[c.tier]||"#888",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:mono,flexShrink:0}}>{(c.first_name||"?")[0]}{(c.last_name||"?")[0]}</div>
        <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{cn(c)}</p><p style={{fontSize:11,color:"#888"}}>{c.phone||""}{c.email?" · "+c.email:""}</p></div>
        <div style={{textAlign:"right"}}><span style={{fontSize:9,fontWeight:700,color:"#fff",background:TC[c.tier]||"#888",padding:"3px 8px",borderRadius:5,fontFamily:mono}}>{TN[c.tier]||"None"}</span><p style={{fontSize:10,color:"#aaa",marginTop:4}}>{bkCount} booking{bkCount!==1?"s":""}</p></div>
      </div>;})}
    </div>;
  }

  /* ═══════════════════════════════════════════
     MEMBERS
     ═══════════════════════════════════════════ */
  else if(view==="members"){
    const members=customers.filter(c=>c.tier&&c.tier!=="none");
    const tierMembers=members.filter(c=>c.tier===memTier);
    const activeTier=TIERS.find(t=>t.id===memTier);
    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:22,fontWeight:700}}>Members ({members.length})</h2>
        <button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={()=>setMemModal({type:"add"})}>{X.plus(14)} Add Member</button></div>

      {/* Tier toggle */}
      <div style={{display:"flex",gap:0,marginBottom:16,background:"#f0f0ee",borderRadius:12,padding:3}}>
        {TIERS.map(t=>{const count=members.filter(c=>c.tier===t.id).length;const active=memTier===t.id;return <button key={t.id} style={{flex:1,padding:"10px 8px",borderRadius:10,border:"none",background:active?t.c:"transparent",color:active?"#fff":"#888",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff,textAlign:"center"}} onClick={()=>setMemTier(t.id)}><span style={{display:"block"}}>{t.badge}</span><span style={{display:"block",fontSize:10,fontWeight:400,marginTop:2}}>{count}</span></button>;})}
      </div>

      {/* Tier info */}
      {activeTier&&<div style={{background:activeTier.c+"10",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><span style={{fontSize:15,fontWeight:700,color:activeTier.c}}>{activeTier.n}</span><span style={{fontSize:12,color:"#888",marginLeft:8}}>${activeTier.p}/mo</span></div>
        <span style={{fontSize:12,color:"#888"}}>{tierMembers.length} member{tierMembers.length!==1?"s":""}</span>
      </div>}

      {/* Member list */}
      {tierMembers.length===0?<div style={S.empty}><p>No {activeTier?.n} members yet</p></div>:
      tierMembers.map(c=><div key={c.id} style={S.cR}>
        <div style={{width:40,height:40,borderRadius:10,background:activeTier.c+"18",color:activeTier.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:mono,flexShrink:0}}>{(c.first_name||"?")[0]}{(c.last_name||"?")[0]}</div>
        <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{cn(c)}</p><p style={{fontSize:11,color:"#888"}}>{c.phone||""}</p></div>
        <div style={{textAlign:"right"}}>
          {memTier==="player"&&<p style={{fontSize:12,fontWeight:700,color:activeTier.c,fontFamily:mono}}>{c.bay_credits_remaining||0}/{activeTier.hrs} hrs</p>}
          {memTier==="champion"&&<p style={{fontSize:12,fontWeight:700,color:activeTier.c}}>∞</p>}
          <button style={{fontSize:10,color:RED,background:"none",border:"none",cursor:"pointer",fontFamily:ff,fontWeight:600,marginTop:4}} onClick={async()=>{await db.patch("customers",`id=eq.${c.id}`,{tier:"none",bay_credits_remaining:0});await db.post("membership_history",{customer_id:c.id,action:"cancel",tier:c.tier,amount:0});fire("Membership cancelled");load();}}>Cancel</button>
        </div>
      </div>)}

      {/* Perks */}
      {activeTier&&<div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginTop:16}}>
        <p style={{fontSize:13,fontWeight:700,marginBottom:8}}>Perks</p>
        {activeTier.perks.map(p=><div key={p} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}><span style={{color:activeTier.c}}>{X.chk(14)}</span><span style={{fontSize:12}}>{p}</span></div>)}
      </div>}

      {/* Add member modal */}
      {memModal&&<div style={S.ov} onClick={()=>setMemModal(null)}><div style={S.mod} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:14}}>Add Member</h3>
        <label style={GS.label}>SEARCH CUSTOMER</label>
        <input style={GS.input} placeholder="Name or phone..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
        {custSearch&&<div style={{border:"1px solid #e8e8e6",borderRadius:8,marginTop:4,maxHeight:150,overflowY:"auto",marginBottom:12}}>
          {customers.filter(c=>(!c.tier||c.tier==="none")&&(cn(c).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch))).slice(0,8).map(c=>
            <div key={c.id} style={{padding:"8px 12px",borderBottom:"1px solid #f2f2f0",cursor:"pointer",fontSize:13}} onClick={()=>setMemModal({type:"add",cust:c})}><span style={{fontWeight:600}}>{cn(c)}</span> <span style={{color:"#888",fontSize:11}}>{c.phone}</span></div>)}
        </div>}
        {memModal.cust&&<>
          <p style={{fontSize:13,fontWeight:600,color:GREEN,marginBottom:12}}>✓ {cn(memModal.cust)}</p>
          <label style={GS.label}>SELECT PLAN</label>
          <div style={{display:"flex",gap:6,marginBottom:14}}>{TIERS.map(t=><button key={t.id} style={{...GS.togBtn,flex:1,...(memModal.tier===t.id?{background:t.c,color:"#fff"}:{})}} onClick={()=>setMemModal(p=>({...p,tier:t.id}))}>{t.badge} ${t.p}</button>)}</div>
          <button style={{...S.b1,opacity:memModal.tier?1:0.35}} onClick={async()=>{
            if(!memModal.tier)return;
            const t=TIERS.find(x=>x.id===memModal.tier);
            await db.patch("customers",`id=eq.${memModal.cust.id}`,{tier:memModal.tier,bay_credits_remaining:t.hrs===-1?999:t.hrs,bay_credits_total:t.hrs===-1?999:t.hrs,member_since:dateKey(new Date())});
            await db.post("membership_history",{customer_id:memModal.cust.id,action:"join",tier:memModal.tier,amount:t.p});
            await db.post("transactions",{customer_id:memModal.cust.id,description:t.n+" Membership",date:dateKey(new Date()),amount:t.p,payment_label:"Admin"});
            fire(cn(memModal.cust)+" added as "+t.n+" ✓");setMemModal(null);setCustSearch("");load();
          }}>Add Member</button>
        </>}
        <button style={{...GS.togBtn,width:"100%",marginTop:8}} onClick={()=>{setMemModal(null);setCustSearch("");}}>Cancel</button>
      </div></div>}
    </div>;
  }

  /* ═══════════════════════════════════════════
     REPORTS (placeholder)
     ═══════════════════════════════════════════ */
  else if(view==="reports"){
    const totalRev=bookings.reduce((s,b)=>s+Number(b.amount||0),0);
    const memCount=customers.filter(c=>c.tier&&c.tier!=="none").length;
    content=<div style={S.pad}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Reports</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        <div style={S.kpi}><p style={S.kpiL}>Total Revenue</p><p style={S.kpiV}>${totalRev.toFixed(0)}</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Total Bookings</p><p style={S.kpiV}>{bookings.length}</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Active Members</p><p style={S.kpiV}>{memCount}</p></div>
      </div>
      <div style={S.empty}><p style={{fontSize:14}}>Detailed reports coming soon</p><p style={{fontSize:12,color:"#aaa",marginTop:4}}>Revenue breakdowns, utilization charts, tier analytics, and more.</p></div>
    </div>;
  }

  /* ═══════════════════════════════════════════
     FACILITY
     ═══════════════════════════════════════════ */
  else if(view==="facility"){
    content=<div style={S.pad}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Facility</h2>
      <div style={S.tabs}>{["bays","settings"].map(t=><button key={t} style={{...S.tab,...(facTab===t?S.tabA:{})}} onClick={()=>setFacTab(t)}>{t==="bays"?"Bay Blocks":"Settings"}</button>)}</div>

      {facTab==="bays"&&<>
        <h3 style={S.sh}>Active Blocks</h3>
        {bayBlocks.length===0&&<p style={{fontSize:12,color:"#aaa",marginBottom:12}}>No active blocks</p>}
        {bayBlocks.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6}}>
          <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600}}>Bay{(b.bays||[]).length>1?"s":""} {(b.bays||[]).join(", ")}</p><p style={{fontSize:11,color:"#888"}}>{b.from_date||b.from} → {b.to_date||b.to} {b.all_day||b.allDay?"(All day)":`(${b.time_from||b.timeFrom}–${b.time_to||b.timeTo})`}</p></div>
          <div><p style={{fontSize:12,color:RED,fontWeight:600}}>{b.reason}</p><button style={{fontSize:10,color:RED,background:"none",border:"none",cursor:"pointer",fontFamily:ff,fontWeight:600}} onClick={async()=>{await db.del("bay_blocks",`id=eq.${b.id}`);setBayBlocks(p=>p.filter(x=>x.id!==b.id));fire("Block removed");}}>Remove</button></div>
        </div>)}

        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginTop:14}}>
          <label style={GS.label}>BLOCK BAYS</label>
          <div style={{display:"flex",gap:6,marginBottom:10}}>{[1,2,3,4,5].map(b=>{const sel=newBlock.bays.includes(b);return <button key={b} style={{...GS.togBtn,flex:1,...(sel?{background:RED,color:"#fff",borderColor:RED}:{})}} onClick={()=>setNewBlock(p=>({...p,bays:sel?p.bays.filter(x=>x!==b):[...p.bays,b]}))}>Bay {b}</button>;})}</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}><div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FROM</label><input type="date" style={GS.input} value={newBlock.from} onChange={e=>setNewBlock(p=>({...p,from:e.target.value}))}/></div><div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>TO</label><input type="date" style={GS.input} value={newBlock.to} onChange={e=>setNewBlock(p=>({...p,to:e.target.value}))}/></div></div>
          <div style={{display:"flex",gap:6,marginBottom:10}}><button style={{...GS.togBtn,flex:1,...(newBlock.allDay?{background:RED,color:"#fff",borderColor:RED}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:true}))}>All Day</button><button style={{...GS.togBtn,flex:1,...(!newBlock.allDay?{background:RED,color:"#fff",borderColor:RED}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:false}))}>Hours</button></div>
          {!newBlock.allDay&&<div style={{display:"flex",gap:8,marginBottom:10}}><div style={{flex:1}}><select style={GS.select} value={newBlock.timeFrom} onChange={e=>setNewBlock(p=>({...p,timeFrom:e.target.value}))}>{SLOTS.map(h=><option key={h}>{h}</option>)}</select></div><div style={{flex:1}}><select style={GS.select} value={newBlock.timeTo} onChange={e=>setNewBlock(p=>({...p,timeTo:e.target.value}))}>{SLOTS.slice(10).map(h=><option key={h}>{h}</option>)}</select></div></div>}
          <div style={{marginBottom:12}}><label style={{...GS.label,fontSize:10}}>REASON</label><input style={GS.input} placeholder="e.g., Calibration, Private event..." value={newBlock.reason} onChange={e=>setNewBlock(p=>({...p,reason:e.target.value}))}/></div>
          <button style={{...S.b1,background:RED,opacity:newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason?1:0.35}} onClick={async()=>{
            if(!(newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason))return;
            const r=await db.post("bay_blocks",{bays:newBlock.bays,from_date:newBlock.from,to_date:newBlock.to,time_from:newBlock.allDay?null:newBlock.timeFrom,time_to:newBlock.allDay?null:newBlock.timeTo,all_day:newBlock.allDay,reason:newBlock.reason});
            if(r?.[0])setBayBlocks(p=>[...p,r[0]]);
            setNewBlock({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});
            fire("Bays blocked ✓");
          }}>Block</button>
        </div>
      </>}

      {facTab==="settings"&&<>
        <h3 style={S.sh}>Bay Rates</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginBottom:14}}>
          {[{k:"op",l:"Non-Peak",s:"Mon–Fri 7am–5pm · Sat–Sun",cl:GREEN},{k:"pk",l:"Peak",s:"Mon–Fri 5pm–10pm",cl:ORANGE}].map(r=><div key={r.k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f2f2f0"}}>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{r.l}</p><p style={{fontSize:11,color:"#888"}}>{r.s}</p></div>
            <div style={{display:"flex",alignItems:"baseline",gap:2}}><span style={{fontWeight:700}}>$</span><input style={{width:48,fontSize:18,fontWeight:700,fontFamily:mono,border:"none",background:"transparent",textAlign:"center"}} type="number" value={cfg[r.k]} onChange={e=>setCfg(p=>({...p,[r.k]:Number(e.target.value)}))}/><span style={{fontSize:11,color:"#888"}}>/hr</span></div>
          </div>)}
          <button style={{...S.b1,marginTop:14}} onClick={async()=>{await db.patch("pricing_config","id=eq.1",{off_peak_rate:cfg.op,peak_rate:cfg.pk,weekend_rate:cfg.wk});fire("Rates saved ✓");}}>Save Rates</button>
        </div>
        <h3 style={S.sh}>Hours</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16}}>
          <div style={{padding:"8px 0",borderBottom:"1px solid #f2f2f0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Mon–Fri</span><span style={{fontSize:13,color:"#555"}}>7:00 AM – 10:00 PM</span></div>
          <div style={{padding:"8px 0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Sat–Sun</span><span style={{fontSize:13,color:"#555"}}>9:00 AM – 9:00 PM</span></div>
        </div>
      </>}
    </div>;
  }

  /* ─── Shell ─── */
  return(<div style={S.shell}><style>{CSS}</style>
    <div style={S.side}>
      <div style={{padding:"20px 16px 12px",borderBottom:"1px solid #1a3d2a"}}><span style={{fontFamily:mono,fontSize:11,fontWeight:700,letterSpacing:2,color:"#fff"}}>BGS ADMIN</span><p style={{fontSize:10,color:"#ffffff66",marginTop:4}}>{uN}</p></div>
      <div style={{padding:"8px",flex:1}}>{nav.map(n=><button key={n.k} style={{...S.nB,...(view===n.k?S.nBA:{})}} onClick={()=>{setView(n.k);setCustSearch("");}}>{n.ic(16)}<span>{n.l}</span></button>)}</div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #1a3d2a"}}><button style={{background:"none",border:"none",color:"#ffffff66",fontSize:11,cursor:"pointer",fontFamily:ff}} onClick={()=>setLogged(false)}>{X.out(14)} Sign Out</button></div>
    </div>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}>{content}</div></div>
    {toast&&<div style={S.toast}>{toast}</div>}
    {loading&&<div style={{position:"fixed",top:12,right:12,background:GREEN,color:"#fff",padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:600,zIndex:200}}>Loading...</div>}
  </div>);
}

/* ─── Styles ─── */
const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}input:focus,button:focus,select:focus,textarea:focus{outline:none}@keyframes ti{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}button:active{transform:scale(0.97)}`;
const GS={hdr:{padding:"10px 6px",textAlign:"center",borderBottom:"2px solid #e8e8e6",background:"#fafaf8"},timeCell:{padding:"4px 8px",display:"flex",alignItems:"center",borderBottom:"1px solid #f2f2f0",minHeight:28,background:"#fafaf8"},cell:{borderBottom:"1px solid #f2f2f0",borderLeft:"1px solid #f2f2f0",minHeight:28,padding:2,position:"relative"},booking:{borderRadius:5,padding:"4px 6px",position:"absolute",top:1,left:2,right:2,zIndex:2,overflow:"hidden"},label:{fontSize:11,fontWeight:700,color:"#888",letterSpacing:1,marginBottom:4,display:"block"},input:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a"},select:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a",background:"#fff"},togBtn:{padding:"7px 12px",border:"1px solid #e8e8e6",borderRadius:8,background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:"#555"}};
const LS={w:{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(155deg,#0B2E1A,#1A5C3A 45%,#2D8A5E)",fontFamily:"'DM Sans',sans-serif",padding:20},c:{background:"#fff",borderRadius:22,padding:"32px 28px",width:"100%",maxWidth:400,boxShadow:"0 28px 80px rgba(0,0,0,0.28)"},rb:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #e8e8e6",borderRadius:12,background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"},ri:{width:40,height:40,borderRadius:10,background:"#124A2B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}};
const S={shell:{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",background:"#FAFAF8",overflow:"hidden"},side:{width:180,background:"#0B2E1A",display:"flex",flexDirection:"column",flexShrink:0},pad:{padding:"24px 28px 40px"},b1:{background:"#2D8A5E",color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6},nB:{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",color:"#ffffff88",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",marginBottom:2},nBA:{background:"#ffffff14",color:"#fff",fontWeight:600},sh:{fontSize:15,fontWeight:700,marginBottom:12,marginTop:20},kpi:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16},kpiL:{fontSize:11,color:"#888",fontWeight:600,marginBottom:4},kpiV:{fontSize:24,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"},bkR:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6,borderLeft:"3px solid"},tabs:{display:"flex",gap:4,marginBottom:16,background:"#f0f0ee",borderRadius:10,padding:3},tab:{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:"#888",textAlign:"center"},tabA:{background:"#fff",color:"#1a1a1a",boxShadow:"0 1px 4px rgba(0,0,0,.08)"},srch:{display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1px solid #e8e8e6",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#aaa"},srchIn:{flex:1,border:"none",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a",background:"transparent"},cR:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6},empty:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:30,textAlign:"center",color:"#888",fontSize:14},navArr:{width:36,height:36,borderRadius:10,background:"#f0f0ee",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#1a1a1a",flexShrink:0},ov:{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,padding:20},mod:{background:"#fff",borderRadius:18,padding:24,maxWidth:540,width:"100%"},toast:{position:"fixed",bottom:24,right:24,background:"#1a1a1a",color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 10px 36px rgba(0,0,0,.22)",zIndex:200,animation:"ti .25s ease",whiteSpace:"nowrap"}};
