import React, { useState, useCallback, useEffect } from "react";

/* ─── Supabase Client ─── */
const SUPABASE_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";
const sbH = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };
const sbGet = async (table, q = "") => { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: sbH }); return r.ok ? await r.json() : []; } catch { return []; } };
const sbPost = async (table, data) => { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: sbH, body: JSON.stringify(data) }); return r.ok ? await r.json() : null; } catch { return null; } };
const sbPatch = async (table, q, data) => { try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { method: "PATCH", headers: sbH, body: JSON.stringify(data) }); return r.ok ? await r.json() : null; } catch { return null; } };
const sbDel = async (table, q) => { try { await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { method: "DELETE", headers: sbH }); return true; } catch { return false; } };
const SQUARE_FN_URL = `${SUPABASE_URL}/functions/v1/square-proxy`;
const sqCall = async (action, params = {}) => { try { const r = await fetch(SQUARE_FN_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}` }, body: JSON.stringify({ action, ...params }) }); return r.ok ? await r.json() : null; } catch { return null; } };
const ff="'DM Sans',sans-serif",mono="'JetBrains Mono',monospace";
const Ic=({d,z=18})=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const X={grid:z=><Ic z={z} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,cal:z=><Ic z={z} d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18"/>,user:z=><Ic z={z} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/>,users:z=><Ic z={z} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>,set:z=><Ic z={z} d="M12 9a3 3 0 100 6 3 3 0 000-6z"/>,zap:z=><Ic z={z} d="M13 2L3 14h9l-1 8 10-12h-9l1-8"/>,sun:z=><Ic z={z} d="M12 3v2M12 19v2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M3 12h2M19 12h2M12 7a5 5 0 100 10 5 5 0 000-10z"/>,moon:z=><Ic z={z} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,chk:z=><Ic z={z} d="M20 6L9 17l-5-5"/>,out:z=><Ic z={z} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>,card:z=><Ic z={z} d="M1 4h22a2 2 0 012 2v12a2 2 0 01-2 2H1a2 2 0 01-2-2V6a2 2 0 012-2zM1 10h22"/>,bar:z=><Ic z={z} d="M18 20V10M12 20V4M6 20v-6"/>,search:z=><Ic z={z} d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35"/>,x:z=><Ic z={z} d="M18 6L6 18M6 6l12 12"/>,crown:z=><svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14"/></svg>,wrench:z=><Ic z={z} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,clock:z=><Ic z={z} d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2"/>};
const ROLES={owner:{n:"Owner",c:"#124A2B",perms:["bookings","members","dashboard","reports","facility"]},manager:{n:"Manager",c:"#2D8A5E",perms:["bookings","members","dashboard","reports"]},staff:{n:"Staff",c:"#5B6DCD",perms:["bookings","dashboard"]}};
const TEAM=[{id:"TM4y",name:"Daniel Duran",email:"daniel@birdiegolfstudios.com",phone:"+1 (561) 573-5560",role:"owner",title:"Owner",since:"Feb 2025"},{id:"TMBe",name:"Marco Montilla",email:"marco@birdiegolfstudios.com",phone:"+1 (786) 390-3889",role:"owner",title:"Owner",since:"Mar 2025"},{id:"TM_V",name:"Sebastian Termini",email:"sebastian@birdiegolfstudios.com",phone:"+1 (786) 593-0180",role:"manager",title:"Manager",since:"Mar 2025"},{id:"TMiz",name:"Santiago Espinosa",email:"santiespinosa.golf@gmail.com",phone:"+1 (808) 960-8321",role:"staff",title:"Golf Pro",since:"Jul 2025",isCoach:true},{id:"TMa5",name:"Nicolas Cavero",email:"nicolas@birdiegolfstudios.com",phone:"+1 (305) 319-1140",role:"staff",title:"Golf Pro",since:"Mar 2025",isCoach:true},{id:"TMwL",name:"Alan Peinado",email:"alanone22@hotmail.com",phone:"+1 (786) 851-0011",role:"staff",title:"Front Desk",since:"Dec 2025"},{id:"TMiu",name:"Mariana Ballesteros",email:"mariana@superbonstudio.com",phone:"+1 (954) 225-7922",role:"staff",title:"Marketing",since:"Nov 2025"},{id:"TMkM",name:"Keven Pimentel",email:"ads@superbonstudio.com",phone:"",role:"staff",title:"Ads",since:"Feb 2026"}];
const COACHES=TEAM.filter(t=>t.isCoach);
const BK=[{id:1,type:"bay",cust:"Adrian McAdory",bay:"Bay 1",time:"10:00 AM",dur:"1.5h",status:"confirmed",amt:"$75.00",tier:"player"},{id:2,type:"bay",cust:"Zack Berger",bay:"Bay 3",time:"11:00 AM",dur:"2h",status:"confirmed",amt:"$100.00",tier:"player"},{id:3,type:"lesson",cust:"Gaby Planas",bay:"Bay 2",time:"2:00 PM",dur:"1h",coach:"Santiago Espinosa",status:"confirmed",amt:"$0 (credit)",tier:"champion"},{id:4,type:"bay",cust:"Moises Vivas",bay:"Bay 4",time:"3:00 PM",dur:"1h",status:"checked-in",amt:"$50.00",tier:"starter"},{id:5,type:"bay",cust:"Frankie Diaz",bay:"Bay 1",time:"5:00 PM",dur:"2h",status:"confirmed",amt:"$150.00",tier:"none"},{id:6,type:"lesson",cust:"Adrian McAdory",bay:"Bay 5",time:"6:00 PM",dur:"1h",coach:"Santiago Espinosa",status:"confirmed",amt:"$120.00",tier:"player"}];
// Booking colors by tier/type
const BK_COLORS={lesson:"#E8890C",champion:"#3B6BC4",player:"#2D8A5E",starter:"#C9A830",none:"#888"};
const CUSTS=[
  {id:"QC80",name:"Adrian McAdory",email:"mcadory.adrian@gmail.com",phone:"+1 (716) 510-3849",created:"Mar 16, 2026",source:"Appointments"},
  {id:"ZH82",name:"Gaby Planas",email:"gabyplanas8@gmail.com",phone:"(786) 365-6609",created:"Mar 16, 2026",source:"Directory"},
  {id:"3M1T",name:"Moises Vivas",phone:"(407) 535-2082",created:"Mar 16, 2026",source:"Directory"},
  {id:"ANCC",name:"Frankie Diaz",phone:"+1 (787) 565-1265",created:"Mar 16, 2026",source:"Third Party"},
  {id:"8KYA",name:"Zack Berger",phone:"+1 (305) 298-0997",created:"Mar 15, 2026",source:"Third Party"},
  {id:"C5T2",name:"Beata Corey",email:"beatacorey@gmail.com",phone:"+1 (203) 906-6307",created:"Mar 15, 2026",source:"Loyalty"},
  {id:"T9R0",name:"Nicole Chambers",phone:"+1 (305) 748-5397",created:"Mar 15, 2026",source:"Third Party"},
  {id:"PY9C",name:"Jake Rosenberg",email:"jakerosenberg06@gmail.com",phone:"+1 (845) 216-6394",created:"Mar 15, 2026",source:"Loyalty"},
  {id:"1JW8",name:"Geoffrey Harris",phone:"+1 (305) 310-5173",created:"Mar 15, 2026",source:"Third Party"},
  {id:"8VAE",name:"Henry Beeson",email:"henry.beeson@icloud.com",phone:"+1 (708) 789-7219",created:"Mar 15, 2026",source:"Loyalty"},
  {id:"T8TW",name:"Vincent Pen",email:"vincentpen0@gmail.com",phone:"+1 (954) 995-2279",created:"Mar 15, 2026",source:"Directory"},
  {id:"KRAG",name:"Gary Zigler",phone:"+1 (603) 998-6872",created:"Mar 15, 2026",source:"Loyalty"},
  {id:"WX3B",name:"Toni Holtz",email:"toni.holtz@icloud.com",phone:"+1 (305) 877-8087",created:"Mar 14, 2026",source:"Loyalty"},
  {id:"MHAJ",name:"Miguel Torres",email:"mtorresbehar@gmail.com",phone:"+1 (645) 236-1320",created:"Mar 13, 2026",source:"Loyalty"},
  {id:"RY8M",name:"Hunter Sellers",email:"hunter.sellers5@gmail.com",phone:"+1 (305) 849-3699",created:"Mar 13, 2026",source:"Directory"},
  {id:"KX1T",name:"Mari Quero",email:"mafequero@gmail.com",phone:"+1 (786) 599-3885",created:"Mar 13, 2026",source:"Directory"},
  {id:"BV35",name:"Henry Batievsky",email:"hbatievsky@me.com",phone:"+1 (305) 987-5147",created:"Mar 13, 2026",source:"Directory"},
  {id:"VEBR",name:"David Miller",email:"Dmiller8994@gmail.com",phone:"+1 (856) 278-0682",created:"Mar 12, 2026",source:"Loyalty"},
  {id:"4DFD",name:"Milin Shah",email:"milin.y.shah@gmail.com",phone:"+1 (973) 769-9720",created:"Mar 12, 2026",source:"Third Party"},
  {id:"MXR4",name:"William Serradec",phone:"+1 (786) 653-0380",created:"Mar 12, 2026",source:"Third Party"},
  {id:"7NR4",name:"Sean Pascale",email:"sean.e.pascale@gmail.com",phone:"+1 (786) 205-0187",created:"Mar 12, 2026",source:"Loyalty"},
  {id:"R6ZQ",name:"Fallon Sullivan",email:"Fallon.Sullivan@citadel.com",phone:"+1 (312) 593-0910",created:"Mar 11, 2026",source:"Loyalty"},
  {id:"H2YK",name:"Augusto Acosta",email:"augusacosta45@gmail.com",phone:"+1 (305) 773-7799",created:"Mar 11, 2026",source:"Loyalty"},
  {id:"K5XM",name:"Luis Calzadilla",phone:"+1 (585) 797-7706",created:"Mar 11, 2026",source:"Loyalty"},
  {id:"058R",name:"Jhonathan Folger",phone:"+1 (704) 400-0932",created:"Mar 11, 2026",source:"Third Party"},
  {id:"WQWY",name:"Eric Gilbert",email:"ebgilbert@gmail.com",phone:"(786) 281-9558",created:"Mar 10, 2026",source:"Directory"},
  {id:"0721",name:"Osvani Garcia",phone:"+1 (954) 559-3219",created:"Mar 9, 2026",source:"Loyalty"},
  {id:"VWKF",name:"David Martinez",phone:"+1 (786) 609-0040",created:"Mar 8, 2026",source:"Third Party"},
  {id:"R9E9",name:"Caroline Osei",phone:"+1 (203) 964-7006",created:"Mar 8, 2026",source:"Third Party"},
  {id:"YCBK",name:"William Volet",phone:"+1 (203) 912-8076",created:"Mar 8, 2026",source:"Loyalty"},
  {id:"MA9M",name:"Fernando Crespo",email:"fcrespo121@aol.com",phone:"+1 (305) 321-6773",created:"Mar 8, 2026",source:"Loyalty"},
  {id:"Z53C",name:"Gustavo Gomez",phone:"+1 (305) 336-9684",created:"Mar 7, 2026",source:"Third Party"},
  {id:"40ZD",name:"Sebastian Serrano",email:"sebaserrano20@hotmail.com",phone:"+1 (786) 343-7986",created:"Mar 7, 2026",source:"Directory"},
  {id:"W1RP",name:"Luke Wilson",email:"wilsonluke39@gmail.com",phone:"+1 (401) 269-6311",created:"Mar 7, 2026",source:"Loyalty"},
  {id:"FCTK",name:"Jason Babun",email:"jbabs1998@gmail.com",phone:"+1 (754) 204-6635",created:"Mar 7, 2026",source:"Appointments"},
  {id:"W9QN",name:"Nicolas Gonzalez Bernaldo",phone:"+1 (315) 909-4405",created:"Mar 6, 2026",source:"Third Party"},
  {id:"6FY6",name:"Jasleen Jhajj",email:"jasleenj@gmail.com",phone:"+1 (312) 843-4094",created:"Mar 5, 2026",source:"Directory"},
  {id:"7TQX",name:"Aaron Frazier",email:"aarondfrazier@gmail.com",phone:"+1 (352) 634-2638",created:"Mar 5, 2026",source:"Loyalty"},
  {id:"KAXH",name:"Ryan Petit",email:"rpetit33@gmail.com",phone:"+1 (603) 661-7727",created:"Mar 4, 2026",source:"Loyalty"},
  {id:"3BF8",name:"Aakash Rana",phone:"+1 (201) 280-3528",created:"Mar 4, 2026",source:"Loyalty"},
  {id:"5FMV",name:"Brett Bocner",phone:"+1 (305) 484-1760",created:"Mar 4, 2026",source:"Loyalty"},
  {id:"1K0F",name:"Efrain Falcon",phone:"+1 (786) 820-2799",created:"Mar 2, 2026",source:"Loyalty"},
  {id:"BRZD",name:"Lioz Grunberger",email:"Liozg23@gmail.com",phone:"+1 (954) 908-9335",created:"Mar 2, 2026",source:"Appointments"},
  {id:"XA3Z",name:"Arnold Wong",email:"arnold4@gmail.com",phone:"+44 748-119-2755",created:"Mar 2, 2026",source:"Loyalty"},
  {id:"5T48",name:"Andy Decossard",phone:"+1 (203) 979-8549",created:"Mar 1, 2026",source:"Loyalty"}
];
const TC={none:"#888",starter:"#4A8B6E",player:"#2D8A5E",champion:"#124A2B"};
const TN={none:"Non-Member",starter:"Starter",player:"Player",champion:"Champion"};
const HU=[{h:"7AM",p:15},{h:"8AM",p:25},{h:"9AM",p:55},{h:"10AM",p:72},{h:"11AM",p:68},{h:"12PM",p:45},{h:"1PM",p:40},{h:"2PM",p:52},{h:"3PM",p:58},{h:"4PM",p:65},{h:"5PM",p:88},{h:"6PM",p:95},{h:"7PM",p:92},{h:"8PM",p:78},{h:"9PM",p:55}];
const TR=[{tier:"Champion",count:12,rev:"$7,200",pct:28,avg:32},{tier:"Player",count:45,rev:"$9,000",pct:35,avg:18},{tier:"Starter",count:30,rev:"$1,350",pct:5,avg:8},{tier:"Non-Member",count:180,rev:"$8,100",pct:32,avg:3}];

export default function AdminApp(){
  const[logged,setLogged]=useState(false);
  const[role,setRole]=useState(null);
  const[uN,setUN]=useState("");
  const[view,setView]=useState("book");
  const[toast,setToast]=useState(null);
  const[cfg,setCfg]=useState({pk:75,op:50,wk:50});
  const[sq,setSq]=useState("");
  const[selC,setSelC]=useState(null);
  const[selB,setSelB]=useState(null);
  const[selS,setSelS]=useState(null);
  // Date range & comparison
  const[dateMode,setDateMode]=useState("today"); // today, range, specific
  const[dateFrom,setDateFrom]=useState("2026-03-16");
  const[dateTo,setDateTo]=useState("2026-03-16");
  const[compareMode,setCompareMode]=useState("none"); // none, prevPeriod, lastMonth
  // Membership management
  const[memView,setMemView]=useState("list"); // list, add, detail
  const[memCust,setMemCust]=useState(null);
  const[memSort,setMemSort]=useState("name"); // name, renewal
  const[memTier,setMemTier]=useState("starter");
  const[memSearch,setMemSearch]=useState("");
  // Facility management
  const[facTab,setFacTab]=useState("bays"); // bays, staff, settings
  const[bayBlocks,setBayBlocks]=useState([{id:1,bays:[2],from:"2026-03-20",to:"2026-03-22",timeFrom:"",timeTo:"",allDay:true,reason:"Trackman calibration"},{id:2,bays:[1,3],from:"2026-03-25",to:"2026-03-25",timeFrom:"5:00 PM",timeTo:"9:00 PM",allDay:false,reason:"Private event"}]);
  const[selBlock,setSelBlock]=useState(null);
  const[newBlock,setNewBlock]=useState({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});
  const[editCoach,setEditCoach]=useState(null);
  const[coachSchedules,setCoachSchedules]=useState({
    "TMiz":{Mon:{on:true,from:"9:00 AM",to:"5:00 PM"},Tue:{on:true,from:"9:00 AM",to:"5:00 PM"},Wed:{on:true,from:"10:00 AM",to:"6:00 PM"},Thu:{on:true,from:"9:00 AM",to:"5:00 PM"},Fri:{on:true,from:"9:00 AM",to:"3:00 PM"},Sat:{on:true,from:"10:00 AM",to:"4:00 PM"},Sun:{on:false,from:"",to:""}},
    "TMa5":{Mon:{on:true,from:"10:00 AM",to:"6:00 PM"},Tue:{on:false,from:"",to:""},Wed:{on:true,from:"9:00 AM",to:"5:00 PM"},Thu:{on:true,from:"10:00 AM",to:"6:00 PM"},Fri:{on:true,from:"12:00 PM",to:"7:00 PM"},Sat:{on:true,from:"9:00 AM",to:"3:00 PM"},Sun:{on:false,from:"",to:""}}
  });
  const fire=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),3200);},[]);
  const has=p=>role&&ROLES[role].perms.includes(p);

  /* ─── Load live data from Supabase ─── */
  const[liveBk,setLiveBk]=useState([]);
  const[liveCusts,setLiveCusts]=useState([]);
  const loadData=useCallback(async()=>{
    const bookings=await sbGet("bookings","select=*&order=created_at.desc&limit=50");
    if(bookings?.length) setLiveBk(bookings);
    const customers=await sbGet("customers","select=*&order=created_at.desc");
    if(customers?.length) setLiveCusts(customers);
    const pricing=await sbGet("pricing_config","select=*");
    if(pricing?.[0]) setCfg({pk:pricing[0].peak_rate,op:pricing[0].off_peak_rate,wk:pricing[0].weekend_rate});
    const blocks=await sbGet("bay_blocks","select=*");
    if(blocks?.length) setBayBlocks(blocks);
  },[]);
  useEffect(()=>{loadData();},[loadData]);
  /* Merge live bookings with mock for display */
  const allBk=[...BK,...liveBk.map((b,i)=>({id:900+i,type:b.type,cust:b.coach_name||"Customer",bay:"Bay "+(b.bay||1),time:b.start_time,dur:(b.duration_slots*0.5)+"h",status:b.status,amt:b.amount===0?"$0 (credit)":"$"+Number(b.amount).toFixed(2),tier:"player",isLive:true}))];
  const allCusts=[...CUSTS,...liveCusts.map(c=>({id:c.id,name:c.first_name+" "+c.last_name,email:c.email,phone:c.phone,created:new Date(c.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),source:"App",tier:c.tier}))];


  if(!logged) return(<div style={LS.w}><style>{CSS}</style><div style={LS.c}>
    <div style={LS.br}><div style={LS.logo}>⛳</div><h1 style={LS.bn}>BIRDIE GOLF</h1><p style={LS.bs}>ADMIN DASHBOARD</p></div>
    <div style={LS.col}><p style={{fontSize:13,color:"#666",textAlign:"center",marginBottom:4}}>Select your profile</p>
      {TEAM.map(t=><button key={t.id} style={LS.rb} onClick={()=>{setRole(t.role);setUN(t.name);setLogged(true);}}>
        <div style={{...LS.ri,background:ROLES[t.role].c}}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
        <div style={{flex:1,textAlign:"left"}}><p style={{fontSize:14,fontWeight:600}}>{t.name}</p><p style={{fontSize:11,color:"#888"}}>{t.title}</p></div>
        <span style={{...LS.rBdg,background:ROLES[t.role].c}}>{ROLES[t.role].n}</span>
      </button>)}
    </div></div></div>);

  const nav=[{k:"book",l:"Bookings",ic:X.cal},...(has("members")?[{k:"members",l:"Memberships",ic:X.crown}]:[]),{k:"dash",l:"Dashboard",ic:X.grid},...(has("reports")?[{k:"report",l:"Reports",ic:X.bar}]:[]),...(has("facility")?[{k:"facility",l:"Facility",ic:X.wrench}]:[])];
  let content=null;

  if(view==="dash"){
    const rev=allBk.reduce((s,b)=>{const m=b.amt.replace(/[^0-9.]/g,"");return s+parseFloat(m||0);},0);
    // Mock comparison data
    const prevRev=rev*0.85;const prevBookings=Math.round(allBk.length*0.9);
    const revDelta=((rev-prevRev)/prevRev*100).toFixed(0);
    const bkDelta=((allBk.length-prevBookings)/prevBookings*100).toFixed(0);
    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div><h2 style={{fontSize:22,fontWeight:700}}>Dashboard</h2><p style={{fontSize:13,color:"#888"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p></div><span style={{...S.badge,background:ROLES[role].c}}>{ROLES[role].n}</span></div>

      {/* Date Range Selector */}
      <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,padding:12,marginBottom:16}}>
        <div style={{display:"flex",gap:4,marginBottom:10}}>{[{k:"today",l:"Today"},{k:"specific",l:"Date"},{k:"range",l:"Range"}].map(m=><button key={m.k} style={{...GS.togBtn,flex:1,fontSize:11,...(dateMode===m.k?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setDateMode(m.k)}>{m.l}</button>)}</div>
        {dateMode==="specific"&&<div style={{marginBottom:8}}><input type="date" style={GS.input} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>}
        {dateMode==="range"&&<div style={{display:"flex",gap:8,marginBottom:8}}><input type="date" style={{...GS.input,flex:1}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/><span style={{alignSelf:"center",color:"#888"}}>to</span><input type="date" style={{...GS.input,flex:1}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>}
        <div style={{display:"flex",gap:4}}><span style={{fontSize:11,color:"#888",alignSelf:"center",marginRight:4}}>Compare:</span>{[{k:"none",l:"None"},{k:"prevPeriod",l:"Previous Period"},{k:"lastMonth",l:"Same Period Last Month"}].map(m=><button key={m.k} style={{...GS.togBtn,fontSize:10,padding:"4px 8px",...(compareMode===m.k?{background:"#5B6DCD",color:"#fff",borderColor:"#5B6DCD"}:{})}} onClick={()=>setCompareMode(m.k)}>{m.l}</button>)}</div>
      </div>

      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        <div style={S.kpi}><p style={S.kpiL}>Revenue</p><p style={S.kpiV}>${rev.toFixed(0)}</p>{compareMode!=="none"&&<p style={{fontSize:10,color:Number(revDelta)>=0?"#2D8A5E":"#E03928",fontWeight:600}}>{Number(revDelta)>=0?"+":""}{revDelta}% vs prev</p>}<p style={S.kpiD}>{allBk.filter(b=>!b.amt.includes("credit")&&!b.amt.includes("unlimited")).length} paid</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Bookings</p><p style={S.kpiV}>{allBk.length}</p>{compareMode!=="none"&&<p style={{fontSize:10,color:Number(bkDelta)>=0?"#2D8A5E":"#E03928",fontWeight:600}}>{Number(bkDelta)>=0?"+":""}{bkDelta}% vs prev</p>}<p style={S.kpiD}>{allBk.filter(b=>b.status==="checked-in").length} checked in</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Bay Utilization</p><p style={S.kpiV}>68%</p>{compareMode!=="none"&&<p style={{fontSize:10,color:"#2D8A5E",fontWeight:600}}>+5% vs prev</p>}<p style={S.kpiD}>5 bays</p></div>
        <div style={S.kpi}><p style={S.kpiL}>Active Members</p><p style={S.kpiV}>87</p><p style={S.kpiD}>12 CHP · 45 PLR · 30 STR</p></div>
      </div>
      <h3 style={S.sh}>Today's Schedule</h3>
      {allBk.map(b=>{const bkC=b.type==="lesson"?BK_COLORS.lesson:BK_COLORS[b.tier]||BK_COLORS.none;return <div key={b.id} style={{...S.bkR,borderLeftColor:bkC}}><div style={{flex:1}}><p style={{fontSize:13,fontWeight:600}}>{b.cust}</p><p style={{fontSize:11,color:"#888"}}>{b.bay} · {b.time} · {b.dur}{b.coach?" · "+b.coach:""}</p></div><div style={{textAlign:"right"}}><span style={{fontSize:12,fontWeight:700,fontFamily:mono}}>{b.amt}</span><p style={{fontSize:10,color:b.status==="checked-in"?"#2D8A5E":"#E8890C",fontWeight:600}}>{b.status==="checked-in"?"Checked In":"Confirmed"}</p></div></div>})}
    </div>;
  }
  else if(view==="book"){
    // Bay grid scheduler
    const SLOTS=[];
    for(let h=7;h<=21;h++){for(let m=0;m<60;m+=30){
      const hr=h>12?h-12:h===0?12:h;const ap=h>=12?"PM":"AM";
      SLOTS.push(hr+":"+(m===0?"00":"30")+" "+ap);
    }}
    // Build grid data: which slots are booked per bay
    const gridData={};
    [1,2,3,4,5].forEach(b=>{gridData[b]={};SLOTS.forEach(s=>{gridData[b][s]=null;});});
    // Map bookings to grid (parse dur to slots)
    const parseDur=d=>{const n=parseFloat(d);return Math.round(n*2);}; // 1h=2 slots, 1.5h=3
    const slotIdx=s=>SLOTS.indexOf(s);
    BK.forEach(bk=>{
      const bayNum=parseInt(bk.bay.replace("Bay ",""));
      const si2=slotIdx(bk.time);
      const dur=parseDur(bk.dur);
      if(si2>=0){for(let i=0;i<dur&&si2+i<SLOTS.length;i++){
        gridData[bayNum][SLOTS[si2+i]]={...bk,isStart:i===0,span:dur};
      }}
    });

    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Bay Schedule</h2>
        <button style={{...S.b1,width:"auto",padding:"8px 16px",display:"flex",alignItems:"center",gap:6}} onClick={()=>setSelB({id:"new",type:"bay",cust:"",bay:"Bay 1",time:"9:00 AM",dur:"1h",status:"confirmed",amt:"",isNew:true,newCust:false,firstName:"",lastName:"",phone:"",email:""})}>{X.cal(14)} New Booking</button>
      </div>

      {/* Grid */}
      <div style={{overflowX:"auto",border:"1px solid #e8e8e6",borderRadius:14,background:"#fff"}}>
        <div style={{display:"grid",gridTemplateColumns:"70px repeat(5,1fr)",minWidth:600}}>
          {/* Header */}
          <div style={GS.hdr}></div>
          {[1,2,3,4,5].map(b=><div key={b} style={GS.hdr}><span style={{fontWeight:700,fontSize:13}}>Bay {b}</span></div>)}

          {/* Time rows */}
          {SLOTS.map((sl,ri)=>{
            const isPeak=sl.includes("PM")&&!sl.startsWith("12")&&parseInt(sl)>=5&&parseInt(sl)<=9&&!sl.includes("10");
            return <React.Fragment key={sl}>
              <div style={{...GS.timeCell,background:ri%2===0?"#fafaf8":"#fff"}}><span style={{fontSize:10,fontWeight:600,color:"#888",fontFamily:mono}}>{sl}</span></div>
              {[1,2,3,4,5].map(bay=>{
                const cell=gridData[bay][sl];
                if(cell&&!cell.isStart) return <div key={bay} style={{...GS.cell,background:ri%2===0?"#fafaf8":"#fff"}}></div>;
                if(cell&&cell.isStart){
                  const bkColor=cell.type==="lesson"?BK_COLORS.lesson:BK_COLORS[cell.tier]||BK_COLORS.none;
                  const tierLabel=cell.type==="lesson"?"Lesson":cell.tier==="champion"?"CHP":cell.tier==="player"?"PLR":cell.tier==="starter"?"STR":"";
                  return <div key={bay} style={{...GS.cell,background:ri%2===0?"#fafaf8":"#fff",position:"relative"}}>
                    <div style={{...GS.booking,background:bkColor,height:cell.span*28-4,cursor:"pointer"}} onClick={()=>setSelB(cell)}>
                      <span style={{fontSize:10,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{cell.cust}</span>
                      <span style={{fontSize:8,color:"#ffffffcc"}}>{cell.dur}{tierLabel?" · "+tierLabel:""}</span>
                    </div>
                  </div>;
                }
                return <div key={bay} style={{...GS.cell,background:ri%2===0?"#fafaf8":"#fff",cursor:"pointer"}} onClick={()=>setSelB({id:"new",type:"bay",cust:"",bay:"Bay "+bay,time:sl,dur:"1h",status:"confirmed",amt:"",isNew:true,newCust:false,firstName:"",lastName:"",phone:"",email:""})}></div>;
              })}
            </React.Fragment>;
          })}
        </div>
      </div>

      {/* Color Legend */}
      <div style={{display:"flex",gap:14,marginTop:24,marginBottom:10,flexWrap:"wrap"}}>
        {[{l:"Player",c:BK_COLORS.player},{l:"Starter",c:BK_COLORS.starter},{l:"Champion",c:BK_COLORS.champion},{l:"Lesson",c:BK_COLORS.lesson},{l:"Non-Member",c:BK_COLORS.none}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:3,background:x.c}}/><span style={{fontSize:10,color:"#888"}}>{x.l}</span></div>)}
      </div>

      {/* List view below */}
      <h3 style={{...S.sh,marginTop:8}}>All Bookings</h3>
      {allBk.map(b=>{const bkC=b.type==="lesson"?BK_COLORS.lesson:BK_COLORS[b.tier]||BK_COLORS.none;return <div key={b.id} style={{...S.bkR,borderLeftColor:bkC,cursor:"pointer"}} onClick={()=>setSelB(b)}><div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{b.cust}</p><p style={{fontSize:12,color:"#888"}}>{b.type==="lesson"?"Lesson":"Bay"} · {b.bay} · {b.time} · {b.dur}</p>{b.coach&&<p style={{fontSize:11,color:BK_COLORS.lesson}}>Coach: {b.coach}</p>}</div><div style={{textAlign:"right"}}><span style={{fontSize:13,fontWeight:700,fontFamily:mono}}>{b.amt}</span><p style={{fontSize:10,fontWeight:600,color:b.status==="checked-in"?"#2D8A5E":"#E8890C"}}>{b.status==="checked-in"?"Checked In":"Confirmed"}</p></div></div>})}

      {/* Booking Detail / Edit / New Modal */}
      {selB&&<div style={S.ov} onClick={()=>setSelB(null)}><div style={{...S.mod,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:18,fontWeight:700,marginBottom:14}}>{selB.isNew?"New Booking":"Booking Details"}</h3>

        {/* Customer — existing or new */}
        {selB.isNew?<div style={{marginBottom:12}}>
          <label style={GS.label}>CUSTOMER</label>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button style={{...GS.togBtn,...(!selB.newCust?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,newCust:false})}>Existing</button>
            <button style={{...GS.togBtn,...(selB.newCust?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,newCust:true,cust:""})}>New Customer</button>
          </div>
          {selB.newCust?<div style={{background:"#fafaf8",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FIRST NAME *</label><input style={GS.input} placeholder="First name" value={selB.firstName||""} onChange={e=>setSelB({...selB,firstName:e.target.value})}/></div>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>LAST NAME *</label><input style={GS.input} placeholder="Last name" value={selB.lastName||""} onChange={e=>setSelB({...selB,lastName:e.target.value})}/></div>
            </div>
            <div><label style={{...GS.label,fontSize:10}}>PHONE NUMBER *</label><input style={GS.input} type="tel" placeholder="(305) 555-0000" value={selB.phone||""} onChange={e=>setSelB({...selB,phone:e.target.value})}/></div>
            <div><label style={{...GS.label,fontSize:10}}>EMAIL (optional)</label><input style={GS.input} type="email" placeholder="email@example.com" value={selB.email||""} onChange={e=>setSelB({...selB,email:e.target.value})}/></div>
            <p style={{fontSize:10,color:"#888"}}>Customer will be created in Square upon booking.</p>
          </div>:<div>
            <input style={GS.input} placeholder="Search existing customer..." value={selB.cust} onChange={e=>setSelB({...selB,cust:e.target.value})}/>
            {selB.cust&&<div style={{border:"1px solid #e8e8e6",borderRadius:8,marginTop:4,maxHeight:150,overflowY:"auto"}}>{allCusts.filter(c=>c.name.toLowerCase().includes(selB.cust.toLowerCase())||c.phone.includes(selB.cust)).slice(0,8).map(c=><div key={c.id} style={{padding:"8px 12px",borderBottom:"1px solid #f2f2f0",cursor:"pointer",fontSize:13}} onClick={()=>setSelB({...selB,cust:c.name,custId:c.id})}><span style={{fontWeight:600}}>{c.name}</span> <span style={{color:"#888",fontSize:11}}>{c.phone}</span></div>)}{allCusts.filter(c=>c.name.toLowerCase().includes(selB.cust.toLowerCase())||c.phone.includes(selB.cust)).length===0&&<p style={{padding:"8px 12px",fontSize:12,color:"#888"}}>No match — try "New Customer"</p>}</div>}
          </div>}
        </div>:<div style={{marginBottom:12}}>
          <label style={GS.label}>CUSTOMER</label>
          <p style={{fontSize:14,fontWeight:600}}>{selB.cust}</p>
        </div>}

        {/* Type */}
        <div style={{marginBottom:12}}>
          <label style={GS.label}>Type</label>
          <div style={{display:"flex",gap:6}}>
            {["bay","lesson"].map(t=><button key={t} style={{...GS.togBtn,...(selB.type===t?{background:t==="lesson"?"#5B6DCD":"#2D8A5E",color:"#fff",borderColor:t==="lesson"?"#5B6DCD":"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,type:t})}>{t==="lesson"?"Lesson":"Bay Rental"}</button>)}
          </div>
        </div>

        {/* Bay */}
        <div style={{marginBottom:12}}>
          <label style={GS.label}>Bay</label>
          <div style={{display:"flex",gap:6}}>
            {[1,2,3,4,5].map(b=><button key={b} style={{...GS.togBtn,...(selB.bay==="Bay "+b?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,bay:"Bay "+b})}>Bay {b}</button>)}
          </div>
        </div>

        {/* Time */}
        <div style={{marginBottom:12}}>
          <label style={GS.label}>Start Time</label>
          <select style={GS.select} value={selB.time} onChange={e=>setSelB({...selB,time:e.target.value})}>
            {SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Duration */}
        <div style={{marginBottom:12}}>
          <label style={GS.label}>DURATION</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["30m","1h","1.5h","2h","2.5h","3h","3.5h","4h"].map(d=><button key={d} style={{...GS.togBtn,...(selB.dur===d?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,dur:d})}>{d}</button>)}
          </div>
        </div>

        {/* Price Calculation — 7% tax on bay bookings, no tax on lessons */}
        {selB.time&&selB.dur&&(()=>{
          const durMap={"30m":1,"1h":2,"1.5h":3,"2h":4,"2.5h":5,"3h":6,"3.5h":7,"4h":8};
          const numSlots=durMap[selB.dur]||2;
          const startIdx=SLOTS.indexOf(selB.time);
          const today=new Date();
          const isWeekend=today.getDay()===0||today.getDay()===6;
          const isLesson=selB.type==="lesson";
          const taxRate=isLesson?0:0.07;
          let subtotal=0;
          const breakdown=[];
          for(let i=0;i<numSlots&&startIdx+i<SLOTS.length;i++){
            const sl=SLOTS[startIdx+i];
            const hr=parseInt(sl);const isPM=sl.includes("PM");
            const hour24=isPM&&hr!==12?hr+12:!isPM&&hr===12?0:hr;
            const isPeak=!isWeekend&&hour24>=17&&hour24<22;
            const rate=isWeekend?cfg.wk:isPeak?cfg.pk:cfg.op;
            subtotal+=rate/2;
            if(i===0||breakdown[breakdown.length-1].rate!==rate){breakdown.push({rate,slots:1,label:isPeak?"Peak":isWeekend?"Weekend":"Off-Peak"});}
            else{breakdown[breakdown.length-1].slots++;}
          }
          const tax=subtotal*taxRate;
          const total=subtotal+tax;
          return <div style={{background:"#f8faf9",border:"1px solid #2D8A5E25",borderRadius:12,padding:14,marginBottom:12}}>
            <label style={{...GS.label,marginBottom:8}}>PRICE BREAKDOWN</label>
            {breakdown.map((b,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555",padding:"3px 0"}}>
              <span>{b.label} ({b.slots*30}min × ${b.rate}/hr)</span>
              <span style={{fontWeight:600,fontFamily:mono}}>${(b.rate/2*b.slots).toFixed(2)}</span>
            </div>)}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555",padding:"3px 0"}}>
              <span>Subtotal</span><span style={{fontWeight:600,fontFamily:mono}}>${subtotal.toFixed(2)}</span>
            </div>
            {!isLesson&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",padding:"3px 0"}}>
              <span>Tax (7%)</span><span style={{fontWeight:600,fontFamily:mono}}>${tax.toFixed(2)}</span>
            </div>}
            {isLesson&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",padding:"3px 0"}}>
              <span>Tax</span><span style={{fontSize:11,color:"#888"}}>Not applicable</span>
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700,paddingTop:8,marginTop:6,borderTop:"1px solid #2D8A5E25"}}>
              <span>Total</span>
              <span style={{fontFamily:mono,color:"#2D8A5E"}}>${total.toFixed(2)}</span>
            </div>
          </div>;
        })()}

        {/* Payment Method */}
        <div style={{marginBottom:12}}>
          <label style={GS.label}>PAYMENT METHOD</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Charge card","Use bay credits","Use lesson credit","Comp (free)"].map(p=><button key={p} style={{...GS.togBtn,...(selB.amt===p?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setSelB({...selB,amt:p})}>{p}</button>)}
          </div>
          {selB.amt==="Use bay credits"&&<p style={{fontSize:11,color:"#5B6DCD",marginTop:6}}>Bay credits will be deducted from the customer's membership balance.</p>}
          {selB.amt==="Use lesson credit"&&<p style={{fontSize:11,color:"#5B6DCD",marginTop:6}}>1 lesson credit will be deducted from the customer's package.</p>}
          {selB.amt==="Comp (free)"&&<p style={{fontSize:11,color:"#888",marginTop:6}}>No charge — booking will be recorded as complimentary.</p>}
        </div>

        {/* Credit Card Input — required for new customers paying by card */}
        {selB.isNew&&selB.amt==="Charge card"&&<div style={{marginBottom:12}}>
          <label style={GS.label}>CREDIT CARD {selB.newCust&&<span style={{color:"#E03928"}}>*</span>}</label>
          {selB.newCust?<div style={{background:"#fafaf8",borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8}}>
            <div><label style={{...GS.label,fontSize:10}}>CARDHOLDER NAME</label><input style={GS.input} placeholder="Name on card" value={selB.cardName||""} onChange={e=>setSelB({...selB,cardName:e.target.value})}/></div>
            <div><label style={{...GS.label,fontSize:10}}>CARD NUMBER</label><input style={GS.input} placeholder="4242 4242 4242 4242" value={selB.cardNum||""} onChange={e=>setSelB({...selB,cardNum:e.target.value})}/></div>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>EXP</label><input style={GS.input} placeholder="MM/YY" value={selB.cardExp||""} onChange={e=>setSelB({...selB,cardExp:e.target.value})}/></div>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>CVC</label><input style={GS.input} placeholder="123" value={selB.cardCvc||""} onChange={e=>setSelB({...selB,cardCvc:e.target.value})}/></div>
              <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>ZIP</label><input style={GS.input} placeholder="33137" value={selB.cardZip||""} onChange={e=>setSelB({...selB,cardZip:e.target.value})}/></div>
            </div>
            <p style={{fontSize:10,color:"#888"}}>Card will be saved to customer's Square profile and charged upon approval.</p>
          </div>:<p style={{fontSize:12,color:"#555"}}>Card on file will be charged for this booking.</p>}
        </div>}

        {/* Status (existing bookings) */}
        {!selB.isNew&&<div style={{marginBottom:12}}>
          <label style={GS.label}>Status</label>
          <div style={{display:"flex",gap:6}}>
            {["confirmed","checked-in","cancelled"].map(st=><button key={st} style={{...GS.togBtn,...(selB.status===st?{background:st==="checked-in"?"#2D8A5E":st==="cancelled"?"#E03928":"#E8890C",color:"#fff",borderColor:st==="checked-in"?"#2D8A5E":st==="cancelled"?"#E03928":"#E8890C"}:{})}} onClick={()=>setSelB({...selB,status:st})}>{st==="checked-in"?"Check In":st==="cancelled"?"Cancel":"Confirmed"}</button>)}
          </div>
        </div>}

        {/* Actions */}
        {selB.isNew&&selB.newCust&&!(selB.firstName&&selB.lastName&&selB.phone)&&<p style={{fontSize:11,color:"#E03928",marginTop:8}}>First name, last name, and phone number are required for new customers.</p>}
        {selB.isNew&&selB.newCust&&selB.amt==="Charge card"&&!(selB.cardNum&&selB.cardExp&&selB.cardCvc)&&(selB.firstName&&selB.lastName&&selB.phone)&&<p style={{fontSize:11,color:"#E03928",marginTop:8}}>Credit card information is required to complete the booking.</p>}
        {(()=>{
          const needsCust=selB.isNew&&selB.newCust&&!(selB.firstName&&selB.lastName&&selB.phone);
          const needsCard=selB.isNew&&selB.newCust&&selB.amt==="Charge card"&&!(selB.cardNum&&selB.cardExp&&selB.cardCvc);
          const needsExisting=selB.isNew&&!selB.newCust&&!selB.cust;
          const canSubmit=!needsCust&&!needsCard&&!needsExisting;
          return <div style={{display:"flex",gap:8,marginTop:12}}>
            <button style={{...S.b1,flex:1,opacity:canSubmit?1:0.35}} onClick={async()=>{
              if(!canSubmit){fire(needsCust?"Fill required customer fields":needsCard?"Card info required":"Select a customer");return;}
              const bayNum=parseInt((selB.bay||"").replace("Bay ",""))||1;
              const durMap={"30m":1,"1h":2,"1.5h":3,"2h":4,"2.5h":5,"3h":6,"3.5h":7,"4h":8};
              let sqCustId=null;
              // Create Square customer if new
              if(selB.isNew&&selB.newCust){
                const sbCust=await sbPost("customers",{phone:selB.phone||"",first_name:selB.firstName||"",last_name:selB.lastName||"",email:selB.email||"",tier:"none"});
                const sbId=sbCust?.[0]?.id;
                const sqResult=await sqCall("customer.create",{first_name:selB.firstName,last_name:selB.lastName,phone:selB.phone,email:selB.email,supabase_id:sbId});
                sqCustId=sqResult?.customer?.id;
                if(sqCustId&&sbId) await sbPatch("customers",`id=eq.${sbId}`,{square_customer_id:sqCustId});
              }
              // Save booking to Supabase
              await sbPost("bookings",{type:selB.type,bay:bayNum,date:new Date().toISOString().split("T")[0],start_time:selB.time,duration_slots:durMap[selB.dur]||2,status:"confirmed",amount:0,coach_name:selB.type==="lesson"?(selB.coach||""):"",});
              if(selB.isNew&&selB.newCust){
                fire(selB.amt==="Charge card"?"Payment approved! Booking confirmed ✓":"Customer created + booking confirmed ✓");
              } else {
                fire(selB.isNew?"Booking created ✓":"Booking updated ✓");
              }
              loadData();
              setSelB(null);
            }}>{selB.isNew?(selB.amt==="Charge card"?"Charge & Confirm Booking":"Create Booking"):"Save Changes"}</button>
            {!selB.isNew&&<button style={{...S.b1,flex:0,background:"#E03928",padding:"12px 18px"}} onClick={()=>{setSelB(null);fire("Booking cancelled — customer notified via SMS & email");}}>Cancel</button>}
          </div>;
        })()}
        <button style={{...S.lk,marginTop:8}} onClick={()=>setSelB(null)}>Close</button>
      </div></div>}
    </div>;
  }



  else if(view==="report"){
    const mx=Math.max(...HU.map(h=>h.p));
    content=<div style={S.pad}><h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Reports</h2>

      {/* Date Range Selector */}
      <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,padding:12,marginBottom:16}}>
        <div style={{display:"flex",gap:4,marginBottom:10}}>{[{k:"today",l:"Today"},{k:"specific",l:"Date"},{k:"range",l:"Range"}].map(m=><button key={m.k} style={{...GS.togBtn,flex:1,fontSize:11,...(dateMode===m.k?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setDateMode(m.k)}>{m.l}</button>)}</div>
        {dateMode==="specific"&&<div style={{marginBottom:8}}><input type="date" style={GS.input} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>}
        {dateMode==="range"&&<div style={{display:"flex",gap:8,marginBottom:8}}><input type="date" style={{...GS.input,flex:1}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/><span style={{alignSelf:"center",color:"#888"}}>to</span><input type="date" style={{...GS.input,flex:1}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>}
        <div style={{display:"flex",gap:4}}><span style={{fontSize:11,color:"#888",alignSelf:"center",marginRight:4}}>Compare:</span>{[{k:"none",l:"None"},{k:"prevPeriod",l:"Previous Period"},{k:"lastMonth",l:"Same Period Last Month"}].map(m=><button key={m.k} style={{...GS.togBtn,fontSize:10,padding:"4px 8px",...(compareMode===m.k?{background:"#5B6DCD",color:"#fff",borderColor:"#5B6DCD"}:{})}} onClick={()=>setCompareMode(m.k)}>{m.l}</button>)}</div>
      </div>

      <div style={S.sec}><h4 style={S.secL}>{X.clock(14)} Utilization by Hour</h4><div style={{display:"flex",alignItems:"flex-end",gap:3,height:120,marginTop:8}}>{HU.map(h=><div key={h.h} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:7,fontWeight:700,color:h.p>=80?"#E03928":h.p>=60?"#E8890C":"#2D8A5E"}}>{h.p}%</span><div style={{width:"100%",height:(h.p/mx)*90,borderRadius:3,background:h.p>=80?"#E03928":h.p>=60?"#E8890C":"#2D8A5E",minHeight:4}}/><span style={{fontSize:7,color:"#aaa"}}>{h.h}</span></div>)}</div><div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,color:"#888"}}><span>Peak: 5–8 PM</span><span>Low: 7–8 AM</span></div></div>
      <div style={S.sec}><h4 style={S.secL}>{X.crown(14)} Tier Breakdown</h4><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>{TR.map(t=><div key={t.tier} style={{background:"#fafaf8",borderRadius:10,padding:12}}><p style={{fontSize:12,fontWeight:700,color:TC[t.tier.toLowerCase()]||"#888"}}>{t.tier}</p><p style={{fontSize:22,fontWeight:700,fontFamily:mono}}>{t.count}</p><p style={{fontSize:10,color:"#888"}}>{t.rev} · {t.pct}%</p></div>)}</div></div>
      <div style={S.sec}><h4 style={S.secL}>{X.card(14)} Revenue {compareMode!=="none"&&<span style={{fontSize:10,fontWeight:400,color:"#888",marginLeft:4}}>vs previous</span>}</h4>{[{l:"Bay Rentals",v:"$12,450",p:48,prev:"$11,200"},{l:"Memberships",v:"$8,850",p:34,prev:"$8,100"},{l:"Lessons",v:"$3,240",p:13,prev:"$2,880"},{l:"F&B",v:"$1,310",p:5,prev:"$1,150"}].map(r=><div key={r.l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span>{r.l}</span><div><span style={{fontWeight:700,fontFamily:mono}}>{r.v}</span>{compareMode!=="none"&&<span style={{fontSize:10,color:"#888",marginLeft:6}}>prev: {r.prev}</span>}</div></div><div style={{height:6,borderRadius:3,background:"#f0f0ee",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:"#2D8A5E",width:r.p+"%"}}/></div></div>)}<div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #f0f0ee",fontSize:15,fontWeight:700}}><span>Total</span><span style={{fontFamily:mono}}>$25,850</span></div></div>
    </div>;
  }

  // ── MEMBERSHIP MANAGEMENT ──
  else if(view==="members"){
    const TIER_INFO=[
      {id:"starter",n:"Starter",p:45,c:"#4A8B6E",badge:"STR",credits:"20% off bays",desc:"20% discount on hourly bay rate"},
      {id:"player",n:"Player",p:200,c:"#2D8A5E",badge:"PLR",credits:"8 hrs/mo",desc:"8 hrs bay rental + 20% off additional"},
      {id:"champion",n:"Champion",p:600,c:"#124A2B",badge:"CHP",credits:"Unlimited",desc:"Unlimited bay rental (2hr max per booking)"}
    ];
    // Mock members per tier
    const MEMBERS={
      champion:[
        {id:"c1",name:"Gaby Planas",phone:"(786) 365-6609",since:"Feb 2026",renews:"Apr 12, 2026",billingDay:12,credits:"\u221e",used:0,status:"active"},
        {id:"c2",name:"Fallon Sullivan",phone:"+1 (312) 593-0910",since:"Nov 2025",renews:"Apr 11, 2026",billingDay:11,credits:"\u221e",used:0,status:"active"},
      ],
      player:[
        {id:"p1",name:"Adrian McAdory",phone:"+1 (716) 510-3849",since:"Jan 2026",renews:"Apr 16, 2026",billingDay:16,credits:8,used:5,status:"active"},
        {id:"p2",name:"Beata Corey",phone:"+1 (203) 906-6307",since:"Mar 2026",renews:"Apr 15, 2026",billingDay:15,credits:8,used:2,status:"active"},
        {id:"p3",name:"Jake Rosenberg",phone:"+1 (845) 216-6394",since:"Dec 2025",renews:"Apr 8, 2026",billingDay:8,credits:8,used:7,status:"active"},
        {id:"p4",name:"Miguel Torres",phone:"+1 (645) 236-1320",since:"Jan 2026",renews:"Apr 13, 2026",billingDay:13,credits:8,used:3,status:"active"},
        {id:"p5",name:"Ryan Petit",phone:"+1 (603) 661-7727",since:"Mar 2026",renews:"Apr 4, 2026",billingDay:4,credits:8,used:0,status:"active"},
      ],
      starter:[
        {id:"s1",name:"Henry Beeson",phone:"+1 (708) 789-7219",since:"Mar 2026",renews:"Apr 15, 2026",billingDay:15,credits:0,used:0,status:"active"},
        {id:"s2",name:"Moises Vivas",phone:"(407) 535-2082",since:"Mar 2026",renews:"Apr 16, 2026",billingDay:16,credits:0,used:0,status:"active"},
      ]
    };
    // Mock transaction history per member
    const MEM_HISTORY={
      p1:[
        {date:"Mar 16, 2026",type:"credit",desc:"Bay rental \u2014 Bay 3 \u2014 1.5 hrs",credits:"-3"},
        {date:"Mar 15, 2026",type:"renewal",desc:"Monthly renewal",amount:"$200.00"},
        {date:"Mar 10, 2026",type:"credit",desc:"Bay rental \u2014 Bay 1 \u2014 1 hr",credits:"-2"},
        {date:"Feb 15, 2026",type:"renewal",desc:"Monthly renewal",amount:"$200.00"},
        {date:"Feb 8, 2026",type:"adjustment",desc:"Credit adjustment (+2 hrs)",credits:"+4"},
      ],
      c1:[
        {date:"Mar 16, 2026",type:"credit",desc:"Bay rental \u2014 Bay 2 \u2014 2 hrs",credits:"unlimited"},
        {date:"Mar 12, 2026",type:"renewal",desc:"Monthly renewal",amount:"$600.00"},
        {date:"Feb 12, 2026",type:"renewal",desc:"Monthly renewal",amount:"$600.00"},
      ],
    };
    const filteredMemCust=memSearch?allCusts.filter(c=>c.name.toLowerCase().includes(memSearch.toLowerCase())||c.phone.includes(memSearch)):CUSTS;
    const selTierInfo=TIER_INFO.find(t=>t.id===memTier);

    // Sort members helper
    const sortMembers=(arr)=>{
      const sorted=[...arr];
      if(memSort==="name") sorted.sort((a,b)=>a.name.localeCompare(b.name));
      else sorted.sort((a,b)=>new Date(a.renews)-new Date(b.renews));
      return sorted;
    };
    const activeTier=TIER_INFO.find(t=>t.id===memTier);
    const activeMembers=sortMembers(MEMBERS[memTier]||[]);

    content=<div style={S.pad}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Memberships</h2>
        <button style={{background:activeTier.c,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff}} onClick={()=>{setMemView("add");setMemCust(null);setMemSearch("");}}>+ Add Member</button>
      </div>

      {/* 3-way tier toggle */}
      <div style={{display:"flex",gap:0,marginBottom:16,background:"#f0f0ee",borderRadius:12,padding:3}}>
        {TIER_INFO.map(tier=>{const active=memTier===tier.id;const count=(MEMBERS[tier.id]||[]).length;return <button key={tier.id} style={{flex:1,padding:"10px 8px",borderRadius:10,border:"none",background:active?tier.c:"transparent",color:active?"#fff":"#888",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff,textAlign:"center",transition:"all .2s"}} onClick={()=>setMemTier(tier.id)}><span style={{display:"block"}}>{tier.badge}</span><span style={{display:"block",fontSize:10,fontWeight:400,marginTop:2}}>{count} member{count!==1?"s":""}</span></button>;})}
      </div>

      {/* Sort toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div><span style={{fontSize:15,fontWeight:700,color:activeTier.c}}>{activeTier.n}</span><span style={{fontSize:12,color:"#888",marginLeft:8}}>${activeTier.p}/mo · {activeTier.credits}</span></div>
        <div style={{display:"flex",gap:4}}>{[{k:"name",l:"A–Z"},{k:"renewal",l:"Renewal"}].map(s=><button key={s.k} style={{...GS.togBtn,fontSize:10,padding:"4px 10px",...(memSort===s.k?{background:"#2D8A5E",color:"#fff",borderColor:"#2D8A5E"}:{})}} onClick={()=>setMemSort(s.k)}>{s.l}</button>)}</div>
      </div>

      {/* Member count header */}
      <div style={{background:activeTier.c+"10",borderRadius:"12px 12px 0 0",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid "+activeTier.c+"20",borderBottom:"none"}}>
        <span style={{fontSize:13,fontWeight:700,color:activeTier.c}}>{activeMembers.length} {activeTier.n} Member{activeMembers.length!==1?"s":""}</span>
        <span style={{fontSize:10,color:"#888"}}>{memSort==="name"?"Sorted A–Z":"Sorted by renewal"}</span>
      </div>

      {/* Vertical member list */}
      <div style={{background:"#fff",border:"1px solid #e8e8e6",borderTop:"none",borderRadius:"0 0 12px 12px",marginBottom:16}}>
        {activeMembers.length>0?activeMembers.map((m,mi)=><div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:mi<activeMembers.length-1?"1px solid #f2f2f0":"none",cursor:"pointer"}} onClick={()=>{setMemCust(m);setMemView("detail");}}>
          <div style={{width:36,height:36,borderRadius:8,background:activeTier.c+"15",color:activeTier.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,fontFamily:mono,flexShrink:0}}>{m.name.split(" ").map(n=>n[0]).join("")}</div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:600}}>{m.name}</p>
            <p style={{fontSize:11,color:"#888"}}>Since {m.since} · Renews {m.renews}</p>
          </div>
          <div style={{textAlign:"right"}}>
            {memTier==="player"&&<p style={{fontSize:13,fontWeight:700,color:activeTier.c,fontFamily:mono}}>{m.credits-m.used}/{m.credits} hrs</p>}
            {memTier==="champion"&&<p style={{fontSize:13,fontWeight:700,color:activeTier.c}}>∞</p>}
            {memTier==="starter"&&<p style={{fontSize:12,color:activeTier.c,fontWeight:600}}>20% off</p>}
          </div>
        </div>):<div style={{padding:30,textAlign:"center"}}><p style={{fontSize:13,color:"#aaa"}}>No {activeTier.n} members yet</p><button style={{...S.b1,marginTop:12,maxWidth:200,margin:"12px auto 0"}} onClick={()=>{setMemView("add");setMemCust(null);setMemSearch("");}}>Add First Member</button></div>}
      </div>

      {/* MEMBER DETAIL MODAL */}
      {memView==="detail"&&memCust&&(()=>{
        const tier=TIER_INFO.find(t=>t.id===memTier);
        const hist=MEM_HISTORY[memCust.id]||[];
        return <div style={S.ov} onClick={()=>{setMemView("list");setMemCust(null);}}><div style={{...S.mod,maxWidth:520}} onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><h3 style={{fontSize:18,fontWeight:700}}>{memCust.name}</h3><p style={{fontSize:12,color:"#888"}}>{memCust.phone}</p></div>
            <span style={{...S.badge,background:tier.c}}>{tier.badge}</span>
          </div>

          {/* Details */}
          <div style={{marginBottom:16}}>
            {[["Tier",tier.n+" ($"+tier.p+"/mo)"],["Status",memCust.status],["Member Since",memCust.since],["Next Renewal",memCust.renews],["Billing Day",memCust.billingDay+"th of each month"]].map(([l,v],i)=><div key={i} style={S.dR}><span style={S.dL}>{l}</span><span style={{...S.dV,...(l==="Status"?{color:"#2D8A5E"}:{})}}>{v}</span></div>)}
          </div>

          {/* Credits (Player only) */}
          {memTier==="player"&&<div style={{background:"#f8faf9",border:"1px solid #2D8A5E25",borderRadius:12,padding:14,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,fontWeight:600}}>Bay Credits</span><span style={{fontSize:13,fontWeight:700,color:tier.c,fontFamily:mono}}>{memCust.credits-memCust.used} of {memCust.credits} remaining</span></div>
            <div style={{height:5,borderRadius:3,background:"#f0f0ee",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:tier.c,width:(memCust.used/memCust.credits*100)+"%"}}/></div>
            <div style={{display:"flex",gap:6,marginTop:10}}>
              <button style={{...GS.togBtn,flex:1,fontSize:11}} onClick={()=>fire("Credit added (+1 hr) \u2713")}>+ Add Credit</button>
              <button style={{...GS.togBtn,flex:1,fontSize:11}} onClick={()=>fire("Credit removed (-1 hr) \u2713")}>\u2013 Remove Credit</button>
            </div>
          </div>}
          {memTier==="champion"&&<div style={{background:"#f8faf9",border:"1px solid #124A2B25",borderRadius:12,padding:14,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Bay Credits</span><span style={{fontSize:13,fontWeight:700,color:tier.c}}>Unlimited</span></div>
            <p style={{fontSize:11,color:"#888",marginTop:4}}>Max 2 consecutive hours per booking</p>
          </div>}

          {/* Change Billing Date */}
          <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,padding:14,marginBottom:16}}>
            <label style={GS.label}>BILLING START DATE</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="date" style={{...GS.input,flex:1}} defaultValue={"2026-04-"+String(memCust.billingDay).padStart(2,"0")}/>
              <button style={{...S.b1,width:"auto",padding:"10px 16px",fontSize:12}} onClick={()=>fire("Billing date updated \u2713")}>Update</button>
            </div>
            <p style={{fontSize:10,color:"#888",marginTop:6}}>Changes the monthly billing anchor date for this subscription.</p>
          </div>

          {/* Change Tier */}
          <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,padding:14,marginBottom:16}}>
            <label style={GS.label}>CHANGE TIER</label>
            <div style={{display:"flex",gap:6}}>{TIER_INFO.map(t=><button key={t.id} style={{...GS.togBtn,flex:1,...(memTier===t.id?{background:t.c,color:"#fff",borderColor:t.c}:{})}} onClick={()=>{if(t.id!==memTier){fire("Tier changed to "+t.n+" \u2713");setMemTier(t.id);}}}>{t.n}<br/><span style={{fontSize:10,fontWeight:400}}>${t.p}</span></button>)}</div>
          </div>

          {/* Membership Transaction History */}
          <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,padding:14,marginBottom:16}}>
            <label style={{...GS.label,marginBottom:10}}>MEMBERSHIP HISTORY</label>
            {hist.length>0?hist.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<hist.length-1?"1px solid #f8f8f6":"none"}}>
              <div style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                background:h.type==="renewal"?"#2D8A5E12":h.type==="credit"?"#5B6DCD12":"#E8890C12",
                color:h.type==="renewal"?"#2D8A5E":h.type==="credit"?"#5B6DCD":"#E8890C"}}>
                {h.type==="renewal"?X.card(12):h.type==="credit"?X.clock(12):X.chk(12)}
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:12,fontWeight:600}}>{h.desc}</p>
                <p style={{fontSize:10,color:"#888"}}>{h.date}</p>
              </div>
              <div style={{textAlign:"right"}}>
                {h.amount&&<span style={{fontSize:12,fontWeight:700,fontFamily:mono}}>{h.amount}</span>}
                {h.credits&&h.credits!=="unlimited"&&<span style={{fontSize:12,fontWeight:700,color:h.credits.startsWith("+")?  "#2D8A5E":"#5B6DCD",fontFamily:mono}}>{h.credits}</span>}
                {h.credits==="unlimited"&&<span style={{fontSize:11,color:"#888"}}>\u221e</span>}
              </div>
            </div>):<p style={{fontSize:12,color:"#888"}}>No history yet</p>}
          </div>

          {/* Actions */}
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.b1,flex:1,background:"#E03928"}} onClick={()=>{setMemView("list");setMemCust(null);fire("Membership cancelled");}}>Cancel Membership</button>
          </div>
          <button style={{...S.lk,marginTop:8}} onClick={()=>{setMemView("list");setMemCust(null);}}>Close</button>
        </div></div>;
      })()}

      {/* ADD MEMBER MODAL */}
      {memView==="add"&&(()=>{
        const tier=TIER_INFO.find(t=>t.id===memTier);
        return <div style={S.ov} onClick={()=>{setMemView("list");setMemCust(null);}}><div style={{...S.mod,maxWidth:520}} onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:4}}>Add Member</h3>
          <p style={{fontSize:12,color:"#888",marginBottom:16}}>Adding to <strong style={{color:tier.c}}>{tier.n}</strong> (${tier.p}/mo)</p>

          {/* Search customer */}
          <label style={GS.label}>SEARCH CUSTOMER</label>
          <div style={S.srch}>{X.search(14)}<input style={S.srchIn} placeholder="Name or phone..." value={memSearch} onChange={e=>setMemSearch(e.target.value)}/></div>
          {memSearch&&<div style={{maxHeight:150,overflowY:"auto",border:"1px solid #e8e8e6",borderRadius:10,marginBottom:12}}>
            {filteredMemCust.slice(0,8).map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:"1px solid #f2f2f0",cursor:"pointer",background:memCust?.id===c.id?"#2D8A5E08":"transparent"}} onClick={()=>setMemCust(c)}>
              <div style={{width:30,height:30,borderRadius:7,background:tier.c+"18",color:tier.c,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,fontFamily:mono,flexShrink:0}}>{c.name.split(" ").map(n=>n[0]).join("")}</div>
              <div style={{flex:1}}><p style={{fontSize:13,fontWeight:600}}>{c.name}</p><p style={{fontSize:10,color:"#888"}}>{c.phone}</p></div>
              {memCust?.id===c.id&&<span style={{color:tier.c}}>{X.chk(14)}</span>}
            </div>)}
            {filteredMemCust.length===0&&<p style={{padding:12,fontSize:12,color:"#888"}}>No customers found</p>}
          </div>}

          {/* Selected customer + config */}
          {memCust&&<div style={{background:"#f8faf9",border:"1px solid "+tier.c+"25",borderRadius:12,padding:14,marginBottom:12}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:2}}>{memCust.name}</p>
            <p style={{fontSize:12,color:"#888",marginBottom:12}}>{memCust.phone}{memCust.email?" \u00b7 "+memCust.email:""}</p>

            {/* Tier selector */}
            <label style={GS.label}>TIER</label>
            <div style={{display:"flex",gap:6,marginBottom:12}}>{TIER_INFO.map(t=><button key={t.id} style={{...GS.togBtn,flex:1,textAlign:"center",...(memTier===t.id?{background:t.c,color:"#fff",borderColor:t.c}:{})}} onClick={()=>setMemTier(t.id)}><span style={{fontWeight:700}}>{t.n}</span><br/><span style={{fontSize:10}}>${t.p}/mo</span></button>)}</div>

            {/* Billing start */}
            <label style={GS.label}>BILLING START DATE</label>
            <input type="date" style={{...GS.input,marginBottom:12}} defaultValue="2026-03-16"/>

            {/* Summary */}
            <div style={{borderTop:"1px solid #e8e8e6",paddingTop:10}}>
              {[["Tier",tier.n],["Monthly",  "$"+tier.p],["Credits",tier.credits],["Billing","Starts on selected date"],["Payment","Card on file via Square"]].map(([l,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}><span style={{color:"#888"}}>{l}</span><span style={{fontWeight:600}}>{v}</span></div>)}
            </div>
          </div>}

          <button style={{...S.b1,opacity:memCust?1:0.35}} onClick={()=>{
            if(!memCust){fire("Select a customer first");return;}
            fire(memCust.name+" added as "+TIER_INFO.find(t=>t.id===memTier).n+" \u2713");
            setMemView("list");setMemCust(null);setMemSearch("");
          }}>Activate Membership</button>
          <button style={{...S.lk,marginTop:8}} onClick={()=>{setMemView("list");setMemCust(null);setMemSearch("");}}>Cancel</button>
        </div></div>;
      })()}
    </div>;
  }

  // ── FACILITY MANAGEMENT ──
  else if(view==="facility"){
    content=<div style={S.pad}>
      <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Facility Management</h2>
      <div style={S.tabs}>{[{k:"bays",l:"Bay Management"},{k:"staff",l:"Staff & Coaches"},{k:"settings",l:"Rates & Hours"}].map(t=><button key={t.k} style={{...S.tab,...(facTab===t.k?S.tabS:{})}} onClick={()=>setFacTab(t.k)}>{t.l}</button>)}</div>

      {facTab==="bays"&&<div>
        <h3 style={S.sh}>Bay Closures & Blocks</h3>
        <p style={{fontSize:12,color:"#888",marginBottom:14}}>Block bays from being booked for maintenance, events, or closures. Blocked bays are automatically unavailable on the customer booking app.</p>

        {/* Existing blocks */}
        {bayBlocks.map(b=><div key={b.id} style={{...S.bkR,borderLeftColor:"#E03928"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:600}}>{b.bays.map(n=>"Bay "+n).join(", ")}</p>
            <p style={{fontSize:12,color:"#888"}}>{b.from}{b.from!==b.to?" → "+b.to:""} {b.allDay?"(All day)":"("+b.timeFrom+" – "+b.timeTo+")"}</p>
          </div>
          <div style={{textAlign:"right"}}><p style={{fontSize:12,color:"#E03928",fontWeight:600}}>{b.reason}</p><button style={{fontSize:10,color:"#E03928",background:"none",border:"none",cursor:"pointer",fontFamily:ff,fontWeight:600,marginTop:2}} onClick={()=>{setBayBlocks(p=>p.filter(x=>x.id!==b.id));fire("Block removed");}}>Remove</button></div>
        </div>)}
        {bayBlocks.length===0&&<p style={{fontSize:12,color:"#aaa",padding:"8px 0"}}>No active blocks</p>}

        {/* Add new block */}
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginTop:14}}>
          <label style={GS.label}>BLOCK BAYS</label>

          {/* Multi-bay toggle */}
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {[1,2,3,4,5].map(b=>{const sel=newBlock.bays.includes(b);return <button key={b} style={{...GS.togBtn,flex:1,...(sel?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,bays:sel?p.bays.filter(x=>x!==b):[...p.bays,b]}))}>Bay {b}</button>;})}
          </div>
          <button style={{...GS.togBtn,width:"100%",marginBottom:10,fontSize:11,...(newBlock.bays.length===5?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,bays:p.bays.length===5?[]:[1,2,3,4,5]}))}>Select All Bays</button>
          {newBlock.bays.length>0&&<p style={{fontSize:11,color:"#E03928",fontWeight:600,marginBottom:8}}>{newBlock.bays.length} bay{newBlock.bays.length>1?"s":""} selected: {newBlock.bays.sort((a,b)=>a-b).map(n=>"Bay "+n).join(", ")}</p>}

          {/* Date range */}
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FROM DATE</label><input type="date" style={GS.input} value={newBlock.from} onChange={e=>setNewBlock(p=>({...p,from:e.target.value}))}/></div>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>TO DATE</label><input type="date" style={GS.input} value={newBlock.to} onChange={e=>setNewBlock(p=>({...p,to:e.target.value}))}/></div>
          </div>

          {/* All day vs specific hours */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button style={{...GS.togBtn,flex:1,...(newBlock.allDay?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:true}))}>All Day</button>
            <button style={{...GS.togBtn,flex:1,...(!newBlock.allDay?{background:"#E03928",color:"#fff",borderColor:"#E03928"}:{})}} onClick={()=>setNewBlock(p=>({...p,allDay:false}))}>Specific Hours</button>
          </div>
          {!newBlock.allDay&&<div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>FROM TIME</label><select style={GS.select} value={newBlock.timeFrom} onChange={e=>setNewBlock(p=>({...p,timeFrom:e.target.value}))}>{["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM"].map(h=><option key={h} value={h}>{h}</option>)}</select></div>
            <div style={{flex:1}}><label style={{...GS.label,fontSize:10}}>TO TIME</label><select style={GS.select} value={newBlock.timeTo} onChange={e=>setNewBlock(p=>({...p,timeTo:e.target.value}))}>{["12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"].map(h=><option key={h} value={h}>{h}</option>)}</select></div>
          </div>}

          {/* Reason */}
          <div style={{marginBottom:12}}><label style={{...GS.label,fontSize:10}}>REASON</label><input style={GS.input} placeholder="e.g., Sensor calibration, Private event, Holiday closure..." value={newBlock.reason} onChange={e=>setNewBlock(p=>({...p,reason:e.target.value}))}/></div>

          <button style={{...S.b1,background:"#E03928",opacity:newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason?1:0.35}} onClick={async()=>{if(newBlock.bays.length>0&&newBlock.from&&newBlock.to&&newBlock.reason){const block={...newBlock,id:Date.now()};setBayBlocks(p=>[...p,block]);await sbPost("bay_blocks",{bays:newBlock.bays,from_date:newBlock.from,to_date:newBlock.to,time_from:newBlock.allDay?null:newBlock.timeFrom,time_to:newBlock.allDay?null:newBlock.timeTo,all_day:newBlock.allDay,reason:newBlock.reason});setNewBlock({bays:[],from:"",to:"",timeFrom:"7:00 AM",timeTo:"10:00 PM",allDay:true,reason:""});fire(newBlock.bays.length+" bay"+(newBlock.bays.length>1?"s":"")+" blocked ✓");}}}>Block {newBlock.bays.length>0?newBlock.bays.length+" Bay"+(newBlock.bays.length>1?"s":""):"Bays"}</button>
          <p style={{fontSize:10,color:"#888",marginTop:8}}>Blocked bays are automatically hidden from the customer booking app for the selected date range and times.</p>
        </div>

        {/* Bay Status Overview */}
        <h3 style={S.sh}>Current Bay Status</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {[1,2,3,4,5].map(b=>{const blocks=bayBlocks.filter(x=>x.bays.includes(b));const isBlocked=blocks.length>0;return <div key={b} style={{background:"#fff",border:"2px solid "+(isBlocked?"#E03928":"#2D8A5E"),borderRadius:12,padding:12,textAlign:"center"}}>
            <p style={{fontSize:14,fontWeight:700}}>Bay {b}</p>
            <p style={{fontSize:10,fontWeight:600,color:isBlocked?"#E03928":"#2D8A5E",marginTop:4}}>{isBlocked?"Blocked":"Open"}</p>
            {blocks.map((bl,i)=><p key={i} style={{fontSize:9,color:"#888",marginTop:2}}>{bl.reason}{bl.allDay?"":" ("+bl.timeFrom+"–"+bl.timeTo+")"}</p>)}
          </div>;})}
        </div>
      </div>}

      {facTab==="staff"&&<div>
        <h3 style={S.sh}>Staff & App Access</h3>
        {TEAM.map(t=><div key={t.id} style={S.cR}>
          <div style={{width:40,height:40,borderRadius:10,background:ROLES[t.role].c,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,fontFamily:mono,flexShrink:0}}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:600}}>{t.name}</p>
            <p style={{fontSize:11,color:"#888"}}>{t.title} · {t.email}</p>
          </div>
          <span style={{...S.badge,background:ROLES[t.role].c}}>{ROLES[t.role].n}</span>
        </div>)}

        <h3 style={S.sh}>Coach Availability</h3>
        <p style={{fontSize:12,color:"#888",marginBottom:12}}>Set weekly availability for each coach. Customers can only book lessons during these windows.</p>
        {COACHES.map(t=>{const sched=coachSchedules[t.id]||{};const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];const activeDays=DAYS.filter(d=>sched[d]?.on);return <div key={t.id} style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:"#E8890C18",color:"#E8890C",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,fontFamily:mono}}>{t.name.split(" ").map(n=>n[0]).join("")}</div>
              <div><p style={{fontSize:14,fontWeight:700}}>{t.name}</p><p style={{fontSize:11,color:"#888"}}>{t.email}</p></div>
            </div>
            <button style={{...GS.togBtn,fontSize:11,color:"#2D8A5E",borderColor:"#2D8A5E"}} onClick={()=>setEditCoach(editCoach===t.id?null:t.id)}>{editCoach===t.id?"Done":"Edit"}</button>
          </div>
          {/* Schedule grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {DAYS.map(d=>{const day=sched[d]||{on:false};return <div key={d} style={{padding:6,borderRadius:8,background:day.on?"#2D8A5E10":"#f8f8f6",textAlign:"center",border:day.on?"1px solid #2D8A5E20":"1px solid transparent",opacity:day.on?1:0.5}}>
              <p style={{fontSize:11,fontWeight:700,color:day.on?"#2D8A5E":"#aaa"}}>{d}</p>
              {day.on?<p style={{fontSize:9,color:"#888",marginTop:2}}>{day.from.replace(":00","")}{"\n"}{day.to.replace(":00","")}</p>:<p style={{fontSize:9,color:"#ccc",marginTop:2}}>Off</p>}
            </div>;})}
          </div>
          <p style={{fontSize:11,color:"#888",marginTop:6}}>{activeDays.length} days/week active</p>

          {/* Edit mode */}
          {editCoach===t.id&&<div style={{marginTop:12,borderTop:"1px solid #f2f2f0",paddingTop:12}}>
            {DAYS.map(d=>{const day=sched[d]||{on:false,from:"",to:""};return <div key={d} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f8f8f6"}}>
              <button style={{width:52,padding:"4px 0",borderRadius:6,border:"none",background:day.on?"#2D8A5E":"#eee",color:day.on?"#fff":"#aaa",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:ff}} onClick={()=>{const ns={...coachSchedules};if(!ns[t.id])ns[t.id]={};ns[t.id][d]={...day,on:!day.on};setCoachSchedules(ns);}}>{d}</button>
              {day.on?<>
                <select style={{...GS.select,padding:"5px 4px",fontSize:11,flex:1}} value={day.from} onChange={e=>{const ns={...coachSchedules};ns[t.id][d]={...day,from:e.target.value};setCoachSchedules(ns);}}>
                  {["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"].map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                <span style={{fontSize:11,color:"#888"}}>to</span>
                <select style={{...GS.select,padding:"5px 4px",fontSize:11,flex:1}} value={day.to} onChange={e=>{const ns={...coachSchedules};ns[t.id][d]={...day,to:e.target.value};setCoachSchedules(ns);}}>
                  {["12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM","9:00 PM"].map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </>:<span style={{fontSize:11,color:"#aaa",flex:1}}>Day off</span>}
            </div>;})}
            <button style={{...S.b1,marginTop:10}} onClick={()=>{setEditCoach(null);fire(t.name+"'s schedule updated \u2713");}}>Save Schedule</button>
          </div>}
        </div>;})}


        <h3 style={S.sh}>Role Permissions</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16}}>
          {[{r:"Owner",p:"Full access to all features"},{r:"Manager",p:"Bookings, memberships, dashboard, reports"},{r:"Staff",p:"Bookings and dashboard only"}].map((p,i)=><div key={p.r} style={{padding:"8px 0",borderBottom:i<2?"1px solid #f2f2f0":"none"}}><p style={{fontSize:13,fontWeight:600}}>{p.r}</p><p style={{fontSize:11,color:"#888"}}>{p.p}</p></div>)}
        </div>
      </div>}

      {facTab==="settings"&&<div>
        <h3 style={S.sh}>Bay Rates</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginBottom:14}}>
          {[{k:"op",l:"Off-Peak",s:"Mon–Fri 7am–5pm",cl:"#2D8A5E"},{k:"pk",l:"Peak",s:"Mon–Fri 5pm–10pm",cl:"#E8890C"},{k:"wk",l:"Weekend",s:"Sat–Sun 9am–9pm",cl:"#5B6DCD"}].map(r=><div key={r.k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f2f2f0"}}>
            <div style={{width:36,height:36,borderRadius:8,background:r.cl+"18",color:r.cl,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{X.clock(18)}</div>
            <div style={{flex:1}}><p style={{fontSize:14,fontWeight:600}}>{r.l}</p><p style={{fontSize:11,color:"#888"}}>{r.s}</p></div>
            <div style={{display:"flex",alignItems:"baseline",gap:2}}><span style={{fontWeight:700}}>$</span><input style={{width:48,fontSize:18,fontWeight:700,fontFamily:mono,border:"none",background:"transparent",textAlign:"center",color:"#1a1a1a"}} type="number" value={cfg[r.k]} onChange={e=>setCfg(p=>({...p,[r.k]:Number(e.target.value)}))}/><span style={{fontSize:11,color:"#888"}}>/hr</span></div>
          </div>)}
          <button style={{...S.b1,marginTop:14}} onClick={async()=>{await sbPatch("pricing_config","id=eq.1",{off_peak_rate:cfg.op,peak_rate:cfg.pk,weekend_rate:cfg.wk});fire("Rates updated ✓");}}>Save Rates</button>
        </div>

        <h3 style={S.sh}>Operating Hours</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16,marginBottom:14}}>
          <div style={{padding:"8px 0",borderBottom:"1px solid #f2f2f0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Monday – Friday</span><span style={{fontSize:13,color:"#555"}}>7:00 AM – 10:00 PM</span></div>
          <div style={{padding:"8px 0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600}}>Saturday – Sunday</span><span style={{fontSize:13,color:"#555"}}>9:00 AM – 9:00 PM</span></div>
        </div>

        <h3 style={S.sh}>Tax Configuration</h3>
        <div style={{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16}}>
          <div style={{padding:"8px 0",borderBottom:"1px solid #f2f2f0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13}}>Bay Rental Tax</span><span style={{fontSize:13,fontWeight:700,fontFamily:mono}}>7%</span></div>
          <div style={{padding:"8px 0",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13}}>Lesson Tax</span><span style={{fontSize:13,fontWeight:700,fontFamily:mono}}>0%</span></div>
        </div>
      </div>}
    </div>;
  }

  return(<div style={S.shell}><style>{CSS}</style>
    <div style={S.side}>
      <div style={{padding:"20px 16px 12px",borderBottom:"1px solid #1a3d2a"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:18}}>⛳</span><span style={{fontFamily:mono,fontSize:12,fontWeight:700,letterSpacing:2,color:"#fff"}}>BIRDIE</span></div><p style={{fontSize:10,color:"#ffffff66"}}>Admin Panel</p></div>
      <div style={{padding:"8px",flex:1,overflowY:"auto"}}>{nav.map(n=><button key={n.k} style={{...S.nB,...(view===n.k?S.nBA:{})}} onClick={()=>setView(n.k)}>{n.ic(16)}<span>{n.l}</span></button>)}</div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #1a3d2a"}}><p style={{fontSize:11,color:"#ffffff88"}}>{uN}</p><p style={{fontSize:10,color:"#ffffff44"}}>{ROLES[role]?.n}</p><button style={{...S.lk,color:"#ffffff66",fontSize:11,marginTop:6}} onClick={()=>{setLogged(false);setView("dash");}}>Sign Out</button></div>
    </div>
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{flex:1,overflowY:"auto"}}>{content}</div></div>
    {toast&&<div style={S.toast}>{toast}</div>}
  </div>);
}

const GS={hdr:{padding:"10px 6px",textAlign:"center",borderBottom:"2px solid #e8e8e6",background:"#fafaf8"},timeCell:{padding:"4px 6px",display:"flex",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #f2f2f0",minHeight:28},cell:{borderBottom:"1px solid #f2f2f0",borderLeft:"1px solid #f2f2f0",minHeight:28,padding:"2px",position:"relative"},booking:{borderRadius:5,padding:"3px 6px",position:"absolute",top:2,left:2,right:2,zIndex:2,overflow:"hidden"},label:{fontSize:11,fontWeight:700,color:"#888",letterSpacing:1,marginBottom:4,display:"block"},input:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:ff,color:"#1a1a1a"},select:{width:"100%",padding:"10px 12px",border:"1px solid #e8e8e6",borderRadius:10,fontSize:14,fontFamily:ff,color:"#1a1a1a",background:"#fff"},togBtn:{padding:"7px 12px",border:"1px solid #e8e8e6",borderRadius:8,background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff,color:"#555"}};
const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}input:focus,button:focus{outline:none}@keyframes ti{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}button:active{transform:scale(0.97)}`;
const LS={w:{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(155deg,#0B2E1A,#1A5C3A 45%,#2D8A5E)",fontFamily:ff,padding:20},c:{background:"#fff",borderRadius:22,padding:"32px 28px",width:"100%",maxWidth:440,boxShadow:"0 28px 80px rgba(0,0,0,0.28)",maxHeight:"90vh",overflowY:"auto"},br:{textAlign:"center",marginBottom:20},logo:{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#2D8A5E,#1A5C3A)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:12,boxShadow:"0 6px 20px rgba(45,138,94,0.35)"},bn:{fontFamily:mono,fontSize:20,fontWeight:700,color:"#0B2E1A",letterSpacing:4},bs:{fontFamily:mono,fontSize:10,color:"#999",letterSpacing:3,marginTop:4},col:{display:"flex",flexDirection:"column",gap:6},rb:{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",border:"1px solid #e8e8e6",borderRadius:12,background:"#fff",cursor:"pointer",fontFamily:ff,width:"100%"},ri:{width:38,height:38,borderRadius:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,fontFamily:mono,flexShrink:0},rBdg:{fontSize:8,fontWeight:700,color:"#fff",padding:"3px 7px",borderRadius:5,fontFamily:mono,letterSpacing:1}};
const S={shell:{fontFamily:ff,display:"flex",height:"100vh",background:"#FAFAF8",overflow:"hidden"},side:{width:180,background:"#0B2E1A",display:"flex",flexDirection:"column",flexShrink:0},pad:{padding:"24px 28px 40px"},b1:{background:"#2D8A5E",color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",fontSize:13,fontWeight:600,fontFamily:ff,cursor:"pointer",width:"100%"},lk:{background:"none",border:"none",color:"#2D8A5E",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff},badge:{fontSize:10,fontWeight:700,color:"#fff",padding:"4px 10px",borderRadius:6,fontFamily:mono,letterSpacing:1},nB:{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",color:"#ffffff88",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:ff,textAlign:"left",marginBottom:2},nBA:{background:"#ffffff14",color:"#fff",fontWeight:600},sh:{fontSize:15,fontWeight:700,marginBottom:12,marginTop:20},kpi:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:16},kpiL:{fontSize:11,color:"#888",fontWeight:600,marginBottom:4},kpiV:{fontSize:24,fontWeight:700,fontFamily:mono},kpiD:{fontSize:10,color:"#aaa",marginTop:2},bkR:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"1px solid #e8e8e6",borderRadius:12,marginBottom:6,borderLeft:"3px solid"},tabs:{display:"flex",gap:4,marginBottom:16,background:"#f0f0ee",borderRadius:10,padding:3},tab:{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff,color:"#888",textAlign:"center"},tabS:{background:"#fff",color:"#1a1a1a",boxShadow:"0 1px 4px rgba(0,0,0,.08)"},srch:{display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1px solid #e8e8e6",borderRadius:10,padding:"10px 14px",marginBottom:12,color:"#aaa"},srchIn:{flex:1,border:"none",fontSize:13,fontFamily:ff,color:"#1a1a1a",background:"transparent"},cR:{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f2f2f0",cursor:"pointer"},tBdg:{fontSize:9,fontWeight:700,color:"#fff",padding:"3px 8px",borderRadius:5,fontFamily:mono},sec:{background:"#fff",border:"1px solid #e8e8e6",borderRadius:14,padding:18,marginBottom:14},secL:{fontSize:13,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6},pR:{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f2f2f0"},pI:{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},pIn:{width:48,fontSize:18,fontWeight:700,fontFamily:mono,border:"none",background:"transparent",textAlign:"center",color:"#1a1a1a"},sR:{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f2f2f0",cursor:"pointer"},dR:{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f8f8f6"},dL:{fontSize:13,color:"#888"},dV:{fontSize:13,fontWeight:600},ov:{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,padding:20},mod:{background:"#fff",borderRadius:18,padding:24,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"},toast:{position:"fixed",bottom:24,right:24,background:"#1a1a1a",color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:500,fontFamily:ff,boxShadow:"0 10px 36px rgba(0,0,0,.22)",zIndex:200,animation:"ti .25s ease",whiteSpace:"nowrap"}};
