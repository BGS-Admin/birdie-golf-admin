import React, { useState, useCallback, useEffect } from "react";

/* ─── Supabase & Square ─── */
const SUPABASE_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";
const sbH={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};
const sbGet=async(t,q="")=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`,{headers:sbH});return r.ok?await r.json():[];}catch{return[];}};
const sbPost=async(t,d)=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:sbH,body:JSON.stringify(d)});return r.ok?await r.json():null;}catch{return null;}};
const sbPatch=async(t,q,d)=>{try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`,{method:"PATCH",headers:sbH,body:JSON.stringify(d)});return r.ok?await r.json():null;}catch{return null;}};
const sbDel=async(t,q)=>{try{await fetch(`${SUPABASE_URL}/rest/v1/${t}?${q}`,{method:"DELETE",headers:sbH});return true;}catch{return false;}};
const sqCall=async(action,params={})=>{try{const r=await fetch(`${SUPABASE_URL}/functions/v1/square-proxy`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({action,...params})});return r.ok?await r.json():null;}catch{return null;}};

/* ─── Fonts & Icons ─── */
const ff="'DM Sans',sans-serif",mono="'JetBrains Mono',monospace";
const Ic=({d,z=18})=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const X={grid:z=><Ic z={z} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,cal:z=><Ic z={z} d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18"/>,user:z=><Ic z={z} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/>,crown:z=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/></svg>,chk:z=><Ic z={z} d="M20 6L9 17l-5-5"/>,out:z=><Ic z={z} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>,wrench:z=><Ic z={z} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,search:z=><Ic z={z} d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35"/>,x:z=><Ic z={z} d="M18 6L6 18M6 6l12 12"/>,plus:z=><Ic z={z} d="M12 5v14M5 12h14"/>,clock:z=><Ic z={z} d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"/>,refresh:z=><Ic z={z} d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>};

/* ─── Team (owners only) ─── */
const TEAM=[
  {id:"TM4y",name:"Daniel Duran",email:"daniel@birdiegolfstudios.com",role:"owner",title:"Owner"},
  {id:"TMBe",name:"Marco Montilla",email:"marco@birdiegolfstudios.com",role:"owner",title:"Owner"},
];
const TC={none:"#888",starter:"#4A8B6E",player:"#2D8A5E",champion:"#124A2B"};
const TN={none:"Non-Member",starter:"Starter",player:"Player",champion:"Champion"};
const TIERS=[
  {id:"starter",n:"Starter",p:45,c:"#4A8B6E",badge:"STR",hrs:0},
  {id:"player",n:"Player",p:200,c:"#2D8A5E",badge:"PLR",hrs:8},
  {id:"champion",n:"Champion",p:600,c:"#124A2B",badge:"CHP",hrs:-1},
];
const SLOTS=["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"];

export default function AdminApp(){
  const[logged,setLogged]=useState(false);
  const[uN,setUN]=useState("");
  const[view,setView]=useState("book");
  const[toast,setToast]=useState(null);
  const[cfg,setCfg]=useState({pk:75,op:50,wk:50});

  /* Live data from Supabase */
  const[customers,setCustomers]=useState([]);
  const[bookings,setBookings]=useState([]);
  const[bayBlocks,setBayBlocks]=useState([]);
  const[loading,setLoading]=useState(false);

  /* Facility */
  const[facTab,setFacTab]=useState("bays");
  const[newBlock,setNewBlock]=useState({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});

  /* Booking modal */
  const[selB,setSelB]=useState(null);
  const[custSearch,setCustSearch]=useState("");

  const fire=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),3200);},[]);

  /* ─── Load all data from Supabase ─── */
  const loadData=useCallback(async()=>{
    setLoading(true);
    const[custs,bks,blocks,pricing]=await Promise.all([
      sbGet("customers","select=*&order=created_at.desc"),
      sbGet("bookings","select=*&order=created_at.desc&limit=100"),
      sbGet("bay_blocks","select=*"),
      sbGet("pricing_config","select=*"),
    ]);
    if(custs?.length) setCustomers(custs);
    if(bks?.length) setBookings(bks); else setBookings([]);
    if(blocks?.length) setBayBlocks(blocks); else setBayBlocks([]);
    if(pricing?.[0]) setCfg({pk:pricing[0].peak_rate,op:pricing[0].off_peak_rate,wk:pricing[0].weekend_rate});
    setLoading(false);
  },[]);

  useEffect(()=>{if(logged) loadData();},[logged,loadData]);

  /* ─── Helper: find customer by phone ─── */
  const findCustByPhone=(phone)=>{
    const digits=phone.replace(/[^0-9]/g,"");
    return customers.find(c=>{
      const cd=c.phone?.replace(/[^0-9]/g,"")||"";
      return cd===digits||cd==="1"+digits||digits==="1"+cd;
    });
  };

  /* ─── LOGIN ─── */
  if(!logged) return(<div style={LS.w}><style>{CSS}</style><div style={LS.c}>
    <div style={LS.br}><h1 style={LS.bn}>BIRDIE GOLF STUDIOS</h1><p style={LS.bs}>Admin Dashboard</p></div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {TEAM.map(t=><button key={t.id} style={LS.rb} onClick={()=>{setUN(t.name);setLogged(true);}}>
        <div style={LS.ri}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
        <div style={{flex:1,textAlign:"left"}}><p style={{fontSize:14,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:"#888"}}>{t.title}</p></div>
      </button>)}
    </div>
  </div></div>);

  /* ─── Format helpers ─── */
  const fmtCustName=(c)=>c.first_name+" "+c.last_name;
  const fmtDate=(d)=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});

  /* ─── NAV ─── */
  const nav=[{k:"book",l:"Bookings",ic:X.cal},{k:"cust",l:"Customers",ic:X.user},{k:"facility",l:"Facility",ic:X.wrench}];
  let content=null;

  /* ═══════════════════════════════════════════
     BOOKINGS VIEW
     ═══════════════════════════════════════════ */
  if(view==="book"){
    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Bookings</h2>
        <div style={{display:"flex",gap:8}}>
          <button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={loadData}>{X.refresh(14)} Refresh</button>
          <button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={()=>setSelB({isNew:true,type:"bay",bay:"Bay 1",time:"9:00 AM",dur:"1h",cust:"",newCust:false,amt:"Charge card"})}>{X.plus(14)} New Booking</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <div style={S.kpi}><p style={S.kpiL}>Today's Bookings</p><p style={S.kpiV}>{bookings.filter(b=>b.date===new Date().toISOString().split("T")[0]).length}</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Total Customers</p><p style={S.kpiV}>{customers.length}</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Revenue</p><p style={S.kpiV}>${bookings.reduce((s,b)=>s+Number(b.amount||0),0).toFixed(0)}</p></div>
      </div>

      {/* Booking list */}
      {bookings.length===0?<div style={S.empty}><p>No bookings yet</p><p style={{fontSize:12,color:"#aaa",marginTop:4}}>Bookings from the customer website will appear here automatically.</p></div>:
      bookings.map(b=>{
        const cust=customers.find(c=>c.id===b.customer_id);
        const name=cust?fmtCustName(cust):"Walk-in";
        const bkC=b.type==="lesson"?"#E8890C":TC[cust?.tier]||"#888";
        return <div key={b.id} style={{...S.bkR,borderLeftColor:bkC,cursor:"pointer"}} onClick={()=>setSelB({...b,custName:name})}>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:600}}>{name}</p>
            <p style={{fontSize:12,color:"#888"}}>{b.type==="lesson"?"Lesson":"Bay"} · Bay {b.bay} · {b.start_time} · {(b.duration_slots*0.5)}hr{b.duration_slots>2?"s":""}</p>
            {b.coach_name&&<p style={{fontSize:11,color:"#E8890C"}}>Coach: {b.coach_name}</p>}
          </div>
          <div style={{textAlign:"right"}}>
            <span style={{fontSize:13,fontWeight:700,fontFamily:mono}}>${Number(b.amount||0).toFixed(2)}</span>
            <p style={{fontSize:10,fontWeight:600,color:b.status==="confirmed"?"#E8890C":b.status==="checked-in"?"#2D8A5E":"#888"}}>{b.status}</p>
            <p style={{fontSize:10,color:"#aaa"}}>{fmtDate(b.date)}</p>
          </div>
        </div>;
      })}

      {/* New/Edit Booking Modal */}
      {selB&&<div style={S.ov} onClick={()=>setSelB(null)}><div style={{...S.mod,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:14}}>{selB.isNew?"New Booking":"Booking Details"}</h3>

        {selB.isNew?<>
          {/* Customer selection */}
          <label style={GS.label}>CUSTOMER</label>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button style={{...GS.togBtn,...(!selB.newCust?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,newCust:false})}>Existing</button>
            <button style={{...GS.togBtn,...(selB.newCust?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,newCust:true,cust:""})}>New Customer</button>
          </div>
          {selB.newCust?<div style={{background:"#fafaf8",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FIRST NAME *</label><input style={GS.input} placeholder="First" value={selB.firstName||""} onChange={e=>setSelB({...selB,firstName:e.target.value})}/></div>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>LAST NAME *</label><input style={GS.input} placeholder="Last" value={selB.lastName||""} onChange={e=>setSelB({...selB,lastName:e.target.value})}/></div>
            </div>
            <div><label style={{...GS.label,fontSize:10}}>PHONE *</label><input style={GS.input} type="tel" placeholder="(305) 555-0000" value={selB.phone||""} onChange={e=>setSelB({...selB,phone:e.target.value})}/></div>
            <div><label style={{...GS.label,fontSize:10}}>EMAIL</label><input style={GS.input} type="email" placeholder="email@example.com" value={selB.email||""} onChange={e=>setSelB({...selB,email:e.target.value})}/></div>
          </div>:<div style={{marginBottom:12}}>
            <input style={GS.input} placeholder="Search by name or phone..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
            {custSearch&&<div style={{border:"1px solid #e8e8e6",borderRadius:8,marginTop:4,maxHeight:150,overflowY:"auto"}}>
              {customers.filter(c=>(fmtCustName(c)).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch)).slice(0,8).map(c=>
                <div key={c.id} style={{padding:"8px 12px",borderBottom:"1px solid #f2f2f0",cursor:"pointer",fontSize:13}} onClick={()=>{setSelB({...selB,cust:fmtCustName(c),custId:c.id,custPhone:c.phone});setCustSearch("");}}>
                  <span style={{fontWeight:600}}>{fmtCustName(c)}</span> <span style={{color:"#888",fontSize:11}}>{c.phone}</span>
                  <span style={{...S.tBdg,background:TC[c.tier]||"#888",marginLeft:8}}>{TN[c.tier]||"None"}</span>
                </div>)}
              {customers.filter(c=>(fmtCustName(c)).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch)).length===0&&<p style={{padding:"8px 12px",fontSize:12,color:"#888"}}>No match — try "New Customer"</p>}
            </div>}
            {selB.cust&&<p style={{fontSize:13,fontWeight:600,marginTop:8,color:"#2D8A5E"}}>✓ {selB.cust}</p>}
          </div>}
        </>:<div style={{marginBottom:12}}>
          <label style={GS.label}>CUSTOMER</label>
          <p style={{fontSize:14,fontWeight:600}}>{selB.custName||"Customer"}</p>
        </div>}

        {/* Type */}
        <div style={{marginBottom:12}}><label style={GS.label}>TYPE</label>
          <div style={{display:"flex",gap:6}}>{["bay","lesson"].map(t=><button key={t} style={{...GS.togBtn,...(selB.type===t?{background:t==="lesson"?"#5B6DCD":"#2D8A5E",color:"#fff",borderColor:t==="lesson"?"#5B6DCD":"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,type:t})}>{t==="lesson"?"Lesson":"Bay Rental"}</button>)}</div>
        </div>

        {/* Bay */}
        <div style={{marginBottom:12}}><label style={GS.label}>BAY</label>
          <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(b=><button key={b} style={{...GS.togBtn,...(selB.bay==="Bay "+b?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,bay:"Bay "+b})}>Bay {b}</button>)}</div>
        </div>

        {/* Date */}
        <div style={{marginBottom:12}}><label style={GS.label}>DATE</label>
          <input type="date" style={GS.input} value={selB.date||new Date().toISOString().split("T")[0]} onChange={e=>setSelB({...selB,date:e.target.value})}/>
        </div>

        {/* Time */}
        <div style={{marginBottom:12}}><label style={GS.label}>START TIME</label>
          <select style={GS.select} value={selB.time||selB.start_time||"9:00 AM"} onChange={e=>setSelB({...selB,time:e.target.value})}>{SLOTS.map(s=><option key={s} value={s}>{s}</option>)}</select>
        </div>

        {/* Duration */}
        <div style={{marginBottom:12}}><label style={GS.label}>DURATION</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["30m","1h","1.5h","2h","2.5h","3h","3.5h","4h"].map(d=><button key={d} style={{...GS.togBtn,...((selB.dur===d)?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,dur:d})}>{d}</button>)}</div>
        </div>

        {/* Coach (for lessons) */}
        {selB.type==="lesson"&&<div style={{marginBottom:12}}><label style={GS.label}>COACH</label>
          <div style={{display:"flex",gap:6}}>
            {["Santiago Espinoza","Nicolas Cavero"].map(c=><button key={c} style={{...GS.togBtn,...((selB.coach_name||selB.coach)===c?{background:"#5B6DCD",color:"#fff",borderColor:"#5B6DCD"}:{})}} onClick={()=>setSelB({...selB,coach_name:c,coach:c})}>{c.split(" ")[0]}</button>)}
          </div>
        </div>}

        {/* Status (existing) */}
        {!selB.isNew&&<div style={{marginBottom:12}}><label style={GS.label}>STATUS</label>
          <div style={{display:"flex",gap:6}}>
            {["confirmed","checked-in","completed","cancelled"].map(st=><button key={st} style={{...GS.togBtn,...(selB.status===st?{background:st==="checked-in"||st==="completed"?"#2D8A5E":st==="cancelled"?"#E03928":"#E8890C",color:"#fff"}:{})}} onClick={()=>setSelB({...selB,status:st})}>{st}</button>)}
          </div>
        </div>}

        {/* Actions */}
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button style={{...S.b1,flex:1}} onClick={async()=>{
            const durMap={"30m":1,"1h":2,"1.5h":3,"2h":4,"2.5h":5,"3h":6,"3.5h":7,"4h":8};
            const bayNum=parseInt((selB.bay||"Bay 1").replace("Bay ",""))||1;
            const date=selB.date||new Date().toISOString().split("T")[0];
            const time=selB.time||selB.start_time||"9:00 AM";
            const durSlots=durMap[selB.dur||"1h"]||2;

            if(selB.isNew){
              let custId=selB.custId;
              // Create new customer if needed
              if(selB.newCust&&selB.firstName&&selB.lastName&&selB.phone){
                const newCust=await sbPost("customers",{phone:selB.phone.replace(/[^0-9]/g,""),first_name:selB.firstName,last_name:selB.lastName,email:selB.email||"",tier:"none"});
                if(newCust?.[0]) custId=newCust[0].id;
                // Also create in Square
                await sqCall("customer.create",{first_name:selB.firstName,last_name:selB.lastName,phone:selB.phone.replace(/[^0-9]/g,""),email:selB.email,supabase_id:custId});
              }
              // Create booking
              await sbPost("bookings",{customer_id:custId||null,type:selB.type,bay:bayNum,date,start_time:time,duration_slots:durSlots,status:"confirmed",amount:0,coach_name:selB.type==="lesson"?(selB.coach_name||""):""});
              // Create transaction
              if(custId) await sbPost("transactions",{customer_id:custId,description:(selB.type==="lesson"?"Lesson":"Bay Booking")+" · Bay "+bayNum,date,amount:0,payment_label:"Admin"});
              fire("Booking created ✓");
            } else {
              // Update existing booking
              await sbPatch("bookings",`id=eq.${selB.id}`,{status:selB.status,bay:bayNum,start_time:time,duration_slots:durSlots});
              fire("Booking updated ✓");
            }
            loadData();
            setSelB(null);
            setCustSearch("");
          }}>{selB.isNew?"Create Booking":"Save Changes"}</button>
          <button style={{...S.lk,padding:"12px"}} onClick={()=>{setSelB(null);setCustSearch("");}}>Cancel</button>
        </div>
      </div></div>}
    </div>;
  }

  /* ═══════════════════════════════════════════
     CUSTOMERS VIEW
     ═══════════════════════════════════════════ */
  else if(view==="cust"){
    const filtered=custSearch?customers.filter(c=>(fmtCustName(c)).toLowerCase().includes(custSearch.toLowerCase())||(c.phone||"").includes(custSearch)||(c.email||"").includes(custSearch)):customers;
    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Customers</h2>
        <button style={{...S.b1,width:"auto",padding:"8px 14px",fontSize:12}} onClick={loadData}>{X.refresh(14)} Refresh</button>
      </div>

      {/* Search */}
      <div style={S.srch}>{X.search(16)}<input style={S.srchIn} placeholder="Search by name, phone, or email..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/></div>

      {/* Customer count */}
      <p style={{fontSize:12,color:"#888",marginBottom:12}}>{filtered.length} customer{filtered.length!==1?"s":""}</p>

      {customers.length===0?<div style={S.empty}><p>No customers yet</p><p style={{fontSize:12,color:"#aaa",marginTop:4}}>When someone signs up on the booking website, they'll appear here.</p></div>:
      filtered.map(c=>{
        const custBookings=bookings.filter(b=>b.customer_id===c.id);
        return <div key={c.id} style={S.cR}>
          <div style={{width:40,height:40,borderRadius:10,background:(TC[c.tier]||"#888")+"18",color:TC[c.tier]||"#888",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:mono,flexShrink:0}}>{(c.first_name||"?")[0]}{(c.last_name||"?")[0]}</div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:600}}>{fmtCustName(c)}</p>
            <p style={{fontSize:11,color:"#888"}}>{c.phone||"No phone"} {c.email?" · "+c.email:""}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <span style={{...S.tBdg,background:TC[c.tier]||"#888"}}>{TN[c.tier]||"None"}</span>
            <p style={{fontSize:10,color:"#aaa",marginTop:4}}>{custBookings.length} booking{custBookings.length!==1?"s":""}</p>
          </div>
        </div>;
      })}
    </div>;
  }

  /* ═══════════════════════════════════════════
     FACILITY VIEW
     ═══════════════════════════════════════════ */
  else if(view==="facility"){
    content=<div style={S.pad}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Facility</h2>

      <div style={S.tabs}>{["bays","settings"].map(t=><button key={t} style={{...S.tab,...(facTab===t?S.tabS:{})}} onClick={()=>setFacTab(t)}>{t==="bays"?"Bay Blocks":"Settings"}</button>)}</div>

      {facTab==="bays"&&<div>
        <h3 style={S.sh}>Active Blocks</h3>
        {bayBlocks.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6}}>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:600}}>Bay{(b.bays||[]).length>1?"s":""} {(b.bays||[]).join(", ")}</p>
            <p style={{fontSize:11,color:"#888"}}>{b.from_date||b.from} → {b.to_date||b.to} {b.all_day||b.allDay?"(All day)":`(${b.time_from||b.timeFrom}–${b.time_to||b.timeTo})`}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{fontSize:12,color:"#E03928",fontWeight:600}}>{b.reason}</p>
            <button style={{fontSize:10,color:"#E03928",background:"none",border:"none",cursor:"pointer",fontFamily:ff,fontWeight:600,marginTop:2}} onClick={async()=>{
              if(b.id) await sbDel("bay_blocks",`id=eq.${b.id}`);
              setBayBlocks(p=>p.filter(x=>x.id!==b.id));
              fire("Block removed");
            }}>Remove</button>
          </div>
        </div>)}
        {bayBlocks.length===0&&<p style={{fontSize:12,color:"#aaa",padding:"8px 0"}}>No active blocks</p>}

        {/* Add new block */}
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginTop:14}}>
          <label style={GS.label}>BLOCK BAYS</label>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {[1,2,3,4,5].map(b=>{const sel=newBlock.bays.includes(b);return <button key={b} style={{...GS.togBtn,flex:1,...(sel?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,bays:sel?p.bays.filter(x=>x!==b):[...p.bays,b]}))}>Bay {b}</button>;})}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FROM</label><input type="date" style={GS.input} value={newBlock.from} onChange={e=>setNewBlock(p=>({...p,from:e.target.value}))}/></div>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>TO</label><input type="date" style={GS.input} value={newBlock.to} onChange={e=>setNewBlock(p=>({...p,to:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button style={{...GS.togBtn,flex:1,...(newBlock.allDay?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:true}))}>All Day</button>
            <button style={{...GS.togBtn,flex:1,...(!newBlock.allDay?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:false}))}>Specific Hours</button>
          </div>
          {!newBlock.allDay&&<div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FROM</label><select style={GS.select} value={newBlock.timeFrom} onChange={e=>setNewBlock(p=>({...p,timeFrom:e.target.value}))}>{SLOTS.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>TO</label><select style={GS.select} value={newBlock.timeTo} onChange={e=>setNewBlock(p=>({...p,timeTo:e.target.value}))}>{SLOTS.slice(10).map(h=><option key={h} value={h}>{h}</option>)}</select></div>
          </div>}
          <div style={{marginBottom:12}}><label style={{...GS.label,fontSize:10}}>REASON</label><input style={GS.input} placeholder="e.g., Sensor calibration, Private event..." value={newBlock.reason} onChange={e=>setNewBlock(p=>({...p,reason:e.target.value}))}/></div>
          <button style={{...S.b1,background:"#E03928",opacity:newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason?1:0.35}} onClick={async()=>{
            if(newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason){
              const result=await sbPost("bay_blocks",{bays:newBlock.bays,from_date:newBlock.from,to_date:newBlock.to,time_from:newBlock.allDay?null:newBlock.timeFrom,time_to:newBlock.allDay?null:newBlock.timeTo,all_day:newBlock.allDay,reason:newBlock.reason});
              if(result?.[0]) setBayBlocks(p=>[...p,result[0]]);
              setNewBlock({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});
              fire(newBlock.bays.length+" bay"+(newBlock.bays.length>1?"s":"")+" blocked ✓");
            }
          }}>Block {newBlock.bays.length>0?newBlock.bays.length+" Bay"+(newBlock.bays.length>1?"s":""):"Bays"}</button>
        </div>
      </div>}

      {facTab==="settings"&&<div>
        <h3 style={S.sh}>Bay Rates</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginBottom:14}}>
          {[{k:"op",l:"Non-Peak",s:"Mon–Fri 7am–5pm · Sat–Sun 9am–9pm",cl:"#2D8A5E"},{k:"pk",l:"Peak",s:"Mon–Fri 5pm–10pm",cl:"#E8890C"}].map(r=><div key={r.k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f2f2f0"}}>
            <div style={{width:36,height:36,borderRadius:8,background:r.cl+"18",color:r.cl,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{X.clock(18)}</div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{r.l}</p><p style={{fontSize:11,color:"#888"}}>{r.s}</p></div>
            <div style={{display:"flex",alignItems:"baseline",gap:2}}><span style={{fontWeight:700}}>$</span><input style={{width:48,fontSize:18,fontWeight:700,fontFamily:mono,border:"none",background:"transparent",textAlign:"center",color:"#1a1a1a"}} type="number" value={cfg[r.k]} onChange={e=>setCfg(p=>({...p,[r.k]:Number(e.target.value)}))}/><span style={{fontSize:11,color:"#888"}}>/hr</span></div>
          </div>)}
          <button style={{...S.b1,marginTop:14}} onClick={async()=>{await sbPatch("pricing_config","id=eq.1",{off_peak_rate:cfg.op,peak_rate:cfg.pk,weekend_rate:cfg.wk});fire("Rates updated ✓");}}>Save Rates</button>
        </div>

        <h3 style={S.sh}>Operating Hours</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16}}>
          <div style={{padding:"8px 0",borderBottom:"1px solid #f2f2f0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Monday – Friday</span><span style={{fontSize:13,color:"#555"}}>7:00 AM – 10:00 PM</span></div>
          <div style={{padding:"8px 0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Saturday – Sunday</span><span style={{fontSize:13,color:"#555"}}>9:00 AM – 9:00 PM</span></div>
        </div>
      </div>}
    </div>;
  }

  /* ─── LAYOUT ─── */
  return(<div style={S.shell}><style>{CSS}</style>
    <div style={S.side}>
      <div style={{padding:"20px 16px 12px",borderBottom:"1px solid #1a3d2a"}}><span style={{fontFamily:mono,fontSize:11,fontWeight:700,letterSpacing:2,color:"#fff"}}>BGS ADMIN</span><p style={{fontSize:10,color:"#ffffff66",marginTop:4}}>{uN}</p></div>
      <div style={{padding:"8px",flex:1}}>{nav.map(n=><button key={n.k} style={{...S.nB,...(view===n.k?S.nBA:{})}} onClick={()=>{setView(n.k);setCustSearch("");}}>{n.ic(16)}<span>{n.l}</span></button>)}</div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #1a3d2a"}}><button style={{...S.lk,color:"#ffffff66",fontSize:11}} onClick={()=>{setLogged(false);}}>Sign Out</button></div>
    </div>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}>{content}</div></div>
    {toast&&<div style={S.toast}>{toast}</div>}
    {loading&&<div style={{position:"fixed",top:12,right:12,background:"#2D8A5E",color:"#fff",padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:600,zIndex:200}}>Loading...</div>}
  </div>);
}

/* ─── STYLES ─── */
const GS={label:{fontSize:11,fontWeight:700,color:"#888",letterSpacing:1,marginBottom:4,display:"block"},input:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a"},select:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a",background:"#fff"},togBtn:{padding:"7px 12px",border:"1px solid #e8e8e6",borderRadius:8,background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:"#555"}};
const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}input:focus,button:focus{outline:none}@keyframes ti{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}button:active{transform:scale(0.97)}`;
const LS={w:{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(155deg,#0B2E1A,#1A5C3A 45%,#2D8A5E)",fontFamily:"'DM Sans',sans-serif",padding:20},c:{background:"#fff",borderRadius:22,padding:"32px 28px",width:"100%",maxWidth:400,boxShadow:"0 28px 80px rgba(0,0,0,0.28)"},br:{textAlign:"center",marginBottom:20},bn:{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,color:"#0B2E1A",letterSpacing:3},bs:{fontSize:12,color:"#888",marginTop:4},rb:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #e8e8e6",borderRadius:12,background:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"},ri:{width:40,height:40,borderRadius:10,background:"#124A2B",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}};
const S={shell:{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",background:"#FAFAF8",overflow:"hidden"},side:{width:180,background:"#0B2E1A",display:"flex",flexDirection:"column",flexShrink:0},pad:{padding:"24px 28px 40px"},b1:{background:"#2D8A5E",color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6},lk:{background:"none",border:"none",color:"#2D8A5E",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},nB:{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",color:"#ffffff88",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",marginBottom:2},nBA:{background:"#ffffff14",color:"#fff",fontWeight:600},sh:{fontSize:15,fontWeight:700,marginBottom:12,marginTop:20},kpi:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16},kpiL:{fontSize:11,color:"#888",fontWeight:600,marginBottom:4},kpiV:{fontSize:24,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"},bkR:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6,borderLeft:"3px solid"},tabs:{display:"flex",gap:4,marginBottom:16,background:"#f0f0ee",borderRadius:10,padding:3},tab:{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:"#888",textAlign:"center"},tabS:{background:"#fff",color:"#1a1a1a",boxShadow:"0 1px 4px rgba(0,0,0,.08)"},srch:{display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1px solid #e8e8e6",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#aaa"},srchIn:{flex:1,border:"none",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1a1a1a",background:"transparent"},cR:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6},tBdg:{fontSize:9,fontWeight:700,color:"#fff",padding:"3px 8px",borderRadius:5,fontFamily:"'JetBrains Mono',monospace"},empty:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:30,textAlign:"center",color:"#888",fontSize:14},ov:{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,padding:20},mod:{background:"#fff",borderRadius:18,padding:24,maxWidth:500,width:"100%"},toast:{position:"fixed",bottom:24,right:24,background:"#1a1a1a",color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 10px 36px rgba(0,0,0,.22)",zIndex:200,animation:"ti .25s ease",whiteSpace:"nowrap"}};
