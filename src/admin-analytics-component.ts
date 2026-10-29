// Admin Analytics Dashboard Component
// To be restored in afdp.tsx before playerSlug function

export function AnalyticsDashboardCode() {
  return `
function AnalyticsDashboard({T,data,loading,onLoad}:{T:any,data:any,loading:boolean,onLoad:()=>void}){
  React.useEffect(function(){onLoad();},[]);

  function buildDailyBuckets(events:any[]){
    var buckets:Record<string,Set<string>>={};
    var today=new Date();
    for(var i=13;i>=0;i--){
      var d=new Date(today);d.setDate(d.getDate()-i);
      var key=d.toISOString().slice(0,10);
      buckets[key]=new Set();
    }
    (events||[]).forEach(function(e:any){
      var day=e.created_at?e.created_at.slice(0,10):"";
      if(buckets[day])buckets[day].add(e.visitor_id);
    });
    return Object.entries(buckets).map(function([day,set]){return {day,count:set.size};});
  }

  function buildFeatureUsage(features:any[]){
    var counts:Record<string,number>={};
    (features||[]).forEach(function(e:any){
      var t=e.event_data?.tab||"unknown";
      counts[t]=(counts[t]||0)+1;
    });
    return Object.entries(counts).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  }

  if(loading) return React.createElement("div",{style:{padding:40,textAlign:"center",color:T.textSub}},
    React.createElement("div",{style:{width:32,height:32,borderRadius:"50%",border:"3px solid "+T.purple+"30",borderTopColor:T.purple,animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}),
    "Loading analytics..."
  );

  if(!data) return React.createElement("div",{style:{padding:16,textAlign:"center",color:T.textSub}},"No data yet.");
  if(data.error) return React.createElement("div",{style:{padding:16}},
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.red,borderRadius:12,padding:16}},"Error: "+data.error)
  );

  var daily=buildDailyBuckets(data.daily);
  var maxDay=Math.max(1,...daily.map(function(d:any){return d.count;}));
  var totalUnique=new Set((data.daily||[]).map(function(e:any){return e.visitor_id;})).size;
  var todayKey=new Date().toISOString().slice(0,10);
  var todayVisitors=daily.find(function(d:any){return d.day===todayKey;})?.count||0;
  var weekVisitors=new Set((data.daily||[]).filter(function(e:any){
    var d=new Date(e.created_at);return(Date.now()-d.getTime())<7*86400000;
  }).map(function(e:any){return e.visitor_id;})).size;
  var features=buildFeatureUsage(data.features);
  var maxFeat=Math.max(1,...features.map(function(f:any){return f[1];}));

  var userMap:Record<string,{email:string,lastSeen:string,events:number,trades:number,lastAction:string}> = {};
  (data.userEvents||[]).forEach(function(e:any){
    var email=e.event_data?.user_email;
    if(!email) return;
    if(!userMap[email]) userMap[email]={email,lastSeen:e.created_at,events:0,trades:0,lastAction:e.event_type};
    userMap[email].events++;
    if(e.event_type==="trade_analyzed"){userMap[email].trades++;userMap[email].lastAction="trade_analyzed";}
    if(e.created_at>userMap[email].lastSeen){userMap[email].lastSeen=e.created_at;userMap[email].lastAction=e.event_type;}
  });
  var userList=Object.values(userMap).sort(function(a,b){return b.lastSeen.localeCompare(a.lastSeen);});

  var anonMap:Record<string,{vid:string,lastSeen:string,events:number,trades:number,lastAction:string}> = {};
  (data.recent||[]).forEach(function(e:any){
    var vid=e.visitor_id;
    if(!vid||e.event_data?.user_email) return;
    if(!anonMap[vid]) anonMap[vid]={vid,lastSeen:e.created_at,events:0,trades:0,lastAction:e.event_type};
    anonMap[vid].events++;
    if(e.event_type==="trade_analyzed"){anonMap[vid].trades++;anonMap[vid].lastAction="trade_analyzed";}
    if(e.created_at>anonMap[vid].lastSeen){anonMap[vid].lastSeen=e.created_at;anonMap[vid].lastAction=e.event_type;}
  });
  var anonList=Object.values(anonMap).sort(function(a,b){return b.lastSeen.localeCompare(a.lastSeen);});

  return React.createElement("div",{style:{padding:16}},
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement("div",{style:{fontWeight:900,fontSize:20,color:T.text}},"Site Analytics"),
      React.createElement("div",{style:{fontSize:12,color:T.textSub,marginTop:2}},"Secure server-side analytics • Last 14 days")
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(90px, 1fr))",gap:6,marginBottom:20}},
      [["Today",todayVisitors,"📅"],["7d",weekVisitors,"📆"],["14d",totalUnique,"🗓️"],["All Time",data.totalVisitors,"👥"],["Trades",data.trades,"⚖️"]].map(function(s:any){
        return React.createElement("div",{key:s[0],style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 8px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:20,marginBottom:4}},s[2]),
          React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.purple}},s[1]),
          React.createElement("div",{style:{fontSize:10,color:T.textSub,fontWeight:600}},s[0])
        );
      })
    ),
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text,marginBottom:12}},"Signed-In Users ("+userList.length+")"),
      userList.length===0?React.createElement("div",{style:{fontSize:12,color:T.textSub,textAlign:"center",padding:"12px 0"}},"No signed-in activity."):userList.map(function(u:any,i:number){return React.createElement("div",{key:u.email,style:{padding:"8px 0",borderBottom:i<userList.length-1?"1px solid "+T.border:"none",fontSize:11,color:T.text}},u.email+" ("+u.trades+" trades)")})));
});
`;
}
