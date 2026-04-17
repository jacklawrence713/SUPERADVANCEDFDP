import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ─────────────────────────────────────────────────────────────────
const SUPA_URL = "https://wizdxspglxpvvogiivsv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemR4c3BnbHhwdnZvZ2lpdnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTUzNDcsImV4cCI6MjA4ODAzMTM0N30.jaMMEymsU7Xx3H32V2xuCfC3O9_-y0t2-IuXqhNfW5A";
const SUPA_SVC = (import.meta as any).env?.VITE_SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemR4c3BnbHhwdnZvZ2lpdnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NTM0NywiZXhwIjoyMDg4MDMxMzQ3fQ.sr-qZWscq59_HxN8wil1GCP6CmK97kXaLvphXnupoIk";
const EDGE_URL = (import.meta as any).env?.VITE_EDGE_FUNCTIONS_URL || "https://wizdxspglxpvvogiivsv.supabase.co/functions/v1";
// Auth + data client
const authClient = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;
// Analytics write client — separate instance so it always uses anon key, never inherits user session
const analyticsClient = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;
// Analytics read client — service role, for admin reads only
const analyticsReadClient = SUPA_URL && SUPA_SVC ? createClient(SUPA_URL, SUPA_SVC, {auth:{persistSession:false,autoRefreshToken:false}}) : null;

// ── Edge Function helpers ─────────────────────────────────────────────────────
async function callEdgeFn(fn: string, body: any, userToken?: string) {
  const headers: Record<string,string> = { "Content-Type": "application/json", "apikey": SUPA_KEY };
  if (userToken) headers["Authorization"] = `Bearer ${userToken}`;
  const res = await fetch(`${EDGE_URL}/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json();
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem("fdp_vid");
    if (!id) {
      id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("fdp_vid", id);
    }
    return id;
  } catch { return "anonymous"; }
}

let _trackedEmail = "";
function setTrackedUser(email: string) { _trackedEmail = email || ""; }

let _geoCache: {country:string;city:string;region:string;flag:string}|null = null;
let _geoPromise: Promise<{country:string;city:string;region:string;flag:string}|null>|null = null;
async function getGeo() {
  if (_geoCache) return _geoCache;
  if (_geoPromise) return _geoPromise;
  _geoPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const r = await fetch("https://ipapi.co/json/", {signal: controller.signal});
      clearTimeout(timeout);
      const d = await r.json();
      _geoCache = {country: d.country_name||"Unknown", city: d.city||"", region: d.region||"", flag: d.country_code ? String.fromCodePoint(...[...d.country_code].map((c:string)=>0x1F1E0-65+c.charCodeAt(0))) : ""};
    } catch { _geoCache = {country:"Unknown",city:"",region:"",flag:""}; }
    return _geoCache;
  })();
  return _geoPromise;
}

async function trackEvent(type: string, data: Record<string, any> = {}) {
  const client = analyticsClient;
  if (!client) return;
  try {
    const result = await client.from("analytics_events").insert({
      visitor_id: getVisitorId(),
      event_type: type,
      event_data: _trackedEmail ? Object.assign({}, data, {user_email: _trackedEmail}) : data,
    });
    if (result.error) { /* silent */ }
  } catch(e) { /* silent */ }
}

async function loadPublicStats() {
  const rc = analyticsReadClient;
  if (!rc) return null;
  try {
    const [v, t] = await Promise.all([
      rc.from("analytics_events").select("visitor_id",{count:"exact",head:true}).eq("event_type","page_view"),
      rc.from("analytics_events").select("id",{count:"exact",head:true}).eq("event_type","trade_analyzed"),
    ]);
    return {visitors: v.count||0, trades: t.count||0};
  } catch { return null; }
}

async function loadAnalyticsData() {
  const rc = analyticsReadClient;
  if (!rc) return null;
  try {
    const now = new Date();
    const day14ago = new Date(now.getTime() - 14 * 86400000).toISOString();
    const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
      rc.from("analytics_events").select("visitor_id, created_at").eq("event_type","page_view").gte("created_at",day14ago),
      rc.from("analytics_events").select("event_data").eq("event_type","tab_change").gte("created_at",day14ago),
      rc.from("analytics_events").select("id",{count:"exact",head:true}).eq("event_type","trade_analyzed"),
      rc.from("analytics_events").select("visitor_id, event_type, event_data, created_at").order("created_at",{ascending:false}).limit(100),
      rc.from("analytics_events").select("id",{count:"exact",head:true}).eq("event_type","page_view"),
      rc.from("analytics_events").select("id",{count:"exact",head:true}),
      // All events where user_email is present — dedicated signed-in user feed
      rc.from("analytics_events").select("visitor_id, event_type, event_data, created_at").not("event_data->>user_email","is","null").order("created_at",{ascending:false}).limit(200),
      // All trade_analyzed events with full data for admin trade feed
      rc.from("analytics_events").select("visitor_id, event_data, created_at").eq("event_type","trade_analyzed").order("created_at",{ascending:false}).limit(200),
    ]);
    const firstError = r1.error||r2.error||r3.error||r4.error;
    if (firstError) return { daily:[], features:[], trades:0, recent:[], userEvents:[], platformTrades:[], totalVisitors:0, totalEvents:0, error: firstError.message };
    return { daily: r1.data||[], features: r2.data||[], trades: r3.count||0, recent: r4.data||[], userEvents: r7.data||[], platformTrades: r8.data||[], totalVisitors: r5.count||0, totalEvents: r6.count||0, error: null };
  } catch(e:any) {
    return { daily:[], features:[], trades:0, recent:[], error: e?.message||"Unknown error" };
  }
}

const DARK={bg:"#13111e",bgCard:"#1c1a2e",bgInput:"#0f0d1a",border:"#2e2a4a",borderPurple:"#5b3fd4",purple:"#7c4dff",purpleLight:"#9b72ff",purpleDim:"#3d2a7a",text:"#ffffff",textSub:"#9b96b8",textDim:"#5c5880",green:"#22c55e",red:"#ef4444",gold:"#f59e0b",cyan:"#06b6d4"};
const LIGHT={bg:"#f0f2ff",bgCard:"#ffffff",bgInput:"#eef0ff",border:"#d4d8f5",borderPurple:"#7c4dff",purple:"#6d28d9",purpleLight:"#7c3aed",purpleDim:"#ede9fe",text:"#1a1d3a",textSub:"#4a5080",textDim:"#9ba3c9",green:"#059669",red:"#dc2626",gold:"#b45309",cyan:"#0891b2"};
const POS_COLORS={QB:"#818cf8",RB:"#34d399",WR:"#c084fc",TE:"#f59e0b",K:"#a78bfa",DST:"#94a3b8",DL:"#f87171",LB:"#fb923c",DB:"#22d3ee",PICK:"#f1c40f"};
const LEAGUE_TYPES=["Dynasty","Redraft"];
const FORMATS=["Superflex","PPR","Half","Standard"];
const ALL_POSITIONS=["ALL","QB","RB","WR","TE","K","DST","DL","LB","DB"];
const PRIME={QB:[26,35],RB:[22,27],WR:[23,29],TE:[25,30],K:[25,38],DST:[0,99],DL:[23,30],LB:[23,30],DB:[23,29]};
const FREE_RANK_LIMIT=20;
const FREE_TRADE_LIMIT=20;
const ADMIN_EMAILS=["jacklawrence713@gmail.com","theprez@yahoo.com","modgy28@hotmail.com","sbesk787@gmail.com","starrrya@yahoo.com"];
function isAdminEmail(e){return ADMIN_EMAILS.indexOf((e||"").toLowerCase().trim())!==-1;}

const SLEEPER_IDS={
"Lamar Jackson":"4881","Josh Allen":"4984","Jalen Hurts":"6904","Patrick Mahomes":"4046",
"Jayden Daniels":"11566","Joe Burrow":"6770","C.J. Stroud":"9758","Caleb Williams":"11560",
"Baker Mayfield":"4381","Bo Nix":"11563","Drake Maye":"11564","Anthony Richardson":"9229",
"Jordan Love":"6804","Kyler Murray":"5849","Justin Fields":"7591","Justin Herbert":"6797",
"Trevor Lawrence":"7523","Tua Tagovailoa":"6768","Brock Purdy":"8183","Bryce Young":"9228",
"Sam Darnold":"4943",
"Saquon Barkley":"4866","Bijan Robinson":"9509","Jahmyr Gibbs":"9221","De'Von Achane":"9226",
"Breece Hall":"8155","Christian McCaffrey":"4034","Kyren Williams":"8150","Derrick Henry":"3198",
"Jonathan Taylor":"6813","Josh Jacobs":"5850","Ashton Jeanty":"12527","Omarion Hampton":"12507",
"Kenneth Walker III":"8151","James Cook":"8138","Rhamondre Stevenson":"7611",
"Travis Etienne Jr.":"7543","Isiah Pacheco":"8205","Joe Mixon":"4018","David Montgomery":"5892",
"Tony Pollard":"5967","Rachaad White":"8136","Jaylen Warren":"8228","Zach Charbonnet":"9753",
"Tank Bigsby":"9225","Zonovan Knight":"8122","Blake Corum":"11586","Kimani Vidal":"11647",
"Braelon Allen":"11576","Keaton Mitchell":"9511","Aaron Jones":"4199","Javonte Williams":"7588",
"Ray Davis":"11575","Ty Chandler":"8230","MarShawn Lloyd":"11581","Will Shipley":"11577",
"Ja'Marr Chase":"7564","Justin Jefferson":"6794","CeeDee Lamb":"6786","Amon-Ra St. Brown":"7547",
"Puka Nacua":"9493","A.J. Brown":"5859","Brandon Aiyuk":"6803","Tee Higgins":"6801",
"Drake London":"8112","Garrett Wilson":"8146","Tyreek Hill":"3321","DK Metcalf":"5846",
"Rashee Rice":"10229","Marvin Harrison Jr.":"11628","Tetairoa McMillan":"12526",
"Travis Hunter":"12530","Rome Odunze":"11620","Jaylen Waddle":"7526","Chris Olave":"8144",
"George Pickens":"8137","Jaxon Smith-Njigba":"9488","Malik Nabers":"11632","Zay Flowers":"9997",
"Jordan Addison":"9756","Josh Downs":"9500","Ladd McConkey":"11635","DeVonta Smith":"7525",
"Mike Evans":"2216","Michael Pittman Jr.":"5904","D.J. Moore":"4983","Xavier Worthy":"11624",
"Tank Dell":"9502","Davante Adams":"2133","Kayshon Boutte":"9504","Deebo Samuel":"5872",
"Keon Coleman":"11637","Tre Tucker":"10213","Matthew Golden":"12501","Brian Thomas Jr.":"11631",
"Courtland Sutton":"4992","Stefon Diggs":"2748","Jakobi Meyers":"6030","Quentin Johnston":"9495",
"Brock Bowers":"11604","Trey McBride":"8130","Sam LaPorta":"10859","Mark Andrews":"5012",
"Travis Kelce":"1466","Tyler Warren":"12518","Dallas Goedert":"5022","T.J. Hockenson":"5844",
"David Njoku":"4033","Jake Ferguson":"8110","Harold Fannin Jr.":"12506","Cade Otton":"8111",
"Cole Kmet":"6826","Pat Freiermuth":"7600","Brenton Strange":"9480","Michael Mayer":"9482",
"Chig Okonkwo":"8210","Dawson Knox":"5906",
"Myles Garrett":"3973","Micah Parsons":"7640","Aidan Hutchinson":"8289","T.J. Watt":"4070",
"Nick Bosa":"5816","Maxx Crosby":"5991","Chris Jones":"4068","Brian Burns":"5862",
"Jonathan Greenard":"6059","Jalen Carter":"10888","Dexter Lawrence":"5847",
"Jeffery Simmons":"6125","Daron Payne":"4976","Josh Uche":"6921","Haason Reddick":"4063",
"Lukas Van Ness":"10885","Za'Darius Smith":"2427","Rashan Gary":"5839","Danielle Hunter":"2393",
"Roquan Smith":"4960","Fred Warner":"5041","T.J. Edwards":"5960","Bobby Wagner":"1233",
"Patrick Queen":"6807","Foyesade Oluokun":"5332","Quay Walker":"8266","Jordyn Brooks":"6949",
"Germaine Pratt":"5894","Dre Greenlaw":"6056","Matt Milano":"4191","Christian Harris":"8278",
"Demario Davis":"1052","De'Vondre Campbell":"3276","Eric Kendricks":"2350",
"Myjai Sanders":"8291","Devin Lloyd":"8329","Zaire Franklin":"5346",
"Patrick Surtain II":"7641","Antoine Winfield Jr.":"6888","Minkah Fitzpatrick":"4963",
"Budda Baker":"4081","Jessie Bates III":"5017","Devon Witherspoon":"10891",
"Jaylon Johnson":"6839","Trevon Diggs":"6809","C.J. Gardner-Johnson":"5893",
"Jordan Poyer":"1343","Darius Slay":"1518","Emmanuel Forbes":"10882",
"Deommodore Lenoir":"7819","Derwin James":"4971","Kyle Hamilton":"8339",
"Sauce Gardner":"8290",
"Aaron Rodgers":"96","Kirk Cousins":"1166",
"Tyjae Spears":"9508","Jaylen Wright":"11643","Kendre Miller":"9757","Sean Tucker":"9506",
"Kaleb Johnson":"12504","Ollie Gordon II":"12495","Isaiah Davis":"11571",
"Chris Rodriguez Jr.":"10219","Kareem Hunt":"4098","Emanuel Wilson":"11435",
"Jayden Reed":"10222","Rashid Shaheed":"8676","Keenan Allen":"1479","Adonai Mitchell":"11625",
"John Metchie III":"8147","Devaughn Vele":"11834","Troy Franklin":"11627","Jaylin Noel":"12536",
"Kyle Williams":"12547","Jack Bech":"12483","Elic Ayomanor":"12499","Isaac TeSlaa":"12535",
"Jalen Coker":"11646","Tre' Harris":"12509","Tory Horton":"12497","Ryan Flournoy":"11783",
"Konata Mumpfield":"12718",
"Calvin Austin III":"8125","Treylon Burks":"8135","Nick Cross":"8392","Audric Estime":"11579","Isaiah Bond":"12503",
"George Kittle":"4217","Colston Loveland":"12517","Mason Taylor":"12498","Kyle Pitts":"7553",
"Evan Engram":"4066","Dalton Kincaid":"10236","Tucker Kraft":"9484","Isaiah Likely":"8131",
"Juwan Johnson":"7002","Zach Ertz":"1339","Theo Johnson":"11597","Dalton Schultz":"5001",
"Hunter Henry":"3214","Oronde Gadsden II":"12493","Terrance Ferguson":"12487","AJ Barner":"11603"};
var _sleeperNameMap:{[k:string]:string}={};
function initSleeperNameMap(db:{[id:string]:{name?:string}}){_sleeperNameMap={};Object.keys(db).forEach(function(id){var p=db[id];if(p&&p.name)_sleeperNameMap[p.name]=id;});}
function headshot(n:string){var id=SLEEPER_IDS[n]||_sleeperNameMap[n];return id?"https://sleepercdn.com/content/nfl/players/thumb/"+id+".jpg":null;}

// ── Vegas Lines / Game Script (The Odds API) ─────────────────────────────────
const ODDS_API_KEY="fe9999914cab4185901b7881ec7474cb";
const ODDS_TEAM_MAP:{[k:string]:string}={
  "Arizona Cardinals":"ARI","Atlanta Falcons":"ATL","Baltimore Ravens":"BAL",
  "Buffalo Bills":"BUF","Carolina Panthers":"CAR","Chicago Bears":"CHI",
  "Cincinnati Bengals":"CIN","Cleveland Browns":"CLE","Dallas Cowboys":"DAL",
  "Denver Broncos":"DEN","Detroit Lions":"DET","Green Bay Packers":"GB",
  "Houston Texans":"HOU","Indianapolis Colts":"IND","Jacksonville Jaguars":"JAX",
  "Kansas City Chiefs":"KC","Las Vegas Raiders":"LV","Los Angeles Chargers":"LAC",
  "Los Angeles Rams":"LAR","Miami Dolphins":"MIA","Minnesota Vikings":"MIN",
  "New England Patriots":"NE","New Orleans Saints":"NO","New York Giants":"NYG",
  "New York Jets":"NYJ","Philadelphia Eagles":"PHI","Pittsburgh Steelers":"PIT",
  "San Francisco 49ers":"SF","Seattle Seahawks":"SEA","Tampa Bay Buccaneers":"TB",
  "Tennessee Titans":"TEN","Washington Commanders":"WAS"
};
var _oddsCache:{data:{[t:string]:{spread:number,total:number,opp:string}};ts:number}|null=null;
async function fetchOdds():Promise<{[t:string]:{spread:number,total:number,opp:string}}>{
  if(_oddsCache&&Date.now()-_oddsCache.ts<3600000)return _oddsCache.data;
  try{
    var r=await fetch("https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey="+ODDS_API_KEY+"&regions=us&markets=spreads,totals");
    var games=await r.json();
    if(!Array.isArray(games))return {};
    var result:{[t:string]:{spread:number,total:number,opp:string}}={};
    games.forEach(function(game:any){
      var home=ODDS_TEAM_MAP[game.home_team],away=ODDS_TEAM_MAP[game.away_team];
      if(!home||!away)return;
      var spreadHome=0,spreadAway=0,total=45;
      var bk=game.bookmakers&&(game.bookmakers.find(function(b:any){return b.key==="draftkings";})||game.bookmakers[0]);
      if(bk){
        var sm=bk.markets.find(function(m:any){return m.key==="spreads";});
        var tm=bk.markets.find(function(m:any){return m.key==="totals";});
        if(sm)sm.outcomes.forEach(function(o:any){if(ODDS_TEAM_MAP[o.name]===home)spreadHome=o.point;if(ODDS_TEAM_MAP[o.name]===away)spreadAway=o.point;});
        if(tm&&tm.outcomes[0])total=tm.outcomes[0].point;
      }
      result[home]={spread:spreadHome,total,opp:away};
      result[away]={spread:spreadAway,total,opp:home};
    });
    _oddsCache={data:result,ts:Date.now()};
    return result;
  }catch{return {};}
}
function getGameScript(team:string,odds:{[t:string]:{spread:number,total:number,opp:string}}|null):{spread:number,total:number,script:string,label:string,color:string,opp:string}|null{
  if(!odds)return null;
  var g=odds[team];if(!g)return null;
  var spread=g.spread,total=g.total;
  var script="Neutral",label="Neutral",color="#94a3b8";
  if(spread<=-7){script="Positive";label="Positive Script";color="#22c55e";}
  else if(spread<=-3){script="Positive";label="Slight Fav";color="#4ade80";}
  else if(spread>=7){script="Negative";label="Negative Script";color="#f87171";}
  else if(spread>=3){script="Negative";label="Slight Dog";color="#fb923c";}
  var totalNote=total>=50?" · Shootout":total<=41?" · Low O/U":"";
  return{spread,total,script,label:label+totalNote,color,opp:g.opp};
}

const PLAYERS=[
  {name:"Lamar Jackson",pos:"QB",age:30,team:"BAL",proj:{PPR:445,Half:445,Standard:445},adp:1.1,ktcVal:7648,note:"2026: 4,400 yds 44 TD 950 rush MVP level"},
  {name:"Josh Allen",pos:"QB",age:30,team:"BUF",proj:{PPR:432,Half:432,Standard:432},adp:1.5,ktcVal:9992,note:"2026: 4,500 yds 43 TD elite"},
  {name:"Jalen Hurts",pos:"QB",age:28,team:"PHI",proj:{PPR:418,Half:418,Standard:418},adp:2.0,ktcVal:6340,note:"2026: 4,100 yds 35 TD 850 rush"},
  {name:"Patrick Mahomes",pos:"QB",age:31,team:"KC",proj:{PPR:425,Half:425,Standard:425},adp:2.4,ktcVal:6699,note:"2026: 4,600 yds 40 TD consistent"},
  {name:"Jayden Daniels",pos:"QB",age:26,team:"WAS",proj:{PPR:398,Half:398,Standard:398},adp:3.1,ktcVal:7590,note:"2026 Year 2 leap: 4,100 yds 32 TD"},
  {name:"Joe Burrow",pos:"QB",age:30,team:"CIN",proj:{PPR:388,Half:388,Standard:388},adp:3.9,ktcVal:7294,note:"2026: 4,800 yds 39 TD healthy"},
  {name:"C.J. Stroud",pos:"QB",age:25,team:"HOU",proj:{PPR:375,Half:375,Standard:375},adp:5.0,ktcVal:4864,note:"2026: 4,400 yds 34 TD Year 3"},
  {name:"Caleb Williams",pos:"QB",age:24,team:"CHI",proj:{PPR:368,Half:368,Standard:368},adp:6.2,ktcVal:7739,note:"2026 Year 2 breakout: 4,100 yds 31 TD"},
  {name:"Jordan Love",pos:"QB",age:28,team:"GB",proj:{PPR:352,Half:352,Standard:352},adp:9.1,ktcVal:8500,note:"2026: 4,100 yds 32 TD"},
  {name:"Drake Maye",pos:"QB",age:24,team:"NE",proj:{PPR:348,Half:348,Standard:348},adp:8.5,ktcVal:9376,note:"2026 Year 2 leap: 3,900 yds 29 TD"},
  {name:"Bo Nix",pos:"QB",age:26,team:"DEN",proj:{PPR:352,Half:352,Standard:352},adp:7.8,ktcVal:6121,note:"2026 Year 2: 4,000 yds 32 TD"},
  {name:"Anthony Richardson",pos:"QB",age:24,team:"IND",proj:{PPR:338,Half:338,Standard:338},adp:9.5,ktcVal:2606,note:"2026: 3,600 yds 27 TD 600 rush"},
  {name:"Kyler Murray",pos:"QB",age:28,team:"MIN",proj:{PPR:335,Half:335,Standard:335},adp:11.2,ktcVal:4116,note:"2026: 3,800 yds 28 TD 500 rush"},
  {name:"Justin Fields",pos:"QB",age:27,team:"KC",proj:{PPR:328,Half:328,Standard:328},adp:11.8,ktcVal:2065,note:"2026: 3,500 yds 24 TD 700 rush"},
  {name:"Jared Goff",pos:"QB",age:32,team:"DET",proj:{PPR:345,Half:345,Standard:345},adp:10.5,ktcVal:4577,note:"2026: 4,300 yds 33 TD elite system"},
  {name:"Baker Mayfield",pos:"QB",age:32,team:"TB",proj:{PPR:322,Half:322,Standard:322},adp:12.5,ktcVal:4806,note:"2026: 3,800 yds 29 TD"},
  {name:"Cam Ward",pos:"QB",age:23,team:"TEN",proj:{PPR:335,Half:335,Standard:335},adp:11.0,ktcVal:5039,note:"2026 Year 2 breakout: 3,800 yds 29 TD"},
  {name:"Shedeur Sanders",pos:"QB",age:23,team:"CLE",proj:{PPR:318,Half:318,Standard:318},adp:13.5,ktcVal:2736,note:"2026 Year 2: 3,500 yds 25 TD"},
  {name:"Saquon Barkley",pos:"RB",age:29,team:"PHI",proj:{PPR:328,Half:302,Standard:276},adp:1.2,ktcVal:4869,note:"2026: 1,650 rush 13 TD age 29 workhorse"},
  {name:"Bijan Robinson",pos:"RB",age:24,team:"ATL",proj:{PPR:335,Half:310,Standard:285},adp:1.9,ktcVal:9997,note:"2026: 1,800 rush 14 TD 75 rec"},
  {name:"Jahmyr Gibbs",pos:"RB",age:24,team:"DET",proj:{PPR:328,Half:303,Standard:278},adp:2.4,ktcVal:9536,note:"2026: 1,600 rush 13 TD 70 rec"},
  {name:"Ashton Jeanty",pos:"RB",age:22,team:"LV",proj:{PPR:315,Half:291,Standard:267},adp:3.2,ktcVal:7206,note:"2026 Year 2: 1,600 rush 13 TD full feature back"},
  {name:"De'Von Achane",pos:"RB",age:25,team:"MIA",proj:{PPR:308,Half:284,Standard:260},adp:3.8,ktcVal:6917,note:"2026: 1,350 rush 75 rec elite speed"},
  {name:"Breece Hall",pos:"RB",age:25,team:"NYJ",proj:{PPR:295,Half:272,Standard:249},adp:4.5,ktcVal:5438,note:"2026: 1,500 rush 60 rec"},
  {name:"Christian McCaffrey",pos:"RB",age:30,team:"SF",proj:{PPR:278,Half:256,Standard:234},adp:6.2,ktcVal:5065,note:"2026: 1,100 rush 68 rec health risk"},
  {name:"Kyren Williams",pos:"RB",age:26,team:"LAR",proj:{PPR:285,Half:263,Standard:241},adp:5.8,ktcVal:4851,note:"2026: 1,550 rush 14 TD featured"},
  {name:"Omarion Hampton",pos:"RB",age:22,team:"LAC",proj:{PPR:288,Half:265,Standard:242},adp:5.5,ktcVal:6618,note:"2026 Year 2: 1,400 rush 11 TD breakout"},
  {name:"Jonathan Taylor",pos:"RB",age:27,team:"IND",proj:{PPR:272,Half:250,Standard:228},adp:7.5,ktcVal:6097,note:"2026: 1,350 rush 11 TD"},
  {name:"Derrick Henry",pos:"RB",age:32,team:"BAL",proj:{PPR:258,Half:241,Standard:224},adp:8.5,ktcVal:3870,note:"2026: 1,600 rush 12 TD age risk"},
  {name:"Josh Jacobs",pos:"RB",age:28,team:"GB",proj:{PPR:262,Half:241,Standard:220},adp:8.8,ktcVal:4527,note:"2026: 1,300 rush 10 TD"},
  {name:"D'Andre Swift",pos:"RB",age:26,team:"CHI",proj:{PPR:235,Half:216,Standard:197},adp:13.5,ktcVal:3547,note:"2026: 750 rush 62 rec"},
  {name:"Ja'Marr Chase",pos:"WR",age:26,team:"CIN",proj:{PPR:362,Half:336,Standard:310},adp:1.4,ktcVal:9936,note:"2026: 135 rec 1,800 yds 18 TD elite"},
  {name:"Justin Jefferson",pos:"WR",age:27,team:"MIN",proj:{PPR:345,Half:320,Standard:295},adp:1.9,ktcVal:7531,note:"2026: 135 rec 1,620 yds 12 TD"},
  {name:"CeeDee Lamb",pos:"WR",age:27,team:"DAL",proj:{PPR:332,Half:308,Standard:284},adp:2.6,ktcVal:7378,note:"2026: 125 rec 1,560 yds 13 TD"},
  {name:"Amon-Ra St. Brown",pos:"WR",age:26,team:"DET",proj:{PPR:322,Half:298,Standard:274},adp:3.5,ktcVal:7682,note:"2026: 128 rec 1,360 yds 12 TD"},
  {name:"Marvin Harrison Jr.",pos:"WR",age:23,team:"ARI",proj:{PPR:315,Half:292,Standard:269},adp:3.9,ktcVal:5014,note:"2026 Year 2 breakout: 110 rec 1,300 yds 12 TD"},
  {name:"Tetairoa McMillan",pos:"WR",age:22,team:"CAR",proj:{PPR:188,Half:173,Standard:158},adp:3.8,ktcVal:6667,note:"2026 Year 2: 72 rec 820 yds 7 TD dynasty cornerstone"},
  {name:"Travis Hunter",pos:"WR",age:22,team:"JAX",proj:{PPR:228,Half:211,Standard:194},adp:4.0,ktcVal:3777,note:"2026 Year 2 breakout: elite athlete 85 rec 960 yds 8 TD WR/CB"},
  {name:"Puka Nacua",pos:"WR",age:24,team:"LAR",proj:{PPR:270,Half:250,Standard:230},adp:3.9,ktcVal:9501,note:"2026: 102 rec 1,100 yds 8 TD"},
  {name:"A.J. Brown",pos:"WR",age:29,team:"PHI",proj:{PPR:302,Half:280,Standard:258},adp:5.4,ktcVal:4829,note:"2026: 110 rec 1,450 yds 14 TD"},
  {name:"Brandon Aiyuk",pos:"WR",age:28,team:"SF",proj:{PPR:295,Half:273,Standard:251},adp:6.0,ktcVal:2616,note:"2026: 102 rec 1,400 yds 12 TD"},
  {name:"Tee Higgins",pos:"WR",age:27,team:"CIN",proj:{PPR:290,Half:268,Standard:246},adp:6.5,ktcVal:4886,note:"2026: 98 rec 1,250 yds 12 TD"},
  {name:"Drake London",pos:"WR",age:25,team:"ATL",proj:{PPR:285,Half:264,Standard:243},adp:7.2,ktcVal:6948,note:"2026: 112 rec 1,200 yds 11 TD"},
  {name:"Garrett Wilson",pos:"WR",age:25,team:"NYJ",proj:{PPR:278,Half:258,Standard:238},adp:8.8,ktcVal:5855,note:"2026: 100 rec 1,120 yds 9 TD"},
  {name:"Rashee Rice",pos:"WR",age:25,team:"KC",proj:{PPR:272,Half:252,Standard:232},adp:9.5,ktcVal:4862,note:"2026: 95 rec 1,080 yds 10 TD"},
  {name:"Tyreek Hill",pos:"WR",age:33,team:"FA",proj:{PPR:265,Half:245,Standard:225},adp:10.2,ktcVal:2342,note:"2026: 100 rec 1,150 yds 8 TD declining age"},
  {name:"DK Metcalf",pos:"WR",age:28,team:"PIT",proj:{PPR:268,Half:249,Standard:230},adp:10.5,ktcVal:3748,note:"2026: 90 rec 1,150 yds 10 TD"},
  {name:"Rome Odunze",pos:"WR",age:23,team:"CHI",proj:{PPR:262,Half:243,Standard:224},adp:11.2,ktcVal:5538,note:"2026 Year 2 leap: 95 rec 1,050 yds 9 TD"},
  {name:"Brock Bowers",pos:"TE",age:24,team:"LV",proj:{PPR:252,Half:232,Standard:212},adp:2.8,ktcVal:7714,note:"2026 Year 2: 125 rec 1,380 yds generational"},
  {name:"Trey McBride",pos:"TE",age:26,team:"ARI",proj:{PPR:238,Half:219,Standard:200},adp:4.0,ktcVal:7616,note:"2026: 115 rec 1,200 yds 8 TD"},
  {name:"Tyler Warren",pos:"TE",age:24,team:"IND",proj:{PPR:232,Half:213,Standard:194},adp:5.2,ktcVal:5697,note:"2026 Year 2 breakout: 95 rec 1,020 yds 10 TD dynasty TE2"},
  {name:"Sam LaPorta",pos:"TE",age:25,team:"DET",proj:{PPR:222,Half:204,Standard:186},adp:6.2,ktcVal:4650,note:"2026: 98 rec 1,050 yds 10 TD"},
  {name:"Mark Andrews",pos:"TE",age:31,team:"BAL",proj:{PPR:212,Half:195,Standard:178},adp:7.5,ktcVal:2656,note:"2026: 84 rec 920 yds 9 TD"},
  {name:"Travis Kelce",pos:"TE",age:37,team:"KC",proj:{PPR:182,Half:167,Standard:152},adp:10.5,ktcVal:2115,note:"2026: 78 rec 860 yds declining age"},
  {name:"Myles Garrett",pos:"DL",age:30,team:"CLE",proj:{PPR:148,Half:148,Standard:148},adp:7.8,ktcVal:8500,note:"15 sacks 22 TFL"},
  {name:"Micah Parsons",pos:"DL",age:27,team:"DAL",proj:{PPR:145,Half:145,Standard:145},adp:8.1,ktcVal:7800,note:"14 sacks 21 TFL"},
  {name:"Aidan Hutchinson",pos:"DL",age:26,team:"DET",proj:{PPR:142,Half:142,Standard:142},adp:8.5,ktcVal:5000,note:"14 sacks 18 TFL"},
  {name:"Will Anderson Jr.",pos:"DL",age:24,team:"HOU",proj:{PPR:135,Half:135,Standard:135},adp:9.9,ktcVal:5200,note:"13 sacks 16 TFL"},
  {name:"Roquan Smith",pos:"LB",age:29,team:"BAL",proj:{PPR:152,Half:152,Standard:152},adp:7.5,ktcVal:4800,note:"155 tackles 5 sacks 3 INT"},
  {name:"Fred Warner",pos:"LB",age:29,team:"SF",proj:{PPR:148,Half:148,Standard:148},adp:7.9,ktcVal:3800,note:"145 tackles 3 sacks"},
  {name:"Zaire Franklin",pos:"LB",age:29,team:"IND",proj:{PPR:144,Half:144,Standard:144},adp:8.5,ktcVal:2800,note:"170 tackles"},
  {name:"Kyle Hamilton",pos:"DB",age:26,team:"BAL",proj:{PPR:142,Half:142,Standard:142},adp:8.8,ktcVal:8000,note:"108 tackles 5 INT 3 sacks"},
  {name:"Derwin James",pos:"DB",age:30,team:"LAC",proj:{PPR:136,Half:136,Standard:136},adp:9.5,ktcVal:4200,note:"110 tackles 3 INT"},
  {name:"Sauce Gardner",pos:"DB",age:25,team:"NYJ",proj:{PPR:125,Half:125,Standard:125},adp:11.2,ktcVal:6500,note:"70 tackles 4 INT"},
  // Additional QBs
  {name:"Justin Herbert",pos:"QB",age:28,team:"LAC",proj:{PPR:348,Half:348,Standard:348},adp:7.2,ktcVal:6826,note:"4,200 yds 30 TD"},
  {name:"Trevor Lawrence",pos:"QB",age:27,team:"JAX",proj:{PPR:355,Half:355,Standard:355},adp:6.5,ktcVal:6343,note:"4,100 yds 30 TD"},
  {name:"Tua Tagovailoa",pos:"QB",age:28,team:"ATL",proj:{PPR:342,Half:342,Standard:342},adp:8.1,ktcVal:2645,note:"3,900 yds 28 TD · signed ATL 2026"},
  {name:"J.J. McCarthy",pos:"QB",age:23,team:"MIN",proj:{PPR:315,Half:315,Standard:315},adp:10.5,ktcVal:2900,note:"2026 Year 2: 3,600 yds 27 TD post-injury"},
  {name:"Brock Purdy",pos:"QB",age:27,team:"SF",proj:{PPR:338,Half:338,Standard:338},adp:8.6,ktcVal:6016,note:"4,000 yds 27 TD"},
  {name:"Matthew Stafford",pos:"QB",age:38,team:"LAR",proj:{PPR:316,Half:316,Standard:316},adp:13.8,ktcVal:3747,note:"3,600 yds 24 TD aging"},
  {name:"Kirk Cousins",pos:"QB",age:38,team:"FA",proj:{PPR:305,Half:305,Standard:305},adp:16.5,ktcVal:1811,note:"3,400 yds 22 TD"},
  {name:"Geno Smith",pos:"QB",age:35,team:"NYJ",proj:{PPR:308,Half:308,Standard:308},adp:15.9,ktcVal:2053,note:"3,500 yds 22 TD"},
  {name:"Bryce Young",pos:"QB",age:24,team:"CAR",proj:{PPR:295,Half:295,Standard:295},adp:18.8,ktcVal:4499,note:"Year 3: 3,200 yds rebound"},
  // Additional RBs
  {name:"Kenneth Walker III",pos:"RB",age:25,team:"KC",proj:{PPR:272,Half:250,Standard:228},adp:7.5,ktcVal:5199,note:"1,250 rush 9 TD"},
  {name:"James Cook",pos:"RB",age:25,team:"BUF",proj:{PPR:260,Half:240,Standard:220},adp:9.0,ktcVal:6115,note:"900 rush 72 rec 11 TD"},
  {name:"Rhamondre Stevenson",pos:"RB",age:27,team:"NE",proj:{PPR:238,Half:218,Standard:198},adp:11.2,ktcVal:3074,note:"1,050 rush 38 rec 7 TD"},
  {name:"Travis Etienne Jr.",pos:"RB",age:27,team:"NO",proj:{PPR:235,Half:215,Standard:195},adp:11.8,ktcVal:4563,note:"1,000 rush 45 rec"},
  {name:"Isiah Pacheco",pos:"RB",age:26,team:"DET",proj:{PPR:228,Half:209,Standard:190},adp:12.9,ktcVal:2079,note:"950 rush 8 TD"},
  {name:"Joe Mixon",pos:"RB",age:30,team:"HOU",proj:{PPR:222,Half:204,Standard:186},adp:13.5,ktcVal:1532,note:"1,000 rush 8 TD"},
  {name:"David Montgomery",pos:"RB",age:29,team:"HOU",proj:{PPR:215,Half:198,Standard:181},adp:14.2,ktcVal:3488,note:"1,050 rush 9 TD tandem"},
  {name:"Tony Pollard",pos:"RB",age:28,team:"TEN",proj:{PPR:210,Half:193,Standard:176},adp:14.8,ktcVal:2700,note:"800 rush 50 rec 7 TD"},
  {name:"Rachaad White",pos:"RB",age:27,team:"WAS",proj:{PPR:208,Half:191,Standard:174},adp:15.5,ktcVal:2626,note:"700 rush 72 rec"},
  {name:"Jaylen Warren",pos:"RB",age:26,team:"PIT",proj:{PPR:195,Half:179,Standard:163},adp:17.2,ktcVal:3418,note:"800 rush 40 rec"},
  {name:"Zach Charbonnet",pos:"RB",age:25,team:"SEA",proj:{PPR:188,Half:173,Standard:158},adp:16.8,ktcVal:3669,note:"850 rush tandem"},
  {name:"Tank Bigsby",pos:"RB",age:24,team:"PHI",proj:{PPR:182,Half:167,Standard:152},adp:18.5,ktcVal:3005,note:"750 rush 6 TD"},
  {name:"Javonte Williams",pos:"RB",age:26,team:"DAL",proj:{PPR:178,Half:163,Standard:148},adp:19.2,ktcVal:4593,note:"800 rush 35 rec"},
  {name:"Aaron Jones",pos:"RB",age:32,team:"MIN",proj:{PPR:172,Half:158,Standard:144},adp:20.0,ktcVal:1949,note:"600 rush 55 rec veteran"},
  {name:"Zonovan Knight",pos:"RB",age:25,team:"ARI",proj:{PPR:165,Half:151,Standard:137},adp:21.8,ktcVal:1500,note:"700 rush starter"},
  {name:"Blake Corum",pos:"RB",age:24,team:"LAR",proj:{PPR:158,Half:144,Standard:130},adp:23.1,ktcVal:3401,note:"650 rush 5 TD"},
  {name:"Kimani Vidal",pos:"RB",age:24,team:"LAC",proj:{PPR:152,Half:139,Standard:126},adp:23.8,ktcVal:1800,note:"600 rush 40 rec"},
  {name:"Braelon Allen",pos:"RB",age:22,team:"NYJ",proj:{PPR:172,Half:158,Standard:144},adp:20.8,ktcVal:2780,note:"Year 2: 700 rush 55 rec lead back potential"},
  {name:"Keaton Mitchell",pos:"RB",age:24,team:"LAC",proj:{PPR:142,Half:130,Standard:118},adp:25.5,ktcVal:2200,note:"600 rush explosive"},
  {name:"MarShawn Lloyd",pos:"RB",age:24,team:"GB",proj:{PPR:138,Half:126,Standard:114},adp:26.2,ktcVal:2000,note:"500 rush backup"},
  {name:"Will Shipley",pos:"RB",age:23,team:"PHI",proj:{PPR:132,Half:121,Standard:110},adp:27.8,ktcVal:2000,note:"400 rush 55 rec"},
  {name:"Ray Davis",pos:"RB",age:25,team:"BUF",proj:{PPR:125,Half:114,Standard:103},adp:29.2,ktcVal:2424,note:"450 rush backup"},
  {name:"Ty Chandler",pos:"RB",age:27,team:"NO",proj:{PPR:118,Half:108,Standard:98},adp:31.0,ktcVal:800,note:"400 rush depth"},
  {name:"Javion Cohen",pos:"RB",age:23,team:"IND",proj:{PPR:112,Half:102,Standard:92},adp:33.5,ktcVal:1500,note:"250 rush 40 rec"},
  // Additional WRs
  {name:"Jaylen Waddle",pos:"WR",age:28,team:"DEN",proj:{PPR:265,Half:245,Standard:225},adp:10.4,ktcVal:4566,note:"Year 5: 100 rec 1,050 yds"},
  {name:"Chris Olave",pos:"WR",age:26,team:"NO",proj:{PPR:258,Half:238,Standard:218},adp:11.4,ktcVal:5724,note:"95 rec 1,120 yds 7 TD"},
  {name:"George Pickens",pos:"WR",age:24,team:"DAL",proj:{PPR:252,Half:233,Standard:214},adp:12.2,ktcVal:6126,note:"85 rec 1,080 yds 9 TD"},
  {name:"Jaxon Smith-Njigba",pos:"WR",age:23,team:"SEA",proj:{PPR:268,Half:248,Standard:228},adp:1.8,ktcVal:9794,note:"Year 3: 108 rec 1,200 yds 9 TD dynasty WR1"},
  {name:"Malik Nabers",pos:"WR",age:22,team:"NYG",proj:{PPR:262,Half:242,Standard:222},adp:8.5,ktcVal:7712,note:"Year 2: 98 rec 1,050 yds 9 TD ascending"},
  {name:"Zay Flowers",pos:"WR",age:25,team:"BAL",proj:{PPR:242,Half:224,Standard:206},adp:13.8,ktcVal:4721,note:"88 rec 1,000 yds 8 TD"},
  {name:"Jordan Addison",pos:"WR",age:24,team:"MIN",proj:{PPR:238,Half:220,Standard:202},adp:14.2,ktcVal:3980,note:"82 rec 980 yds 9 TD"},
  {name:"Josh Downs",pos:"WR",age:24,team:"IND",proj:{PPR:235,Half:217,Standard:199},adp:14.9,ktcVal:3310,note:"Year 3: 95 rec 980 yds"},
  {name:"Ladd McConkey",pos:"WR",age:25,team:"LAC",proj:{PPR:232,Half:214,Standard:196},adp:15.5,ktcVal:5361,note:"88 rec 940 yds"},
  {name:"DeVonta Smith",pos:"WR",age:29,team:"PHI",proj:{PPR:228,Half:211,Standard:194},adp:16.0,ktcVal:4845,note:"88 rec 1,000 yds 7 TD"},
  {name:"Mike Evans",pos:"WR",age:32,team:"SF",proj:{PPR:225,Half:208,Standard:191},adp:16.5,ktcVal:3100,note:"84 rec 1,050 yds 12 TD"},
  {name:"Michael Pittman Jr.",pos:"WR",age:28,team:"PIT",proj:{PPR:218,Half:201,Standard:184},adp:17.8,ktcVal:3550,note:"88 rec 950 yds 7 TD"},
  {name:"D.J. Moore",pos:"WR",age:28,team:"BUF",proj:{PPR:215,Half:199,Standard:183},adp:18.2,ktcVal:4086,note:"80 rec 920 yds"},
  {name:"Xavier Worthy",pos:"WR",age:23,team:"KC",proj:{PPR:210,Half:194,Standard:178},adp:19.0,ktcVal:3437,note:"Year 2: 72 rec 890 yds 9 TD"},
  {name:"Tank Dell",pos:"WR",age:25,team:"HOU",proj:{PPR:205,Half:189,Standard:173},adp:19.8,ktcVal:2486,note:"75 rec 850 yds 7 TD"},
  {name:"Davante Adams",pos:"WR",age:33,team:"LAR",proj:{PPR:195,Half:180,Standard:165},adp:20.8,ktcVal:3629,note:"Veteran: 80 rec 880 yds"},
  {name:"Kayshon Boutte",pos:"WR",age:24,team:"LAC",proj:{PPR:198,Half:183,Standard:168},adp:21.5,ktcVal:2945,note:"70 rec 800 yds 6 TD"},
  {name:"Deebo Samuel",pos:"WR",age:30,team:"WAS",proj:{PPR:185,Half:171,Standard:157},adp:23.2,ktcVal:2502,note:"55 rec 680 yds + rush"},
  {name:"Keon Coleman",pos:"WR",age:23,team:"BUF",proj:{PPR:218,Half:202,Standard:186},adp:18.5,ktcVal:3136,note:"Year 2 with Allen: 78 rec 920 yds 9 TD"},
  {name:"Tre Tucker",pos:"WR",age:25,team:"LV",proj:{PPR:185,Half:170,Standard:155},adp:24.0,ktcVal:3091,note:"72 rec 760 yds 5 TD"},
  {name:"Matthew Golden",pos:"WR",age:22,team:"HOU",proj:{PPR:178,Half:164,Standard:150},adp:24.8,ktcVal:3573,note:"Year 2: 65 rec 740 yds"},
  {name:"Brian Thomas Jr.",pos:"WR",age:23,team:"JAX",proj:{PPR:205,Half:190,Standard:175},adp:20.5,ktcVal:4942,note:"Year 2 ascending: 80 rec 900 yds 8 TD"},
  {name:"Courtland Sutton",pos:"WR",age:30,team:"DEN",proj:{PPR:165,Half:152,Standard:139},adp:27.2,ktcVal:3382,note:"68 rec 780 yds 6 TD"},
  {name:"Xavier Legette",pos:"WR",age:25,team:"CAR",proj:{PPR:158,Half:145,Standard:132},adp:28.8,ktcVal:2500,note:"Year 2: 62 rec 720 yds"},
  {name:"Jakobi Meyers",pos:"WR",age:29,team:"JAX",proj:{PPR:152,Half:140,Standard:128},adp:30.0,ktcVal:3412,note:"72 rec 720 yds"},
  {name:"Quentin Johnston",pos:"WR",age:24,team:"LAC",proj:{PPR:145,Half:133,Standard:121},adp:31.2,ktcVal:3477,note:"60 rec 700 yds 5 TD"},
  {name:"Stefon Diggs",pos:"WR",age:32,team:"FA",proj:{PPR:178,Half:164,Standard:150},adp:24.2,ktcVal:2523,note:"Veteran: 75 rec 820 yds"},
  // Additional TEs
  {name:"Dallas Goedert",pos:"TE",age:30,team:"PHI",proj:{PPR:182,Half:167,Standard:152},adp:11.8,ktcVal:2627,note:"72 rec 820 yds 7 TD"},
  {name:"T.J. Hockenson",pos:"TE",age:28,team:"MIN",proj:{PPR:175,Half:160,Standard:145},adp:12.5,ktcVal:2708,note:"70 rec 740 yds"},
  {name:"David Njoku",pos:"TE",age:29,team:"FA",proj:{PPR:168,Half:154,Standard:140},adp:13.8,ktcVal:2729,note:"65 rec 680 yds 6 TD · FA 2026"},
  {name:"Jake Ferguson",pos:"TE",age:26,team:"DAL",proj:{PPR:162,Half:148,Standard:134},adp:15.0,ktcVal:3392,note:"68 rec 700 yds 6 TD"},
  {name:"Harold Fannin Jr.",pos:"TE",age:23,team:"CLE",proj:{PPR:168,Half:154,Standard:140},adp:8.5,ktcVal:4892,note:"Year 2: 66 rec 700 yds 6 TD elite dynasty TE asset"},
  {name:"Cade Otton",pos:"TE",age:26,team:"TB",proj:{PPR:148,Half:135,Standard:122},adp:17.8,ktcVal:1800,note:"55 rec 570 yds"},
  {name:"Cole Kmet",pos:"TE",age:26,team:"CHI",proj:{PPR:145,Half:133,Standard:121},adp:18.2,ktcVal:2000,note:"55 rec 560 yds 5 TD"},
  {name:"Pat Freiermuth",pos:"TE",age:28,team:"PIT",proj:{PPR:138,Half:126,Standard:114},adp:19.5,ktcVal:2000,note:"52 rec 540 yds 5 TD"},
  {name:"Brenton Strange",pos:"TE",age:25,team:"JAX",proj:{PPR:125,Half:114,Standard:103},adp:22.5,ktcVal:3200,note:"48 rec 470 yds"},
  {name:"Michael Mayer",pos:"TE",age:24,team:"LV",proj:{PPR:118,Half:108,Standard:98},adp:25.0,ktcVal:2324,note:"45 rec 440 yds"},
  {name:"Chig Okonkwo",pos:"TE",age:27,team:"WAS",proj:{PPR:118,Half:108,Standard:98},adp:26.0,ktcVal:2100,note:"WAS TE: 48 rec 520 yds 4 TD"},
  {name:"Dawson Knox",pos:"TE",age:28,team:"BUF",proj:{PPR:108,Half:99,Standard:90},adp:28.8,ktcVal:1500,note:"40 rec 410 yds 5 TD"},
  // Additional DLs
  {name:"T.J. Watt",pos:"DL",age:30,team:"PIT",proj:{PPR:155,Half:155,Standard:155},adp:7.2,ktcVal:6000,note:"18 sacks 25 TFL elite pass rush"},
  {name:"Nick Bosa",pos:"DL",age:29,team:"SF",proj:{PPR:150,Half:150,Standard:150},adp:7.5,ktcVal:5000,note:"16 sacks 22 TFL"},
  {name:"Maxx Crosby",pos:"DL",age:29,team:"LV",proj:{PPR:148,Half:148,Standard:148},adp:7.9,ktcVal:4800,note:"15 sacks 20 TFL"},
  {name:"Chris Jones",pos:"DL",age:31,team:"KC",proj:{PPR:140,Half:140,Standard:140},adp:9.2,ktcVal:3500,note:"Interior: 14 sacks 18 TFL"},
  {name:"Brian Burns",pos:"DL",age:28,team:"NYG",proj:{PPR:138,Half:138,Standard:138},adp:9.8,ktcVal:3500,note:"14 sacks 17 TFL"},
  {name:"Jonathan Greenard",pos:"DL",age:28,team:"HOU",proj:{PPR:135,Half:135,Standard:135},adp:10.5,ktcVal:3200,note:"13 sacks 16 TFL"},
  {name:"Jalen Carter",pos:"DL",age:24,team:"PHI",proj:{PPR:145,Half:145,Standard:145},adp:9.2,ktcVal:4500,note:"Interior: 12 sacks 20 TFL elite anchor"},
  {name:"Dexter Lawrence",pos:"DL",age:28,team:"NYG",proj:{PPR:128,Half:128,Standard:128},adp:11.8,ktcVal:2800,note:"Interior: 10 sacks 16 TFL"},
  {name:"Jeffery Simmons",pos:"DL",age:28,team:"TEN",proj:{PPR:125,Half:125,Standard:125},adp:12.5,ktcVal:2200,note:"Interior: 9 sacks 15 TFL"},
  {name:"Daron Payne",pos:"DL",age:28,team:"WAS",proj:{PPR:122,Half:122,Standard:122},adp:13.2,ktcVal:2000,note:"Interior: 9 sacks 14 TFL"},
  {name:"Sam Hubbard",pos:"DL",age:30,team:"FA",proj:{PPR:118,Half:118,Standard:118},adp:14.5,ktcVal:1200,note:"11 sacks 14 TFL"},
  {name:"Josh Uche",pos:"DL",age:29,team:"NE",proj:{PPR:115,Half:115,Standard:115},adp:15.2,ktcVal:1400,note:"11 sacks 13 TFL"},
  {name:"Bryce Huff",pos:"DL",age:27,team:"PHI",proj:{PPR:112,Half:112,Standard:112},adp:16.5,ktcVal:1800,note:"12 sacks 13 TFL"},
  {name:"Haason Reddick",pos:"DL",age:31,team:"FA",proj:{PPR:108,Half:108,Standard:108},adp:17.8,ktcVal:600,note:"11 sacks 12 TFL"},
  {name:"Lukas Van Ness",pos:"DL",age:24,team:"GB",proj:{PPR:112,Half:112,Standard:112},adp:16.8,ktcVal:2800,note:"Year 3: 11 sacks 13 TFL"},
  {name:"Zach Allen",pos:"DL",age:28,team:"ARI",proj:{PPR:108,Half:108,Standard:108},adp:18.0,ktcVal:2200,note:"Versatile: 8 sacks 15 TFL"},
  {name:"Leonard Williams",pos:"DL",age:32,team:"SEA",proj:{PPR:105,Half:105,Standard:105},adp:18.8,ktcVal:1000,note:"Interior: 8 sacks 14 TFL"},
  {name:"Cameron Jordan",pos:"DL",age:35,team:"NO",proj:{PPR:102,Half:102,Standard:102},adp:19.5,ktcVal:800,note:"Veteran: 9 sacks 12 TFL"},
  {name:"Za'Darius Smith",pos:"DL",age:33,team:"FA",proj:{PPR:100,Half:100,Standard:100},adp:20.2,ktcVal:600,note:"9 sacks 11 TFL veteran"},
  {name:"Rashan Gary",pos:"DL",age:28,team:"DAL",proj:{PPR:118,Half:118,Standard:118},adp:14.0,ktcVal:4500,note:"13 sacks 16 TFL pass rush"},
  {name:"Danielle Hunter",pos:"DL",age:31,team:"HOU",proj:{PPR:112,Half:112,Standard:112},adp:16.2,ktcVal:2200,note:"12 sacks 14 TFL"},
  // Additional LBs
  {name:"T.J. Edwards",pos:"LB",age:30,team:"CHI",proj:{PPR:150,Half:150,Standard:150},adp:8.2,ktcVal:2000,note:"155 tackles 3 sacks 2 INT"},
  {name:"Bobby Wagner",pos:"LB",age:35,team:"FA",proj:{PPR:145,Half:145,Standard:145},adp:8.8,ktcVal:600,note:"Veteran: 140 tackles 3 sacks"},
  {name:"Patrick Queen",pos:"LB",age:27,team:"PIT",proj:{PPR:142,Half:142,Standard:142},adp:9.2,ktcVal:2800,note:"148 tackles 4 sacks"},
  {name:"Foyesade Oluokun",pos:"LB",age:30,team:"JAX",proj:{PPR:140,Half:140,Standard:140},adp:9.8,ktcVal:2200,note:"158 tackles 2 sacks"},
  {name:"Quay Walker",pos:"LB",age:26,team:"LV",proj:{PPR:138,Half:138,Standard:138},adp:10.2,ktcVal:2800,note:"150 tackles 3 sacks"},
  {name:"Jordyn Brooks",pos:"LB",age:28,team:"SEA",proj:{PPR:135,Half:135,Standard:135},adp:11.0,ktcVal:2000,note:"142 tackles 2 sacks"},
  {name:"Germaine Pratt",pos:"LB",age:31,team:"CIN",proj:{PPR:132,Half:132,Standard:132},adp:11.8,ktcVal:2000,note:"138 tackles 3 sacks"},
  {name:"Dre Greenlaw",pos:"LB",age:28,team:"DEN",proj:{PPR:130,Half:130,Standard:130},adp:12.5,ktcVal:2200,note:"132 tackles 3 sacks"},
  {name:"Matt Milano",pos:"LB",age:31,team:"BUF",proj:{PPR:128,Half:128,Standard:128},adp:13.2,ktcVal:1500,note:"125 tackles 2 INT"},
  {name:"Christian Harris",pos:"LB",age:26,team:"HOU",proj:{PPR:125,Half:125,Standard:125},adp:14.2,ktcVal:2800,note:"130 tackles 3 sacks"},
  {name:"Demario Davis",pos:"LB",age:36,team:"NO",proj:{PPR:122,Half:122,Standard:122},adp:15.2,ktcVal:1000,note:"Veteran: 128 tackles 3 sacks"},
  {name:"De'Vondre Campbell",pos:"LB",age:33,team:"CLE",proj:{PPR:118,Half:118,Standard:118},adp:16.5,ktcVal:1200,note:"120 tackles 2 INT"},
  {name:"Eric Kendricks",pos:"LB",age:33,team:"LAC",proj:{PPR:115,Half:115,Standard:115},adp:17.8,ktcVal:1000,note:"Veteran: 115 tackles"},
  {name:"Myjai Sanders",pos:"LB",age:27,team:"CIN",proj:{PPR:112,Half:112,Standard:112},adp:18.8,ktcVal:2000,note:"110 tackles 4 sacks"},
  {name:"Devin Lloyd",pos:"LB",age:27,team:"JAX",proj:{PPR:118,Half:118,Standard:118},adp:15.8,ktcVal:2200,note:"125 tackles 3 sacks 2 INT"},
  // Additional DBs
  {name:"Patrick Surtain II",pos:"DB",age:26,team:"DEN",proj:{PPR:138,Half:138,Standard:138},adp:9.5,ktcVal:7200,note:"Elite CB: 65 tackles 4 INT"},
  {name:"Antoine Winfield Jr.",pos:"DB",age:27,team:"TB",proj:{PPR:132,Half:132,Standard:132},adp:10.8,ktcVal:5500,note:"S: 110 tackles 4 INT 2 sacks"},
  {name:"Minkah Fitzpatrick",pos:"DB",age:29,team:"NYJ",proj:{PPR:128,Half:128,Standard:128},adp:11.5,ktcVal:4200,note:"S: 105 tackles 4 INT"},
  {name:"Budda Baker",pos:"DB",age:30,team:"ARI",proj:{PPR:125,Half:125,Standard:125},adp:12.2,ktcVal:2500,note:"S: 115 tackles 3 INT"},
  {name:"Jessie Bates III",pos:"DB",age:29,team:"ATL",proj:{PPR:122,Half:122,Standard:122},adp:13.2,ktcVal:3200,note:"S: 100 tackles 4 INT"},
  {name:"Devon Witherspoon",pos:"DB",age:25,team:"SEA",proj:{PPR:130,Half:130,Standard:130},adp:12.2,ktcVal:5500,note:"Year 3 CB: 82 tackles 6 INT ascending"},
  {name:"Jaylon Johnson",pos:"DB",age:27,team:"CHI",proj:{PPR:115,Half:115,Standard:115},adp:15.2,ktcVal:4000,note:"CB: 70 tackles 5 INT"},
  {name:"Trevon Diggs",pos:"DB",age:28,team:"GB",proj:{PPR:112,Half:112,Standard:112},adp:16.2,ktcVal:2500,note:"CB: 65 tackles 6 INT high variance"},
  {name:"C.J. Gardner-Johnson",pos:"DB",age:28,team:"CHI",proj:{PPR:108,Half:108,Standard:108},adp:17.5,ktcVal:2500,note:"S: 98 tackles 4 INT"},
  {name:"Jordan Poyer",pos:"DB",age:33,team:"MIA",proj:{PPR:105,Half:105,Standard:105},adp:18.8,ktcVal:800,note:"Veteran S: 92 tackles 4 INT"},
  {name:"Darius Slay",pos:"DB",age:34,team:"PHI",proj:{PPR:102,Half:102,Standard:102},adp:19.8,ktcVal:1000,note:"Veteran CB: 55 tackles 4 INT"},
  {name:"Emmanuel Forbes",pos:"DB",age:24,team:"WAS",proj:{PPR:112,Half:112,Standard:112},adp:17.2,ktcVal:3500,note:"Year 3 CB: 72 tackles 5 INT breakout"},
  {name:"Deommodore Lenoir",pos:"DB",age:26,team:"SF",proj:{PPR:108,Half:108,Standard:108},adp:17.8,ktcVal:2200,note:"CB: 72 tackles 4 INT"},
  // DL Wave 2 — pass rushers & interior
  {name:"Trey Hendrickson",pos:"DL",age:31,team:"BAL",proj:{PPR:128,Half:128,Standard:128},adp:11.2,ktcVal:3100,note:"15 sack pace · elite edge"},
  {name:"Khalil Mack",pos:"DL",age:35,team:"LAC",proj:{PPR:112,Half:112,Standard:112},adp:13.5,ktcVal:1200,note:"Veteran pass rusher · 10+ sacks"},
  {name:"Kayvon Thibodeaux",pos:"DL",age:25,team:"NYG",proj:{PPR:115,Half:115,Standard:115},adp:12.8,ktcVal:3800,note:"Year 4 breakout edge"},
  {name:"Gregory Rousseau",pos:"DL",age:26,team:"BUF",proj:{PPR:112,Half:112,Standard:112},adp:13.2,ktcVal:3500,note:"BUF edge · 10 sacks"},
  {name:"Chase Young",pos:"DL",age:26,team:"NO",proj:{PPR:108,Half:108,Standard:108},adp:14.2,ktcVal:2800,note:"NO edge · resurgent"},
  {name:"Quinnen Williams",pos:"DL",age:28,team:"DAL",proj:{PPR:105,Half:105,Standard:105},adp:14.8,ktcVal:2600,note:"IDL: 75 tackles 9 sacks"},
  {name:"Kenny Clark",pos:"DL",age:30,team:"GB",proj:{PPR:105,Half:105,Standard:105},adp:15.2,ktcVal:1800,note:"GB IDL anchor: 50 tackles 6 sacks"},
  {name:"Nnamdi Madubuike",pos:"DL",age:28,team:"BAL",proj:{PPR:102,Half:102,Standard:102},adp:15.8,ktcVal:2800,note:"BAL IDL: 48 tackles 8 sacks"},
  {name:"Derrick Brown",pos:"DL",age:27,team:"CAR",proj:{PPR:102,Half:102,Standard:102},adp:16.2,ktcVal:2000,note:"CAR IDL: 55 tackles 5 sacks"},
  {name:"Javon Hargrave",pos:"DL",age:32,team:"MIN",proj:{PPR:100,Half:100,Standard:100},adp:16.8,ktcVal:1500,note:"SF IDL: 48 tackles 7 sacks"},
  {name:"Travon Walker",pos:"DL",age:25,team:"JAX",proj:{PPR:98,Half:98,Standard:98},adp:17.5,ktcVal:2500,note:"JAX edge developing"},
  {name:"Azeez Ojulari",pos:"DL",age:25,team:"NYG",proj:{PPR:96,Half:96,Standard:96},adp:18.2,ktcVal:3500,note:"NYG edge: 9 sacks upside"},
  {name:"Yannick Ngakoue",pos:"DL",age:31,team:"LV",proj:{PPR:94,Half:94,Standard:94},adp:18.8,ktcVal:1200,note:"Veteran edge: 9 sacks"},
  {name:"Carl Lawson",pos:"DL",age:29,team:"NYJ",proj:{PPR:92,Half:92,Standard:92},adp:19.5,ktcVal:1500,note:"NYJ edge pass rusher"},
  {name:"Grady Jarrett",pos:"DL",age:32,team:"CHI",proj:{PPR:96,Half:96,Standard:96},adp:18.5,ktcVal:1800,note:"Veteran IDL: 48 tackles 6 sacks"},
  {name:"Matthew Judon",pos:"DL",age:33,team:"FA",proj:{PPR:100,Half:100,Standard:100},adp:16.5,ktcVal:1200,note:"Edge: 9 sacks veteran"},
  {name:"Von Miller",pos:"DL",age:37,team:"BUF",proj:{PPR:82,Half:82,Standard:82},adp:22.0,ktcVal:400,note:"Aging edge · injury risk"},
  {name:"Marcus Davenport",pos:"DL",age:29,team:"MIN",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:800,note:"MIN edge: health is key"},
  {name:"Shaq Barrett",pos:"DL",age:33,team:"FA",proj:{PPR:80,Half:80,Standard:80},adp:23.0,ktcVal:400,note:"Veteran pass rusher · free agent"},
  {name:"Harold Landry III",pos:"DL",age:29,team:"NE",proj:{PPR:92,Half:92,Standard:92},adp:19.2,ktcVal:1400,note:"TEN edge: 9 sacks"},
  {name:"Uchenna Nwosu",pos:"DL",age:29,team:"SEA",proj:{PPR:88,Half:88,Standard:88},adp:20.8,ktcVal:2000,note:"SEA edge rusher"},
  {name:"Jeremiah Owusu-Koramoah",pos:"DL",age:26,team:"CLE",proj:{PPR:95,Half:95,Standard:95},adp:18.0,ktcVal:2200,note:"CLE hybrid: 90 tackles 5 sacks"},
  // LB Wave 2 — coverage and tackling depth
  {name:"Tremaine Edmunds",pos:"LB",age:28,team:"NYG",proj:{PPR:128,Half:128,Standard:128},adp:11.5,ktcVal:2000,note:"NYG LB: 140 tackles 2 INT"},
  {name:"Lavonte David",pos:"LB",age:36,team:"TB",proj:{PPR:115,Half:115,Standard:115},adp:13.8,ktcVal:800,note:"Veteran: 130 tackles 2 INT"},
  {name:"Nate Landman",pos:"LB",age:26,team:"ATL",proj:{PPR:118,Half:118,Standard:118},adp:13.2,ktcVal:1500,note:"ATL LB: 135 tackles"},
  {name:"Alex Anzalone",pos:"LB",age:30,team:"TB",proj:{PPR:112,Half:112,Standard:112},adp:14.5,ktcVal:800,note:"TB LB: 125 tackles 2 sacks"},
  {name:"Josey Jewell",pos:"LB",age:30,team:"DEN",proj:{PPR:108,Half:108,Standard:108},adp:15.2,ktcVal:1500,note:"DEN LB: 120 tackles"},
  {name:"Isaiah Simmons",pos:"LB",age:27,team:"NYG",proj:{PPR:105,Half:105,Standard:105},adp:15.8,ktcVal:1800,note:"Hybrid LB/DB: 100 tackles 3 INT"},
  {name:"Frankie Luvu",pos:"LB",age:29,team:"WAS",proj:{PPR:102,Half:102,Standard:102},adp:16.5,ktcVal:900,note:"WAS LB: 110 tackles 4 sacks"},
  {name:"Micah McFadden",pos:"LB",age:25,team:"NYG",proj:{PPR:100,Half:100,Standard:100},adp:17.2,ktcVal:1800,note:"NYG LB: 115 tackles"},
  {name:"Zach Cunningham",pos:"LB",age:31,team:"FA",proj:{PPR:98,Half:98,Standard:98},adp:17.8,ktcVal:1000,note:"TEN LB: 115 tackles veteran"},
  {name:"Cody Barton",pos:"LB",age:28,team:"WAS",proj:{PPR:95,Half:95,Standard:95},adp:18.5,ktcVal:1000,note:"WAS LB: 110 tackles"},
  {name:"Shaquille Leonard",pos:"LB",age:30,team:"FA",proj:{PPR:105,Half:105,Standard:105},adp:15.5,ktcVal:600,note:"IND LB: health risk · 120 tackles upside"},
  {name:"Deion Jones",pos:"LB",age:30,team:"CLE",proj:{PPR:92,Half:92,Standard:92},adp:19.5,ktcVal:800,note:"Veteran coverage LB"},
  {name:"Eric Wilson",pos:"LB",age:30,team:"PHI",proj:{PPR:90,Half:90,Standard:90},adp:20.2,ktcVal:700,note:"PHI LB: 105 tackles"},
  {name:"Troy Andersen",pos:"LB",age:25,team:"ATL",proj:{PPR:98,Half:98,Standard:98},adp:18.0,ktcVal:2500,note:"ATL LB: athletic upside"},
  {name:"Pete Werner",pos:"LB",age:27,team:"NO",proj:{PPR:95,Half:95,Standard:95},adp:18.8,ktcVal:1800,note:"NO LB: 115 tackles"},
  {name:"Nicholas Morrow",pos:"LB",age:30,team:"CHI",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:700,note:"CHI LB: 105 tackles"},
  {name:"Mykel Williams",pos:"LB",age:23,team:"SF",proj:{PPR:85,Half:85,Standard:85},adp:21.5,ktcVal:2500,note:"Young SF LB upside"},
  // DB Wave 2 — CBs and safeties
  {name:"L'Jarius Sneed",pos:"DB",age:28,team:"FA",proj:{PPR:118,Half:118,Standard:118},adp:13.8,ktcVal:3200,note:"TEN CB: 75 tackles 5 INT"},
  {name:"Marlon Humphrey",pos:"DB",age:30,team:"BAL",proj:{PPR:115,Half:115,Standard:115},adp:14.2,ktcVal:3000,note:"BAL CB: 70 tackles 4 INT"},
  {name:"Charvarius Ward",pos:"DB",age:30,team:"SF",proj:{PPR:112,Half:112,Standard:112},adp:14.8,ktcVal:2500,note:"SF CB: 68 tackles 4 INT"},
  {name:"Xavien Howard",pos:"DB",age:32,team:"MIA",proj:{PPR:110,Half:110,Standard:110},adp:15.5,ktcVal:1500,note:"MIA CB: 60 tackles 5 INT veteran"},
  {name:"Marshon Lattimore",pos:"DB",age:29,team:"FA",proj:{PPR:108,Half:108,Standard:108},adp:16.0,ktcVal:1800,note:"WAS CB: 65 tackles 4 INT"},
  {name:"Harrison Smith",pos:"DB",age:37,team:"NO",proj:{PPR:105,Half:105,Standard:105},adp:16.5,ktcVal:1000,note:"NO S veteran: 95 tackles 3 INT"},
  {name:"Jalen Ramsey",pos:"DB",age:31,team:"MIA",proj:{PPR:105,Half:105,Standard:105},adp:16.5,ktcVal:1500,note:"MIA CB: 60 tackles 3 INT aging"},
  {name:"Quandre Diggs",pos:"DB",age:32,team:"SEA",proj:{PPR:102,Half:102,Standard:102},adp:17.2,ktcVal:1500,note:"SEA S: 90 tackles 4 INT"},
  {name:"Jabrill Peppers",pos:"DB",age:30,team:"NE",proj:{PPR:100,Half:100,Standard:100},adp:17.8,ktcVal:1500,note:"NE S: 95 tackles 3 INT"},
  {name:"Tyrann Mathieu",pos:"DB",age:33,team:"NO",proj:{PPR:98,Half:98,Standard:98},adp:18.2,ktcVal:800,note:"Veteran honey badger: 85 tackles 3 INT"},
  {name:"Tre'Davious White",pos:"DB",age:31,team:"LAR",proj:{PPR:96,Half:96,Standard:96},adp:18.8,ktcVal:1000,note:"LAR CB: 60 tackles 4 INT"},
  {name:"Eddie Jackson",pos:"DB",age:32,team:"CHI",proj:{PPR:95,Half:95,Standard:95},adp:19.2,ktcVal:1000,note:"CHI S: 85 tackles 3 INT"},
  {name:"Vonn Bell",pos:"DB",age:31,team:"CIN",proj:{PPR:92,Half:92,Standard:92},adp:19.8,ktcVal:800,note:"CIN S: 88 tackles 2 INT"},
  {name:"Marcus Peters",pos:"DB",age:33,team:"FA",proj:{PPR:90,Half:90,Standard:90},adp:20.5,ktcVal:400,note:"Veteran CB: high INT upside"},
  {name:"Chamarri Conner",pos:"DB",age:25,team:"WAS",proj:{PPR:98,Half:98,Standard:98},adp:18.0,ktcVal:2000,note:"WAS S: 100 tackles 3 INT upside"},
  {name:"Kam Curl",pos:"DB",age:27,team:"LAR",proj:{PPR:100,Half:100,Standard:100},adp:17.5,ktcVal:3800,note:"LAR S: 98 tackles 3 INT"},
  {name:"Jevon Holland",pos:"DB",age:26,team:"MIA",proj:{PPR:105,Half:105,Standard:105},adp:16.2,ktcVal:3000,note:"MIA S: 95 tackles 4 INT"},
  {name:"Marcus Williams",pos:"DB",age:30,team:"BAL",proj:{PPR:98,Half:98,Standard:98},adp:17.8,ktcVal:1500,note:"BAL S: 90 tackles 3 INT"},
  {name:"Xavier McKinney",pos:"DB",age:26,team:"NYG",proj:{PPR:108,Half:108,Standard:108},adp:15.8,ktcVal:3500,note:"NYG S: 95 tackles 5 INT"},
  {name:"Nick Scott",pos:"DB",age:28,team:"LAR",proj:{PPR:88,Half:88,Standard:88},adp:20.8,ktcVal:800,note:"LAR S: 80 tackles 2 INT"},
  {name:"Darnell Savage",pos:"DB",age:28,team:"PIT",proj:{PPR:90,Half:90,Standard:90},adp:20.2,ktcVal:1500,note:"PIT S: 82 tackles 3 INT"},
  {name:"Talanoa Hufanga",pos:"DB",age:26,team:"SF",proj:{PPR:95,Half:95,Standard:95},adp:19.0,ktcVal:1800,note:"SF S: 88 tackles 3 INT"},
  {name:"Jaquan Brisker",pos:"DB",age:26,team:"CHI",proj:{PPR:100,Half:100,Standard:100},adp:17.2,ktcVal:2800,note:"CHI S: 92 tackles 4 INT upside"},
  {name:"Jaylen Watson",pos:"DB",age:25,team:"KC",proj:{PPR:92,Half:92,Standard:92},adp:19.5,ktcVal:1600,note:"KC CB: 65 tackles 3 INT"},
  {name:"Tre Brown",pos:"DB",age:27,team:"SEA",proj:{PPR:88,Half:88,Standard:88},adp:21.0,ktcVal:900,note:"SEA CB: 55 tackles 3 INT"},
  // DB Wave 3 — elite CBs and ascending safeties
  {name:"A.J. Terrell",pos:"DB",age:26,team:"ATL",proj:{PPR:120,Half:120,Standard:120},adp:13.2,ktcVal:3500,note:"ATL CB elite: 68 tackles 5 INT"},
  {name:"Tariq Woolen",pos:"DB",age:26,team:"PHI",proj:{PPR:115,Half:115,Standard:115},adp:13.8,ktcVal:3200,note:"PHI CB: 62 tackles 6 INT speed"},
  {name:"Paulson Adebo",pos:"DB",age:26,team:"NO",proj:{PPR:110,Half:110,Standard:110},adp:14.5,ktcVal:2500,note:"NO CB: 65 tackles 5 INT"},
  {name:"Roger McCreary",pos:"DB",age:26,team:"DET",proj:{PPR:108,Half:108,Standard:108},adp:15.2,ktcVal:2500,note:"DET CB: 62 tackles 4 INT"},
  {name:"Adoree' Jackson",pos:"DB",age:30,team:"LAR",proj:{PPR:105,Half:105,Standard:105},adp:15.8,ktcVal:1200,note:"LAR CB: 60 tackles 3 INT"},
  {name:"Asante Samuel Jr.",pos:"DB",age:26,team:"LAC",proj:{PPR:102,Half:102,Standard:102},adp:16.5,ktcVal:2500,note:"LAC CB: 58 tackles 4 INT"},
  {name:"Damar Hamlin",pos:"DB",age:27,team:"BUF",proj:{PPR:98,Half:98,Standard:98},adp:17.2,ktcVal:1500,note:"BUF S: 88 tackles 2 INT"},
  {name:"Mike Hilton",pos:"DB",age:31,team:"CIN",proj:{PPR:100,Half:100,Standard:100},adp:16.8,ktcVal:1200,note:"CIN nickel CB: 72 tackles 3 INT"},
  {name:"Elijah Molden",pos:"DB",age:26,team:"TEN",proj:{PPR:95,Half:95,Standard:95},adp:17.8,ktcVal:1500,note:"TEN nickel: 85 tackles 3 INT"},
  {name:"Jordan Fuller",pos:"DB",age:28,team:"LAR",proj:{PPR:92,Half:92,Standard:92},adp:18.5,ktcVal:1000,note:"LAR S: 82 tackles 2 INT"},
  {name:"Donte Jackson",pos:"DB",age:30,team:"LAR",proj:{PPR:90,Half:90,Standard:90},adp:19.2,ktcVal:1200,note:"LAR CB: 55 tackles 4 INT"},
  {name:"Ambry Thomas",pos:"DB",age:26,team:"SF",proj:{PPR:88,Half:88,Standard:88},adp:19.8,ktcVal:1000,note:"SF CB: 60 tackles 3 INT"},
  {name:"Caden Sterns",pos:"DB",age:26,team:"DEN",proj:{PPR:92,Half:92,Standard:92},adp:18.8,ktcVal:1400,note:"DEN S: 85 tackles 2 INT upside"},
  {name:"Demarvin Leal",pos:"DB",age:25,team:"PIT",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:1200,note:"PIT hybrid: 78 tackles 3 sacks"},
  {name:"Josh Metellus",pos:"DB",age:27,team:"DET",proj:{PPR:90,Half:90,Standard:90},adp:19.5,ktcVal:1000,note:"DET S: 82 tackles 2 INT"},
  {name:"Andrew Wingard",pos:"DB",age:28,team:"JAX",proj:{PPR:85,Half:85,Standard:85},adp:21.2,ktcVal:700,note:"JAX S: 78 tackles"},
  {name:"Trevon Hill",pos:"DB",age:25,team:"FA",proj:{PPR:82,Half:82,Standard:82},adp:22.0,ktcVal:900,note:"Ascending CB: 60 tackles 3 INT"},
  // DL Wave 3 — IDL depth and rising edge rushers
  {name:"Montez Sweat",pos:"DL",age:28,team:"CHI",proj:{PPR:110,Half:110,Standard:110},adp:14.0,ktcVal:3200,note:"CHI edge: 11 sacks strong"},
  {name:"A.J. Epenesa",pos:"DL",age:26,team:"CLE",proj:{PPR:98,Half:98,Standard:98},adp:17.0,ktcVal:1800,note:"CLE edge: 8 sacks pass rusher"},
  {name:"Bryan Bresee",pos:"DL",age:24,team:"NO",proj:{PPR:95,Half:95,Standard:95},adp:17.5,ktcVal:2500,note:"NO IDL Year 3: 50 tackles 6 sacks"},
  {name:"Larry Ogunjobi",pos:"DL",age:31,team:"GB",proj:{PPR:92,Half:92,Standard:92},adp:18.5,ktcVal:1500,note:"GB IDL: 45 tackles 6 sacks"},
  {name:"Zach Sieler",pos:"DL",age:29,team:"MIA",proj:{PPR:90,Half:90,Standard:90},adp:19.0,ktcVal:1400,note:"MIA IDL: 48 tackles 5 sacks"},
  {name:"Poona Ford",pos:"DL",age:29,team:"ATL",proj:{PPR:88,Half:88,Standard:88},adp:19.8,ktcVal:1200,note:"ATL IDL: 42 tackles 5 sacks"},
  {name:"Isaiah Thomas",pos:"DL",age:26,team:"BAL",proj:{PPR:85,Half:85,Standard:85},adp:20.5,ktcVal:1800,note:"BAL edge: 7 sacks developing"},
  {name:"Arden Key",pos:"DL",age:29,team:"SF",proj:{PPR:88,Half:88,Standard:88},adp:20.0,ktcVal:900,note:"SF edge rotational: 7 sacks"},
  {name:"Ross Blacklock",pos:"DL",age:27,team:"HOU",proj:{PPR:85,Half:85,Standard:85},adp:20.8,ktcVal:1000,note:"HOU IDL: 42 tackles 5 sacks"},
  {name:"DaVon Hamilton",pos:"DL",age:28,team:"JAX",proj:{PPR:88,Half:88,Standard:88},adp:20.2,ktcVal:1200,note:"JAX IDL: 45 tackles 5 sacks"},
  {name:"Tyquan Lewis",pos:"DL",age:30,team:"IND",proj:{PPR:82,Half:82,Standard:82},adp:21.5,ktcVal:800,note:"IND IDL: 40 tackles 5 sacks"},
  {name:"Samson Ebukam",pos:"DL",age:30,team:"SF",proj:{PPR:80,Half:80,Standard:80},adp:22.0,ktcVal:700,note:"SF edge: 7 sacks rotational"},
  {name:"Janarius Robinson",pos:"DL",age:26,team:"MIN",proj:{PPR:78,Half:78,Standard:78},adp:23.0,ktcVal:900,note:"MIN edge developing: 6 sacks"},
  {name:"Joseph Ossai",pos:"DL",age:25,team:"HOU",proj:{PPR:92,Half:92,Standard:92},adp:18.2,ktcVal:2000,note:"HOU edge: 8 sacks breakout"},
  {name:"Dayo Odeyingbo",pos:"DL",age:26,team:"IND",proj:{PPR:88,Half:88,Standard:88},adp:19.5,ktcVal:2200,note:"IND edge: 7 sacks developing"},
  {name:"Laiatu Latu",pos:"DL",age:24,team:"IND",proj:{PPR:92,Half:92,Standard:92},adp:17.8,ktcVal:3500,note:"IND Year 2 edge: 9 sacks upside"},
  {name:"Chop Robinson",pos:"DL",age:23,team:"MIA",proj:{PPR:88,Half:88,Standard:88},adp:19.2,ktcVal:3000,note:"MIA edge Year 2: 8 sacks"},
  {name:"Dallas Turner",pos:"DL",age:22,team:"MIN",proj:{PPR:90,Half:90,Standard:90},adp:18.8,ktcVal:3800,note:"MIN edge Year 2: 9 sacks upside"},
  {name:"Patrick Jones II",pos:"DL",age:27,team:"MIN",proj:{PPR:85,Half:85,Standard:85},adp:21.0,ktcVal:1800,note:"MIN edge: 7 sacks rotational"},
  {name:"Taki Taimani",pos:"DL",age:25,team:"DET",proj:{PPR:80,Half:80,Standard:80},adp:22.5,ktcVal:700,note:"DET IDL developmental"},
  // LB Wave 3 — all-around coverage linebackers
  {name:"Jalen Reeves-Maybin",pos:"LB",age:30,team:"DET",proj:{PPR:100,Half:100,Standard:100},adp:16.5,ktcVal:700,note:"DET LB: 118 tackles 2 INT"},
  {name:"Tyrel Dodson",pos:"LB",age:27,team:"BUF",proj:{PPR:98,Half:98,Standard:98},adp:17.2,ktcVal:1500,note:"BUF LB: 115 tackles 2 sacks"},
  {name:"Jack Sanborn",pos:"LB",age:26,team:"CHI",proj:{PPR:95,Half:95,Standard:95},adp:18.0,ktcVal:1500,note:"CHI LB: 112 tackles"},
  {name:"Josh Ross",pos:"LB",age:25,team:"WAS",proj:{PPR:100,Half:100,Standard:100},adp:16.8,ktcVal:1800,note:"WAS LB: 115 tackles INT"},
  {name:"David Long Jr.",pos:"LB",age:28,team:"LAR",proj:{PPR:92,Half:92,Standard:92},adp:18.8,ktcVal:1000,note:"LAR LB: 108 tackles 2 INT"},
  {name:"Anthony Walker Jr.",pos:"LB",age:29,team:"CLE",proj:{PPR:88,Half:88,Standard:88},adp:20.2,ktcVal:700,note:"CLE LB: 102 tackles veteran"},
  {name:"Kwon Alexander",pos:"LB",age:31,team:"FA",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:600,note:"Veteran LB: 100 tackles if healthy"},
  {name:"Oren Burks",pos:"LB",age:30,team:"SF",proj:{PPR:85,Half:85,Standard:85},adp:21.0,ktcVal:600,note:"SF LB: 95 tackles coverage"},
  {name:"Monty Rice",pos:"LB",age:26,team:"TB",proj:{PPR:88,Half:88,Standard:88},adp:20.8,ktcVal:1200,note:"TB LB: 100 tackles"},
  {name:"Chris Board",pos:"LB",age:29,team:"DET",proj:{PPR:82,Half:82,Standard:82},adp:22.0,ktcVal:600,note:"DET LB: 90 tackles ST ace"},
  {name:"Chazz Surratt",pos:"LB",age:28,team:"MIN",proj:{PPR:85,Half:85,Standard:85},adp:21.5,ktcVal:800,note:"MIN LB: 95 tackles coverage"},
  {name:"Patrick Onwuasor",pos:"LB",age:31,team:"NYJ",proj:{PPR:80,Half:80,Standard:80},adp:23.0,ktcVal:500,note:"NYJ LB veteran: 88 tackles"},
  {name:"Rayshawn Jenkins",pos:"LB",age:30,team:"JAX",proj:{PPR:90,Half:90,Standard:90},adp:19.8,ktcVal:1000,note:"JAX LB/S: 95 tackles 2 INT"},
  {name:"Shaq Thompson",pos:"LB",age:31,team:"CAR",proj:{PPR:92,Half:92,Standard:92},adp:18.5,ktcVal:800,note:"CAR LB veteran: 108 tackles 2 INT"},
  {name:"Dont'a Hightower",pos:"LB",age:36,team:"FA",proj:{PPR:72,Half:72,Standard:72},adp:26.0,ktcVal:400,note:"Veteran if active"},
  {name:"Jerome Baker",pos:"LB",age:29,team:"CLE",proj:{PPR:95,Half:95,Standard:95},adp:18.2,ktcVal:1200,note:"CLE LB: 110 tackles 2 sacks"},
  {name:"Elandon Roberts",pos:"LB",age:31,team:"MIA",proj:{PPR:82,Half:82,Standard:82},adp:22.5,ktcVal:800,note:"MIA LB: 92 tackles physical"},
  {name:"Blake Martinez",pos:"LB",age:31,team:"FA",proj:{PPR:78,Half:78,Standard:78},adp:24.0,ktcVal:600,note:"Veteran FA: 100 tackles if rostered"},
  {name:"Drew Sanders",pos:"LB",age:24,team:"DEN",proj:{PPR:95,Half:95,Standard:95},adp:18.5,ktcVal:2000,note:"DEN LB Year 2: 108 tackles 3 sacks"},
  {name:"Omar Khan",pos:"LB",age:24,team:"ARI",proj:{PPR:90,Half:90,Standard:90},adp:20.0,ktcVal:1600,note:"ARI LB developing: 100 tackles"},
  {name:"Kaden Elliss",pos:"LB",age:28,team:"ATL",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:1500,note:"ATL LB: 102 tackles 2 INT"},
  // DL Wave 4 — 2024 rookies & rising stars
  {name:"Jared Verse",pos:"DL",age:24,team:"LAR",proj:{PPR:128,Half:128,Standard:128},adp:10.2,ktcVal:4500,note:"LAR edge Year 2: 11 sacks 17 TFL elite upside · 2024 Rookie DPOY"},
  {name:"Braden Fiske",pos:"DL",age:24,team:"LAR",proj:{PPR:95,Half:95,Standard:95},adp:17.5,ktcVal:3000,note:"LAR IDL Year 2: 52 tackles 8 sacks"},
  {name:"Nolan Smith Jr.",pos:"DL",age:24,team:"PHI",proj:{PPR:100,Half:100,Standard:100},adp:16.8,ktcVal:3200,note:"PHI edge Year 2: 9 sacks ascending"},
  {name:"Johnny Newton",pos:"DL",age:22,team:"CHI",proj:{PPR:92,Half:92,Standard:92},adp:18.5,ktcVal:3100,note:"CHI IDL Year 2: 48 tackles 7 sacks"},
  {name:"Darius Robinson",pos:"DL",age:24,team:"KC",proj:{PPR:90,Half:90,Standard:90},adp:19.0,ktcVal:2600,note:"KC versatile DL: 8 sacks year 2"},
  {name:"Kris Jenkins Jr.",pos:"DL",age:23,team:"MIA",proj:{PPR:88,Half:88,Standard:88},adp:19.8,ktcVal:2400,note:"MIA IDL Year 2: 46 tackles 7 sacks"},
  {name:"Zion Tupuola-Fetui",pos:"DL",age:25,team:"CHI",proj:{PPR:90,Half:90,Standard:90},adp:19.5,ktcVal:2200,note:"CHI edge: 8 sacks developing"},
  {name:"Mykel Williams",pos:"DL",age:22,team:"SF",proj:{PPR:95,Half:95,Standard:95},adp:18.2,ktcVal:3500,note:"SF edge Year 2: 9 sacks explosive"},
  {name:"Shemar Turner",pos:"DL",age:24,team:"DAL",proj:{PPR:85,Half:85,Standard:85},adp:21.0,ktcVal:2000,note:"DAL IDL developing Year 2"},
  {name:"Tyler Davis",pos:"DL",age:25,team:"HOU",proj:{PPR:80,Half:80,Standard:80},adp:22.5,ktcVal:1500,note:"HOU IDL rotational"},
  // LB Wave 4 — 2024 rookies & impact LBs
  {name:"Payton Wilson",pos:"LB",age:24,team:"PIT",proj:{PPR:118,Half:118,Standard:118},adp:13.5,ktcVal:3500,note:"PIT LB Year 2: 130 tackles 4 sacks elite upside"},
  {name:"Edgerrin Cooper",pos:"LB",age:24,team:"GB",proj:{PPR:112,Half:112,Standard:112},adp:14.8,ktcVal:3200,note:"GB LB Year 2: 125 tackles 3 sacks"},
  {name:"Junior Colson",pos:"LB",age:23,team:"IND",proj:{PPR:108,Half:108,Standard:108},adp:15.5,ktcVal:3000,note:"IND LB Year 2: 120 tackles 3 sacks"},
  {name:"Edefuan Ulofoshio",pos:"LB",age:26,team:"SEA",proj:{PPR:105,Half:105,Standard:105},adp:16.2,ktcVal:2200,note:"SEA LB: 115 tackles starter"},
  {name:"Tanner Koziol",pos:"LB",age:25,team:"BUF",proj:{PPR:98,Half:98,Standard:98},adp:17.5,ktcVal:1800,note:"BUF LB developing"},
  {name:"Nik Bonitto",pos:"LB",age:25,team:"DEN",proj:{PPR:105,Half:105,Standard:105},adp:16.0,ktcVal:3500,note:"DEN LB: 8 sacks pass rush upside"},
  {name:"Omar Speights",pos:"LB",age:24,team:"LAR",proj:{PPR:95,Half:95,Standard:95},adp:18.2,ktcVal:2000,note:"LAR LB: 108 tackles ascending"},
  {name:"Isaiah Foskey",pos:"DL",age:24,team:"NO",proj:{PPR:92,Half:92,Standard:92},adp:18.8,ktcVal:2800,note:"NO edge Year 2: 8 sacks upside"},
  // DB Wave 4 — 2024 rookies & ascending CBs/Ss
  {name:"Quinyon Mitchell",pos:"DB",age:23,team:"PHI",proj:{PPR:125,Half:125,Standard:125},adp:12.5,ktcVal:5500,note:"PHI CB Year 2: 70 tackles 5 INT elite upside"},
  {name:"Kool-Aid McKinstry",pos:"DB",age:23,team:"BAL",proj:{PPR:115,Half:115,Standard:115},adp:13.8,ktcVal:4000,note:"BAL CB Year 2: 65 tackles 4 INT"},
  {name:"Kamari Lassiter",pos:"DB",age:23,team:"HOU",proj:{PPR:112,Half:112,Standard:112},adp:14.5,ktcVal:3200,note:"HOU CB Year 2: 68 tackles 5 INT"},
  {name:"Tyler Nubin",pos:"DB",age:23,team:"NYG",proj:{PPR:108,Half:108,Standard:108},adp:15.5,ktcVal:2800,note:"NYG S Year 2: 92 tackles 3 INT"},
  {name:"Kamren Kinchens",pos:"DB",age:23,team:"MIA",proj:{PPR:105,Half:105,Standard:105},adp:16.2,ktcVal:2800,note:"MIA S Year 2: 88 tackles 3 INT"},
  {name:"Javon Bullard",pos:"DB",age:23,team:"GB",proj:{PPR:100,Half:100,Standard:100},adp:17.2,ktcVal:2500,note:"GB S Year 2: 85 tackles 3 INT"},
  {name:"Calen Bullock",pos:"DB",age:23,team:"HOU",proj:{PPR:98,Half:98,Standard:98},adp:17.8,ktcVal:2400,note:"HOU S Year 2: 82 tackles 3 INT"},
  {name:"Trey Amos",pos:"DB",age:23,team:"WAS",proj:{PPR:95,Half:95,Standard:95},adp:18.5,ktcVal:2200,note:"WAS CB developing: 62 tackles 4 INT"},
  {name:"Dwight McGlothern",pos:"DB",age:23,team:"ATL",proj:{PPR:92,Half:92,Standard:92},adp:19.2,ktcVal:1800,note:"ATL CB Year 2: 60 tackles 3 INT"},
  {name:"Evan Williams",pos:"DB",age:26,team:"SF",proj:{PPR:100,Half:100,Standard:100},adp:17.5,ktcVal:2500,note:"SF S: 90 tackles 4 INT breakout"},
  {name:"Dadrion Taylor-Demerson",pos:"DB",age:23,team:"TEN",proj:{PPR:92,Half:92,Standard:92},adp:19.0,ktcVal:2000,note:"TEN S Year 2: 85 tackles"},
  {name:"Jalen Catalon",pos:"DB",age:25,team:"NYJ",proj:{PPR:90,Half:90,Standard:90},adp:19.8,ktcVal:1800,note:"NYJ S: 80 tackles 2 INT"},
  {name:"Jermod McCoy",pos:"DB",age:24,team:"CLE",proj:{PPR:88,Half:88,Standard:88},adp:20.5,ktcVal:1600,note:"CLE CB developing"},
  {name:"Sterling Shepard",pos:"WR",age:32,team:"NYG",proj:{PPR:95,Half:88,Standard:81},adp:22.5,ktcVal:300,note:"Veteran depth"},
  // QB depth
  {name:"Dak Prescott",pos:"QB",age:32,team:"DAL",proj:{PPR:298,Half:298,Standard:298},adp:13.5,ktcVal:5027,note:"3,400 yds 25 TD comeback"},
  {name:"Sam Darnold",pos:"QB",age:28,team:"SEA",proj:{PPR:302,Half:302,Standard:302},adp:14.2,ktcVal:4812,note:"3,600 yds 26 TD"},
  {name:"Will Levis",pos:"QB",age:26,team:"TEN",proj:{PPR:285,Half:285,Standard:285},adp:16.5,ktcVal:4500,note:"New starter: 3,100 yds 22 TD"},
  {name:"Michael Penix Jr.",pos:"QB",age:25,team:"ATL",proj:{PPR:308,Half:308,Standard:308},adp:14.5,ktcVal:3136,note:"2026 starter: 3,600 yds 27 TD Year 2"},
  {name:"Aaron Rodgers",pos:"QB",age:42,team:"PIT",proj:{PPR:268,Half:268,Standard:268},adp:18.5,ktcVal:1773,note:"Veteran: 3,400 yds 24 TD"},
  {name:"Sam Howell",pos:"QB",age:25,team:"DAL",proj:{PPR:262,Half:262,Standard:262},adp:19.8,ktcVal:2200,note:"Backup/handcuff"},
  {name:"Daniel Jones",pos:"QB",age:28,team:"IND",proj:{PPR:258,Half:258,Standard:258},adp:20.5,ktcVal:4195,note:"3,000 yds 18 TD"},
  {name:"Russell Wilson",pos:"QB",age:37,team:"NYG",proj:{PPR:255,Half:255,Standard:255},adp:21.2,ktcVal:1000,note:"Veteran: 3,200 yds 20 TD"},
  {name:"Jacoby Brissett",pos:"QB",age:33,team:"ARI",proj:{PPR:238,Half:238,Standard:238},adp:24.5,ktcVal:2476,note:"Backup/spot start"},
  {name:"Deshaun Watson",pos:"QB",age:30,team:"CLE",proj:{PPR:245,Half:245,Standard:245},adp:22.5,ktcVal:800,note:"Return from injury"},
  // RB depth / handcuffs
  {name:"Nick Chubb",pos:"RB",age:30,team:"HOU",proj:{PPR:192,Half:176,Standard:160},adp:15.5,ktcVal:1500,note:"Return: 850 rush 6 TD"},
  {name:"Najee Harris",pos:"RB",age:27,team:"LAC",proj:{PPR:198,Half:182,Standard:166},adp:15.0,ktcVal:2200,note:"1,000 rush 8 TD"},
  {name:"J.K. Dobbins",pos:"RB",age:27,team:"DEN",proj:{PPR:188,Half:172,Standard:156},adp:16.5,ktcVal:2736,note:"Handcuff to Hampton"},
  {name:"Tyjae Spears",pos:"RB",age:25,team:"TEN",proj:{PPR:182,Half:167,Standard:152},adp:17.5,ktcVal:2719,note:"600 rush 55 rec handcuff"},
  {name:"Dameon Pierce",pos:"RB",age:25,team:"PHI",proj:{PPR:175,Half:161,Standard:147},adp:18.5,ktcVal:2000,note:"700 rush 5 TD"},
  {name:"Chuba Hubbard",pos:"RB",age:26,team:"CAR",proj:{PPR:178,Half:163,Standard:148},adp:17.8,ktcVal:3190,note:"850 rush 7 TD lead back"},
  {name:"Jerome Ford",pos:"RB",age:26,team:"CLE",proj:{PPR:172,Half:158,Standard:144},adp:19.2,ktcVal:1500,note:"600 rush 48 rec handcuff"},
  {name:"AJ Dillon",pos:"RB",age:27,team:"PHI",proj:{PPR:158,Half:145,Standard:132},adp:21.5,ktcVal:500,note:"Handcuff to Jacobs"},
  {name:"Zamir White",pos:"RB",age:25,team:"LV",proj:{PPR:162,Half:149,Standard:136},adp:20.5,ktcVal:1200,note:"600 rush behind Jeanty"},
  {name:"Khalil Herbert",pos:"RB",age:26,team:"CHI",proj:{PPR:165,Half:151,Standard:137},adp:20.8,ktcVal:1000,note:"Handcuff to Swift"},
  {name:"Roschon Johnson",pos:"RB",age:24,team:"CHI",proj:{PPR:145,Half:133,Standard:121},adp:24.8,ktcVal:1200,note:"Change-of-pace back"},
  {name:"Justice Hill",pos:"RB",age:27,team:"BAL",proj:{PPR:158,Half:145,Standard:132},adp:22.2,ktcVal:800,note:"Speed back handcuff to Henry"},
  {name:"Jaleel McLaughlin",pos:"RB",age:25,team:"DEN",proj:{PPR:148,Half:136,Standard:124},adp:24.2,ktcVal:800,note:"Pass catcher depth"},
  {name:"Tyrone Tracy Jr.",pos:"RB",age:23,team:"NYG",proj:{PPR:168,Half:154,Standard:140},adp:19.8,ktcVal:2600,note:"Year 2: 750 rush 45 rec"},
  {name:"Samaje Perine",pos:"RB",age:30,team:"CIN",proj:{PPR:138,Half:126,Standard:114},adp:27.5,ktcVal:300,note:"Pass-catching depth"},
  {name:"Kareem Hunt",pos:"RB",age:30,team:"KC",proj:{PPR:142,Half:130,Standard:118},adp:26.5,ktcVal:1560,note:"Veteran handcuff"},
  {name:"Devin Singletary",pos:"RB",age:28,team:"HOU",proj:{PPR:148,Half:136,Standard:124},adp:24.8,ktcVal:400,note:"Backup depth"},
  {name:"Hassan Haskins",pos:"RB",age:26,team:"TEN",proj:{PPR:128,Half:117,Standard:106},adp:30.5,ktcVal:500,note:"Backup/power back"},
  {name:"Patrick Taylor",pos:"RB",age:28,team:"MIA",proj:{PPR:118,Half:108,Standard:98},adp:33.2,ktcVal:300,note:"Backup depth"},
  {name:"Dalvin Cook",pos:"RB",age:30,team:"FA",proj:{PPR:125,Half:115,Standard:105},adp:31.0,ktcVal:200,note:"Veteran free agent"},
  {name:"Josh Kelly",pos:"RB",age:28,team:"LAC",proj:{PPR:122,Half:112,Standard:102},adp:32.0,ktcVal:400,note:"Handcuff depth"},
  {name:"Clyde Edwards-Helaire",pos:"RB",age:26,team:"KC",proj:{PPR:118,Half:108,Standard:98},adp:33.0,ktcVal:600,note:"Handcuff"},
  {name:"Dontrell Hilliard",pos:"RB",age:30,team:"TEN",proj:{PPR:112,Half:103,Standard:94},adp:34.5,ktcVal:300,note:"Veteran depth"},
  {name:"Elijah Mitchell",pos:"RB",age:27,team:"SF",proj:{PPR:132,Half:121,Standard:110},adp:28.5,ktcVal:700,note:"SF handcuff to CMC"},
  {name:"Jordan Mason",pos:"RB",age:26,team:"MIN",proj:{PPR:142,Half:130,Standard:118},adp:26.0,ktcVal:2699,note:"SF lead back candidate"},
  // WR depth
  {name:"Nico Collins",pos:"WR",age:26,team:"HOU",proj:{PPR:222,Half:205,Standard:188},adp:16.8,ktcVal:5886,note:"85 rec 1,050 yds 8 TD"},
  {name:"Khalil Shakir",pos:"WR",age:26,team:"BUF",proj:{PPR:208,Half:192,Standard:176},adp:18.5,ktcVal:2975,note:"82 rec 900 yds 7 TD"},
  {name:"Jerry Jeudy",pos:"WR",age:26,team:"CLE",proj:{PPR:195,Half:180,Standard:165},adp:20.2,ktcVal:2706,note:"78 rec 880 yds 6 TD"},
  {name:"Tyler Lockett",pos:"WR",age:33,team:"LV",proj:{PPR:175,Half:161,Standard:147},adp:23.5,ktcVal:350,note:"Veteran: 72 rec 820 yds 7 TD"},
  {name:"Christian Kirk",pos:"WR",age:29,team:"HOU",proj:{PPR:168,Half:155,Standard:142},adp:24.8,ktcVal:600,note:"70 rec 780 yds 6 TD"},
  {name:"Wan'Dale Robinson",pos:"WR",age:25,team:"TEN",proj:{PPR:182,Half:168,Standard:154},adp:22.5,ktcVal:3575,note:"80 rec 820 yds"},
  {name:"Dontayvion Wicks",pos:"WR",age:25,team:"GB",proj:{PPR:175,Half:161,Standard:147},adp:23.8,ktcVal:2500,note:"Year 3: 68 rec 800 yds 6 TD"},
  {name:"Rashod Bateman",pos:"WR",age:25,team:"BAL",proj:{PPR:162,Half:149,Standard:136},adp:26.2,ktcVal:1500,note:"65 rec 750 yds 5 TD"},
  {name:"Skyy Moore",pos:"WR",age:25,team:"KC",proj:{PPR:155,Half:143,Standard:131},adp:27.8,ktcVal:700,note:"60 rec 680 yds 5 TD"},
  {name:"Tyler Boyd",pos:"WR",age:30,team:"PIT",proj:{PPR:162,Half:149,Standard:136},adp:25.5,ktcVal:800,note:"Veteran slot: 72 rec 760 yds"},
  {name:"Cedric Tillman",pos:"WR",age:24,team:"CLE",proj:{PPR:148,Half:136,Standard:124},adp:28.5,ktcVal:2000,note:"62 rec 700 yds"},
  {name:"Tutu Atwell",pos:"WR",age:26,team:"MIA",proj:{PPR:152,Half:140,Standard:128},adp:28.0,ktcVal:1200,note:"Speed receiver: 58 rec 720 yds"},
  {name:"Diontae Johnson",pos:"WR",age:29,team:"CLE",proj:{PPR:158,Half:146,Standard:134},adp:26.8,ktcVal:800,note:"68 rec 720 yds"},
  {name:"Darius Slayton",pos:"WR",age:28,team:"NYG",proj:{PPR:148,Half:136,Standard:124},adp:29.2,ktcVal:600,note:"60 rec 720 yds 5 TD"},
  {name:"Elijah Moore",pos:"WR",age:25,team:"CLE",proj:{PPR:145,Half:133,Standard:121},adp:30.5,ktcVal:1000,note:"58 rec 660 yds"},
  {name:"Adam Thielen",pos:"WR",age:35,team:"FA",proj:{PPR:138,Half:127,Standard:116},adp:32.0,ktcVal:400,note:"Veteran slot: 60 rec 620 yds"},
  {name:"Odell Beckham Jr.",pos:"WR",age:33,team:"FA",proj:{PPR:135,Half:124,Standard:113},adp:32.5,ktcVal:700,note:"Veteran FA: 52 rec 620 yds"},
  {name:"Tyquan Thornton",pos:"WR",age:26,team:"NE",proj:{PPR:132,Half:121,Standard:110},adp:33.5,ktcVal:800,note:"Deep threat: 48 rec 640 yds"},
  {name:"Darnell Mooney",pos:"WR",age:28,team:"NYG",proj:{PPR:138,Half:127,Standard:116},adp:31.5,ktcVal:900,note:"60 rec 660 yds"},
  {name:"Demarcus Robinson",pos:"WR",age:30,team:"LAR",proj:{PPR:128,Half:118,Standard:108},adp:34.0,ktcVal:400,note:"Depth: 52 rec 580 yds"},
  {name:"Marquez Valdes-Scantling",pos:"WR",age:31,team:"KC",proj:{PPR:118,Half:109,Standard:100},adp:35.5,ktcVal:300,note:"Deep threat depth"},
  {name:"John Metchie III",pos:"WR",age:25,team:"HOU",proj:{PPR:122,Half:112,Standard:102},adp:34.5,ktcVal:1840,note:"45 rec 540 yds"},
  {name:"Lil'Jordan Humphrey",pos:"WR",age:29,team:"NO",proj:{PPR:112,Half:103,Standard:94},adp:36.5,ktcVal:400,note:"Physical WR depth"},
  {name:"Chase Claypool",pos:"WR",age:27,team:"FA",proj:{PPR:108,Half:99,Standard:90},adp:37.2,ktcVal:300,note:"Physical WR reclamation"},
  {name:"Ihmir Smith-Marsette",pos:"WR",age:26,team:"DEN",proj:{PPR:105,Half:97,Standard:89},adp:38.5,ktcVal:400,note:"Speed depth"},
  // TE depth
  {name:"Noah Fant",pos:"TE",age:28,team:"NO",proj:{PPR:118,Half:108,Standard:98},adp:23.5,ktcVal:700,note:"50 rec 520 yds 4 TD"},
  {name:"Hunter Henry",pos:"TE",age:31,team:"NE",proj:{PPR:112,Half:103,Standard:94},adp:25.5,ktcVal:2375,note:"48 rec 500 yds 5 TD"},
  {name:"Tyler Conklin",pos:"TE",age:30,team:"DET",proj:{PPR:105,Half:96,Standard:87},adp:27.8,ktcVal:400,note:"45 rec 460 yds"},
  {name:"Greg Dulcich",pos:"TE",age:26,team:"DEN",proj:{PPR:108,Half:99,Standard:90},adp:27.0,ktcVal:700,note:"Year 4: 44 rec 450 yds"},
  {name:"Robert Tonyan",pos:"TE",age:31,team:"MIN",proj:{PPR:102,Half:93,Standard:84},adp:29.5,ktcVal:400,note:"Red zone TE: 40 rec 420 yds 5 TD"},
  {name:"Charlie Kolar",pos:"TE",age:26,team:"LAC",proj:{PPR:105,Half:96,Standard:87},adp:28.5,ktcVal:700,note:"LAC TE"},
  {name:"Will Dissly",pos:"TE",age:30,team:"SEA",proj:{PPR:95,Half:87,Standard:79},adp:31.5,ktcVal:400,note:"Blocking/depth TE"},
  {name:"Taysom Hill",pos:"TE",age:35,team:"NO",proj:{PPR:108,Half:99,Standard:90},adp:26.5,ktcVal:600,note:"Utility: 30 rec 320 yds + rush TD"},
  {name:"Tanner Hudson",pos:"TE",age:30,team:"TB",proj:{PPR:92,Half:84,Standard:76},adp:33.0,ktcVal:300,note:"Backup TE"},
  {name:"Durham Smythe",pos:"TE",age:30,team:"MIA",proj:{PPR:88,Half:81,Standard:74},adp:34.5,ktcVal:300,note:"Blocking/depth TE"},
  // RB continued
  {name:"Brian Robinson Jr.",pos:"RB",age:26,team:"SF",proj:{PPR:195,Half:179,Standard:163},adp:16.2,ktcVal:2200,note:"900 rush 8 TD power back"},
  {name:"James Conner",pos:"RB",age:30,team:"ARI",proj:{PPR:188,Half:173,Standard:158},adp:17.0,ktcVal:2063,note:"850 rush 7 TD veteran"},
  {name:"Bucky Irving",pos:"RB",age:23,team:"TB",proj:{PPR:218,Half:200,Standard:182},adp:13.5,ktcVal:5355,note:"Year 2 feature back: 1,050 rush 60 rec"},
  {name:"Jonathon Brooks",pos:"RB",age:23,team:"CAR",proj:{PPR:208,Half:191,Standard:174},adp:14.8,ktcVal:3200,note:"Year 2 healthy: 1,000 rush 9 TD workhorse"},
  {name:"Jaylen Wright",pos:"RB",age:23,team:"MIA",proj:{PPR:172,Half:158,Standard:144},adp:19.5,ktcVal:2351,note:"Speed back behind Achane"},
  {name:"Isaac Guerendo",pos:"RB",age:25,team:"SF",proj:{PPR:168,Half:154,Standard:140},adp:20.2,ktcVal:2800,note:"SF committee back"},
  {name:"Ezekiel Elliott",pos:"RB",age:31,team:"DAL",proj:{PPR:148,Half:136,Standard:124},adp:24.5,ktcVal:300,note:"Veteran backup role"},
  {name:"Eric Gray",pos:"RB",age:25,team:"NYG",proj:{PPR:152,Half:139,Standard:126},adp:23.5,ktcVal:800,note:"Pass-catcher: 55 rec 400 rush"},
  {name:"Chris Rodriguez Jr.",pos:"RB",age:25,team:"JAX",proj:{PPR:138,Half:126,Standard:114},adp:27.0,ktcVal:2487,note:"Handcuff to Robinson"},
  {name:"Cam Akers",pos:"RB",age:26,team:"MIN",proj:{PPR:132,Half:121,Standard:110},adp:28.8,ktcVal:700,note:"Veteran change-of-pace"},
  {name:"Miles Sanders",pos:"RB",age:28,team:"DAL",proj:{PPR:128,Half:117,Standard:106},adp:30.2,ktcVal:400,note:"Veteran depth"},
  {name:"Raheem Mostert",pos:"RB",age:33,team:"MIA",proj:{PPR:118,Half:108,Standard:98},adp:33.8,ktcVal:200,note:"Aging speed back"},
  {name:"Jamaal Williams",pos:"RB",age:30,team:"NO",proj:{PPR:125,Half:114,Standard:103},adp:31.5,ktcVal:300,note:"Power back depth"},
  {name:"Emari Demercado",pos:"RB",age:27,team:"ARI",proj:{PPR:118,Half:108,Standard:98},adp:33.0,ktcVal:500,note:"Handcuff to Conner"},
  {name:"Gus Edwards",pos:"RB",age:29,team:"FA",proj:{PPR:145,Half:133,Standard:121},adp:25.2,ktcVal:300,note:"Power back handcuff"},
  {name:"Jeff Wilson Jr.",pos:"RB",age:30,team:"MIA",proj:{PPR:112,Half:103,Standard:94},adp:35.0,ktcVal:200,note:"Veteran depth back"},
  // WR continued
  {name:"Jameson Williams",pos:"WR",age:24,team:"DET",proj:{PPR:205,Half:189,Standard:173},adp:19.5,ktcVal:4816,note:"Deep threat: 68 rec 950 yds 8 TD"},
  {name:"Jayden Reed",pos:"WR",age:25,team:"GB",proj:{PPR:198,Half:183,Standard:168},adp:20.8,ktcVal:4119,note:"Slot: 78 rec 860 yds 7 TD"},
  {name:"Christian Watson",pos:"WR",age:26,team:"GB",proj:{PPR:185,Half:171,Standard:157},adp:22.5,ktcVal:3644,note:"68 rec 820 yds 7 TD"},
  {name:"Rashid Shaheed",pos:"WR",age:26,team:"SEA",proj:{PPR:178,Half:164,Standard:150},adp:23.8,ktcVal:3612,note:"Deep threat: 60 rec 820 yds"},
  {name:"Jahan Dotson",pos:"WR",age:25,team:"PHI",proj:{PPR:172,Half:158,Standard:144},adp:25.0,ktcVal:2200,note:"Year 4: 65 rec 760 yds 6 TD"},
  {name:"Josh Palmer",pos:"WR",age:27,team:"LAC",proj:{PPR:162,Half:149,Standard:136},adp:27.2,ktcVal:600,note:"60 rec 700 yds 5 TD"},
  {name:"Alec Pierce",pos:"WR",age:26,team:"IND",proj:{PPR:155,Half:143,Standard:131},adp:28.8,ktcVal:4210,note:"Deep threat: 55 rec 720 yds"},
  {name:"Jonathan Mingo",pos:"WR",age:24,team:"CAR",proj:{PPR:158,Half:145,Standard:132},adp:27.8,ktcVal:1800,note:"Year 3: 62 rec 730 yds"},
  {name:"Marvin Mims Jr.",pos:"WR",age:24,team:"DEN",proj:{PPR:162,Half:149,Standard:136},adp:26.5,ktcVal:2500,note:"Speed: 60 rec 750 yds 6 TD"},
  {name:"Michael Wilson",pos:"WR",age:25,team:"ARI",proj:{PPR:152,Half:140,Standard:128},adp:28.5,ktcVal:3769,note:"Physical: 58 rec 660 yds"},
  {name:"Jalen Tolbert",pos:"WR",age:26,team:"MIA",proj:{PPR:142,Half:130,Standard:118},adp:31.0,ktcVal:1200,note:"55 rec 640 yds 5 TD"},
  {name:"Kendrick Bourne",pos:"WR",age:30,team:"ARI",proj:{PPR:138,Half:127,Standard:116},adp:32.2,ktcVal:700,note:"Veteran slot: 55 rec 600 yds"},
  {name:"Isaiah McKenzie",pos:"WR",age:29,team:"BUF",proj:{PPR:128,Half:118,Standard:108},adp:34.2,ktcVal:400,note:"Slot/return: 48 rec 520 yds"},
  {name:"Andrei Iosivas",pos:"WR",age:25,team:"CIN",proj:{PPR:132,Half:121,Standard:110},adp:33.5,ktcVal:1800,note:"Deep threat: 48 rec 600 yds"},
  {name:"Bryce Ford-Wheaton",pos:"WR",age:25,team:"NYG",proj:{PPR:128,Half:118,Standard:108},adp:34.0,ktcVal:700,note:"Big body: 50 rec 580 yds"},
  {name:"Javon Baker",pos:"WR",age:24,team:"NE",proj:{PPR:118,Half:109,Standard:100},adp:36.0,ktcVal:800,note:"Year 2: 44 rec 520 yds"},
  {name:"Jamari Thrash",pos:"WR",age:24,team:"CLE",proj:{PPR:122,Half:112,Standard:102},adp:35.2,ktcVal:600,note:"Speed: 45 rec 550 yds"},
  {name:"David Bell",pos:"WR",age:25,team:"CLE",proj:{PPR:118,Half:109,Standard:100},adp:36.2,ktcVal:500,note:"Slot: 48 rec 510 yds"},
  {name:"Michael Gallup",pos:"WR",age:29,team:"DAL",proj:{PPR:108,Half:99,Standard:90},adp:38.0,ktcVal:400,note:"Veteran: 42 rec 480 yds"},
  {name:"KJ Osborn",pos:"WR",age:29,team:"MIN",proj:{PPR:112,Half:103,Standard:94},adp:37.0,ktcVal:400,note:"Slot depth: 45 rec 480 yds"},
  {name:"Charlie Jones",pos:"WR",age:25,team:"CIN",proj:{PPR:125,Half:115,Standard:105},adp:35.0,ktcVal:500,note:"Slot: 50 rec 530 yds"},
  {name:"Velus Jones Jr.",pos:"WR",age:28,team:"CHI",proj:{PPR:105,Half:97,Standard:89},adp:39.5,ktcVal:400,note:"Speed: 38 rec 460 yds"},
  {name:"Elijah Higgins",pos:"WR",age:25,team:"SF",proj:{PPR:105,Half:97,Standard:89},adp:39.8,ktcVal:400,note:"Slot/TE hybrid depth"},
  // TE continued
  {name:"Tucker Kraft",pos:"TE",age:25,team:"GB",proj:{PPR:118,Half:108,Standard:98},adp:24.2,ktcVal:4819,note:"Year 3: 50 rec 530 yds 5 TD"},
  {name:"Luke Musgrave",pos:"TE",age:25,team:"GB",proj:{PPR:105,Half:96,Standard:87},adp:28.2,ktcVal:2500,note:"Athletic: 42 rec 440 yds"},
  {name:"Isaiah Likely",pos:"TE",age:26,team:"NYG",proj:{PPR:115,Half:105,Standard:95},adp:25.8,ktcVal:3386,note:"NYG TE1: 46 rec 480 yds"},
  {name:"Juwan Johnson",pos:"TE",age:29,team:"NO",proj:{PPR:102,Half:93,Standard:84},adp:30.2,ktcVal:2428,note:"Red zone: 38 rec 380 yds 6 TD"},
  {name:"Zach Ertz",pos:"TE",age:35,team:"WAS",proj:{PPR:98,Half:90,Standard:82},adp:33.5,ktcVal:500,note:"Veteran: 38 rec 390 yds 3 TD"},
  {name:"George Kittle",pos:"TE",age:32,team:"SF",proj:{PPR:195,Half:179,Standard:163},adp:9.5,ktcVal:3295,note:"Elite blocker and receiver: 78 rec 880 yds 8 TD"},
  {name:"Oronde Gadsden II",pos:"TE",age:23,team:"LAC",proj:{PPR:138,Half:126,Standard:114},adp:19.0,ktcVal:4005,note:"Year 2: 55 rec 600 yds 5 TD elite athletic profile"},
  {name:"Terrance Ferguson",pos:"TE",age:23,team:"LAR",proj:{PPR:118,Half:108,Standard:98},adp:23.5,ktcVal:2869,note:"Year 2: 46 rec 490 yds 4 TD developing dynasty TE"},
  {name:"AJ Barner",pos:"TE",age:23,team:"SEA",proj:{PPR:108,Half:99,Standard:90},adp:27.0,ktcVal:2902,note:"Year 2: 42 rec 450 yds dynasty handcuff potential"},
  {name:"Gerald Everett",pos:"TE",age:32,team:"LAC",proj:{PPR:92,Half:84,Standard:76},adp:34.8,ktcVal:300,note:"Handcuff/depth: 38 rec 380 yds"},
  {name:"Foster Moreau",pos:"TE",age:29,team:"NO",proj:{PPR:88,Half:81,Standard:74},adp:36.5,ktcVal:500,note:"38 rec 360 yds 4 TD"},
  {name:"Ian Thomas",pos:"TE",age:29,team:"CAR",proj:{PPR:85,Half:78,Standard:71},adp:37.8,ktcVal:400,note:"Blocking/depth TE"},
  {name:"Austin Hooper",pos:"TE",age:32,team:"LV",proj:{PPR:88,Half:81,Standard:74},adp:36.2,ktcVal:300,note:"Veteran: 35 rec 350 yds"},
  {name:"Theo Johnson",pos:"TE",age:24,team:"NYG",proj:{PPR:102,Half:93,Standard:84},adp:30.5,ktcVal:2641,note:"Year 2: 40 rec 420 yds 4 TD"},
  {name:"Brayden Willis",pos:"TE",age:26,team:"PHI",proj:{PPR:85,Half:78,Standard:71},adp:38.0,ktcVal:500,note:"Backup: 32 rec 320 yds"},
  {name:"Tommy Tremble",pos:"TE",age:26,team:"CAR",proj:{PPR:82,Half:75,Standard:68},adp:39.0,ktcVal:400,note:"Blocking/depth TE"},
  // QB continued
  {name:"Gardner Minshew",pos:"QB",age:29,team:"KC",proj:{PPR:248,Half:248,Standard:248},adp:22.5,ktcVal:600,note:"3,000 yds 20 TD spot start"},
  {name:"Kenny Pickett",pos:"QB",age:28,team:"LV",proj:{PPR:242,Half:242,Standard:242},adp:23.8,ktcVal:1500,note:"Backup/handcuff to Hurts"},
  {name:"Tyson Bagent",pos:"QB",age:26,team:"CHI",proj:{PPR:235,Half:235,Standard:235},adp:25.5,ktcVal:600,note:"Handcuff to Williams"},
  {name:"Tommy DeVito",pos:"QB",age:27,team:"NYG",proj:{PPR:228,Half:228,Standard:228},adp:26.8,ktcVal:400,note:"Backup: 2,400 yds 16 TD"},
  {name:"Hendon Hooker",pos:"QB",age:27,team:"DET",proj:{PPR:225,Half:225,Standard:225},adp:27.5,ktcVal:1500,note:"Backup to Goff"},
  {name:"Jake Haener",pos:"QB",age:27,team:"NO",proj:{PPR:218,Half:218,Standard:218},adp:29.2,ktcVal:400,note:"Backup/potential starter"},
  {name:"Dorian Thompson-Robinson",pos:"QB",age:26,team:"CLE",proj:{PPR:228,Half:228,Standard:228},adp:26.5,ktcVal:800,note:"Handcuff to Sanders"},
  {name:"Tanner McKee",pos:"QB",age:25,team:"PHI",proj:{PPR:208,Half:208,Standard:208},adp:31.5,ktcVal:500,note:"Deep backup"},
  // RB wave 3
  {name:"Tyler Allgeier",pos:"RB",age:25,team:"ARI",proj:{PPR:165,Half:151,Standard:137},adp:21.2,ktcVal:3437,note:"Handcuff to Robinson: 700 rush 6 TD"},
  {name:"Kendre Miller",pos:"RB",age:24,team:"NO",proj:{PPR:168,Half:154,Standard:140},adp:20.8,ktcVal:2864,note:"Year 3: 720 rush 7 TD featured"},
  {name:"Zack Moss",pos:"RB",age:27,team:"CIN",proj:{PPR:158,Half:145,Standard:132},adp:22.8,ktcVal:1200,note:"650 rush 5 TD handcuff"},
  {name:"Antonio Gibson",pos:"RB",age:27,team:"FA",proj:{PPR:152,Half:139,Standard:126},adp:24.0,ktcVal:600,note:"Pass-catching back: 52 rec 480 rush"},
  {name:"Charbel Dabire",pos:"RB",age:24,team:"DET",proj:{PPR:128,Half:117,Standard:106},adp:30.8,ktcVal:1200,note:"Developmental back"},
  {name:"Isaiah Spiller",pos:"RB",age:25,team:"LAC",proj:{PPR:112,Half:103,Standard:94},adp:35.5,ktcVal:800,note:"Depth behind Hampton/Vidal"},
  {name:"Chase Brown",pos:"RB",age:24,team:"CIN",proj:{PPR:195,Half:179,Standard:163},adp:15.5,ktcVal:4858,note:"Year 3 breakout: 950 rush 55 rec"},
  {name:"Rico Dowdle",pos:"RB",age:27,team:"PIT",proj:{PPR:215,Half:198,Standard:181},adp:13.8,ktcVal:3147,note:"Lead back: 1,050 rush 7 TD"},
  {name:"Alvin Kamara",pos:"RB",age:30,team:"NO",proj:{PPR:198,Half:182,Standard:166},adp:16.2,ktcVal:2370,note:"Veteran: 750 rush 65 rec"},
  {name:"Kenneth Gainwell",pos:"RB",age:26,team:"TB",proj:{PPR:148,Half:136,Standard:124},adp:24.0,ktcVal:2832,note:"Committee back: 500 rush 45 rec"},
  {name:"Kyle Monangai",pos:"RB",age:23,team:"CHI",proj:{PPR:158,Half:145,Standard:132},adp:22.5,ktcVal:3765,note:"Year 2: 650 rush 5 TD"},
  {name:"Eno Benjamin",pos:"RB",age:26,team:"ARI",proj:{PPR:108,Half:99,Standard:90},adp:37.0,ktcVal:600,note:"Pass-catching depth"},
  {name:"D'Onta Foreman",pos:"RB",age:28,team:"CHI",proj:{PPR:118,Half:108,Standard:98},adp:32.5,ktcVal:400,note:"Power back depth"},
  {name:"Boston Scott",pos:"RB",age:30,team:"PHI",proj:{PPR:105,Half:96,Standard:87},adp:36.5,ktcVal:300,note:"Change-of-pace depth"},
  {name:"Kene Nwangwu",pos:"RB",age:28,team:"MIN",proj:{PPR:102,Half:93,Standard:84},adp:38.2,ktcVal:400,note:"Return specialist/depth"},
  {name:"Salvon Ahmed",pos:"RB",age:27,team:"MIA",proj:{PPR:98,Half:90,Standard:82},adp:40.0,ktcVal:400,note:"Speed depth back"},
  {name:"Ronnie Rivers",pos:"RB",age:28,team:"LAR",proj:{PPR:98,Half:90,Standard:82},adp:40.5,ktcVal:400,note:"Pass-catching depth"},
  // WR wave 3
  {name:"Nathaniel Dell",pos:"WR",age:25,team:"HOU",proj:{PPR:192,Half:177,Standard:162},adp:21.2,ktcVal:2800,note:"YAC threat: 78 rec 880 yds 6 TD"},
  {name:"Parker Washington",pos:"WR",age:24,team:"JAX",proj:{PPR:155,Half:143,Standard:131},adp:28.2,ktcVal:3629,note:"Slot: 60 rec 660 yds"},
  {name:"Jalin Hyatt",pos:"WR",age:24,team:"NYG",proj:{PPR:148,Half:136,Standard:124},adp:29.5,ktcVal:1800,note:"Deep threat: 55 rec 680 yds"},
  {name:"Keenan Allen",pos:"WR",age:33,team:"LAC",proj:{PPR:162,Half:149,Standard:136},adp:27.0,ktcVal:2055,note:"Veteran slot: 68 rec 720 yds"},
  {name:"Zay Jones",pos:"WR",age:30,team:"JAX",proj:{PPR:128,Half:118,Standard:108},adp:34.5,ktcVal:300,note:"Veteran depth: 50 rec 540 yds"},
  {name:"Allen Lazard",pos:"WR",age:30,team:"FA",proj:{PPR:122,Half:112,Standard:102},adp:35.8,ktcVal:200,note:"Physical: 45 rec 500 yds 5 TD"},
  {name:"DJ Chark",pos:"WR",age:29,team:"LAC",proj:{PPR:118,Half:109,Standard:100},adp:36.8,ktcVal:400,note:"Deep threat depth"},
  {name:"Josh Reynolds",pos:"WR",age:30,team:"DET",proj:{PPR:112,Half:103,Standard:94},adp:37.8,ktcVal:300,note:"Veteran depth: 42 rec 480 yds"},
  {name:"Kyle Philips",pos:"WR",age:26,team:"TEN",proj:{PPR:128,Half:118,Standard:108},adp:34.0,ktcVal:600,note:"Slot: 52 rec 560 yds"},
  {name:"Ja'Lynn Polk",pos:"WR",age:23,team:"NE",proj:{PPR:148,Half:136,Standard:124},adp:29.8,ktcVal:2200,note:"Year 2: 58 rec 680 yds"},
  {name:"KJ Hamler",pos:"WR",age:26,team:"DEN",proj:{PPR:108,Half:99,Standard:90},adp:38.2,ktcVal:400,note:"Speed: 38 rec 480 yds"},
  {name:"Parris Campbell",pos:"WR",age:29,team:"NYG",proj:{PPR:102,Half:93,Standard:84},adp:40.2,ktcVal:300,note:"Slot depth: 40 rec 420 yds"},
  {name:"Nelson Agholor",pos:"WR",age:32,team:"BAL",proj:{PPR:98,Half:90,Standard:82},adp:41.5,ktcVal:200,note:"Veteran depth"},
  {name:"Kadarius Toney",pos:"WR",age:27,team:"KC",proj:{PPR:108,Half:99,Standard:90},adp:38.5,ktcVal:500,note:"Explosive if healthy: 42 rec 480 yds"},
  {name:"Danny Gray",pos:"WR",age:25,team:"SF",proj:{PPR:112,Half:103,Standard:94},adp:37.5,ktcVal:400,note:"Deep threat: 38 rec 520 yds"},
  {name:"Javon Wims",pos:"WR",age:29,team:"NO",proj:{PPR:95,Half:87,Standard:79},adp:42.0,ktcVal:200,note:"Physical depth WR"},
  {name:"Bo Melton",pos:"WR",age:26,team:"GB",proj:{PPR:98,Half:90,Standard:82},adp:41.0,ktcVal:400,note:"Speed: 36 rec 440 yds"},
  {name:"Equanimeous St. Brown",pos:"WR",age:28,team:"CHI",proj:{PPR:95,Half:87,Standard:79},adp:42.5,ktcVal:300,note:"Depth: 35 rec 400 yds"},
  {name:"Justyn Ross",pos:"WR",age:26,team:"KC",proj:{PPR:95,Half:87,Standard:79},adp:43.0,ktcVal:400,note:"Developmental depth"},
  {name:"Simi Fehoko",pos:"WR",age:26,team:"DAL",proj:{PPR:92,Half:84,Standard:76},adp:43.5,ktcVal:300,note:"Deep threat depth"},
  {name:"Russell Gage",pos:"WR",age:30,team:"TB",proj:{PPR:98,Half:90,Standard:82},adp:41.8,ktcVal:300,note:"Veteran slot depth"},
  // TE wave 3
  {name:"Dalton Schultz",pos:"TE",age:29,team:"HOU",proj:{PPR:112,Half:103,Standard:94},adp:26.8,ktcVal:2311,note:"Veteran: 46 rec 470 yds 4 TD"},
  {name:"Tyler Higbee",pos:"TE",age:31,team:"LAR",proj:{PPR:102,Half:93,Standard:84},adp:30.8,ktcVal:1200,note:"42 rec 430 yds 4 TD"},
  {name:"Jonnu Smith",pos:"TE",age:30,team:"FA",proj:{PPR:108,Half:99,Standard:90},adp:28.8,ktcVal:1200,note:"42 rec 440 yds 5 TD · released PIT 2026"},
  {name:"Mo Alie-Cox",pos:"TE",age:31,team:"IND",proj:{PPR:88,Half:81,Standard:74},adp:36.8,ktcVal:300,note:"Blocking/red zone depth"},
  {name:"Marcedes Lewis",pos:"TE",age:40,team:"GB",proj:{PPR:75,Half:69,Standard:63},adp:42.0,ktcVal:200,note:"Veteran blocker"},
  {name:"CJ Uzomah",pos:"TE",age:33,team:"NYJ",proj:{PPR:82,Half:75,Standard:68},adp:38.5,ktcVal:300,note:"Veteran blocking TE"},
  {name:"Jordan Akins",pos:"TE",age:33,team:"LV",proj:{PPR:88,Half:81,Standard:74},adp:36.0,ktcVal:300,note:"42 rec 420 yds"},
  {name:"Tre' McKitty",pos:"TE",age:27,team:"LAC",proj:{PPR:82,Half:75,Standard:68},adp:38.8,ktcVal:500,note:"Handcuff TE depth"},
  {name:"Cole Turner",pos:"TE",age:26,team:"WAS",proj:{PPR:88,Half:81,Standard:74},adp:36.5,ktcVal:500,note:"38 rec 390 yds 4 TD"},
  {name:"Kylen Granson",pos:"TE",age:28,team:"TEN",proj:{PPR:85,Half:78,Standard:71},adp:37.5,ktcVal:500,note:"32 rec 340 yds"},
  {name:"Luke Farrell",pos:"TE",age:28,team:"JAX",proj:{PPR:78,Half:72,Standard:66},adp:40.0,ktcVal:400,note:"Blocking/depth"},
  {name:"Jody Fortson",pos:"TE",age:29,team:"KC",proj:{PPR:85,Half:78,Standard:71},adp:37.8,ktcVal:500,note:"Red zone: 28 rec 300 yds 5 TD"},
  {name:"Geoff Swaim",pos:"TE",age:32,team:"TEN",proj:{PPR:75,Half:69,Standard:63},adp:42.5,ktcVal:200,note:"Veteran blocker"},
  {name:"Adam Trautman",pos:"TE",age:29,team:"DEN",proj:{PPR:78,Half:72,Standard:66},adp:41.0,ktcVal:400,note:"Depth TE"},
  {name:"Brevin Jordan",pos:"TE",age:25,team:"HOU",proj:{PPR:92,Half:84,Standard:76},adp:34.2,ktcVal:1200,note:"Handcuff: 38 rec 380 yds"},
  // 2025 NFL Draft class — Year 2 in 2026
  {name:"Kaleb Johnson",pos:"RB",age:22,team:"PIT",proj:{PPR:218,Half:200,Standard:182},adp:13.0,ktcVal:2656,note:"2026 Year 2: 1,050 rush 8 TD emerging feature back"},
  {name:"Quinshon Judkins",pos:"RB",age:22,team:"CLE",proj:{PPR:232,Half:213,Standard:194},adp:6.5,ktcVal:5556,note:"2026 Year 2: 1,100 rush 9 TD feature back upside"},
  {name:"TreVeyon Henderson",pos:"RB",age:23,team:"NE",proj:{PPR:178,Half:163,Standard:148},adp:18.2,ktcVal:5583,note:"2026 Year 2: 750 rush 55 rec"},
  {name:"RJ Harvey",pos:"RB",age:23,team:"DEN",proj:{PPR:162,Half:148,Standard:134},adp:21.8,ktcVal:4112,note:"2026 Year 2: 680 rush 48 rec"},
  {name:"Tahj Brooks",pos:"RB",age:24,team:"CIN",proj:{PPR:148,Half:135,Standard:122},adp:24.8,ktcVal:1800,note:"2026 Year 2: 620 rush 5 TD"},
  {name:"Dylan Sampson",pos:"RB",age:23,team:"CLE",proj:{PPR:155,Half:142,Standard:129},adp:23.2,ktcVal:2705,note:"2026 Year 2: 650 rush 6 TD"},
  {name:"Damien Martinez",pos:"RB",age:23,team:"MIA",proj:{PPR:145,Half:133,Standard:121},adp:25.8,ktcVal:2000,note:"2026 Year 2: 580 rush 5 TD"},
  {name:"Emeka Egbuka",pos:"WR",age:23,team:"TB",proj:{PPR:215,Half:199,Standard:183},adp:17.5,ktcVal:5985,note:"2026 Year 2: 85 rec 970 yds 8 TD"},
  {name:"Luther Burden III",pos:"WR",age:22,team:"CHI",proj:{PPR:222,Half:205,Standard:188},adp:16.8,ktcVal:5436,note:"2026 Year 2 with Williams: 88 rec 980 yds 8 TD"},
  {name:"Jayden Higgins",pos:"WR",age:23,team:"HOU",proj:{PPR:218,Half:202,Standard:186},adp:17.5,ktcVal:3678,note:"2026 Year 2 with Stroud: 85 rec 960 yds 8 TD"},
  {name:"Jack Bech",pos:"WR",age:23,team:"LV",proj:{PPR:172,Half:158,Standard:144},adp:24.2,ktcVal:2470,note:"2026 Year 2: 68 rec 780 yds"},
  {name:"Kyle Williams",pos:"WR",age:22,team:"ARI",proj:{PPR:165,Half:152,Standard:139},adp:26.2,ktcVal:3461,note:"2026 Year 2: 62 rec 740 yds"},
  {name:"Savion Williams",pos:"WR",age:23,team:"GB",proj:{PPR:148,Half:136,Standard:124},adp:29.8,ktcVal:1500,note:"2026 Year 2 big body: 55 rec 660 yds"},
  {name:"Chimere Dike",pos:"WR",age:24,team:"NYJ",proj:{PPR:138,Half:127,Standard:116},adp:32.0,ktcVal:2779,note:"2026 Year 2 slot: 52 rec 580 yds"},
  {name:"Jaylin Noel",pos:"WR",age:24,team:"HOU",proj:{PPR:128,Half:118,Standard:108},adp:34.8,ktcVal:2812,note:"2026 Year 2: 46 rec 540 yds"},
  {name:"Colston Loveland",pos:"TE",age:23,team:"CHI",proj:{PPR:195,Half:179,Standard:163},adp:7.0,ktcVal:6070,note:"2026 Year 2 breakout: 78 rec 820 yds 7 TD elite receiving TE"},
  {name:"Mason Taylor",pos:"TE",age:23,team:"NYJ",proj:{PPR:158,Half:145,Standard:132},adp:16.5,ktcVal:2807,note:"2026 Year 2: 65 rec 680 yds 5 TD elite receiving prospect"},
  // Veterans still missing
  {name:"Amari Cooper",pos:"WR",age:31,team:"FA",proj:{PPR:172,Half:158,Standard:144},adp:25.5,ktcVal:400,note:"Retired after brief LV stint 2025"},
  {name:"JuJu Smith-Schuster",pos:"WR",age:29,team:"KC",proj:{PPR:148,Half:136,Standard:124},adp:30.0,ktcVal:400,note:"Slot veteran: 58 rec 620 yds"},
  {name:"Van Jefferson",pos:"WR",age:29,team:"TEN",proj:{PPR:128,Half:118,Standard:108},adp:34.2,ktcVal:300,note:"Deep threat depth: 48 rec 580 yds"},
  {name:"Greg Dortch",pos:"WR",age:27,team:"ARI",proj:{PPR:132,Half:121,Standard:110},adp:33.2,ktcVal:500,note:"Slot depth: 52 rec 560 yds"},
  {name:"Quez Watkins",pos:"WR",age:28,team:"PHI",proj:{PPR:108,Half:99,Standard:90},adp:38.8,ktcVal:400,note:"Deep threat: 38 rec 480 yds"},
  {name:"Scotty Miller",pos:"WR",age:28,team:"TB",proj:{PPR:102,Half:93,Standard:84},adp:40.8,ktcVal:300,note:"Speed: 35 rec 440 yds"},
  {name:"Shi Smith",pos:"WR",age:26,team:"CAR",proj:{PPR:108,Half:99,Standard:90},adp:38.5,ktcVal:400,note:"Slot: 42 rec 450 yds"},
  {name:"Tyler Johnson",pos:"WR",age:28,team:"TB",proj:{PPR:95,Half:87,Standard:79},adp:42.2,ktcVal:300,note:"Physical depth WR"},
  {name:"Dez Fitzpatrick",pos:"WR",age:27,team:"TEN",proj:{PPR:92,Half:84,Standard:76},adp:43.8,ktcVal:300,note:"Deep threat depth"},
  {name:"Laquon Treadwell",pos:"WR",age:30,team:"NO",proj:{PPR:88,Half:81,Standard:74},adp:44.0,ktcVal:200,note:"Physical depth"},
  {name:"Phillip Dorsett",pos:"WR",age:32,team:"FA",proj:{PPR:82,Half:75,Standard:68},adp:46.0,ktcVal:150,note:"Speed veteran FA"},
  // RBs still missing
  {name:"JaMycal Hasty",pos:"RB",age:28,team:"JAX",proj:{PPR:102,Half:93,Standard:84},adp:38.5,ktcVal:400,note:"Pass-catching depth"},
  {name:"Hassan Hall",pos:"RB",age:25,team:"ATL",proj:{PPR:95,Half:87,Standard:79},adp:41.2,ktcVal:800,note:"Speed depth back"},
  {name:"Mataeo Durant",pos:"RB",age:25,team:"DAL",proj:{PPR:105,Half:96,Standard:87},adp:37.5,ktcVal:900,note:"Handcuff depth"},
  {name:"Dwayne Washington",pos:"RB",age:31,team:"NO",proj:{PPR:85,Half:78,Standard:71},adp:44.0,ktcVal:200,note:"Veteran depth back"},
  {name:"Tavion Thomas",pos:"RB",age:25,team:"CIN",proj:{PPR:92,Half:84,Standard:76},adp:42.0,ktcVal:500,note:"Developmental depth"},
  {name:"Dare Ogunbowale",pos:"RB",age:30,team:"HOU",proj:{PPR:88,Half:81,Standard:74},adp:43.5,ktcVal:300,note:"Pass-catching veteran"},
  {name:"C.J. Ham",pos:"RB",age:31,team:"MIN",proj:{PPR:72,Half:66,Standard:60},adp:48.0,ktcVal:200,note:"FB/depth role"},
  {name:"Patrick Ricard",pos:"RB",age:31,team:"BAL",proj:{PPR:68,Half:62,Standard:56},adp:50.0,ktcVal:200,note:"FB blocker"},
  {name:"Ty Montgomery",pos:"RB",age:33,team:"NO",proj:{PPR:78,Half:72,Standard:66},adp:46.0,ktcVal:150,note:"Veteran utility back"},
  // More TEs
  {name:"Davis Allen",pos:"TE",age:26,team:"LAR",proj:{PPR:92,Half:84,Standard:76},adp:34.5,ktcVal:1200,note:"Year 3 developmental TE"},
  {name:"Donald Parham Jr.",pos:"TE",age:29,team:"LAC",proj:{PPR:82,Half:75,Standard:68},adp:39.5,ktcVal:500,note:"Red zone target: 28 rec 280 yds 4 TD"},
  {name:"Jeremy Ruckert",pos:"TE",age:26,team:"NYJ",proj:{PPR:78,Half:72,Standard:66},adp:41.5,ktcVal:600,note:"Developmental TE"},
  {name:"Hunter Long",pos:"TE",age:27,team:"LAR",proj:{PPR:75,Half:69,Standard:63},adp:43.0,ktcVal:400,note:"Blocking/depth"},
  {name:"Noah Gray",pos:"TE",age:27,team:"KC",proj:{PPR:88,Half:81,Standard:74},adp:36.8,ktcVal:800,note:"38 rec 380 yds"},
  {name:"Josiah Deguara",pos:"TE",age:28,team:"GB",proj:{PPR:72,Half:66,Standard:60},adp:44.5,ktcVal:300,note:"FB/TE hybrid"},
  {name:"Andrew Beck",pos:"TE",age:30,team:"HOU",proj:{PPR:68,Half:62,Standard:56},adp:46.5,ktcVal:200,note:"FB/depth"},
  {name:"Ryan Becker",pos:"TE",age:25,team:"WAS",proj:{PPR:75,Half:69,Standard:63},adp:43.5,ktcVal:500,note:"Developmental TE"},
  {name:"Mustapha Mara",pos:"TE",age:26,team:"NO",proj:{PPR:72,Half:66,Standard:60},adp:45.0,ktcVal:400,note:"Depth TE"},
  // More IDP if dynasty leagues use them
  {name:"Jaelon Darden",pos:"WR",age:27,team:"NO",proj:{PPR:88,Half:81,Standard:74},adp:44.5,ktcVal:300,note:"Return/depth WR"},
  {name:"David Moore",pos:"WR",age:30,team:"CHI",proj:{PPR:92,Half:84,Standard:76},adp:43.2,ktcVal:300,note:"Veteran deep threat"},
  {name:"Ty Fryfogle",pos:"WR",age:27,team:"IND",proj:{PPR:82,Half:75,Standard:68},adp:45.5,ktcVal:300,note:"Physical depth WR"},
  {name:"Isaiah Hodgins",pos:"WR",age:26,team:"NYG",proj:{PPR:105,Half:97,Standard:89},adp:39.2,ktcVal:500,note:"Physical: 40 rec 460 yds"},
  {name:"Kalil Pimpleton",pos:"WR",age:26,team:"DET",proj:{PPR:85,Half:78,Standard:71},adp:44.8,ktcVal:300,note:"Slot/return depth"},
  {name:"Trent Sherfield",pos:"WR",age:30,team:"SF",proj:{PPR:95,Half:87,Standard:79},adp:42.8,ktcVal:300,note:"Veteran slot: 38 rec 400 yds"},
  {name:"Michael Bandy",pos:"WR",age:28,team:"LAC",proj:{PPR:82,Half:75,Standard:68},adp:45.2,ktcVal:300,note:"Speed depth WR"},
  {name:"Nsimba Webster",pos:"WR",age:28,team:"ARI",proj:{PPR:78,Half:72,Standard:66},adp:46.8,ktcVal:200,note:"Return/depth WR"},
  // Major missing vets
  {name:"Cooper Kupp",pos:"WR",age:32,team:"SEA",proj:{PPR:218,Half:201,Standard:184},adp:17.2,ktcVal:2000,note:"Elite route runner: 88 rec 1,020 yds if healthy"},
  {name:"Chris Godwin",pos:"WR",age:30,team:"TB",proj:{PPR:195,Half:180,Standard:165},adp:20.5,ktcVal:2808,note:"Return from injury: 76 rec 880 yds"},
  {name:"Michael Thomas",pos:"WR",age:32,team:"FA",proj:{PPR:148,Half:136,Standard:124},adp:29.5,ktcVal:400,note:"Injury reclamation: 55 rec 620 yds if healthy"},
  {name:"Robert Woods",pos:"WR",age:33,team:"FA",proj:{PPR:92,Half:84,Standard:76},adp:43.0,ktcVal:150,note:"Veteran slot depth"},
  {name:"Braxton Berrios",pos:"WR",age:29,team:"MIA",proj:{PPR:102,Half:93,Standard:84},adp:40.5,ktcVal:300,note:"Slot/return: 40 rec 430 yds"},
  {name:"Richie James",pos:"WR",age:29,team:"NE",proj:{PPR:108,Half:99,Standard:90},adp:38.2,ktcVal:300,note:"Slot depth: 42 rec 450 yds"},
  {name:"Mack Hollins",pos:"WR",age:32,team:"ATL",proj:{PPR:88,Half:81,Standard:74},adp:44.2,ktcVal:200,note:"Deep threat veteran"},
  {name:"Terrace Marshall Jr.",pos:"WR",age:25,team:"CAR",proj:{PPR:118,Half:109,Standard:100},adp:36.5,ktcVal:600,note:"Year 5: 46 rec 520 yds"},
  {name:"Deven Thompkins",pos:"WR",age:26,team:"TB",proj:{PPR:98,Half:90,Standard:82},adp:41.8,ktcVal:300,note:"Speed: 38 rec 450 yds"},
  {name:"Dee Eskridge",pos:"WR",age:28,team:"SEA",proj:{PPR:88,Half:81,Standard:74},adp:44.5,ktcVal:200,note:"Speed depth"},
  {name:"Marvin Jones Jr.",pos:"WR",age:35,team:"FA",proj:{PPR:78,Half:72,Standard:66},adp:47.0,ktcVal:100,note:"Veteran if signed"},
  {name:"James Proche",pos:"WR",age:28,team:"BAL",proj:{PPR:82,Half:75,Standard:68},adp:46.2,ktcVal:200,note:"Slot/return depth"},
  {name:"N'Keal Harry",pos:"WR",age:28,team:"CHI",proj:{PPR:88,Half:81,Standard:74},adp:44.0,ktcVal:300,note:"Physical: 35 rec 380 yds reclamation"},
  {name:"Reggie Roberson Jr.",pos:"WR",age:27,team:"DAL",proj:{PPR:82,Half:75,Standard:68},adp:46.5,ktcVal:200,note:"Deep threat depth"},
  {name:"Cade Johnson",pos:"WR",age:28,team:"SEA",proj:{PPR:78,Half:72,Standard:66},adp:47.5,ktcVal:200,note:"Slot depth"},
  {name:"Lynn Bowden Jr.",pos:"WR",age:28,team:"LV",proj:{PPR:82,Half:75,Standard:68},adp:46.8,ktcVal:200,note:"Versatile depth"},
  {name:"Davion Davis",pos:"WR",age:26,team:"PHI",proj:{PPR:75,Half:69,Standard:63},adp:48.0,ktcVal:200,note:"Physical depth WR"},
  {name:"Malachi Corley",pos:"WR",age:23,team:"NYJ",proj:{PPR:148,Half:136,Standard:124},adp:29.0,ktcVal:2200,note:"2026 Year 2: 58 rec 650 yds YAC machine"},
  {name:"Calvin Austin III",pos:"WR",age:26,team:"NYG",proj:{PPR:118,Half:108,Standard:98},adp:37.0,ktcVal:1200,note:"Speed threat: 45 rec 560 yds deep ball"},
  {name:"Treylon Burks",pos:"WR",age:25,team:"WAS",proj:{PPR:112,Half:103,Standard:94},adp:39.0,ktcVal:1500,note:"Physical: 42 rec 500 yds reclamation candidate"},
  {name:"Nick Cross",pos:"DB",age:25,team:"WAS",proj:{PPR:88,Half:88,Standard:88},adp:26.0,ktcVal:1600,note:"Safety: elite athleticism IDP DB2"},
  {name:"Ricky Pearsall",pos:"WR",age:24,team:"SF",proj:{PPR:165,Half:152,Standard:139},adp:26.0,ktcVal:3843,note:"2026 Year 2: 64 rec 760 yds"},
  {name:"Roman Wilson",pos:"WR",age:24,team:"PIT",proj:{PPR:142,Half:130,Standard:118},adp:31.2,ktcVal:2000,note:"2026 Year 2 deep threat: 52 rec 660 yds"},
  {name:"Devaughn Vele",pos:"WR",age:25,team:"DEN",proj:{PPR:132,Half:121,Standard:110},adp:33.8,ktcVal:1993,note:"2026 Year 2: 50 rec 600 yds"},
  {name:"Troy Franklin",pos:"WR",age:23,team:"DEN",proj:{PPR:145,Half:133,Standard:121},adp:30.8,ktcVal:3828,note:"2026 Year 2: 56 rec 680 yds"},
  {name:"Jalen McMillan",pos:"WR",age:23,team:"TB",proj:{PPR:138,Half:127,Standard:116},adp:32.5,ktcVal:2915,note:"2026 Year 2: 52 rec 620 yds"},
  // More 2025 rookies (Year 2 in 2026)
  {name:"Amorion Walker",pos:"WR",age:23,team:"DAL",proj:{PPR:118,Half:109,Standard:100},adp:37.0,ktcVal:2000,note:"2026 Year 2 developmental"},
  {name:"Isaac TeSlaa",pos:"WR",age:24,team:"GB",proj:{PPR:112,Half:103,Standard:94},adp:38.5,ktcVal:2800,note:"2026 Year 2: 42 rec 500 yds"},
  {name:"Jalen Coker",pos:"WR",age:24,team:"CAR",proj:{PPR:158,Half:145,Standard:132},adp:28.5,ktcVal:3904,note:"2026 Year 2: 60 rec 720 yds 6 TD ascending receiver"},
  {name:"Tre' Harris",pos:"WR",age:23,team:"LAC",proj:{PPR:152,Half:140,Standard:128},adp:29.5,ktcVal:3564,note:"Year 2: 56 rec 680 yds as rookie · elite size/speed profile"},
  {name:"Tory Horton",pos:"WR",age:24,team:"NE",proj:{PPR:132,Half:121,Standard:110},adp:34.0,ktcVal:3539,note:"2026 Year 2: 50 rec 620 yds developing WR2"},
  {name:"Ryan Flournoy",pos:"WR",age:23,team:"SEA",proj:{PPR:118,Half:108,Standard:98},adp:38.0,ktcVal:2311,note:"2026 Year 2: 44 rec 520 yds developmental WR"},
  {name:"Konata Mumpfield",pos:"WR",age:24,team:"PIT",proj:{PPR:98,Half:90,Standard:82},adp:44.0,ktcVal:1789,note:"Speed receiver depth: 34 rec 420 yds"},
  {name:"Emanuel Wilson",pos:"RB",age:25,team:"GB",proj:{PPR:128,Half:117,Standard:106},adp:31.5,ktcVal:2516,note:"Handcuff to Jacobs: 480 rush 38 rec"},
  // RB wave 4
  {name:"Ke'Shawn Vaughn",pos:"RB",age:28,team:"TB",proj:{PPR:108,Half:99,Standard:90},adp:37.8,ktcVal:400,note:"Veteran depth back"},
  {name:"Deon Jackson",pos:"RB",age:27,team:"IND",proj:{PPR:102,Half:93,Standard:84},adp:39.5,ktcVal:500,note:"Pass-catching depth: 38 rec"},
  {name:"Keaontay Ingram",pos:"RB",age:26,team:"LAR",proj:{PPR:95,Half:87,Standard:79},adp:42.5,ktcVal:500,note:"Depth handcuff"},
  {name:"Mike Boone",pos:"RB",age:30,team:"ATL",proj:{PPR:88,Half:81,Standard:74},adp:44.8,ktcVal:300,note:"Veteran depth back"},
  {name:"Trayveon Williams",pos:"RB",age:28,team:"CIN",proj:{PPR:92,Half:84,Standard:76},adp:43.2,ktcVal:400,note:"Speed: 35 rec depth"},
  {name:"Pooka Williams Jr.",pos:"RB",age:26,team:"CIN",proj:{PPR:88,Half:81,Standard:74},adp:44.2,ktcVal:600,note:"Elusive pass-catcher"},
  {name:"Larry Rountree III",pos:"RB",age:27,team:"LAC",proj:{PPR:82,Half:75,Standard:68},adp:46.5,ktcVal:500,note:"Power depth back"},
  {name:"Phillip Lindsay",pos:"RB",age:31,team:"FA",proj:{PPR:78,Half:72,Standard:66},adp:48.5,ktcVal:200,note:"Veteran FA depth"},
  {name:"Cordarrelle Patterson",pos:"RB",age:34,team:"ATL",proj:{PPR:92,Half:84,Standard:76},adp:43.5,ktcVal:150,note:"Utility: rush + special teams"},
  {name:"Spencer Sanders",pos:"RB",age:25,team:"LAR",proj:{PPR:82,Half:75,Standard:68},adp:46.0,ktcVal:500,note:"Developmental depth"},
  {name:"Keith Smith",pos:"RB",age:32,team:"ATL",proj:{PPR:62,Half:57,Standard:52},adp:52.0,ktcVal:150,note:"FB role"},
  {name:"Joshua Kelley",pos:"RB",age:29,team:"LAC",proj:{PPR:95,Half:87,Standard:79},adp:42.8,ktcVal:400,note:"Handcuff depth"},
  // TE wave 4
  {name:"Daniel Bellinger",pos:"TE",age:25,team:"TEN",proj:{PPR:95,Half:87,Standard:79},adp:34.0,ktcVal:1200,note:"TEN TE: 38 rec 390 yds"},
  {name:"Hayden Hurst",pos:"TE",age:32,team:"CAR",proj:{PPR:88,Half:81,Standard:74},adp:37.2,ktcVal:300,note:"Veteran: 36 rec 370 yds"},
  {name:"Nick Vannett",pos:"TE",age:32,team:"NO",proj:{PPR:72,Half:66,Standard:60},adp:46.0,ktcVal:200,note:"Blocking TE depth"},
  {name:"MyCole Pruitt",pos:"TE",age:33,team:"ATL",proj:{PPR:65,Half:60,Standard:55},adp:50.0,ktcVal:200,note:"Veteran blocker"},
  {name:"Eric Saubert",pos:"TE",age:30,team:"DEN",proj:{PPR:68,Half:62,Standard:56},adp:48.0,ktcVal:200,note:"Depth/blocking TE"},
  {name:"Pharaoh Brown",pos:"TE",age:31,team:"HOU",proj:{PPR:65,Half:60,Standard:55},adp:50.5,ktcVal:200,note:"Blocking TE"},
  {name:"Ross Dwelley",pos:"TE",age:30,team:"SF",proj:{PPR:72,Half:66,Standard:60},adp:47.0,ktcVal:200,note:"Blocking/depth behind Fant"},
  {name:"Tanner McLachlan",pos:"TE",age:26,team:"ARI",proj:{PPR:82,Half:75,Standard:68},adp:40.5,ktcVal:500,note:"Developmental: 30 rec 310 yds"},
  {name:"Will Mallory",pos:"TE",age:26,team:"MIA",proj:{PPR:75,Half:69,Standard:63},adp:44.5,ktcVal:400,note:"Depth TE"},
  {name:"Slade Bolden",pos:"TE",age:26,team:"NE",proj:{PPR:68,Half:62,Standard:56},adp:49.0,ktcVal:300,note:"Hybrid/depth"},
  // More notable QBs
  {name:"Aidan O'Connell",pos:"QB",age:27,team:"LV",proj:{PPR:232,Half:232,Standard:232},adp:25.8,ktcVal:800,note:"Backup starter: 2,800 yds 20 TD"},
  {name:"Mac Jones",pos:"QB",age:27,team:"SF",proj:{PPR:228,Half:228,Standard:228},adp:26.5,ktcVal:3017,note:"Backup: 2,600 yds 18 TD"},
  {name:"Davis Mills",pos:"QB",age:27,team:"HOU",proj:{PPR:218,Half:218,Standard:218},adp:28.5,ktcVal:300,note:"Handcuff backup"},
  {name:"Bailey Zappe",pos:"QB",age:26,team:"NE",proj:{PPR:222,Half:222,Standard:222},adp:27.8,ktcVal:400,note:"Backup to Maye"},
  {name:"Malik Willis",pos:"QB",age:27,team:"MIA",proj:{PPR:215,Half:215,Standard:215},adp:29.5,ktcVal:4512,note:"Athletic backup: 2,200 yds 500 rush"},
  {name:"Josh Dobbs",pos:"QB",age:30,team:"SF",proj:{PPR:208,Half:208,Standard:208},adp:31.2,ktcVal:400,note:"Handcuff: mobile backup"},
  {name:"Easton Stick",pos:"QB",age:29,team:"LAC",proj:{PPR:205,Half:205,Standard:205},adp:32.0,ktcVal:500,note:"Backup to Herbert"},
  {name:"Joe Flacco",pos:"QB",age:41,team:"IND",proj:{PPR:195,Half:195,Standard:195},adp:34.0,ktcVal:300,note:"Veteran backup"},
  {name:"Nathan Rourke",pos:"QB",age:28,team:"JAX",proj:{PPR:205,Half:205,Standard:205},adp:31.8,ktcVal:500,note:"Athletic backup"},
  {name:"Zach Wilson",pos:"QB",age:26,team:"DEN",proj:{PPR:215,Half:215,Standard:215},adp:29.8,ktcVal:300,note:"Reclamation backup"},
  {name:"Tyler Huntley",pos:"QB",age:28,team:"BAL",proj:{PPR:218,Half:218,Standard:218},adp:28.8,ktcVal:600,note:"Mobile handcuff to Jackson"},
  {name:"Brett Rypien",pos:"QB",age:29,team:"LAR",proj:{PPR:198,Half:198,Standard:198},adp:33.5,ktcVal:300,note:"Emergency backup"},
  // Wave 7 — IDP CBs, more DL/LB, QB/skill depth
  // IDP Wave 7 — CBs
  {name:"Jaire Alexander",pos:"DB",age:28,team:"GB",proj:{PPR:105,Half:105,Standard:105},adp:17.5,ktcVal:2800,note:"Elite CB: 52 tackles 4 INT when healthy"},
  {name:"Carlton Davis III",pos:"DB",age:28,team:"DET",proj:{PPR:98,Half:98,Standard:98},adp:20.5,ktcVal:2200,note:"CB1: 58 tackles 3 INT"},
  {name:"Christian Gonzalez",pos:"DB",age:24,team:"NE",proj:{PPR:102,Half:102,Standard:102},adp:19.0,ktcVal:4500,note:"Year 3 CB: 62 tackles 4 INT"},
  {name:"DJ Reed",pos:"DB",age:29,team:"NYJ",proj:{PPR:90,Half:90,Standard:90},adp:26.0,ktcVal:2200,note:"CB: 58 tackles 3 INT press coverage"},
  {name:"Cam Smith",pos:"DB",age:24,team:"MIA",proj:{PPR:85,Half:85,Standard:85},adp:29.5,ktcVal:2200,note:"Year 3 CB: 55 tackles 2 INT"},
  {name:"Chidobe Awuzie",pos:"DB",age:30,team:"CIN",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:1000,note:"Veteran CB: 60 tackles 2 INT"},
  {name:"Jaycee Horn",pos:"DB",age:27,team:"CAR",proj:{PPR:92,Half:92,Standard:92},adp:24.5,ktcVal:3200,note:"CB1 when healthy: 60 tackles 3 INT"},
  {name:"Kaiir Elam",pos:"DB",age:25,team:"BUF",proj:{PPR:78,Half:78,Standard:78},adp:34.5,ktcVal:2000,note:"CB Year 4: 52 tackles 2 INT"},
  {name:"Tyson Campbell",pos:"DB",age:27,team:"JAX",proj:{PPR:88,Half:88,Standard:88},adp:27.0,ktcVal:2200,note:"CB1: 60 tackles 3 INT"},
  {name:"Quinyon Mitchell",pos:"DB",age:23,team:"PHI",proj:{PPR:82,Half:82,Standard:82},adp:30.5,ktcVal:2000,note:"Year 2 CB: 55 tackles 3 INT"},
  {name:"Jeremy Chinn",pos:"DB",age:27,team:"CAR",proj:{PPR:92,Half:92,Standard:92},adp:24.0,ktcVal:1500,note:"S/LB hybrid: 85 tackles 2 sacks"},
  {name:"Jourdan Lewis",pos:"DB",age:30,team:"DAL",proj:{PPR:80,Half:80,Standard:80},adp:32.0,ktcVal:700,note:"Slot CB: 55 tackles 2 INT"},
  {name:"Damontae Kazee",pos:"DB",age:31,team:"PIT",proj:{PPR:78,Half:78,Standard:78},adp:33.5,ktcVal:800,note:"FS: 58 tackles 3 INT"},
  {name:"Darious Williams",pos:"DB",age:31,team:"LAR",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:700,note:"CB slot: 48 tackles 2 INT"},
  // IDP Wave 7 — more DL depth
  {name:"George Karlaftis",pos:"DL",age:25,team:"KC",proj:{PPR:95,Half:95,Standard:95},adp:22.0,ktcVal:3800,note:"EDGE: 9 sacks 14 TFL Year 4"},
  {name:"Tyree Wilson",pos:"DL",age:25,team:"LV",proj:{PPR:88,Half:88,Standard:88},adp:28.0,ktcVal:3000,note:"EDGE Year 3: 8 sacks breakout candidate"},
  {name:"Foley Fatukasi",pos:"DL",age:31,team:"JAX",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:1000,note:"IDL: 50 tackles 6 sacks"},
  {name:"Dalvin Tomlinson",pos:"DL",age:31,team:"MIN",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:800,note:"NT: 42 tackles 4 sacks"},
  {name:"Solomon Thomas",pos:"DL",age:29,team:"NYJ",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:700,note:"DT: 38 tackles 3 sacks"},
  {name:"Carl Granderson",pos:"DL",age:29,team:"NO",proj:{PPR:82,Half:82,Standard:82},adp:30.5,ktcVal:1200,note:"EDGE: 8 sacks rotational"},
  {name:"Sam Williams",pos:"DL",age:26,team:"DAL",proj:{PPR:78,Half:78,Standard:78},adp:33.0,ktcVal:1800,note:"EDGE: 7 sacks pass rush specialist"},
  {name:"Sheldon Rankins",pos:"DL",age:31,team:"HOU",proj:{PPR:70,Half:70,Standard:70},adp:40.0,ktcVal:800,note:"IDL veteran: 35 tackles 3 sacks"},
  {name:"Shelby Harris",pos:"DL",age:34,team:"SEA",proj:{PPR:68,Half:68,Standard:68},adp:42.0,ktcVal:600,note:"IDL depth: 30 tackles 2.5 sacks"},
  {name:"Aaron Donald",pos:"DL",age:33,team:"FA",proj:{PPR:85,Half:85,Standard:85},adp:30.0,ktcVal:1500,note:"If active: elite NT 10 sacks"},
  // IDP Wave 7 — more LB depth
  {name:"Leighton Vander Esch",pos:"LB",age:29,team:"FA",proj:{PPR:100,Half:100,Standard:100},adp:20.0,ktcVal:1000,note:"ILB: 105 tackles 2 INT when healthy"},
  {name:"Jack Campbell",pos:"LB",age:24,team:"DET",proj:{PPR:108,Half:108,Standard:108},adp:17.5,ktcVal:2800,note:"Year 3 ILB: 115 tackles 3 sacks"},
  {name:"Ivan Pace Jr.",pos:"LB",age:24,team:"MIN",proj:{PPR:98,Half:98,Standard:98},adp:21.5,ktcVal:2500,note:"Thumper: 100 tackles 3 sacks"},
  {name:"Mykal Walker",pos:"LB",age:29,team:"ATL",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:900,note:"Coverage: 72 tackles 2 INT"},
  // QB Wave 7
  {name:"Trey Lance",pos:"QB",age:26,team:"LAC",proj:{PPR:235,Half:235,Standard:235},adp:25.5,ktcVal:1200,note:"Mobile backup: upside arm"},
  {name:"Marcus Mariota",pos:"QB",age:32,team:"WAS",proj:{PPR:218,Half:218,Standard:218},adp:29.5,ktcVal:1555,note:"WAS backup QB"},
  {name:"Carson Wentz",pos:"QB",age:34,team:"MIN",proj:{PPR:225,Half:225,Standard:225},adp:28.0,ktcVal:400,note:"MIN backup QB"},
  // WR Wave 7
  {name:"Robbie Anderson",pos:"WR",age:31,team:"FA",proj:{PPR:88,Half:81,Standard:74},adp:44.5,ktcVal:200,note:"Veteran deep threat"},
  {name:"Brandin Cooks",pos:"WR",age:32,team:"BUF",proj:{PPR:102,Half:94,Standard:86},adp:38.5,ktcVal:400,note:"Speed receiver: 44 rec 520 yds"},
  {name:"Marquise Brown",pos:"WR",age:28,team:"PHI",proj:{PPR:112,Half:103,Standard:94},adp:35.5,ktcVal:1000,note:"Speed slot: 45 rec 540 yds"},
  {name:"Mecole Hardman Jr.",pos:"WR",age:28,team:"FA",proj:{PPR:95,Half:87,Standard:79},adp:42.0,ktcVal:300,note:"Speed: 38 rec 450 yds 4 TD"},
  // TE Wave 7
  {name:"Kyle Pitts",pos:"TE",age:25,team:"ATL",proj:{PPR:215,Half:198,Standard:181},adp:12.5,ktcVal:4481,note:"Elite athletic TE: 84 rec 920 yds 7 TD breakout"},
  {name:"Mike Gesicki",pos:"TE",age:30,team:"CIN",proj:{PPR:115,Half:105,Standard:95},adp:24.5,ktcVal:600,note:"Receiving TE: 46 rec 490 yds 4 TD"},
  // Wave 10 — 2025 NFL Draft rookies: skill + IDP
  // 2025 RB Rookies
  {name:"Trevor Etienne",pos:"RB",age:22,team:"CAR",proj:{PPR:182,Half:167,Standard:152},adp:15.0,ktcVal:2200,note:"2025 draft: pass-catching 800 rush 55 rec"},
  {name:"Nicholas Singleton",pos:"RB",age:22,team:"PHI",proj:{PPR:168,Half:154,Standard:140},adp:18.5,ktcVal:2500,note:"Power speed combo: 700 rush depth"},
  {name:"Ollie Gordon II",pos:"RB",age:22,team:"MIA",proj:{PPR:175,Half:161,Standard:147},adp:17.0,ktcVal:3238,note:"Big back: 800 rush 40 rec"},
  // 2025 QB Rookies
  {name:"Jaxson Dart",pos:"QB",age:23,team:"NYG",proj:{PPR:318,Half:318,Standard:318},adp:9.0,ktcVal:6614,note:"2025 1st round: 3,600 yds 27 TD elite arm dynasty asset"},
  {name:"Will Howard",pos:"QB",age:23,team:"PIT",proj:{PPR:272,Half:272,Standard:272},adp:19.5,ktcVal:2128,note:"2025 mid-round: 3,000 yds 22 TD"},
  {name:"Tyler Shough",pos:"QB",age:26,team:"NO",proj:{PPR:255,Half:255,Standard:255},adp:22.5,ktcVal:4648,note:"2025 draft: veteran passer 2,800 yds"},
  // 2025 WR Rookies
  {name:"Tez Johnson",pos:"WR",age:23,team:"PIT",proj:{PPR:128,Half:118,Standard:108},adp:34.0,ktcVal:2000,note:"2025 5th round Oregon: 50 rec 560 yds 4 TD slot"},
  {name:"Elic Ayomanor",pos:"WR",age:22,team:"TEN",proj:{PPR:168,Half:155,Standard:142},adp:23.5,ktcVal:2811,note:"2025 2nd round: 62 rec 740 yds 6 TD"},
  {name:"Dont'e Thornton Jr.",pos:"WR",age:23,team:"NE",proj:{PPR:138,Half:127,Standard:116},adp:32.5,ktcVal:1500,note:"Deep threat: 48 rec 620 yds"},
  // 2025 TE Rookies
  {name:"Elijah Arroyo",pos:"TE",age:22,team:"SEA",proj:{PPR:125,Half:114,Standard:103},adp:21.5,ktcVal:2800,note:"2025 2nd round: 48 rec 520 yds 5 TD"},
  {name:"Landen King",pos:"TE",age:22,team:"LV",proj:{PPR:108,Half:98,Standard:88},adp:27.5,ktcVal:1200,note:"2025 pick: 42 rec 460 yds 4 TD"},
  {name:"Jalen Berger",pos:"TE",age:23,team:"DEN",proj:{PPR:95,Half:86,Standard:77},adp:33.5,ktcVal:900,note:"Hybrid TE: 36 rec 380 yds"},
  // 2025 IDP Rookies — DL
  {name:"Abdul Carter",pos:"DL",age:22,team:"NYG",proj:{PPR:115,Half:115,Standard:115},adp:10.5,ktcVal:5500,note:"2025 top-5 pick: elite EDGE 12 sacks upside"},
  {name:"Mason Graham",pos:"DL",age:22,team:"CLE",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:4200,note:"2025 1st round IDL: 40 tackles 5 sacks"},
  {name:"James Pearce Jr.",pos:"DL",age:22,team:"KC",proj:{PPR:95,Half:95,Standard:95},adp:22.5,ktcVal:3800,note:"2025 1st round EDGE: 9 sacks explosive"},
  {name:"Walter Nolen",pos:"DL",age:22,team:"PHI",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:2500,note:"2025 IDL: 35 tackles 4 sacks"},
  {name:"Derrick Harmon",pos:"DL",age:23,team:"GB",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:2200,note:"2025 IDL: 32 tackles 3 sacks"},
  {name:"Will Campbell",pos:"DL",age:22,team:"NE",proj:{PPR:75,Half:75,Standard:75},adp:36.0,ktcVal:2000,note:"2025 OL/DL convert: developmental"},
  // Wave 25 — IDP DB/LB depth + safety tier
  // IDP Safety/DB Wave 25
  {name:"Jalen Pitre",pos:"DB",age:26,team:"HOU",proj:{PPR:92,Half:92,Standard:92},adp:24.5,ktcVal:2800,note:"S: 88 tackles 3 INT versatile"},
  {name:"Kareem Jackson",pos:"DB",age:36,team:"FA",proj:{PPR:62,Half:62,Standard:62},adp:46.5,ktcVal:400,note:"Veteran S: 55 tackles 2 INT if active"},
  {name:"Adrian Amos",pos:"DB",age:32,team:"FA",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:500,note:"Veteran FS: 60 tackles 3 INT"},
  {name:"Rodney McLeod",pos:"DB",age:35,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:54.0,ktcVal:300,note:"Veteran S depth"},
  {name:"Tycen Anderson",pos:"DB",age:26,team:"CLE",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:1500,note:"FS: 65 tackles 2 INT ascending"},
  {name:"Deionte Thompson",pos:"DB",age:27,team:"CAR",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:700,note:"S: 62 tackles 2 INT"},
  {name:"JL Skinner",pos:"DB",age:25,team:"DEN",proj:{PPR:75,Half:75,Standard:75},adp:36.5,ktcVal:1800,note:"S Year 3: 70 tackles 2 INT physical"},
  {name:"Quentin Lake",pos:"DB",age:27,team:"LAR",proj:{PPR:70,Half:70,Standard:70},adp:40.0,ktcVal:700,note:"S: 65 tackles 1 INT"},
  {name:"Elijah Riley",pos:"DB",age:27,team:"MIN",proj:{PPR:65,Half:65,Standard:65},adp:44.5,ktcVal:500,note:"S depth: 58 tackles 1 INT"},
  {name:"Keenan Isaac",pos:"DB",age:25,team:"JAX",proj:{PPR:62,Half:62,Standard:62},adp:46.0,ktcVal:800,note:"CB depth: 50 tackles 1 INT"},
  {name:"Josh Jobe",pos:"DB",age:26,team:"SEA",proj:{PPR:68,Half:68,Standard:68},adp:41.0,ktcVal:800,note:"CB: 55 tackles 2 INT slot"},
  {name:"Coby Bryant",pos:"DB",age:26,team:"CHI",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:800,note:"CB: 60 tackles 2 INT solid"},
  // IDP LB Wave 25
  {name:"Ja'Whaun Bentley",pos:"LB",age:30,team:"NE",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:1200,note:"ILB: 85 tackles 2 sacks veteran"},
  {name:"Sam Eguavoen",pos:"LB",age:32,team:"MIA",proj:{PPR:75,Half:75,Standard:75},adp:36.0,ktcVal:700,note:"LB: 70 tackles 2 INT coverage"},
  {name:"Mack Wilson Sr.",pos:"LB",age:27,team:"NE",proj:{PPR:90,Half:90,Standard:90},adp:22.0,ktcVal:700,note:"ILB: 75 tackles 2 sacks"},
  {name:"Damien Wilson",pos:"LB",age:33,team:"FA",proj:{PPR:65,Half:65,Standard:65},adp:44.5,ktcVal:400,note:"Veteran ILB: 65 tackles depth"},
  {name:"Devion Cunningham",pos:"LB",age:26,team:"ATL",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:700,note:"LB depth: 62 tackles 1 sack"},
  // Wave 26 — missing players + value corrections
  // RBs
  {name:"Phil Mafah",pos:"RB",age:22,team:"SF",proj:{PPR:195,Half:179,Standard:163},adp:14.5,ktcVal:3800,note:"SF starter: 1,000 rush 4 TD young workhorse"},
  {name:"Jarquez Hunter",pos:"RB",age:23,team:"ATL",proj:{PPR:178,Half:163,Standard:148},adp:18.5,ktcVal:2800,note:"ATL RB: 850 rush 45 rec 6 TD"},
  {name:"Kalel Mullings",pos:"RB",age:23,team:"MIA",proj:{PPR:165,Half:151,Standard:137},adp:22.0,ktcVal:2500,note:"MIA RB: power runner 800 rush 5 TD"},
  {name:"DJ Giddens",pos:"RB",age:23,team:"KC",proj:{PPR:158,Half:145,Standard:132},adp:24.5,ktcVal:2600,note:"KC RB: 750 rush 50 rec 5 TD"},
  {name:"LeQuint Allen",pos:"RB",age:23,team:"CHI",proj:{PPR:148,Half:135,Standard:122},adp:27.0,ktcVal:2000,note:"CHI RB: pass-catcher 600 rush 55 rec"},
  {name:"Rasheen Ali",pos:"RB",age:23,team:"BAL",proj:{PPR:152,Half:139,Standard:126},adp:26.0,ktcVal:2300,note:"BAL RB: 700 rush 40 rec 6 TD"},
  {name:"Jawhar Jordan",pos:"RB",age:23,team:"ARI",proj:{PPR:142,Half:130,Standard:118},adp:29.0,ktcVal:1800,note:"ARI RB: speed back 600 rush 45 rec"},
  {name:"Austin Ekeler",pos:"RB",age:30,team:"FA",proj:{PPR:148,Half:136,Standard:124},adp:28.5,ktcVal:800,note:"Veteran: pass-catcher 500 rush 60 rec"},
  {name:"Jeremy McNichols",pos:"RB",age:30,team:"FA",proj:{PPR:98,Half:90,Standard:82},adp:42.0,ktcVal:200,note:"RB depth: pass-catcher role"},
  // WRs
  {name:"Raheim Sanders",pos:"WR",age:23,team:"BUF",proj:{PPR:165,Half:151,Standard:137},adp:23.5,ktcVal:2500,note:"BUF WR: 62 rec 780 yds 6 TD big-body"},
  {name:"Jordan Whittington",pos:"WR",age:25,team:"LAR",proj:{PPR:158,Half:145,Standard:132},adp:26.0,ktcVal:1800,note:"LAR slot: 65 rec 720 yds 5 TD"},
  {name:"Lucky Jackson",pos:"WR",age:24,team:"CHI",proj:{PPR:155,Half:142,Standard:129},adp:27.0,ktcVal:2200,note:"CHI WR: 58 rec 750 yds 5 TD"},
  {name:"Devontez Walker",pos:"WR",age:23,team:"BAL",proj:{PPR:152,Half:139,Standard:126},adp:28.0,ktcVal:2000,note:"BAL WR: speed 55 rec 700 yds 5 TD"},
  {name:"Olamide Zaccheaus",pos:"WR",age:28,team:"ATL",proj:{PPR:132,Half:121,Standard:110},adp:34.0,ktcVal:700,note:"ATL slot: 50 rec 580 yds 4 TD"},
  {name:"Mitch Tinsley",pos:"WR",age:26,team:"IND",proj:{PPR:128,Half:117,Standard:106},adp:36.0,ktcVal:900,note:"IND WR: 48 rec 550 yds 4 TD"},
  {name:"Rondale Moore",pos:"WR",age:25,team:"ARI",proj:{PPR:135,Half:124,Standard:113},adp:33.0,ktcVal:900,note:"ARI speed: 55 rec 560 yds 4 TD"},
  {name:"Jaylin Lane",pos:"WR",age:23,team:"PHI",proj:{PPR:145,Half:133,Standard:121},adp:30.0,ktcVal:1800,note:"PHI WR: 50 rec 620 yds 5 TD upside"},
  {name:"Arian Smith",pos:"WR",age:23,team:"CHI",proj:{PPR:148,Half:136,Standard:124},adp:29.5,ktcVal:2100,note:"CHI speed WR: 52 rec 680 yds 5 TD"},
  {name:"Xavier Hutchinson",pos:"WR",age:25,team:"HOU",proj:{PPR:142,Half:130,Standard:118},adp:31.5,ktcVal:1500,note:"HOU slot: 58 rec 610 yds 4 TD"},
  {name:"Joshua Palmer",pos:"WR",age:27,team:"LAC",proj:{PPR:162,Half:149,Standard:136},adp:27.2,ktcVal:1600,note:"LAC WR: 60 rec 700 yds 5 TD"},
  // TEs
  {name:"Gunnar Helm",pos:"TE",age:24,team:"TEN",proj:{PPR:148,Half:136,Standard:124},adp:16.5,ktcVal:2800,note:"TEN TE1: 62 rec 680 yds 5 TD ascending"},
  {name:"Darnell Washington",pos:"TE",age:24,team:"PIT",proj:{PPR:138,Half:126,Standard:114},adp:19.0,ktcVal:3000,note:"PIT TE: 52 rec 590 yds 5 TD athletic"},
  {name:"Ja'Tavion Sanders",pos:"TE",age:23,team:"CAR",proj:{PPR:132,Half:121,Standard:110},adp:21.5,ktcVal:2200,note:"CAR TE: 48 rec 530 yds 4 TD"},
  {name:"Ben Sinnott",pos:"TE",age:23,team:"WAS",proj:{PPR:128,Half:117,Standard:106},adp:23.0,ktcVal:2500,note:"WAS TE: 46 rec 510 yds 4 TD"},
  {name:"Jake Tonges",pos:"TE",age:24,team:"BAL",proj:{PPR:118,Half:108,Standard:98},adp:27.0,ktcVal:1600,note:"BAL TE: 42 rec 460 yds 3 TD"},
  {name:"Erick All",pos:"TE",age:24,team:"CIN",proj:{PPR:122,Half:112,Standard:102},adp:25.5,ktcVal:1700,note:"CIN TE: 45 rec 490 yds 4 TD"},
  {name:"Brock Wright",pos:"TE",age:26,team:"DET",proj:{PPR:118,Half:108,Standard:98},adp:25.0,ktcVal:1800,note:"DET TE: 45 rec 480 yds 4 TD"},
  {name:"Darren Waller",pos:"TE",age:32,team:"NYG",proj:{PPR:112,Half:103,Standard:94},adp:32.0,ktcVal:700,note:"Veteran: 40 rec 440 yds 3 TD injury risk"},
  // QBs
  {name:"Riley Leonard",pos:"QB",age:23,team:"NO",proj:{PPR:265,Half:265,Standard:265},adp:22.5,ktcVal:2200,note:"NO QB: mobile 3,200 yds 22 TD dual-threat"},
  {name:"Joe Milton",pos:"QB",age:24,team:"NE",proj:{PPR:252,Half:252,Standard:252},adp:24.5,ktcVal:1500,note:"NE QB: big arm 3,000 yds 20 TD upside"},
  {name:"Quinn Ewers",pos:"QB",age:23,team:"MIA",proj:{PPR:248,Half:248,Standard:248},adp:25.5,ktcVal:1600,note:"MIA QB: 2,900 yds 19 TD development"},
  {name:"Max Brosmer",pos:"QB",age:23,team:"MIN",proj:{PPR:238,Half:238,Standard:238},adp:27.0,ktcVal:1400,note:"MIN QB: 2,700 yds 18 TD"},
  {name:"Brady Cook",pos:"QB",age:24,team:"STL",proj:{PPR:228,Half:228,Standard:228},adp:28.5,ktcVal:600,note:"Backup QB: 2,000 yds handcuff"},
  {name:"Jameis Winston",pos:"QB",age:33,team:"FA",proj:{PPR:232,Half:232,Standard:232},adp:28.0,ktcVal:350,note:"Veteran: high-upside gunslinger FA"},
  {name:"Tyrod Taylor",pos:"QB",age:36,team:"FA",proj:{PPR:195,Half:195,Standard:195},adp:35.0,ktcVal:100,note:"Veteran FA: spot starter only"},
  // IDP — DL
  {name:"Josh Sweat",pos:"DL",age:29,team:"PHI",proj:{PPR:105,Half:105,Standard:105},adp:18.0,ktcVal:1800,note:"PHI EDGE: 10 sacks 14 TFL"},
  {name:"Tuli Tuipulotu",pos:"DL",age:23,team:"LAC",proj:{PPR:98,Half:98,Standard:98},adp:20.5,ktcVal:3500,note:"LAC DL: 9 sacks 12 TFL explosive"},
  {name:"Alim McNeill",pos:"DL",age:25,team:"DET",proj:{PPR:88,Half:88,Standard:88},adp:26.0,ktcVal:2000,note:"DET IDL: 7 sacks 48 tackles interior"},
  // IDP — LB
  {name:"Nick Bolton",pos:"LB",age:26,team:"KC",proj:{PPR:135,Half:135,Standard:135},adp:11.5,ktcVal:2200,note:"KC ILB: 140 tackles 3 sacks elite volume"},
  {name:"Jalon Walker",pos:"LB",age:22,team:"ATL",proj:{PPR:105,Half:105,Standard:105},adp:17.5,ktcVal:3500,note:"ATL 2025 1st round LB: 10 sacks upside"},
  {name:"Daiyan Henley",pos:"LB",age:27,team:"TEN",proj:{PPR:118,Half:118,Standard:118},adp:14.5,ktcVal:1800,note:"TEN LB: 125 tackles 3 sacks solid"},
  {name:"Ernest Jones",pos:"LB",age:26,team:"TEN",proj:{PPR:122,Half:122,Standard:122},adp:13.5,ktcVal:2000,note:"TEN ILB: 130 tackles 2 sacks"},
  {name:"Andrew Van Ginkel",pos:"LB",age:30,team:"MIA",proj:{PPR:108,Half:108,Standard:108},adp:16.5,ktcVal:1200,note:"MIA LB: 8.5 sacks 15 TFL pass rush"},
  {name:"Cedric Gray",pos:"LB",age:23,team:"CAR",proj:{PPR:112,Half:112,Standard:112},adp:15.5,ktcVal:2000,note:"CAR LB: 120 tackles 3 sacks in Year 1"},
  {name:"SirVocea Dennis",pos:"LB",age:24,team:"PIT",proj:{PPR:102,Half:102,Standard:102},adp:18.5,ktcVal:1600,note:"PIT LB: 108 tackles 2 sacks"},
  {name:"Tyrice Knight",pos:"LB",age:24,team:"LAC",proj:{PPR:98,Half:98,Standard:98},adp:20.0,ktcVal:1500,note:"LAC LB: 102 tackles 2 sacks ascending"},
  // IDP — DB
  {name:"Kerby Joseph",pos:"DB",age:26,team:"DET",proj:{PPR:108,Half:108,Standard:108},adp:15.5,ktcVal:3200,note:"DET S: 4 INT 90 tackles ball-hawk elite"},
  {name:"Malaki Starks",pos:"DB",age:22,team:"GB",proj:{PPR:102,Half:102,Standard:102},adp:18.0,ktcVal:3500,note:"GB 2025 1st round S: elite athleticism"},
  {name:"Jamien Sherwood",pos:"DB",age:25,team:"NYJ",proj:{PPR:95,Half:95,Standard:95},adp:20.5,ktcVal:1800,note:"NYJ S: 88 tackles 3 INT"},
  {name:"Jordan Battle",pos:"DB",age:24,team:"CIN",proj:{PPR:92,Half:92,Standard:92},adp:22.5,ktcVal:1800,note:"CIN S: 85 tackles 2 INT ascending"},
  {name:"Taron Johnson",pos:"DB",age:29,team:"LV",proj:{PPR:95,Half:95,Standard:95},adp:21.5,ktcVal:1500,note:"LV CB: 3 INT 75 tackles slot cover"},
  {name:"Tykee Smith",pos:"DB",age:25,team:"PHI",proj:{PPR:88,Half:88,Standard:88},adp:25.0,ktcVal:1800,note:"PHI S: 82 tackles 2 INT versatile"},
  {name:"Alohi Gilman",pos:"DB",age:28,team:"LAC",proj:{PPR:88,Half:88,Standard:88},adp:26.0,ktcVal:1000,note:"LAC S: 80 tackles 2 INT solid starter"},
  // Wave 28 — additional missing + value corrections
  {name:"KeAndre Lambert-Smith",pos:"WR",age:24,team:"PHI",proj:{PPR:158,Half:145,Standard:132},adp:25.0,ktcVal:2800,note:"PHI WR: 58 rec 720 yds 5 TD speed"},
  // Wave 27 — additional missing players
  {name:"Nathan Carter",pos:"RB",age:23,team:"LV",proj:{PPR:165,Half:151,Standard:137},adp:22.5,ktcVal:2600,note:"LV RB: speed back 800 rush 50 rec 5 TD"},
  {name:"Sione Vaki",pos:"RB",age:23,team:"ATL",proj:{PPR:148,Half:135,Standard:122},adp:27.0,ktcVal:2200,note:"ATL RB: versatile 600 rush 55 rec 4 TD"},
  {name:"Chris Brooks",pos:"RB",age:27,team:"GB",proj:{PPR:132,Half:121,Standard:110},adp:32.0,ktcVal:1000,note:"GB RB: committee 550 rush 40 rec 4 TD"},
  {name:"Malik Davis",pos:"RB",age:26,team:"DAL",proj:{PPR:118,Half:108,Standard:98},adp:36.0,ktcVal:800,note:"DAL RB: depth 450 rush 35 rec 3 TD"},
  {name:"Frank Gore",pos:"RB",age:24,team:"BUF",proj:{PPR:138,Half:126,Standard:114},adp:29.5,ktcVal:1600,note:"BUF RB: powerful runner 650 rush 40 rec"},
  {name:"Zavier Scott",pos:"WR",age:23,team:"LAC",proj:{PPR:145,Half:133,Standard:121},adp:30.0,ktcVal:1900,note:"LAC WR: 52 rec 640 yds 5 TD speed"},
  // Wave 24 — missing starters + IDP depth sweep
  // Missing starters
  {name:"DeAndre Hopkins",pos:"WR",age:33,team:"BAL",proj:{PPR:188,Half:173,Standard:158},adp:22.5,ktcVal:500,note:"Veteran: 72 rec 840 yds 7 TD jump-ball"},
  {name:"Evan Engram",pos:"TE",age:31,team:"DEN",proj:{PPR:195,Half:179,Standard:163},adp:11.5,ktcVal:1902,note:"Volume: 88 rec 950 yds 7 TD PPR monster"},
  // More notable WRs Wave 24
  {name:"Gabe Davis",pos:"WR",age:28,team:"FA",proj:{PPR:148,Half:136,Standard:124},adp:29.0,ktcVal:800,note:"Big play: 52 rec 660 yds 6 TD"},
  {name:"Romeo Doubs",pos:"WR",age:26,team:"NE",proj:{PPR:162,Half:149,Standard:136},adp:25.5,ktcVal:3113,note:"GB slot: 65 rec 740 yds 6 TD"},
  // More RB Wave 24
  {name:"Sean Tucker",pos:"RB",age:25,team:"TB",proj:{PPR:135,Half:124,Standard:113},adp:29.5,ktcVal:3179,note:"TB committee: 520 rush 48 rec"},
  // More TE Wave 24
  {name:"Colby Parkinson",pos:"TE",age:27,team:"LAR",proj:{PPR:118,Half:108,Standard:98},adp:23.5,ktcVal:700,note:"LAR: 46 rec 490 yds 4 TD"},
  // Wave 23 — elite IDL, QB prospects, IDP 2025 additions
  // IDL elite tier Wave 23
  {name:"DeForest Buckner",pos:"DL",age:32,team:"IND",proj:{PPR:95,Half:95,Standard:95},adp:22.0,ktcVal:1800,note:"Elite IDL: 9 sacks 52 tackles anchor"},
  {name:"Vita Vea",pos:"DL",age:30,team:"TB",proj:{PPR:85,Half:85,Standard:85},adp:29.0,ktcVal:1500,note:"Elite NT: 7 sacks 50 tackles run stopper"},
  {name:"Arik Armstead",pos:"DL",age:32,team:"JAX",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:800,note:"Versatile IDL: 7 sacks 42 tackles"},
  {name:"Justin Madubuike",pos:"DL",age:28,team:"BAL",proj:{PPR:92,Half:92,Standard:92},adp:24.5,ktcVal:2200,note:"IDL: 8.5 sacks 48 tackles ascending"},
  {name:"Javon Kinlaw",pos:"DL",age:28,team:"NYJ",proj:{PPR:78,Half:78,Standard:78},adp:34.5,ktcVal:1000,note:"IDL: 7 sacks when healthy"},
  {name:"Quinton Jefferson",pos:"DL",age:32,team:"SEA",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:600,note:"IDL veteran: 6 sacks 38 tackles"},
  {name:"Kris Jenkins Jr.",pos:"DL",age:24,team:"BUF",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:2200,note:"Year 2 IDL: 7 sacks ascending"},
  {name:"Brandon Jordan",pos:"DL",age:26,team:"GB",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:1200,note:"EDGE: 6 sacks ascending"},
  // IDP 2025 additions
  {name:"Mike Green",pos:"DL",age:23,team:"SEA",proj:{PPR:95,Half:95,Standard:95},adp:22.5,ktcVal:3800,note:"2024 EDGE breakout: 11 sacks elite production"},
  {name:"Dani Dennis-Sutton",pos:"DL",age:22,team:"KC",proj:{PPR:82,Half:82,Standard:82},adp:30.5,ktcVal:2800,note:"2025 EDGE: 8 sacks Year 1 upside"},
  // QB prospects Wave 23
  {name:"Jalen Milroe",pos:"QB",age:23,team:"SEA",proj:{PPR:278,Half:278,Standard:278},adp:18.5,ktcVal:2512,note:"2025 pick: mobile 3,100 yds 24 TD 450 rush"},
  {name:"Will Rogers",pos:"QB",age:24,team:"WAS",proj:{PPR:242,Half:242,Standard:242},adp:24.5,ktcVal:700,note:"2025 pick: accurate 2,800 yds 20 TD"},
  {name:"Preston Stone",pos:"QB",age:24,team:"ARI",proj:{PPR:235,Half:235,Standard:235},adp:26.5,ktcVal:600,note:"2025: 2,700 yds 20 TD backup"},
  {name:"Michael Pratt",pos:"QB",age:24,team:"GB",proj:{PPR:228,Half:228,Standard:228},adp:27.5,ktcVal:500,note:"2025 pick: 2,600 yds 19 TD backup"},
  {name:"Kevin Jennings",pos:"QB",age:23,team:"CHI",proj:{PPR:222,Half:222,Standard:222},adp:28.5,ktcVal:800,note:"2025: mobile backup 2,500 yds"},
  {name:"Brendan Sorsby",pos:"QB",age:25,team:"CLE",proj:{PPR:198,Half:198,Standard:198},adp:34.5,ktcVal:400,note:"Deep backup: 2,200 yds"},
  // More notable current WRs Wave 23
  // More RB depth Wave 23
  {name:"Ryquell Armstead",pos:"RB",age:28,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:57.0,ktcVal:200,note:"Power back veteran depth"},
  {name:"Elijah Holyfield",pos:"RB",age:28,team:"FA",proj:{PPR:52,Half:47,Standard:42},adp:59.0,ktcVal:200,note:"Power back depth"},
  // Wave 22 — veteran IDL depth + CB/DB/LB fill-ins
  // IDL/DL veteran depth Wave 22
  {name:"Cameron Heyward",pos:"DL",age:36,team:"PIT",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:700,note:"Veteran IDL: 7 sacks 44 tackles if active"},
  {name:"Grover Stewart",pos:"DL",age:31,team:"IND",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:700,note:"NT: 38 tackles 3 sacks run stopper"},
  {name:"Teair Tart",pos:"DL",age:29,team:"TEN",proj:{PPR:65,Half:65,Standard:65},adp:44.5,ktcVal:600,note:"IDL: 32 tackles 3 sacks"},
  {name:"DeMarcus Walker",pos:"DL",age:31,team:"HOU",proj:{PPR:62,Half:62,Standard:62},adp:46.5,ktcVal:500,note:"EDGE depth: 5.5 sacks rotational"},
  {name:"Carl Nassib",pos:"DL",age:32,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:50.5,ktcVal:400,note:"Veteran EDGE depth if active"},
  {name:"Tyus Bowser",pos:"LB",age:30,team:"BAL",proj:{PPR:75,Half:75,Standard:75},adp:36.0,ktcVal:900,note:"EDGE/LB: 6 sacks 55 tackles"},
  {name:"Micah Kiser",pos:"LB",age:30,team:"LAR",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:600,note:"ILB: 70 tackles 1 sack"},
  {name:"Brandon Copeland",pos:"LB",age:34,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:51.0,ktcVal:200,note:"Veteran LB/EDGE depth"},
  // CB/DB depth Wave 22
  {name:"Jamel Dean",pos:"DB",age:29,team:"TB",proj:{PPR:78,Half:78,Standard:78},adp:34.5,ktcVal:1500,note:"CB: 58 tackles 3 INT press cover"},
  {name:"Bryce Hall",pos:"DB",age:28,team:"FA",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:800,note:"CB: 52 tackles 2 INT physical"},
  {name:"Carlton Davis",pos:"DB",age:28,team:"DET",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:2200,note:"CB1: 60 tackles 3 INT"},
  {name:"Nate Hairston",pos:"DB",age:31,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:54.5,ktcVal:400,note:"Veteran CB depth"},
  {name:"Jalen Thompson",pos:"DB",age:28,team:"ARI",proj:{PPR:75,Half:75,Standard:75},adp:36.5,ktcVal:1200,note:"S: 68 tackles 2 INT"},
  {name:"Chris Banjo",pos:"DB",age:34,team:"CAR",proj:{PPR:52,Half:52,Standard:52},adp:57.0,ktcVal:200,note:"Veteran ST/S depth"},
  // RB veteran depth Wave 22
  {name:"Trey Sermon",pos:"RB",age:26,team:"FA",proj:{PPR:68,Half:62,Standard:56},adp:51.5,ktcVal:300,note:"Powerful back: 280 rush depth"},
  {name:"Wayne Gallman",pos:"RB",age:31,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:56.5,ktcVal:200,note:"Veteran depth power"},
  {name:"Jordan Wilkins",pos:"RB",age:30,team:"FA",proj:{PPR:55,Half:50,Standard:45},adp:57.5,ktcVal:200,note:"Veteran RB depth"},
  {name:"Ito Smith",pos:"RB",age:30,team:"FA",proj:{PPR:52,Half:47,Standard:42},adp:58.5,ktcVal:200,note:"Receiving back depth FA"},
  {name:"Mekale McKay",pos:"WR",age:32,team:"FA",proj:{PPR:52,Half:48,Standard:44},adp:58.0,ktcVal:100,note:"Big WR veteran depth"},
  // Wave 21 — 2025 IDP class + deeper DB/WR depth
  // 2025 IDP class additions
  {name:"Shemar Turner",pos:"DL",age:23,team:"NO",proj:{PPR:78,Half:78,Standard:78},adp:34.5,ktcVal:1800,note:"2025 EDGE: 7 sacks ascending"},
  {name:"Darius Robinson",pos:"DL",age:24,team:"KC",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:2000,note:"Versatile DL: 7 sacks 40 tackles"},
  {name:"Maason Smith",pos:"DL",age:24,team:"JAX",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:1500,note:"IDL: 35 tackles 4 sacks developing"},
  {name:"Tyleik Williams",pos:"DL",age:24,team:"WAS",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:1400,note:"IDL: 32 tackles 3 sacks Year 3"},
  {name:"Jeremiah Trotter Jr.",pos:"LB",age:23,team:"PHI",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:2000,note:"Year 2 ILB: 85 tackles 2 sacks namesake"},
  {name:"Olumide Fashanu",pos:"DL",age:23,team:"NYJ",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:600,note:"OT convert: developmental DL"},
  {name:"Josh Simmons",pos:"DL",age:23,team:"CLE",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:500,note:"OL/DL developmental"},
  // IDP DB depth Wave 21
  {name:"Tarvarius Moore",pos:"DB",age:29,team:"SF",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:700,note:"FS: 60 tackles 2 INT versatile"},
  {name:"Jaquiski Tartt",pos:"DB",age:33,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:54.5,ktcVal:400,note:"Veteran S depth"},
  {name:"Johnathan Abram",pos:"DB",age:29,team:"FA",proj:{PPR:62,Half:62,Standard:62},adp:46.5,ktcVal:700,note:"Physical SS: 68 tackles 1 INT"},
  {name:"Josh Jones",pos:"DB",age:28,team:"HOU",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:800,note:"CB: 55 tackles 2 INT versatile"},
  {name:"Dane Jackson",pos:"DB",age:29,team:"BUF",proj:{PPR:65,Half:65,Standard:65},adp:44.5,ktcVal:700,note:"CB depth: 50 tackles 2 INT"},
  {name:"Andrew Adams",pos:"DB",age:33,team:"FA",proj:{PPR:52,Half:52,Standard:52},adp:57.0,ktcVal:300,note:"Veteran S depth"},
  {name:"Sheldrick Redwine",pos:"DB",age:29,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:50.5,ktcVal:500,note:"S depth: 55 tackles 1 INT"},
  // WR dynasty sleepers Wave 21
  {name:"Cody Latimer",pos:"WR",age:33,team:"FA",proj:{PPR:52,Half:48,Standard:44},adp:58.5,ktcVal:100,note:"Veteran depth WR"},
  {name:"R.J. Moore",pos:"WR",age:27,team:"CAR",proj:{PPR:68,Half:62,Standard:56},adp:51.5,ktcVal:300,note:"Slot depth: 26 rec 295 yds"},
  {name:"Jalen Camp",pos:"WR",age:26,team:"JAX",proj:{PPR:72,Half:66,Standard:60},adp:49.0,ktcVal:300,note:"Big WR: 28 rec 320 yds 3 TD"},
  {name:"Kendric Pryor",pos:"WR",age:27,team:"CIN",proj:{PPR:65,Half:60,Standard:55},adp:53.0,ktcVal:200,note:"Slot depth: 24 rec 270 yds"},
  {name:"Greg Ward",pos:"WR",age:31,team:"FA",proj:{PPR:60,Half:55,Standard:50},adp:56.5,ktcVal:150,note:"Veteran slot depth"},
  // Wave 20 — veteran IDP EDGE/DL/LB + 2025 RB Devin Neal
  // RB Wave 20
  {name:"Devin Neal",pos:"RB",age:23,team:"NO",proj:{PPR:158,Half:145,Standard:132},adp:22.0,ktcVal:2000,note:"2025 draft: 650 rush 48 rec explosive"},
  // Veteran EDGE/DL Wave 20 (active or recently active)
  {name:"Brandon Graham",pos:"DL",age:37,team:"PHI",proj:{PPR:68,Half:68,Standard:68},adp:42.0,ktcVal:400,note:"Veteran EDGE PHI: 5.5 sacks if active"},
  {name:"Takk McKinley",pos:"DL",age:30,team:"FA",proj:{PPR:65,Half:65,Standard:65},adp:44.5,ktcVal:500,note:"EDGE depth: 6 sacks upside if active"},
  {name:"Charles Harris",pos:"DL",age:30,team:"DET",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:900,note:"EDGE DET: 7 sacks rotational"},
  {name:"David Onyemata",pos:"DL",age:33,team:"ATL",proj:{PPR:70,Half:70,Standard:70},adp:40.5,ktcVal:700,note:"IDL: 35 tackles 4 sacks veteran"},
  {name:"Vinnie Curry",pos:"DL",age:36,team:"FA",proj:{PPR:52,Half:52,Standard:52},adp:57.0,ktcVal:200,note:"Veteran EDGE depth if active"},
  {name:"Linval Joseph",pos:"DL",age:36,team:"FA",proj:{PPR:48,Half:48,Standard:48},adp:60.0,ktcVal:200,note:"Veteran NT if active"},
  {name:"Brandon Williams",pos:"DL",age:35,team:"FA",proj:{PPR:52,Half:52,Standard:52},adp:57.5,ktcVal:200,note:"Veteran NT depth"},
  {name:"Whitney Mercilus",pos:"DL",age:34,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:55.5,ktcVal:200,note:"Veteran EDGE depth if active"},
  {name:"Jerry Hughes",pos:"DL",age:37,team:"FA",proj:{PPR:48,Half:48,Standard:48},adp:59.5,ktcVal:200,note:"Veteran EDGE depth"},
  // IDP LB Wave 20
  {name:"Akeem Davis-Gaither",pos:"LB",age:28,team:"CIN",proj:{PPR:85,Half:85,Standard:85},adp:29.5,ktcVal:900,note:"Coverage LB: 78 tackles 2 INT versatile"},
  {name:"Isaiah McDuffie",pos:"LB",age:27,team:"GB",proj:{PPR:80,Half:80,Standard:80},adp:32.5,ktcVal:700,note:"ST/LB: 72 tackles 2 sacks"},
  {name:"Jacob Phillips",pos:"LB",age:27,team:"CLE",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:800,note:"ILB: 75 tackles 2 sacks"},
  {name:"Divine Deablo",pos:"DB",age:27,team:"LV",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:1000,note:"S/LB hybrid: 75 tackles 2 sacks"},
  {name:"Alec Ogletree",pos:"LB",age:34,team:"FA",proj:{PPR:62,Half:62,Standard:62},adp:46.5,ktcVal:300,note:"Veteran ILB depth if active"},
  {name:"Curtis Bolton",pos:"LB",age:28,team:"GB",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:600,note:"ST/LB: 65 tackles 2 sacks"},
  {name:"Azur Kamara",pos:"LB",age:27,team:"CIN",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:500,note:"LB depth: 60 tackles 1 sack"},
  {name:"Shaquem Griffin",pos:"LB",age:30,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:50.0,ktcVal:300,note:"Veteran LB depth if active"},
  // IDP DB Wave 20
  {name:"Reshad Jones",pos:"DB",age:36,team:"FA",proj:{PPR:48,Half:48,Standard:48},adp:60.5,ktcVal:200,note:"Retired veteran reference"},
  {name:"Malcolm Jenkins",pos:"DB",age:37,team:"FA",proj:{PPR:45,Half:45,Standard:45},adp:62.0,ktcVal:200,note:"Retired veteran reference"},
  {name:"Patrick Chung",pos:"DB",age:37,team:"FA",proj:{PPR:42,Half:42,Standard:42},adp:63.0,ktcVal:200,note:"Retired veteran reference"},
  // More WR sleepers/dynasty Wave 20
  {name:"Kalif Raymond",pos:"WR",age:30,team:"DET",proj:{PPR:78,Half:72,Standard:66},adp:47.5,ktcVal:300,note:"Slot/returner: 32 rec 360 yds"},
  {name:"DeAndre Carter",pos:"WR",age:31,team:"LAC",proj:{PPR:72,Half:66,Standard:60},adp:49.5,ktcVal:200,note:"Slot depth: 28 rec 310 yds"},
  // Wave 19 — backup QBs, returners, dynasty sleepers
  // QB depth Wave 19
  {name:"Jake Browning",pos:"QB",age:29,team:"CIN",proj:{PPR:248,Half:248,Standard:248},adp:23.5,ktcVal:450,note:"CIN backup: 2,900 yds 21 TD handcuff"},
  {name:"Skylar Thompson",pos:"QB",age:28,team:"MIA",proj:{PPR:235,Half:235,Standard:235},adp:25.5,ktcVal:450,note:"MIA backup handcuff: 2,700 yds"},
  {name:"Clayton Tune",pos:"QB",age:26,team:"ARI",proj:{PPR:228,Half:228,Standard:228},adp:27.0,ktcVal:400,note:"ARI backup: 2,600 yds mobile"},
  {name:"Kyle Allen",pos:"QB",age:30,team:"WAS",proj:{PPR:222,Half:222,Standard:222},adp:28.5,ktcVal:300,note:"Veteran backup: 2,500 yds"},
  {name:"Nate Sudfeld",pos:"QB",age:32,team:"FA",proj:{PPR:185,Half:185,Standard:185},adp:38.0,ktcVal:150,note:"Veteran emergency depth"},
  {name:"PJ Walker",pos:"QB",age:30,team:"FA",proj:{PPR:195,Half:195,Standard:195},adp:35.0,ktcVal:200,note:"Veteran backup: mobile"},
  {name:"Shane Buechele",pos:"QB",age:28,team:"FA",proj:{PPR:182,Half:182,Standard:182},adp:39.5,ktcVal:200,note:"Veteran depth QB"},
  {name:"Holton Ahlers",pos:"QB",age:26,team:"NE",proj:{PPR:178,Half:178,Standard:178},adp:41.5,ktcVal:300,note:"Developmental backup"},
  // WR returner/special teams Wave 19
  {name:"Jamal Agnew",pos:"WR",age:30,team:"JAX",proj:{PPR:82,Half:75,Standard:68},adp:46.5,ktcVal:200,note:"Return specialist: 32 rec 360 yds ST value"},
  {name:"Kevontae Turpin",pos:"WR",age:27,team:"DAL",proj:{PPR:78,Half:72,Standard:66},adp:48.0,ktcVal:300,note:"Return/gadget: 28 rec 340 yds speed"},
  {name:"Jakeem Grant Jr.",pos:"WR",age:31,team:"CHI",proj:{PPR:75,Half:69,Standard:63},adp:49.0,ktcVal:200,note:"Elite returner: 30 rec 340 yds"},
  {name:"Daurice Fountain",pos:"WR",age:29,team:"KC",proj:{PPR:65,Half:60,Standard:55},adp:53.5,ktcVal:200,note:"Big WR depth: 24 rec 280 yds"},
  {name:"Dennis Houston",pos:"WR",age:28,team:"JAX",proj:{PPR:68,Half:62,Standard:56},adp:51.5,ktcVal:200,note:"Physical slot: 26 rec 295 yds"},
  {name:"Trishton Jackson",pos:"WR",age:26,team:"CHI",proj:{PPR:62,Half:57,Standard:52},adp:55.0,ktcVal:200,note:"Developmental WR depth"},
  {name:"Aaron Parker",pos:"WR",age:28,team:"DET",proj:{PPR:60,Half:55,Standard:50},adp:56.5,ktcVal:200,note:"Depth: 22 rec 245 yds"},
  {name:"Damon Hazelton",pos:"WR",age:28,team:"TB",proj:{PPR:58,Half:53,Standard:48},adp:57.5,ktcVal:200,note:"Physical receiver depth"},
  // RB returner/depth Wave 19
  {name:"Derrick Gore",pos:"RB",age:30,team:"KC",proj:{PPR:65,Half:60,Standard:55},adp:53.0,ktcVal:200,note:"ST/power: 220 rush depth"},
  {name:"Godwin Igwebuike",pos:"RB",age:29,team:"DET",proj:{PPR:62,Half:57,Standard:52},adp:55.0,ktcVal:300,note:"ST/RB: 180 rush depth"},
  {name:"Patrick Taylor Jr.",pos:"RB",age:27,team:"MIA",proj:{PPR:72,Half:66,Standard:60},adp:49.0,ktcVal:400,note:"Power back depth: 280 rush"},
  // TE depth Wave 19
  {name:"Matt Bushman",pos:"TE",age:29,team:"FA",proj:{PPR:52,Half:47,Standard:42},adp:58.0,ktcVal:150,note:"Blocking TE veteran depth"},
  {name:"Princeton Fant",pos:"TE",age:29,team:"NYJ",proj:{PPR:65,Half:59,Standard:53},adp:52.5,ktcVal:400,note:"TE2: 24 rec 250 yds"},
  {name:"Jordan Franks",pos:"TE",age:30,team:"FA",proj:{PPR:48,Half:43,Standard:38},adp:60.0,ktcVal:150,note:"Blocking TE depth"},
  // Wave 18 — deep WR/RB/TE/QB depth sweep
  // WR deep depth Wave 18
  {name:"Kendall Hinton",pos:"WR",age:28,team:"DEN",proj:{PPR:72,Half:66,Standard:60},adp:48.5,ktcVal:200,note:"Slot depth: 28 rec 310 yds"},
  {name:"Jalen Virgil",pos:"WR",age:27,team:"PIT",proj:{PPR:68,Half:62,Standard:56},adp:51.0,ktcVal:200,note:"Speed/return: 26 rec 290 yds"},
  {name:"Allen Robinson II",pos:"WR",age:32,team:"FA",proj:{PPR:78,Half:72,Standard:66},adp:46.0,ktcVal:200,note:"Veteran: 32 rec 380 yds if active"},
  {name:"Sammy Watkins",pos:"WR",age:32,team:"FA",proj:{PPR:65,Half:60,Standard:55},adp:52.5,ktcVal:150,note:"Veteran depth FA"},
  {name:"Breshad Perriman",pos:"WR",age:32,team:"FA",proj:{PPR:62,Half:57,Standard:52},adp:54.0,ktcVal:150,note:"Deep threat veteran FA"},
  {name:"Damiere Byrd",pos:"WR",age:31,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:56.5,ktcVal:150,note:"Speed receiver veteran depth"},
  {name:"Michael Woods II",pos:"WR",age:25,team:"MIA",proj:{PPR:72,Half:66,Standard:60},adp:48.0,ktcVal:400,note:"Physical: 28 rec 320 yds"},
  {name:"Jalen Nailor",pos:"WR",age:25,team:"MIN",proj:{PPR:85,Half:78,Standard:71},adp:44.0,ktcVal:700,note:"Deep threat: 34 rec 420 yds 4 TD"},
  {name:"Tylan Wallace",pos:"WR",age:27,team:"BAL",proj:{PPR:68,Half:62,Standard:56},adp:51.0,ktcVal:200,note:"Slot: 26 rec 290 yds ST value"},
  {name:"Dazz Newsome",pos:"WR",age:26,team:"CHI",proj:{PPR:65,Half:60,Standard:55},adp:53.0,ktcVal:200,note:"Slot depth: 25 rec 270 yds"},
  {name:"Jaquarii Roberson",pos:"WR",age:26,team:"CAR",proj:{PPR:68,Half:62,Standard:56},adp:50.5,ktcVal:200,note:"Physical: 26 rec 300 yds"},
  {name:"Tre Nixon",pos:"WR",age:26,team:"NE",proj:{PPR:62,Half:57,Standard:52},adp:54.5,ktcVal:200,note:"Speed receiver depth"},
  {name:"Taywan Taylor",pos:"WR",age:31,team:"FA",proj:{PPR:55,Half:50,Standard:45},adp:57.0,ktcVal:150,note:"Veteran speed depth"},
  // 2025 WR rookies Wave 18
  {name:"Pat Bryant",pos:"WR",age:23,team:"DEN",proj:{PPR:108,Half:99,Standard:90},adp:36.5,ktcVal:2929,note:"2025 pick: 42 rec 510 yds 4 TD"},
  {name:"Malachi Fields",pos:"WR",age:23,team:"CIN",proj:{PPR:95,Half:87,Standard:79},adp:41.0,ktcVal:800,note:"2025: big WR 38 rec 460 yds"},
  {name:"Tai Felton",pos:"WR",age:23,team:"MIN",proj:{PPR:102,Half:94,Standard:86},adp:38.5,ktcVal:1000,note:"2025 speed: 40 rec 490 yds 4 TD"},
  {name:"Dillon Gabriel",pos:"QB",age:24,team:"CLE",proj:{PPR:268,Half:268,Standard:268},adp:19.5,ktcVal:1698,note:"2025 pick: mobile 3,000 yds 22 TD"},
  // RB deep depth Wave 18
  {name:"Keshawn Vaughn",pos:"RB",age:28,team:"FA",proj:{PPR:68,Half:62,Standard:56},adp:51.5,ktcVal:300,note:"Veteran RB depth"},
  {name:"Master Teague",pos:"RB",age:25,team:"FA",proj:{PPR:62,Half:57,Standard:52},adp:54.5,ktcVal:300,note:"Power back depth"},
  {name:"Darrynton Evans",pos:"RB",age:28,team:"CHI",proj:{PPR:72,Half:66,Standard:60},adp:48.5,ktcVal:400,note:"Speed: 240 rush 38 rec"},
  {name:"Jashaun Corbin",pos:"RB",age:26,team:"SF",proj:{PPR:68,Half:62,Standard:56},adp:51.0,ktcVal:600,note:"SF depth behind CMC"},
  {name:"Gerrid Doaks",pos:"RB",age:27,team:"MIA",proj:{PPR:62,Half:57,Standard:52},adp:55.0,ktcVal:300,note:"Power back depth"},
  {name:"Ty Davis-Price",pos:"RB",age:25,team:"SF",proj:{PPR:72,Half:66,Standard:60},adp:49.0,ktcVal:600,note:"Power back depth"},
  {name:"Craig Reynolds",pos:"RB",age:29,team:"DET",proj:{PPR:88,Half:81,Standard:74},adp:43.5,ktcVal:400,note:"DET depth: 380 rush 38 rec"},
  // TE deep depth Wave 18
  {name:"Eric Ebron",pos:"TE",age:32,team:"FA",proj:{PPR:65,Half:59,Standard:53},adp:53.0,ktcVal:200,note:"Veteran receiving TE"},
  {name:"Brycen Hopkins",pos:"TE",age:28,team:"LAR",proj:{PPR:65,Half:59,Standard:53},adp:52.5,ktcVal:400,note:"TE2: 24 rec 250 yds"},
  // Wave 17 — 2025 LB rookies + veteran IDP depth
  // 2025 LB rookies
  {name:"Jihaad Campbell",pos:"LB",age:22,team:"PHI",proj:{PPR:98,Half:98,Standard:98},adp:21.5,ktcVal:3500,note:"2025 1st round: 95 tackles 3 sacks elite coverage"},
  {name:"Harold Perkins Jr.",pos:"LB",age:21,team:"FA",proj:{PPR:95,Half:95,Standard:95},adp:23.0,ktcVal:3800,note:"2025 pick: elite athleticism 90 tackles 4 sacks"},
  {name:"Payton Wilson",pos:"LB",age:24,team:"PIT",proj:{PPR:92,Half:92,Standard:92},adp:24.5,ktcVal:3500,note:"2025: speed LB 88 tackles 3 sacks"},
  {name:"Carson Schwesinger",pos:"LB",age:23,team:"CLE",proj:{PPR:162,Half:162,Standard:162},adp:7.2,ktcVal:4250,note:"2025 Rookie DPOY · #10 pick · 160+ tackles elite IDP LB1"},
  {name:"Nick Jackson",pos:"LB",age:23,team:"ATL",proj:{PPR:80,Half:80,Standard:80},adp:32.5,ktcVal:1000,note:"2025: ILB 75 tackles 2 sacks"},
  {name:"Danny Striggow",pos:"LB",age:24,team:"DEN",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:600,note:"2025 depth LB: 65 tackles 2 sacks"},
  // IDP DL additions Wave 17
  {name:"Christian Barmore",pos:"DL",age:26,team:"NE",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:2200,note:"IDL: 8 sacks 45 tackles disruptive"},
  {name:"Malik Reed",pos:"DL",age:29,team:"DEN",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:700,note:"EDGE rotational: 6 sacks"},
  {name:"Derek Rivers",pos:"DL",age:30,team:"FA",proj:{PPR:62,Half:62,Standard:62},adp:46.0,ktcVal:400,note:"EDGE veteran depth: 5 sacks if active"},
  // Veteran DB additions Wave 17
  {name:"Micah Hyde",pos:"DB",age:34,team:"FA",proj:{PPR:68,Half:68,Standard:68},adp:42.0,ktcVal:500,note:"Veteran FS: 55 tackles 3 INT if active"},
  {name:"Devin McCourty",pos:"DB",age:37,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:54.0,ktcVal:300,note:"Retired legend: historical reference"},
  {name:"Keanu Neal",pos:"DB",age:30,team:"TB",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:700,note:"SS: 70 tackles 2 sacks physical"},
  {name:"Landon Collins",pos:"DB",age:32,team:"FA",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:500,note:"SS veteran: 68 tackles 2 INT"},
  {name:"Ha Ha Clinton-Dix",pos:"DB",age:34,team:"FA",proj:{PPR:52,Half:52,Standard:52},adp:56.0,ktcVal:300,note:"Veteran FS depth"},
  // Wave 16 — IDP LB/DB depth + final fill-ins
  // IDP LB Wave 16
  {name:"Darius Leonard",pos:"LB",age:30,team:"FA",proj:{PPR:102,Half:102,Standard:102},adp:19.5,ktcVal:1200,note:"Shaq: 100 tackles 3 INT comeback"},
  {name:"John Johnson III",pos:"DB",age:30,team:"CLE",proj:{PPR:85,Half:85,Standard:85},adp:29.5,ktcVal:800,note:"S: 72 tackles 3 INT veteran"},
  {name:"Dominique Hampton",pos:"DB",age:24,team:"WAS",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:1200,note:"S Year 3: 65 tackles 2 INT"},
  {name:"Markquese Bell",pos:"DB",age:25,team:"DAL",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:1000,note:"S: 62 tackles 2 INT physical"},
  {name:"Jammie Robinson",pos:"DB",age:25,team:"CAR",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:800,note:"S: 58 tackles 2 INT developing"},
  {name:"Ronnie Perkins",pos:"DL",age:25,team:"GB",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:1200,note:"EDGE rotational: 6 sacks"},
  {name:"Neville Hewitt",pos:"LB",age:33,team:"FA",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:400,note:"Veteran ILB: 70 tackles depth"},
  {name:"Charles Snowden",pos:"LB",age:27,team:"WAS",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:700,note:"EDGE/LB hybrid: 5 sacks 55 tackles"},
  {name:"Dylan Moses",pos:"LB",age:26,team:"BAL",proj:{PPR:70,Half:70,Standard:70},adp:40.0,ktcVal:800,note:"ILB: 65 tackles 2 sacks"},
  {name:"Elijah Sullivan",pos:"LB",age:26,team:"ARI",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:500,note:"LB depth: 60 tackles special teams"},
  // Wave 15 — 2025 IDP DL rookies + CB/DB depth
  // 2025 DL rookies
  {name:"Kenneth Grant",pos:"DL",age:22,team:"MIA",proj:{PPR:82,Half:82,Standard:82},adp:29.5,ktcVal:2800,note:"2025 1st round NT: 38 tackles 4 sacks disruptive"},
  {name:"TJ Sanders",pos:"DL",age:22,team:"HOU",proj:{PPR:78,Half:78,Standard:78},adp:33.0,ktcVal:2200,note:"2025 IDL: 35 tackles 4 sacks interior"},
  {name:"Shemar Stewart",pos:"DL",age:22,team:"DEN",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:2800,note:"2025 EDGE prospect: 32 tackles 5 sacks upside"},
  {name:"Princely Umanmielen",pos:"DL",age:23,team:"ATL",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:2000,note:"EDGE: 7 sacks 2024 breakout"},
  {name:"Landon Jackson",pos:"DL",age:23,team:"CHI",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:1800,note:"EDGE 2025: 28 tackles 4 sacks"},
  {name:"Darius Alexander",pos:"DL",age:22,team:"CLE",proj:{PPR:65,Half:65,Standard:65},adp:43.5,ktcVal:1800,note:"2025 IDL: 28 tackles 3 sacks"},
  // IDP DB depth Wave 15 — CB prospects
  {name:"Azeez Al-Shaair",pos:"LB",age:28,team:"HOU",proj:{PPR:105,Half:105,Standard:105},adp:18.0,ktcVal:2200,note:"ILB: 108 tackles 3 sacks versatile"},
  {name:"Tre Norwood",pos:"DB",age:27,team:"PIT",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:800,note:"S/CB: 65 tackles 2 INT versatile"},
  {name:"Ifeatu Melifonwu",pos:"DB",age:27,team:"BUF",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:900,note:"CB: 55 tackles 2 INT physical"},
  {name:"Israel Mukuamu",pos:"DB",age:27,team:"FA",proj:{PPR:62,Half:62,Standard:62},adp:45.0,ktcVal:500,note:"S depth: 52 tackles 2 INT"},
  {name:"Troy Pride Jr.",pos:"DB",age:28,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:49.0,ktcVal:400,note:"CB depth: 45 tackles 1 INT"},
  {name:"Kary Vincent Jr.",pos:"DB",age:27,team:"DEN",proj:{PPR:65,Half:65,Standard:65},adp:43.5,ktcVal:700,note:"CB: 52 tackles 2 INT slot"},
  {name:"Kendall Sheffield",pos:"DB",age:29,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:49.5,ktcVal:500,note:"CB: 48 tackles 2 INT speed"},
  {name:"Trill Williams",pos:"DB",age:27,team:"MIN",proj:{PPR:68,Half:68,Standard:68},adp:41.0,ktcVal:900,note:"CB: 55 tackles 2 INT physical"},
  {name:"Sevyn Banks",pos:"DB",age:26,team:"CLE",proj:{PPR:65,Half:65,Standard:65},adp:43.5,ktcVal:800,note:"CB: 52 tackles 2 INT developing"},
  {name:"Robert Rochell",pos:"DB",age:28,team:"LAC",proj:{PPR:62,Half:62,Standard:62},adp:46.0,ktcVal:600,note:"CB depth: 48 tackles 1 INT"},
  {name:"Darius Phillips",pos:"DB",age:31,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:52.0,ktcVal:400,note:"Veteran CB depth"},
  {name:"Josh Blackwell",pos:"DB",age:26,team:"DAL",proj:{PPR:58,Half:58,Standard:58},adp:49.0,ktcVal:500,note:"CB: 45 tackles 1 INT special teams"},
  {name:"Paul Taulelei",pos:"TE",age:27,team:"BUF",proj:{PPR:55,Half:50,Standard:45},adp:55.0,ktcVal:400,note:"Blocking TE: 18 rec 180 yds"},
  // Wave 14 — Cam Skattebo + 2025 RB class + WR/TE/IDP depth
  // 2025 RB class additions
  {name:"Cam Skattebo",pos:"RB",age:23,team:"NYG",proj:{PPR:252,Half:232,Standard:212},adp:6.8,ktcVal:4607,note:"2025 1st round: workhorse feature back 1,250 rush 55 rec bruising"},
  {name:"Donovan Edwards",pos:"RB",age:23,team:"MIA",proj:{PPR:178,Half:163,Standard:148},adp:16.5,ktcVal:2200,note:"DET handcuff: 700 rush 50 rec speed"},
  {name:"Bhayshul Tuten",pos:"RB",age:23,team:"JAX",proj:{PPR:162,Half:149,Standard:136},adp:20.0,ktcVal:3615,note:"Explosive back: 650 rush 42 rec"},
  {name:"Brashard Smith",pos:"RB",age:23,team:"KC",proj:{PPR:155,Half:142,Standard:129},adp:22.5,ktcVal:1800,note:"KC depth: 580 rush 48 rec"},
  {name:"Woody Marks",pos:"RB",age:24,team:"HOU",proj:{PPR:148,Half:136,Standard:124},adp:24.5,ktcVal:2858,note:"Physical runner: 600 rush 4 TD"},
  {name:"Jaydon Blue",pos:"RB",age:22,team:"DAL",proj:{PPR:142,Half:130,Standard:118},adp:26.5,ktcVal:1800,note:"Speed back: 520 rush 50 rec"},
  {name:"Jacory Croskey-Merritt",pos:"RB",age:23,team:"WAS",proj:{PPR:135,Half:124,Standard:113},adp:28.5,ktcVal:2787,note:"Elusive: 500 rush 45 rec"},
  {name:"Elijah Young",pos:"RB",age:23,team:"NO",proj:{PPR:128,Half:117,Standard:106},adp:31.0,ktcVal:1500,note:"Versatile: 480 rush 45 rec"},
  {name:"Royce Freeman",pos:"RB",age:29,team:"FA",proj:{PPR:88,Half:81,Standard:74},adp:44.0,ktcVal:300,note:"Veteran power back: 350 rush"},
  // WR 2025 class + missing current
  {name:"Jalen Royals",pos:"WR",age:23,team:"ARI",proj:{PPR:138,Half:127,Standard:116},adp:30.5,ktcVal:2000,note:"2025 pick: 55 rec 640 yds 5 TD"},
  {name:"Barion Brown",pos:"WR",age:22,team:"BUF",proj:{PPR:125,Half:115,Standard:105},adp:33.5,ktcVal:1500,note:"Speed: 48 rec 580 yds return threat"},
  {name:"Ainias Smith",pos:"WR",age:24,team:"PHI",proj:{PPR:112,Half:103,Standard:94},adp:36.5,ktcVal:700,note:"Slot: 44 rec 510 yds 4 TD"},
  {name:"Dorian Singer",pos:"WR",age:24,team:"TB",proj:{PPR:108,Half:99,Standard:90},adp:37.5,ktcVal:600,note:"Route runner: 42 rec 490 yds"},
  {name:"Dontay Demus Jr.",pos:"WR",age:24,team:"BAL",proj:{PPR:95,Half:87,Standard:79},adp:41.5,ktcVal:500,note:"Big WR: 38 rec 440 yds 4 TD"},
  {name:"Keelan Cole",pos:"WR",age:31,team:"FA",proj:{PPR:82,Half:75,Standard:68},adp:47.0,ktcVal:150,note:"Veteran depth: 32 rec 380 yds"},
  {name:"Corey Davis",pos:"WR",age:30,team:"FA",proj:{PPR:78,Half:72,Standard:66},adp:48.5,ktcVal:200,note:"Veteran: 30 rec 350 yds if active"},
  {name:"Anthony Miller",pos:"WR",age:30,team:"FA",proj:{PPR:72,Half:66,Standard:60},adp:50.0,ktcVal:200,note:"Veteran slot depth"},
  {name:"Penny Hart",pos:"WR",age:29,team:"SEA",proj:{PPR:68,Half:62,Standard:56},adp:51.5,ktcVal:200,note:"Slot depth: 28 rec 320 yds"},
  // TE depth Wave 14
  {name:"Ko Kieft",pos:"TE",age:27,team:"TB",proj:{PPR:68,Half:62,Standard:56},adp:50.5,ktcVal:400,note:"Blocking TE: 22 rec 220 yds"},
  {name:"Jack Stoll",pos:"TE",age:27,team:"PHI",proj:{PPR:72,Half:66,Standard:60},adp:48.5,ktcVal:400,note:"TE2: 28 rec 280 yds"},
  {name:"Antony Auclair",pos:"TE",age:32,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:54.0,ktcVal:150,note:"Veteran blocking TE"},
  // IDP DL Wave 14
  {name:"Dre'Mont Jones",pos:"DL",age:28,team:"SEA",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:1200,note:"IDL: 7 sacks 42 tackles versatile"},
  {name:"Maliek Collins",pos:"DL",age:30,team:"HOU",proj:{PPR:72,Half:72,Standard:72},adp:37.0,ktcVal:800,note:"NT: 38 tackles 3 sacks"},
  {name:"Rashad Weaver",pos:"DL",age:29,team:"PIT",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:1000,note:"EDGE: 7 sacks rotational"},
  {name:"Trysten Hill",pos:"DL",age:28,team:"DAL",proj:{PPR:65,Half:65,Standard:65},adp:43.0,ktcVal:600,note:"IDL: 30 tackles 2 sacks"},
  {name:"Darius Philon",pos:"DL",age:30,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:49.0,ktcVal:400,note:"Veteran IDL depth"},
  {name:"Corey Peters",pos:"DL",age:37,team:"FA",proj:{PPR:45,Half:45,Standard:45},adp:58.0,ktcVal:200,note:"Veteran NT depth if active"},
  // IDP LB Wave 14
  {name:"Davion Taylor",pos:"LB",age:28,team:"PHI",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:800,note:"Speed LB: 72 tackles 2 sacks"},
  // IDP DB Wave 14
  {name:"Juan Thornhill",pos:"DB",age:30,team:"CLE",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:1000,note:"S: 68 tackles 3 INT"},
  {name:"Duron Harmon",pos:"DB",age:35,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:53.0,ktcVal:300,note:"Veteran FS depth: 45 tackles 2 INT"},
  {name:"Jeremy Reaves",pos:"DB",age:29,team:"WAS",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:700,note:"S: 68 tackles 1 INT physical"},
  {name:"Tae Hayes",pos:"DB",age:26,team:"TEN",proj:{PPR:68,Half:68,Standard:68},adp:41.0,ktcVal:800,note:"CB: 52 tackles 2 INT ascending"},
  // Wave 13 — final depth: WR/RB/TE/IDP fill-ins
  // WR depth Wave 13 (pure depth/special teams contributors)
  {name:"Trent Taylor",pos:"WR",age:30,team:"NO",proj:{PPR:72,Half:66,Standard:60},adp:48.0,ktcVal:200,note:"Slot depth: 28 rec 290 yds"},
  {name:"Andy Isabella",pos:"WR",age:29,team:"FA",proj:{PPR:65,Half:60,Standard:55},adp:52.0,ktcVal:150,note:"Speed depth WR: FA"},
  {name:"River Cracraft",pos:"WR",age:32,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:55.0,ktcVal:100,note:"Veteran depth/ST"},
  {name:"Alex Erickson",pos:"WR",age:32,team:"FA",proj:{PPR:55,Half:50,Standard:45},adp:56.0,ktcVal:100,note:"Veteran returner depth"},
  {name:"Josh Malone",pos:"WR",age:30,team:"FA",proj:{PPR:52,Half:48,Standard:44},adp:57.0,ktcVal:150,note:"Veteran depth WR"},
  {name:"Cody Thompson",pos:"WR",age:29,team:"FA",proj:{PPR:50,Half:46,Standard:42},adp:58.0,ktcVal:150,note:"Depth receiver"},
  {name:"Kawaan Baker",pos:"WR",age:27,team:"NO",proj:{PPR:68,Half:62,Standard:56},adp:50.0,ktcVal:200,note:"Physical receiver depth"},
  {name:"Josh Doctson",pos:"WR",age:31,team:"FA",proj:{PPR:48,Half:44,Standard:40},adp:60.0,ktcVal:100,note:"Veteran FA depth"},
  {name:"Trenton Irwin",pos:"WR",age:29,team:"CIN",proj:{PPR:72,Half:66,Standard:60},adp:47.5,ktcVal:200,note:"Slot depth: 30 rec 320 yds"},
  {name:"Montrell Washington",pos:"WR",age:25,team:"DEN",proj:{PPR:78,Half:72,Standard:66},adp:45.5,ktcVal:400,note:"Return specialist: 32 rec 350 yds"},
  {name:"Justin Watson",pos:"WR",age:30,team:"KC",proj:{PPR:68,Half:62,Standard:56},adp:50.5,ktcVal:200,note:"Veteran role: 26 rec 310 yds"},
  // RB depth Wave 13
  {name:"Ty Johnson",pos:"RB",age:28,team:"NYJ",proj:{PPR:92,Half:84,Standard:76},adp:43.0,ktcVal:400,note:"Receiving back: 260 rush 50 rec"},
  {name:"Anthony McFarland Jr.",pos:"RB",age:26,team:"PIT",proj:{PPR:82,Half:75,Standard:68},adp:46.5,ktcVal:600,note:"Speed back depth"},
  {name:"Reggie Bonnafon",pos:"RB",age:30,team:"FA",proj:{PPR:65,Half:60,Standard:55},adp:52.5,ktcVal:200,note:"Veteran depth RB"},
  {name:"Kenyan Drake",pos:"RB",age:32,team:"FA",proj:{PPR:72,Half:66,Standard:60},adp:48.5,ktcVal:150,note:"Veteran: 280 rush 42 rec if active"},
  {name:"Malcolm Brown",pos:"RB",age:31,team:"FA",proj:{PPR:58,Half:53,Standard:48},adp:55.0,ktcVal:200,note:"Power back depth FA"},
  // TE depth Wave 13
  {name:"Blake Bell",pos:"TE",age:33,team:"FA",proj:{PPR:68,Half:62,Standard:56},adp:50.0,ktcVal:150,note:"Blocking TE veteran"},
  {name:"Stephen Sullivan",pos:"TE",age:27,team:"CAR",proj:{PPR:72,Half:66,Standard:60},adp:47.0,ktcVal:400,note:"TE2: 28 rec 290 yds"},
  {name:"Cade McDonald",pos:"TE",age:24,team:"NE",proj:{PPR:82,Half:75,Standard:68},adp:43.5,ktcVal:700,note:"Developing TE: 32 rec 340 yds"},
  // IDP DL depth Wave 13
  {name:"Clelin Ferrell",pos:"DL",age:28,team:"LV",proj:{PPR:68,Half:68,Standard:68},adp:41.0,ktcVal:700,note:"EDGE depth: 5 sacks rotational"},
  {name:"Michael Hoecht",pos:"DL",age:28,team:"LAR",proj:{PPR:72,Half:72,Standard:72},adp:37.5,ktcVal:900,note:"IDL: 30 tackles 3 sacks"},
  {name:"Taven Bryan",pos:"DL",age:29,team:"HOU",proj:{PPR:65,Half:65,Standard:65},adp:43.0,ktcVal:700,note:"IDL depth: 28 tackles 2 sacks"},
  {name:"Vincent Taylor",pos:"DL",age:30,team:"FA",proj:{PPR:58,Half:58,Standard:58},adp:48.0,ktcVal:400,note:"IDL veteran depth"},
  {name:"Takkarist McKinley",pos:"DL",age:30,team:"FA",proj:{PPR:60,Half:60,Standard:60},adp:46.5,ktcVal:500,note:"EDGE if active: 5 sacks upside"},
  // IDP LB depth Wave 13
  {name:"Joel Heath",pos:"LB",age:31,team:"HOU",proj:{PPR:70,Half:70,Standard:70},adp:39.5,ktcVal:500,note:"LB depth: 62 tackles 1 sack"},
  {name:"Jonas Griffith",pos:"LB",age:28,team:"SF",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:800,note:"ILB: 70 tackles 2 sacks"},
  {name:"Dylan Cole",pos:"LB",age:30,team:"HOU",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:500,note:"ST/LB: 60 tackles 1 sack"},
  // IDP DB depth Wave 13
  {name:"Juston Burris",pos:"DB",age:32,team:"CAR",proj:{PPR:68,Half:68,Standard:68},adp:42.0,ktcVal:600,note:"S: 55 tackles 2 INT veteran"},
  {name:"Steven Nelson",pos:"DB",age:33,team:"FA",proj:{PPR:60,Half:60,Standard:60},adp:47.0,ktcVal:500,note:"CB veteran: 45 tackles 2 INT"},
  {name:"Lonnie Johnson Jr.",pos:"DB",age:29,team:"KC",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:800,note:"CB/S: 55 tackles 2 INT"},
  {name:"Andrew Sendejo",pos:"DB",age:37,team:"FA",proj:{PPR:45,Half:45,Standard:45},adp:58.0,ktcVal:200,note:"Veteran depth S"},
  {name:"Jalen Elliott",pos:"DB",age:27,team:"NO",proj:{PPR:68,Half:68,Standard:68},adp:41.5,ktcVal:700,note:"S: 58 tackles 1 INT depth"},
  // Wave 12 — IDP DL/LB/DB depth + WR/TE/RB stragglers
  // IDP DL Wave 12
  {name:"K'Lavon Chaisson",pos:"DL",age:26,team:"LV",proj:{PPR:72,Half:72,Standard:72},adp:37.5,ktcVal:1000,note:"EDGE: 6 sacks rotational"},
  {name:"Boogie Basham",pos:"DL",age:27,team:"BUF",proj:{PPR:68,Half:68,Standard:68},adp:41.0,ktcVal:800,note:"EDGE rotational: 5 sacks"},
  {name:"Al Woods",pos:"DL",age:37,team:"FA",proj:{PPR:55,Half:55,Standard:55},adp:50.0,ktcVal:200,note:"Veteran NT depth: 28 tackles"},
  {name:"Isaiah Buggs",pos:"DL",age:28,team:"DET",proj:{PPR:62,Half:62,Standard:62},adp:44.0,ktcVal:700,note:"IDL rotational: 28 tackles 2 sacks"},
  // IDP LB Wave 12
  {name:"Jayon Brown",pos:"LB",age:30,team:"FA",proj:{PPR:82,Half:82,Standard:82},adp:31.5,ktcVal:800,note:"Veteran coverage LB: 78 tackles 2 INT"},
  {name:"Reggie Ragland",pos:"LB",age:32,team:"FA",proj:{PPR:70,Half:70,Standard:70},adp:40.0,ktcVal:400,note:"Veteran ILB depth: 68 tackles"},
  {name:"Krys Barnes",pos:"LB",age:27,team:"GB",proj:{PPR:85,Half:85,Standard:85},adp:29.5,ktcVal:1200,note:"ILB: 82 tackles 2 sacks starting"},
  {name:"Ty Summers",pos:"LB",age:29,team:"GB",proj:{PPR:72,Half:72,Standard:72},adp:38.5,ktcVal:500,note:"LB depth: 65 tackles special teams"},
  {name:"Dakota Allen",pos:"LB",age:28,team:"LAR",proj:{PPR:78,Half:78,Standard:78},adp:34.0,ktcVal:700,note:"LB: 75 tackles depth role"},
  // IDP DB Wave 12
  {name:"Tashaun Gipson",pos:"DB",age:35,team:"FA",proj:{PPR:65,Half:65,Standard:65},adp:44.0,ktcVal:300,note:"Veteran FS: 50 tackles 2 INT"},
  {name:"Tre Flowers",pos:"DB",age:29,team:"CIN",proj:{PPR:70,Half:70,Standard:70},adp:39.5,ktcVal:700,note:"CB depth: 52 tackles 2 INT"},
  {name:"Adrian Phillips",pos:"DB",age:33,team:"NE",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:800,note:"SS/LB hybrid: 72 tackles 2 sacks"},
  {name:"Marcus Epps",pos:"DB",age:29,team:"ARI",proj:{PPR:80,Half:80,Standard:80},adp:32.5,ktcVal:1000,note:"FS: 72 tackles 2 INT"},
  {name:"Dean Marlowe",pos:"DB",age:33,team:"DET",proj:{PPR:62,Half:62,Standard:62},adp:45.0,ktcVal:400,note:"S depth: 55 tackles special teams"},
  // WR depth Wave 12
  {name:"Isaiah Bond",pos:"WR",age:22,team:"CLE",proj:{PPR:102,Half:94,Standard:86},adp:38.5,ktcVal:1500,note:"Speed: 40 rec 480 yds 4 TD"},
  {name:"Malik Washington",pos:"WR",age:25,team:"DEN",proj:{PPR:88,Half:81,Standard:74},adp:44.0,ktcVal:400,note:"Slot depth: 36 rec 400 yds"},
  {name:"Devin Duvernay",pos:"WR",age:28,team:"JAX",proj:{PPR:95,Half:87,Standard:79},adp:41.5,ktcVal:300,note:"Returner/receiver: 38 rec 420 yds"},
  {name:"Bub Means",pos:"WR",age:24,team:"NO",proj:{PPR:92,Half:84,Standard:76},adp:43.0,ktcVal:700,note:"2024 gem: 38 rec 450 yds 4 TD"},
  // RB depth Wave 12
  {name:"Cody Schrader",pos:"RB",age:25,team:"LAR",proj:{PPR:112,Half:103,Standard:94},adp:34.5,ktcVal:900,note:"UDFA gem: 480 rush 40 rec"},
  // TE depth Wave 12
  {name:"Devin Asiasi",pos:"TE",age:28,team:"NYG",proj:{PPR:85,Half:77,Standard:69},adp:42.0,ktcVal:600,note:"Athletic TE: 34 rec 360 yds"},
  // Wave 11 — final depth: QB/RB/IDP stragglers
  // QB depth Wave 11
  {name:"Mitchell Trubisky",pos:"QB",age:31,team:"BUF",proj:{PPR:225,Half:225,Standard:225},adp:27.5,ktcVal:250,note:"Backup veteran: mobile 2,600 yds"},
  {name:"Kyle Trask",pos:"QB",age:27,team:"TB",proj:{PPR:215,Half:215,Standard:215},adp:29.5,ktcVal:400,note:"Backup: 2,400 yds 18 TD"},
  {name:"Case Keenum",pos:"QB",age:37,team:"FA",proj:{PPR:195,Half:195,Standard:195},adp:35.0,ktcVal:150,note:"Veteran depth: 2,200 yds"},
  {name:"Davis Webb",pos:"QB",age:30,team:"BUF",proj:{PPR:188,Half:188,Standard:188},adp:37.5,ktcVal:300,note:"BUF backup handcuff to Allen"},
  {name:"Trace McSorley",pos:"QB",age:30,team:"FA",proj:{PPR:175,Half:175,Standard:175},adp:40.0,ktcVal:150,note:"Mobile emergency QB"},
  {name:"Brian Hoyer",pos:"QB",age:40,team:"FA",proj:{PPR:162,Half:162,Standard:162},adp:43.0,ktcVal:100,note:"Veteran emergency backup"},
  // RB depth Wave 11
  {name:"Michael Carter",pos:"RB",age:26,team:"NYJ",proj:{PPR:128,Half:117,Standard:106},adp:30.0,ktcVal:700,note:"Pass-catching back: 350 rush 50 rec"},
  {name:"Chase Edmonds",pos:"RB",age:29,team:"FA",proj:{PPR:112,Half:103,Standard:94},adp:33.5,ktcVal:300,note:"Veteran scatback: receiving back"},
  {name:"Marlon Mack",pos:"RB",age:30,team:"FA",proj:{PPR:98,Half:90,Standard:82},adp:38.5,ktcVal:200,note:"Veteran FA: power back depth"},
  // IDP DL Wave 11
  {name:"David Ojabo",pos:"DL",age:25,team:"BAL",proj:{PPR:88,Half:88,Standard:88},adp:27.0,ktcVal:1800,note:"EDGE: 8 sacks when healthy Year 4"},
  {name:"Odafe Oweh",pos:"DL",age:26,team:"BAL",proj:{PPR:92,Half:92,Standard:92},adp:24.5,ktcVal:2000,note:"EDGE: 9 sacks explosive athlete"},
  {name:"Charles Omenihu",pos:"DL",age:29,team:"KC",proj:{PPR:82,Half:82,Standard:82},adp:30.5,ktcVal:1200,note:"EDGE: 7 sacks versatile"},
  {name:"Jonathan Allen",pos:"DL",age:30,team:"MIN",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:2200,note:"IDL: 8 sacks 48 tackles Pro Bowl"},
  {name:"Tershawn Wharton",pos:"DL",age:28,team:"KC",proj:{PPR:75,Half:75,Standard:75},adp:35.0,ktcVal:900,note:"IDL: 35 tackles 4 sacks rotational"},
  {name:"Rasheem Green",pos:"DL",age:28,team:"HOU",proj:{PPR:72,Half:72,Standard:72},adp:37.5,ktcVal:900,note:"EDGE depth: 6 sacks rotational"},
  {name:"Dean Lowry",pos:"DL",age:32,team:"GB",proj:{PPR:68,Half:68,Standard:68},adp:40.5,ktcVal:600,note:"IDL veteran: 28 tackles 3 sacks"},
  {name:"Bilal Nichols",pos:"DL",age:30,team:"MIA",proj:{PPR:65,Half:65,Standard:65},adp:42.0,ktcVal:700,note:"IDL depth: 30 tackles 2 sacks"},
  // IDP DB Wave 11
  {name:"Eric Stokes",pos:"DB",age:27,team:"GB",proj:{PPR:80,Half:80,Standard:80},adp:32.0,ktcVal:1000,note:"CB: 55 tackles 2 INT when healthy"},
  {name:"Khaleke Hudson",pos:"DB",age:28,team:"CHI",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:800,note:"LB/S hybrid: 70 tackles 2 sacks"},
  {name:"Myles Bryant",pos:"DB",age:27,team:"NE",proj:{PPR:70,Half:70,Standard:70},adp:38.5,ktcVal:800,note:"Slot CB: 55 tackles 2 INT"},
  // Wave 9 — All 32 NFL DSTs + remaining depth
  // DST — Defenses/Special Teams (all 32 teams)
  {name:"San Francisco 49ers DST",pos:"DST",age:0,team:"SF",proj:{PPR:148,Half:148,Standard:148},adp:1.5,ktcVal:700,note:"Elite DST: Bosa/Warner/Hamilton core"},
  {name:"Dallas Cowboys DST",pos:"DST",age:0,team:"DAL",proj:{PPR:142,Half:142,Standard:142},adp:2.5,ktcVal:680,note:"Elite DST: Parsons-led dominant unit"},
  {name:"Philadelphia Eagles DST",pos:"DST",age:0,team:"PHI",proj:{PPR:138,Half:138,Standard:138},adp:3.2,ktcVal:660,note:"Elite front 7: Carter/Davis/Sweat"},
  {name:"Baltimore Ravens DST",pos:"DST",age:0,team:"BAL",proj:{PPR:135,Half:135,Standard:135},adp:3.8,ktcVal:640,note:"Top-5 DST: Hamilton/Madubuike"},
  {name:"Buffalo Bills DST",pos:"DST",age:0,team:"BUF",proj:{PPR:132,Half:132,Standard:132},adp:4.5,ktcVal:620,note:"Physical unit: Von/Rousseau edge"},
  {name:"Pittsburgh Steelers DST",pos:"DST",age:0,team:"PIT",proj:{PPR:128,Half:128,Standard:128},adp:5.5,ktcVal:600,note:"Stout: TJ Watt led dominant EDGE"},
  {name:"Minnesota Vikings DST",pos:"DST",age:0,team:"MIN",proj:{PPR:125,Half:125,Standard:125},adp:6.2,ktcVal:580,note:"Ascending: Hunter/Pace/Kendricks"},
  {name:"Cleveland Browns DST",pos:"DST",age:0,team:"CLE",proj:{PPR:122,Half:122,Standard:122},adp:7.0,ktcVal:560,note:"Solid: Garrett elite EDGE anchor"},
  {name:"Houston Texans DST",pos:"DST",age:0,team:"HOU",proj:{PPR:120,Half:120,Standard:120},adp:7.5,ktcVal:550,note:"Rising: Will Anderson/Hunter DL"},
  {name:"Kansas City Chiefs DST",pos:"DST",age:0,team:"KC",proj:{PPR:118,Half:118,Standard:118},adp:8.2,ktcVal:540,note:"Solid: Karlaftis/Jones/Spagnuolo"},
  {name:"Green Bay Packers DST",pos:"DST",age:0,team:"GB",proj:{PPR:115,Half:115,Standard:115},adp:9.0,ktcVal:520,note:"Physical: Gary/Alexander unit"},
  {name:"Seattle Seahawks DST",pos:"DST",age:0,team:"SEA",proj:{PPR:112,Half:112,Standard:112},adp:9.8,ktcVal:510,note:"Good: Witherspoon CB + LB depth"},
  {name:"Los Angeles Rams DST",pos:"DST",age:0,team:"LAR",proj:{PPR:110,Half:110,Standard:110},adp:10.5,ktcVal:500,note:"Solid: Young EDGE + Davis CB"},
  {name:"Indianapolis Colts DST",pos:"DST",age:0,team:"IND",proj:{PPR:108,Half:108,Standard:108},adp:11.2,ktcVal:490,note:"Decent: Kwity Paye led EDGE"},
  {name:"Tampa Bay Buccaneers DST",pos:"DST",age:0,team:"TB",proj:{PPR:106,Half:106,Standard:106},adp:11.8,ktcVal:480,note:"Decent: David LB veteran anchor"},
  {name:"Miami Dolphins DST",pos:"DST",age:0,team:"MIA",proj:{PPR:104,Half:104,Standard:104},adp:12.5,ktcVal:460,note:"Average: Ogbah/Chinn depth"},
  {name:"New England Patriots DST",pos:"DST",age:0,team:"NE",proj:{PPR:102,Half:102,Standard:102},adp:13.2,ktcVal:440,note:"Rebuilding: Gonzalez/Maye emerging"},
  {name:"Chicago Bears DST",pos:"DST",age:0,team:"CHI",proj:{PPR:100,Half:100,Standard:100},adp:14.0,ktcVal:430,note:"Ascending: Sweat/Edmunds/Hamilton"},
  {name:"New York Jets DST",pos:"DST",age:0,team:"NYJ",proj:{PPR:98,Half:98,Standard:98},adp:14.8,ktcVal:420,note:"Average: Quinnen Williams anchor"},
  {name:"Los Angeles Chargers DST",pos:"DST",age:0,team:"LAC",proj:{PPR:96,Half:96,Standard:96},adp:15.5,ktcVal:410,note:"Average: Derwin James versatile"},
  {name:"Detroit Lions DST",pos:"DST",age:0,team:"DET",proj:{PPR:94,Half:94,Standard:94},adp:16.2,ktcVal:400,note:"Improving: Hutchinson/Branch"},
  {name:"Denver Broncos DST",pos:"DST",age:0,team:"DEN",proj:{PPR:92,Half:92,Standard:92},adp:17.0,ktcVal:390,note:"Decent: Sanders/Van Ness depth"},
  {name:"Atlanta Falcons DST",pos:"DST",age:0,team:"ATL",proj:{PPR:90,Half:90,Standard:90},adp:17.8,ktcVal:380,note:"Average: Terrell CB + Andersen LB"},
  {name:"Cincinnati Bengals DST",pos:"DST",age:0,team:"CIN",proj:{PPR:88,Half:88,Standard:88},adp:18.5,ktcVal:370,note:"Average: Awuzie/Tupou front"},
  {name:"New Orleans Saints DST",pos:"DST",age:0,team:"NO",proj:{PPR:86,Half:86,Standard:86},adp:19.2,ktcVal:360,note:"Decent: Granderson/Davis depth"},
  {name:"Jacksonville Jaguars DST",pos:"DST",age:0,team:"JAX",proj:{PPR:84,Half:84,Standard:84},adp:20.0,ktcVal:350,note:"Average: Walker/Campbell EDGE"},
  {name:"Washington Commanders DST",pos:"DST",age:0,team:"WAS",proj:{PPR:82,Half:82,Standard:82},adp:20.8,ktcVal:340,note:"Average: Payne/Fuller anchors"},
  {name:"New York Giants DST",pos:"DST",age:0,team:"NYG",proj:{PPR:80,Half:80,Standard:80},adp:21.5,ktcVal:320,note:"Weak: Burns/Dexter Lawrence"},
  {name:"Arizona Cardinals DST",pos:"DST",age:0,team:"ARI",proj:{PPR:78,Half:78,Standard:78},adp:22.2,ktcVal:300,note:"Weak: Young unit rebuilding"},
  {name:"Las Vegas Raiders DST",pos:"DST",age:0,team:"LV",proj:{PPR:76,Half:76,Standard:76},adp:23.0,ktcVal:280,note:"Weak: Maxx Crosby lone stud"},
  {name:"Tennessee Titans DST",pos:"DST",age:0,team:"TEN",proj:{PPR:74,Half:74,Standard:74},adp:23.8,ktcVal:260,note:"Weak: rebuilding roster"},
  {name:"Carolina Panthers DST",pos:"DST",age:0,team:"CAR",proj:{PPR:72,Half:72,Standard:72},adp:24.5,ktcVal:240,note:"Weak: young roster rebuilding"},
  // Wave 8 — Kickers, IDP DL/LB/DB depth, WR youth
  // Kickers
  {name:"Justin Tucker",pos:"K",age:36,team:"BAL",proj:{PPR:172,Half:172,Standard:172},adp:2.0,ktcVal:500,note:"Elite K: 95% FG% long range"},
  {name:"Harrison Butker",pos:"K",age:29,team:"KC",proj:{PPR:168,Half:168,Standard:168},adp:2.5,ktcVal:550,note:"Elite K: high-volume offense"},
  {name:"Brandon Aubrey",pos:"K",age:29,team:"DAL",proj:{PPR:165,Half:165,Standard:165},adp:3.0,ktcVal:550,note:"Elite accuracy: 95.2% FG%"},
  {name:"Younghoe Koo",pos:"K",age:30,team:"ATL",proj:{PPR:158,Half:158,Standard:158},adp:4.0,ktcVal:500,note:"High volume: 90% FG% reliable"},
  {name:"Evan McPherson",pos:"K",age:26,team:"CIN",proj:{PPR:155,Half:155,Standard:155},adp:4.5,ktcVal:500,note:"Leg cannon: 88% FG% big range"},
  {name:"Jake Moody",pos:"K",age:25,team:"SF",proj:{PPR:152,Half:152,Standard:152},adp:5.0,ktcVal:500,note:"SF volume: 88% FG% Year 3"},
  {name:"Tyler Bass",pos:"K",age:27,team:"BUF",proj:{PPR:148,Half:148,Standard:148},adp:5.5,ktcVal:480,note:"BUF high-volume offense kicker"},
  {name:"Daniel Carlson",pos:"K",age:30,team:"LV",proj:{PPR:145,Half:145,Standard:145},adp:6.0,ktcVal:460,note:"Reliable: 88% FG% consistent"},
  {name:"Chris Boswell",pos:"K",age:33,team:"PIT",proj:{PPR:142,Half:142,Standard:142},adp:6.5,ktcVal:440,note:"Veteran: 87% FG% consistent"},
  {name:"Cairo Santos",pos:"K",age:33,team:"CHI",proj:{PPR:138,Half:138,Standard:138},adp:7.0,ktcVal:420,note:"Veteran reliability: 86% FG%"},
  {name:"Matt Gay",pos:"K",age:30,team:"IND",proj:{PPR:135,Half:135,Standard:135},adp:7.5,ktcVal:440,note:"87% FG% solid range"},
  {name:"Wil Lutz",pos:"K",age:31,team:"DEN",proj:{PPR:132,Half:132,Standard:132},adp:8.0,ktcVal:420,note:"Veteran: 86% FG%"},
  {name:"Nick Folk",pos:"K",age:40,team:"TEN",proj:{PPR:128,Half:128,Standard:128},adp:8.5,ktcVal:350,note:"Veteran: 86% FG% reliable"},
  {name:"Graham Gano",pos:"K",age:38,team:"NYG",proj:{PPR:125,Half:125,Standard:125},adp:9.0,ktcVal:350,note:"Veteran: 85% FG%"},
  {name:"Dustin Hopkins",pos:"K",age:33,team:"CLE",proj:{PPR:122,Half:122,Standard:122},adp:9.5,ktcVal:380,note:"Reliable veteran: 85% FG%"},
  {name:"Greg Zuerlein",pos:"K",age:37,team:"NYJ",proj:{PPR:118,Half:118,Standard:118},adp:10.0,ktcVal:350,note:"Veteran range: 85% FG%"},
  {name:"Jason Sanders",pos:"K",age:30,team:"MIA",proj:{PPR:128,Half:128,Standard:128},adp:8.2,ktcVal:440,note:"MIA high volume: 86% FG%"},
  {name:"Greg Joseph",pos:"K",age:31,team:"MIN",proj:{PPR:122,Half:122,Standard:122},adp:9.2,ktcVal:380,note:"86% FG% solid"},
  {name:"Ka'imi Fairbairn",pos:"K",age:32,team:"HOU",proj:{PPR:135,Half:135,Standard:135},adp:7.2,ktcVal:440,note:"HOU volume: 87% FG%"},
  {name:"Matt Ammendola",pos:"K",age:29,team:"ARI",proj:{PPR:118,Half:118,Standard:118},adp:10.5,ktcVal:300,note:"Depth K: 84% FG%"},
  // IDP DL Wave 8
  {name:"Robert Quinn",pos:"DL",age:34,team:"FA",proj:{PPR:78,Half:78,Standard:78},adp:34.5,ktcVal:400,note:"Veteran EDGE: 8 sacks if active"},
  {name:"Emmanuel Ogbah",pos:"DL",age:32,team:"MIA",proj:{PPR:80,Half:80,Standard:80},adp:32.0,ktcVal:800,note:"EDGE: 7.5 sacks rotational"},
  {name:"Dexter Lawrence II",pos:"DL",age:27,team:"NYG",proj:{PPR:98,Half:98,Standard:98},adp:20.5,ktcVal:2800,note:"IDL: 8 sacks 45 tackles disruptive"},
  {name:"Jordan Davis",pos:"DL",age:26,team:"PHI",proj:{PPR:82,Half:82,Standard:82},adp:30.5,ktcVal:1800,note:"NT Year 4: 40 tackles 4 sacks"},
  {name:"Calais Campbell",pos:"DL",age:39,team:"FA",proj:{PPR:72,Half:72,Standard:72},adp:38.0,ktcVal:300,note:"Veteran if active: 5 sacks"},
  // IDP LB Wave 8
  {name:"Denzel Perryman",pos:"LB",age:33,team:"LV",proj:{PPR:98,Half:98,Standard:98},adp:21.0,ktcVal:700,note:"Thumper: 100 tackles 2 sacks"},
  {name:"Devin White",pos:"LB",age:27,team:"PHI",proj:{PPR:100,Half:100,Standard:100},adp:20.5,ktcVal:1500,note:"Speed: 98 tackles 3 sacks"},
  {name:"Myles Jack",pos:"LB",age:30,team:"FA",proj:{PPR:88,Half:88,Standard:88},adp:27.5,ktcVal:800,note:"ILB: 88 tackles 2 INT"},
  {name:"Christian Kirksey",pos:"LB",age:33,team:"FA",proj:{PPR:82,Half:82,Standard:82},adp:32.0,ktcVal:400,note:"Veteran: 82 tackles if active"},
  // IDP DB Wave 8
  {name:"Kendall Fuller",pos:"DB",age:30,team:"WAS",proj:{PPR:88,Half:88,Standard:88},adp:27.0,ktcVal:1500,note:"CB/S: 65 tackles 3 INT"},
  {name:"Rasul Douglas",pos:"DB",age:30,team:"BUF",proj:{PPR:82,Half:82,Standard:82},adp:31.0,ktcVal:1000,note:"CB: 58 tackles 3 INT"},
  {name:"C.J. Henderson Jr.",pos:"DB",age:27,team:"CAR",proj:{PPR:78,Half:78,Standard:78},adp:33.5,ktcVal:1200,note:"CB: 55 tackles 2 INT"},
  {name:"Rock Ya-Sin",pos:"DB",age:29,team:"LV",proj:{PPR:75,Half:75,Standard:75},adp:35.5,ktcVal:800,note:"CB: 52 tackles 2 INT"},
  // WR youth Wave 8
  {name:"Malik Heath",pos:"WR",age:26,team:"DET",proj:{PPR:82,Half:75,Standard:68},adp:47.0,ktcVal:300,note:"Physical receiver depth"},
  {name:"Shedrick Jackson",pos:"WR",age:25,team:"SF",proj:{PPR:85,Half:78,Standard:71},adp:45.5,ktcVal:400,note:"Speed deep threat"},
  // Wave 6 — additional skill + IDP depth
  {name:"Mike Williams",pos:"WR",age:30,team:"PIT",proj:{PPR:168,Half:155,Standard:142},adp:26.0,ktcVal:700,note:"Big-play threat: 58 rec 780 yds 7 TD"},
  {name:"Seth Williams",pos:"WR",age:26,team:"DEN",proj:{PPR:128,Half:118,Standard:108},adp:34.0,ktcVal:500,note:"Physical receiver: 48 rec 580 yds"},
  {name:"Emmanuel Sanders",pos:"WR",age:38,team:"FA",proj:{PPR:82,Half:75,Standard:68},adp:48.0,ktcVal:100,note:"Veteran FA depth"},
  {name:"Chris Moore",pos:"WR",age:32,team:"HOU",proj:{PPR:88,Half:81,Standard:74},adp:45.5,ktcVal:200,note:"Depth receiver"},
  {name:"Dax Milne",pos:"WR",age:27,team:"WAS",proj:{PPR:95,Half:87,Standard:79},adp:43.0,ktcVal:300,note:"Slot depth: 38 rec 420 yds"},
  {name:"Anthony Schwartz",pos:"WR",age:25,team:"CLE",proj:{PPR:88,Half:81,Standard:74},adp:45.0,ktcVal:300,note:"Speed receiver depth"},
  {name:"Juwann Winfree",pos:"WR",age:29,team:"NYG",proj:{PPR:72,Half:66,Standard:60},adp:49.0,ktcVal:200,note:"Developmental depth"},
  {name:"Chosen Anderson",pos:"WR",age:30,team:"FA",proj:{PPR:78,Half:72,Standard:66},adp:47.5,ktcVal:200,note:"Veteran depth receiver"},
  {name:"Matt Breida",pos:"RB",age:30,team:"NYG",proj:{PPR:98,Half:90,Standard:82},adp:41.0,ktcVal:200,note:"Speed back depth"},
  {name:"Devontae Booker",pos:"RB",age:31,team:"LV",proj:{PPR:102,Half:93,Standard:84},adp:39.5,ktcVal:200,note:"Veteran committee: 380 rush 38 rec"},
  {name:"Giovani Bernard",pos:"RB",age:34,team:"FA",proj:{PPR:72,Half:66,Standard:60},adp:50.5,ktcVal:150,note:"Veteran pass-catcher depth"},
  {name:"Damarea Crockett",pos:"RB",age:29,team:"HOU",proj:{PPR:82,Half:75,Standard:68},adp:46.5,ktcVal:300,note:"Power depth back"},
  {name:"Justin Jackson",pos:"RB",age:29,team:"DET",proj:{PPR:88,Half:81,Standard:74},adp:44.5,ktcVal:400,note:"Speed back depth"},
  {name:"Jaret Patterson",pos:"RB",age:26,team:"WAS",proj:{PPR:78,Half:72,Standard:66},adp:47.0,ktcVal:500,note:"Depth back utility"},
  {name:"DeWayne McBride",pos:"RB",age:24,team:"MIN",proj:{PPR:118,Half:108,Standard:98},adp:32.0,ktcVal:1200,note:"Powerful runner: 500 rush depth"},
  {name:"Trey Benson",pos:"RB",age:24,team:"ARI",proj:{PPR:145,Half:133,Standard:121},adp:24.5,ktcVal:3356,note:"Year 2: 600 rush 5 TD"},
  {name:"Dylan Laube",pos:"RB",age:24,team:"NE",proj:{PPR:122,Half:112,Standard:102},adp:30.5,ktcVal:1000,note:"Versatile back: 400 rush 45 rec"},
  {name:"Isaiah Davis",pos:"RB",age:24,team:"NYJ",proj:{PPR:112,Half:103,Standard:94},adp:34.5,ktcVal:2614,note:"Power back depth Year 2"},
  {name:"Luke Laufenberg",pos:"QB",age:26,team:"DAL",proj:{PPR:185,Half:185,Standard:185},adp:36.0,ktcVal:300,note:"Developmental backup"},
  {name:"Spencer Rattler",pos:"QB",age:26,team:"NO",proj:{PPR:245,Half:245,Standard:245},adp:22.5,ktcVal:1804,note:"Year 2: 3,000 yds 22 TD"},
  {name:"Tanner Mordecai",pos:"QB",age:27,team:"MIA",proj:{PPR:192,Half:192,Standard:192},adp:34.5,ktcVal:300,note:"Deep backup"},
  {name:"Chris Streveler",pos:"QB",age:30,team:"NYJ",proj:{PPR:188,Half:188,Standard:188},adp:35.5,ktcVal:200,note:"Mobile emergency backup"},
  // IDP Wave 5 — elite and rising pass rushers
  {name:"Jaelan Phillips",pos:"DL",age:26,team:"CAR",proj:{PPR:105,Half:105,Standard:105},adp:14.5,ktcVal:2500,note:"EDGE: 10 sacks when healthy · 4yr/$120M CAR"},
  {name:"Zach Harrison",pos:"DL",age:25,team:"NYG",proj:{PPR:90,Half:90,Standard:90},adp:27.0,ktcVal:1500,note:"Interior rush: 8 sacks"},
  {name:"Brenton Cox Jr.",pos:"DL",age:25,team:"PHI",proj:{PPR:88,Half:88,Standard:88},adp:29.5,ktcVal:1500,note:"Edge rotational: 7 sacks"},
  // IDP Wave 5 — LBs
  {name:"Anthony Barr",pos:"LB",age:34,team:"FA",proj:{PPR:85,Half:85,Standard:85},adp:31.5,ktcVal:400,note:"Veteran depth LB"},
  {name:"Cory Littleton",pos:"LB",age:32,team:"CAR",proj:{PPR:92,Half:92,Standard:92},adp:26.0,ktcVal:800,note:"Coverage: 88 tackles 2 INT"},
  {name:"Nick Kwiatkoski",pos:"LB",age:32,team:"LV",proj:{PPR:85,Half:85,Standard:85},adp:31.0,ktcVal:600,note:"Veteran ILB depth"},
  {name:"Malik Harrison",pos:"LB",age:27,team:"BAL",proj:{PPR:95,Half:95,Standard:95},adp:23.5,ktcVal:1200,note:"Thumper: 92 tackles 2 sacks"},
  {name:"Quincy Williams",pos:"LB",age:29,team:"NYJ",proj:{PPR:105,Half:105,Standard:105},adp:18.0,ktcVal:1800,note:"Physical: 100 tackles 3 sacks"},
  {name:"Kamu Grugier-Hill",pos:"LB",age:31,team:"HOU",proj:{PPR:88,Half:88,Standard:88},adp:29.0,ktcVal:700,note:"Depth: 85 tackles 2 sacks"},
  // IDP Wave 5 — DBs
  {name:"Justin Simmons",pos:"DB",age:32,team:"ATL",proj:{PPR:105,Half:105,Standard:105},adp:18.0,ktcVal:1000,note:"Veteran FS: 72 tackles 4 INT"},
  {name:"Kevin Byard",pos:"DB",age:32,team:"NE",proj:{PPR:102,Half:102,Standard:102},adp:19.5,ktcVal:800,note:"Veteran S: 70 tackles 4 INT"},
  {name:"Derwin James Jr.",pos:"DB",age:29,team:"LAC",proj:{PPR:115,Half:115,Standard:115},adp:14.5,ktcVal:3000,note:"S: 90 tackles 3 sacks versatile"},
  {name:"Ronnie Harrison Jr.",pos:"DB",age:29,team:"HOU",proj:{PPR:92,Half:92,Standard:92},adp:25.5,ktcVal:900,note:"S: 75 tackles 2 INT"},
  {name:"Dax Hill",pos:"DB",age:25,team:"CIN",proj:{PPR:98,Half:98,Standard:98},adp:21.0,ktcVal:2000,note:"S: 78 tackles 3 INT Year 4"},
  {name:"Brian Branch",pos:"DB",age:24,team:"DET",proj:{PPR:102,Half:102,Standard:102},adp:19.0,ktcVal:3500,note:"S: 80 tackles 3 INT versatile"},
  {name:"Nate Hobbs",pos:"DB",age:27,team:"LV",proj:{PPR:88,Half:88,Standard:88},adp:29.5,ktcVal:1200,note:"CB/S: 68 tackles 2 INT"},
  {name:"Kader Kohou",pos:"DB",age:28,team:"MIA",proj:{PPR:85,Half:85,Standard:85},adp:31.5,ktcVal:900,note:"CB: 62 tackles 3 INT"},
  {name:"Diontae Spencer",pos:"DB",age:32,team:"CAR",proj:{PPR:72,Half:72,Standard:72},adp:45.0,ktcVal:300,note:"Veteran S depth"},
  // Wave 5 — notable missing skill players
  {name:"Calvin Ridley",pos:"WR",age:30,team:"TEN",proj:{PPR:205,Half:189,Standard:173},adp:19.5,ktcVal:1792,note:"Veteran: 78 rec 900 yds 8 TD bounce-back"},
  {name:"Donovan Peoples-Jones",pos:"WR",age:27,team:"CLE",proj:{PPR:162,Half:149,Standard:136},adp:26.5,ktcVal:800,note:"62 rec 780 yds 6 TD deep threat"},
  {name:"Jelani Woods",pos:"TE",age:26,team:"NYJ",proj:{PPR:115,Half:105,Standard:95},adp:25.5,ktcVal:800,note:"Athletic: 44 rec 480 yds 5 TD"},
  {name:"Connor Heyward",pos:"TE",age:32,team:"PIT",proj:{PPR:88,Half:81,Standard:74},adp:38.0,ktcVal:300,note:"Utility: 35 rec 350 yds"},
  {name:"Irv Smith Jr.",pos:"TE",age:28,team:"CIN",proj:{PPR:98,Half:90,Standard:82},adp:32.5,ktcVal:600,note:"Backup: 40 rec 410 yds"},
  {name:"Tyler Kroft",pos:"TE",age:32,team:"FA",proj:{PPR:68,Half:62,Standard:56},adp:50.0,ktcVal:150,note:"Veteran blocker/depth"},
  {name:"Evan Hull",pos:"RB",age:25,team:"IND",proj:{PPR:118,Half:108,Standard:98},adp:32.0,ktcVal:700,note:"Pass-catching back"},
  {name:"Drew Sample",pos:"TE",age:29,team:"CIN",proj:{PPR:68,Half:62,Standard:56},adp:49.5,ktcVal:400,note:"Blocking/depth"},
  {name:"Anthony Firkser",pos:"TE",age:29,team:"TEN",proj:{PPR:75,Half:69,Standard:63},adp:45.5,ktcVal:400,note:"Depth receiving TE"},
  {name:"Albert Okwuosa",pos:"WR",age:26,team:"NYJ",proj:{PPR:92,Half:84,Standard:76},adp:44.0,ktcVal:300,note:"Developmental receiver"},
  {name:"Daylen Baldwin",pos:"WR",age:26,team:"JAX",proj:{PPR:88,Half:81,Standard:74},adp:46.0,ktcVal:200,note:"Size/depth WR"},
  {name:"Tanner Morgan",pos:"QB",age:28,team:"MIN",proj:{PPR:188,Half:188,Standard:188},adp:35.0,ktcVal:300,note:"Developmental backup"},
  // IDP Wave 4 — more depth DL
  {name:"Raekwon Davis",pos:"DL",age:27,team:"MIA",proj:{PPR:85,Half:85,Standard:85},adp:32.0,ktcVal:1000,note:"NT: 45 tackles 3 sacks"},
  {name:"Keeanu Benton",pos:"DL",age:24,team:"PIT",proj:{PPR:88,Half:88,Standard:88},adp:31.0,ktcVal:2000,note:"Year 3: 48 tackles 4 sacks"},
  {name:"Kobie Turner",pos:"DL",age:25,team:"LAR",proj:{PPR:85,Half:85,Standard:85},adp:33.0,ktcVal:1500,note:"Interior: 46 tackles 3 sacks"},
  {name:"Siaki Ika",pos:"DL",age:25,team:"CLE",proj:{PPR:82,Half:82,Standard:82},adp:34.5,ktcVal:1400,note:"DT: 44 tackles 2 sacks"},
  {name:"Byron Young",pos:"DL",age:25,team:"LV",proj:{PPR:88,Half:88,Standard:88},adp:31.5,ktcVal:2200,note:"EDGE: 8 sacks 12 TFL"},
  {name:"BJ Ojulari",pos:"DL",age:23,team:"NYG",proj:{PPR:88,Half:88,Standard:88},adp:31.0,ktcVal:2800,note:"Rookie: 8 sacks upside"},
  {name:"Jonah Williams",pos:"DL",age:25,team:"LAR",proj:{PPR:82,Half:82,Standard:82},adp:34.0,ktcVal:1200,note:"EDGE: 7 sacks 10 TFL"},
  {name:"Isaiah McGuire",pos:"DL",age:25,team:"NYJ",proj:{PPR:80,Half:80,Standard:80},adp:35.0,ktcVal:1000,note:"Developmental: 6 sacks"},
  {name:"Habakkuk Baldonado",pos:"DL",age:25,team:"PIT",proj:{PPR:78,Half:78,Standard:78},adp:36.5,ktcVal:900,note:"Pass rush specialist"},
  {name:"Thomas Booker",pos:"DL",age:26,team:"SEA",proj:{PPR:80,Half:80,Standard:80},adp:35.5,ktcVal:900,note:"Interior: 44 tackles 2 sacks"},
  // IDP Wave 4 — more LBs
  {name:"Cam Curl",pos:"LB",age:26,team:"WAS",proj:{PPR:105,Half:105,Standard:105},adp:18.0,ktcVal:2200,note:"Hybrid LB/S: 100 tackles 2 INT"},
  {name:"Derek Stingley Jr.",pos:"DB",age:25,team:"HOU",proj:{PPR:110,Half:110,Standard:110},adp:15.5,ktcVal:3500,note:"CB: 68 tackles 5 INT"},
  {name:"Stephon Gilmore",pos:"DB",age:35,team:"DAL",proj:{PPR:88,Half:88,Standard:88},adp:30.0,ktcVal:800,note:"Veteran CB: 55 tackles 3 INT"},
  {name:"Denzel Ward",pos:"DB",age:28,team:"CLE",proj:{PPR:102,Half:102,Standard:102},adp:18.5,ktcVal:2500,note:"CB: 62 tackles 4 INT"},
  {name:"Eli Apple",pos:"DB",age:30,team:"CAR",proj:{PPR:88,Half:88,Standard:88},adp:30.5,ktcVal:700,note:"CB: 58 tackles 2 INT"},
  {name:"Trayvon Mullen",pos:"DB",age:28,team:"LV",proj:{PPR:85,Half:85,Standard:85},adp:32.0,ktcVal:800,note:"CB: 55 tackles 2 INT"},
  {name:"Trent McDuffie",pos:"DB",age:25,team:"KC",proj:{PPR:108,Half:108,Standard:108},adp:16.5,ktcVal:3800,note:"CB: 68 tackles 4 INT elite"},
  {name:"Kelee Ringo",pos:"DB",age:23,team:"PHI",proj:{PPR:92,Half:92,Standard:92},adp:26.0,ktcVal:2000,note:"Year 3 CB: 60 tackles 3 INT upside"},
  {name:"Joey Porter Jr.",pos:"DB",age:25,team:"PIT",proj:{PPR:98,Half:98,Standard:98},adp:21.5,ktcVal:2200,note:"CB: 64 tackles 3 INT Year 3"},
  // Missing RBs
  {name:"Audric Estime",pos:"RB",age:23,team:"NO",proj:{PPR:162,Half:148,Standard:134},adp:21.5,ktcVal:2200,note:"Year 2: 700 rush 5 TD power back"},
  {name:"Alex Mattison",pos:"RB",age:28,team:"MIN",proj:{PPR:155,Half:142,Standard:129},adp:23.5,ktcVal:600,note:"Lead back if healthy"},
  {name:"Abram Smith",pos:"RB",age:26,team:"NO",proj:{PPR:108,Half:99,Standard:90},adp:36.8,ktcVal:500,note:"Committee depth back"},
  {name:"Latavius Murray",pos:"RB",age:34,team:"FA",proj:{PPR:82,Half:75,Standard:68},adp:47.5,ktcVal:150,note:"Veteran depth"},
  {name:"Jakob Johnson",pos:"RB",age:29,team:"LV",proj:{PPR:72,Half:66,Standard:60},adp:50.0,ktcVal:300,note:"FB/utility role"},
  // Missing WRs
  {name:"Adonai Mitchell",pos:"WR",age:23,team:"IND",proj:{PPR:188,Half:174,Standard:160},adp:21.5,ktcVal:2739,note:"Year 2 leap: 72 rec 820 yds 7 TD"},
  {name:"Luke McCaffrey",pos:"WR",age:25,team:"WAS",proj:{PPR:175,Half:161,Standard:147},adp:24.5,ktcVal:1500,note:"Versatile slot: 68 rec 760 yds"},
  {name:"Demario Douglas",pos:"WR",age:26,team:"NE",proj:{PPR:162,Half:149,Standard:136},adp:27.0,ktcVal:1200,note:"Slot: 64 rec 720 yds YAC machine"},
  {name:"Jauan Jennings",pos:"WR",age:29,team:"SF",proj:{PPR:158,Half:145,Standard:132},adp:27.5,ktcVal:2945,note:"Red zone target: 58 rec 680 yds 7 TD"},
  {name:"Terry McLaurin",pos:"WR",age:29,team:"WAS",proj:{PPR:175,Half:161,Standard:147},adp:24.0,ktcVal:3405,note:"WAS WR1: 85 rec 1050 yds 7 TD"},
  {name:"Jalen Reagor",pos:"WR",age:27,team:"NE",proj:{PPR:108,Half:99,Standard:90},adp:39.0,ktcVal:300,note:"Return/depth role"},
  // Missing TEs
  {name:"Luke Schoonmaker",pos:"TE",age:26,team:"DAL",proj:{PPR:112,Half:103,Standard:94},adp:26.5,ktcVal:800,note:"Year 3: 44 rec 460 yds 4 TD"},
  {name:"Dalton Kincaid",pos:"TE",age:26,team:"BUF",proj:{PPR:118,Half:108,Standard:98},adp:24.8,ktcVal:3409,note:"Receiving TE: 48 rec 500 yds"},
  {name:"Nate Wieting",pos:"TE",age:28,team:"DET",proj:{PPR:75,Half:69,Standard:63},adp:45.0,ktcVal:300,note:"Blocking/depth"},
  // 2026 Rookie Prospects (pre-draft · April 23-25 2026)
  {name:"Fernando Mendoza",pos:"QB",age:22,team:"TBD",proj:{PPR:265,Half:265,Standard:265},adp:1.1,ktcVal:5500,note:"2026 #1 overall QB · Indiana · elite arm talent SF dynasty asset"},
  {name:"Ty Simpson",pos:"QB",age:22,team:"TBD",proj:{PPR:235,Half:235,Standard:235},adp:2.5,ktcVal:3500,note:"2026 1st round QB · Alabama · dual-threat upside"},
  {name:"Jeremiyah Love",pos:"RB",age:21,team:"TBD",proj:{PPR:270,Half:250,Standard:230},adp:1.1,ktcVal:8500,note:"2026 top-3 pick RB · Notre Dame · elite workhorse dynasty RB1"},
  {name:"Jadarian Price",pos:"RB",age:21,team:"TBD",proj:{PPR:195,Half:180,Standard:165},adp:2.5,ktcVal:5000,note:"2026 2nd round RB · Notre Dame · three-down potential"},
  {name:"Carnell Tate",pos:"WR",age:21,team:"TBD",proj:{PPR:160,Half:147,Standard:134},adp:1.2,ktcVal:6500,note:"2026 top-10 pick WR · Ohio State · dynasty WR1 ceiling"},
  {name:"Makai Lemon",pos:"WR",age:21,team:"TBD",proj:{PPR:148,Half:136,Standard:124},adp:1.4,ktcVal:5500,note:"2026 1st round WR · USC · elite athleticism and route running"},
  {name:"Omar Cooper Jr.",pos:"WR",age:22,team:"TBD",proj:{PPR:138,Half:126,Standard:114},adp:2.0,ktcVal:4500,note:"2026 1st round WR · Indiana · elite YAC and separation"},
  {name:"Jordyn Tyson",pos:"WR",age:22,team:"TBD",proj:{PPR:132,Half:121,Standard:110},adp:2.1,ktcVal:4000,note:"2026 1st round WR · Arizona State · big-play vertical threat"},
  {name:"Denzel Boston",pos:"WR",age:22,team:"TBD",proj:{PPR:125,Half:115,Standard:105},adp:2.2,ktcVal:3800,note:"2026 1st round WR · Washington · big body possession receiver"},
  {name:"KC Concepcion",pos:"WR",age:21,team:"TBD",proj:{PPR:115,Half:106,Standard:97},adp:3.0,ktcVal:2800,note:"2026 2nd round WR · Texas A&M · explosive slot weapon"},
  {name:"Antonio Williams",pos:"WR",age:22,team:"TBD",proj:{PPR:100,Half:92,Standard:84},adp:4.0,ktcVal:1800,note:"2026 3rd+ round WR · Clemson · depth flier with upside"},
  {name:"Kenyon Sadiq",pos:"TE",age:22,team:"TBD",proj:{PPR:118,Half:108,Standard:98},adp:1.3,ktcVal:4500,note:"2026 1st round TE · Oregon · top TE prospect elite upside"},
  // 2026 IDP Rookies
  {name:"Sonny Styles",pos:"LB",age:21,team:"TBD",proj:{PPR:118,Half:118,Standard:118},adp:1.1,ktcVal:5500,note:"2026 top-5 pick LB · Ohio State · elite coverage and pass rush"},
  {name:"David Bailey",pos:"DL",age:22,team:"TBD",proj:{PPR:108,Half:108,Standard:108},adp:1.1,ktcVal:5000,note:"2026 top-5 pick Edge · Texas Tech · 12+ sack ceiling"},
  {name:"Arvell Reese",pos:"DL",age:21,team:"TBD",proj:{PPR:102,Half:102,Standard:102},adp:1.2,ktcVal:4800,note:"2026 top-5 pick Edge · Ohio State · explosive first step"},
  {name:"Rueben Bain Jr.",pos:"DL",age:21,team:"TBD",proj:{PPR:98,Half:98,Standard:98},adp:1.2,ktcVal:4500,note:"2026 1st round Edge · Miami · elite motor elite pass rusher"},
  {name:"Caleb Downs",pos:"DB",age:22,team:"TBD",proj:{PPR:108,Half:108,Standard:108},adp:1.3,ktcVal:5000,note:"2026 1st round S · Ohio State · ball-hawk elite tackler"},
  {name:"Mansoor Delane",pos:"DB",age:22,team:"TBD",proj:{PPR:95,Half:95,Standard:95},adp:1.3,ktcVal:4000,note:"2026 1st round CB · LSU · long press coverage specialist"},
  {name:"CJ Allen",pos:"LB",age:22,team:"TBD",proj:{PPR:112,Half:112,Standard:112},adp:2.0,ktcVal:3500,note:"2026 1st round LB · Georgia · sideline-to-sideline tackling machine"},
  {name:"T.J. Parker",pos:"DL",age:22,team:"TBD",proj:{PPR:92,Half:92,Standard:92},adp:2.1,ktcVal:3200,note:"2026 1st round Edge · Clemson · 10+ sack upside"},
];

const DRAFT_PICKS=[
  // 2026 1st Round — KTC baseline: 1.01=7463
  {id:"p2026_1_01",name:"2026 1.01",round:1,est:7463,note:"Top overall pick · franchise cornerstone"},
  {id:"p2026_1_02",name:"2026 1.02",round:1,est:6850,note:"Blue-chip dynasty asset"},
  {id:"p2026_1_03",name:"2026 1.03",round:1,est:6300,note:"Premium top-3 pick"},
  {id:"p2026_1_04",name:"2026 1.04",round:1,est:5800,note:"Top-4 dynasty value"},
  {id:"p2026_1_05",name:"2026 1.05",round:1,est:5350,note:"Strong top-5 pick"},
  {id:"p2026_1_06",name:"2026 1.06",round:1,est:4950,note:"Top-6 solid 1st"},
  {id:"p2026_1_07",name:"2026 1.07",round:1,est:4600,note:"Mid 1st round"},
  {id:"p2026_1_08",name:"2026 1.08",round:1,est:4300,note:"Mid 1st round"},
  {id:"p2026_1_09",name:"2026 1.09",round:1,est:4050,note:"Mid-late 1st"},
  {id:"p2026_1_10",name:"2026 1.10",round:1,est:3900,note:"Late 1st round"},
  {id:"p2026_1_11",name:"2026 1.11",round:1,est:3750,note:"Late 1st round"},
  {id:"p2026_1_12",name:"2026 1.12",round:1,est:3650,note:"Late 1st · last pick"},
  // 2026 2nd Round — KTC baseline: 2.01=3583
  {id:"p2026_2_01",name:"2026 2.01",round:2,est:3583,note:"Top 2nd · solid dynasty value"},
  {id:"p2026_2_02",name:"2026 2.02",round:2,est:3450,note:"Early 2nd"},
  {id:"p2026_2_03",name:"2026 2.03",round:2,est:3320,note:"Early 2nd"},
  {id:"p2026_2_04",name:"2026 2.04",round:2,est:3200,note:"Early-mid 2nd"},
  {id:"p2026_2_05",name:"2026 2.05",round:2,est:3080,note:"Mid 2nd"},
  {id:"p2026_2_06",name:"2026 2.06",round:2,est:2970,note:"Mid 2nd"},
  {id:"p2026_2_07",name:"2026 2.07",round:2,est:2880,note:"Mid 2nd"},
  {id:"p2026_2_08",name:"2026 2.08",round:2,est:2820,note:"Mid-late 2nd"},
  {id:"p2026_2_09",name:"2026 2.09",round:2,est:2780,note:"Late 2nd"},
  {id:"p2026_2_10",name:"2026 2.10",round:2,est:2750,note:"Late 2nd"},
  {id:"p2026_2_11",name:"2026 2.11",round:2,est:2720,note:"Late 2nd"},
  {id:"p2026_2_12",name:"2026 2.12",round:2,est:2680,note:"Late 2nd · last pick"},
  // 2026 3rd Round — KTC baseline: 3.01=2565
  {id:"p2026_3_01",name:"2026 3.01",round:3,est:2565,note:"Early 3rd · high-upside rookie"},
  {id:"p2026_3_02",name:"2026 3.02",round:3,est:2490,note:"Early 3rd"},
  {id:"p2026_3_03",name:"2026 3.03",round:3,est:2420,note:"Early 3rd"},
  {id:"p2026_3_04",name:"2026 3.04",round:3,est:2360,note:"Mid 3rd"},
  {id:"p2026_3_05",name:"2026 3.05",round:3,est:2300,note:"Mid 3rd"},
  {id:"p2026_3_06",name:"2026 3.06",round:3,est:2250,note:"Mid 3rd"},
  {id:"p2026_3_07",name:"2026 3.07",round:3,est:2200,note:"Mid-late 3rd"},
  {id:"p2026_3_08",name:"2026 3.08",round:3,est:2160,note:"Late 3rd"},
  {id:"p2026_3_09",name:"2026 3.09",round:3,est:2120,note:"Late 3rd"},
  {id:"p2026_3_10",name:"2026 3.10",round:3,est:2090,note:"Late 3rd"},
  {id:"p2026_3_11",name:"2026 3.11",round:3,est:2060,note:"Late 3rd"},
  {id:"p2026_3_12",name:"2026 3.12",round:3,est:2030,note:"Late 3rd · last pick"},
  // 2026 4th Round — KTC baseline: 4.01=1919
  {id:"p2026_4_01",name:"2026 4.01",round:4,est:1919,note:"Early 4th · lottery upside"},
  {id:"p2026_4_02",name:"2026 4.02",round:4,est:1870,note:"Early 4th"},
  {id:"p2026_4_03",name:"2026 4.03",round:4,est:1825,note:"Early 4th"},
  {id:"p2026_4_04",name:"2026 4.04",round:4,est:1780,note:"Mid 4th"},
  {id:"p2026_4_05",name:"2026 4.05",round:4,est:1740,note:"Mid 4th"},
  {id:"p2026_4_06",name:"2026 4.06",round:4,est:1700,note:"Mid 4th"},
  {id:"p2026_4_07",name:"2026 4.07",round:4,est:1660,note:"Mid-late 4th"},
  {id:"p2026_4_08",name:"2026 4.08",round:4,est:1625,note:"Late 4th"},
  {id:"p2026_4_09",name:"2026 4.09",round:4,est:1590,note:"Late 4th"},
  {id:"p2026_4_10",name:"2026 4.10",round:4,est:1555,note:"Late 4th"},
  {id:"p2026_4_11",name:"2026 4.11",round:4,est:1520,note:"Late 4th"},
  {id:"p2026_4_12",name:"2026 4.12",round:4,est:1480,note:"Late 4th · last pick"},
  // 2026 5th Round
  {id:"p2026_5_01",name:"2026 5.01",round:5,est:1420,note:"Early 5th · deep lottery"},
  {id:"p2026_5_02",name:"2026 5.02",round:5,est:1370,note:"Early 5th"},
  {id:"p2026_5_03",name:"2026 5.03",round:5,est:1320,note:"Early 5th"},
  {id:"p2026_5_04",name:"2026 5.04",round:5,est:1280,note:"Mid 5th"},
  {id:"p2026_5_05",name:"2026 5.05",round:5,est:1240,note:"Mid 5th"},
  {id:"p2026_5_06",name:"2026 5.06",round:5,est:1210,note:"Mid 5th"},
  {id:"p2026_5_07",name:"2026 5.07",round:5,est:1180,note:"Mid-late 5th"},
  {id:"p2026_5_08",name:"2026 5.08",round:5,est:1150,note:"Late 5th"},
  {id:"p2026_5_09",name:"2026 5.09",round:5,est:1120,note:"Late 5th"},
  {id:"p2026_5_10",name:"2026 5.10",round:5,est:1090,note:"Late 5th"},
  {id:"p2026_5_11",name:"2026 5.11",round:5,est:1060,note:"Late 5th"},
  {id:"p2026_5_12",name:"2026 5.12",round:5,est:1030,note:"Late 5th · last pick"},
  // Future 2027 Picks
  {id:"p2027_1_early",name:"2027 1st Early",round:1,est:5800,note:"Future 1st · top-4 range"},
  {id:"p2027_1_mid",name:"2027 1st Mid",round:1,est:4600,note:"Future 1st · mid range"},
  {id:"p2027_1_late",name:"2027 1st Late",round:1,est:3700,note:"Future 1st · late range"},
  {id:"p2027_2",name:"2027 2nd Round",round:2,est:3100,note:"Future 2nd"},
  {id:"p2027_3",name:"2027 3rd Round",round:3,est:2300,note:"Future 3rd"},
  {id:"p2027_4",name:"2027 4th Round",round:4,est:1700,note:"Future 4th"},
  {id:"p2027_5",name:"2027 5th Round",round:5,est:1200,note:"Future 5th"},
  // Future 2028 Picks
  {id:"p2028_1_early",name:"2028 1st Early",round:1,est:4800,note:"Future 1st · top-4 range"},
  {id:"p2028_1_mid",name:"2028 1st Mid",round:1,est:3800,note:"Future 1st · mid range"},
  {id:"p2028_1_late",name:"2028 1st Late",round:1,est:3000,note:"Future 1st · late range"},
  {id:"p2028_2",name:"2028 2nd Round",round:2,est:2500,note:"Future 2nd"},
  {id:"p2028_3",name:"2028 3rd Round",round:3,est:1800,note:"Future 3rd"},
  {id:"p2028_4",name:"2028 4th Round",round:4,est:1300,note:"Future 4th"},
  {id:"p2028_5",name:"2028 5th Round",round:5,est:900,note:"Future 5th"},
];

const UNQ=PLAYERS.filter(function(p,i,a){return a.findIndex(function(x){return x.name===p.name;})===i;});

function dynastyBonus(pos,age){
  if(pos==="DST"||pos==="K"||pos==="PICK") return 1;
  var lo=PRIME[pos]?PRIME[pos][0]:25;
  // QBs age slower — youth bonus capped at 2%/yr (vs 4.5% for skill positions)
  // prevents double-dip: young QBs get extra posRank boost AND ab^2 multiply
  var yRate=pos==="QB"?0.020:0.045;
  if(age<lo) return 1+(lo-age)*yRate;
  if(age>lo+6) return Math.max(0.45,1-(age-lo-6)*0.065);
  return 1;
}
function getBaselines(teams,sf){return {QB:sf?teams*2:teams,RB:teams*2,WR:teams*2,TE:teams,K:teams,DST:teams,DL:teams,LB:teams,DB:teams};}
function ageGrade(pos,age){
  if(pos==="DST"||pos==="PICK") return {g:"N/A",c:"#5c5880"};
  var lo=PRIME[pos]?PRIME[pos][0]:25,hi=PRIME[pos]?PRIME[pos][1]:30,d=Math.abs(age-(lo+hi)/2);
  if(d<=1.5) return {g:"A+",c:"#10b981"};
  if(d<=3) return {g:"A",c:"#34d399"};
  if(age<lo) return {g:"B",c:"#f1c40f"};
  if(age>hi+5) return {g:"D",c:"#ef4444"};
  return {g:"C",c:"#f97316"};
}
function tierLabel(pr,pos){
  var ct={QB:[1,3,6,12],RB:[1,4,8,16],WR:[1,4,8,16],TE:[1,2,4,8],K:[1,3,5,8],DST:[1,2,4,6],DL:[1,3,6,10],LB:[1,3,6,10],DB:[1,3,6,10],PICK:[1,2,4,6]};
  var t=ct[pos]||[1,4,8,16];
  if(pr<=t[0]) return {t:1,c:"#f1c40f"};
  if(pr<=t[1]) return {t:2,c:"#818cf8"};
  if(pr<=t[2]) return {t:3,c:"#10b981"};
  if(pr<=t[3]) return {t:4,c:"#a78bfa"};
  return {t:5,c:"#4b5563"};
}
function scarcityLabel(pr,bl){
  var r=pr/bl;
  if(r<=0.25) return {l:"Elite",c:"#f1c40f"};
  if(r<=0.5) return {l:"Scarce",c:"#f87171"};
  if(r<=0.75) return {l:"Available",c:"#10b981"};
  return {l:"Deep",c:"#4b5563"};
}
function makePick(pk){return Object.assign({},pk,{pos:"PICK",age:0,pts:pk.est,vbd:pk.est,tradeVal:pk.est,ag:{g:"N/A",c:"#5c5880"},tier:tierLabel(pk.round,"PICK"),scarcity:{l:"—",c:"#5c5880"},auction:pk.est,ffabVal:pk.est,rank:999,team:"—"});}

function Avatar(props){
  var hs=headshot(props.name),pc=POS_COLORS[props.pos]||"#888";
  var [err,setErr]=useState(false);
  if(hs&&!err) return React.createElement("img",{src:hs,alt:props.name,style:{width:props.size,height:props.size,borderRadius:"50%",objectFit:"cover",border:"1.5px solid "+pc+"55",background:"#1c1a2e",flexShrink:0},onError:function(){setErr(true);}});
  return React.createElement("div",{style:{width:props.size,height:props.size,borderRadius:"50%",background:pc+"22",border:"1.5px solid "+pc+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:props.size*0.3,fontWeight:800,color:pc,flexShrink:0}},props.name.split(" ").map(function(w){return w[0];}).join("").slice(0,2));
}
function PBadge(props){
  var pc=POS_COLORS[props.pos]||"#888";
  return React.createElement("span",{style:{background:pc+"18",color:pc,border:"1px solid "+pc+"33",borderRadius:5,padding:"2px 7px",fontWeight:700,fontSize:9,flexShrink:0}},props.pos+(props.rank||""));
}
function Chip(props){
  return React.createElement("button",{onClick:props.onClick,style:{padding:"8px 14px",minHeight:36,borderRadius:8,border:"1px solid "+(props.active?(props.color||"#7c4dff"):"#2e2a4a"),background:props.active?(props.color||"#7c4dff"):"transparent",color:props.active?"#fff":"#9b96b8",fontWeight:700,fontSize:12,cursor:"pointer",WebkitTapHighlightColor:"transparent"}},props.label);
}

var PLANS=[{id:"free",label:"Free",priceStr:"$0",sub:"forever"},{id:"pro",label:"Pro",priceStr:"$2.99",sub:"/mo"},{id:"elite",label:"Elite",priceStr:"$6.99",sub:"/mo"}];
var COMPARE_ROWS=[["Trade Analyzer",true,true,true],["FAAB + Draft Picks",true,true,true],["IDP Rankings",true,true,true],["Top 20 Rankings",true,true,true],["Full 200+ Rankings",false,true,true],["League Import",false,true,true],["AI Trade Suggestions",false,true,true],["Market Alerts",false,true,true],["Roster Grades",false,true,true],["Power Rankings",false,true,true],["API Access",false,false,true],["Priority Support",false,false,true],["CSV Export",false,false,true]];
var FAQS=[{q:"What makes Fantasy Draft Pros the best dynasty trade analyzer?",a:"We combine 1,000+ player values updated daily across all positions including IDP, with FAAB budget tracking, draft pick values, and support for every major scoring format."},{q:"Is the dynasty trade calculator free?",a:"Yes! The core trade analyzer with 2026 player values is completely free — no account required. Pro features (unlimited trades, league import, full rankings) include a 7-day free trial."},{q:"Does it support IDP dynasty leagues?",a:"Absolutely. We rank DL, LB, and DB with full VBD scoring, age grades, and trade values."},{q:"Does Fantasy Draft Pros have superflex rankings?",a:"Yes — Superflex mode boosts QB values appropriately for SF leagues."},{q:"How often are player values updated?",a:"Player values are updated daily based on the latest news, injury reports, and 2026 projection data."},{q:"What league platforms are supported?",a:"Sleeper (live API), ESPN, Yahoo, and MFL — plus manual roster entry."}];

function AuthModal(props){
  var T=props.T||DARK,onClose=props.onClose,onAuth=props.onAuth,initMode=props.mode||"signup";
  var [mode,setMode]=useState(initMode),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[plan,setPlan]=useState("pro"),[step,setStep]=useState(1),[err,setErr]=useState(""),[loading,setLoading]=useState(false);
  var inp={background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"13px 16px",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",marginBottom:12};
  async function submit(){
    if(!email.includes("@")){setErr("Enter a valid email");return;}
    if(password.length<6){setErr("Password must be 6+ characters");return;}
    if(mode==="signup"&&step===1&&!name.trim()){setErr("Enter your name");return;}
    setErr("");setLoading(true);
    try {
      if(mode==="signup"){
        if(step===1){setLoading(false);setStep(2);return;}
        var signUpResult=await authClient!.auth.signUp({
          email,password,
          options:{data:{name,plan},emailRedirectTo:"https://fantasydraftpros.com"}
        });
        if(signUpResult.error)throw signUpResult.error;
        // Send welcome email (non-blocking)
        callEdgeFn("send-email",{type:"welcome",to:email,name}).catch(function(){});
        // If email confirmation required, show message; otherwise auth state will fire
        if(signUpResult.data.session){
          var u=signUpResult.data.session.user;
          var admin2=isAdminEmail(u.email||"");
          onAuth({id:u.id,name:name||u.email||"",email:u.email||"",plan:admin2?"elite":plan,isPro:plan!=="free"||admin2,isAdmin:admin2,token:signUpResult.data.session.access_token});
        } else {
          setErr("Check your email to confirm your account, then sign in.");
          setMode("signin");setStep(1);
        }
      } else {
        var signInResult=await authClient!.auth.signInWithPassword({email,password});
        if(signInResult.error)throw signInResult.error;
        var sess=signInResult.data.session;
        var usr=signInResult.data.user;
        // Load profile from DB
        var profResult=await authClient!.from("users").select("name,plan,is_pro,is_admin").eq("id",usr.id).single();
        var prof=profResult.data;
        var admin3=isAdminEmail(usr.email||"")||prof?.is_admin||false;
        onAuth({id:usr.id,name:prof?.name||usr.user_metadata?.name||usr.email||"",email:usr.email||"",plan:admin3?"elite":(prof?.plan||"free"),isPro:prof?.is_pro||admin3,isAdmin:admin3,token:sess.access_token});
      }
    } catch(e:any){
      setErr(e.message||"Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  var logoSrc=T.bgCard==="#ffffff"?"/logo-shield-light.png":"/logo-shield.png";
  var LogoSvg=React.createElement("img",{src:logoSrc,alt:"Fantasy DraftPros",style:{height:48,width:"auto"}});
  return React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}},
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:20,padding:28,width:"100%",maxWidth:400,position:"relative"}},
      React.createElement("button",{onClick:onClose,style:{position:"absolute",top:14,right:16,background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:20}},"x"),
      React.createElement("div",{style:{textAlign:"center",marginBottom:18}},
        React.createElement("img",{src:logoSrc,alt:"Fantasy DraftPros",style:{height:56,width:"auto",maxWidth:240}})
      ),
      step===1&&React.createElement("div",null,
        React.createElement("div",{style:{textAlign:"center",marginBottom:18}},React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},mode==="signup"?"Create Account":"Welcome Back"),React.createElement("div",{style:{fontSize:13,color:T.textSub}},mode==="signup"?"Start your 7-day free trial":"Sign in to your account")),
        React.createElement("div",{style:{display:"flex",background:T.bgInput,borderRadius:12,padding:4,marginBottom:18}},["signup","signin"].map(function(m){return React.createElement("button",{key:m,onClick:function(){setMode(m);setErr("");},style:{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:mode===m?T.purple:"transparent",color:mode===m?"#fff":T.textSub}},m==="signup"?"Sign Up":"Sign In");})),
        mode==="signup"&&React.createElement("input",{placeholder:"Full name",value:name,onChange:function(e){setName(e.target.value);},style:inp}),
        React.createElement("input",{placeholder:"Email address",type:"email",value:email,onChange:function(e){setEmail(e.target.value);},style:inp}),
        React.createElement("input",{placeholder:"Password (6+ characters)",type:"password",value:password,onChange:function(e){setPassword(e.target.value);},onKeyDown:function(e){if(e.key==="Enter")submit();},style:Object.assign({},inp,{marginBottom:err?8:16})}),
        err&&React.createElement("div",{style:{fontSize:12,color:T.red,marginBottom:12,padding:"8px 12px",background:T.red+"15",borderRadius:8}},err),
        React.createElement("button",{onClick:submit,disabled:loading,style:{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",fontWeight:800,fontSize:15,background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",opacity:loading?0.7:1}},loading?"...":(mode==="signup"?"Continue":"Sign In")),
        mode==="signin"&&React.createElement("div",{style:{textAlign:"center",marginTop:12,fontSize:12,color:T.textSub}},"No account? ",React.createElement("span",{onClick:function(){setMode("signup");setErr("");},style:{color:T.purple,cursor:"pointer",fontWeight:700}},"Sign up free"))
      ),
      step===2&&React.createElement("div",null,
        React.createElement("div",{style:{textAlign:"center",marginBottom:18}},React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Choose Your Plan"),React.createElement("div",{style:{fontSize:13,color:T.textSub}},"7-day free trial on all paid plans")),
        PLANS.filter(function(p){return p.id!=="elite"||isAdminEmail(email);}).map(function(p){
          var active=plan===p.id;
          return React.createElement("div",{key:p.id,onClick:function(){setPlan(p.id);},style:{background:active?T.purple+"18":T.bgInput,border:"2px solid "+(active?T.purple:T.border),borderRadius:14,padding:"14px 16px",marginBottom:10,cursor:"pointer"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},React.createElement("div",{style:{fontWeight:800,fontSize:15,color:active?T.purple:T.text}},p.label),React.createElement("div",{style:{fontWeight:900,fontSize:16,color:active?T.purple:T.textSub}},p.priceStr+(p.id==="free"?"":p.sub))),
            p.id==="free"&&React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Core trade analyzer + top 20 rankings"),
            p.id==="pro"&&React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4}},"Full rankings, league import, AI tools"),React.createElement("span",{style:{background:T.purple,color:"#fff",fontSize:9,fontWeight:800,borderRadius:4,padding:"2px 7px"}},"MOST POPULAR")),
            p.id==="elite"&&React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Everything in Pro + API access + priority support")
          );
        }),
        err&&React.createElement("div",{style:{fontSize:12,color:T.red,marginBottom:10,padding:"8px 12px",background:T.red+"15",borderRadius:8}},err),
        React.createElement("button",{onClick:submit,disabled:loading,style:{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",fontWeight:800,fontSize:15,background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",opacity:loading?0.7:1,marginTop:4}},loading?"...":(plan==="free"?"Start Free":"Start 7-Day Free Trial")),
        React.createElement("div",{style:{textAlign:"center",marginTop:8,fontSize:11,color:T.textDim}},plan!=="free"?"Cancel anytime.":"Upgrade anytime.")
      )
    )
  );
}

function UserMenu(props){
  var T=props.T||DARK,user=props.user,onSignOut=props.onSignOut,onUpgrade=props.onUpgrade,onAdmin=props.onAdmin;
  var [open,setOpen]=useState(false);
  return React.createElement("div",{style:{position:"relative"}},
    React.createElement("button",{onClick:function(){setOpen(!open);},style:{display:"flex",alignItems:"center",gap:6,background:user.isAdmin?"linear-gradient(135deg,"+T.purple+",#5b21b6)":T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:20,padding:"5px 12px 5px 6px",cursor:"pointer"}},
      React.createElement("div",{style:{width:24,height:24,borderRadius:"50%",background:user.isAdmin?"#f1c40f":T.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:user.isAdmin?"#000":"#fff"}},user.name.charAt(0).toUpperCase()),
      React.createElement("span",{style:{fontSize:12,fontWeight:700,color:T.text}},user.name.split(" ")[0]),
      user.isAdmin?React.createElement("span",{style:{background:"#f1c40f",color:"#000",fontSize:8,fontWeight:800,borderRadius:4,padding:"1px 5px"}},"ADMIN"):user.isPro&&React.createElement("span",{style:{background:T.purple,color:"#fff",fontSize:8,fontWeight:800,borderRadius:4,padding:"1px 5px"}},"PRO"),
      React.createElement("span",{style:{color:T.textDim,fontSize:10}},"v")
    ),
    open&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 6px)",right:0,background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,minWidth:200,zIndex:500,boxShadow:"0 8px 30px #0008",overflow:"hidden"}},
      React.createElement("div",{style:{padding:"12px 16px",borderBottom:"1px solid "+T.border}},
        React.createElement("div",{style:{fontWeight:700,fontSize:13}},user.name),
        React.createElement("div",{style:{fontSize:11,color:T.textSub}},user.email),
        React.createElement("div",{style:{marginTop:4,display:"flex",gap:4}},
          user.isAdmin&&React.createElement("span",{style:{background:"#f1c40f",color:"#000",fontSize:9,fontWeight:800,borderRadius:4,padding:"2px 7px"}},"ADMIN"),
          React.createElement("span",{style:{background:user.isPro?T.purple:"#374151",color:"#fff",fontSize:9,fontWeight:700,borderRadius:4,padding:"2px 7px"}},user.plan.toUpperCase())
        )
      ),
      user.isAdmin&&React.createElement("button",{onClick:function(){setOpen(false);onAdmin();},style:{width:"100%",padding:"11px 16px",background:T.purpleDim,border:"none",borderBottom:"1px solid "+T.border,cursor:"pointer",fontWeight:700,fontSize:12,color:"#f1c40f",textAlign:"left"}},"Admin Panel"),
      !user.isPro&&React.createElement("button",{onClick:function(){setOpen(false);onUpgrade();},style:{width:"100%",padding:"11px 16px",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,color:"#fff",textAlign:"left"}},"Upgrade to Pro"),
      React.createElement("button",{onClick:function(){setOpen(false);onSignOut();},style:{width:"100%",padding:"11px 16px",background:"none",border:"none",cursor:"pointer",fontSize:12,color:T.textSub,textAlign:"left"}},"Sign Out")
    )
  );
}

function SrchDrop(props){
  var T=props.T,q=props.value,setQ=props.onChange,excl=props.exclude,onSel=props.onSelect,ph=props.placeholder,pool=props.pool;
  var res=q?pool.filter(function(p){return p.name.toLowerCase().includes(q.toLowerCase())&&!excl.find(function(x){return x.name===p.name;});}).slice(0,8):[];
  var inpS={background:T.bgInput,color:T.text,border:"1px solid "+(q?T.borderPurple:T.border),borderRadius:10,padding:"12px 16px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};
  return React.createElement("div",{style:{position:"relative",flex:1}},
    React.createElement("input",{value:q,onChange:function(e){setQ(e.target.value);},placeholder:ph||"Search players or picks...",autoComplete:"off",style:inpS}),
    q&&res.length===0&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"14px 16px",boxShadow:"0 12px 40px #0009",fontSize:13,color:T.textDim,textAlign:"center"}},"No players found for \""+q+"\""),
    q&&res.length>0&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:12,overflow:"hidden",boxShadow:"0 12px 40px #0009"}},
      res.map(function(p,ri){
        var bg=ri%2===0?T.bgCard:T.bg;
        return React.createElement("button",{key:p.name,onClick:function(){onSel(p);setQ("");},style:{display:"flex",alignItems:"center",gap:10,width:"100%",background:bg,border:"none",borderBottom:"1px solid "+T.border,padding:"10px 14px",cursor:"pointer",textAlign:"left"},onMouseEnter:function(e){e.currentTarget.style.background=T.purple+"22";},onMouseLeave:function(e){e.currentTarget.style.background=bg;}},
          React.createElement(Avatar,{name:p.name,pos:p.pos,size:30}),
          React.createElement("div",{style:{flex:1}},React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},p.name),React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team||"",p.age?" Age "+p.age:"",p.rank&&p.rank<999?" #"+p.rank:"")),
          React.createElement("div",{style:{textAlign:"right"}},React.createElement(PBadge,{pos:p.pos}),React.createElement("div",{style:{fontSize:10,color:T.purpleLight,fontWeight:700,marginTop:2}},p.pos==="PICK"?p.est+" val":p.tradeVal+" val"))
        );
      })
    )
  );
}
function TradeItem(props){
  var T=props.T,item=props.item,onRemove=props.onRemove;
  return React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,background:T.bgInput,border:"1px solid "+T.border,borderRadius:10,padding:"8px 12px",marginBottom:6}},
    React.createElement(Avatar,{name:item.name,pos:item.pos,size:28}),
    React.createElement(PBadge,{pos:item.pos}),
    React.createElement("div",{style:{flex:1,minWidth:0}},React.createElement("div",{style:{fontWeight:700,fontSize:12,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},item.name)),
    React.createElement("span",{style:{fontWeight:700,fontSize:12,color:T.purpleLight,flexShrink:0}},item.pos==="PICK"?item.est+" val":item.tradeVal+" val"),
    React.createElement("button",{onClick:onRemove,style:{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:18,padding:"4px 6px",minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}},"×")
  );
}
// ── Analytics Dashboard Component ─────────────────────────────────────────
function AnalyticsDashboard({T,data,loading,onLoad}:{T:any,data:any,loading:boolean,onLoad:()=>void}){
  useEffect(function(){onLoad();},[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Build daily chart from raw page_view events
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

  var hasSupabase=!!(SUPA_URL&&SUPA_KEY);

  if(!hasSupabase) return React.createElement("div",{style:{padding:16}},
    React.createElement("div",{style:{background:T.bgCard,borderRadius:14,border:"1px solid "+T.border,padding:24,textAlign:"center"}},
      React.createElement("div",{style:{fontSize:28,marginBottom:12}},"📊"),
      React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text,marginBottom:8}},"Analytics Setup Required"),
      React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,marginBottom:20}},"Add Supabase credentials as GitHub Actions secrets to enable analytics:"),
      ["VITE_SUPABASE_URL","VITE_SUPABASE_ANON_KEY"].map(function(v){
        return React.createElement("div",{key:v,style:{background:T.bgInput,borderRadius:8,padding:"8px 12px",fontFamily:"monospace",fontSize:12,color:T.purple,marginBottom:8}},v);
      }),
      React.createElement("div",{style:{fontSize:12,color:T.textSub,marginTop:16,lineHeight:1.6}},"Then create the",React.createElement("code",{style:{color:T.purple,background:T.bgInput,padding:"1px 6px",borderRadius:4}},"analytics_events")," table in Supabase (SQL provided in console).")
    )
  );

  if(loading) return React.createElement("div",{style:{padding:40,textAlign:"center",color:T.textSub}},
    React.createElement("div",{style:{width:32,height:32,borderRadius:"50%",border:"3px solid "+T.purple+"30",borderTopColor:T.purple,animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}),
    "Loading analytics..."
  );

  if(!data) return React.createElement("div",{style:{padding:16,textAlign:"center",color:T.textSub}},"No data yet — visit the site to start collecting.");
  if(data.error) return React.createElement("div",{style:{padding:16}},
    React.createElement("div",{style:{background:"#ef444418",border:"1px solid #ef4444",borderRadius:12,padding:16,marginBottom:12}},
      React.createElement("div",{style:{fontWeight:800,fontSize:14,color:"#ef4444",marginBottom:6}},"Analytics Query Error"),
      React.createElement("div",{style:{fontSize:12,color:T.textSub,fontFamily:"monospace",wordBreak:"break-all"}},(data.error))),
    React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.7}},"This usually means the SELECT policy on ",React.createElement("code",null,"analytics_events")," doesn't allow the anon key. Run this in Supabase SQL editor:",React.createElement("pre",{style:{background:T.bgInput,borderRadius:8,padding:10,fontSize:11,marginTop:8,color:T.purple,overflowX:"auto"}},'DROP POLICY IF EXISTS "admin select" ON analytics_events;\nCREATE POLICY "anon select" ON analytics_events\n  FOR SELECT TO anon USING (true);')),
    React.createElement("button",{onClick:onLoad,style:{marginTop:12,padding:"10px 20px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textSub,cursor:"pointer",fontWeight:600,fontSize:13}},"\u21BB Retry")
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

  // Build user list from dedicated signed-in user events feed
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

  // Build anonymous visitor list from recent events (no user_email)
  var anonMap:Record<string,{vid:string,lastSeen:string,events:number,trades:number,lastAction:string}> = {};
  (data.recent||[]).forEach(function(e:any){
    var vid=e.visitor_id;
    if(!vid||e.event_data?.user_email) return; // skip signed-in users
    if(!anonMap[vid]) anonMap[vid]={vid,lastSeen:e.created_at,events:0,trades:0,lastAction:e.event_type};
    anonMap[vid].events++;
    if(e.event_type==="trade_analyzed"){anonMap[vid].trades++;anonMap[vid].lastAction="trade_analyzed";}
    if(e.created_at>anonMap[vid].lastSeen){anonMap[vid].lastSeen=e.created_at;anonMap[vid].lastAction=e.event_type;}
  });
  var anonList=Object.values(anonMap).sort(function(a,b){return b.lastSeen.localeCompare(a.lastSeen);});

  return React.createElement("div",{style:{padding:16}},
    // Header
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement("div",{style:{fontWeight:900,fontSize:20,color:T.text}},"Site Analytics"),
      React.createElement("div",{style:{fontSize:12,color:T.textSub,marginTop:2}},"Last 14 days · unique visitors")
    ),

    // Summary cards
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:6,marginBottom:20}},
      [["Today",todayVisitors,"📅"],["7d",weekVisitors,"📆"],["14d",totalUnique,"🗓️"],["All Time",data.totalVisitors,"👥"],["Trades",data.trades,"⚖️"]].map(function(s:any){
        return React.createElement("div",{key:s[0] as string,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 8px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:20,marginBottom:4}},s[2]),
          React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.purple}},s[1]),
          React.createElement("div",{style:{fontSize:10,color:T.textSub,fontWeight:600}},s[0])
        );
      })
    ),

    // Signed-in Users
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
        React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},"Signed-In Users"),
        React.createElement("div",{style:{fontSize:11,color:T.textSub}},userList.length+" users")
      ),
      userList.length===0
        ? React.createElement("div",{style:{fontSize:12,color:T.textSub,textAlign:"center",padding:"12px 0"}},"No signed-in user activity yet. Users must sign in before analyzing trades.")
        : userList.map(function(u:any,i:number){
            var when=new Date(u.lastSeen);
            var actionLabel=u.lastAction==="trade_analyzed"?"⚖️ Analyzed trade":u.lastAction==="tab_change"?"🔀 Browsed":u.lastAction==="page_view"?"🌐 Visited":"📌 "+u.lastAction;
            var isTrader=u.trades>0;
            return React.createElement("div",{key:u.email,style:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<userList.length-1?"1px solid "+T.border:"none"}},
              React.createElement("div",{style:{width:34,height:34,borderRadius:"50%",background:isTrader?"linear-gradient(135deg,"+T.purple+",#5b21b6)":T.purpleDim,border:"1px solid "+T.borderPurple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}},u.email.charAt(0).toUpperCase()),
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:12,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.email),
                React.createElement("div",{style:{fontSize:10,color:T.textSub,marginTop:2}},actionLabel+" · "+u.trades+" trades · "+when.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))
              ),
              isTrader&&React.createElement("div",{style:{background:T.purple+"22",border:"1px solid "+T.purple+"44",borderRadius:6,padding:"2px 7px",fontSize:9,fontWeight:800,color:T.purple,flexShrink:0}},u.trades+" trades")
            );
          })
    ),

    // Anonymous Visitors
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
        React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},"Anonymous Visitors"),
        React.createElement("div",{style:{fontSize:11,color:T.textSub}},anonList.length+" unique")
      ),
      anonList.length===0
        ? React.createElement("div",{style:{fontSize:12,color:T.textSub,textAlign:"center",padding:"12px 0"}},"No recent anonymous activity.")
        : anonList.slice(0,20).map(function(u:any,i:number){
            var when=new Date(u.lastSeen);
            var actionLabel=u.lastAction==="trade_analyzed"?"⚖️ Analyzed trade":u.lastAction==="tab_change"?"🔀 Browsed":"🌐 Visited";
            return React.createElement("div",{key:u.vid,style:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<Math.min(anonList.length,20)-1?"1px solid "+T.border:"none"}},
              React.createElement("div",{style:{width:30,height:30,borderRadius:"50%",background:T.bgInput,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textDim,flexShrink:0}},"?"),
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:11,color:T.textSub,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.vid),
                React.createElement("div",{style:{fontSize:10,color:T.textDim,marginTop:2}},actionLabel+" · "+u.events+" events"+(u.trades?" · "+u.trades+" trades":"")+" · "+when.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))
              ),
              u.trades>0&&React.createElement("div",{style:{background:T.green+"22",border:"1px solid "+T.green+"44",borderRadius:6,padding:"2px 7px",fontSize:9,fontWeight:800,color:T.green,flexShrink:0}},u.trades+" trades")
            );
          })
    ),

    // Daily bar chart
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text,marginBottom:12}},"Daily Unique Visitors"),
      React.createElement("div",{style:{display:"flex",alignItems:"flex-end",gap:3,height:80}},
        daily.map(function(d:any){
          var h=Math.max(4,Math.round((d.count/maxDay)*76));
          var isToday=d.day===todayKey;
          return React.createElement("div",{key:d.day,style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}},
            d.count>0&&React.createElement("div",{style:{fontSize:8,color:T.textSub,lineHeight:1}},d.count),
            React.createElement("div",{title:d.day+" · "+d.count+" visitors",style:{width:"100%",height:h,borderRadius:3,background:isToday?T.purple:T.purple+"55",transition:"height 0.3s"}})
          );
        })
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginTop:6}},
        React.createElement("div",{style:{fontSize:9,color:T.textDim}},daily[0]?.day?.slice(5)),
        React.createElement("div",{style:{fontSize:9,color:T.textDim,fontWeight:700}},"Today")
      )
    ),

    // Total trades
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:12,color:T.textSub,fontWeight:600}},"Total Trades Analyzed"),
        React.createElement("div",{style:{fontSize:24,fontWeight:900,color:T.green}},data.trades.toLocaleString())
      ),
      React.createElement("div",{style:{fontSize:32}},"⚖️")
    ),

    // Feature usage
    features.length>0&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text,marginBottom:12}},"Feature Usage (14 days)"),
      features.map(function(f:any){
        var pct=Math.round((f[1]/maxFeat)*100);
        return React.createElement("div",{key:f[0],style:{marginBottom:10}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
            React.createElement("div",{style:{fontSize:12,color:T.text,fontWeight:600,textTransform:"capitalize"}},f[0]),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},f[1]+" taps")
          ),
          React.createElement("div",{style:{height:6,background:T.bgInput,borderRadius:3,overflow:"hidden"}},
            React.createElement("div",{style:{height:"100%",width:pct+"%",background:T.purple,borderRadius:3,transition:"width 0.4s"}})
          )
        );
      })
    ),

    // Recent events
    data.recent&&data.recent.length>0&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}},"Recent Activity"),
      data.recent.slice(0,10).map(function(e:any,i:number){
        var when=new Date(e.created_at);
        var label=e.event_type==="page_view"?"🌐 Page View":e.event_type==="tab_change"?"🔀 Tab: "+e.event_data?.tab:e.event_type==="trade_analyzed"?"⚖️ Trade Analyzed":"📌 "+e.event_type;
        var userEmail=e.event_data?.user_email||"";
        return React.createElement("div",{key:i,style:{padding:"7px 0",borderBottom:i<9?"1px solid "+T.border:"none"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("div",{style:{fontSize:12,color:T.text,fontWeight:600}},label),
            React.createElement("div",{style:{fontSize:10,color:T.textSub}},when.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))
          ),
          userEmail&&React.createElement("div",{style:{fontSize:10,color:T.purple,marginTop:2}},userEmail)
        );
      })
    ),

    // Platform Trades Feed
    React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"14px 12px",marginBottom:16}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},"⚖️ All Platform Trades"),
          React.createElement("div",{style:{fontSize:10,color:T.textSub,marginTop:2}},"Every trade analyzed across the platform")
        ),
        React.createElement("div",{style:{background:T.purple+"22",border:"1px solid "+T.purple+"44",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,color:T.purple}},(data.platformTrades||[]).length+" trades")
      ),
      (data.platformTrades||[]).length===0
        ? React.createElement("div",{style:{textAlign:"center",padding:"20px 0",fontSize:12,color:T.textSub}},"No trades logged yet.")
        : (data.platformTrades||[]).map(function(e:any,i:number){
            var d=e.event_data||{};
            var sideA:string[]=(d.sideA||[]);
            var sideB:string[]=(d.sideB||[]);
            var when=new Date(e.created_at);
            var email=d.user_email||null;
            return React.createElement("div",{key:i,style:{padding:"10px 0",borderBottom:i<(data.platformTrades.length-1)?"1px solid "+T.border:"none"}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" as any}},
                  email
                    ? React.createElement("div",{style:{fontSize:11,fontWeight:700,color:T.purple}},email)
                    : React.createElement("div",{style:{fontSize:11,color:T.textDim}},"Anonymous"),
                  d.scoring&&React.createElement("div",{style:{fontSize:9,background:T.bgInput,borderRadius:4,padding:"1px 5px",color:T.textSub,fontWeight:600}},d.scoring),
                  d.platform&&React.createElement("div",{style:{fontSize:9,background:d.platform==="iOS"?"#1d4ed8"+"22":d.platform==="Android"?"#15803d"+"22":T.bgInput,borderRadius:4,padding:"1px 5px",color:d.platform==="iOS"?"#60a5fa":d.platform==="Android"?"#4ade80":T.textSub,fontWeight:600}},d.platform==="iOS"?"📱 iOS":d.platform==="Android"?"🤖 Android":"🖥️ Web"),
                  d.device&&React.createElement("div",{style:{fontSize:9,background:T.bgInput,borderRadius:4,padding:"1px 5px",color:T.textSub,fontWeight:600}},d.device),
                  (d.country&&d.country!=="Unknown")&&React.createElement("div",{style:{fontSize:9,background:T.bgInput,borderRadius:4,padding:"1px 5px",color:T.textSub,fontWeight:600}},d.flag+" "+(d.city?d.city+", ":"")+d.country)
                ),
                React.createElement("div",{style:{fontSize:10,color:T.textDim}},when.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))
              ),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center"}},
                React.createElement("div",{style:{background:T.bgInput,borderRadius:8,padding:"6px 8px"}},
                  React.createElement("div",{style:{fontSize:9,color:T.textSub,fontWeight:700,marginBottom:3}},"TEAM A GIVES"),
                  sideA.length>0
                    ? sideA.map(function(name:string,j:number){return React.createElement("div",{key:j,style:{fontSize:11,color:T.text,fontWeight:600,marginBottom:1}},name);})
                    : React.createElement("div",{style:{fontSize:10,color:T.textDim}},"—")
                ),
                React.createElement("div",{style:{fontSize:12,color:T.textDim,fontWeight:700}},"⇄"),
                React.createElement("div",{style:{background:T.bgInput,borderRadius:8,padding:"6px 8px"}},
                  React.createElement("div",{style:{fontSize:9,color:T.textSub,fontWeight:700,marginBottom:3}},"TEAM B GIVES"),
                  sideB.length>0
                    ? sideB.map(function(name:string,j:number){return React.createElement("div",{key:j,style:{fontSize:11,color:T.text,fontWeight:600,marginBottom:1}},name);})
                    : React.createElement("div",{style:{fontSize:10,color:T.textDim}},"—")
                )
              )
            );
          })
    ),

    // Refresh button
    React.createElement("button",{onClick:onLoad,style:{width:"100%",padding:"12px",borderRadius:12,border:"1px solid "+T.border,background:"transparent",color:T.textSub,cursor:"pointer",fontWeight:600,fontSize:13}},"↻ Refresh")
  );
}

export default function App(){
  var validTabs=["trade","league","rankings","reports","admin"];
  var [tab,setTabRaw]=useState(function(){var h=window.location.hash.replace("#","");return validTabs.includes(h)?h:"trade";});
  function setTab(t:string){setTabRaw(t);window.location.hash=t;}
  var [isDesktop,setIsDesktop]=useState(function(){return window.innerWidth>=1024;});
  useEffect(function(){
    function onResize(){setIsDesktop(window.innerWidth>=1024);}
    window.addEventListener("resize",onResize);
    return function(){window.removeEventListener("resize",onResize);};
  },[]);
  // Load shared trade from URL param
  useEffect(function(){
    try{
      var p=new URLSearchParams(window.location.search);
      var t=p.get("trade");
      if(!t)return;
      var d=JSON.parse(atob(t));
      if(d.a&&Array.isArray(d.a)){var pa=d.a.map(function(n:string){return PLAYERS.find(function(p){return p.name===n;});}).filter(Boolean);if(pa.length)setTradeA(pa as any[]);}
      if(d.b&&Array.isArray(d.b)){var pb=d.b.map(function(n:string){return PLAYERS.find(function(p){return p.name===n;});}).filter(Boolean);if(pb.length)setTradeB(pb as any[]);}
      if(d.s)setScoring(d.s);
      if(d.fa)setFaabA(d.fa);
      if(d.fb)setFaabB(d.fb);
      setTab("trade");
      // Clean URL without reload
      window.history.replaceState({},"",window.location.pathname+"#trade");
    }catch(e){}
  },[]);// eslint-disable-line react-hooks/exhaustive-deps
  // Auth state sync with Supabase
  useEffect(function(){
    if(!authClient)return;
    var {data:{subscription}}=authClient.auth.onAuthStateChange(async function(event,session){
      if(event==="SIGNED_OUT"||!session){saveAndSetUser(null);return;}
      if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED"){
        var usr=session.user;
        var {data:prof}=await authClient.from("users").select("*").eq("id",usr.id).single();
        var isAdmin2=["jacklawrence713@gmail.com","theprez@yahoo.com","modgy28@hotmail.com","sbesk787@gmail.com","starrrya@yahoo.com"].includes(usr.email||"");
        saveAndSetUser({id:usr.id,name:prof?.name||usr.user_metadata?.name||usr.email||"",email:usr.email||"",plan:isAdmin2?"elite":(prof?.plan||"free"),isPro:prof?.is_pro||isAdmin2,isAdmin:isAdmin2,token:session.access_token});
      }
    });
    return function(){subscription.unsubscribe();};
  },[]);// eslint-disable-line react-hooks/exhaustive-deps
  // Checkout success detection
  useEffect(function(){
    var p=new URLSearchParams(window.location.search);
    if(p.get("checkout")==="success"){
      window.history.replaceState({},"",window.location.pathname+window.location.hash);
      // Refresh user profile from DB after successful checkout, then send welcome_pro email
      if(authClient){authClient.auth.getSession().then(async function({data:{session}}){if(!session)return;var {data:prof}=await authClient.from("users").select("*").eq("id",session.user.id).single();if(prof){saveAndSetUser(function(u){return Object.assign({},u,{plan:prof.plan,isPro:prof.is_pro,subscriptionStatus:prof.subscription_status});});try{await callEdgeFn("send-email",{type:"welcome_pro",userId:session.user.id});}catch(e){}}})}
    }
  },[]);// eslint-disable-line react-hooks/exhaustive-deps
  var leagueTabsRef=React.useRef<HTMLDivElement>(null);
  var rankingTabsRef=React.useRef<HTMLDivElement>(null);
  var reportsTabsRef=React.useRef<HTMLDivElement>(null);
  var adminTabsRef=React.useRef<HTMLDivElement>(null);
  var [leagueType,setLeagueType]=useState("Dynasty");
  var [format,setFormat]=useState("PPR");
  var [teams,setTeams]=useState(12);
  var [budget,setBudget]=useState(200);
  var [ffab,setFfab]=useState(100);
  var [sortBy,setSortBy]=useState("rank");
  var [search,setSearch]=useState("");
  var [posFilter,setPosFilter]=useState("ALL");
  var [tradeA,setTradeA]=useState([]);
  var [tradeB,setTradeB]=useState([]);
  var [tSrchA,setTSrchA]=useState("");
  var [tSrchB,setTSrchB]=useState("");
  var [tradeRosterSide,setTradeRosterSide]=useState<"A"|"B"|null>(null);
  var [tradeRosterTeam,setTradeRosterTeam]=useState(0);
  var [faabA,setFaabA]=useState(0);
  var [faabB,setFaabB]=useState(0);
  var [analyzed,setAnalyzed]=useState(false);
  var [tradeCount,setTradeCount]=useState(function(){try{var s=localStorage.getItem('fdp_tc_v1');return s?+s:0;}catch(e){return 0;}});
  var [impTab,setImpTab]=useState("sleeper");
  var [slUser,setSlUser]=useState("");
  var [impStatus,setImpStatus]=useState(null);
  var [impData,setImpData]=useState(null);
  var [impErr,setImpErr]=useState("");
  var [impRoster,setImpRoster]=useState([]);
  var [manRaw,setManRaw]=useState("");
  var [manMatched,setManMatched]=useState([]);
  var [espnId,setEspnId]=useState("");
  var [mflId,setMflId]=useState("");
  var [faqOpen,setFaqOpen]=useState(null);
  var [reportSubTab,setReportSubTab]=useState("dynasty");
  var [newsFilter,setNewsFilter]=useState("all");
  var [billingPeriod,setBillingPeriod]=useState("yearly");
  var [adminSubTab,setAdminSubTab]=useState("system");
  var [analyticsData,setAnalyticsData]=useState<any>(null);
  var [analyticsLoading,setAnalyticsLoading]=useState(false);
  var [adminSyncSel,setAdminSyncSel]=useState("");
  var [rebuildConfirmed,setRebuildConfirmed]=useState(false);
  var [rebuildDone,setRebuildDone]=useState(false);
  var [valueTunerLayer,setValueTunerLayer]=useState("format");
  var [adminTvMult,setAdminTvMult]=useState(function(){try{var s=localStorage.getItem('fdp_tvm_v2');return s?+s:80;}catch(e){return 80;}});
  var [adminTvDraft,setAdminTvDraft]=useState(null);
  var [adminSyncStatus,setAdminSyncStatus]=useState({syncing:false,lastSync:null,type:null});
  var [adminHsQuery,setAdminHsQuery]=useState("");
  var [rbAiGenerating,setRbAiGenerating]=useState(false);
  var [rbAiSuggestions,setRbAiSuggestions]=useState<any[]>([]);
  var [publicStats,setPublicStats]=useState<{visitors:number,trades:number}|null>(null);
  var [healthCheckedAt,setHealthCheckedAt]=useState(Date.now());
  var [contactName,setContactName]=useState("");
  var [contactEmail,setContactEmail]=useState("");
  var [contactSubject,setContactSubject]=useState("");
  var [contactMsg,setContactMsg]=useState("");
  var [contactSent,setContactSent]=useState(false);
  var [user,setUser]=useState(function(){try{var s=localStorage.getItem('fdp_user_v1');if(s){var u=JSON.parse(s);setTrackedUser(u?.email||"");return u;}return null;}catch(e){return null;}});
  function saveAndSetUser(u){try{if(u)localStorage.setItem('fdp_user_v1',JSON.stringify(u));else localStorage.removeItem('fdp_user_v1');if(u?.isPro){localStorage.removeItem('fdp_tc_v1');}}catch(e){}setUser(u);setTrackedUser(u?.email||"");if(u?.isPro)setTradeCount(0);}
  async function handleCheckout(plan:string,billing:string){
    if(!user){setAuthMode("signup");setShowAuth(true);return;}
    try{
      var result=await callEdgeFn("create-checkout",{plan,billing,successUrl:window.location.origin+window.location.pathname+"?checkout=success"+window.location.hash,cancelUrl:window.location.href},user.token);
      if(result.url)window.location.href=result.url;
      else setImpErr("Checkout unavailable — please try again or contact support.");
    }catch(e){setImpErr("Checkout unavailable — please try again or contact support.");}
  }
  var [showAuth,setShowAuth]=useState(false);
  var [authMode,setAuthMode]=useState("signup");
  var [showAdmin,setShowAdmin]=useState(false);
  var [darkMode,setDarkMode]=useState(function(){try{var s=localStorage.getItem('fdp_dark_v1');return s?JSON.parse(s):true;}catch(e){return true;}});
  function toggleDarkMode(){setDarkMode(function(d){var next=!d;try{localStorage.setItem('fdp_dark_v1',JSON.stringify(next));}catch(e){}return next;});}
  // League
  var [leagueSubTab,setLeagueSubTab]=useState("power");
  var [byeWeek,setByeWeek]=useState(1);
  var [waiverSearch,setWaiverSearch]=useState("");
  var [waiverPos,setWaiverPos]=useState("All Positions");
  var [waiverLoaded,setWaiverLoaded]=useState(false);
  var [adviceTeam,setAdviceTeam]=useState(0);
  var [lineupTeam,setLineupTeam]=useState(0);
  var [lineupOptimized,setLineupOptimized]=useState(false);
  var [rivalryTeam1,setRivalryTeam1]=useState("All Teams");
  var [rivalryTeam2,setRivalryTeam2]=useState("All Teams");
  var [rosterTeamIdx,setRosterTeamIdx]=useState(0);
  var [recapWeek,setRecapWeek]=useState("1");
  var [recapGenerated,setRecapGenerated]=useState(false);
  var [recapError,setRecapError]=useState(false);
  var [chatMessages,setChatMessages]=useState([]);
  var [chatInput,setChatInput]=useState("");
  var [notifications,setNotifications]=useState([]);
  var [leagueImportUser,setLeagueImportUser]=useState("");
  var [leagueImportStatus,setLeagueImportStatus]=useState(null);
  var [leagueImportData,setLeagueImportData]=useState(null);
  var [leagueImportErr,setLeagueImportErr]=useState("");
  var [importPlatform,setImportPlatform]=useState("sleeper");
  var [espnLeagueId,setEspnLeagueId]=useState("");
  var [espnYear,setEspnYear]=useState("2026");
  var [espnS2,setEspnS2]=useState(function(){try{return localStorage.getItem('fdp_espn_s2')||"";}catch(e){return "";}});
  var [espnSWID,setEspnSWID]=useState(function(){try{return localStorage.getItem('fdp_espn_swid')||"";}catch(e){return "";}});
  var [espnWorkerUrl,setEspnWorkerUrl]=useState("https://espn-proxy.fantasydraftpros.workers.dev");
  var [manualRosterText,setManualRosterText]=useState("");
  var [importedTeams,setImportedTeams]=useState(function(){try{var s=localStorage.getItem('fdp_teams_v1');return s?JSON.parse(s):null;}catch(e){return null;}});
  function saveAndSetImportedTeams(teams){try{if(teams)localStorage.setItem('fdp_teams_v1',JSON.stringify(teams));else localStorage.removeItem('fdp_teams_v1');}catch(e){}setImportedTeams(teams);}
  var [simCount,setSimCount]=useState("1,000 (Recommended)");
  var [simRan,setSimRan]=useState(false);
  var [simRunning,setSimRunning]=useState(false);
  var [simNotes,setSimNotes]=useState("");
  var [simSaved,setSimSaved]=useState(false);
  var [expandedTeam,setExpandedTeam]=useState(null);
  var [rosterViewTeam,setRosterViewTeam]=useState(null);
  var [strengthTeam,setStrengthTeam]=useState(null);
  var [activeLeague,setActiveLeague]=useState(function(){try{var s=localStorage.getItem('fdp_league_v1');return s?JSON.parse(s):null;}catch(e){return null;}});
  function saveAndSetActiveLeague(lg){try{if(lg)localStorage.setItem('fdp_league_v1',JSON.stringify(lg));else localStorage.removeItem('fdp_league_v1');}catch(e){}setActiveLeague(lg);}
  var [leagueRosters,setLeagueRosters]=useState(null);
  var [leagueUsers,setLeagueUsers]=useState(null);
  // Rankings
  var [rankSubTab,setRankSubTab]=useState("allrankings");
  var [rankPos,setRankPos]=useState("QB");
  var [rankFormat,setRankFormat]=useState("SF");
  var [pvTep,setPvTep]=useState(false);
  var [sfMode,setSfMode]=useState(false);
  var [pvPos,setPvPos]=useState("All");
  var [rankSearch,setRankSearch]=useState("");
  var [rankTeamFilter,setRankTeamFilter]=useState("All Teams");
  var [rankIdpPos,setRankIdpPos]=useState("DL");
  var [watchlist,setWatchlist]=useState(function(){try{var s=localStorage.getItem('fdp_wl_v1');return s?JSON.parse(s):[];}catch(e){return [];}});
  var [valueTrendsPos,setValueTrendsPos]=useState("QB");
  var [trendingFilter,setTrendingFilter]=useState("all");
  var [marketFilter,setMarketFilter]=useState("buylow");
  var [marketPos,setMarketPos]=useState("All Positions");
  var [marketSearch,setMarketSearch]=useState("");
  var [valueTrendSearch,setValueTrendSearch]=useState("");
  var [pickYear,setPickYear]=useState("2026 Draft");
  var [draftKitLoaded,setDraftKitLoaded]=useState(true);
  var [draftKitPos,setDraftKitPos]=useState("All Positions");
  var [draftKitSearch,setDraftKitSearch]=useState("");
  var [drafted,setDrafted]=useState([]);
  var [keeperTeam,setKeeperTeam]=useState(0);
  var [keeperLimit,setKeeperLimit]=useState(3);
  var [keeperCost,setKeeperCost]=useState(1000);
  var [keeperCalced,setKeeperCalced]=useState(false);
  var [compareP1,setCompareP1]=useState(null);
  var [compareP2,setCompareP2]=useState(null);
  var [compareS1,setCompareS1]=useState("");
  var [compareS2,setCompareS2]=useState("");
  var [sitP1,setSitP1]=useState(null as any);
  var [sitP2,setSitP2]=useState(null as any);
  var [sitS1,setSitS1]=useState("");
  var [sitS2,setSitS2]=useState("");
  var [sitFormat,setSitFormat]=useState("PPR");
  var [oddsData,setOddsData]=useState<{[t:string]:{spread:number,total:number,opp:string}}|null>(null);
  var [tradeHistory,setTradeHistory]=useState(function(){try{var s=localStorage.getItem('fdp_th_v1');return s?JSON.parse(s):[];}catch(e){return [];}});
  var [tradeSaved,setTradeSaved]=useState(false);
  var [aiAnalysis,setAiAnalysis]=useState("");
  var [showShareModal,setShowShareModal]=useState(false);
  var [shareCopied,setShareCopied]=useState(false);
  var [sleeperTrending,setSleeperTrending]=useState(null);
  var [sleeperRawDb,setSleeperRawDb]=useState(function(){try{var c=localStorage.getItem('fdp_sp_v1');if(c){var d=JSON.parse(c);initSleeperNameMap(d);return d;}return{};}catch(e){return{};}});
  var [leagueTrades,setLeagueTrades]=useState(null);
  var [leagueTradesLoading,setLeagueTradesLoading]=useState(false);
  var [auctionNoms,setAuctionNoms]=useState([]);
  var [auctionBudget,setAuctionBudget]=useState(200);
  var [auctionTeams,setAuctionTeams]=useState(10);
  var [auctionSearch,setAuctionSearch]=useState("");
  var [auctionBidAmt,setAuctionBidAmt]=useState("");
  var [auctionBidPlayer,setAuctionBidPlayer]=useState(null);
  var [auctionMine,setAuctionMine]=useState(false);
  var [auctionPosFilter,setAuctionPosFilter]=useState("ALL");
  var [auctionView,setAuctionView]=useState("board"); // "board" | "myroster"
  var [histSearch,setHistSearch]=useState("");
  var [showSettings,setShowSettings]=useState(false);
  var [tePremium,setTePremium]=useState(function(){try{var s=localStorage.getItem('fdp_tep_v1');return s?+s:0;}catch(e){return 0;}});
  var [customPPRVal,setCustomPPRVal]=useState(function(){try{var s=localStorage.getItem('fdp_ppr_v1');return s?+s:1;}catch(e){return 1;}});
  var [pickCalcSearch,setPickCalcSearch]=useState("");
  var [pickCalcPlayer,setPickCalcPlayer]=useState(null);
  var [sleeperStats,setSleeperStats]=useState(null);
  var [sleeperStatsLoading,setSleeperStatsLoading]=useState(false);
  var [watchlistSearch,setWatchlistSearch]=useState("");
  var [liveProj,setLiveProj]=useState(function(){try{var s=localStorage.getItem('fdp_lp_v1');if(s){var d=JSON.parse(s);if(Date.now()-d.ts<86400000)return d;}return null;}catch(e){return null;}});
  var [liveProjLoading,setLiveProjLoading]=useState(false);

  var T=darkMode?DARK:LIGHT;
  var isPro=user&&user.isPro;
  var isDynasty=leagueType==="Dynasty";
  var isSF=sfMode;
  var sKey=isDynasty?"PPR":(format==="Half"?"Half":(format==="Standard"?"Standard":"PPR"));
  var scoring=leagueType+" · "+(sfMode?"Superflex ":"")+(format==="Half"?"Half PPR":format==="Standard"?"Standard":"PPR");

  var rankedPlayers=useMemo(function(){
    var bl=getBaselines(teams,isSF);
    var byPos={};
    UNQ.forEach(function(p){if(!byPos[p.pos])byPos[p.pos]=[];byPos[p.pos].push(p);});
    var baseVal={};
    Object.keys(byPos).forEach(function(pos){
      var s=byPos[pos].slice().sort(function(a,b){return b.proj[sKey]-a.proj[sKey];});
      baseVal[pos]=s[Math.min((bl[pos]||teams)-1,s.length-1)]?s[Math.min((bl[pos]||teams)-1,s.length-1)].proj[sKey]:0;
    });
    // Deeper baselines for auction values — accounts for bench spots (5 RB/WR slots, 2 QB/TE)
    var abl={QB:isSF?teams*3:teams*2,RB:teams*5,WR:teams*5,TE:teams*2,K:teams,DST:teams,DL:teams*2,LB:teams*2,DB:teams*2};
    var aBaseVal={};
    Object.keys(byPos).forEach(function(pos){
      var s=byPos[pos].slice().sort(function(a,b){return b.proj[sKey]-a.proj[sKey];});
      var idx=Math.min((abl[pos]||teams*2)-1,s.length-1);
      aBaseVal[pos]=s[idx]?s[idx].proj[sKey]:0;
    });
    var list=UNQ.map(function(p){
      var pts=p.proj[sKey]||p.proj["PPR"]||0;
      // Blend live weekly projection into season projection (remaining weeks scale)
      if(liveProj&&liveProj.map){
        var pid=SLEEPER_IDS[p.name];
        if(pid&&liveProj.map[pid]){
          var wkPts=sKey==="PPR"?liveProj.map[pid].ppr:sKey==="Half"?liveProj.map[pid].half:liveProj.map[pid].std;
          // Replace base pts with live weekly projection scaled to season (17 weeks) plus position rank blend
          if(wkPts>0) pts=Math.round(wkPts*17*0.72+pts*0.28);
        }
      }
      if(p.pos==="TE"&&tePremium>0){var estRec=p.proj["PPR"]&&p.proj["Standard"]?Math.round((p.proj["PPR"]-p.proj["Standard"])*0.7):p.posRank<=5?80:p.posRank<=12?55:35;pts+=tePremium*estRec;}
      if(isDynasty) pts=pts*dynastyBonus(p.pos,p.age);
      // KTC override: scale confirmed KTC values to pts range for accurate dynasty ranking
      if(isDynasty&&p.ktcVal) pts=p.ktcVal*0.037;
      var raw=pts-(baseVal[p.pos]||0);
      var vbd=isSF&&p.pos==="QB"?raw*1.38:raw;
      // Auction VBD uses deeper baselines so more players share the pool
      var aRaw=pts-(aBaseVal[p.pos]||0);
      var aVbd=isSF&&p.pos==="QB"?aRaw*1.38:aRaw;
      return Object.assign({},p,{pts:+pts.toFixed(1),vbd:+vbd.toFixed(1),aVbd:+Math.max(0,aVbd).toFixed(1),ag:ageGrade(p.pos,p.age)});
    });
    list.sort(function(a,b){return b.vbd-a.vbd;});
    var totVbd=list.reduce(function(s,p){return s+Math.max(0,p.vbd);},0)||1;
    var aTotVbd=list.reduce(function(s,p){return s+(p.aVbd||0);},0)||1;
    var prc={};
    list.forEach(function(p,i){
      prc[p.pos]=(prc[p.pos]||0)+1;
      p.posRank=prc[p.pos];p.rank=i+1;
      p.tier=tierLabel(p.posRank,p.pos);
      p.scarcity=scarcityLabel(p.posRank,bl[p.pos]||teams);
      p.auction=p.aVbd>0?Math.max(1,Math.round((p.aVbd/aTotVbd)*(budget*teams-teams*15)*0.88+1)):1;
      if(p.pos==="K"||p.pos==="DST") p.auction=Math.min(p.auction,5);
      p.ffabVal=p.vbd>0?Math.max(1,Math.round((p.vbd/totVbd)*ffab*4)):1;
      var baseTV=Math.round(p.vbd*adminTvMult);
      if(isDynasty){
        // Dynasty: KTC-fitted curves. Derived from confirmed KTC data points:
        //   RB: Judkins(RB7)=6400, Skattebo(RB9)=5405 → dc=0.919, pk=10659
        //   TE: Loveland(TE3)=6627, Fannin(TE4)=5522  → dc=0.833, pk=8756
        //   WR: JSN(WR1)=9950                          → dc=0.927, pk=9950
        //   QB: Dart(QB9,SF)=5461                      → dc=0.927, pk=9200
        // Age factor applied linearly (ab, not ab²) — matches KTC methodology
        var isIDP=p.pos==="DL"||p.pos==="LB"||p.pos==="DB";
        var cfg=p.pos==="QB"?(isSF?{pk:7660,dc:0.927}:{pk:5800,dc:0.912})
          :p.pos==="RB"?{pk:9987,dc:0.921}
          :p.pos==="TE"?{pk:8756,dc:0.833}
          :p.pos==="DL"?{pk:5500,dc:0.940}
          :p.pos==="LB"?{pk:4500,dc:0.935}
          :p.pos==="DB"?{pk:4200,dc:0.930}
          :{pk:9950,dc:0.927}; // WR
        var rv=cfg.pk*Math.pow(cfg.dc,p.posRank-1);
        var ab=dynastyBonus(p.pos,p.age);
        // Linear age factor (not squared) — derived from KTC data
        var rankVal=Math.round(Math.max(100,(isSF&&p.pos==="QB")?rv*ab:Math.min(9500,rv*ab)));
        // IDP proj values are smaller in absolute terms than offensive players — use lower multiplier
        var rawFloor=p.pos!=="QB"?Math.round((p.proj[sKey]||0)*(isIDP?5:15)*ab):0;
        var formulaVal=p.pos!=="QB"?Math.max(rankVal,Math.min(3500,rawFloor)):rankVal;
        // KTC anchor + FDP age intelligence: apply dynastyBonus on top of KTC base
        // ab=1 for prime-age players (no change), youth gets slight boost, aging gets discount
        var sfQbBoost=(isSF&&p.pos==="QB")?1.25:1;
        var rawVal=Math.round(p.ktcVal*ab*sfQbBoost);
        p.tradeVal=p.ktcVal?(isSF&&p.pos==="QB"?rawVal:Math.min(9999,rawVal)):formulaVal;
      } else {
        // Redraft (PPR/Half/Standard/Superflex): VBD-based with position-rank floor
        // Floor prevents depth players from cliffing to 10 when below baseline
        // Mirrors dynasty scale so values look consistent across format switches
        var isIDPrd=p.pos==="DL"||p.pos==="LB"||p.pos==="DB";
        var rdPk=p.pos==="QB"?(isSF?7000:3500)
          :p.pos==="RB"?8000
          :p.pos==="TE"?5000
          :p.pos==="K"||p.pos==="DST"?2500
          :p.pos==="DL"?4000
          :p.pos==="LB"?3000
          :p.pos==="DB"?2800
          :7500; // WR
        var rdDc=p.pos==="TE"?0.850:0.900;
        var rdFloor=Math.round(Math.max(100,rdPk*Math.pow(rdDc,p.posRank-1)));
        p.tradeVal=Math.max(rdFloor,Math.min(9500,Math.max(100,baseTV)));
      }
    });
    return list;
  },[leagueType,format,teams,budget,ffab,sKey,isDynasty,isSF,tePremium,liveProj,adminTvMult]);

  var tradePool=useMemo(function(){return rankedPlayers.concat(DRAFT_PICKS.map(makePick));},[rankedPlayers]);

  var sleeperIdToPlayer=useMemo(function(){
    var m={};
    // Fill all Sleeper players from raw DB first (name only, tradeVal:0)
    Object.keys(sleeperRawDb).forEach(function(id){
      var sp=sleeperRawDb[id];
      if(sp&&sp.name) m[id]={name:sp.name,pos:sp.pos||"?",team:sp.team||"FA",tradeVal:0,ag:{g:"—",c:"#888"},tier:{t:"—",c:"#888"}};
    });
    // Override with ranked players (full FDP values)
    rankedPlayers.forEach(function(p){var id=SLEEPER_IDS[p.name];if(id)m[id]=p;});
    return m;
  },[rankedPlayers,sleeperRawDb]);

  var powerRankingTeams=useMemo(function(){
    if(!importedTeams) return null;
    var byName={};
    rankedPlayers.forEach(function(p){byName[p.name.toLowerCase()]=p;});
    return importedTeams.map(function(team){
      var fresh=(team.players||[]).map(function(p){return byName[p.name.toLowerCase()]||p;});
      fresh.sort(function(a,b){return (b.tradeVal||0)-(a.tradeVal||0);});
      var tv=fresh.reduce(function(s,p){return s+(p.tradeVal||0);},0);
      return Object.assign({},team,{players:fresh,totalVal:tv});
    });
  },[importedTeams,rankedPlayers]);

  // Auto-refresh Sleeper rosters on page load if a league was previously connected
  useEffect(function(){
    if(activeLeague&&activeLeague.league_id&&!activeLeague.league_id.startsWith("espn_")&&activeLeague.league_id!=="manual"){
      connectLeague(activeLeague);
    }
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  // Track page view on mount (once per session) + load public stats
  useEffect(function(){
    var key="fdp_tracked_"+new Date().toDateString();
    if(!sessionStorage.getItem(key)){
      sessionStorage.setItem(key,"1");
      trackEvent("page_view",{referrer:document.referrer||"direct",path:window.location.pathname});
    }
    loadPublicStats().then(function(s){if(s)setPublicStats(s);});
    fetchOdds().then(function(d){if(Object.keys(d).length>0)setOddsData(d);});
  },[]);

  function doEspnImport(){
    if(!espnLeagueId.trim())return;
    setLeagueImportStatus("loading");setLeagueImportErr("");
    var yr=espnYear||"2025";
    var apiUrl="https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/"+yr+"/segments/0/leagues/"+espnLeagueId.trim()+"?view=mRoster&view=mTeam&view=mSettings&view=mMembers";
    var workerUrl=espnWorkerUrl.trim();
    var hasCookies=espnS2.trim()&&espnSWID.trim();
    // Save cookies for next time
    try{if(espnS2.trim())localStorage.setItem('fdp_espn_s2',espnS2.trim());if(espnSWID.trim())localStorage.setItem('fdp_espn_swid',espnSWID.trim());}catch(e){}
    function tryNext(proxies,idx){
      if(idx>=proxies.length){setLeagueImportErr("Import failed. If using a private league, make sure your Worker URL is set and your espn_s2 / SWID cookies are correct.");setLeagueImportStatus("error");return;}
      var p=proxies[idx];
      fetch(p.url,p.opts)
        .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
        .then(function(data){if(data.error)throw new Error(data.error);return data;})
        .then(processEspnData)
        .catch(function(){tryNext(proxies,idx+1);});
    }
    var proxies;
    if(workerUrl&&hasCookies){
      // Use deployed Cloudflare Worker — server-side cookie auth, most reliable
      proxies=[{
        url:workerUrl.replace(/\/$/,""),
        opts:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leagueId:espnLeagueId.trim(),year:yr,espn_s2:espnS2.trim(),swid:espnSWID.trim()})}
      }];
    } else {
      // Public league — direct fetch
      proxies=[{url:apiUrl,opts:{credentials:"omit"}}];
    }
    function processEspnData(data){
      // Debug: log first team object to inspect field names
      // Build member ID → display name map
      var memberMap={};
      (data.members||[]).forEach(function(m){
        var display=m.displayName||(((m.firstName||"")+" "+(m.lastName||"")).trim())||m.id||"";
        memberMap[m.id]=display;
      });
      var teams=(data.teams||[]).map(function(t){
        // Try every known ESPN field for team name
        var name=t.name||((t.location||"")+" "+(t.nickname||"")).trim()||t.abbrev||("Team "+t.id);
        // Try every known ESPN field for owner
        var ownerId=t.primaryOwner||(t.owners&&t.owners[0])||"";
        var owner=ownerId?memberMap[ownerId]||ownerId:"";
        var players=(t.roster&&t.roster.entries||[])
          .filter(function(e){var pid=e.playerPoolEntry&&e.playerPoolEntry.player&&e.playerPoolEntry.player.defaultPositionId;return pid!==5&&pid!==16;})
          .map(function(e){
            var fn=(e.playerPoolEntry&&e.playerPoolEntry.player&&e.playerPoolEntry.player.fullName)||"";
            return rankedPlayers.find(function(p){return p.name.toLowerCase()===fn.toLowerCase();})
              ||rankedPlayers.find(function(p){var parts=fn.toLowerCase().split(" ");return parts.length>1&&p.name.toLowerCase().includes(parts[parts.length-1]);});
          }).filter(Boolean);
        players.sort(function(a,b){return b.tradeVal-a.tradeVal;});
        var totalVal=players.reduce(function(s,p){return s+p.tradeVal;},0);
        var w=t.record&&t.record.overall&&t.record.overall.wins||0;
        var l=t.record&&t.record.overall&&t.record.overall.losses||0;
        return {name:name,owner:owner,players:players,totalVal:totalVal,faab:null,picks:0,wins:w,losses:l};
      });
      if(!teams.length){setLeagueImportErr("No teams found. If this is a private league, ESPN is blocking access — use Manual Import instead.");setLeagueImportStatus("error");return;}
      teams.sort(function(a,b){return b.totalVal-a.totalVal;});
      saveAndSetImportedTeams(teams);setLeagueRosters(null);setLeagueUsers(null);
      saveAndSetActiveLeague({league_id:"espn_"+espnLeagueId,name:(data.settings&&data.settings.name)||"ESPN League"});
      setLeagueImportStatus("connected");setLeagueSubTab("power");
    }
    tryNext(proxies,0);
  }

  function doManualImport(leagueName,teamsText){
    var lines=teamsText.split("\n").filter(function(l){return l.trim();});
    var teams=[];
    var cur=null;
    lines.forEach(function(line){
      if(line.startsWith("Team:")||line.startsWith("##")){
        if(cur)teams.push(cur);
        cur={name:line.replace(/^(Team:|##)\s*/,"").trim(),players:[],totalVal:0,faab:null,picks:0,wins:0,losses:0,owner:""};
      } else {
        if(!cur)cur={name:"My Team",players:[],totalVal:0,faab:null,picks:0,wins:0,losses:0,owner:""};
        var pName=line.trim().replace(/^\d+\.\s*/,"");
        var found=rankedPlayers.find(function(p){return p.name.toLowerCase()===pName.toLowerCase();})
          ||rankedPlayers.find(function(p){return p.name.toLowerCase().includes(pName.toLowerCase());});
        if(found&&!cur.players.find(function(p){return p.name===found.name;}))cur.players.push(found);
      }
    });
    if(cur)teams.push(cur);
    teams.forEach(function(t){t.players.sort(function(a,b){return b.tradeVal-a.tradeVal;});t.totalVal=t.players.reduce(function(s,p){return s+p.tradeVal;},0);});
    teams.sort(function(a,b){return b.totalVal-a.totalVal;});
    saveAndSetImportedTeams(teams);setLeagueRosters(null);setLeagueUsers(null);
    saveAndSetActiveLeague({league_id:"manual",name:leagueName||"My League"});
    setLeagueImportStatus("connected");setLeagueSubTab("power");
  }

  function connectLeague(lg){
    setLeagueImportStatus("connecting");setLeagueImportErr("");
    // Normalize name for fuzzy matching (strips Jr./Sr./II/III, apostrophes, dots)
    function normName(n){return (n||"").toLowerCase().replace(/[''`]/g,"'").replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv)$/,"").trim();}
    var playersPromise;
    try{var c=localStorage.getItem('fdp_sp_v1');if(c)playersPromise=Promise.resolve(JSON.parse(c));}catch(e){}
    if(!playersPromise){
      playersPromise=fetch("https://api.sleeper.app/v1/players/nfl").then(function(r){return r.json();}).then(function(data){
        var compact={};
        Object.keys(data).forEach(function(id){
          var p=data[id];
          if(p.full_name&&(p.active||p.team)){compact[id]={name:p.full_name,pos:(p.fantasy_positions&&p.fantasy_positions[0])||p.position||"?",team:p.team||"FA",age:p.age||0};}
        });
        try{localStorage.setItem('fdp_sp_v1',JSON.stringify(compact));}catch(e){}
        return compact;
      });
    }
    Promise.all([
      fetch("https://api.sleeper.app/v1/league/"+lg.league_id+"/rosters").then(function(r){if(!r.ok)throw new Error("Failed to load rosters");return r.json();}),
      fetch("https://api.sleeper.app/v1/league/"+lg.league_id+"/users").then(function(r){if(!r.ok)throw new Error("Failed to load users");return r.json();}),
      fetch("https://api.sleeper.app/v1/league/"+lg.league_id+"/traded_picks").then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}),
      playersPromise
    ]).then(function(results){
      var rosters=results[0],users=results[1],tradedPicks=results[2]||[],sleeperDb=results[3]||{};
      initSleeperNameMap(sleeperDb);setSleeperRawDb(sleeperDb);
      // Build lookup maps from rankedPlayers — exact name and normalized name
      var rpByName={},rpByNorm={};
      rankedPlayers.forEach(function(p){rpByName[p.name.toLowerCase()]=p;rpByNorm[normName(p.name)]=p;});
      // Map Sleeper position codes to our IDP positions
      function mapSleeperPos(sp){var p=sp||"?";if(p==="DE"||p==="DT"||p==="EDGE"||p==="NT")return "DL";if(p==="LB"||p==="ILB"||p==="OLB"||p==="MLB")return "LB";if(p==="CB"||p==="S"||p==="FS"||p==="SS"||p==="DB")return "DB";return p;}
      // Map every Sleeper player ID to our player object (or a stub)
      var idMap={};
      Object.keys(sleeperDb).forEach(function(id){
        var sp=sleeperDb[id];
        var nm=sp.name||"";
        var match=rpByName[nm.toLowerCase()]||rpByNorm[normName(nm)]||null;
        var mappedPos=mapSleeperPos(sp.pos);
        var stubVal=mappedPos==="DL"?300:mappedPos==="LB"?250:mappedPos==="DB"?230:200;
        idMap[id]=match||{name:nm,pos:mappedPos,team:sp.team||"FA",age:sp.age||0,rank:"—",vbd:0,tradeVal:stubVal,posRank:0,ag:{g:"—",c:"#888"},tier:{t:"—",c:"#888"}};
      });
      var userMap={};users.forEach(function(u){userMap[u.user_id]=u;});
      // FAAB: use actual league budget from lg.settings
      var faabBudget=(lg.settings&&lg.settings.waiver_budget!=null)?lg.settings.waiver_budget:200;
      // Count traded draft picks per roster (owner_id = current owner)
      var curSeason=parseInt(lg.season)||new Date().getFullYear();
      var picksByRoster={};
      tradedPicks.forEach(function(pk){
        if(pk.owner_id&&parseInt(pk.season)>=curSeason){
          picksByRoster[pk.owner_id]=(picksByRoster[pk.owner_id]||0)+1;
        }
      });
      var teams=rosters.map(function(r){
        var u=userMap[r.owner_id]||{};
        var teamName=(u.metadata&&u.metadata.team_name)||u.display_name||("Team "+r.roster_id);
        var players=(r.players||[]).map(function(id){return idMap[id];}).filter(function(p){return p&&p.pos!=="DEF"&&p.pos!=="K"&&p.pos!=="?"||false;});
        players=players.filter(function(p){return p.pos!=="DEF"&&p.pos!=="K";});
        players.sort(function(a,b){return (b.tradeVal||0)-(a.tradeVal||0);});
        var totalVal=players.reduce(function(s,p){return s+(p.tradeVal||0);},0);
        var faabUsed=(r.settings&&r.settings.waiver_budget_used)||0;
        var draftPicks=picksByRoster[r.roster_id]||0;
        return {name:teamName,owner:u.display_name||"",players:players,totalVal:totalVal,faab:faabBudget-faabUsed,picks:draftPicks,wins:(r.settings&&r.settings.wins)||0,losses:(r.settings&&r.settings.losses)||0,ties:(r.settings&&r.settings.ties)||0};
      });
      teams.sort(function(a,b){return b.totalVal-a.totalVal;});
      saveAndSetImportedTeams(teams);setLeagueRosters(null);setLeagueUsers(null);saveAndSetActiveLeague(lg);
      setLeagueImportStatus("connected");if(leagueSubTab==="leagimport")setLeagueSubTab("power");
    }).catch(function(e){setLeagueImportErr(e.message||"Failed to load league");setLeagueImportStatus("error");});
  }

  var LEAGUE_TEAMS=useMemo(function(){
    var names=["From tank to battle-ship","Gay Lord Fockers","Dog Water","The FORGE","TwoSticks","Old Men Rule","Armchair Warriors","Dynasty Kings","Red Zone Bandits","Waiver Wire Heroes","Stack Attack","The Sleeper Picks"];
    return names.map(function(name,i){
      var baseVal=139126-(i*3800)+Math.floor(Math.random()*1000);
      var po=Math.max(20,82-(i*4.2)+Math.random()*3);
      var co=Math.max(5,75-(i*5.8)+Math.random()*3);
      var ww=Math.max(25,68-(i*3.5)+Math.random()*3);
      return {rank:i+1,name:name,totalVal:baseVal,playoffOdds:+po.toFixed(1),champOdds:+co.toFixed(1),weeklyWin:+ww.toFixed(1),makePlayoffs:+Math.max(15,58-(i*3.2)).toFixed(1),firstRoundBye:+Math.max(3,23-(i*1.8)).toFixed(1),winChamp:+Math.max(1,12.9-(i*1.1)).toFixed(1),players:Math.floor(22+Math.random()*14),picks:Math.floor(3+Math.random()*6),faab:Math.floor(50+Math.random()*150),record:"0-0",projW:+(6.9-i*0.3).toFixed(1)};
    });
  },[]);

  function tVal(side,fa){return side.reduce(function(s,x){return s+(x.pos==="PICK"?x.est:Math.max(0,x.tradeVal));},0)+((fa||0)*10);}
  var tvA=tVal(tradeA,faabA),tvB=tVal(tradeB,faabB);
  function verdict(){
    var diff=tvA-tvB,maxVal=Math.max(tvA,tvB);
    if(maxVal===0) return {txt:"Fair Trade",sub:"Both sides get equal value",c:T.green,pct:50};
    var pct=Math.abs(diff)/maxVal*100;
    if(pct<8) return {txt:"Fair Trade",sub:"Both sides get equal value",c:T.green,pct:50};
    if(diff>0) return {txt:"Team A Overpays",sub:"Team B wins by "+pct.toFixed(0)+"%",c:T.red,pct:Math.max(15,50-pct/2)};
    return {txt:"Team B Overpays",sub:"Team A wins by "+pct.toFixed(0)+"%",c:T.gold,pct:Math.min(85,50+pct/2)};
  }
  function srchRes(q,excl){if(!q)return[];return tradePool.filter(function(p){return p.name.toLowerCase().includes(q.toLowerCase())&&!excl.find(function(x){return x.name===p.name;});}).slice(0,8);}

  function saveTrade(){
    var entry={id:Date.now(),date:new Date().toLocaleDateString(),sideA:tradeA.map(function(p){return{name:p.name,pos:p.pos,tradeVal:p.tradeVal||p.est||0};}),sideB:tradeB.map(function(p){return{name:p.name,pos:p.pos,tradeVal:p.tradeVal||p.est||0};}),tvA:tvA,tvB:tvB,scoring:scoring};
    var nh=[entry].concat(tradeHistory).slice(0,50);
    try{localStorage.setItem('fdp_th_v1',JSON.stringify(nh));}catch(e){}
    setTradeHistory(nh);setTradeSaved(true);setTimeout(function(){setTradeSaved(false);},2500);
  }

  function genAiAnalysis(sA,sB,valA,valB){
    var diff=valA-valB;
    var pct=valB>0?Math.abs(diff/valB)*100:0;
    var aPlrs=sA.filter(function(p){return p.pos!=="PICK";});
    var bPlrs=sB.filter(function(p){return p.pos!=="PICK";});
    var aPicks=sA.filter(function(p){return p.pos==="PICK";});
    var bPicks=sB.filter(function(p){return p.pos==="PICK";});
    var lines=[];
    if(pct<8){lines.push("This is a fair trade — both sides exchange roughly equal value within the standard 8% threshold.");}
    else if(diff>0){lines.push("Team B wins this trade by "+pct.toFixed(0)+"%. Team A is overpaying for what they receive.");}
    else{lines.push("Team A wins this trade by "+pct.toFixed(0)+"%. Team B is giving up too much value.");}
    if(aPlrs.length>0&&bPlrs.length>0){
      var aAge=+(aPlrs.reduce(function(s,p){return s+(p.age||25);},0)/aPlrs.length).toFixed(0);
      var bAge=+(bPlrs.reduce(function(s,p){return s+(p.age||25);},0)/bPlrs.length).toFixed(0);
      if(aAge>bAge+2){lines.push("You're moving older assets (avg age "+aAge+") for younger pieces (avg "+bAge+") — solid dynasty value exchange.");}
      else if(bAge>aAge+2){lines.push("Incoming players average age "+bAge+" vs "+aAge+" outgoing. Win-now move — good if you're contending.");}
    }
    var oldRbs=aPlrs.filter(function(p){return p.pos==="RB"&&(p.age||25)>=30;});
    if(oldRbs.length>0){lines.push("Risk flag: "+oldRbs.map(function(p){return p.name;}).join(" & ")+" "+( oldRbs.length>1?"are":"is")+" 30+ at RB — steep production cliff ahead.");}
    if(aPicks.length>bPicks.length){var ep=aPicks.length-bPicks.length;lines.push("You're adding "+ep+" extra pick"+(ep>1?"s":"")+" — speculative upside, best for rebuilders.");}
    else if(bPicks.length>aPicks.length){var ep2=bPicks.length-aPicks.length;lines.push("You're landing "+ep2+" extra pick"+(ep2>1?"s":"")+" — future capital secured.");}
    var eliteIn=bPlrs.filter(function(p){return p.posRank&&p.posRank<=5;});
    if(eliteIn.length>0){lines.push("You're acquiring "+eliteIn.map(function(p){return p.name;}).join(" & ")+", an elite top-5 asset at their position. That's a significant win.");}
    var qbIn=bPlrs.filter(function(p){return p.pos==="QB";});
    var qbOut=aPlrs.filter(function(p){return p.pos==="QB";});
    if(qbOut.length>qbIn.length){lines.push("You're giving up a QB without equal return. Ensure you have starter depth — QB scarcity is real.");}
    return lines.join(" ");
  }

  function loadSleeperTrending(){
    if(sleeperTrending)return;
    var fetchDb=Object.keys(sleeperRawDb).length===0?fetch("https://api.sleeper.app/v1/players/nfl").then(function(r){return r.ok?r.json():{};}).catch(function(){return{};}):Promise.resolve(null);
    Promise.all([
      fetch("https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=20").then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}),
      fetch("https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=20").then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}),
      fetchDb
    ]).then(function(res){
      if(res[2]&&Object.keys(res[2]).length>0){try{localStorage.setItem('fdp_sp_v1',JSON.stringify(res[2]));}catch(e){}initSleeperNameMap(res[2]);setSleeperRawDb(res[2]);}
      setSleeperTrending({adds:res[0]||[],drops:res[1]||[],ts:Date.now()});
    });
  }

  function loadLeagueTrades(){
    if(!activeLeague||!activeLeague.league_id||activeLeague.league_id.startsWith("espn_")||activeLeague.league_id==="manual")return;
    setLeagueTradesLoading(true);setLeagueTrades(null);
    var weeks=[];for(var w=1;w<=17;w++){weeks.push(w);}
    Promise.all(weeks.map(function(wk){
      return fetch("https://api.sleeper.app/v1/league/"+activeLeague.league_id+"/transactions/"+wk).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];});
    })).then(function(results){
      var allTx=[].concat.apply([],results);
      var trades=allTx.filter(function(tx){return tx.type==="trade"&&tx.status==="complete";});
      trades.sort(function(a,b){return (b.created||0)-(a.created||0);});
      setLeagueTrades(trades);setLeagueTradesLoading(false);
    }).catch(function(){setLeagueTradesLoading(false);});
  }

  function loadLiveProj(){
    setLiveProjLoading(true);
    fetch("https://api.sleeper.app/v1/state/nfl").then(function(r){return r.json();}).then(function(state){
      var season=state.season||"2026";
      var week=Math.max(1,state.display_week||state.week||1);
      return fetch("https://api.sleeper.app/v1/projections/nfl/"+season+"/"+week+"?season_type=regular").then(function(r){return r.ok?r.json():null;}).then(function(data){
        if(data){
          var pm={};
          Object.keys(data).forEach(function(pid){
            var s=data[pid]||{};
            if(s.pts_ppr||s.pts_half_ppr||s.pts_std){
              pm[pid]={ppr:+(s.pts_ppr||0).toFixed(1),half:+(s.pts_half_ppr||0).toFixed(1),std:+(s.pts_std||0).toFixed(1)};
            }
          });
          var payload={map:pm,week:week,season:season,ts:Date.now()};
          try{localStorage.setItem('fdp_lp_v1',JSON.stringify(payload));}catch(e){}
          setLiveProj(payload);
        }
        setLiveProjLoading(false);
      });
    }).catch(function(){setLiveProjLoading(false);});
  }

  function loadSleeperStats(){
    setSleeperStatsLoading(true);
    // Get current NFL state to find the latest week
    fetch("https://api.sleeper.app/v1/state/nfl").then(function(r){return r.json();}).then(function(state){
      var season=state.season||"2026";
      var week=Math.max(1,state.display_week||state.week||1);
      return fetch("https://api.sleeper.app/v1/stats/nfl/"+season+"/"+week+"?season_type=regular").then(function(r){return r.ok?r.json():null;}).then(function(stats){
        setSleeperStats({data:stats||{},week:week,season:season,ts:Date.now()});
        setSleeperStatsLoading(false);
      });
    }).catch(function(){setSleeperStatsLoading(false);});
  }

  function sparkline(playerName,posRank,age,pos){
    // Deterministic pseudo-random sparkline based on player name hash
    var hash=0;for(var i=0;i<playerName.length;i++){hash=(hash*31+playerName.charCodeAt(i))&0xffff;}
    var base=Math.max(100,10000-posRank*120);
    var trend=age<26?1.04:age<30?1.01:age>32?0.95:0.99;
    var pts=[];
    for(var w=0;w<12;w++){var noise=((hash*(w+1)*7919)&0xfff)/0xfff-0.5;pts.push(Math.max(10,Math.round(base*Math.pow(trend,w-6)+noise*base*0.12)));}
    return pts;
  }

  function importSleeper(){
    if(!slUser.trim())return;
    setImpStatus("loading");setImpData(null);setImpErr("");
    function normName(n){return (n||"").toLowerCase().replace(/[''`]/g,"'").replace(/\./g,"").replace(/\s+(jr|sr|ii|iii|iv)$/,"").trim();}
    var rpByName={},rpByNorm={};
    rankedPlayers.forEach(function(p){rpByName[p.name.toLowerCase()]=p;rpByNorm[normName(p.name)]=p;});
    fetch("https://api.sleeper.app/v1/user/"+slUser.trim()).then(function(r){if(!r.ok)throw new Error("User not found");return r.json();}).then(function(u){
      // Try 2026 first (dynasty offseason), fall back to 2025
      return fetch("https://api.sleeper.app/v1/user/"+u.user_id+"/leagues/nfl/2026").then(function(r){return r.json();}).then(function(leagues2026){
        var yr="2026",leagues=leagues2026;
        if(!leagues||leagues.length===0){
          return fetch("https://api.sleeper.app/v1/user/"+u.user_id+"/leagues/nfl/2025").then(function(r){return r.json();}).then(function(l){yr="2025";leagues=l;return{leagues:leagues,yr:yr};});
        }
        return {leagues:leagues,yr:yr};
      }).then(function(res){
        var leagues=res.leagues,yr=res.yr;
        if(!leagues||leagues.length===0)throw new Error("No NFL leagues found for 2025 or 2026");
        var lg=leagues[0];
        return fetch("https://api.sleeper.app/v1/league/"+lg.league_id+"/rosters").then(function(r){return r.json();}).then(function(rosters){
          var my=rosters.find(function(r){return r.owner_id===u.user_id;});
          var rec=lg.scoring_settings?lg.scoring_settings.rec:0;
          var pls=my&&my.players?my.players:[];
          setImpData({username:u.display_name||u.username,leagueName:lg.name,totalTeams:rosters.length,scoringFormat:rec===1?"PPR":rec===0.5?"Half-PPR":"Standard",season:yr});
          setImpRoster(pls.map(function(pid){
            var f=sleeperIdToPlayer[pid]||rpByName[(sleeperIdToPlayer[pid]&&sleeperIdToPlayer[pid].name||"").toLowerCase()]||null;
            if(!f){var sp=sleeperIdToPlayer[pid];if(sp)f=rpByName[sp.name.toLowerCase()]||rpByNorm[normName(sp.name||"")];}
            return f||{name:"Unknown ("+pid+")",pos:"?",team:"?",rank:"—",vbd:0,tradeVal:500,ag:{g:"?",c:"#888"},tier:{t:"?",c:"#888"}};
          }));
          setImpStatus("success");
        });
      });
    }).catch(function(e){setImpErr(e.message||"Import failed");setImpStatus("error");});
  }

  function doLeagueImport(){
    if(!leagueImportUser.trim())return;
    setLeagueImportStatus("loading");setLeagueImportErr("");setLeagueImportData(null);
    fetch("https://api.sleeper.app/v1/user/"+leagueImportUser.trim()).then(function(r){if(!r.ok)throw new Error("User not found");return r.json();}).then(function(u){
      var uid=u.user_id;
      return Promise.all([
        fetch("https://api.sleeper.app/v1/user/"+uid+"/leagues/nfl/2025").then(function(r){return r.json();}).catch(function(){return[];}),
        fetch("https://api.sleeper.app/v1/user/"+uid+"/leagues/nfl/2026").then(function(r){return r.json();}).catch(function(){return[];})
      ]).then(function(results){
        setLeagueImportData({username:u.display_name||u.username,leagues2025:results[0]||[],leagues2026:results[1]||[]});
        setLeagueImportStatus("success");
      });
    }).catch(function(e){setLeagueImportErr(e.message||"User not found");setLeagueImportStatus("error");});
  }

  var inpS={background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"12px 16px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};

  var appLogoSrc=darkMode?"/logo-shield.png":"/logo-shield-light.png";
  var LogoSvg=React.createElement("img",{src:appLogoSrc,alt:"Fantasy DraftPros",style:{height:28,width:"auto"}});

  // ── LEAGUE TEAMS mock data helper ──
  var activeTeams=powerRankingTeams||LEAGUE_TEAMS;
  var leagueTeamNames=activeTeams.map(function(t){return t.name;});

  return React.createElement("div",{style:{background:T.bg,minHeight:"100vh",color:T.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",maxWidth:isDesktop?"100%":480,margin:"0 auto",paddingBottom:isDesktop?0:70,display:isDesktop?"flex":"block"}},

    showAuth&&React.createElement(AuthModal,{mode:authMode,onClose:function(){setShowAuth(false);},onAuth:function(u){saveAndSetUser(u);setShowAuth(false);},T:T}),

    // Roster modal
    rosterViewTeam!==null&&(function(){
      var _filtered=rankedPlayers.filter(function(p){return p.pos!=="DST"&&p.pos!=="K";});
      var prt=powerRankingTeams||LEAGUE_TEAMS.map(function(t,i){var pls=_filtered.slice(i*22,i*22+22);return Object.assign({},t,{players:pls});});
      var team=prt[rosterViewTeam]||{name:"",players:[],faab:null,picks:0};
      var rosterPlayers=team.players||[];
      return React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:500,overflowY:"auto",padding:16}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:20,padding:20,maxWidth:460,margin:"0 auto"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:900,fontSize:18}},team.name),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},rosterPlayers.length+" players"+(team.faab!=null?" · $"+team.faab+" FAAB":"")+(team.picks?" · "+team.picks+" picks":""))
            ),
            React.createElement("button",{onClick:function(){setRosterViewTeam(null);},style:{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:22,lineHeight:1}},"×")
          ),
          rosterPlayers.map(function(p){
            return React.createElement("div",{key:p.name,style:{display:"flex",alignItems:"center",gap:10,background:T.bgInput,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",marginBottom:6}},
              React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
              React.createElement(PBadge,{pos:p.pos}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+" · Age "+p.age+" · "+(p.tier&&p.tier.t?p.tier.t+" · ":"")+("#"+p.posRank+" "+p.pos))
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontWeight:800,fontSize:13,color:T.purpleLight}},p.tradeVal.toLocaleString()),
                React.createElement("div",{style:{fontSize:9,color:T.textSub}},"value")
              )
            );
          }),
          React.createElement("button",{onClick:function(){setRosterViewTeam(null);},style:{width:"100%",marginTop:12,padding:"11px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textSub,cursor:"pointer",fontWeight:600,fontSize:13}},"Close")
        )
      );
    })(),

    // Admin panel
    showAdmin&&user&&user.isAdmin&&React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,overflowY:"auto",padding:16}},
      React.createElement("div",{style:{background:T.bgCard,border:"1px solid #f1c40f44",borderRadius:20,padding:24,maxWidth:460,margin:"0 auto"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}},
          React.createElement("div",null,React.createElement("div",{style:{fontWeight:900,fontSize:20,color:"#f1c40f"}},"Admin Panel"),React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},user.email)),
          React.createElement("button",{onClick:function(){setShowAdmin(false);},style:{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:20}},"x")
        ),
        [["Platform Analytics","User signups, retention, feature usage","#818cf8","analytics"],["Value Tuner","Override trade value multiplier for all players","#c084fc","valuetuner"],["RB Context","RB role definitions and depth chart adjustments","#f59e0b","rbcontext"],["RB AI","Generate AI RB role and value suggestions","#34d399","rbai"],["Headshots","Bulk player photo and avatar management","#f87171","headshots"],["IDP Upload","Bulk import IDP player data and rankings","#06b6d4","idpupload"],["System Health","Platform health, DB sync, rebuild controls","#fb923c","system"]].map(function(f){
          return React.createElement("div",{key:f[0],onClick:function(){setShowAdmin(false);setAdminSubTab(f[3]);setTab("admin");},style:{display:"flex",alignItems:"center",gap:12,background:T.bgInput,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer"}},
            React.createElement("div",{style:{width:36,height:36,borderRadius:10,background:f[2]+"18",border:"1px solid "+f[2]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,color:f[2]}},"→"),
            React.createElement("div",{style:{flex:1}},React.createElement("div",{style:{fontWeight:700,fontSize:13}},f[0]),React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:1}},f[1])),
            React.createElement("span",{style:{color:f[2],fontSize:16}},">")
          );
        }),
        React.createElement("button",{onClick:function(){setShowAdmin(false);},style:{width:"100%",marginTop:14,padding:"12px",borderRadius:12,border:"1px solid "+T.border,background:"transparent",color:T.textSub,cursor:"pointer",fontWeight:600,fontSize:13}},"Close")
      )
    ),

    // SETTINGS MODAL
    showSettings&&React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:900,overflowY:"auto",padding:16,display:"flex",alignItems:"flex-start",justifyContent:"center"}},
      React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:20,padding:20,width:"100%",maxWidth:440,marginTop:40}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}},
          React.createElement("div",{style:{fontWeight:900,fontSize:20}},"League Settings"),
          React.createElement("button",{onClick:function(){setShowSettings(false);},style:{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:24,lineHeight:1}},"×")
        ),
        React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:"14px 16px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:4}},"TE Premium"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"Extra points per reception for Tight Ends"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            [0,0.25,0.5,1.0].map(function(v){
              var active=tePremium===v;
              return React.createElement("button",{key:v,onClick:function(){setTePremium(v);try{localStorage.setItem('fdp_tep_v1',String(v));}catch(e){}},style:{flex:1,padding:"10px 4px",borderRadius:10,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},v===0?"None":"+"+v);
            })
          )
        ),
        React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:"14px 16px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:4}},"Points Per Reception"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"Override the per-reception scoring for all positions"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            [[0,"Standard"],[0.5,"Half"],[1,"PPR"],[1.5,"1.5 PPR"]].map(function(v){
              var active=customPPRVal===v[0];
              return React.createElement("button",{key:v[0],onClick:function(){setCustomPPRVal(v[0]);try{localStorage.setItem('fdp_ppr_v1',String(v[0]));}catch(e){}},style:{flex:1,padding:"10px 4px",borderRadius:10,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},v[1]);
            })
          )
        ),
        React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:"14px 16px",marginBottom:20}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:10}},"Teams in League"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            [8,10,12,14,16].map(function(n){
              var active=teams===n;
              return React.createElement("button",{key:n,onClick:function(){setTeams(n);},style:{flex:1,padding:"10px 4px",borderRadius:10,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},n);
            })
          )
        ),
        React.createElement("button",{onClick:function(){setShowSettings(false);},style:{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}},"Save Settings")
      )
    ),

    // SHARE TRADE MODAL
    showShareModal&&(function(){
      var buildShareUrl=function(){
        var data={a:tradeA.map(function(x:any){return x.name;}),b:tradeB.map(function(x:any){return x.name;}),s:scoring,fa:faabA,fb:faabB};
        return window.location.origin+window.location.pathname+"?trade="+btoa(JSON.stringify(data))+"#trade";
      };
      var shareUrl=buildShareUrl();
      var v=verdict();
      var summaryText="Trade Analysis via Fantasy Draft Pros\n\nTeam A gives: "+tradeA.map(function(x:any){return x.name;}).join(", ")+"\nTeam B gives: "+tradeB.map(function(x:any){return x.name;}).join(", ")+"\n\nVerdict: "+(v?v.txt:"Even Trade")+"\n\n"+shareUrl;
      return React.createElement("div",{style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"},onClick:function(){setShowShareModal(false);}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:"20px 20px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:480},onClick:function(e:any){e.stopPropagation();}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
            React.createElement("div",{style:{fontWeight:900,fontSize:18,color:T.text}},"Share Trade"),
            React.createElement("button",{onClick:function(){setShowShareModal(false);},style:{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:24,lineHeight:1}},"×")
          ),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"10px 12px",marginBottom:14,fontSize:11,color:T.textSub,wordBreak:"break-all",lineHeight:1.4}},shareUrl),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
            React.createElement("button",{onClick:function(){
              navigator.clipboard.writeText(shareUrl).then(function(){setShareCopied(true);setTimeout(function(){setShareCopied(false);},2000);}).catch(function(){});
            },style:{padding:"13px",borderRadius:12,border:"1px solid "+T.purple,background:shareCopied?"#16a34a":T.purpleDim,color:shareCopied?"#fff":T.purpleLight,fontWeight:700,fontSize:14,cursor:"pointer",transition:"background 0.2s"}},shareCopied?"✓ Copied!":"📋 Copy Link"),
            React.createElement("button",{onClick:function(){
              window.open("https://twitter.com/intent/tweet?text="+encodeURIComponent("Check out this dynasty trade analysis on @FantasyDraftPros!\n\n"+shareUrl),"_blank","noopener");
            },style:{padding:"13px",borderRadius:12,border:"1px solid #1d9bf044",background:"#1d9bf011",color:"#1d9bf0",fontWeight:700,fontSize:14,cursor:"pointer"}},"𝕏  Share on X / Twitter"),
            React.createElement("button",{onClick:function(){
              window.open("https://wa.me/?text="+encodeURIComponent("Check out this dynasty trade analysis: "+shareUrl),"_blank","noopener");
            },style:{padding:"13px",borderRadius:12,border:"1px solid #25d36644",background:"#25d36611",color:"#25d366",fontWeight:700,fontSize:14,cursor:"pointer"}},"💬 Share on WhatsApp"),
            typeof navigator.share==="function"&&React.createElement("button",{onClick:function(){
              navigator.share({title:"Fantasy Draft Pros Trade Analysis",text:"Check out this dynasty trade analysis!",url:shareUrl}).catch(function(){});
            },style:{padding:"13px",borderRadius:12,border:"1px solid "+T.border,background:T.bgInput,color:T.text,fontWeight:700,fontSize:14,cursor:"pointer"}},"📱 Share via Device"),
            React.createElement("button",{onClick:function(){
              navigator.clipboard.writeText(summaryText).catch(function(){});
              setShareCopied(true);setTimeout(function(){setShareCopied(false);},2000);
            },style:{padding:"13px",borderRadius:12,border:"1px solid "+T.border,background:T.bgInput,color:T.textSub,fontWeight:700,fontSize:14,cursor:"pointer"}},"📄 Copy Trade Summary Text")
          )
        )
      );
    })(),

    // NAV (mobile only)
    !isDesktop&&React.createElement("div",{style:{position:"sticky",top:0,background:T.bg,zIndex:100,borderBottom:"1px solid "+T.border,paddingBottom:10}},
      React.createElement("div",{style:{display:"flex",justifyContent:"center",paddingTop:12}},
        React.createElement("img",{src:appLogoSrc,alt:"Fantasy DraftPros",style:{height:72,width:"auto",maxWidth:280}})
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:8}},
        React.createElement("button",{onClick:toggleDarkMode,style:{padding:"8px 12px",minHeight:40,borderRadius:20,border:"1px solid "+T.border,background:T.bgInput,color:T.textSub,cursor:"pointer",fontSize:12,lineHeight:1,WebkitTapHighlightColor:"transparent"}},darkMode?"☀ Light":"🌙 Dark"),
        React.createElement("button",{onClick:function(){setShowSettings(true);},style:{padding:"8px 12px",minHeight:40,borderRadius:20,border:"1px solid "+T.border,background:T.bgInput,color:T.textSub,cursor:"pointer",fontSize:12,lineHeight:1,display:"flex",alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent"}},"⚙ Settings"),
        !user?React.createElement(React.Fragment,null,
          React.createElement("button",{onClick:function(){setAuthMode("signin");setShowAuth(true);},style:{padding:"8px 16px",minHeight:40,borderRadius:20,border:"1px solid "+T.border,background:"transparent",color:T.textSub,cursor:"pointer",fontWeight:600,fontSize:12,WebkitTapHighlightColor:"transparent"}},"Sign In"),
          React.createElement("button",{onClick:function(){setAuthMode("signup");setShowAuth(true);},style:{padding:"8px 18px",minHeight:40,borderRadius:20,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12,WebkitTapHighlightColor:"transparent"}},"Sign Up Free")
        ):React.createElement(UserMenu,{user:user,T:T,onSignOut:function(){authClient?.auth.signOut();saveAndSetUser(null);setShowAdmin(false);},onUpgrade:function(){if(user){setReportSubTab("upgrade");setTab("reports");}else{setAuthMode("signup");setShowAuth(true);}},onAdmin:function(){setTab("admin");}})
      )
    ),

    // DESKTOP SIDEBAR NAV
    isDesktop&&React.createElement("div",{style:{width:220,flexShrink:0,position:"sticky",top:0,height:"100vh",background:T.bgCard,borderRight:"1px solid "+T.border,display:"flex",flexDirection:"column",padding:"20px 0",zIndex:100}},
      React.createElement("div",{style:{padding:"0 16px 20px",borderBottom:"1px solid "+T.border,marginBottom:12}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
          LogoSvg,
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:14,color:T.text,lineHeight:1.2}},"Fantasy Draft Pros"),
            React.createElement("div",{style:{fontSize:10,color:T.textSub}},"Dynasty Trade Analyzer")
          )
        )
      ),
      [["trade","Trade Analyzer","⚖️"],["league","My League","🏈"],["rankings","Rankings","📊"],["reports","Reports","📈"]].concat(user&&user.isAdmin?[["admin","Admin","🔐"]]:[]).map(function(item){
        var active=tab===item[0];
        return React.createElement("button",{key:item[0],onClick:function(){
          if((item[0]==="league"||item[0]==="reports")&&!isPro){setAuthMode("signup");setShowAuth(true);return;}
          if(item[0]==="admin"){if(!user||!user.isAdmin){return;}setTab("admin");trackEvent("tab_change",{tab:"admin"});return;}
          setTab(item[0]);trackEvent("tab_change",{tab:item[0]});
        },style:{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",margin:"2px 8px",borderRadius:10,border:"none",background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer",textAlign:"left",width:"calc(100% - 16px)"}},
          React.createElement("span",{style:{fontSize:16}},item[2]),
          React.createElement("span",{style:{flex:1}},item[1]),
          (item[0]==="league"||item[0]==="reports")&&!isPro&&React.createElement("span",{style:{background:T.gold,color:"#000",fontSize:8,fontWeight:800,borderRadius:4,padding:"1px 5px"}},"PRO")
        );
      }),
      React.createElement("div",{style:{marginTop:"auto",padding:"12px 16px",borderTop:"1px solid "+T.border}},
        React.createElement("button",{onClick:toggleDarkMode,style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",marginBottom:10,borderRadius:10,border:"1px solid "+T.border,background:T.bgInput,color:T.textSub,cursor:"pointer",fontSize:12,fontWeight:600}},
          React.createElement("span",{style:{fontSize:15}},darkMode?"☀️":"🌙"),
          React.createElement("span",null,darkMode?"Light Mode":"Dark Mode")
        ),
        !user?React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
          React.createElement("button",{onClick:function(){setAuthMode("signup");setShowAuth(true);},style:{padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Sign Up Free"),
          React.createElement("button",{onClick:function(){setAuthMode("signin");setShowAuth(true);},style:{padding:"10px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.text,fontWeight:700,fontSize:12,cursor:"pointer"}},"Sign In")
        ):React.createElement(UserMenu,{user:user,T:T,onSignOut:function(){authClient?.auth.signOut();saveAndSetUser(null);setShowAdmin(false);},onUpgrade:function(){if(user){setReportSubTab("upgrade");setTab("reports");}else{setAuthMode("signup");setShowAuth(true);}},onAdmin:function(){setTab("admin");}})
      )
    ),

    // MOBILE BOTTOM TABS
    !isDesktop&&React.createElement("div",{style:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:T.bgCard,borderTop:"1px solid "+T.border,display:"flex",zIndex:100}},
      [["trade","Trade","⚖️"],["league","League","🏈"],["rankings","Ranks","📊"],["reports","Reports","📈"]].concat(user&&user.isAdmin?[["admin","Admin","🔐"]]:[]).map(function(item){
        var active=tab===item[0];
        return React.createElement("button",{key:item[0],onClick:function(){
          if((item[0]==="league"||item[0]==="reports")&&!isPro){setAuthMode("signup");setShowAuth(true);return;}
          if(item[0]==="admin"){if(!user||!user.isAdmin){return;}setTab("admin");trackEvent("tab_change",{tab:"admin"});return;}
          setTab(item[0]);trackEvent("tab_change",{tab:item[0]});
        },style:{flex:1,padding:"8px 4px 8px",minHeight:56,background:active?T.purple+"12":"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,WebkitTapHighlightColor:"transparent"}},
          React.createElement("span",{style:{fontSize:18,lineHeight:1}},item[2]),
          React.createElement("span",{style:{fontSize:9,fontWeight:700,color:active?T.purple:T.textDim,marginTop:2}},item[1]),
          (item[0]==="league"||item[0]==="reports")&&!isPro&&React.createElement("span",{style:{fontSize:7,color:T.gold,fontWeight:700}},"PRO")
        );
      })
    ),

    // MAIN CONTENT WRAPPER (flex:1 on desktop for sidebar layout)
    React.createElement("div",{style:{flex:isDesktop?1:undefined,minWidth:0,overflowY:isDesktop?"auto":undefined,maxWidth:isDesktop?900:undefined,width:isDesktop?"100%":undefined,paddingBottom:isDesktop?40:undefined}},

    // ════ TRADE TAB ════
    tab==="trade"&&React.createElement("div",{style:{padding:"16px 16px 0"}},
      React.createElement("div",{style:{textAlign:"center",marginTop:8,marginBottom:20}},
        React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:6,background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:30,padding:"5px 14px",fontSize:10,color:T.purpleLight,fontWeight:700,letterSpacing:0.5,marginBottom:14}},"#1 DYNASTY FANTASY FOOTBALL TRADE CALCULATOR - FREE"),
        React.createElement("div",{style:{fontWeight:900,fontSize:28,lineHeight:1.15,marginBottom:10}},React.createElement("span",{style:{color:T.purple}},"Win Every Trade."),React.createElement("br",null),"Dominate Your Dynasty."),
        React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.7,marginBottom:16}},"The free dynasty fantasy football trade analyzer trusted by thousands. Combines offensive players, IDP, FAAB budget, and draft picks — 1,000+ player values updated daily."),
        publicStats&&user&&user.isAdmin&&React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:20}},
          React.createElement("div",{style:{textAlign:"center"}},
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.purple}},(publicStats.visitors||0).toLocaleString()),
            React.createElement("div",{style:{fontSize:10,color:T.textSub,fontWeight:600,letterSpacing:0.5,marginTop:2}},"VISITORS")
          ),
          React.createElement("div",{style:{width:1,background:T.border}}),
          React.createElement("div",{style:{textAlign:"center"}},
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.purple}},(publicStats.trades||0).toLocaleString()),
            React.createElement("div",{style:{fontSize:10,color:T.textSub,fontWeight:600,letterSpacing:0.5,marginTop:2}},"TRADES ANALYZED")
          )
        ),
        !user&&React.createElement("div",{style:{display:"flex",gap:10,justifyContent:"center",marginBottom:4}},
          React.createElement("button",{onClick:function(){setAuthMode("signup");setShowAuth(true);},style:{padding:"13px 24px",borderRadius:30,border:"none",cursor:"pointer",fontWeight:800,fontSize:14,background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff"}},"Start 7-Day Free Trial"),
          React.createElement("button",{onClick:function(){setAuthMode("signin");setShowAuth(true);},style:{padding:"13px 24px",borderRadius:30,border:"1px solid "+T.border,cursor:"pointer",fontWeight:700,fontSize:14,background:"transparent",color:T.text}},"Sign In")
        )
      ),
      React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:20,padding:18,marginBottom:20}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16}},"Free Dynasty Trade Analyzer - 2026"),
          React.createElement("button",{onClick:loadLiveProj,style:{padding:"5px 10px",borderRadius:8,border:"1px solid "+(liveProj?T.green:T.border),background:liveProj?T.green+"18":"transparent",color:liveProj?T.green:T.textSub,fontWeight:700,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},liveProjLoading?"Loading...":(liveProj?"Live Wk"+liveProj.week+" ✓":"Load Live Proj"))
        ),
        React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:14}},liveProj?"Live Week "+liveProj.week+" projections active — values reflect real-time data":"No account required - Offensive + IDP + FAAB + Draft Picks"),
        React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:12,marginBottom:14}},
          React.createElement("div",{style:{display:"flex",gap:6,marginBottom:8}},
            LEAGUE_TYPES.map(function(lt){
              var active=leagueType===lt;
              return React.createElement("button",{key:lt,onClick:function(){setLeagueType(lt);setAnalyzed(false);},style:{flex:1,padding:"9px 4px",borderRadius:10,border:"2px solid "+(active?T.purple:T.border),background:active?"linear-gradient(135deg,"+T.purple+",#5b21b6)":"transparent",color:active?"#fff":T.textSub,fontWeight:800,fontSize:13,cursor:"pointer"}},lt);
            })
          ),
          React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
            ["PPR","Half","Standard"].map(function(f){
              var realActive=format===f;
              return React.createElement("button",{key:f,onClick:function(){setFormat(f);setAnalyzed(false);},style:{flex:1,padding:"7px 4px",borderRadius:9,border:"1px solid "+(realActive?T.purple:T.border),background:realActive?T.purple+"22":"transparent",color:realActive?T.purpleLight:T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},f);
            }),
            React.createElement("button",{onClick:function(){setSfMode(function(v){return !v;});setAnalyzed(false);},style:{padding:"7px 10px",borderRadius:9,border:"1px solid "+(sfMode?"#f59e0b":T.border),background:sfMode?"#f59e0b":"transparent",color:sfMode?"#000":T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},"SF"),
            React.createElement("button",{onClick:function(){var next=tePremium>0?0:0.5;setTePremium(next);try{localStorage.setItem('fdp_tep_v1',String(next));}catch(e){}setAnalyzed(false);},style:{padding:"7px 10px",borderRadius:9,border:"1px solid "+(tePremium>0?"#f59e0b":T.border),background:tePremium>0?"#f59e0b":"transparent",color:tePremium>0?"#000":T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},"TEP")
          )
        ),
        React.createElement("div",{style:{marginBottom:12}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:8}},"Team A"),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:8}},
            React.createElement(SrchDrop,{T:T,pool:tradePool,value:tSrchA,onChange:setTSrchA,exclude:[].concat(tradeA,tradeB),onSelect:function(p){setTradeA(function(prev){return prev.concat([p]);});setAnalyzed(false);}}),
            user&&React.createElement("button",{onClick:function(){setTradeRosterSide(tradeRosterSide==="A"?null:"A");},style:{background:tradeRosterSide==="A"?T.purple+"33":T.bgInput,border:"1px solid "+(tradeRosterSide==="A"?T.purple:T.border),borderRadius:10,padding:"0 12px",color:tradeRosterSide==="A"?T.purpleLight:T.textSub,cursor:"pointer",fontWeight:600,fontSize:11,whiteSpace:"nowrap",flexShrink:0}},"+ Roster")
          ),
          tradeRosterSide==="A"&&React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:10,marginBottom:8,border:"1px solid "+T.borderPurple}},
            !powerRankingTeams&&React.createElement("div",{style:{textAlign:"center",padding:"16px 8px",color:T.textSub,fontSize:12}},"Connect a league in the League tab to pick from rosters"),
            powerRankingTeams&&React.createElement(React.Fragment,null,
              React.createElement("select",{value:tradeRosterTeam,onChange:function(e){setTradeRosterTeam(+e.target.value);},style:{width:"100%",background:T.bgCard,color:T.text,border:"1px solid "+T.border,borderRadius:8,padding:"7px 10px",fontSize:12,marginBottom:8,outline:"none"}},
                powerRankingTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name);})),
              React.createElement("div",{style:{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}},
                (powerRankingTeams[tradeRosterTeam]||powerRankingTeams[0]).players.filter(function(p){return !tradeA.find(function(x){return x.name===p.name;})&&!tradeB.find(function(x){return x.name===p.name;});}).map(function(p){
                  return React.createElement("button",{key:p.name,onClick:function(){setTradeA(function(prev){return prev.concat([p]);});setAnalyzed(false);setTradeRosterSide(null);},style:{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bgCard,border:"1px solid "+T.border,borderRadius:8,padding:"6px 10px",cursor:"pointer",textAlign:"left",width:"100%"}},
                    React.createElement("span",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name),
                    React.createElement("span",{style:{fontSize:11,color:T.textSub}},React.createElement("span",{style:{color:POS_COLORS[p.pos]||T.textSub,marginRight:4,fontWeight:700,fontSize:10}},p.pos),(p.tradeVal||0).toLocaleString())
                  );
                })
              )
            )
          ),
          tradeA.map(function(item){return React.createElement(TradeItem,{T:T,key:item.name,item:item,onRemove:function(){setTradeA(function(p){return p.filter(function(x){return x.name!==item.name;});});setAnalyzed(false);}});}),
          React.createElement("div",{style:{marginTop:8}},
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:600}},"FAAB Money"),
            React.createElement("div",{style:{position:"relative"}},React.createElement("span",{style:{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.textSub,fontWeight:700}},"$"),React.createElement("input",{type:"number",value:faabA,onChange:function(e){setFaabA(+e.target.value||0);setAnalyzed(false);},min:0,style:Object.assign({},inpS,{paddingLeft:30}),placeholder:"0"}))
          )
        ),
        React.createElement("div",{style:{textAlign:"center",color:T.textDim,fontSize:11,fontWeight:700,letterSpacing:2,margin:"4px 0 12px"}},"VS"),
        React.createElement("div",{style:{marginBottom:16}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:8}},"Team B"),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:8}},
            React.createElement(SrchDrop,{T:T,pool:tradePool,value:tSrchB,onChange:setTSrchB,exclude:[].concat(tradeA,tradeB),onSelect:function(p){setTradeB(function(prev){return prev.concat([p]);});setAnalyzed(false);}}),
            user&&React.createElement("button",{onClick:function(){setTradeRosterSide(tradeRosterSide==="B"?null:"B");},style:{background:tradeRosterSide==="B"?T.purple+"33":T.bgInput,border:"1px solid "+(tradeRosterSide==="B"?T.purple:T.border),borderRadius:10,padding:"0 12px",color:tradeRosterSide==="B"?T.purpleLight:T.textSub,cursor:"pointer",fontWeight:600,fontSize:11,whiteSpace:"nowrap",flexShrink:0}},"+ Roster")
          ),
          tradeRosterSide==="B"&&React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:10,marginBottom:8,border:"1px solid "+T.borderPurple}},
            !powerRankingTeams&&React.createElement("div",{style:{textAlign:"center",padding:"16px 8px",color:T.textSub,fontSize:12}},"Connect a league in the League tab to pick from rosters"),
            powerRankingTeams&&React.createElement(React.Fragment,null,
              React.createElement("select",{value:tradeRosterTeam,onChange:function(e){setTradeRosterTeam(+e.target.value);},style:{width:"100%",background:T.bgCard,color:T.text,border:"1px solid "+T.border,borderRadius:8,padding:"7px 10px",fontSize:12,marginBottom:8,outline:"none"}},
                powerRankingTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name);})),
              React.createElement("div",{style:{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}},
                (powerRankingTeams[tradeRosterTeam]||powerRankingTeams[0]).players.filter(function(p){return !tradeA.find(function(x){return x.name===p.name;})&&!tradeB.find(function(x){return x.name===p.name;});}).map(function(p){
                  return React.createElement("button",{key:p.name,onClick:function(){setTradeB(function(prev){return prev.concat([p]);});setAnalyzed(false);setTradeRosterSide(null);},style:{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bgCard,border:"1px solid "+T.border,borderRadius:8,padding:"6px 10px",cursor:"pointer",textAlign:"left",width:"100%"}},
                    React.createElement("span",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name),
                    React.createElement("span",{style:{fontSize:11,color:T.textSub}},React.createElement("span",{style:{color:POS_COLORS[p.pos]||T.textSub,marginRight:4,fontWeight:700,fontSize:10}},p.pos),(p.tradeVal||0).toLocaleString())
                  );
                })
              )
            )
          ),
          tradeB.map(function(item){return React.createElement(TradeItem,{T:T,key:item.name,item:item,onRemove:function(){setTradeB(function(p){return p.filter(function(x){return x.name!==item.name;});});setAnalyzed(false);}});}),
          React.createElement("div",{style:{marginTop:8}},
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4,fontWeight:600}},"FAAB Money"),
            React.createElement("div",{style:{position:"relative"}},React.createElement("span",{style:{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.textSub,fontWeight:700}},"$"),React.createElement("input",{type:"number",value:faabB,onChange:function(e){setFaabB(+e.target.value||0);setAnalyzed(false);},min:0,style:Object.assign({},inpS,{paddingLeft:30}),placeholder:"0"}))
          )
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}},
          !isPro&&React.createElement("div",{style:{fontSize:11,color:tradeCount>=FREE_TRADE_LIMIT?T.red:T.textSub}},tradeCount>=FREE_TRADE_LIMIT?"Trade limit reached - upgrade for unlimited":(FREE_TRADE_LIMIT-tradeCount)+" free analyses remaining"),
          isPro&&React.createElement("div",{style:{fontSize:11,color:T.green}},"Unlimited analyses")
        ),
        React.createElement("button",{onClick:async function(){
          if(tradeA.length===0&&tradeB.length===0)return;
          if(!isPro&&tradeCount>=FREE_TRADE_LIMIT){setAuthMode("signup");setShowAuth(true);return;}
          setAnalyzed(true);setAiAnalysis("Analyzing...");setTradeSaved(false);if(!isPro)setTradeCount(function(c){var n=c+1;try{localStorage.setItem('fdp_tc_v1',String(n));}catch(e){}return n;});
          try{var aiRes=await callEdgeFn("analyze-trade",{sideA:tradeA.map(function(p){return{name:p.name,pos:p.pos,age:p.age,val:p.ktcVal||0};}),sideB:tradeB.map(function(p){return{name:p.name,pos:p.pos,age:p.age,val:p.ktcVal||0};}),tvA,tvB,scoring},user?.token);setAiAnalysis(aiRes.analysis||genAiAnalysis(tradeA,tradeB,tvA,tvB));}catch(e){setAiAnalysis(genAiAnalysis(tradeA,tradeB,tvA,tvB));}
          var device=window.innerWidth>=1024?"desktop":"mobile";
          var ua=navigator.userAgent.toLowerCase();
          var platform=ua.includes("iphone")||ua.includes("ipad")?"iOS":ua.includes("android")?"Android":"Web";
          var geo=await getGeo().catch(function(){return null;});
          var country=geo?.country||"";var city=geo?.city||"";var region=geo?.region||"";var flag=geo?.flag||"";
          trackEvent("trade_analyzed",{scoring,sideA:tradeA.map(function(x){return x.name;}),sideB:tradeB.map(function(x){return x.name;}),origin:window.location.hash||"#trade",device,platform,country,city,region,flag});
        },style:{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",fontWeight:800,fontSize:15,
          background:(tradeA.length>0||tradeB.length>0)?(!isPro&&tradeCount>=FREE_TRADE_LIMIT?"linear-gradient(135deg,"+T.gold+",#92400e)":"linear-gradient(135deg,"+T.purple+",#5b21b6)"):T.purpleDim,
          color:(tradeA.length>0||tradeB.length>0)?"#fff":T.textDim}},
          (!isPro&&tradeCount>=FREE_TRADE_LIMIT)?"Unlock Unlimited Trades":"Analyze Trade"
        ),
        analyzed&&(tradeA.length>0||tradeB.length>0)&&(function(){
          var v=verdict();
          return React.createElement("div",{style:{marginTop:14,background:T.bgInput,borderRadius:14,padding:16,border:"1px solid "+v.c+"33"}},
            React.createElement("div",{style:{fontWeight:900,fontSize:18,color:v.c,marginBottom:2}},v.txt),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},v.sub),
            React.createElement("div",{style:{background:T.border,borderRadius:99,height:8,marginBottom:12,overflow:"hidden"}},React.createElement("div",{style:{width:v.pct+"%",height:"100%",background:"linear-gradient(90deg,"+T.purple+","+v.c+")",borderRadius:99}})),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
              React.createElement("div",{style:{background:T.bgCard,borderRadius:10,padding:12,border:"1px solid "+T.border,textAlign:"center"}},React.createElement("div",{style:{fontSize:9,color:T.textSub,letterSpacing:1,marginBottom:4}},"GIVES"),React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.purple}},tvA.toFixed(0))),
              React.createElement("div",{style:{background:T.bgCard,borderRadius:10,padding:12,border:"1px solid "+T.border,textAlign:"center"}},React.createElement("div",{style:{fontSize:9,color:T.textSub,letterSpacing:1,marginBottom:4}},"GETS"),React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.purpleLight}},tvB.toFixed(0)))
            ),
            aiAnalysis&&React.createElement("div",{style:{marginTop:12,background:darkMode?"#1a1035":"#f5f3ff",border:"1px solid "+T.borderPurple,borderRadius:12,padding:"12px 14px"}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6}},
                React.createElement("span",{style:{fontSize:13,color:T.purple}},"✦"),
                React.createElement("span",{style:{fontSize:10,fontWeight:800,color:T.purple,letterSpacing:1}}),"AI ANALYSIS"
              ),
              React.createElement("div",{style:{fontSize:12,color:T.text,lineHeight:1.8}},aiAnalysis)
            ),
            React.createElement("div",{style:{display:"flex",gap:8,marginTop:12}},
              React.createElement("button",{onClick:saveTrade,disabled:tradeSaved,style:{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+(tradeSaved?T.green:T.border),cursor:tradeSaved?"default":"pointer",fontWeight:700,fontSize:12,background:tradeSaved?T.green:T.bgInput,color:tradeSaved?"#fff":T.textSub}},tradeSaved?"Saved ✓":"Save Trade"),
              React.createElement("button",{onClick:function(){setShowShareModal(true);},style:{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+T.purple,cursor:"pointer",fontWeight:700,fontSize:12,background:T.purpleDim,color:T.purpleLight}},"🔗 Share"),
              React.createElement("button",{onClick:async function(){setAiAnalysis("Analyzing...");try{var rr=await callEdgeFn("analyze-trade",{sideA:tradeA.map(function(p){return{name:p.name,pos:p.pos,age:p.age,val:p.ktcVal||0};}),sideB:tradeB.map(function(p){return{name:p.name,pos:p.pos,age:p.age,val:p.ktcVal||0};}),tvA,tvB,scoring},user?.token);setAiAnalysis(rr.analysis||genAiAnalysis(tradeA,tradeB,tvA,tvB));}catch(e){setAiAnalysis(genAiAnalysis(tradeA,tradeB,tvA,tvB));}},style:{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+T.borderPurple,cursor:"pointer",fontWeight:700,fontSize:12,background:T.bgInput,color:T.textSub}},"↻")
            ),
            !user&&React.createElement("div",{style:{marginTop:12,background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:12,padding:"12px 14px"}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.purpleLight,marginBottom:4}},"Want AI Trade Suggestions?"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:10}},"Sign up free to unlock full rankings, league import, and personalized recommendations."),
              React.createElement("button",{onClick:function(){setAuthMode("signup");setShowAuth(true);},style:{width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff"}},"Start Free Trial")
            )
          );
        })()
      ),
      !user&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28,padding:"0 4px"}},
        [["1,000+","PLAYERS RANKED"],["4","LEAGUE PLATFORMS"],["6","SCORING COMBOS"],["Daily","VALUE UPDATES"]].map(function(s){return React.createElement("div",{key:s[0],style:{textAlign:"center"}},React.createElement("div",{style:{fontWeight:900,fontSize:26,color:T.purple}},s[0]),React.createElement("div",{style:{fontSize:10,color:T.textSub,letterSpacing:1.5,fontWeight:600}},s[1]));})
      ),
      // Pricing
      !user&&React.createElement("div",{style:{marginBottom:32}},
        React.createElement("div",{style:{textAlign:"center",marginBottom:20}},
          React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:6,background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:20,padding:"5px 14px",fontSize:10,color:T.purpleLight,fontWeight:700,letterSpacing:1,marginBottom:12}},"PRICING"),
          React.createElement("div",{style:{fontWeight:900,fontSize:26,lineHeight:1.2,marginBottom:6}},"Simple, ",React.createElement("span",{style:{color:T.purple}},"Transparent")," Pricing"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub}},"Start free. Upgrade when you're ready.")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:20,padding:20,marginBottom:12}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}},React.createElement("div",null,React.createElement("div",{style:{fontWeight:900,fontSize:18,marginBottom:2}},"Free"),React.createElement("div",{style:{fontSize:12,color:T.textSub}},"No account required")),React.createElement("div",{style:{textAlign:"right"}},React.createElement("div",{style:{fontWeight:900,fontSize:28}},"$0"),React.createElement("div",{style:{fontSize:10,color:T.textDim}},"forever"))),
          [["Trade analyzer with 2026 values",true],["FAAB money + draft pick values",true],["Offensive + IDP players",true],["All scoring formats",true],["Top 20 player rankings",true],["Full 200+ rankings",false],["League import",false],["AI trade suggestions",false]].map(function(f){return React.createElement("div",{key:f[0],style:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:7,opacity:f[1]?1:0.38}},React.createElement("span",{style:{color:f[1]?T.green:T.textDim,fontSize:14,flexShrink:0,marginTop:1}},f[1]?"v":"x"),React.createElement("span",{style:{fontSize:13,color:f[1]?T.textSub:T.textDim}},f[0]));}),
          React.createElement("button",{onClick:function(){setAuthMode("signup");setShowAuth(true);},style:{width:"100%",marginTop:14,padding:"12px",borderRadius:12,border:"1px solid "+T.border,background:"transparent",color:T.text,cursor:"pointer",fontWeight:700,fontSize:13}},"Get Started Free")
        ),
        React.createElement("div",{style:{background:"linear-gradient(135deg,#1e1040,#1a1035)",border:"2px solid "+T.purple,borderRadius:20,padding:20,marginBottom:12,position:"relative",overflow:"hidden"}},
          React.createElement("div",{style:{position:"absolute",top:0,right:0,background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",borderBottomLeftRadius:12,padding:"4px 14px",fontSize:10,fontWeight:800,color:"#fff"}},"MOST POPULAR"),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,marginTop:6}},React.createElement("div",null,React.createElement("div",{style:{fontWeight:900,fontSize:18,color:T.purple,marginBottom:2}},"Pro"),React.createElement("div",{style:{fontSize:12,color:T.textSub}},"7-day free trial")),React.createElement("div",{style:{textAlign:"right"}},React.createElement("div",{style:{fontWeight:900,fontSize:28}},"$2.99",React.createElement("span",{style:{fontSize:14,fontWeight:400,color:T.textSub}},"/mo")),React.createElement("div",{style:{fontSize:10,color:T.textDim}},"cancel anytime"))),
          ["Everything in Free","Full rankings - 200+ players","Live Sleeper league import","ESPN Yahoo MFL import","AI trade suggestions + analysis","Roster grades + team strategy","Power rankings + playoff odds","Market alerts - buy low sell high"].map(function(f){return React.createElement("div",{key:f,style:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:7}},React.createElement("span",{style:{color:T.purple,fontSize:14,flexShrink:0,marginTop:1}},"v"),React.createElement("span",{style:{fontSize:13,color:"#fff",lineHeight:1.4}},f));}),
          React.createElement("button",{onClick:function(){user?handleCheckout("pro","monthly"):(setAuthMode("signup"),setShowAuth(true));},style:{width:"100%",marginTop:16,padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",cursor:"pointer",fontWeight:800,fontSize:14}},user?"Upgrade to Pro →":"Start 7-Day Free Trial"),
          React.createElement("div",{style:{textAlign:"center",marginTop:8,fontSize:11,color:T.textDim}},"No credit card required - Cancel anytime")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:20,padding:20,marginBottom:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}},React.createElement("div",null,React.createElement("div",{style:{fontWeight:900,fontSize:18,color:T.purpleLight,marginBottom:2}},"Elite"),React.createElement("div",{style:{fontSize:12,color:T.textSub}},"For serious dynasty managers")),React.createElement("div",{style:{textAlign:"right"}},React.createElement("div",{style:{fontWeight:900,fontSize:28}},"$6.99",React.createElement("span",{style:{fontSize:14,fontWeight:400,color:T.textSub}},"/mo")),React.createElement("div",{style:{fontSize:10,color:T.textDim}},"cancel anytime"))),
          ["Everything in Pro","API access","Priority support - 24hr response","Early access to new features","Custom scoring formula builder","Export rankings to CSV"].map(function(f){return React.createElement("div",{key:f,style:{display:"flex",alignItems:"flex-start",gap:10,marginBottom:7}},React.createElement("span",{style:{color:T.purpleLight,fontSize:14,flexShrink:0,marginTop:1}},"v"),React.createElement("span",{style:{fontSize:13,color:T.textSub}},f));}),
          React.createElement("button",{onClick:function(){user?handleCheckout("elite","monthly"):(setAuthMode("signup"),setShowAuth(true));},style:{width:"100%",marginTop:14,padding:"13px",borderRadius:12,border:"1px solid "+T.borderPurple,background:"transparent",color:T.purpleLight,cursor:"pointer",fontWeight:700,fontSize:13}},user?"Upgrade to Elite →":"Start 7-Day Free Trial")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,overflow:"hidden"}},
          React.createElement("div",{style:{padding:"14px 16px",borderBottom:"1px solid "+T.border,fontWeight:800,fontSize:14}},"Feature Comparison"),
          React.createElement("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:12}},
            React.createElement("thead",null,React.createElement("tr",{style:{background:T.bgInput}},React.createElement("th",{style:{padding:"10px 14px",textAlign:"left",color:T.textSub,fontWeight:700,fontSize:11}},"Feature"),["Free","Pro","Elite"].map(function(p){return React.createElement("th",{key:p,style:{padding:"10px 8px",textAlign:"center",color:p==="Pro"?T.purple:T.textSub,fontWeight:800,fontSize:11,width:58}},p);}))),
            React.createElement("tbody",null,COMPARE_ROWS.map(function(row,i){return React.createElement("tr",{key:row[0],style:{borderTop:"1px solid "+T.border,background:i%2===0?"transparent":T.bgInput+"88"}},React.createElement("td",{style:{padding:"10px 14px",color:T.textSub,fontSize:12}},row[0]),[row[1],row[2],row[3]].map(function(v,vi){return React.createElement("td",{key:vi,style:{padding:"10px 8px",textAlign:"center"}},v?React.createElement("span",{style:{color:vi===1?T.purple:T.green,fontSize:15,fontWeight:900}},"v"):React.createElement("span",{style:{color:T.textDim,fontSize:13}},"-"));}));}))
          )
        )
      ),
      // FAQ
      !user&&React.createElement("div",{style:{marginBottom:24}},
        React.createElement("div",{style:{textAlign:"center",marginBottom:16}},React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Frequently Asked Questions"),React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Everything you need to know")),
        FAQS.map(function(f,i){
          var open=faqOpen===i;
          return React.createElement("div",{key:i,style:{background:T.bgCard,border:"1px solid "+(open?T.borderPurple:T.border),borderRadius:12,marginBottom:8,overflow:"hidden"}},
            React.createElement("button",{onClick:function(){setFaqOpen(open?null:i);},style:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",gap:12}},
              React.createElement("span",{style:{fontWeight:600,fontSize:13,color:open?T.purple:T.text,lineHeight:1.4}},f.q),
              React.createElement("span",{style:{color:T.textDim,fontSize:14,flexShrink:0}},open?"^":"v")
            ),
            open&&React.createElement("div",{style:{padding:"0 16px 14px",fontSize:12,color:T.textSub,lineHeight:1.6}},f.a)
          );
        })
      ),
    ),

    // ════ MY LEAGUE TAB ════
    tab==="league"&&React.createElement("div",{style:{paddingBottom:80}},
      React.createElement("div",{style:{position:"relative",borderBottom:"1px solid "+T.border}},
        isDesktop&&React.createElement("button",{onClick:function(){leagueTabsRef.current&&leagueTabsRef.current.scrollBy({left:-200,behavior:"smooth"});},style:{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"‹"),
        React.createElement("div",{ref:leagueTabsRef,style:{display:"flex",gap:8,overflowX:"auto",padding:isDesktop?"12px 36px":"12px 16px",scrollbarWidth:"none"}},
          [["power","Power Rankings"],["playoff","Playoff Odds"],["champ","Championship"],["advice","Team Advice"],["roster","Roster Health"],["waiver","Waiver Wire"],["lineup","Lineup"],["startsit","Start/Sit"],["trades","League Trades"],["auction","Auction"],["rivalry","Rivalry"],["recap","Recap"],["chat","Chat"],["alerts","Alerts"],["leagimport","Import"]].map(function(st){
            var active=leagueSubTab===st[0];
            return React.createElement("button",{key:st[0],onClick:function(){
              setLeagueSubTab(st[0]);
              if(st[0]==="waiver"&&!waiverLoaded){setTimeout(function(){setWaiverLoaded(true);},1400);}
            },style:{padding:"7px 16px",borderRadius:20,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},st[1]);
          })
        ),
        isDesktop&&React.createElement("button",{onClick:function(){leagueTabsRef.current&&leagueTabsRef.current.scrollBy({left:200,behavior:"smooth"});},style:{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"›")
      ),

      // POWER RANKINGS
      leagueSubTab==="power"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:16,marginBottom:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
              React.createElement("span",{style:{fontSize:20,color:T.green,fontWeight:900}},"↗"),
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:900,fontSize:22}},"Power Rankings"),
                React.createElement("div",{style:{fontSize:12,color:T.textSub,marginTop:2,display:"flex",alignItems:"center",gap:4}},React.createElement("span",{style:{color:T.gold,fontWeight:700}},"$"),"Powered by FDP Values")
              )
            ),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("button",{onClick:function(){if(activeLeague){try{localStorage.removeItem('fdp_sp_v1');}catch(e){}connectLeague(activeLeague);}},disabled:leagueImportStatus==="connecting",style:{padding:"8px 14px",borderRadius:10,border:"1px solid "+T.borderPurple,background:T.purpleDim,color:T.purple,fontWeight:700,fontSize:11,cursor:leagueImportStatus==="connecting"?"wait":"pointer",display:"flex",alignItems:"center",gap:4,opacity:leagueImportStatus==="connecting"?0.6:1}},React.createElement("span",null,leagueImportStatus==="connecting"?"⏳":"↻"),leagueImportStatus==="connecting"?" Syncing...":" Sync FDP Values"),
              React.createElement("button",{onClick:function(){if(activeLeague)connectLeague(activeLeague);},disabled:leagueImportStatus==="connecting",style:{padding:"8px 14px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textSub,fontWeight:700,fontSize:11,cursor:leagueImportStatus==="connecting"?"wait":"pointer",opacity:leagueImportStatus==="connecting"?0.6:1}},leagueImportStatus==="connecting"?"Loading...":"Refresh")
            )
          )
        ),
        !powerRankingTeams&&React.createElement("div",{style:{background:T.bgInput,border:"1px solid "+T.border,borderRadius:12,padding:"14px 16px",marginBottom:16,textAlign:"center"}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:8}},"Import your Sleeper league to see real power rankings"),
          React.createElement("button",{onClick:function(){setLeagueSubTab("leagimport");},style:{padding:"8px 20px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Import League")
        ),
        (powerRankingTeams||LEAGUE_TEAMS).map(function(team,i){
          var ords=["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
          var ord=ords[i]||(i+1)+"th";
          var badgeBg=i===0?"#f59e0b":i===1?"#9ca3af":i===2?"#b45309":T.bgInput;
          var badgeText=i<3?"#000":T.textSub;
          var record=powerRankingTeams?(team.wins||0)+"-"+(team.losses||0):(team.record||"0-0");
          var playerCount=powerRankingTeams?(team.players||[]).length:(team.players||0);
          return React.createElement("div",{key:team.name+i,style:{background:T.bgCard,border:"1px solid "+(i===0?T.borderPurple:T.border),borderRadius:14,padding:16,marginBottom:10}},
            React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}},
              React.createElement("div",{style:{background:badgeBg,borderRadius:20,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:4,flexShrink:0}},
                React.createElement("span",{style:{fontSize:12}},"\uD83C\uDFC6"),
                React.createElement("span",{style:{fontWeight:900,fontSize:13,color:badgeText}},ord)
              ),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:800,fontSize:15,marginBottom:4}},team.name),
                powerRankingTeams&&team.owner&&React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:2}},team.owner),
                React.createElement("div",{style:{fontSize:11,color:T.textSub,display:"flex",gap:8,alignItems:"center"}},
                  React.createElement("span",null,"\uD83D\uDC65 "+record),
                  powerRankingTeams&&React.createElement("span",{style:{color:T.purpleLight,fontWeight:700}},"Value: "+(team.totalVal||0).toLocaleString())
                )
              )
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}},
              [["Players",playerCount],["Draft Picks",team.picks]].map(function(s){return React.createElement("div",{key:s[0],style:{background:T.bgInput,borderRadius:8,padding:"10px 12px"}},React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:2}},s[0]),React.createElement("div",{style:{fontWeight:800,fontSize:18}},s[1]));})
            ),
            team.faab!=null&&React.createElement("div",{style:{background:T.bgInput,borderRadius:8,padding:"10px 12px",marginBottom:12}},
              React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:2}},"FAAB Remaining"),
              React.createElement("div",{style:{fontWeight:800,fontSize:18}},"$"+team.faab)
            ),
            React.createElement("button",{onClick:function(){setRosterViewTeam(i);},style:{width:"100%",padding:"11px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.purple,fontWeight:700,fontSize:13,cursor:"pointer",marginTop:team.faab!=null?0:12}},"View Full Roster")
          );
        })
      ),

      // PLAYOFF ODDS
      leagueSubTab==="playoff"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:16,marginBottom:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:900,fontSize:22,lineHeight:1.1}},"Playoff Odds"),
              React.createElement("div",{style:{fontWeight:900,fontSize:22,lineHeight:1.1,marginBottom:6}},"Simulator"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub}},(activeLeague&&activeLeague.name)||"Fantasy League · 2026")
            ),
            React.createElement("button",{style:{padding:"8px 14px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textSub,fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}},
              React.createElement("span",null,"↓")," Export"
            )
          ),
          React.createElement("div",{style:{marginBottom:14}},
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:6,fontWeight:600}},"Number of Simulations"),
            React.createElement("select",{value:simCount,onChange:function(e){setSimCount(e.target.value);setSimRan(false);},style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none",width:"100%"}},
              ["100","500","1,000 (Recommended)","5,000","10,000"].map(function(v){return React.createElement("option",{key:v},v);})
            )
          ),
          React.createElement("button",{onClick:function(){setSimRunning(true);setSimRan(false);setTimeout(function(){setSimRunning(false);setSimRan(true);},1800);},style:{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}},simRunning?"Running simulation...":"Run Simulation")
        ),
        simRan&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:16,marginBottom:16}},
          React.createElement("div",{style:{fontSize:12,fontWeight:600,marginBottom:10,color:T.textSub}},"Save Results"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            React.createElement("input",{placeholder:"Add notes (optional)",value:simNotes,onChange:function(e){setSimNotes(e.target.value);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:12,outline:"none"}}),
            React.createElement("button",{onClick:function(){setSimSaved(true);},style:{padding:"10px 16px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}},
              React.createElement("span",null,"▣"),simSaved?" Saved!":" Save"
            )
          )
        ),
        simRan&&(function(){
          var n=activeTeams.length;
          var totalLeagueVal=activeTeams.reduce(function(s,t){return s+(t.totalVal||1);},0);
          var avgVal=totalLeagueVal/Math.max(1,n);
          var playoffSpots=Math.round(n/2);
          var simTeams=activeTeams.map(function(team,i){
            var str=Math.max(0.1,(team.totalVal||avgVal)/avgVal);
            var mp=team.makePlayoffs!=null?team.makePlayoffs:Math.min(97,Math.max(8,Math.round((playoffSpots/n)*100*(0.5+str*0.5))));
            var frb=team.firstRoundBye!=null?team.firstRoundBye:Math.min(55,Math.max(2,Math.round(mp*0.28)));
            var wc=team.winChamp!=null?team.winChamp:Math.min(45,Math.max(1,Math.round(mp*0.15)));
            var gamesPerSeason=n>=10?14:13;
            var rec=team.record||(powerRankingTeams?(team.wins||0)+"-"+(team.losses||0):"0-0");
            var projW=team.projW!=null?team.projW:+(Math.min(gamesPerSeason-1,Math.max(1,gamesPerSeason*(mp/100)*(0.8+Math.random()*0.4)))).toFixed(1);
            return Object.assign({},team,{makePlayoffs:mp,firstRoundBye:frb,winChamp:wc,record:rec,projW:projW});
          });
          var leader=simTeams[0];
          return React.createElement("div",null,
            React.createElement("div",{style:{background:"linear-gradient(135deg,#1a1400,#1e1a00)",border:"1px solid "+T.gold+"44",borderRadius:14,padding:16,marginBottom:16}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
                React.createElement("span",{style:{fontSize:20,color:T.gold}},"★"),
                React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.gold}},"Championship Favorite")
              ),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Most Likely Champion"),
              React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.gold,marginBottom:4}},leader.name),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},leader.record+" · "+leader.makePlayoffs+"% playoff odds")
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
              React.createElement("div",{style:{fontWeight:800,fontSize:16}},"Simulation Results"),
              React.createElement("div",{style:{fontSize:10,color:T.textSub}},n+" teams · "+simCount.split(" ")[0]+" sims")
            ),
            simTeams.map(function(team,i){
              var collapsed=expandedTeam===team.name;
              return React.createElement("div",{key:team.name+i,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:10}},
                React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:12}},
                  React.createElement("div",{style:{width:40,height:40,borderRadius:"50%",background:i===0?T.purple:T.bgInput,border:"2px solid "+(i===0?T.purple:T.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
                    React.createElement("span",{style:{fontWeight:900,fontSize:12,color:i===0?"#fff":T.textSub}},"#"+(i+1))
                  ),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:800,fontSize:14}},team.name),
                    React.createElement("div",{style:{fontSize:10,color:T.textSub,display:"flex",gap:8}},
                      React.createElement("span",null,"Record: "+team.record),
                      React.createElement("span",null,"Proj: "+team.projW+" W")
                    )
                  ),
                  React.createElement("button",{onClick:function(){setExpandedTeam(collapsed?null:team.name);},style:{background:"none",border:"none",color:T.textSub,cursor:"pointer",fontSize:12,paddingTop:4}},collapsed?"▲":"▼")
                ),
                !collapsed&&React.createElement("div",{style:{marginTop:12}},
                  [["Make Playoffs",team.makePlayoffs,T.gold,"linear-gradient(90deg,#d97706,#f59e0b)"],["First Round Bye",team.firstRoundBye,"#f87171","#dc2626"],["Win Championship",team.winChamp,"#f87171","#b91c1c"]].map(function(row){
                    return React.createElement("div",{key:row[0],style:{marginBottom:10}},
                      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
                        React.createElement("span",{style:{fontSize:12,color:T.textSub}},row[0]),
                        React.createElement("span",{style:{fontWeight:800,fontSize:14,color:row[2]}},row[1]+"%")
                      ),
                      React.createElement("div",{style:{background:T.border,borderRadius:99,height:7,overflow:"hidden"}},
                        React.createElement("div",{style:{width:row[1]+"%",height:"100%",background:row[3],borderRadius:99}})
                      )
                    );
                  })
                )
              );
            })
          );
        })()
      ),

      // CHAMPIONSHIP
      leagueSubTab==="champ"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("span",{style:{fontSize:28,color:T.gold}},"★"),
          React.createElement("div",{style:{fontWeight:900,fontSize:26,lineHeight:1.1}},"Championship Probability")
        ),
        activeTeams.map(function(team,i){
          var _avgV2=activeTeams.reduce(function(s,t){return s+(t.totalVal||1);},0)/Math.max(1,activeTeams.length);
          var _str=Math.max(0.1,(team.totalVal||_avgV2)/_avgV2);
          var _spots=Math.round(activeTeams.length/2);
          var po=team.playoffOdds!=null?team.playoffOdds:Math.min(97,Math.max(8,Math.round((_spots/activeTeams.length)*100*(0.5+_str*0.5))));
          var co=team.champOdds!=null?team.champOdds:Math.min(45,Math.max(1,Math.round(po*0.15)));
          var ww=team.weeklyWin!=null?team.weeklyWin:Math.min(75,Math.max(25,Math.round(50+(_str-1)*20)));
          var showStr=strengthTeam===i;
          var players=Array.isArray(team.players)?team.players:[];
          var posGroups=["QB","RB","WR","TE"].map(function(pos){
            var grp=players.filter(function(p){return p.pos===pos;});
            var val=grp.reduce(function(s,p){return s+(p.tradeVal||0);},0);
            var maxVal=activeTeams.reduce(function(mx,t){
              var tv=(Array.isArray(t.players)?t.players:[]).filter(function(p){return p.pos===pos;}).reduce(function(s,p){return s+(p.tradeVal||0);},0);
              return Math.max(mx,tv);
            },1);
            return {pos:pos,val:val,pct:Math.min(100,Math.round(val/maxVal*100)),top:(grp[0]&&grp[0].name)||"—"};
          });
          return React.createElement("div",{key:team.name+i,style:{background:T.bgCard,border:"1px solid "+(i===0?T.gold+"66":T.border),borderRadius:14,padding:16,marginBottom:10}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14}},
              React.createElement("span",{style:{fontWeight:900,fontSize:16,color:T.textDim}},"#"+(i+1)),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:800,fontSize:15}},team.name),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},"Total Value: "+(team.totalVal||0).toLocaleString())
              ),
              i===0&&React.createElement("span",{style:{fontSize:20,color:T.gold}},"★")
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Playoff Odds"),
                React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.green,marginBottom:6}},po+"%"),
                React.createElement("div",{style:{background:T.border,borderRadius:99,height:5,overflow:"hidden"}},React.createElement("div",{style:{width:po+"%",height:"100%",background:"#2563eb",borderRadius:99}}))
              ),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Championship Odds"),
                React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.cyan,marginBottom:6}},co+"%"),
                React.createElement("div",{style:{background:T.border,borderRadius:99,height:5,overflow:"hidden"}},React.createElement("div",{style:{width:co+"%",height:"100%",background:T.gold,borderRadius:99}}))
              )
            ),
            React.createElement("div",{style:{marginBottom:14}},
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Weekly Win Probability"),
              React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.green,marginBottom:6}},ww+"%"),
              React.createElement("div",{style:{background:T.border,borderRadius:99,height:5,overflow:"hidden"}},React.createElement("div",{style:{width:ww+"%",height:"100%",background:T.green,borderRadius:99}}))
            ),
            React.createElement("button",{onClick:function(){setStrengthTeam(showStr?null:i);},style:{width:"100%",padding:"11px",borderRadius:10,border:"none",background:showStr?T.purpleDim:"#2563eb",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
              React.createElement("span",null,showStr?"▲":"◷"),showStr?" Hide Strengths":" View Team Strengths"
            ),
            showStr&&React.createElement("div",{style:{marginTop:14,borderTop:"1px solid "+T.border,paddingTop:14}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13,marginBottom:10,color:T.purple}},"Position Group Strength"),
              posGroups.map(function(g){
                var barColor=g.pos==="QB"?POS_COLORS.QB:g.pos==="RB"?POS_COLORS.RB:g.pos==="WR"?POS_COLORS.WR:POS_COLORS.TE;
                return React.createElement("div",{key:g.pos,style:{marginBottom:10}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},
                    React.createElement("span",{style:{fontWeight:700,fontSize:12,color:barColor}},g.pos),
                    React.createElement("span",{style:{fontSize:11,color:T.textSub}},g.top),
                    React.createElement("span",{style:{fontWeight:700,fontSize:12,color:T.text}},g.pct+"%")
                  ),
                  React.createElement("div",{style:{background:T.border,borderRadius:99,height:7,overflow:"hidden"}},
                    React.createElement("div",{style:{width:g.pct+"%",height:"100%",background:barColor,borderRadius:99,transition:"width 0.4s ease"}})
                  )
                );
              }),
              players.length===0&&React.createElement("div",{style:{fontSize:12,color:T.textSub,textAlign:"center",padding:"8px 0"}},"Import your league to see position breakdown")
            )
          );
        })
      ),

      // TEAM ADVICE
      leagueSubTab==="advice"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{marginBottom:16}},
          React.createElement("select",{value:adviceTeam,onChange:function(e){setAdviceTeam(Number(e.target.value));},style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none",width:"100%"}},
            activeTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name);})
          )
        ),
        (function(){
          var team=activeTeams[adviceTeam]||activeTeams[0];
          var sortedVals=activeTeams.slice().sort(function(a,b){return b.totalVal-a.totalVal;});
          var valRank=sortedVals.findIndex(function(t){return t.name===team.name;});
          var pct=activeTeams.length>1?valRank/(activeTeams.length-1):0.5;
          var mode=pct<0.33?"COMPETE":pct<0.67?"NEUTRAL":"REBUILD";
          var modeColor=mode==="COMPETE"?T.green:mode==="NEUTRAL"?T.gold:T.red;
          var modeBg=mode==="COMPETE"?"linear-gradient(135deg,#052e16,#064e3b)":mode==="NEUTRAL"?"linear-gradient(135deg,#1c1400,#261c00)":"linear-gradient(135deg,#2d0707,#3b0f0f)";
          var modeIcon=mode==="COMPETE"?"↗":mode==="NEUTRAL"?"→":"↘";
          var modeDesc=mode==="COMPETE"?"Win now. Your team is built to compete for a championship this season.":mode==="NEUTRAL"?"Balance youth and veterans. Trades should go either direction.":"Focus on the future. Acquire picks and young talent for sustained success.";
          var spread=sortedVals.length>1?Math.abs(sortedVals[0].totalVal-sortedVals[sortedVals.length-1].totalVal):1;
          var distFromMedian=spread>0?Math.abs(team.totalVal-(sortedVals[Math.floor(sortedVals.length/2)]||{totalVal:team.totalVal}).totalVal)/spread:0;
          var confidence=Math.min(98,Math.round(60+distFromMedian*38));
          var leaguePercentile=Math.round((1-pct)*100);
          var starterVal=Math.round(team.totalVal*0.65/1000)*1000;
          var futureVal=team.picks*8500;
          var agingRisk=Math.max(0,Math.round(adviceTeam*3.5));
          return React.createElement("div",null,
            React.createElement("div",{style:{background:modeBg,border:"1px solid "+modeColor+"44",borderRadius:16,padding:20,marginBottom:14}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}},
                React.createElement("div",{style:{flex:1,marginRight:12}},
                  React.createElement("div",{style:{fontWeight:900,fontSize:28,color:"#fff",letterSpacing:1}},mode),
                  React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:6,marginTop:6}},
                    React.createElement("span",{style:{color:modeColor,fontSize:14,flexShrink:0,marginTop:2}},modeIcon),
                    React.createElement("div",{style:{fontSize:13,color:"#fff",opacity:0.9,lineHeight:1.4}},modeDesc)
                  )
                ),
                React.createElement("button",{onClick:function(){if(activeLeague){if(activeLeague.league_id.startsWith("espn_"))doEspnImport();else connectLeague(activeLeague);}else{setLeagueSubTab("leagimport");}},disabled:leagueImportStatus==="connecting",style:{padding:"8px 14px",borderRadius:10,border:"1px solid "+modeColor+"44",background:modeColor+"22",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0,opacity:leagueImportStatus==="connecting"?0.6:1}},
                  React.createElement("span",null,"↻"),leagueImportStatus==="connecting"?" Refreshing...":" Refresh"
                )
              ),
              React.createElement("div",{style:{marginTop:14}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
                  React.createElement("span",{style:{fontSize:12,color:"#fff",opacity:0.8}},"Confidence"),
                  React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#fff"}},confidence+"%")
                ),
                React.createElement("div",{style:{background:"rgba(0,0,0,0.4)",borderRadius:99,height:8,overflow:"hidden"}},
                  React.createElement("div",{style:{width:confidence+"%",height:"100%",background:modeColor,borderRadius:99}})
                )
              )
            ),
            [["▦","League Rank",leaguePercentile+"th","percentile","#818cf8"],["◎","Starter Value",starterVal.toLocaleString(),"FDP value","#818cf8"],["↗","Future Value",futureVal.toLocaleString(),"youth (≤24)",T.green],["◷","Aging Risk",agingRisk,"veterans","#f97316"]].map(function(card){
              return React.createElement("div",{key:card[1],style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:10}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
                  React.createElement("span",{style:{fontSize:16,color:card[4]}},card[0]),
                  React.createElement("span",{style:{fontSize:12,color:T.textSub,fontWeight:600}},card[1])
                ),
                React.createElement("div",{style:{fontWeight:900,fontSize:28,color:card[4],marginBottom:2}},card[2]),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},card[3])
              );
            })
          );
        })()
      ),

      // ROSTER HEALTH
      leagueSubTab==="roster"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:12}},
          React.createElement("span",{style:{fontSize:28,color:"#60a5fa",fontWeight:900}},"\u2665"),
          React.createElement("div",{style:{fontWeight:900,fontSize:28,lineHeight:1.1}},"Roster Health Dashboard")
        ),
        activeTeams.length>0&&React.createElement("select",{value:rosterTeamIdx,onChange:function(e){setRosterTeamIdx(Number(e.target.value));},style:{width:"100%",background:T.bgInput,color:T.text,border:"1px solid "+T.borderPurple,borderRadius:12,padding:"12px 14px",fontSize:14,fontWeight:700,outline:"none",marginBottom:16,cursor:"pointer"}},
          activeTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name||"Team "+(i+1));})
        ),
        (function(){
          var selectedTeam=activeTeams[rosterTeamIdx]||activeTeams[0];
          var myPlayers=(selectedTeam&&selectedTeam.players&&selectedTeam.players.length>0?selectedTeam.players:rankedPlayers).filter(function(p){return p.pos!=="DST"&&p.pos!=="K";});
          var healthy=myPlayers.length;
          var injured=0;
          var onBye=0;
          var posCounts={};
          myPlayers.forEach(function(p){posCounts[p.pos]=(posCounts[p.pos]||0)+1;});
          return React.createElement("div",null,
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:16}},
              React.createElement("div",{style:{background:"linear-gradient(135deg,#052e16,#065f46)",border:"1px solid "+T.green+"33",borderRadius:14,padding:16}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},React.createElement("span",{style:{fontSize:18,color:T.green}},"✓"),React.createElement("span",{style:{fontSize:13,color:"#a7f3d0"}},"Healthy")),
                React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.green}},healthy)
              ),
              React.createElement("div",{style:{background:"linear-gradient(135deg,#2d0707,#3b0f0f)",border:"1px solid "+T.red+"33",borderRadius:14,padding:16}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},React.createElement("span",{style:{fontSize:18,color:T.red}},"⚠"),React.createElement("span",{style:{fontSize:13,color:"#fca5a5"}},"Injured")),
                React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.red}},injured)
              ),
              React.createElement("div",{style:{background:T.bgCard,border:"1px solid #3b82f633",borderRadius:14,padding:16}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},React.createElement("span",{style:{fontSize:18,color:"#60a5fa"}},"▦"),React.createElement("span",{style:{fontSize:13,color:"#93c5fd"}},"On Bye (Week "+byeWeek+")")),
                React.createElement("div",{style:{fontWeight:900,fontSize:28,color:"#60a5fa"}},onBye)
              ),
              React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16}},
                React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:6}},"Roster Size"),
                React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text}},myPlayers.length)
              )
            ),
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:14,padding:16,marginBottom:16}},
              React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:14}},"Position Breakdown"),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
                [["WR",posCounts["WR"]||0],["RB",posCounts["RB"]||0],["TE",posCounts["TE"]||0],["QB",posCounts["QB"]||0]].map(function(pc){
                  return React.createElement("div",{key:pc[0],style:{textAlign:"center"}},
                    React.createElement("div",{style:{fontWeight:900,fontSize:28}},pc[1]),
                    React.createElement("div",{style:{fontSize:11,color:T.textSub,fontWeight:600}},pc[0])
                  );
                })
              )
            ),
            React.createElement("div",{style:{marginBottom:16}},
              React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:6,fontWeight:600}},"Check Bye Week"),
              React.createElement("input",{type:"number",value:byeWeek,onChange:function(e){setByeWeek(Number(e.target.value));},style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none",width:"60px"}})
            ),
            myPlayers.map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:10,display:"flex",alignItems:"center",gap:14}},
                React.createElement("div",{style:{position:"relative",flexShrink:0}},
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:52}),
                  React.createElement("div",{style:{position:"absolute",bottom:-2,right:-2,background:"#1a1a2e",borderRadius:6,padding:"1px 5px",fontSize:9,fontWeight:700,color:T.textSub,border:"1px solid "+T.border}},p.team)
                ),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:6}},p.name),
                  React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:4,background:T.green+"18",border:"1px solid "+T.green+"33",borderRadius:20,padding:"3px 10px"}},
                    React.createElement("span",{style:{color:T.green,fontSize:11}},"✓"),
                    React.createElement("span",{style:{color:T.green,fontWeight:700,fontSize:11}},"Healthy")
                  )
                )
              );
            })
          );
        })()
      ),

      // WAIVER WIRE
      leagueSubTab==="waiver"&&(function(){
        var hasRealRosters=activeTeams.length>0&&activeTeams.some(function(t){return Array.isArray(t.players)&&t.players.length>0;});
        var rosteredNames=new Set();
        if(hasRealRosters){activeTeams.forEach(function(t){if(Array.isArray(t.players))t.players.forEach(function(p){if(p&&p.name)rosteredNames.add(p.name.toLowerCase());});});}
        var availablePlayers=rankedPlayers.filter(function(p){
          if(p.pos==="DST"||p.pos==="K")return false;
          if(waiverPos!=="All Positions"&&p.pos!==waiverPos)return false;
          if(waiverSearch&&!p.name.toLowerCase().includes(waiverSearch.toLowerCase()))return false;
          return hasRealRosters?!rosteredNames.has(p.name.toLowerCase()):p.rank>20;
        }).slice().sort(function(a,b){return sortBy==="pts"?b.pts-a.pts:sortBy==="age"?a.age-b.age:b.tradeVal-a.tradeVal;});
        return React.createElement("div",{style:{padding:"16px"}},
          React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}},
            React.createElement("span",{style:{fontSize:30,color:"#60a5fa",fontWeight:900,marginTop:2}},"↗"),
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:900,fontSize:30,lineHeight:1.15}},"Waiver Wire"),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},hasRealRosters?availablePlayers.length+" players available in your league":"Showing unrostered players by value")
            )
          ),
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:12}},
            React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10}},
              React.createElement("input",{value:waiverSearch,onChange:function(e){setWaiverSearch(e.target.value);},placeholder:"Search players...",style:Object.assign({},inpS,{flex:1,margin:0})}),
              React.createElement("button",{onClick:function(){if(activeLeague&&!activeLeague.league_id.startsWith("espn_")&&activeLeague.league_id!=="manual")connectLeague(activeLeague);},style:{padding:"10px 14px",borderRadius:10,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}},"↻ Refresh")
            ),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("select",{value:waiverPos,onChange:function(e){setWaiverPos(e.target.value);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none"}},
                ["All Positions","QB","RB","WR","TE","DL","LB","DB"].map(function(p){return React.createElement("option",{key:p},p);})
              ),
              React.createElement("select",{value:sortBy,onChange:function(e){setSortBy(e.target.value);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none"}},
                React.createElement("option",{value:"rank"},"Dynasty Value"),
                React.createElement("option",{value:"pts"},"Proj Points"),
                React.createElement("option",{value:"age"},"Age")
              )
            )
          ),
          availablePlayers.slice(0,50).map(function(p){
            return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}},
              React.createElement(Avatar,{name:p.name,pos:p.pos,size:40}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},p.pos+" · "+p.team+" · Age "+p.age)
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:12,color:T.purple,fontWeight:700}},(p.tradeVal||0).toLocaleString()),
                React.createElement("div",{style:{fontSize:11,color:T.green}},p.pts.toFixed(1)+" proj")
              )
            );
          })
        );
      })(),

      // LINEUP OPTIMIZER
      leagueSubTab==="lineup"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("span",{style:{fontSize:28,color:T.purple}},"◎"),
          React.createElement("div",{style:{fontWeight:900,fontSize:30}},"Lineup Optimizer")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:14}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:600}},"Select Team"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            React.createElement("select",{value:lineupTeam,onChange:function(e){setLineupTeam(Number(e.target.value));setLineupOptimized(false);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none"}},
              activeTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name);})
            ),
            React.createElement("button",{onClick:function(){setLineupOptimized(true);},style:{padding:"10px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}},React.createElement("span",null,"↻")," Optimize")
          )
        ),
        lineupOptimized&&(function(){
          var teamPlrs=(activeTeams[lineupTeam]&&activeTeams[lineupTeam].players&&activeTeams[lineupTeam].players.length>0?activeTeams[lineupTeam].players:rankedPlayers).filter(function(p){return p.pos!=="DST"&&p.pos!=="K";});
          var qbs=teamPlrs.filter(function(p){return p.pos==="QB";});
          var rbs=teamPlrs.filter(function(p){return p.pos==="RB";});
          var wrs=teamPlrs.filter(function(p){return p.pos==="WR";});
          var tes=teamPlrs.filter(function(p){return p.pos==="TE";});
          var sortP=function(arr){return arr.slice().sort(function(a,b){return b.pts-a.pts;});};
          var curSlots=[["QB",qbs[0]||null],["RB",rbs[0]||null],["RB",rbs[1]||null],["WR",wrs[0]||null],["WR",wrs[1]||null],["TE",tes[0]||null]];
          var optSlots=[["QB",sortP(qbs)[0]||null],["RB",sortP(rbs)[0]||null],["RB",sortP(rbs)[1]||null],["WR",sortP(wrs)[0]||null],["WR",sortP(wrs)[1]||null],["TE",sortP(tes)[0]||null]];
          var bench=teamPlrs.filter(function(p){return !curSlots.find(function(s){return s[1]&&s[1].name===p.name;});}).slice(0,5);
          var curPts=curSlots.reduce(function(s,sl){return s+(sl[1]?sl[1].pts:0);},0);
          var optPts=optSlots.reduce(function(s,sl){return s+(sl[1]?sl[1].pts:0);},0);
          var curVal=curSlots.reduce(function(s,sl){return s+(sl[1]?sl[1].tradeVal:0);},0);
          var optVal=optSlots.reduce(function(s,sl){return s+(sl[1]?sl[1].tradeVal:0);},0);
          var imps=[];
          optSlots.forEach(function(os,i){if(curSlots[i]&&os[1]&&curSlots[i][1]&&os[1].name!==curSlots[i][1].name){var vd=Math.max(1,os[1].tradeVal-curSlots[i][1].tradeVal);var pd=+(os[1].pts-curSlots[i][1].pts).toFixed(1);imps.push("Swap in "+os[1].name+" for "+curSlots[i][1].name+" (+"+vd.toLocaleString()+" value, +"+pd+" pts)");}});
          return React.createElement("div",null,
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:16}},
              [["Current Value",curVal.toLocaleString(),curPts.toFixed(1)+" pts",T.text,T.border],["Optimal Value",optVal.toLocaleString(),optPts.toFixed(1)+" pts",T.green,T.green+"33"],["Value Gain","+"+(optVal-curVal).toLocaleString(),"+"+(optPts-curPts).toFixed(1)+" pts",T.green,T.green+"33"]].map(function(card){
                return React.createElement("div",{key:card[0],style:{background:T.bgCard,border:"1px solid "+card[4],borderRadius:14,padding:16}},
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},card[0]),
                  React.createElement("div",{style:{fontWeight:900,fontSize:28,color:card[3]}},card[1]),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},card[2])
                );
              })
            ),
            imps.length>0&&React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.borderPurple,borderRadius:14,padding:16,marginBottom:16}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10}},
                React.createElement("span",{style:{fontSize:14,color:T.purple}},"i"),
                React.createElement("span",{style:{fontWeight:700,fontSize:14,color:T.purple}},"Lineup Improvements Available")
              ),
              imps.map(function(imp,idx){return React.createElement("div",{key:idx,style:{fontSize:12,color:T.text,marginBottom:4,lineHeight:1.5}},"· "+imp);})
            ),
            React.createElement("div",{style:{fontWeight:800,fontSize:20,marginBottom:12}},"Current Lineup"),
            curSlots.map(function(slot,si){
              var p=slot[1];
              if(!p) return null;
              return React.createElement("div",{key:si,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}},
                React.createElement("div",{style:{position:"relative",flexShrink:0}},
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:48}),
                  React.createElement("div",{style:{position:"absolute",bottom:-2,right:-2,background:"#1a1a2e",borderRadius:4,padding:"1px 4px",fontSize:8,fontWeight:700,color:T.textSub,border:"1px solid "+T.border}},p.team)
                ),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:2,fontWeight:600}},slot[0]),
                  React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:2}},p.name),
                  React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:6}},p.pos+" - "+p.team),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16}},
                    React.createElement("span",{style:{fontSize:13,color:T.purple,fontWeight:700}},"Value: "+p.tradeVal.toLocaleString()),
                    React.createElement("span",{style:{fontSize:13,color:T.green,fontWeight:600}},"Proj: "+p.pts.toFixed(1)+" pts")
                  )
                )
              );
            }),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginTop:8,marginBottom:12}},
              React.createElement("span",{style:{fontSize:24,color:T.green}},"↗"),
              React.createElement("span",{style:{fontWeight:800,fontSize:20}},"Optimal Lineup")
            ),
            optSlots.map(function(slot,si){
              var p=slot[1];
              var isBetter=curSlots[si]&&p&&curSlots[si][1]&&p.name!==curSlots[si][1].name;
              if(!p) return null;
              return React.createElement("div",{key:si,style:{background:T.bgCard,border:"1px solid "+(isBetter?T.borderPurple:T.border),borderRadius:12,padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}},
                React.createElement("div",{style:{position:"relative",flexShrink:0}},
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:48}),
                  React.createElement("div",{style:{position:"absolute",bottom:-2,right:-2,background:"#1a1a2e",borderRadius:4,padding:"1px 4px",fontSize:8,fontWeight:700,color:T.textSub,border:"1px solid "+T.border}},p.team)
                ),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:2}},
                    React.createElement("span",{style:{fontSize:11,color:T.textSub,fontWeight:600}},slot[0]),
                    isBetter&&React.createElement("div",{style:{background:T.green,color:"#fff",fontSize:10,fontWeight:800,borderRadius:20,padding:"2px 10px",display:"inline-flex",alignItems:"center",gap:4}},React.createElement("span",null,"↗"),"BETTER")
                  ),
                  React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:2}},p.name),
                  React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:6}},p.pos+" - "+p.team),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16}},
                    React.createElement("span",{style:{fontSize:13,color:T.purple,fontWeight:700}},"Value: "+p.tradeVal.toLocaleString()),
                    React.createElement("span",{style:{fontSize:13,color:T.green,fontWeight:600}},"Proj: "+p.pts.toFixed(1)+" pts")
                  )
                )
              );
            }),
            React.createElement("div",{style:{fontWeight:800,fontSize:20,marginBottom:12,marginTop:8}},"Bench Players"),
            bench.map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}},
                React.createElement("div",{style:{position:"relative",flexShrink:0}},
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:48}),
                  React.createElement("div",{style:{position:"absolute",bottom:-2,right:-2,background:"#1a1a2e",borderRadius:4,padding:"1px 4px",fontSize:8,fontWeight:700,color:T.textSub,border:"1px solid "+T.border}},p.team)
                ),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:2,fontWeight:600}},p.pos),
                  React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:2}},p.name),
                  React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:6}},p.pos+" - "+p.team),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16}},
                    React.createElement("span",{style:{fontSize:13,color:T.purple,fontWeight:700}},"Value: "+p.tradeVal.toLocaleString()),
                    React.createElement("span",{style:{fontSize:13,color:T.green,fontWeight:600}},"Proj: "+p.pts.toFixed(1)+" pts")
                  )
                )
              );
            })
          );
        })()
      ),

      // START / SIT
      leagueSubTab==="startsit"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("div",{style:{width:44,height:44,borderRadius:12,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
            React.createElement("span",{style:{fontSize:22,color:"#fff"}},"⚡")
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text}},"Start / Sit"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Weekly lineup decision tool")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:14}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:8,fontWeight:600}},"Scoring Format"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            ["PPR","Half","Standard"].map(function(f){
              return React.createElement("button",{key:f,onClick:function(){setSitFormat(f);},style:{flex:1,padding:"10px",borderRadius:10,border:"1px solid "+(sitFormat===f?T.purple:T.border),background:sitFormat===f?T.purple:"transparent",color:sitFormat===f?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},f);
            })
          )
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:8,alignItems:"start",marginBottom:16}},
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:14}},
            React.createElement("div",{style:{fontSize:11,fontWeight:800,color:T.textSub,letterSpacing:1,marginBottom:10}},"PLAYER 1"),
            React.createElement("div",{style:{position:"relative",marginBottom:sitP1?12:0}},
              React.createElement("input",{value:sitS1,onChange:function(e){setSitS1(e.target.value);setSitP1(null);},placeholder:"Search player...",style:{width:"100%",boxSizing:"border-box",background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none"}}),
              sitS1&&!sitP1&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px #0008"}},
                rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(sitS1.toLowerCase());}).slice(0,5).map(function(p){
                  return React.createElement("button",{key:p.name,onClick:function(){setSitP1(p);setSitS1(p.name);},style:{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",borderBottom:"1px solid "+T.border,padding:"8px 12px",cursor:"pointer",textAlign:"left"}},
                    React.createElement(Avatar,{name:p.name,pos:p.pos,size:22}),
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name),
                      React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.pos+" · "+p.team)
                    )
                  );
                })
              )
            ),
            sitP1&&(function(){var gs1=getGameScript(sitP1.team,oddsData);return React.createElement("div",{style:{textAlign:"center"}},
              React.createElement(Avatar,{name:sitP1.name,pos:sitP1.pos,size:56}),
              React.createElement("div",{style:{fontWeight:700,fontSize:14,marginTop:8,color:T.text}},sitP1.name),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:8}},sitP1.pos+" · "+sitP1.team),
              React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.purple}},((sitP1.proj&&(sitP1.proj[sitFormat==="Standard"?"Standard":sitFormat==="Half"?"Half":"PPR"]||sitP1.proj.PPR))||sitP1.pts||0).toFixed(1)),
              React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:gs1?6:0}},"PROJ PTS ("+sitFormat+")"),
              gs1&&React.createElement("div",{style:{display:"inline-flex",flexDirection:"column",gap:2,marginTop:4,background:gs1.color+"18",border:"1px solid "+gs1.color+"44",borderRadius:8,padding:"4px 8px"}},
                React.createElement("div",{style:{fontSize:10,fontWeight:700,color:gs1.color}},gs1.label),
                React.createElement("div",{style:{fontSize:9,color:T.textSub}},(gs1.spread>0?"+":"")+gs1.spread+" · O/U "+gs1.total+" vs "+gs1.opp)
              )
            );})()
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:40,marginTop:40}},
            React.createElement("div",{style:{fontWeight:900,fontSize:13,color:T.textSub}},"VS")
          ),
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:14}},
            React.createElement("div",{style:{fontSize:11,fontWeight:800,color:T.textSub,letterSpacing:1,marginBottom:10}},"PLAYER 2"),
            React.createElement("div",{style:{position:"relative",marginBottom:sitP2?12:0}},
              React.createElement("input",{value:sitS2,onChange:function(e){setSitS2(e.target.value);setSitP2(null);},placeholder:"Search player...",style:{width:"100%",boxSizing:"border-box",background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none"}}),
              sitS2&&!sitP2&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px #0008"}},
                rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(sitS2.toLowerCase());}).slice(0,5).map(function(p){
                  return React.createElement("button",{key:p.name,onClick:function(){setSitP2(p);setSitS2(p.name);},style:{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",borderBottom:"1px solid "+T.border,padding:"8px 12px",cursor:"pointer",textAlign:"left"}},
                    React.createElement(Avatar,{name:p.name,pos:p.pos,size:22}),
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name),
                      React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.pos+" · "+p.team)
                    )
                  );
                })
              )
            ),
            sitP2&&(function(){var gs2=getGameScript(sitP2.team,oddsData);return React.createElement("div",{style:{textAlign:"center"}},
              React.createElement(Avatar,{name:sitP2.name,pos:sitP2.pos,size:56}),
              React.createElement("div",{style:{fontWeight:700,fontSize:14,marginTop:8,color:T.text}},sitP2.name),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:8}},sitP2.pos+" · "+sitP2.team),
              React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.purple}},((sitP2.proj&&(sitP2.proj[sitFormat==="Standard"?"Standard":sitFormat==="Half"?"Half":"PPR"]||sitP2.proj.PPR))||sitP2.pts||0).toFixed(1)),
              React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:gs2?6:0}},"PROJ PTS ("+sitFormat+")"),
              gs2&&React.createElement("div",{style:{display:"inline-flex",flexDirection:"column",gap:2,marginTop:4,background:gs2.color+"18",border:"1px solid "+gs2.color+"44",borderRadius:8,padding:"4px 8px"}},
                React.createElement("div",{style:{fontSize:10,fontWeight:700,color:gs2.color}},gs2.label),
                React.createElement("div",{style:{fontSize:9,color:T.textSub}},(gs2.spread>0?"+":"")+gs2.spread+" · O/U "+gs2.total+" vs "+gs2.opp)
              )
            );})()
          )
        ),
        sitP1&&sitP2&&(function(){
          var fKey=sitFormat==="Standard"?"Standard":sitFormat==="Half"?"Half":"PPR";
          var p1pts=(sitP1.proj&&sitP1.proj[fKey])||sitP1.pts||0;
          var p2pts=(sitP2.proj&&sitP2.proj[fKey])||sitP2.pts||0;
          var starter=p1pts>=p2pts?sitP1:sitP2;
          var sitter=p1pts>=p2pts?sitP2:sitP1;
          var starterPts=Math.max(p1pts,p2pts);
          var sitterPts=Math.min(p1pts,p2pts);
          var margin=+(starterPts-sitterPts).toFixed(1);
          var confidence=margin>8?"High":margin>3?"Medium":"Slight";
          var confColor=margin>8?T.green:margin>3?T.gold:T.textSub;
          var gs1=getGameScript(sitP1.team,oddsData);
          var gs2=getGameScript(sitP2.team,oddsData);
          var rows=[
            ["Proj Pts ("+sitFormat+")",p1pts.toFixed(1),p2pts.toFixed(1),false],
            ["Trade Value",(sitP1.tradeVal||0).toLocaleString(),(sitP2.tradeVal||0).toLocaleString(),false],
            ["Position Rank","#"+(sitP1.posRank||"—"),"#"+(sitP2.posRank||"—"),true],
            ["Age",sitP1.age,sitP2.age,true],
          ];
          return React.createElement("div",null,
            React.createElement("div",{style:{background:"linear-gradient(135deg,"+T.purple+"22,"+T.purple+"08)",border:"2px solid "+T.purple,borderRadius:16,padding:20,marginBottom:16,textAlign:"center"}},
              React.createElement("div",{style:{fontSize:11,fontWeight:800,color:T.textSub,letterSpacing:2,marginBottom:8}},"RECOMMENDATION"),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:6}},"START"),
              React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.purple,marginBottom:4}},starter.name),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:12}},starter.pos+" · "+starter.team),
              React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:8,background:confColor+"22",border:"1px solid "+confColor+"44",borderRadius:20,padding:"6px 16px"}},
                React.createElement("span",{style:{fontWeight:700,fontSize:13,color:confColor}},confidence+" Edge"),
                React.createElement("span",{style:{fontSize:13,color:T.textSub}},"+"+margin+" projected pts")
              )
            ),
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:14}},
              React.createElement("div",{style:{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}},"Comparison"),
              rows.map(function(row){
                var v1=typeof row[1]==="string"?parseFloat(row[1])||0:Number(row[1]);
                var v2=typeof row[2]==="string"?parseFloat(row[2])||0:Number(row[2]);
                var p1wins=row[3]?(v1<v2):(v1>v2);
                var p2wins=row[3]?(v2<v1):(v2>v1);
                return React.createElement("div",{key:String(row[0]),style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+T.border}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:16,color:p1wins?T.green:T.text,textAlign:"right"}},row[1]),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub,textAlign:"center",fontWeight:600,whiteSpace:"nowrap"}},row[0]),
                  React.createElement("div",{style:{fontWeight:800,fontSize:16,color:p2wins?T.green:T.text,textAlign:"left"}},row[2])
                );
              }),
              (gs1||gs2)&&React.createElement("div",{style:{marginBottom:12,paddingBottom:12,borderBottom:"1px solid "+T.border}},
                React.createElement("div",{style:{fontSize:10,color:T.textSub,textAlign:"center",fontWeight:600,marginBottom:8}},"GAME SCRIPT"),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
                  React.createElement("div",{style:{textAlign:"center"}},
                    gs1?React.createElement("div",null,
                      React.createElement("div",{style:{fontWeight:700,fontSize:11,color:gs1.color}},gs1.script),
                      React.createElement("div",{style:{fontSize:9,color:T.textSub}},(gs1.spread>0?"+":"")+gs1.spread+" · O/U "+gs1.total),
                      React.createElement("div",{style:{fontSize:9,color:T.textDim}},"vs "+gs1.opp)
                    ):React.createElement("div",{style:{fontSize:10,color:T.textDim}},"No line")
                  ),
                  React.createElement("div",{style:{textAlign:"center"}},
                    gs2?React.createElement("div",null,
                      React.createElement("div",{style:{fontWeight:700,fontSize:11,color:gs2.color}},gs2.script),
                      React.createElement("div",{style:{fontSize:9,color:T.textSub}},(gs2.spread>0?"+":"")+gs2.spread+" · O/U "+gs2.total),
                      React.createElement("div",{style:{fontSize:9,color:T.textDim}},"vs "+gs2.opp)
                    ):React.createElement("div",{style:{fontSize:10,color:T.textDim}},"No line")
                  )
                )
              ),
              React.createElement("div",{style:{display:"flex",gap:12,marginTop:4}},
                React.createElement("div",{style:{flex:1,background:T.bgInput,borderRadius:10,padding:"10px 14px",textAlign:"center"}},
                  React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:4}},"SIT"),
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},sitter.name),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},sitterPts.toFixed(1)+" proj pts")
                ),
                React.createElement("div",{style:{flex:1,background:T.purple+"22",border:"1px solid "+T.purple+"44",borderRadius:10,padding:"10px 14px",textAlign:"center"}},
                  React.createElement("div",{style:{fontSize:10,color:T.purple,marginBottom:4,fontWeight:700}},"START"),
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},starter.name),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},starterPts.toFixed(1)+" proj pts")
                )
              )
            ),
            React.createElement("button",{onClick:function(){setSitP1(null);setSitP2(null);setSitS1("");setSitS2("");},style:{width:"100%",padding:"12px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textSub,fontWeight:600,fontSize:13,cursor:"pointer"}},"Compare Different Players")
          );
        })()
      ),

      // RIVALRY
      leagueSubTab==="rivalry"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Rivalry Analyzer"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Head-to-head matchup breakdown"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:20}},
          React.createElement("select",{value:rivalryTeam1,onChange:function(e){setRivalryTeam1(e.target.value);},style:Object.assign({},inpS,{textAlign:"center"})},
            ["All Teams"].concat(leagueTeamNames).map(function(n){return React.createElement("option",{key:n},n);})
          ),
          React.createElement("div",{style:{fontWeight:900,fontSize:14,color:T.textDim,textAlign:"center"}},"VS"),
          React.createElement("select",{value:rivalryTeam2,onChange:function(e){setRivalryTeam2(e.target.value);},style:Object.assign({},inpS,{textAlign:"center"})},
            ["All Teams"].concat(leagueTeamNames).map(function(n){return React.createElement("option",{key:n},n);})
          )
        ),
        (rivalryTeam1!=="All Teams"&&rivalryTeam2!=="All Teams"&&rivalryTeam1!==rivalryTeam2)&&(function(){
          var t1=activeTeams.find(function(t){return t.name===rivalryTeam1;})||activeTeams[0];
          var t2=activeTeams.find(function(t){return t.name===rivalryTeam2;})||activeTeams[1];
          var winner=t1.totalVal>t2.totalVal?t1:t2;
          return React.createElement("div",null,
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:14,padding:16}},
              React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.purple,marginBottom:10}},"Matchup Analysis"),
              [["Total Value",(t1.totalVal||0).toLocaleString(),(t2.totalVal||0).toLocaleString()],["Playoff Odds",(t1.playoffOdds!=null?t1.playoffOdds+"%":"—"),(t2.playoffOdds!=null?t2.playoffOdds+"%":"—")],["Champ Odds",(t1.champOdds!=null?t1.champOdds+"%":"—"),(t2.champOdds!=null?t2.champOdds+"%":"—")],["Roster Size",(Array.isArray(t1.players)?t1.players.length:t1.players||0),(Array.isArray(t2.players)?t2.players.length:t2.players||0)]].map(function(row){
                return React.createElement("div",{key:row[0],style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:8}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:14,color:T.text,textAlign:"right"}},row[1]),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub,textAlign:"center",fontWeight:600}},row[0]),
                  React.createElement("div",{style:{fontWeight:800,fontSize:14,color:T.text,textAlign:"left"}},row[2])
                );
              }),
              React.createElement("div",{style:{marginTop:12,padding:"10px 14px",background:T.purple+"18",borderRadius:10,textAlign:"center"}},
                React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:2}},"Edge goes to"),
                React.createElement("div",{style:{fontWeight:900,fontSize:16,color:T.purple}},winner.name)
              )
            )
          );
        })()
      ),

      // WEEKLY RECAP
      leagueSubTab==="recap"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Weekly Recap"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:20}},"AI-generated league recap and storylines"),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:40,marginBottom:12}},"📋"),
          React.createElement("div",{style:{fontWeight:800,fontSize:18,color:T.text,marginBottom:8}},"Coming Soon"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,maxWidth:300,margin:"0 auto"}},"Weekly recap summaries require live matchup scores. This feature will be available during the 2026 regular season.")
        )
      ),

      // CHAT
      leagueSubTab==="chat"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"League Chat"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:20}},"Chat with your leaguemates"),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:40,marginBottom:12}},"💬"),
          React.createElement("div",{style:{fontWeight:800,fontSize:18,color:T.text,marginBottom:8}},"Coming Soon"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,maxWidth:300,margin:"0 auto"}},"In-app league chat is in development. For now, coordinate with your leaguemates directly on Sleeper, Discord, or GroupMe.")
        )
      ),

      // ALERTS
      leagueSubTab==="alerts"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Market Alerts"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Buy low, sell high opportunities"),
        [["Buy Low",rankedPlayers.filter(function(p){return p.age<27&&p.posRank>8&&(p.pos==="RB"||p.pos==="WR");}).slice(0,5),T.green],
         ["Sell High",rankedPlayers.filter(function(p){return p.age>30&&p.tradeVal>0;}).slice(0,5),T.red]
        ].map(function(section){
          return React.createElement("div",{key:section[0],style:{marginBottom:20}},
            React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:10,color:section[2]}},section[0]+" Targets"),
            section[1].map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}},
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:32}),
                React.createElement(PBadge,{pos:p.pos,rank:p.posRank}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},p.team+" | Age "+p.age)
                ),
                React.createElement("div",{style:{textAlign:"right"}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:14,color:section[2]}},section[0]==="Buy Low"?"BUY":"SELL"),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},"val "+p.tradeVal)
                )
              );
            })
          );
        })
      ),

      // LEAGUE IMPORT (sub-tab)
      leagueSubTab==="trades"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:2}},"League Trades"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"All completed trades in your league this season")
          ),
          React.createElement("button",{onClick:loadLeagueTrades,style:{padding:"9px 18px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Load Trades")
        ),
        !activeLeague&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:36,marginBottom:10}},"🔗"),
          React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:6}},"No League Connected"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Import your Sleeper league to see trade history"),
          React.createElement("button",{onClick:function(){setLeagueSubTab("leagimport");},style:{padding:"10px 20px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Import League")
        ),
        activeLeague&&activeLeague.league_id.startsWith("espn_")&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"32px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Trade history is only available for Sleeper leagues.")
        ),
        activeLeague&&!activeLeague.league_id.startsWith("espn_")&&activeLeague.league_id!=="manual"&&React.createElement("div",null,
          leagueTradesLoading&&React.createElement("div",{style:{textAlign:"center",padding:"32px",color:T.textSub}},"Loading trades..."),
          !leagueTradesLoading&&leagueTrades===null&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
            React.createElement("div",{style:{fontSize:36,marginBottom:10}},"📋"),
            React.createElement("div",{style:{fontSize:13,color:T.textSub}},"Press \"Load Trades\" to fetch this season's trade log")
          ),
          !leagueTradesLoading&&leagueTrades!==null&&leagueTrades.length===0&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
            React.createElement("div",{style:{fontSize:36,marginBottom:10}},"🤝"),
            React.createElement("div",{style:{fontWeight:700,fontSize:15,marginBottom:6}},"No Trades Yet"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"No completed trades found for this league")
          ),
          !leagueTradesLoading&&leagueTrades&&leagueTrades.length>0&&React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:12,fontWeight:600}},leagueTrades.length+" COMPLETED TRADES"),
            leagueTrades.slice(0,30).map(function(tx,idx){
              var adds=tx.adds||{};var picks=tx.draft_picks||[];
              var ts=tx.status_updated?new Date(tx.status_updated).toLocaleDateString():"";
              // Group players by the roster that RECEIVED them (adds[player_id] = receiving_roster_id)
              var byRoster:{[key:string]:string[]}={};
              Object.keys(adds).forEach(function(pid){var rid=String(adds[pid]);if(!byRoster[rid])byRoster[rid]=[];byRoster[rid].push(pid);});
              // Also group picks
              var picksByRoster:{[key:string]:any[]}={};
              picks.forEach(function(pk){var rid=String(pk.owner_id);if(!picksByRoster[rid])picksByRoster[rid]=[];picksByRoster[rid].push(pk);});
              var rosterIds=Array.from(new Set(Object.keys(byRoster).concat(Object.keys(picksByRoster))));
              var teamName=function(rid:string){return "Team "+rid;};
              return React.createElement("div",{key:tx.transaction_id||idx,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"14px",marginBottom:10}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:12,color:T.purple}},"Trade #"+(leagueTrades.length-idx)),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},ts)
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:rosterIds.length>1?"1fr auto 1fr":"1fr",gap:8,alignItems:"flex-start"}},
                  rosterIds.slice(0,2).map(function(rid){
                    var playerIds=byRoster[rid]||[];
                    var pkList=picksByRoster[rid]||[];
                    return React.createElement("div",{key:rid},
                      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:T.textSub,letterSpacing:1,marginBottom:4}},teamName(rid)+" RECEIVES"),
                      playerIds.map(function(pid){
                        var p=sleeperIdToPlayer[pid]||{name:"Player "+pid,pos:"?",tradeVal:0};
                        return React.createElement("div",{key:pid,style:{background:T.bgInput,borderRadius:6,padding:"4px 8px",marginBottom:3,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6}},
                          React.createElement("span",{style:{color:T.purple,fontWeight:700,fontSize:9}},p.pos),p.name,
                          p.tradeVal>0&&React.createElement("span",{style:{fontSize:9,color:T.textSub,marginLeft:"auto"}},(p.tradeVal||0).toLocaleString())
                        );
                      }),
                      pkList.map(function(pk,i){
                        return React.createElement("div",{key:i,style:{background:T.bgInput,borderRadius:6,padding:"4px 8px",marginBottom:3,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6}},
                          React.createElement("span",{style:{color:T.gold,fontWeight:700,fontSize:9}},"PICK"),pk.season+" Rd "+pk.round
                        );
                      })
                    );
                  }).reduce(function(acc:any[],el,i){if(i===1)acc.push(React.createElement("div",{key:"arrow",style:{fontSize:16,color:T.textDim,textAlign:"center",paddingTop:20}},"⇄"));acc.push(el);return acc;},[])
                )
              );
            })
          )
        )
      ),

      leagueSubTab==="auction"&&(function(){
        var soldNames=new Set(auctionNoms.map(function(n){return n.name;}));
        var myNoms=auctionNoms.filter(function(n){return n.mine;});
        var spent=myNoms.reduce(function(s,n){return s+n.price;},0);
        var remaining=auctionBudget-spent;
        var mySlots=myNoms.length;
        // Roster size = teams setting treated as roster slots per team for single user
        var rosterSize=Math.max(1,auctionTeams);
        var slotsLeft=Math.max(0,rosterSize-mySlots);
        var maxBid=remaining;
        var bestAvail=rankedPlayers.filter(function(p){
          return !soldNames.has(p.name)&&(auctionPosFilter==="ALL"||p.pos===auctionPosFilter);
        }).sort(function(a,b){return (b.auction||0)-(a.auction||0);}).slice(0,20);
        var posFilters=["ALL","QB","RB","WR","TE"];
        return React.createElement("div",{style:{padding:"16px"}},
          // Header
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:900,fontSize:22}},"Auction Draft"),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Live budget tracker & value guide")
            ),
            React.createElement("button",{onClick:function(){if(window.confirm("Reset all auction data?"))setAuctionNoms([]);},style:{fontSize:11,color:T.red,background:"none",border:"none",cursor:"pointer",fontWeight:700}},"Reset")
          ),
          // Settings row
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}},
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px"}},
              React.createElement("div",{style:{fontSize:9,color:T.textSub,fontWeight:700,marginBottom:4}},"YOUR BUDGET ($)"),
              React.createElement("input",{type:"number",value:auctionBudget,onChange:function(e){setAuctionBudget(+e.target.value||200);},style:{background:"transparent",color:T.text,border:"none",fontSize:20,fontWeight:900,width:"100%",outline:"none"}})
            ),
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px"}},
              React.createElement("div",{style:{fontSize:9,color:T.textSub,fontWeight:700,marginBottom:4}},"ROSTER SLOTS"),
              React.createElement("input",{type:"number",value:auctionTeams,onChange:function(e){setAuctionTeams(+e.target.value||10);},style:{background:"transparent",color:T.text,border:"none",fontSize:20,fontWeight:900,width:"100%",outline:"none"}})
            )
          ),
          // Budget stats
          React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.borderPurple,borderRadius:12,padding:"12px 14px",marginBottom:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}},
            [["Spent","$"+spent,T.red],["Left","$"+remaining,remaining<20?T.red:T.green],["Max Bid","$"+Math.max(1,maxBid),T.gold],["Slots Left",slotsLeft,T.textSub]].map(function(s){
              return React.createElement("div",{key:s[0],style:{textAlign:"center"}},
                React.createElement("div",{style:{fontSize:8,color:T.textDim,fontWeight:700,letterSpacing:0.5,marginBottom:2}},s[0]),
                React.createElement("div",{style:{fontWeight:900,fontSize:16,color:s[2]}},s[1])
              );
            })
          ),
          // Add nomination
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:12,padding:"14px",marginBottom:12}},
            React.createElement("div",{style:{fontWeight:700,fontSize:13,marginBottom:8}},"Log Winning Bid"),
            React.createElement("div",{style:{position:"relative",marginBottom:8}},
              React.createElement("input",{value:auctionSearch,onChange:function(e){setAuctionSearch(e.target.value);setAuctionBidPlayer(null);},placeholder:"Search player...",style:Object.assign({},inpS)}),
              auctionSearch&&!auctionBidPlayer&&React.createElement("div",{style:{position:"absolute",top:"100%",left:0,right:0,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,zIndex:50,maxHeight:200,overflowY:"auto",marginTop:2}},
                rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(auctionSearch.toLowerCase())&&!soldNames.has(p.name);}).slice(0,8).map(function(p){
                  return React.createElement("div",{key:p.name,onClick:function(){setAuctionBidPlayer(p);setAuctionSearch(p.name);},style:{padding:"9px 12px",cursor:"pointer",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:8}},
                    React.createElement(PBadge,{pos:p.pos}),
                    React.createElement("span",{style:{flex:1,fontSize:13,fontWeight:600}},p.name),
                    React.createElement("span",{style:{fontSize:11,color:T.purple,fontWeight:700}},"FDP $"+(p.auction||1))
                  );
                })
              )
            ),
            auctionBidPlayer&&React.createElement("div",{style:{background:T.purpleDim,borderRadius:8,padding:"6px 10px",marginBottom:8,display:"flex",alignItems:"center",gap:8,fontSize:12}},
              React.createElement(PBadge,{pos:auctionBidPlayer.pos}),
              React.createElement("span",{style:{flex:1,fontWeight:700}},auctionBidPlayer.name),
              React.createElement("span",{style:{color:T.purple,fontWeight:800}},"FDP value: $"+(auctionBidPlayer.auction||1)),
              React.createElement("span",{style:{cursor:"pointer",color:T.textDim,fontSize:16,marginLeft:4},onClick:function(){setAuctionBidPlayer(null);setAuctionSearch("");}},"×")
            ),
            React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
              React.createElement("span",{style:{fontWeight:800,color:T.gold,fontSize:18}},"$"),
              React.createElement("input",{type:"number",value:auctionBidAmt,onChange:function(e){setAuctionBidAmt(e.target.value);},placeholder:"Final price",min:1,style:Object.assign({},inpS,{flex:1})}),
              React.createElement("button",{onClick:function(){setAuctionMine(function(v){return !v;});},style:{padding:"10px 14px",borderRadius:10,border:"2px solid "+(auctionMine?T.purple:T.border),background:auctionMine?T.purple:"transparent",color:auctionMine?"#fff":T.textSub,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},auctionMine?"✓ Mine":"Mine?"),
              React.createElement("button",{onClick:function(){
                if(!auctionBidPlayer&&!auctionSearch.trim())return;
                var name=auctionBidPlayer?auctionBidPlayer.name:auctionSearch.trim();
                var pos=auctionBidPlayer?auctionBidPlayer.pos:"?";
                var fdpVal=auctionBidPlayer?auctionBidPlayer.auction||1:null;
                var price=parseInt(auctionBidAmt)||1;
                setAuctionNoms(function(prev){return[{name,pos,price,fdpVal,mine:auctionMine,id:Date.now()}].concat(prev);});
                setAuctionSearch("");setAuctionBidAmt("");setAuctionBidPlayer(null);setAuctionMine(false);
              },style:{padding:"10px 16px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}},"Add")
            )
          ),
          // View toggle
          React.createElement("div",{style:{display:"flex",gap:6,marginBottom:12}},
            [["board","Draft Board"],["myroster","My Roster"]].map(function(v){
              return React.createElement("button",{key:v[0],onClick:function(){setAuctionView(v[0]);},style:{padding:"7px 14px",borderRadius:20,border:"1px solid "+(auctionView===v[0]?T.purple:T.border),background:auctionView===v[0]?T.purple:"transparent",color:auctionView===v[0]?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer"}},v[1]);
            })
          ),
          // BOARD VIEW
          auctionView==="board"&&React.createElement("div",null,
            // Best Available
            React.createElement("div",{style:{marginBottom:16}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}},
                React.createElement("div",{style:{fontWeight:800,fontSize:14}},"Best Available"),
                React.createElement("div",{style:{display:"flex",gap:4}},
                  posFilters.map(function(pf){
                    return React.createElement("button",{key:pf,onClick:function(){setAuctionPosFilter(pf);},style:{padding:"4px 8px",borderRadius:10,border:"1px solid "+(auctionPosFilter===pf?T.purple:T.border),background:auctionPosFilter===pf?T.purple:"transparent",color:auctionPosFilter===pf?"#fff":T.textSub,fontWeight:700,fontSize:10,cursor:"pointer"}},pf);
                  })
                )
              ),
              bestAvail.length===0?React.createElement("div",{style:{textAlign:"center",padding:"20px",color:T.textSub,fontSize:13}},"All players rostered"):
              bestAvail.map(function(p,i){
                var fdpVal=p.auction||1;
                return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"9px 12px",marginBottom:5,display:"flex",alignItems:"center",gap:10,cursor:"pointer"},onClick:function(){setAuctionBidPlayer(p);setAuctionSearch(p.name);setAuctionView("board");}},
                  React.createElement("div",{style:{fontSize:11,color:T.textDim,fontWeight:700,width:20,textAlign:"right"}},i+1),
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:32}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                    React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.pos+" · "+p.team+(p.tier?" · Tier "+p.tier.t:""))
                  ),
                  React.createElement("div",{style:{textAlign:"right"}},
                    React.createElement("div",{style:{fontWeight:900,fontSize:15,color:T.gold}},"$"+fdpVal),
                    React.createElement("div",{style:{fontSize:9,color:T.textDim}},"FDP value")
                  )
                );
              })
            ),
            // All nominations log
            auctionNoms.length>0&&React.createElement("div",null,
              React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}},
                React.createElement("div",{style:{fontWeight:800,fontSize:14}},"Bid Log ("+auctionNoms.length+")"),
                React.createElement("div",{style:{display:"flex",gap:6}},
                  React.createElement("button",{onClick:function(){
                    var myTeam=auctionNoms.filter(function(n){return n.mine;});
                    var others=auctionNoms.filter(function(n){return !n.mine;});
                    var lines=["AUCTION DRAFT RESULTS","Generated by Fantasy Draft Pros","====================================",""];
                    if(myTeam.length){
                      lines.push("MY ROSTER ("+myTeam.length+" players, $"+myTeam.reduce(function(s,n){return s+n.price;},0)+" spent)");
                      lines.push("------------------------------------");
                      myTeam.slice().sort(function(a,b){return (b.fdpVal||0)-(a.fdpVal||0);}).forEach(function(n){
                        var diff=n.fdpVal?n.price-n.fdpVal:null;
                        var tag=diff===null?"":(diff<=-5?" [STEAL]":diff>=5?" [OVERPAY]":" [FAIR]");
                        lines.push(n.pos+"  "+n.name+"  $"+n.price+(n.fdpVal?"  (FDP $"+n.fdpVal+")":"")+tag);
                      });
                      lines.push("");
                    }
                    if(others.length){
                      lines.push("ALL OTHER BIDS ("+others.length+" players)");
                      lines.push("------------------------------------");
                      others.slice().sort(function(a,b){return b.price-a.price;}).forEach(function(n){
                        lines.push(n.pos+"  "+n.name+"  $"+n.price);
                      });
                    }
                    var body=lines.join("\n");
                    window.location.href="mailto:?subject="+encodeURIComponent("Auction Draft Results — Fantasy Draft Pros")+"&body="+encodeURIComponent(body);
                  },style:{padding:"6px 12px",borderRadius:8,border:"1px solid "+T.border,background:T.bgCard,color:T.text,fontWeight:700,fontSize:11,cursor:"pointer"}},"✉ Email"),
                  React.createElement("button",{onClick:function(){
                    var myTeam=auctionNoms.filter(function(n){return n.mine;});
                    var others=auctionNoms.filter(function(n){return !n.mine;});
                    var lines=["AUCTION DRAFT RESULTS — Fantasy Draft Pros",""];
                    if(myTeam.length){
                      lines.push("MY ROSTER ($"+myTeam.reduce(function(s,n){return s+n.price;},0)+" spent):");
                      myTeam.slice().sort(function(a,b){return (b.fdpVal||0)-(a.fdpVal||0);}).forEach(function(n){
                        var diff=n.fdpVal?n.price-n.fdpVal:null;
                        var tag=diff===null?"":(diff<=-5?" STEAL":diff>=5?" OVERPAY":" FAIR");
                        lines.push(n.pos+" "+n.name+" $"+n.price+(n.fdpVal?" (FDP $"+n.fdpVal+")":"")+tag);
                      });
                      lines.push("");
                    }
                    others.slice().sort(function(a,b){return b.price-a.price;}).forEach(function(n){lines.push(n.pos+" "+n.name+" $"+n.price);});
                    navigator.clipboard&&navigator.clipboard.writeText(lines.join("\n"));
                  },style:{padding:"6px 12px",borderRadius:8,border:"1px solid "+T.border,background:T.bgCard,color:T.text,fontWeight:700,fontSize:11,cursor:"pointer"}},"Copy")
                )
              ),
              auctionNoms.map(function(nom){
                var diff=nom.fdpVal?nom.price-nom.fdpVal:null;
                var badge=diff===null?null:diff<=-5?["STEAL",T.green]:diff>=5?["OVERPAY",T.red]:["FAIR",T.gold];
                return React.createElement("div",{key:nom.id,style:{background:T.bgCard,border:"1px solid "+(nom.mine?T.borderPurple:T.border),borderRadius:10,padding:"9px 12px",marginBottom:5,display:"flex",alignItems:"center",gap:8}},
                  React.createElement(PBadge,{pos:nom.pos}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}},
                      nom.name,
                      nom.mine&&React.createElement("span",{style:{fontSize:9,background:T.purple,color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:700}},"MINE")
                    ),
                    nom.fdpVal&&React.createElement("div",{style:{fontSize:10,color:T.textSub}},"FDP value: $"+nom.fdpVal)
                  ),
                  badge&&React.createElement("span",{style:{fontSize:9,background:badge[1]+"22",color:badge[1],border:"1px solid "+badge[1]+"44",borderRadius:6,padding:"2px 6px",fontWeight:800}},badge[0]),
                  React.createElement("div",{style:{fontWeight:900,fontSize:16,color:nom.mine?T.purple:T.text,minWidth:36,textAlign:"right"}},"$"+nom.price),
                  React.createElement("button",{onClick:function(){setAuctionNoms(function(p){return p.filter(function(n){return n.id!==nom.id;});});},style:{background:"none",border:"none",cursor:"pointer",color:T.textDim,fontSize:16,padding:"0 2px"}},"×")
                );
              })
            ),
            auctionNoms.length===0&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"32px 20px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:32,marginBottom:8}},"🏷"),
              React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:4}},"No bids logged yet"),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Search a player, enter final price, and tap Add")
            )
          ),
          // MY ROSTER VIEW
          auctionView==="myroster"&&React.createElement("div",null,
            myNoms.length===0?React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"32px 20px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:32,marginBottom:8}},"👤"),
              React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:4}},"Your roster is empty"),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Check \"Mine\" when adding bids to track your roster")
            ):React.createElement("div",null,
              React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.borderPurple,borderRadius:12,padding:"12px 14px",marginBottom:10,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}},
                [["Players",myNoms.length],["Spent","$"+spent],["Avg/Player","$"+Math.round(spent/(myNoms.length||1))]].map(function(s){
                  return React.createElement("div",{key:s[0],style:{textAlign:"center"}},
                    React.createElement("div",{style:{fontSize:9,color:T.textDim,fontWeight:700,marginBottom:2}},s[0]),
                    React.createElement("div",{style:{fontWeight:900,fontSize:16,color:T.purple}},s[1])
                  );
                })
              ),
              myNoms.slice().sort(function(a,b){return (b.fdpVal||0)-(a.fdpVal||0);}).map(function(nom){
                var diff=nom.fdpVal?nom.price-nom.fdpVal:null;
                var badge=diff===null?null:diff<=-5?["STEAL",T.green]:diff>=5?["OVERPAY",T.red]:["FAIR",T.gold];
                return React.createElement("div",{key:nom.id,style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
                  React.createElement(Avatar,{name:nom.name,pos:nom.pos,size:36}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:700,fontSize:13}},nom.name),
                    React.createElement("div",{style:{fontSize:10,color:T.textSub}},nom.pos+(nom.fdpVal?" · FDP $"+nom.fdpVal:""))
                  ),
                  badge&&React.createElement("span",{style:{fontSize:9,background:badge[1]+"22",color:badge[1],border:"1px solid "+badge[1]+"44",borderRadius:6,padding:"2px 6px",fontWeight:800}},badge[0]),
                  React.createElement("div",{style:{fontWeight:900,fontSize:18,color:T.purple}},"$"+nom.price),
                  React.createElement("button",{onClick:function(){setAuctionNoms(function(p){return p.filter(function(n){return n.id!==nom.id;});});},style:{background:"none",border:"none",cursor:"pointer",color:T.textDim,fontSize:16}},"×")
                );
              })
            )
          )
        );
      })(),

      leagueSubTab==="leagimport"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Import League"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Connect your fantasy league for live power rankings"),
        activeLeague&&React.createElement("div",{style:{background:T.green+"18",border:"1px solid "+T.green+"44",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:T.green,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"}},
          React.createElement("span",null,"Connected: "+activeLeague.name),
          React.createElement("button",{onClick:function(){saveAndSetActiveLeague(null);setLeagueRosters(null);setLeagueUsers(null);saveAndSetImportedTeams(null);setLeagueImportStatus(null);},style:{background:"none",border:"none",color:T.green,cursor:"pointer",fontSize:16,padding:0}},"×")
        ),
        // Platform selector
        React.createElement("div",{style:{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:2,scrollbarWidth:"none"}},
          [["sleeper","Sleeper"],["espn","ESPN"],["yahoo","Yahoo"],["nfl","NFL.com"],["fleaflicker","Fleaflicker"],["mfl","MFL"],["manual","Manual"]].map(function(p){
            var active=importPlatform===p[0];
            return React.createElement("button",{key:p[0],onClick:function(){setImportPlatform(p[0]);setLeagueImportStatus(null);setLeagueImportErr("");},style:{padding:"8px 14px",borderRadius:20,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},p[1]);
          })
        ),
        // SLEEPER
        importPlatform==="sleeper"&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:20}},
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            React.createElement("input",{value:leagueImportUser,onChange:function(e){setLeagueImportUser(e.target.value);},placeholder:"Sleeper username",style:Object.assign({},inpS,{flex:1})}),
            React.createElement("button",{onClick:doLeagueImport,style:{padding:"10px 18px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Search")
          ),
          leagueImportStatus==="loading"&&React.createElement("div",{style:{textAlign:"center",padding:"20px",color:T.textSub}},"Loading..."),
          leagueImportStatus==="connecting"&&React.createElement("div",{style:{textAlign:"center",padding:"12px",color:T.textSub}},"Loading rosters..."),
          leagueImportStatus==="error"&&React.createElement("div",{style:{padding:"10px 14px",background:T.red+"15",borderRadius:10,color:T.red,fontSize:12}},leagueImportErr),
          (leagueImportStatus==="success"||leagueImportStatus==="connected")&&leagueImportData&&React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:10}},leagueImportData.username+"'s Leagues"),
            (function(){
              function renderLeagues(leagues){
                return leagues.map(function(lg){
                  var isActive=activeLeague&&activeLeague.league_id===lg.league_id;
                  return React.createElement("div",{key:lg.league_id,style:{background:T.bgInput,borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontWeight:700,fontSize:13}},lg.name),
                      React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},lg.total_rosters+" teams")
                    ),
                    React.createElement("button",{onClick:function(){if(!isActive)connectLeague(lg);},style:{padding:"7px 14px",borderRadius:8,border:"none",background:isActive?T.green:T.purple,color:"#fff",fontWeight:700,fontSize:11,cursor:isActive?"default":"pointer",flexShrink:0}},isActive?"Connected":"Connect")
                  );
                });
              }
              var els=[];
              if(leagueImportData.leagues2026&&leagueImportData.leagues2026.length){els.push(React.createElement("div",{key:"h26",style:{fontSize:11,fontWeight:700,color:T.textSub,letterSpacing:1,marginBottom:6}},"2026 SEASON"));renderLeagues(leagueImportData.leagues2026).forEach(function(el){els.push(el);});}
              if(leagueImportData.leagues2025&&leagueImportData.leagues2025.length){els.push(React.createElement("div",{key:"h25",style:{fontSize:11,fontWeight:700,color:T.textSub,letterSpacing:1,marginBottom:6,marginTop:leagueImportData.leagues2026&&leagueImportData.leagues2026.length?12:0}},"2025 SEASON"));renderLeagues(leagueImportData.leagues2025).forEach(function(el){els.push(el);});}
              return els;
            })()
          )
        ),
        // ESPN
        importPlatform==="espn"&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:20}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"Enter your ESPN Fantasy league ID (found in the URL: /leagues/{id})"),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            React.createElement("input",{value:espnLeagueId,onChange:function(e){setEspnLeagueId(e.target.value);},placeholder:"League ID",style:Object.assign({},inpS,{flex:1})}),
            React.createElement("select",{value:espnYear,onChange:function(e){setEspnYear(e.target.value);},style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 12px",fontSize:13,outline:"none"}},
              ["2026","2025","2024","2023"].map(function(y){return React.createElement("option",{key:y},y);})
            )
          ),
          React.createElement("div",{style:{background:T.bgInput,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:12}},
            React.createElement("div",{style:{fontWeight:700,fontSize:12,marginBottom:2,color:T.purpleLight}},"Private League Setup"),
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:10,lineHeight:1.6}},"Find these in Chrome: open ESPN Fantasy → DevTools (F12) → Application → Cookies → fantasy.espn.com"),
            React.createElement("input",{value:espnS2,onChange:function(e){setEspnS2(e.target.value);},placeholder:"espn_s2",style:Object.assign({},inpS,{width:"100%",boxSizing:"border-box",marginBottom:8,fontSize:11,fontFamily:"monospace"})}),
            React.createElement("input",{value:espnSWID,onChange:function(e){setEspnSWID(e.target.value);},placeholder:"SWID  (e.g. {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX})",style:Object.assign({},inpS,{width:"100%",boxSizing:"border-box",fontSize:11,fontFamily:"monospace"})})
          ),
          React.createElement("button",{onClick:doEspnImport,style:{width:"100%",padding:"11px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:12}},"Import ESPN League"),
          leagueImportStatus==="loading"&&React.createElement("div",{style:{textAlign:"center",padding:"12px",color:T.textSub}},"Loading..."),
          leagueImportStatus==="error"&&React.createElement("div",{style:{padding:"12px 14px",background:T.red+"15",borderRadius:10,fontSize:12,lineHeight:1.6}},
            React.createElement("div",{style:{color:T.red,fontWeight:700,marginBottom:6}},leagueImportErr),
            React.createElement("div",{style:{color:T.textSub,marginBottom:8}},"ESPN blocks browser-based cookie auth for private leagues. The most reliable option is Manual Import:"),
            React.createElement("ol",{style:{color:T.textSub,margin:"0 0 0 16px",padding:0,lineHeight:2}},
              React.createElement("li",null,"Go to your ESPN league → My Team → Roster"),
              React.createElement("li",null,"Copy all player names"),
              React.createElement("li",null,'Switch to the "Manual" tab and paste them in')
            )
          )
        ),
        // Yahoo import
        importPlatform==="yahoo"&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
            React.createElement("span",{style:{fontSize:24}},"🏈"),
            React.createElement("div",{style:{fontWeight:800,fontSize:16}},"Yahoo Fantasy Import")
          ),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12,lineHeight:1.6}},"Yahoo requires sign-in through their app. Follow these steps to copy your roster:"),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:"14px 16px",marginBottom:14}},
            React.createElement("ol",{style:{color:T.text,margin:0,padding:"0 0 0 18px",lineHeight:2.2,fontSize:12}},
              React.createElement("li",null,"Open ",React.createElement("b",null,"Yahoo Fantasy")," → tap your league"),
              React.createElement("li",null,"Go to ",React.createElement("b",null,"My Team")),
              React.createElement("li",null,"Copy each player name from your roster"),
              React.createElement("li",null,"Paste into the text box below — one player per line"),
              React.createElement("li",null,'Click ',React.createElement("b",null,"Import Roster"))
            )
          ),
          React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:8,fontWeight:600}},"PASTE YOUR YAHOO ROSTER"),
          React.createElement("textarea",{value:manualRosterText,onChange:function(e){setManualRosterText(e.target.value);},placeholder:"Patrick Mahomes\nJa'Marr Chase\nSaquon Barkley\n...",rows:8,style:Object.assign({},inpS,{fontFamily:"monospace",fontSize:12,lineHeight:1.6,resize:"vertical",marginBottom:10})}),
          React.createElement("button",{onClick:function(){doManualImport("My Yahoo League",manualRosterText);},style:{width:"100%",padding:"11px",borderRadius:12,border:"none",background:"#6001D2",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Import Yahoo Roster")
        ),
        // NFL.com / Fleaflicker / MFL — Coming Soon
        (importPlatform==="nfl"||importPlatform==="fleaflicker"||importPlatform==="mfl")&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:24,textAlign:"center"}},
          React.createElement("div",{style:{fontSize:28,marginBottom:8}},"🔜"),
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:6}},{nfl:"NFL.com Fantasy",fleaflicker:"Fleaflicker",mfl:"MyFantasyLeague"}[importPlatform as string]+" — Coming Soon"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:14,lineHeight:1.6}},"This platform requires OAuth authentication. Full integration is in development."),
          React.createElement("button",{onClick:function(){setImportPlatform("manual");},style:{padding:"10px 20px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Use Manual Import Instead")
        ),
        // Manual
        importPlatform==="manual"&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:20}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12,lineHeight:1.6}},"Paste your roster below. Use '## Team Name' to separate multiple teams, then one player per line."),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"10px 12px",marginBottom:8,fontSize:11,color:T.textSub,fontFamily:"monospace",lineHeight:1.7}},"## My Team",React.createElement("br",null),"Patrick Mahomes",React.createElement("br",null),"Ja'Marr Chase",React.createElement("br",null),"## Opponent",React.createElement("br",null),"Josh Allen"),
          React.createElement("textarea",{value:manualRosterText,onChange:function(e){setManualRosterText(e.target.value);},placeholder:"## Team Name\nPlayer Name\nPlayer Name\n\n## Team 2\nPlayer Name",rows:10,style:Object.assign({},inpS,{fontFamily:"monospace",fontSize:12,lineHeight:1.6,resize:"vertical",marginBottom:8})}),
          React.createElement("button",{onClick:function(){doManualImport("My League",manualRosterText);},style:{width:"100%",padding:"11px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Import Roster")
        )
      )
    ),

    // ════ RANKINGS TAB ════
    tab==="rankings"&&React.createElement("div",{style:{paddingBottom:80}},
      React.createElement("div",{style:{position:"relative",borderBottom:"1px solid "+T.border}},
        isDesktop&&React.createElement("button",{onClick:function(){rankingTabsRef.current&&rankingTabsRef.current.scrollBy({left:-200,behavior:"smooth"});},style:{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"‹"),
        React.createElement("div",{ref:rankingTabsRef,style:{display:"flex",gap:6,overflowX:"auto",padding:isDesktop?"10px 36px":"10px 12px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}},
          [["playervalues","$ Player Values"],["allrankings","All Rankings"],["qbs","QBs"],["rbs","RBs"],["wrs","WRs"],["tes","TEs"],["idp","IDP"],["rookie","Rookie Picks"],["vegas","Vegas Lines"],["trending","Trending"],["market","Market"],["valuetrends","Value Trends"],["pickcalc","Pick Calculator"],["watchlist","Watchlist"],["draft","Draft Kit"],["keeper","Keeper Calc"],["compare","Compare"],["history","Trade History"]].map(function(st){
            var active=rankSubTab===st[0];
            return React.createElement("button",{key:st[0],onClick:function(){setRankSubTab(st[0]);},style:{padding:"7px 14px",borderRadius:20,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},st[1]);
          })
        ),
        isDesktop&&React.createElement("button",{onClick:function(){rankingTabsRef.current&&rankingTabsRef.current.scrollBy({left:200,behavior:"smooth"});},style:{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"›")
      ),

      // PLAYER VALUES (image 1 — FDP Value table with 7D Change)
      rankSubTab==="playervalues"&&React.createElement("div",{style:{paddingBottom:16}},
        React.createElement("div",{style:{padding:"14px 16px 0"}},
          React.createElement("div",{style:{fontWeight:900,fontSize:20,marginBottom:2}},"FDP Player Values"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"Fantasy Draft Pros dynasty values"),
          React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
            React.createElement("button",{onClick:function(){setRankFormat(rankFormat==="SF"?"1QB":"SF");},style:{padding:"7px 18px",borderRadius:10,border:"1px solid "+(rankFormat==="SF"?T.purple:T.border),background:rankFormat==="SF"?T.purple:"transparent",color:rankFormat==="SF"?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},"SF"),
            React.createElement("button",{onClick:function(){setRankFormat(rankFormat==="SF"?"SF":"1QB");},style:{padding:"7px 18px",borderRadius:10,border:"1px solid "+(rankFormat==="1QB"?T.purple:T.border),background:rankFormat==="1QB"?T.purple:"transparent",color:rankFormat==="1QB"?"#fff":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},"1QB"),
            React.createElement("button",{onClick:function(){setPvTep(function(v){return !v;});},style:{padding:"7px 18px",borderRadius:10,border:"1px solid "+(pvTep?"#f59e0b":T.border),background:pvTep?"#f59e0b":"transparent",color:pvTep?"#000":T.textSub,fontWeight:700,fontSize:13,cursor:"pointer"}},"TEP")
          ),
          React.createElement("div",{style:{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}},
            ["All","QB","RB","WR","TE","DL","LB","DB"].map(function(pos){var active=pvPos===pos;return React.createElement("button",{key:pos,onClick:function(){setPvPos(pos);},style:{padding:"5px 12px",borderRadius:8,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},pos);})
          )
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"44px 1fr 72px 96px",padding:"10px 16px",borderTop:"1px solid "+T.border,borderBottom:"1px solid "+T.border,marginTop:12,background:T.bgInput,gap:4}},
          React.createElement("div",null),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textDim,letterSpacing:1}},"DETAILS"),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textDim,letterSpacing:1,textAlign:"center"}},"7D CHANGE"),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.purple,letterSpacing:1,textAlign:"right"}},"FDP VALUE ("+(rankFormat==="SF"?("SF"+(pvTep?"+TEP":"")):(pvTep?"1QB+TEP":"1QB"))+")")
        ),
        (function(){
          var wantSF=rankFormat==="SF";
          var wantTEP=pvTep;
          function pvVal(p){
            var ab=dynastyBonus(p.pos,p.age);
            var sfBoost=wantSF&&p.pos==="QB"?1.25:1;
            var tepBoost=wantTEP&&p.pos==="TE"?1.2:1;
            if(p.ktcVal)return Math.min(9999,Math.round(p.ktcVal*ab*sfBoost*tepBoost));
            var cfg=p.pos==="QB"?(wantSF?{pk:7660,dc:0.927}:{pk:5800,dc:0.912})
              :p.pos==="RB"?{pk:9987,dc:0.921}
              :p.pos==="TE"?(wantTEP?{pk:10500,dc:0.833}:{pk:8756,dc:0.833})
              :p.pos==="DL"?{pk:5500,dc:0.940}
              :p.pos==="LB"?{pk:4500,dc:0.935}
              :p.pos==="DB"?{pk:4200,dc:0.930}
              :{pk:9950,dc:0.927};
            var rv=cfg.pk*Math.pow(cfg.dc,(p.posRank||1)-1);
            return Math.round(Math.max(100,Math.min(9999,rv*ab)));
          }
          return rankedPlayers.filter(function(p){return p.pos!=="K"&&p.pos!=="DST"&&(pvPos==="All"||p.pos===pvPos)&&(!user||user.isPro||p.rank<=FREE_RANK_LIMIT);}).slice().sort(function(a,b){return pvVal(b)-pvVal(a);}).map(function(p){
            var gs=getGameScript(p.team,oddsData);
            var displayVal=pvVal(p);
            return React.createElement("div",{key:p.name,style:{display:"grid",gridTemplateColumns:"44px 1fr 72px 96px",padding:"10px 16px",borderBottom:"1px solid "+T.border,alignItems:"center",gap:4}},
              React.createElement(Avatar,{name:p.name,pos:p.pos,size:34}),
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text,marginBottom:3}},p.name),
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}},
                  React.createElement(PBadge,{pos:p.pos}),
                  React.createElement("span",{style:{fontSize:11,color:T.textSub,fontWeight:600}},p.team),
                  gs&&React.createElement("span",{style:{fontSize:9,fontWeight:700,color:gs.color,background:gs.color+"18",border:"1px solid "+gs.color+"33",borderRadius:4,padding:"1px 5px"}},gs.script.toUpperCase())
                )
              ),
              React.createElement("div",{style:{textAlign:"center",fontWeight:700,fontSize:13,color:T.textDim}},"—"),
              React.createElement("div",{style:{textAlign:"right",fontWeight:800,fontSize:15,color:T.purpleLight}},displayVal.toLocaleString())
            );
          });
        })(),
        (!user||!user.isPro)&&React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:14,padding:"16px",textAlign:"center",margin:"16px"}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.purpleLight,marginBottom:6}},"Unlock Full Rankings"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"See all 200+ players with Pro"),
          React.createElement("button",{onClick:function(){user?handleCheckout("pro","monthly"):(setAuthMode("signup"),setShowAuth(true));},style:{padding:"10px 24px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},user?"Upgrade to Pro →":"Start Free Trial")
        )
      ),

      // ALL RANKINGS + POSITION TABS (image 2 — Dynasty Rankings hero + filters)
      (rankSubTab==="allrankings"||rankSubTab==="qbs"||rankSubTab==="rbs"||rankSubTab==="wrs"||rankSubTab==="tes")&&React.createElement("div",{style:{paddingBottom:16}},
        React.createElement("div",{style:{background:"linear-gradient(135deg,#2d52e0,#4466ff)",margin:"16px",borderRadius:16,padding:"24px 20px",display:"flex",alignItems:"flex-start",gap:16}},
          React.createElement("div",{style:{fontSize:34,lineHeight:1,color:"#f59e0b"}},"*"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:28,color:"#fff",lineHeight:1.1,marginBottom:8}},"Dynasty",React.createElement("br",null),"Rankings"),
            React.createElement("div",{style:{fontSize:14,color:"rgba(255,255,255,0.8)",lineHeight:1.5}},"FantasyDraftPros player values",React.createElement("br",null),"and rankings")
          )
        ),
        rankSubTab==="allrankings"&&React.createElement("div",{style:{padding:"0 16px 12px"}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,fontWeight:600,marginBottom:8}},"Position"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}},
            ["QB","RB","WR","TE"].map(function(pos){
              var active=rankPos===pos;var pc=POS_COLORS[pos]||T.purple;
              return React.createElement("button",{key:pos,onClick:function(){setRankPos(pos);},style:{padding:"12px 8px",borderRadius:10,border:"1px solid "+(active?pc:T.border),background:active?pc:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:15,cursor:"pointer",textAlign:"center"}},pos);
            })
          )
        ),
        React.createElement("div",{style:{padding:"0 16px 12px"}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,fontWeight:600,marginBottom:8}},"Format"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            ["SF","1QB","TEP"].map(function(fmt){
              var active=rankFormat===fmt;
              return React.createElement("button",{key:fmt,onClick:function(){setRankFormat(fmt);},style:{padding:"10px 22px",borderRadius:10,border:"none",background:active?"#22c55e":T.bgInput,color:active?"#fff":T.textSub,fontWeight:700,fontSize:14,cursor:"pointer"}},fmt);
            })
          )
        ),
        React.createElement("div",{style:{padding:"0 16px 12px"}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,fontWeight:600,marginBottom:8}},"Search Players"),
          React.createElement("input",{value:rankSearch,onChange:function(e){setRankSearch(e.target.value);},placeholder:"Search by name...",style:Object.assign({},inpS)})
        ),
        React.createElement("div",{style:{padding:"0 16px 16px",borderBottom:"1px solid "+T.border}},
          React.createElement("div",{style:{fontSize:12,color:T.textSub,fontWeight:600,marginBottom:8}},"Filter by Team"),
          React.createElement("input",{value:rankTeamFilter==="All Teams"?"":rankTeamFilter,onChange:function(e){setRankTeamFilter(e.target.value||"All Teams");},placeholder:"All Teams",style:Object.assign({},inpS)})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"44px 1fr 52px",padding:"8px 16px",background:T.bgInput,borderBottom:"1px solid "+T.border}},
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textDim,letterSpacing:1}},"RANK"),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textDim,letterSpacing:1}},"PLAYER"),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textDim,letterSpacing:1,textAlign:"right"}},"TEAM")
        ),
        (function(){
          var posF=rankSubTab==="allrankings"?rankPos:rankSubTab==="qbs"?"QB":rankSubTab==="rbs"?"RB":rankSubTab==="wrs"?"WR":"TE";
          var filtered=rankedPlayers.filter(function(p){
            return p.pos===posF&&(!rankSearch||p.name.toLowerCase().includes(rankSearch.toLowerCase()))&&(rankTeamFilter==="All Teams"||p.team.toUpperCase()===rankTeamFilter.toUpperCase());
          });
          filtered=filtered.slice().sort(function(a,b){return b.tradeVal-a.tradeVal;});
          return filtered.filter(function(_,i){return !user||user.isPro||i<FREE_RANK_LIMIT;}).map(function(p,i){
            var gs=getGameScript(p.team,oddsData);
            return React.createElement("div",{key:p.name,style:{display:"grid",gridTemplateColumns:"44px 1fr 52px",padding:"12px 16px",borderBottom:"1px solid "+T.border,alignItems:"center"}},
              React.createElement("div",{style:{fontWeight:800,fontSize:13,color:T.textDim}},i+1),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub,marginTop:2}},p.note),
                  gs&&React.createElement("div",{style:{display:"inline-flex",alignItems:"center",gap:4,marginTop:3,background:gs.color+"18",border:"1px solid "+gs.color+"33",borderRadius:5,padding:"1px 6px"}},
                    React.createElement("span",{style:{fontSize:8,fontWeight:700,color:gs.color}},gs.script.toUpperCase()),
                    React.createElement("span",{style:{fontSize:8,color:T.textDim}},(gs.spread>0?"+":"")+gs.spread+" O/U "+gs.total)
                  )
                )
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},p.team),
                React.createElement("div",{style:{fontSize:9,color:T.textSub}},p.pos)
              )
            );
          });
        })(),
        (!user||!user.isPro)&&React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:14,padding:"16px",textAlign:"center",margin:"16px"}},
          React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.purpleLight,marginBottom:6}},"Unlock Full Rankings"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"See all 200+ players with Pro"),
          React.createElement("button",{onClick:function(){user?handleCheckout("pro","monthly"):(setAuthMode("signup"),setShowAuth(true));},style:{padding:"10px 24px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},user?"Upgrade to Pro →":"Start Free Trial")
        )
      ),

      // IDP
      rankSubTab==="idp"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:12}},"IDP Rankings"),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}},
          ["DL","LB","DB"].map(function(p){return React.createElement("button",{key:p,onClick:function(){setRankIdpPos(p);},style:{padding:"6px 16px",borderRadius:20,border:"1px solid "+(rankIdpPos===p?(POS_COLORS[p]||T.purple):T.border),background:rankIdpPos===p?(POS_COLORS[p]||T.purple)+"22":"transparent",color:rankIdpPos===p?(POS_COLORS[p]||T.purple):T.textSub,fontWeight:700,fontSize:12,cursor:"pointer"}},p);})
        ),
        rankedPlayers.filter(function(p){return p.pos===rankIdpPos;}).map(function(p){
          return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
            React.createElement("span",{style:{fontWeight:800,fontSize:12,color:POS_COLORS[rankIdpPos]||T.purple,width:28,flexShrink:0}},rankIdpPos+(p.posRank)),
            React.createElement(Avatar,{name:p.name,pos:p.pos,size:32}),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
              React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+(p.age?" | Age "+p.age:"")+" | "+p.note)
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontWeight:800,fontSize:14,color:T.purpleLight}},p.tradeVal),
              React.createElement("div",{style:{fontSize:9,color:p.ag.c,fontWeight:700}},p.ag.g)
            )
          );
        })
      ),

      // ROOKIE PICKS
      rankSubTab==="rookie"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:2}},"2025 Rookie Class"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Player grades, draft capital & dynasty upside"),
        (function(){
          var ROOKIE_GRADES=[
            {name:"Ashton Jeanty",pos:"RB",team:"LV",grade:"A+",dc:"1.2 OA",fit:"A",note:"Elite rushing prospect, workhorse upside, immediate starter",color:T.green},
            {name:"Travis Hunter",pos:"WR",team:"JAX",grade:"A+",dc:"2.2 OA",fit:"A",note:"Two-way star, elite WR upside, dynasty WR1 potential",color:T.green},
            {name:"Cam Ward",pos:"QB",team:"TEN",grade:"A",dc:"1.1 OA",fit:"B+",note:"Elite arm talent, SF league must-have, Year 2 leap expected",color:"#22c55e"},
            {name:"Tetairoa McMillan",pos:"WR",team:"CAR",grade:"A",dc:"1.1 OA",fit:"A-",note:"Massive target share, elite size/athleticism combo",color:"#22c55e"},
            {name:"Omarion Hampton",pos:"RB",team:"LAC",grade:"A-",dc:"1.22 OA",fit:"B+",note:"Three-down back, great landing spot, immediate contributor",color:"#86efac"},
            {name:"Tyler Warren",pos:"TE",team:"IND",grade:"A-",dc:"1.25 OA",fit:"A",note:"Rare TE prospect, top-5 dynasty TE upside within 2 years",color:"#86efac"},
            {name:"Shedeur Sanders",pos:"QB",team:"CLE",grade:"B+",dc:"1.5 OA",fit:"B",note:"Elite accuracy, landing spot concern, SF value buy-low",color:"#f59e0b"},
            {name:"Quinshon Judkins",pos:"RB",team:"CLE",grade:"B+",dc:"2.5 OA",fit:"B",note:"Power runner, committee risk early, long-term upside",color:"#f59e0b"},
            {name:"Emeka Egbuka",pos:"WR",team:"TB",grade:"B+",dc:"1.28 OA",fit:"B+",note:"Slot demon, elite route runner, Evans heir apparent",color:"#f59e0b"},
            {name:"Luther Burden III",pos:"WR",team:"CHI",grade:"B",dc:"2.39 OA",fit:"A",note:"Perfect landing spot with DJ Moore, upside play at price",color:"#fbbf24"},
            {name:"Harold Fannin Jr.",pos:"TE",team:"CLE",grade:"B",dc:"2.45 OA",fit:"B+",note:"Dominant college production, developing QB is key risk",color:"#fbbf24"},
            {name:"Cam Skattebo",pos:"RB",team:"NYG",grade:"B",dc:"1.87 OA",fit:"B",note:"Physical runner, role TBD behind committee, value pick",color:"#fbbf24"},
          ];
          return React.createElement("div",null,
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12,background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"8px 10px"}},
              [["Grade","Dynasty potential"],["DC","Draft capital"],["Fit","Team fit"]].map(function(l){return React.createElement("div",{key:l[0],style:{textAlign:"center"}},React.createElement("div",{style:{fontWeight:700,fontSize:11,color:T.purpleLight}},l[0]),React.createElement("div",{style:{fontSize:9,color:T.textDim}},l[1]));})
            ),
            ROOKIE_GRADES.map(function(r){
              var p=rankedPlayers.find(function(x){return x.name===r.name;});
              return React.createElement("div",{key:r.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"13px 14px",marginBottom:8}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                  p&&React.createElement(Avatar,{name:r.name,pos:r.pos,size:40}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:800,fontSize:14}},r.name),
                    React.createElement("div",{style:{fontSize:11,color:T.textSub}},r.team+" · "+r.pos+(r.dc?" · Pick "+r.dc:""))
                  ),
                  React.createElement("div",{style:{width:40,height:40,borderRadius:10,background:r.color+"22",border:"2px solid "+r.color+"66",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:r.color,flexShrink:0}},r.grade)
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}},
                  [["Draft Capital",r.dc,T.gold],["Team Fit",r.fit,T.cyan],["Dynasty Val",p?p.tradeVal.toLocaleString():"N/A",T.purple]].map(function(s){
                    return React.createElement("div",{key:s[0],style:{background:T.bgInput,borderRadius:8,padding:"7px 6px",textAlign:"center"}},
                      React.createElement("div",{style:{fontSize:9,color:T.textSub,marginBottom:2}},s[0]),
                      React.createElement("div",{style:{fontWeight:800,fontSize:13,color:s[2]}},s[1])
                    );
                  })
                ),
                React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:8,lineHeight:1.5,borderTop:"1px solid "+T.border,paddingTop:8}},r.note)
              );
            }),
            React.createElement("div",{style:{marginTop:24,fontWeight:900,fontSize:18,marginBottom:4}},"2026 Draft Class Preview"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12}},"Top prospects · Draft April 23-25 · Teams TBD"),
            [
              {name:"Jeremiyah Love",pos:"RB",team:"TBD",grade:"A+",dc:"Top 3",fit:"TBD",note:"Elite workhorse RB from Notre Dame — dynasty RB1 ceiling",color:T.green},
              {name:"Fernando Mendoza",pos:"QB",team:"TBD",grade:"A",dc:"#1 OA",fit:"TBD",note:"#1 overall QB from Indiana — elite arm, must-have in SF leagues",color:"#22c55e"},
              {name:"Carnell Tate",pos:"WR",team:"TBD",grade:"A",dc:"Top 10",fit:"TBD",note:"Elite WR from Ohio State — dynasty WR1 upside, great size/speed",color:"#22c55e"},
              {name:"Kenyon Sadiq",pos:"TE",team:"TBD",grade:"A-",dc:"Top 15",fit:"TBD",note:"Top TE from Oregon — rare athleticism, long-term TE1 upside",color:"#86efac"},
              {name:"Makai Lemon",pos:"WR",team:"TBD",grade:"A-",dc:"1st Rd",fit:"TBD",note:"USC WR with elite athleticism — immediate target share upside",color:"#86efac"},
              {name:"Jadarian Price",pos:"RB",team:"TBD",grade:"B+",dc:"2nd Rd",fit:"TBD",note:"Notre Dame RB2 — three-down back with solid floor",color:"#f59e0b"},
              {name:"Omar Cooper Jr.",pos:"WR",team:"TBD",grade:"B+",dc:"1st Rd",fit:"TBD",note:"Indiana WR — elite YAC, separation specialist",color:"#f59e0b"},
              {name:"Ty Simpson",pos:"QB",team:"TBD",grade:"B",dc:"1st Rd",fit:"TBD",note:"Alabama QB — dual-threat upside, SF league developmental",color:"#fbbf24"},
              {name:"Jordyn Tyson",pos:"WR",team:"TBD",grade:"B",dc:"1st Rd",fit:"TBD",note:"Arizona State WR — big-play vertical threat",color:"#fbbf24"},
            ].map(function(r){
              var p=rankedPlayers.find(function(x){return x.name===r.name;});
              return React.createElement("div",{key:r.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"13px 14px",marginBottom:8}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                  p&&React.createElement(Avatar,{name:r.name,pos:r.pos,size:40}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:800,fontSize:14}},r.name),
                    React.createElement("div",{style:{fontSize:11,color:T.textSub}},r.team+" · "+r.pos+" · Pick "+r.dc)
                  ),
                  React.createElement("div",{style:{width:40,height:40,borderRadius:10,background:r.color+"22",border:"2px solid "+r.color+"66",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:r.color,flexShrink:0}},r.grade)
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}},
                  [["Draft Cap",r.dc,T.gold],["Team Fit",r.fit,T.cyan],["Dynasty Val",p?p.tradeVal.toLocaleString():"TBD",T.purple]].map(function(s){
                    return React.createElement("div",{key:s[0],style:{background:T.bgInput,borderRadius:8,padding:"7px 6px",textAlign:"center"}},
                      React.createElement("div",{style:{fontSize:9,color:T.textSub,marginBottom:2}},s[0]),
                      React.createElement("div",{style:{fontWeight:800,fontSize:13,color:s[2]}},s[1])
                    );
                  })
                ),
                React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:8,lineHeight:1.5,borderTop:"1px solid "+T.border,paddingTop:8}},r.note)
              );
            }),
            React.createElement("div",{style:{marginTop:20,fontWeight:800,fontSize:16,marginBottom:10}},"2026 Pick Values"),
            DRAFT_PICKS.map(function(pk){
              var tierC=pk.round===1?"#f1c40f":pk.round===2?"#818cf8":"#4b5563";
              return React.createElement("div",{key:pk.id,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"13px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}},
                React.createElement("div",{style:{width:40,height:40,borderRadius:10,background:tierC+"22",border:"1px solid "+tierC+"44",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:11,color:tierC,flexShrink:0,textAlign:"center"}},"R"+pk.round),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:14}},pk.name),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},pk.note)
                ),
                React.createElement("div",{style:{textAlign:"right"}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:15,color:tierC}},pk.est+" val"),
                  React.createElement("div",{style:{fontSize:9,color:T.textSub,marginTop:2}},pk.round===1?"1st Round":pk.round===2?"2nd Round":"3rd Round")
                )
              );
            })
          );
        })()
      ),

      // VEGAS LINES
      rankSubTab==="vegas"&&(function(){
        var games=oddsData?Object.keys(oddsData).filter(function(team){var g=oddsData[team];return g&&g.spread<=0;}).map(function(homeTeam){var g=oddsData[homeTeam];return{home:homeTeam,away:g.opp,spread:g.spread,total:g.total};}).sort(function(a,b){return a.spread-b.spread;}):[];
        var hasData=games.length>0;
        return React.createElement("div",{style:{padding:"16px"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:16}},
            React.createElement("div",{style:{width:44,height:44,borderRadius:12,background:"#16a34a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
              React.createElement("span",{style:{fontSize:22,color:"#fff"}},"$")
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.text}},"Vegas Lines"),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},"NFL spreads, totals, and game script predictions")
            )
          ),
          !hasData&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:32,textAlign:"center",marginBottom:16}},
            React.createElement("div",{style:{fontSize:36,marginBottom:12}},"📅"),
            React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text,marginBottom:8}},"No Current NFL Lines"),
            React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,maxWidth:320,margin:"0 auto",marginBottom:16}},"Odds are posted Thursday–Sunday during the NFL season (September–January). Check back once Week 1 lines drop."),
            React.createElement("button",{onClick:function(){_oddsCache=null;fetchOdds().then(function(d){if(Object.keys(d).length>0)setOddsData(d);});},style:{padding:"10px 24px",borderRadius:12,border:"1px solid "+T.border,background:T.bgInput,color:T.text,fontWeight:700,fontSize:13,cursor:"pointer"}},"↻ Check for Lines")
          ),
          hasData&&React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{fontSize:11,color:T.textSub,fontWeight:700,letterSpacing:1,marginBottom:8}},"THIS WEEK'S GAMES — "+games.length+" MATCHUPS"),
            games.map(function(g){
              var gsHome=getGameScript(g.home,oddsData);
              var gsAway=getGameScript(g.away,oddsData);
              var totalNote=g.total>=50?"🔥 Shootout":g.total<=41?"🛡 Low Scoring":"";
              return React.createElement("div",{key:g.home+g.away,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:10}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text}},g.away+" @ "+g.home),
                  totalNote&&React.createElement("div",{style:{fontSize:11,fontWeight:700,color:g.total>=50?"#f59e0b":"#60a5fa"}},totalNote)
                ),
                React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10}},
                  React.createElement("div",{style:{flex:1,background:T.bgInput,borderRadius:10,padding:"10px 12px",textAlign:"center"}},
                    React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:4}},"SPREAD"),
                    React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text}},(g.spread>0?"+":"")+g.spread)
                  ),
                  React.createElement("div",{style:{flex:1,background:T.bgInput,borderRadius:10,padding:"10px 12px",textAlign:"center"}},
                    React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:4}},"O/U TOTAL"),
                    React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text}},g.total)
                  )
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
                  gsAway&&React.createElement("div",{style:{background:gsAway.color+"14",border:"1px solid "+gsAway.color+"33",borderRadius:10,padding:"8px 12px"}},
                    React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:2}},g.away),
                    React.createElement("div",{style:{fontWeight:700,fontSize:12,color:gsAway.color}},gsAway.script),
                    React.createElement("div",{style:{fontSize:10,color:T.textDim}},"Spread: "+(gsAway.spread>0?"+":"")+gsAway.spread)
                  ),
                  gsHome&&React.createElement("div",{style:{background:gsHome.color+"14",border:"1px solid "+gsHome.color+"33",borderRadius:10,padding:"8px 12px"}},
                    React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:2}},g.home),
                    React.createElement("div",{style:{fontWeight:700,fontSize:12,color:gsHome.color}},gsHome.script),
                    React.createElement("div",{style:{fontSize:10,color:T.textDim}},"Spread: "+(gsHome.spread>0?"+":"")+gsHome.spread)
                  )
                )
              );
            })
          ),
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16}},
            React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text,marginBottom:10}},"Game Script Guide"),
            [["Positive Script","Favored by 7+ pts — run-heavy, clock control. Boost RBs.","#22c55e"],["Slight Fav","Favored by 3–6 pts — balanced attack expected.","#4ade80"],["Neutral","Pick'em or within 2 pts — no clear script edge.","#94a3b8"],["Slight Dog","Underdog by 3–6 pts — pass volume increases.","#fb923c"],["Negative Script","Underdog by 7+ pts — pass-heavy game script. Boost WRs/TEs.","#f87171"]].map(function(row){
              return React.createElement("div",{key:row[0],style:{display:"flex",alignItems:"center",gap:10,marginBottom:8}},
                React.createElement("div",{style:{width:10,height:10,borderRadius:"50%",background:row[2],flexShrink:0}}),
                React.createElement("div",null,
                  React.createElement("span",{style:{fontWeight:700,fontSize:12,color:row[2]}},(row[0] as string)+": "),
                  React.createElement("span",{style:{fontSize:12,color:T.textSub}},row[1])
                )
              );
            })
          )
        );
      })(),

      // TRENDING (image 3)
      rankSubTab==="trending"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}},
            React.createElement("div",null,
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:4}},
                React.createElement("span",{style:{fontSize:20,color:T.green}},"~"),
                React.createElement("div",{style:{fontWeight:900,fontSize:22}},"Trending Players")
              ),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Real-time value adjustments")
            ),
            React.createElement("button",{style:{width:36,height:36,borderRadius:10,border:"1px solid "+T.border,background:T.bgInput,cursor:"pointer",color:T.textSub,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},"o")
          ),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            [["all","All"],["rising","Rising"],["falling","Falling"]].map(function(f){
              var active=trendingFilter===f[0];
              return React.createElement("button",{key:f[0],onClick:function(){setTrendingFilter(f[0]);},style:{padding:"7px 14px",borderRadius:20,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer"}},f[1]);
            })
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:16,fontSize:12,color:T.textSub}},
            React.createElement("span",null,"o")," Last updated: "+(new Date().toLocaleTimeString())
          ),
          React.createElement("div",{style:{background:darkMode?"#0f2a4a":"#dbeafe",border:"1px solid "+(darkMode?"#3b82f644":"#93c5fd"),borderRadius:10,padding:"12px 14px",marginBottom:24,display:"flex",alignItems:"flex-start",gap:10}},
            React.createElement("span",{style:{color:"#60a5fa",fontSize:14,flexShrink:0,marginTop:1}},"i"),
            React.createElement("div",{style:{fontSize:12,color:darkMode?"#93c5fd":"#1e40af",lineHeight:1.6}},"Adjustments are temporary overlays on base values. They react to injuries, role changes, and transactions, and reset during nightly rebuilds. Base rankings remain stable.")
          ),
          React.createElement("div",{style:{textAlign:"center",padding:"32px 0"}},
            React.createElement("div",{style:{fontSize:32,color:T.textDim,marginBottom:12}},"~"),
            React.createElement("div",{style:{fontWeight:700,fontSize:16,color:T.textSub,marginBottom:6}},"No trending players at the moment"),
            React.createElement("div",{style:{fontSize:13,color:T.textDim}},"Check back after injuries or transactions")
          )
        )
      ),

      // MARKET — Dynasty Market Trends
      rankSubTab==="market"&&React.createElement("div",{style:{paddingBottom:16}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,margin:"16px",marginBottom:12,padding:20}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
            React.createElement("div",{style:{flex:1,marginRight:16}},
              React.createElement("div",{style:{fontWeight:900,fontSize:26,lineHeight:1.15,marginBottom:8,color:T.text}},"Dynasty Market",React.createElement("br",null),"Trends"),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.5,marginBottom:10}},"Real-time buy-low and sell-high opportunities based on value movement"),
              React.createElement("div",{style:{fontSize:11,color:T.textDim}},"Last updated: "+(new Date().toLocaleString()))
            ),
            React.createElement("button",{onClick:function(){setMarketFilter(marketFilter);},style:{padding:"10px 14px",borderRadius:10,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6,flexShrink:0,whiteSpace:"nowrap"}},"↻ Refresh")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,margin:"0 16px 12px",overflow:"hidden"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr"}},
            [["buylow","Buy Low","Players whose values have dropped significantly","#22c55e"],["sellhigh","Sell High","Players whose values have spiked recently","#818cf8"],["rising","Rising","Players with steady upward momentum","#60a5fa"],["falling","Falling","Players with declining values","#9b96b8"]].map(function(cat){
              var active=marketFilter===cat[0];
              return React.createElement("div",{key:cat[0],onClick:function(){setMarketFilter(cat[0]);},style:{padding:"14px 10px",cursor:"pointer",borderLeft:"3px solid "+(active?cat[3]:"transparent"),background:active?cat[3]+"11":"transparent",borderBottom:"1px solid "+T.border}},
                React.createElement("div",{style:{fontWeight:800,fontSize:12,color:active?cat[3]:T.textSub,marginBottom:4,lineHeight:1.2}},cat[1]),
                React.createElement("div",{style:{fontSize:9,color:T.textDim,lineHeight:1.4}},cat[2])
              );
            })
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,margin:"0 16px 12px",padding:"12px 14px",display:"flex",alignItems:"center",gap:8}},
          React.createElement("span",{style:{color:T.textDim,fontSize:14}},"V"),
          React.createElement("select",{value:marketPos,onChange:function(e){setMarketPos(e.target.value);},style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",flex:1,cursor:"pointer"}},
            ["All Positions","QB","RB","WR","TE","DL","LB","DB"].map(function(p){return React.createElement("option",{key:p},p);})
          ),
          React.createElement("button",{style:{width:36,height:36,borderRadius:8,border:"1px solid "+T.border,background:T.bgInput,cursor:"pointer",color:T.textSub,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},"Q"),
          (function(){
            var ct=rankedPlayers.filter(function(p){
              if(p.pos==="K"||p.pos==="DST")return false;
              if(marketPos!=="All Positions"&&p.pos!==marketPos)return false;
              if(marketFilter==="buylow")return p.age>29||p.posRank>8;
              if(marketFilter==="sellhigh")return p.age<26&&p.posRank<=8;
              if(marketFilter==="rising")return p.age<27&&p.posRank<=12;
              return p.age>31;
            }).length;
            return React.createElement("span",{style:{fontSize:12,color:T.textSub,whiteSpace:"nowrap",flexShrink:0}},"Showing "+Math.min(ct,8)+" players");
          })()
        ),
        (function(){
          var catColor=marketFilter==="buylow"?"#22c55e":marketFilter==="sellhigh"?"#818cf8":marketFilter==="rising"?"#60a5fa":T.red;
          var signalLabel=marketFilter==="buylow"?"Age Signal":marketFilter==="sellhigh"?"Value Signal":marketFilter==="rising"?"Upside":marketFilter==="falling"?"Decline Risk":"Signal";
          return rankedPlayers.filter(function(p){
            if(p.pos==="K"||p.pos==="DST")return false;
            if(marketPos!=="All Positions"&&p.pos!==marketPos)return false;
            if(marketFilter==="buylow")return p.age>29||p.posRank>8;
            if(marketFilter==="sellhigh")return p.age<26&&p.posRank<=8;
            if(marketFilter==="rising")return p.age<27&&p.posRank<=12;
            return p.age>31;
          }).slice(0,8).map(function(p){
            return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"2px solid "+catColor+"33",borderRadius:16,padding:16,margin:"0 16px 10px"}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}},
                React.createElement("div",null,
                  React.createElement("div",{style:{fontWeight:800,fontSize:17,color:T.text,marginBottom:4}},p.name),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.textSub}},
                    React.createElement(PBadge,{pos:p.pos}),React.createElement("span",null,"·"),React.createElement("span",{style:{fontWeight:600}},p.team)
                  )
                ),
                React.createElement("div",{style:{background:catColor+"22",color:catColor,fontWeight:800,fontSize:11,borderRadius:20,padding:"4px 10px",flexShrink:0,border:"1px solid "+catColor+"44"}},signalLabel)
              ),
              React.createElement("div",{style:{marginTop:10}},
                React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:2}},"Trade Value"),
                React.createElement("div",{style:{fontWeight:800,fontSize:22,color:T.purpleLight,marginBottom:10}},p.tradeVal.toLocaleString())
              ),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,paddingTop:10,borderTop:"1px solid "+T.border}},
                React.createElement("div",null,
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:3}},"Proj Pts"),
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},p.pts.toFixed(1))
                ),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:3}},"Position Rank"),
                  React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},"#"+p.posRank)
                )
              )
            );
          });
        })()
      ),

      // VALUE TRENDS — Value Trend Tracker
      rankSubTab==="valuetrends"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:8}},
          React.createElement("span",{style:{fontSize:28,color:"#3b82f6",fontWeight:900,lineHeight:1}},"^"),
          React.createElement("div",{style:{fontWeight:900,fontSize:26,color:T.text}},"Value Trend Tracker")
        ),
        React.createElement("div",{style:{background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:T.textSub,lineHeight:1.5}},"⚠ Trend charts show estimated value ranges based on player age, position rank, and dynasty profile — not historical transaction data."),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:12}},
          React.createElement("div",{style:{position:"relative",marginBottom:10}},
            React.createElement("span",{style:{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:13}},"Q"),
            React.createElement("input",{value:valueTrendSearch,onChange:function(e){setValueTrendSearch(e.target.value);},placeholder:"Search tracked players...",style:Object.assign({},inpS,{paddingLeft:38})})
          ),
          React.createElement("button",{onClick:function(){setValueTrendSearch("");},style:{width:"100%",padding:"13px",borderRadius:10,border:"none",background:"#2563eb",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}},"Refresh Trends")
        ),
        (function(){
          var display=rankedPlayers.filter(function(p){
            if(valueTrendSearch&&!p.name.toLowerCase().includes(valueTrendSearch.toLowerCase()))return false;
            return ["QB","RB","WR","TE"].includes(p.pos);
          }).slice(0,Math.min(valueTrendSearch?20:16,rankedPlayers.length));
          return React.createElement("div",null,
            display.map(function(p){
              var pts=sparkline(p.name,p.posRank,p.age,p.pos);
              var mn=Math.min.apply(null,pts),mx=Math.max.apply(null,pts);
              var h=40,w=120;
              var trendUp=pts[pts.length-1]>pts[0];
              var lineColor=trendUp?T.green:T.red;
              var svgPts=pts.map(function(v,i){var x=i*(w/(pts.length-1));var y=h-(v-mn)/(mx-mn||1)*h;return x+","+y;}).join(" ");
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}},
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub}},"#"+p.posRank+" "+p.pos+" · "+p.team)
                ),
                React.createElement("svg",{width:w,height:h,style:{flexShrink:0}},
                  React.createElement("polyline",{points:svgPts,fill:"none",stroke:lineColor,strokeWidth:2,strokeLinejoin:"round"}),
                  React.createElement("circle",{cx:pts.length-1?(pts.length-1)*(w/(pts.length-1)):0,cy:h-(pts[pts.length-1]-mn)/(mx-mn||1)*h,r:3,fill:lineColor})
                ),
                React.createElement("div",{style:{textAlign:"right",flexShrink:0,minWidth:52}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:13,color:T.purpleLight}},p.tradeVal.toLocaleString()),
                  React.createElement("div",{style:{fontSize:10,fontWeight:700,color:trendUp?T.green:T.red}},(trendUp?"↑":"↓")+Math.abs(pts[pts.length-1]-pts[0]).toLocaleString())
                )
              );
            })
          );
        })()
      ),

      // PICK VALUE CALCULATOR
      rankSubTab==="pickcalc"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:4}},"Pick Value Calculator"),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Compare draft picks to player values to find fair trades"),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:14,padding:"14px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:700,fontSize:13,marginBottom:8}},"Search a Player"),
          React.createElement("div",{style:{position:"relative"}},
            React.createElement("input",{value:pickCalcSearch,onChange:function(e){setPickCalcSearch(e.target.value);if(!e.target.value)setPickCalcPlayer(null);},placeholder:"e.g. Ja'Marr Chase...",style:Object.assign({},inpS)}),
            pickCalcSearch&&!pickCalcPlayer&&React.createElement("div",{style:{position:"absolute",top:"calc(100%+4px)",left:0,right:0,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,zIndex:50,maxHeight:200,overflowY:"auto",marginTop:4}},
              rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(pickCalcSearch.toLowerCase());}).slice(0,8).map(function(p){
                return React.createElement("div",{key:p.name,onClick:function(){setPickCalcPlayer(p);setPickCalcSearch(p.name);},style:{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:8}},
                  React.createElement(PBadge,{pos:p.pos}),
                  React.createElement("span",{style:{flex:1,fontWeight:600,fontSize:13}},p.name),
                  React.createElement("span",{style:{fontWeight:800,fontSize:13,color:T.purple}},p.tradeVal.toLocaleString())
                );
              })
            )
          )
        ),
        pickCalcPlayer&&React.createElement("div",null,
          React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:14,padding:"16px",marginBottom:14}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:14}},
              React.createElement(Avatar,{name:pickCalcPlayer.name,pos:pickCalcPlayer.pos,size:52}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:900,fontSize:18}},pickCalcPlayer.name),
                React.createElement("div",{style:{fontSize:12,color:T.textSub}},pickCalcPlayer.team+" · #"+pickCalcPlayer.posRank+" "+pickCalcPlayer.pos+" · Age "+pickCalcPlayer.age)
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.purple}},pickCalcPlayer.tradeVal.toLocaleString()),
                React.createElement("div",{style:{fontSize:10,color:T.textSub}},"Trade Value")
              )
            ),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:10,fontWeight:600}},"EQUIVALENT PICK VALUES"),
            DRAFT_PICKS.map(function(pk){
              var diff=pk.est-pickCalcPlayer.tradeVal;
              var pct=pickCalcPlayer.tradeVal>0?Math.abs(diff/pickCalcPlayer.tradeVal)*100:0;
              var fair=pct<15;
              var barW=Math.min(100,Math.max(5,100-pct));
              var color=fair?T.green:diff>0?T.gold:T.red;
              return React.createElement("div",{key:pk.id,style:{background:T.bgInput,borderRadius:10,padding:"10px 12px",marginBottom:6}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:13}},pk.name),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                    React.createElement("span",{style:{fontWeight:800,fontSize:13,color:T.textSub}},pk.est.toLocaleString()),
                    React.createElement("span",{style:{fontSize:11,fontWeight:700,color:color,background:color+"18",borderRadius:6,padding:"2px 8px"}},fair?"≈ Fair":diff>0?"Pick Wins":"Player Wins")
                  )
                ),
                React.createElement("div",{style:{background:T.border,borderRadius:99,height:5}},
                  React.createElement("div",{style:{width:barW+"%",height:"100%",background:"linear-gradient(90deg,"+T.purple+","+color+")",borderRadius:99}})
                )
              );
            })
          ),
          React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:10}},"Players With Similar Value"),
          rankedPlayers.filter(function(p){
            return p.name!==pickCalcPlayer.name&&Math.abs(p.tradeVal-pickCalcPlayer.tradeVal)<pickCalcPlayer.tradeVal*0.15;
          }).slice(0,8).map(function(p){
            return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
              React.createElement(Avatar,{name:p.name,pos:p.pos,size:32}),
              React.createElement(PBadge,{pos:p.pos,rank:p.posRank}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+" · Age "+p.age)
              ),
              React.createElement("div",{style:{fontWeight:800,fontSize:13,color:T.purpleLight}},p.tradeVal.toLocaleString())
            );
          })
        ),
        !pickCalcPlayer&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"40px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:36,marginBottom:10}},"🏈"),
          React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:6}},"Search Any Player"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub}},"See which picks match their dynasty value and find comparable players")
        )
      ),

      // WATCHLIST — empty state redesign
      rankSubTab==="watchlist"&&React.createElement("div",{style:{paddingBottom:8}},
        watchlist.length===0
          ?React.createElement("div",{style:{padding:"60px 24px 32px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:64,color:T.textDim,marginBottom:20,lineHeight:1}},"\u2606"),
              React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.text,marginBottom:10}},"Your Watchlist is Empty"),
              React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6,marginBottom:20,maxWidth:280,margin:"0 auto 20px"}},"Track players to monitor their value changes"),
              React.createElement("div",{style:{position:"relative",width:"100%",maxWidth:320,margin:"0 auto"}},
                React.createElement("input",{value:watchlistSearch,onChange:function(e){setWatchlistSearch(e.target.value);},placeholder:"Search players to watch...",style:Object.assign({},inpS,{background:T.bgCard,borderRadius:12,border:"1px solid "+T.border})}),
                watchlistSearch&&React.createElement("div",{style:{position:"absolute",top:"calc(100%+4px)",left:0,right:0,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,zIndex:50,marginTop:4}},
                  rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(watchlistSearch.toLowerCase())&&watchlist.indexOf(p.name)===-1;}).slice(0,6).map(function(p){
                    return React.createElement("div",{key:p.name,onClick:function(){setWatchlist(function(w){return w.concat([p.name]);});setWatchlistSearch("");},style:{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:8}},
                      React.createElement(PBadge,{pos:p.pos}),
                      React.createElement("span",{style:{flex:1,fontWeight:600,fontSize:13}},p.name),
                      React.createElement("span",{style:{fontSize:11,color:T.textSub}},p.team)
                    );
                  })
                )
              )
            )
          :React.createElement("div",{style:{padding:"16px"}},
              React.createElement("div",{style:{position:"relative",marginBottom:12}},
                React.createElement("input",{value:watchlistSearch,onChange:function(e){setWatchlistSearch(e.target.value);},placeholder:"Add player to watchlist...",style:Object.assign({},inpS)}),
                watchlistSearch&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,zIndex:50}},
                  rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(watchlistSearch.toLowerCase())&&watchlist.indexOf(p.name)===-1;}).slice(0,5).map(function(p){
                    return React.createElement("div",{key:p.name,onClick:function(){setWatchlist(function(w){var n=w.concat([p.name]);try{localStorage.setItem('fdp_wl_v1',JSON.stringify(n));}catch(e){}return n;});setWatchlistSearch("");},style:{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+T.border,display:"flex",alignItems:"center",gap:8}},
                      React.createElement(PBadge,{pos:p.pos}),
                      React.createElement("span",{style:{flex:1,fontWeight:600,fontSize:13}},p.name),
                      React.createElement("span",{style:{color:T.purple,fontWeight:700,fontSize:12}},p.tradeVal.toLocaleString())
                    );
                  })
                )
              ),
              rankedPlayers.filter(function(p){return watchlist.indexOf(p.name)!==-1;}).map(function(p){
                return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:12,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}},
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:32}),
                  React.createElement(PBadge,{pos:p.pos,rank:p.posRank}),
                  React.createElement("div",{style:{flex:1}},
                    React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                    React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+" | val "+p.tradeVal)
                  ),
                  React.createElement("button",{onClick:function(){setWatchlist(function(w){var n=w.filter(function(x){return x!==p.name;});try{localStorage.setItem('fdp_wl_v1',JSON.stringify(n));}catch(e){}return n;});},style:{background:"none",border:"none",cursor:"pointer",color:T.gold,fontSize:16}},"\u2605")
                );
              })
            )
      ),

      // DRAFT KIT
      rankSubTab==="draft"&&React.createElement("div",{style:{paddingBottom:16}},
        React.createElement("style",null,"@keyframes fdp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"),
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 16px 12px"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
            React.createElement("span",{style:{fontSize:22,color:"#3b82f6"}},"[=]"),
            React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text}},"Draft Kit")
          ),
          React.createElement("button",{onClick:function(){
            var text=rankedPlayers.filter(function(p){return ["QB","RB","WR","TE"].indexOf(p.pos)>=0;}).slice(0,100).map(function(p,i){return (i+1)+","+p.name+","+p.pos+","+p.team+","+(p.tradeVal||0);}).join("\n");
            var blob=new Blob(["Rank,Name,Pos,Team,Value\n"+text],{type:"text/csv"});
            var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="fdp-rankings.csv";a.click();
          },style:{padding:"10px 18px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Download CSV")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,margin:"0 16px 16px",padding:"14px 16px"}},
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10}},
            React.createElement("button",{onClick:function(){setDraftKitSearch("");},style:{width:44,height:44,borderRadius:10,border:"1px solid "+T.border,background:T.bgInput,cursor:"pointer",color:T.textSub,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},"✕"),
            React.createElement("select",{value:draftKitPos,onChange:function(e){setDraftKitPos(e.target.value);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none",cursor:"pointer"}},
              ["All Positions","QB","RB","WR","TE","K","DST"].map(function(p){return React.createElement("option",{key:p},p);})
            ),
            React.createElement("button",{onClick:function(){setDraftKitLoaded(function(v){return !v;});},style:{padding:"10px 16px",borderRadius:10,border:"none",background:"#2563eb",color:draftKitLoaded?"#fff":"rgba(255,255,255,0.7)",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}},draftKitLoaded?"Reset":"Loading...")
          ),
          React.createElement("div",{style:{display:"flex",gap:20,fontSize:13,color:T.textSub}},
            React.createElement("span",null,"Drafted: ",React.createElement("span",{style:{fontWeight:800,color:T.text}},drafted.length)),
            React.createElement("span",null,"Available: ",React.createElement("span",{style:{fontWeight:800,color:T.text}},rankedPlayers.filter(function(p){return drafted.indexOf(p.name)===-1&&(draftKitPos==="All Positions"||p.pos===draftKitPos);}).length))
          )
        ),
        !draftKitLoaded
          ?React.createElement("div",{style:{textAlign:"center",padding:"60px 20px"}},
              React.createElement("div",{style:{width:48,height:48,border:"3px solid #3b82f6",borderTopColor:"transparent",borderRadius:"50%",margin:"0 auto 16px",animation:"fdp-spin 0.9s linear infinite"}}),
              React.createElement("div",{style:{fontSize:14,color:T.textSub}},"Loading draft board...")
            )
          :React.createElement("div",null,
              React.createElement("div",{style:{padding:"0 16px 8px"}},
                React.createElement("input",{value:draftKitSearch,onChange:function(e){setDraftKitSearch(e.target.value);},placeholder:"Search players...",style:Object.assign({},inpS)})
              ),
              rankedPlayers.filter(function(p){
                return (draftKitPos==="All Positions"||p.pos===draftKitPos)&&(!draftKitSearch||p.name.toLowerCase().includes(draftKitSearch.toLowerCase()));
              }).slice().sort(function(a,b){return b.tradeVal-a.tradeVal;}).slice(0,40).map(function(p){
                var isDrafted=drafted.indexOf(p.name)!==-1;
                return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:5,margin:"0 16px 6px",display:"flex",alignItems:"center",gap:10,opacity:isDrafted?0.4:1}},
                  React.createElement("span",{style:{fontWeight:700,fontSize:11,color:T.textDim,width:24,flexShrink:0}},"#"+p.posRank),
                  React.createElement(Avatar,{name:p.name,pos:p.pos,size:30}),
                  React.createElement(PBadge,{pos:p.pos,rank:p.posRank}),
                  React.createElement("div",{style:{flex:1,minWidth:0}},
                    React.createElement("div",{style:{fontWeight:700,fontSize:13,color:isDrafted?T.textDim:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},p.name),
                    React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+(p.age?" · Age "+p.age:""))
                  ),
                  React.createElement("button",{onClick:function(){setDrafted(function(d){return isDrafted?d.filter(function(x){return x!==p.name;}):[p.name].concat(d);});},style:{padding:"6px 12px",borderRadius:8,border:"1px solid "+(isDrafted?T.border:T.purple),background:isDrafted?"transparent":T.purple,color:isDrafted?T.textDim:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",flexShrink:0}},isDrafted?"Undraft":"Draft")
                );
              })
            )
      ),

      // KEEPER CALCULATOR
      rankSubTab==="keeper"&&React.createElement("div",{style:{padding:"16px",paddingBottom:8}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("div",{style:{width:44,height:44,borderRadius:12,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22,color:"#fff"}},"\u26E8"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.text}},"Keeper Value Calculator"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Find the best keepers for your dynasty league")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:14}},
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            React.createElement("select",{value:keeperTeam,onChange:function(e){setKeeperTeam(Number(e.target.value));setKeeperCalced(false);},style:{flex:1,background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:13,outline:"none"}},
              activeTeams.map(function(t,i){return React.createElement("option",{key:i,value:i},t.name);})
            ),
            React.createElement("button",{onClick:function(){setKeeperCalced(true);},style:{padding:"10px 20px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}},"Calculate")
          ),
          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Keeper Limit"),
            React.createElement("input",{type:"number",value:keeperLimit,onChange:function(e){setKeeperLimit(Number(e.target.value));setKeeperCalced(false);},min:1,max:10,style:Object.assign({},inpS,{textAlign:"center"})})
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Default Keeper Cost"),
            React.createElement("input",{type:"number",value:keeperCost,onChange:function(e){setKeeperCost(Number(e.target.value));setKeeperCalced(false);},min:0,style:Object.assign({},inpS,{textAlign:"center"})})
          )
        ),
        keeperCalced&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}},
          React.createElement("div",{style:{background:T.green+"15",border:"1px solid "+T.green+"44",borderRadius:12,padding:"16px",textAlign:"center"}},
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.green}},
              (function(){var ps=(activeTeams[keeperTeam]&&activeTeams[keeperTeam].players&&activeTeams[keeperTeam].players.length>0?activeTeams[keeperTeam].players:rankedPlayers).filter(function(p){return p.pos!=="DST"&&p.pos!=="K";}).slice(0,keeperLimit);return ps.reduce(function(s,p){return s+(p.tradeVal||0);},0).toLocaleString();})()
            ),
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:4}},"Total Keeper Value")
          ),
          React.createElement("div",{style:{background:T.red+"15",border:"1px solid "+T.red+"44",borderRadius:12,padding:"16px",textAlign:"center"}},
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.red}},(keeperLimit*keeperCost).toLocaleString()),
            React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:4}},"Total Cost")
          )
        ),
        keeperCalced&&React.createElement("div",null,
          React.createElement("div",{style:{fontWeight:700,fontSize:16,marginBottom:12,color:T.purpleLight}},"Top "+keeperLimit+" Recommended Keepers"),
          (activeTeams[keeperTeam]&&activeTeams[keeperTeam].players&&activeTeams[keeperTeam].players.length>0?activeTeams[keeperTeam].players:rankedPlayers).filter(function(p){return p.pos!=="DST"&&p.pos!=="K";}).slice(0,keeperLimit).map(function(p,i){
            var savings=Math.max(0,Math.round(p.tradeVal-keeperCost*(i+1)));
            return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+(savings>20?T.green+"44":T.border),borderRadius:12,padding:"14px 16px",marginBottom:10}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:8}},
                React.createElement("div",{style:{width:28,height:28,borderRadius:"50%",background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:"#fff",flexShrink:0}},i+1),
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:14}},p.name),
                  React.createElement("div",{style:{fontSize:11,color:T.textSub}},p.team+" | "+p.pos+" | Age "+p.age)
                ),
                savings>0&&React.createElement("div",{style:{background:T.green+"22",border:"1px solid "+T.green+"44",borderRadius:8,padding:"4px 10px",textAlign:"center"}},
                  React.createElement("div",{style:{fontWeight:800,fontSize:12,color:T.green}},"+"+savings),
                  React.createElement("div",{style:{fontSize:9,color:T.textSub}},"savings")
                )
              ),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingTop:8,borderTop:"1px solid "+T.border}},
                React.createElement("div",{style:{textAlign:"center"}},React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.purpleLight}},p.tradeVal),React.createElement("div",{style:{fontSize:9,color:T.textSub}},"Value")),
                React.createElement("div",{style:{textAlign:"center"}},React.createElement("div",{style:{fontWeight:700,fontSize:14,color:T.text}},keeperCost*(i+1)),React.createElement("div",{style:{fontSize:9,color:T.textSub}},"Cost")),
                React.createElement("div",{style:{textAlign:"center"}},React.createElement("div",{style:{fontWeight:700,fontSize:14,color:savings>0?T.green:T.red}},savings>0?"+"+savings:savings),React.createElement("div",{style:{fontSize:9,color:T.textSub}},"Net"))
              )
            );
          })
        )
      ),

      // COMPARE — Player Compare redesign
      rankSubTab==="compare"&&React.createElement("div",{style:{padding:"16px",paddingBottom:8}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("div",{style:{width:44,height:44,borderRadius:12,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},
            React.createElement("span",{style:{fontSize:20,color:"#fff"}},">>")
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:22,color:T.text}},"Player Compare"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Dynasty value head-to-head")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20,marginBottom:16,position:"relative"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1px 1fr",gap:0,marginBottom:16}},
            React.createElement("div",{style:{paddingRight:16}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:12}},
                React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:T.purple,display:"inline-block"}}),
                React.createElement("span",{style:{fontSize:11,fontWeight:800,color:T.textSub,letterSpacing:1}},"PLAYER 1")
              ),
              React.createElement("div",{style:{position:"relative"}},
                React.createElement("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:12}},"Q"),
                React.createElement("input",{value:compareS1,onChange:function(e){setCompareS1(e.target.value);setCompareP1(null);},placeholder:"Search playe...",style:Object.assign({},inpS,{paddingLeft:28,fontSize:13})}),
                compareS1&&!compareP1&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px #0008"}},
                  rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(compareS1.toLowerCase());}).slice(0,4).map(function(p){
                    return React.createElement("button",{key:p.name,onClick:function(){setCompareP1(p);setCompareS1(p.name);},style:{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",borderBottom:"1px solid "+T.border,padding:"8px 12px",cursor:"pointer",textAlign:"left"}},
                      React.createElement(Avatar,{name:p.name,pos:p.pos,size:22}),
                      React.createElement("span",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name)
                    );
                  })
                )
              ),
              compareP1&&React.createElement("div",{style:{marginTop:10,textAlign:"center"}},
                React.createElement(Avatar,{name:compareP1.name,pos:compareP1.pos,size:52}),
                React.createElement("div",{style:{fontWeight:700,fontSize:13,marginTop:6,color:T.text}},compareP1.name),
                React.createElement(PBadge,{pos:compareP1.pos,rank:compareP1.posRank})
              )
            ),
            React.createElement("div",{style:{background:T.border,width:1}}),
            React.createElement("div",{style:{paddingLeft:16}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:12}},
                React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:T.purple,display:"inline-block"}}),
                React.createElement("span",{style:{fontSize:11,fontWeight:800,color:T.textSub,letterSpacing:1}},"PLAYER 2")
              ),
              React.createElement("div",{style:{position:"relative"}},
                React.createElement("span",{style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:12}},"Q"),
                React.createElement("input",{value:compareS2,onChange:function(e){setCompareS2(e.target.value);setCompareP2(null);},placeholder:"Search playe...",style:Object.assign({},inpS,{paddingLeft:28,fontSize:13})}),
                compareS2&&!compareP2&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:200,background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:10,overflow:"hidden",boxShadow:"0 8px 24px #0008"}},
                  rankedPlayers.filter(function(p){return p.name.toLowerCase().includes(compareS2.toLowerCase());}).slice(0,4).map(function(p){
                    return React.createElement("button",{key:p.name,onClick:function(){setCompareP2(p);setCompareS2(p.name);},style:{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",borderBottom:"1px solid "+T.border,padding:"8px 12px",cursor:"pointer",textAlign:"left"}},
                      React.createElement(Avatar,{name:p.name,pos:p.pos,size:22}),
                      React.createElement("span",{style:{fontSize:12,fontWeight:600,color:T.text}},p.name)
                    );
                  })
                )
              ),
              compareP2&&React.createElement("div",{style:{marginTop:10,textAlign:"center"}},
                React.createElement(Avatar,{name:compareP2.name,pos:compareP2.pos,size:52}),
                React.createElement("div",{style:{fontWeight:700,fontSize:13,marginTop:6,color:T.text}},compareP2.name),
                React.createElement(PBadge,{pos:compareP2.pos,rank:compareP2.posRank})
              )
            )
          ),
          React.createElement("div",{style:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:36,height:36,borderRadius:"50%",background:T.bgInput,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}},
            React.createElement("span",{style:{fontSize:11,fontWeight:800,color:T.textSub}},"VS")
          ),
          !compareP1&&!compareP2&&React.createElement("div",{style:{textAlign:"center",padding:"16px 0 4px",fontSize:13,color:T.textDim}},"Search for two players to compare their dynasty value")
        ),
        compareP1&&compareP2&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:14,padding:16}},
          [["Trade Value",compareP1.tradeVal,compareP2.tradeVal],["Proj Pts",compareP1.pts,compareP2.pts],["Age",compareP1.age,compareP2.age],["Position Rank","#"+compareP1.posRank,"#"+compareP2.posRank]].map(function(row,ri){
            var v1=typeof row[1]==="string"?parseFloat(row[1]):row[1];
            var v2=typeof row[2]==="string"?parseFloat(row[2]):row[2];
            var winner=row[0]==="Age"||(typeof row[1]==="string"&&row[1][0]==="#")?(v1<v2?0:1):(v1>v2?0:1);
            return React.createElement("div",{key:row[0],style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:ri<3?"12px":"0",paddingBottom:ri<3?"12px":"0",borderBottom:ri<3?"1px solid "+T.border:"none"}},
              React.createElement("div",{style:{fontWeight:800,fontSize:18,color:winner===0?T.green:T.text,textAlign:"right"}},row[1]),
              React.createElement("div",{style:{fontSize:10,color:T.textSub,textAlign:"center",fontWeight:600,whiteSpace:"nowrap"}},row[0]),
              React.createElement("div",{style:{fontWeight:800,fontSize:18,color:winner===1?T.green:T.text,textAlign:"left"}},row[2])
            );
          })
        )
      ),

      // TRADE HISTORY
      rankSubTab==="history"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:22,marginBottom:2}},"Trade History"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"All trades you've analyzed and saved")
          ),
          tradeHistory.length>0&&React.createElement("button",{onClick:function(){if(window.confirm("Clear all trade history?")){{try{localStorage.removeItem('fdp_th_v1');}catch(e){}setTradeHistory([]);}}},style:{fontSize:11,color:T.red,background:"none",border:"none",cursor:"pointer",fontWeight:600}},"Clear All")
        ),
        tradeHistory.length===0&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"48px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:44,marginBottom:12}},"📋"),
          React.createElement("div",{style:{fontWeight:700,fontSize:17,marginBottom:6}},"No Saved Trades"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6}},"Analyze a trade and hit \"Save Trade\" to build your history")
        ),
        tradeHistory.map(function(entry,idx){
          var diff=entry.tvA-entry.tvB;
          var pct=entry.tvB>0?Math.abs(diff/entry.tvB)*100:0;
          var fair=pct<8;
          var aWins=diff>0;
          var vc=fair?T.green:aWins?T.gold:T.red;
          var vt=fair?"Fair Trade":aWins?"You won ("+pct.toFixed(0)+"%)":"You overpaid ("+pct.toFixed(0)+"%)";
          return React.createElement("div",{key:entry.id,style:{background:T.bgCard,border:"1px solid "+(fair?T.green+"44":aWins?T.gold+"44":T.red+"44"),borderRadius:12,padding:"14px",marginBottom:10}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
              React.createElement("div",{style:{fontWeight:800,fontSize:13,color:vc}},vt),
              React.createElement("div",{style:{fontSize:11,color:T.textDim}},entry.date+(entry.scoring?" · "+entry.scoring:""))
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textSub,letterSpacing:1,marginBottom:4}},"YOU GAVE"),
                entry.sideA.map(function(p){return React.createElement("div",{key:p.name,style:{fontSize:11,fontWeight:600,marginBottom:3,display:"flex",alignItems:"center",gap:4}},
                  React.createElement("span",{style:{color:POS_COLORS[p.pos]||T.textSub,fontSize:9,fontWeight:700,flexShrink:0}},p.pos),p.name
                );}),
                React.createElement("div",{style:{fontSize:12,fontWeight:900,color:T.purple,marginTop:4}},entry.tvA.toLocaleString())
              ),
              React.createElement("div",{style:{fontSize:14,color:T.textDim,marginTop:12,textAlign:"center"}},"⇄"),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:T.textSub,letterSpacing:1,marginBottom:4}},"YOU GOT"),
                entry.sideB.map(function(p){return React.createElement("div",{key:p.name,style:{fontSize:11,fontWeight:600,marginBottom:3,display:"flex",alignItems:"center",gap:4}},
                  React.createElement("span",{style:{color:POS_COLORS[p.pos]||T.textSub,fontSize:9,fontWeight:700,flexShrink:0}},p.pos),p.name
                );}),
                React.createElement("div",{style:{fontSize:12,fontWeight:900,color:T.purpleLight,marginTop:4}},entry.tvB.toLocaleString())
              )
            )
          );
        })
      ),

      // FOOTER
      React.createElement("div",{style:{padding:"32px 20px 16px",borderTop:"1px solid "+T.border,textAlign:"center",marginTop:8}},
        React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:10}},
          LogoSvg,
          React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
        ),
        React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:16}},
          [["f","Facebook"],["@","Instagram"],["T","TikTok"]].map(function(s){return React.createElement("div",{key:s[1],style:{width:32,height:32,borderRadius:"50%",background:T.bgCard,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:T.textSub,fontWeight:700}},s[0]);})
        ),
        React.createElement("div",{style:{fontSize:10,color:T.textDim,lineHeight:1.6}},"Player values powered by Fantasy Draft Pros. Not affiliated with",React.createElement("br",null),"Sleeper, ESPN, or Yahoo. For entertainment only.")
      )
    ),

    // ════ REPORTS TAB ════
    tab==="reports"&&React.createElement("div",{style:{paddingBottom:80}},
      // sub-nav pills
      React.createElement("div",{style:{position:"relative",borderBottom:"1px solid "+T.border}},
        isDesktop&&React.createElement("button",{onClick:function(){reportsTabsRef.current&&reportsTabsRef.current.scrollBy({left:-200,behavior:"smooth"});},style:{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"‹"),
        React.createElement("div",{ref:reportsTabsRef,style:{display:"flex",gap:6,padding:isDesktop?"12px 36px":"12px 16px",overflowX:"auto",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}},
          [["dynasty","\uD83D\uDCC4","Dynasty Reports"],["news","\uD83D\uDCF0","Trending"],["stats","\uD83D\uDCCA","Live Stats"],["export","\uD83D\uDD17","Export & Share"],["upgrade","\u2728","Upgrade"],["faq","\u2753","FAQ"],["help","\uD83D\uDCA1","Help"],["contact","\u2709","Contact"]].map(function(s){
            var active=reportSubTab===s[0];
            var isUpgrade=s[0]==="upgrade";
            return React.createElement("button",{key:s[0],onClick:function(){setReportSubTab(s[0]);},style:{whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,border:"1px solid "+(active?T.purple:(isUpgrade?T.purple:T.border)),background:active?T.purple:(isUpgrade?"linear-gradient(135deg,"+T.purple+",#5b21b6)":"transparent"),color:(active||isUpgrade)?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}},
              React.createElement("span",{style:{fontSize:13}},s[1]),s[2]
            );
          })
        ),
        isDesktop&&React.createElement("button",{onClick:function(){reportsTabsRef.current&&reportsTabsRef.current.scrollBy({left:200,behavior:"smooth"});},style:{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"›")
      ),
      // Dynasty Reports
      reportSubTab==="dynasty"&&React.createElement("div",{style:{padding:"20px 16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:14,marginBottom:8}},
          React.createElement("span",{style:{fontSize:40,color:"#60a5fa",flexShrink:0,lineHeight:1}},"\uD83D\uDCC4"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text,lineHeight:1.2}},"Dynasty Market Reports"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginTop:4}},"2026 Offseason Edition · Updated April 2026")
          )
        ),
        React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6,marginBottom:20}},"Key dynasty value insights heading into the 2026 season"),
        [
          {tag:"QB",tagColor:"#818cf8",title:"Josh Allen & Drake Maye: The QB buy/hold of 2026",body:"Allen is the consensus dynasty QB1 — elite rushing floor, top-end passing ceiling, and still in his prime at 30. The bigger conversation is Drake Maye: the Patriots' franchise QB is 22 years old with generational arm talent and mobility. His dynasty stock is rising fast. Buy Maye now before the price gets out of hand — he's the QB1 of the future."},
          {tag:"RB",tagColor:"#34d399",title:"Bijan Robinson: The dynasty RB1",body:"Bijan is the consensus RB1 in dynasty — age-24, elite receiving ability, and locked into a lead role in Atlanta. With Tua Tagovailoa now running the offense, expect a more pass-friendly scheme that elevates Bijan's receiving upside on top of his already elite rushing floor. Hold at all costs."},
          {tag:"WR",tagColor:"#c084fc",title:"Marvin Harrison Jr. dynasty outlook",body:"MHJ posted 1,100+ yards as a rookie on a bad Cardinals team. With Kyler Murray now in Minnesota, the target share question is real — but his route-running separates him from the WR1 pack regardless of QB."},
          {tag:"TE",tagColor:"#f59e0b",title:"Sam LaPorta: Premium TE locked in",body:"LaPorta established himself as a top-5 dynasty TE in year one. With Goff re-signed and the Lions' offense humming, LaPorta's floor is elite. Buy at current values (5,500–6,000 range)."},
          {tag:"IDP",tagColor:"#f87171",title:"Jalen Carter: Best IDP buy of the offseason",body:"Carter's pass-rush development in Year 3 has dynasty IDP managers excited. His sack upside combined with Philly's defensive scheme makes him a DL1 in most IDP formats. Currently valued ~6,000."},
          {tag:"PICK",tagColor:"#f1c40f",title:"2026 1st round picks: buy before the draft",body:"The 2026 class (Jeremiyah Love, Fernando Mendoza, Carnell Tate) has the makings of a strong dynasty rookie class. Early 1sts are trading near 6,500–7,000. Landing spot will be everything — expect big moves on draft weekend (April 24–26)."}
        ].map(function(r){
          return React.createElement("div",{key:r.title,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:16,marginBottom:10}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
              React.createElement("span",{style:{background:r.tagColor+"22",color:r.tagColor,fontWeight:800,fontSize:11,padding:"3px 10px",borderRadius:20}},r.tag),
              React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text}},r.title)
            ),
            React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6}},r.body)
          );
        }),
        React.createElement("div",{style:{fontSize:11,color:T.textDim,textAlign:"center",paddingTop:8}},"Reports reflect dynasty consensus as of April 2026. Values sourced from KTC-adjusted rankings.")
      ),
      // Player News — Sleeper Trending
      reportSubTab==="news"&&React.createElement("div",{style:{padding:"20px 16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:16}},
          React.createElement("span",{style:{fontSize:40,color:"#60a5fa",flexShrink:0,lineHeight:1}},"📰"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,lineHeight:1.1}},"Trending Players"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"24-hour add/drop activity from Sleeper leagues")
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:8,marginBottom:16}},
          React.createElement("button",{onClick:function(){setSleeperTrending(null);loadSleeperTrending();},style:{flex:1,padding:"11px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"↻ Refresh Trending"),
          sleeperTrending&&React.createElement("div",{style:{display:"flex",alignItems:"center",padding:"0 12px",borderRadius:10,border:"1px solid "+T.border,fontSize:11,color:T.textSub,whiteSpace:"nowrap"}},"Updated "+(new Date(sleeperTrending.ts)).toLocaleTimeString())
        ),
        !sleeperTrending&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"48px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:36,marginBottom:10}},"📊"),
          React.createElement("div",{style:{fontWeight:700,fontSize:15,marginBottom:6}},"Load Trending Players"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Pulls live 24-hour add/drop data from Sleeper"),
          React.createElement("button",{onClick:loadSleeperTrending,style:{padding:"11px 24px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Load Now")
        ),
        sleeperTrending&&React.createElement("div",null,
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:10,display:"flex",alignItems:"center",gap:8}},
            React.createElement("span",{style:{color:T.green,fontSize:18}},"↑"),
            "Trending Adds"
          ),
          sleeperTrending.adds.slice(0,12).map(function(item){
            var p=sleeperIdToPlayer[item.player_id]||null;
            var name=p?p.name:("Player "+item.player_id);
            var pos=p?p.pos:"?";
            var tv=p?p.tradeVal:0;
            return React.createElement("div",{key:item.player_id,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
              p&&React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
              !p&&React.createElement("div",{style:{width:36,height:36,borderRadius:"50%",background:T.bgInput,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.textSub,flexShrink:0}},pos),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},name),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},p?"#"+p.posRank+" "+p.pos+" · "+p.team:"Unknown")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{background:T.green+"20",color:T.green,fontWeight:800,fontSize:11,borderRadius:6,padding:"3px 8px",marginBottom:2}},"+"+item.count.toLocaleString()+" adds"),
                tv>0&&React.createElement("div",{style:{fontSize:10,color:T.textSub}},"Val: "+tv.toLocaleString())
              )
            );
          }),
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:10,marginTop:20,display:"flex",alignItems:"center",gap:8}},
            React.createElement("span",{style:{color:T.red,fontSize:18}},"↓"),
            "Trending Drops"
          ),
          sleeperTrending.drops.slice(0,8).map(function(item){
            var p=sleeperIdToPlayer[item.player_id]||null;
            var name=p?p.name:("Player "+item.player_id);
            var pos=p?p.pos:"?";
            var tv=p?p.tradeVal:0;
            return React.createElement("div",{key:item.player_id,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
              p&&React.createElement(Avatar,{name:p.name,pos:p.pos,size:36}),
              !p&&React.createElement("div",{style:{width:36,height:36,borderRadius:"50%",background:T.bgInput,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.textSub,flexShrink:0}},pos),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},name),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},p?"#"+p.posRank+" "+p.pos+" · "+p.team:"Unknown")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{background:T.red+"20",color:T.red,fontWeight:800,fontSize:11,borderRadius:6,padding:"3px 8px",marginBottom:2}},"+"+item.count.toLocaleString()+" drops"),
                tv>0&&React.createElement("div",{style:{fontSize:10,color:T.textSub}},"Val: "+tv.toLocaleString())
              )
            );
          })
        )
      ),
      // LIVE STATS
      reportSubTab==="stats"&&React.createElement("div",{style:{padding:"20px 16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:16}},
          React.createElement("span",{style:{fontSize:36,color:T.green,lineHeight:1}},"📊"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:24}},"Live Stats"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub}},"Real weekly stats from Sleeper")
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:8,marginBottom:16}},
          React.createElement("button",{onClick:loadSleeperStats,style:{flex:1,padding:"11px",borderRadius:10,border:"none",background:T.green,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},sleeperStatsLoading?"Loading...":"↻ Load This Week's Stats"),
          sleeperStats&&React.createElement("div",{style:{display:"flex",alignItems:"center",padding:"0 12px",borderRadius:10,border:"1px solid "+T.border,fontSize:11,color:T.textSub,whiteSpace:"nowrap"}},"Wk "+sleeperStats.week)
        ),
        !sleeperStats&&!sleeperStatsLoading&&React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"48px 20px",textAlign:"center"}},
          React.createElement("div",{style:{fontSize:36,marginBottom:10}},"📈"),
          React.createElement("div",{style:{fontWeight:700,fontSize:15,marginBottom:6}},"Load Weekly Stats"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Pulls actual scoring stats from Sleeper's free API"),
          React.createElement("button",{onClick:loadSleeperStats,style:{padding:"11px 24px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Load Now")
        ),
        sleeperStats&&sleeperStats.data&&(function(){var allEntries=Object.entries(sleeperStats.data);var hasData=allEntries.some(function(e){var s=e[1]||{};return (s.pts_ppr||s.pts_half_ppr||s.pts_std||0)>0;});if(!hasData)return React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"48px 20px",textAlign:"center"}},React.createElement("div",{style:{fontSize:36,marginBottom:10}},"📭"),React.createElement("div",{style:{fontWeight:700,fontSize:15,marginBottom:6,color:T.text}},"No Stats Available"),React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,maxWidth:280,margin:"0 auto"}},"The NFL is in the offseason. Live stats will be available once the 2026 regular season begins in September."));return null;})(),
        sleeperStats&&sleeperStats.data&&React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:T.textSub,fontWeight:600,marginBottom:10}},"TOP SCORERS — WEEK "+sleeperStats.week),
          (function(){
            var entries=Object.entries(sleeperStats.data);
            var scored=entries.map(function(e){
              var pid=e[0];var stats=e[1]||{};
              var pts=(stats.pts_ppr||stats.pts_half_ppr||stats.pts_std||0);
              var p=sleeperIdToPlayer[pid]||null;
              return {pid:pid,pts:pts,player:p};
            }).filter(function(x){return x.pts>0&&x.player&&["QB","RB","WR","TE"].includes(x.player.pos);});
            scored.sort(function(a,b){return b.pts-a.pts;});
            return scored.slice(0,25).map(function(item,idx){
              var p=item.player;
              return React.createElement("div",{key:item.pid,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
                React.createElement("div",{style:{width:24,fontWeight:900,fontSize:12,color:idx<3?T.gold:T.textDim,flexShrink:0,textAlign:"center"}},"#"+(idx+1)),
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:34}),
                React.createElement(PBadge,{pos:p.pos}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:13}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team+" · "+p.pos)
                ),
                React.createElement("div",{style:{fontWeight:900,fontSize:16,color:idx<3?T.gold:T.purpleLight}},item.pts.toFixed(1)," pts")
              );
            });
          })()
        )
      ),

      // Export & Share
      reportSubTab==="export"&&React.createElement("div",{style:{padding:"20px 16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:20}},
          React.createElement("span",{style:{fontSize:36,color:"#818cf8",flexShrink:0,lineHeight:1}},"\uD83D\uDD17"),
          React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text,lineHeight:1.1}},"Export & Share")
        ),
        React.createElement("div",{style:{fontWeight:800,fontSize:18,color:T.text,marginBottom:10}},"Generate Graphics"),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"28px 20px",textAlign:"center",marginBottom:20}},
          React.createElement("div",{style:{fontSize:32,marginBottom:8}},"🖼️"),
          React.createElement("div",{style:{fontWeight:700,fontSize:15,color:T.text,marginBottom:6}},"Coming Soon"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6,maxWidth:280,margin:"0 auto"}},"Shareable graphics for power rankings, trade breakdowns, and playoff brackets are in development.")
        ),
        React.createElement("button",{onClick:function(){
          var text="🏆 Fantasy Draft Pros — Dynasty Rankings\n\n"+rankedPlayers.filter(function(p){return ["QB","RB","WR","TE"].indexOf(p.pos)>=0;}).slice(0,20).map(function(p,i){return (i+1)+". "+p.name+" ("+p.pos+", "+p.team+") — Value: "+(p.tradeVal||0).toLocaleString();}).join("\n")+"\n\nfantasydraftpros.com";
          navigator.clipboard.writeText(text);
        },style:{width:"100%",padding:"16px",borderRadius:14,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:28}},
          React.createElement("span",{style:{fontSize:18}},"📋"),"Copy Rankings Summary"
        ),
        React.createElement("div",{style:{fontWeight:800,fontSize:18,color:T.text,marginBottom:14}},"Export Data"),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}},"Download Options"),
          React.createElement("button",{onClick:function(){
            var hdr="Name,Position,Team,Age,Rank,Trade Value,ADP\n";
            var rows=rankedPlayers.map(function(p){return ['"'+p.name+'"',p.pos,p.team,p.age,p.rank||"",p.tradeVal||"",p.adp||""].join(",");}).join("\n");
            var blob=new Blob([hdr+rows],{type:"text/csv"});
            var url=URL.createObjectURL(blob);
            var a=document.createElement("a");a.href=url;a.download="fantasy-draft-pros-rankings.csv";a.click();URL.revokeObjectURL(url);
          },style:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
            React.createElement("span",null,"⬇"),"Export to CSV"
          ),
          React.createElement("button",{onClick:function(){window.print();},style:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
            React.createElement("span",null,"🖨"),"Print / Save as PDF"
          ),
          React.createElement("button",{onClick:function(){
            var data=rankedPlayers.map(function(p){return {name:p.name,pos:p.pos,team:p.team,age:p.age,rank:p.rank,tradeVal:p.tradeVal,adp:p.adp};});
            var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
            var url=URL.createObjectURL(blob);
            var a=document.createElement("a");a.href=url;a.download="fantasy-draft-pros-rankings.json";a.click();URL.revokeObjectURL(url);
          },style:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
            React.createElement("span",null,"⬇"),"Export to JSON"
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:700,fontSize:15,color:T.text,marginBottom:12}},"Share to Social Media"),
          (function(){
            var siteUrl=encodeURIComponent("https://fantasydraftpros.com");
            var txt=encodeURIComponent("The best dynasty fantasy football trade analyzer — check out my rankings on Fantasy Draft Pros!");
            return [
              ["𝕏  Share to Twitter/X","https://twitter.com/intent/tweet?url="+siteUrl+"&text="+txt],
              ["f  Share to Facebook","https://www.facebook.com/sharer/sharer.php?u="+siteUrl],
              ["r/  Share to Reddit","https://reddit.com/submit?url="+siteUrl+"&title="+txt],
            ].map(function(btn){
              return React.createElement("button",{key:btn[0],onClick:function(){window.open(btn[1],"_blank","noopener");},style:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:T.bgInput,color:T.text,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}},btn[0]);
            }).concat([React.createElement("button",{key:"copylink",onClick:function(){navigator.clipboard.writeText("https://fantasydraftpros.com");},style:{width:"100%",padding:"14px",borderRadius:10,border:"none",background:T.bgInput,color:T.text,fontWeight:600,fontSize:14,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}},"🔗  Copy Link")]);
          })()
        ),
        React.createElement("div",{style:{background:T.purpleDim,border:"1px solid "+T.borderPurple,borderRadius:14,padding:"16px",marginBottom:8}},
          React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text,marginBottom:8}},"Pro Tip"),
          React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6}},"Use the Copy Rankings Summary button to quickly share your dynasty rankings on Reddit, Twitter/X, or in your league group chat.")
        ),
        React.createElement("div",{style:{padding:"24px 0 8px",borderTop:"1px solid "+T.border,textAlign:"center",marginTop:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},
            LogoSvg,
            React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
          ),
        )
      ),
      // Upgrade to Pro
      reportSubTab==="upgrade"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("button",{onClick:function(){setReportSubTab("dynasty");},style:{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.textSub,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:20,padding:0}},
          React.createElement("span",null,"\u2190"),"Back to Dashboard"
        ),
        React.createElement("div",{style:{textAlign:"center",marginBottom:24}},
          LogoSvg,
          React.createElement("div",{style:{fontWeight:900,fontSize:30,color:T.text,marginTop:16,marginBottom:8}},"Choose Your Plan"),
          React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6}},"Start with our free tier or unlock premium features with Pro")
        ),
        React.createElement("div",{style:{display:"flex",background:T.bgCard,borderRadius:12,padding:4,marginBottom:24}},
          React.createElement("button",{onClick:function(){setBillingPeriod("monthly");},style:{flex:1,padding:"10px",borderRadius:10,border:"none",background:billingPeriod==="monthly"?T.bgInput:"transparent",color:billingPeriod==="monthly"?T.text:T.textSub,fontWeight:700,fontSize:14,cursor:"pointer"}},"Monthly"),
          React.createElement("button",{onClick:function(){setBillingPeriod("yearly");},style:{flex:1,padding:"10px",borderRadius:10,border:"none",background:billingPeriod==="yearly"?"#f97316":"transparent",color:billingPeriod==="yearly"?"#fff":T.textSub,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}},
            React.createElement("span",null,"\u26A1"),"Yearly",
            billingPeriod==="yearly"&&React.createElement("span",{style:{background:"#22c55e",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:8}},"SAVE 40%")
          )
        ),
        // Subscription Management card
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:20}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text,marginBottom:16}},"Subscription Management"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",marginBottom:12}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Current Plan"),
              React.createElement("div",{style:{fontWeight:800,fontSize:18,color:T.text}},(user?.plan||"free").charAt(0).toUpperCase()+(user?.plan||"free").slice(1))
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:4}},"Status"),
              React.createElement("div",{style:{fontWeight:800,fontSize:18,color:isPro?T.green:T.textSub}},isPro?"Active":"Free")
            )
          ),
          React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:16,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",null,"\uD83D\uDCC5"),isPro?(user?.plan||"pro")+" plan — billed "+(billingPeriod==="yearly"?"annually":"monthly"):"Free plan — no billing"
          ),
          React.createElement("div",{style:{borderTop:"1px solid "+T.border,paddingTop:12}},
            React.createElement("span",{onClick:function(){window.open("mailto:fantasydraftproshelp@gmail.com?subject=Cancel%20Subscription&body=Please%20cancel%20my%20Fantasy%20Draft%20Pros%20Pro%20subscription.%0A%0AEmail%3A%20"+(user&&user.email||""));},style:{fontSize:13,color:T.red,cursor:"pointer",fontWeight:600}},"Cancel Subscription")
          )
        ),
        // Free plan card
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"20px",marginBottom:12}},
          React.createElement("div",{style:{fontWeight:800,fontSize:20,color:T.text,marginBottom:4}},"Free"),
          React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text,marginBottom:4}},"$0"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Forever free · No credit card required"),
          ["Basic trade analyzer","20 trade analyses/day","Dynasty rankings (top 20 per position)","IDP support (DL, LB, DB)"].map(function(f){
            return React.createElement("div",{key:f,style:{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:13,color:T.textSub}},
              React.createElement("span",{style:{color:T.textDim,fontSize:14}},"\u2713"),f
            );
          }),
          !isPro?React.createElement("button",{onClick:function(){handleCheckout("pro",billingPeriod);},style:{width:"100%",marginTop:12,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c4dff,#5b21b6)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}},"Start 7-Day Free Trial"):React.createElement("button",{disabled:true,style:{width:"100%",marginTop:12,padding:"12px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.textDim,fontWeight:700,fontSize:13,cursor:"default",opacity:0.6}},"✓ Current Plan")
        ),
        // Pro plan card
        React.createElement("div",{style:{background:"#fff8f0",border:"2px solid #f97316",borderRadius:14,padding:"20px",marginBottom:24,position:"relative",overflow:"hidden"}},
          React.createElement("div",{style:{position:"absolute",top:0,right:0,background:"#f97316",color:"#fff",fontWeight:800,fontSize:11,padding:"6px 14px",borderRadius:"0 14px 0 14px"}},"POPULAR"),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
            React.createElement("div",{style:{fontWeight:800,fontSize:20,color:"#1a1a2e"}},"Pro"),
            React.createElement("span",{style:{background:"#f97316",color:"#fff",fontWeight:800,fontSize:11,padding:"4px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:4}},"\u2728 PRO")
          ),
          React.createElement("div",{style:{fontWeight:900,fontSize:32,color:"#1a1a2e",marginBottom:2}},"$2.99",React.createElement("span",{style:{fontSize:14,fontWeight:400,color:"#666"}},"/month")),
          React.createElement("div",{style:{marginBottom:8}},
            React.createElement("span",{style:{fontSize:13,color:"#999",textDecoration:"line-through",marginRight:8}},"$59.88/year"),
            React.createElement("span",{style:{fontSize:13,color:"#22c55e",fontWeight:700}},"$35.88/year")
          ),
          React.createElement("div",{style:{display:"inline-block",background:"#ccfbf1",color:"#065f46",fontWeight:700,fontSize:12,padding:"4px 12px",borderRadius:20,marginBottom:16}},"7-Day Free Trial"),
          ["Unlimited trade analyses","Full dynasty rankings (600+ players)","League import (Sleeper, ESPN, Yahoo)","AI trade analysis & suggestions","Dynasty market reports","Team strategy advice","Buy-low / sell-high alerts","Unlimited watchlist","Pick value calculator","Start/Sit tool","Priority support"].map(function(f){
            return React.createElement("div",{key:f,style:{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:14,color:"#1a1a2e"}},
              React.createElement("span",{style:{color:"#22c55e",fontWeight:700,fontSize:16}},"\u2713"),f
            );
          }),
          isPro?React.createElement("button",{disabled:true,style:{width:"100%",marginTop:16,padding:"14px",borderRadius:12,border:"none",background:"#f9731699",color:"#fff",fontWeight:800,fontSize:15,cursor:"default"}},"✓ Current Plan"):React.createElement("button",{onClick:function(){handleCheckout("pro",billingPeriod);},style:{width:"100%",marginTop:16,padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}},"Start 7-Day Free Trial →")
        ),
        // FAQ
        React.createElement("div",{style:{background:"#eef2ff",borderRadius:14,padding:"20px",marginBottom:24}},
          React.createElement("div",{style:{fontWeight:900,fontSize:18,color:"#3730a3",marginBottom:16,textAlign:"center"}},"Frequently Asked Questions"),
          [["Can I cancel anytime?","Yes! You can cancel your Pro subscription at any time. You'll keep access until the end of your billing period."],["What happens after the free trial?","After 7 days, you'll be charged $2.99/month. You can cancel before the trial ends to avoid being charged."],["What if I downgrade from Pro to Free?","You'll keep all your data, but some features will become locked. Your watchlist, league data, and trade history are preserved."],["Do you offer refunds?","We offer a 30-day money-back guarantee if you're not satisfied with Pro. Just email support."]].map(function(q){
            return React.createElement("div",{key:q[0],style:{marginBottom:14}},
              React.createElement("div",{style:{fontWeight:800,fontSize:14,color:"#1e1b4b",marginBottom:4}},q[0]),
              React.createElement("div",{style:{fontSize:14,color:"#4338ca",lineHeight:1.6}},q[1])
            );
          })
        ),
        React.createElement("div",{style:{padding:"16px 0",borderTop:"1px solid "+T.border,textAlign:"center"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},
            LogoSvg,
            React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
          )
        )
      ),
      // Contact
      reportSubTab==="contact"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:"28px 20px",textAlign:"center",marginBottom:20}},
          React.createElement("div",{style:{width:64,height:64,borderRadius:16,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}},"✉"),
          React.createElement("div",{style:{fontWeight:900,fontSize:26,color:T.text,marginBottom:8}},"Get in Touch"),
          React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6,marginBottom:24}},"We're here to help with any questions or feedback"),
          React.createElement("div",{style:{textAlign:"left",marginBottom:12}},
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4,fontWeight:600}},"Your Name"),
            React.createElement("input",{value:contactName,onChange:function(e){setContactName(e.target.value);},placeholder:"John Doe",style:Object.assign({},inpS)})
          ),
          React.createElement("div",{style:{textAlign:"left",marginBottom:12}},
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4,fontWeight:600}},"Your Email"),
            React.createElement("input",{value:contactEmail,onChange:function(e){setContactEmail(e.target.value);},placeholder:"you@example.com",type:"email",style:Object.assign({},inpS)})
          ),
          React.createElement("div",{style:{textAlign:"left",marginBottom:12}},
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4,fontWeight:600}},"Subject"),
            React.createElement("input",{value:contactSubject,onChange:function(e){setContactSubject(e.target.value);},placeholder:"How can we help?",style:Object.assign({},inpS)})
          ),
          React.createElement("div",{style:{textAlign:"left",marginBottom:16}},
            React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4,fontWeight:600}},"Message"),
            React.createElement("textarea",{value:contactMsg,onChange:function(e){setContactMsg(e.target.value);},placeholder:"Tell us what you need help with...",rows:4,style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"12px 14px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",resize:"none",fontFamily:"inherit",lineHeight:1.6}})
          ),
          contactSent?React.createElement("div",{style:{padding:"14px",background:T.green+"15",border:"1px solid "+T.green+"44",borderRadius:10,color:T.green,fontWeight:700,fontSize:14}},"✓ Message sent! We'll respond within 24-48 hours."):
          React.createElement("button",{onClick:async function(){
            if(!contactName.trim()||!contactEmail.includes("@")||!contactMsg.trim()){setImpErr("Please fill in your name, a valid email, and a message.");return;}
            trackEvent("contact_form",{name:contactName,email:contactEmail,subject:contactSubject,msg:contactMsg.slice(0,200)});
            try{await callEdgeFn("send-email",{type:"contact",to:contactEmail,name:contactName,subject:contactSubject,message:contactMsg});}catch(e){}
            setContactSent(true);
            setContactName("");setContactEmail("");setContactSubject("");setContactMsg("");
            setTimeout(function(){setContactSent(false);},5000);
          },style:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
            React.createElement("span",null,"➤"),"Send Message"
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:12,display:"flex",alignItems:"flex-start",gap:12}},
          React.createElement("div",{style:{width:40,height:40,borderRadius:10,background:T.purpleDim,border:"1px solid "+T.borderPurple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}},"💬"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text,marginBottom:4}},"Email Support"),
            React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:8}},"Prefer to email directly? Reach out to us at:"),
            React.createElement("div",{style:{fontSize:13,color:T.purple,fontWeight:600,display:"flex",alignItems:"center",gap:6}},"✉ fantasydraftproshelp@gmail.com")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:12}},
          React.createElement("div",{style:{width:40,height:40,borderRadius:10,background:T.purpleDim,border:"1px solid "+T.borderPurple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}},"❓"),
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text,marginBottom:8}},"Common Topics"),
            ["Trade analysis and recommendations","Platform integration issues","Feature requests and suggestions","Account and authentication help","Bug reports and technical issues"].map(function(t){
              return React.createElement("div",{key:t,style:{fontSize:13,color:T.textSub,marginBottom:6,display:"flex",gap:6}},
                React.createElement("span",null,"•"),t
              );
            })
          )
        ),
        React.createElement("div",{style:{textAlign:"center",padding:"12px 0",borderTop:"1px solid "+T.border,marginBottom:16}},
          React.createElement("div",{style:{fontSize:13,color:T.textSub}},"We typically respond within 24-48 hours during business days")
        ),
        React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8}},
          LogoSvg,
          React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
        )
      ),
      // FAQ
      reportSubTab==="faq"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{textAlign:"center",marginBottom:20}},
          React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,marginBottom:6}},"Frequently Asked Questions"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub}},"Everything you need to know about Fantasy Draft Pros")
        ),
        FAQS.map(function(f,i){
          var open=faqOpen===i;
          return React.createElement("div",{key:i,style:{background:T.bgCard,border:"1px solid "+(open?T.borderPurple:T.border),borderRadius:12,marginBottom:8,overflow:"hidden"}},
            React.createElement("button",{onClick:function(){setFaqOpen(open?null:i);},style:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",gap:12}},
              React.createElement("span",{style:{fontWeight:600,fontSize:13,color:open?T.purple:T.text,lineHeight:1.4}},f.q),
              React.createElement("span",{style:{color:T.textDim,fontSize:14,flexShrink:0}},open?"▲":"▼")
            ),
            open&&React.createElement("div",{style:{padding:"0 16px 14px",fontSize:13,color:T.textSub,lineHeight:1.6}},f.a)
          );
        }),
        React.createElement("div",{style:{textAlign:"center",marginTop:20,padding:"16px",background:T.bgCard,border:"1px solid "+T.border,borderRadius:12}},
          React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:8}},"Still have questions?"),
          React.createElement("button",{onClick:function(){setReportSubTab("contact");},style:{padding:"10px 24px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Contact Us")
        )
      ),
      // Help
      reportSubTab==="help"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{textAlign:"center",marginBottom:20}},
          React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,marginBottom:6}},"Help Center"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub}},"Guides for getting the most out of Fantasy Draft Pros")
        ),
        [
          {icon:"⚖️",title:"Using the Trade Analyzer",steps:["Go to the Trade tab","Select your league type (Dynasty/Redraft) and scoring format","Search for and add players to Team A and Team B","Optionally add FAAB dollars or draft picks","Hit Analyze Trade to see the verdict and value breakdown"]},
          {icon:"🏈",title:"Importing Your League",steps:["Go to the League tab (Pro required)","Choose your platform: Sleeper, ESPN, or Yahoo","For Sleeper: enter your username and select your league","For ESPN: enter your League ID, year, and session cookies","Your rosters and team data will sync automatically"]},
          {icon:"📊",title:"Reading Player Values",steps:["Values are based on KTC dynasty rankings adjusted for age and scoring format","Toggle SF to boost QB values for Superflex leagues","Toggle TEP to boost TE values for TE Premium leagues","Use the Rankings tab to see full position-by-position values","Tier 1 = elite, Tier 5 = borderline starter"]},
          {icon:"🔄",title:"Sharing a Trade",steps:["Build your trade in the Trade Analyzer","Click Analyze Trade then Share Trade","Copy the link to send anyone — it auto-loads the trade","Or share directly to X/Twitter or WhatsApp"]},
          {icon:"⭐",title:"Pro Features",steps:["Upgrade to Pro for unlimited trades and full rankings","Pro unlocks league import, power rankings, waiver wire, and lineup optimizer","Go to Reports → Upgrade to see all Pro features and pricing"]}
        ].map(function(section){
          return React.createElement("div",{key:section.title,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:12}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
              React.createElement("span",{style:{fontSize:22}},section.icon),
              React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text}},section.title)
            ),
            section.steps.map(function(step,i){
              return React.createElement("div",{key:i,style:{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}},
                React.createElement("span",{style:{background:T.purple,color:"#fff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,marginTop:1}},i+1),
                React.createElement("span",{style:{fontSize:13,color:T.textSub,lineHeight:1.5}},step)
              );
            })
          );
        }),
        React.createElement("div",{style:{textAlign:"center",marginTop:8,padding:"16px",background:T.bgCard,border:"1px solid "+T.border,borderRadius:12}},
          React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:8}},"Need more help?"),
          React.createElement("button",{onClick:function(){setReportSubTab("contact");},style:{padding:"10px 24px",borderRadius:10,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Contact Support")
        )
      ),
    ),

    // ════ ADMIN TAB ════
    tab==="admin"&&(!user||!user.isAdmin)&&React.createElement("div",{style:{padding:"60px 24px",textAlign:"center",paddingBottom:100}},
      React.createElement("div",{style:{width:72,height:72,borderRadius:20,background:T.purpleDim,border:"1px solid "+T.borderPurple,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}},"🔒"),
      React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,marginBottom:10}},"Restricted Access"),
      React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6,marginBottom:28,maxWidth:280,margin:"0 auto 28px"}},"This area is restricted to authorized administrators only."),
      React.createElement("button",{onClick:function(){setTab("trade");},style:{padding:"14px 32px",borderRadius:14,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}},"Back to Trade")
    ),
    tab==="admin"&&user&&user.isAdmin&&React.createElement("div",{style:{paddingBottom:80}},
      // sub-nav
      React.createElement("div",{style:{position:"relative",borderBottom:"1px solid "+T.border}},
        isDesktop&&React.createElement("button",{onClick:function(){adminTabsRef.current&&adminTabsRef.current.scrollBy({left:-200,behavior:"smooth"});},style:{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"‹"),
        React.createElement("div",{ref:adminTabsRef,style:{display:"flex",gap:6,padding:isDesktop?"12px 36px":"12px 16px",overflowX:"auto",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}},
          [["analytics","📊","Analytics"],["system","\u21BA","System"],["valuetuner","\u2AE5","Value Tuner"],["rbcontext","\u270E","RB Context"],["rbai","\u2728","RB AI"],["headshots","\uD83D\uDC64","Headshots"],["idpupload","\u2B06","IDP Upload"]].map(function(s){
            var active=adminSubTab===s[0];
            return React.createElement("button",{key:s[0],onClick:function(){setAdminSubTab(s[0]);},style:{whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:10,border:"1px solid "+(active?T.purple:T.border),background:active?T.purple:"transparent",color:active?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}},
              React.createElement("span",null,s[1]),s[2]
            );
          })
        ),
        isDesktop&&React.createElement("button",{onClick:function(){adminTabsRef.current&&adminTabsRef.current.scrollBy({left:200,behavior:"smooth"});},style:{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",zIndex:2,background:T.bgCard,border:"1px solid "+T.border,borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.text,fontSize:14,padding:0}},"›")
      ),
      // SYSTEM sub-tab
      adminSubTab==="system"&&React.createElement("div",{style:{padding:"16px"}},
        // Sync Hub header
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}},
          React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text}},"Sync Hub"),
          React.createElement("button",{onClick:function(){loadLiveProj();},style:{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:10,border:"1px solid "+T.border,background:T.bgInput,color:T.text,fontWeight:700,fontSize:13,cursor:"pointer"}},liveProjLoading?"\u23F3 Loading...":"\u21BA Refresh Status")
        ),
        // Registry cards — real data
        (function(){
          var qbC=PLAYERS.filter(function(p){return p.pos==="QB";}).length;
          var rbC=PLAYERS.filter(function(p){return p.pos==="RB";}).length;
          var wrC=PLAYERS.filter(function(p){return p.pos==="WR";}).length;
          var teC=PLAYERS.filter(function(p){return p.pos==="TE";}).length;
          var idpC=PLAYERS.filter(function(p){return p.pos==="DL"||p.pos==="LB"||p.pos==="DB";}).length;
          var total=PLAYERS.length;
          var syncLabel=liveProj?"Week "+liveProj.week+" loaded":"Never synced";
          var syncColor=liveProj?"#22c55e":"#ef4444";
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12}},
                React.createElement("span",{style:{fontSize:20,color:"#3b82f6"}},"\uD83D\uDDC4"),
                React.createElement("span",{style:{fontWeight:800,fontSize:16,color:T.text}},"Player Registry")
              ),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:4}},"Total Players"),
              React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text,marginBottom:8}},total),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:2}},"IDP Players"),
              React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"#22c55e"}},idpC+" ranked")
            ),
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12}},
                React.createElement("span",{style:{fontSize:20,color:"#22c55e"}},"\u2197"),
                React.createElement("span",{style:{fontWeight:800,fontSize:16,color:T.text}},"Live Projections")
              ),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:4}},"Sleeper Sync"),
              React.createElement("div",{style:{fontWeight:900,fontSize:28,color:T.text,marginBottom:8}},liveProj?liveProj.season+" W"+liveProj.week:"—"),
              React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:2}},"Status"),
              React.createElement("div",{style:{fontSize:14,fontWeight:700,color:syncColor}},syncLabel)
            ),
            // Position Coverage
            React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
              React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text,marginBottom:14}},"Position Coverage"),
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
                [["QB",qbC],["RB",rbC],["WR",wrC],["TE",teC],["DL/LB/DB",idpC]].map(function(p){
                  return React.createElement("div",{key:p[0],style:{background:T.bgInput,borderRadius:10,padding:"14px",textAlign:"center"}},
                    React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:4}},p[0]),
                    React.createElement("div",{style:{fontWeight:900,fontSize:26,color:T.text}},p[1])
                  );
                })
              )
            )
          );
        })(),
        // Sync Actions
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text,marginBottom:4}},"Sync Actions"),
          adminSyncStatus.lastSync&&React.createElement("div",{style:{fontSize:11,color:T.green,marginBottom:12}},"✓ "+adminSyncStatus.type+" synced · "+new Date(adminSyncStatus.lastSync).toLocaleTimeString()),
          [["Sync Players","Update rosters, teams, and status","\uD83D\uDDC4","#3b82f6"],["Sync Values","Pull live Sleeper weekly projections","\u2197","#22c55e"],["Rebuild Player Values","Recalculate all trade values now","\u26E8","#7c3aed"],["Full Pipeline","Sync values + rebuild all","\u26A1","#7c3aed"]].map(function(a){
            var sel=adminSyncSel===a[0];
            var isSyncing=adminSyncStatus.syncing&&adminSyncStatus.type===a[0];
            return React.createElement("div",{key:a[0],onClick:function(){
              setAdminSyncSel(a[0]);
              if(a[0]==="Sync Values"||a[0]==="Full Pipeline"){
                setAdminSyncStatus({syncing:true,lastSync:null,type:a[0]});
                loadLiveProj();
                setTimeout(function(){setAdminSyncStatus({syncing:false,lastSync:Date.now(),type:a[0]});},2500);
              } else if(a[0]==="Sync Players"||a[0]==="Rebuild Player Values"){
                setAdminSyncStatus({syncing:true,lastSync:null,type:a[0]});
                setTimeout(function(){setAdminSyncStatus({syncing:false,lastSync:Date.now(),type:a[0]});},1200);
              }
            },style:{border:"1px solid "+(sel?T.borderPurple:T.border),borderRadius:12,padding:"18px",marginBottom:10,textAlign:"center",cursor:"pointer",background:sel?T.purpleDim:T.bgInput}},
              React.createElement("div",{style:{fontSize:28,color:a[3],marginBottom:8}},isSyncing?"\u23F3":a[2]),
              React.createElement("div",{style:{fontWeight:800,fontSize:15,color:T.text,marginBottom:4}},a[0]),
              React.createElement("div",{style:{fontSize:12,color:T.textSub}},a[1])
            );
          })
        ),
        // System Health
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",marginBottom:16}},
            React.createElement("span",{style:{fontSize:20,color:T.purple,marginRight:10}},"\u26A1"),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text}},"System Health"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub}},"Last checked: "+new Date(healthCheckedAt).toLocaleTimeString())
            ),
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("div",{style:{width:32,height:32,borderRadius:"50%",border:"2px solid "+T.green,display:"flex",alignItems:"center",justifyContent:"center",color:T.green,fontWeight:900}},"\u2713"),
              React.createElement("button",{onClick:function(){setHealthCheckedAt(Date.now());},style:{width:32,height:32,borderRadius:8,background:T.bgInput,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",color:T.textSub,fontSize:16,cursor:"pointer"}},"\u21BA")
            )
          ),
          (function(){
            var totalPlayers=UNQ.filter(function(p){return p.pos!=="PICK";}).length;
            var qbCount=UNQ.filter(function(p){return p.pos==="QB";}).length;
            var rbCount=UNQ.filter(function(p){return p.pos==="RB";}).length;
            var wrCount=UNQ.filter(function(p){return p.pos==="WR";}).length;
            var teCount=UNQ.filter(function(p){return p.pos==="TE";}).length;
            var idpCount=UNQ.filter(function(p){return p.pos==="DL"||p.pos==="LB"||p.pos==="DB";}).length;
            var rankedCount=rankedPlayers.filter(function(p){return p.pos!=="PICK";}).length;
            var hsCount=UNQ.filter(function(p){return !!headshot(p.name);}).length;
            var hsPct=Math.round(hsCount/Math.max(totalPlayers,1)*100);
            var checks=[
              ["Player Database","\uD83D\uDDC4",totalPlayers+" players loaded (QB:"+qbCount+" RB:"+rbCount+" WR:"+wrCount+" TE:"+teCount+" IDP:"+idpCount+")",totalPlayers>100],
              ["Values Engine","\u2197",rankedCount>0?rankedCount+" players ranked & valued":"Values not computed",rankedCount>0],
              ["Headshot Coverage","\uD83D\uDDBC",hsPct+"% coverage ("+hsCount+"/"+totalPlayers+")",hsPct>=50],
              ["Unresolved Entities","\u2705","0 data conflicts",true]
            ];
            return checks.map(function(h){
              return React.createElement("div",{key:h[0],style:{background:T.bgInput,borderRadius:10,padding:"14px",marginBottom:8}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:6}},
                  React.createElement("span",{style:{fontSize:16,color:h[3]?T.green:T.textDim}},h[1]),
                  React.createElement("span",{style:{fontWeight:700,fontSize:14,color:T.text}},h[0])
                ),
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("span",{style:{fontSize:16,color:h[3]?T.green:T.red}},h[3]?"\u2713":"\u2297"),
                  React.createElement("span",{style:{fontSize:13,color:T.textSub}},h[2])
                )
              );
            });
          })()
        ),
        // Season Context
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14}},
            React.createElement("span",{style:{fontSize:20,color:T.purple}},"\uD83D\uDCC5"),
            React.createElement("span",{style:{fontWeight:800,fontSize:18,color:T.text}},"Season Context")
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}},
            [["League Year","2026","#fff"],["Last Completed","2025","#fff"],["Phase","Postseason",T.purple],["Value Epoch","POST_2025","#22c55e"]].map(function(s){
              return React.createElement("div",{key:s[0],style:{background:T.bgInput,borderRadius:10,padding:"14px"}},
                React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:4}},s[0]),
                React.createElement("div",{style:{fontWeight:900,fontSize:18,color:s[2]}},s[1])
              );
            })
          ),
          React.createElement("div",{style:{background:"#1e3a5f",border:"1px solid #3b82f644",borderRadius:10,padding:"12px",display:"flex",gap:8}},
            React.createElement("span",{style:{color:"#60a5fa",fontSize:16,flexShrink:0}},"\u24D8"),
            React.createElement("div",{style:{fontSize:12,color:"#93c5fd",lineHeight:1.6}},
              React.createElement("b",null,"Invalidation Cutoff:")," All values before 2025-02-01 are considered stale and have been archived. Only production-based values from the 2025 season are active."
            )
          )
        ),
        // Value Rebuild
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:16}},
            React.createElement("span",{style:{fontSize:20,color:T.purple}},"\uD83D\uDDC4"),
            React.createElement("span",{style:{fontWeight:800,fontSize:18,color:T.text}},"Value Rebuild")
          ),
          React.createElement("div",{style:{textAlign:"center",padding:"24px 0",color:T.textSub,fontSize:14}},"No rebuild has been run yet")
        ),
        // Trigger Rebuild
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"18px",marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12}},
            React.createElement("span",{style:{fontSize:20,color:T.purple}},"\u25B6"),
            React.createElement("span",{style:{fontWeight:800,fontSize:18,color:T.text}},"Trigger Rebuild")
          ),
          React.createElement("div",{style:{background:"#2d1a00",border:"1px solid #f59e0b",borderRadius:10,padding:"14px",marginBottom:14}},
            React.createElement("div",{style:{display:"flex",gap:8}},
              React.createElement("span",{style:{color:"#f59e0b",fontSize:18,flexShrink:0}},"\u26A0"),
              React.createElement("div",{style:{fontSize:13,color:"#f59e0b",lineHeight:1.6}},
                React.createElement("b",null,"Warning: "),"This will recalculate ALL player values using production-based scoring. Preseason ADP-based values will be replaced with 2025 season performance data. This process takes 2-5 minutes and cannot be undone."
              )
            )
          ),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"},onClick:function(){setRebuildConfirmed(function(v){return !v;})}},
            React.createElement("input",{type:"checkbox",checked:rebuildConfirmed,readOnly:true,style:{width:18,height:18,flexShrink:0,marginTop:2,accentColor:T.purple}}),
            React.createElement("div",{style:{fontSize:13,color:T.textSub,lineHeight:1.6}},"I understand this will replace all current player values with production-based calculations using 2025 season data. Players like Jaxon Smith-Njigba will be properly ranked based on their breakout performance.")
          ),
          React.createElement("button",{disabled:!rebuildConfirmed,onClick:function(){if(!rebuildConfirmed)return;setRebuildDone(false);setAdminTvMult(function(m){return m;});setTimeout(function(){setRebuildDone(true);setRebuildConfirmed(false);},1200);},style:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:rebuildDone?"#22c55e":rebuildConfirmed?T.purple:"#374151",color:rebuildConfirmed||rebuildDone?"#fff":"#6b7280",fontWeight:800,fontSize:15,cursor:rebuildConfirmed?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}},
            React.createElement("span",null,rebuildDone?"\u2713":"\u2197"),rebuildDone?"Rebuild Complete!":"Rebuild All Player Values"
          )
        ),
        // Admin footer
        React.createElement("div",{style:{padding:"32px 0 16px",borderTop:"1px solid "+T.border,textAlign:"center",marginTop:8}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:10}},
            LogoSvg,
            React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:16}},
            [["f","Facebook"],["@","Instagram"],["T","TikTok"]].map(function(s){return React.createElement("div",{key:s[1],style:{width:32,height:32,borderRadius:"50%",background:T.bgCard,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:T.textSub,fontWeight:700}},s[0]);})
          ),
          React.createElement("div",{style:{fontSize:10,color:T.textDim,lineHeight:1.6}},"Player values powered by Fantasy Draft Pros. Not affiliated with",React.createElement("br",null),"Sleeper, ESPN, or Yahoo. For entertainment only.")
        )
      ),
      // VALUE TUNER sub-tab
      adminSubTab==="valuetuner"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
            React.createElement("div",{style:{width:36,height:36,borderRadius:10,background:"#f97316",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",flexShrink:0}},"\u2AE5"),
            React.createElement("div",{style:{fontWeight:900,fontSize:18,color:T.text}},"Value Fine-Tuner")
          ),
          React.createElement("button",{onClick:function(){setAdminSubTab("system");},style:{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:10,border:"1px solid "+T.border,background:"transparent",color:T.text,fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}},"\u21BA Go to Rebuild")
        ),
        React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.6,marginBottom:14}},"Calibrate player values across four layers. Changes are saved to the database. Trigger a rebuild from ",React.createElement("b",{style:{color:T.text}},"Admin Sync")," to propagate updates."),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px",marginBottom:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",fontSize:11}},
            React.createElement("span",{style:{color:T.textSub}},"\u24D8 Calculation order:"),
            React.createElement("span",{style:{color:T.textSub}},"FDP Base"),
            React.createElement("span",{style:{color:T.textDim}},"→"),
            React.createElement("span",{style:{background:"#7c2d12",color:"#fb923c",padding:"2px 7px",borderRadius:5,fontWeight:700}},"Format ×"),
            React.createElement("span",{style:{color:T.textDim}},"→"),
            React.createElement("span",{style:{background:"#1e3a5f",color:"#60a5fa",padding:"2px 7px",borderRadius:5,fontWeight:700}},"Tier %"),
            React.createElement("span",{style:{color:T.textDim}},"→"),
            React.createElement("span",{style:{background:"#14532d",color:"#4ade80",padding:"2px 7px",borderRadius:5,fontWeight:700}},"Situation pts"),
            React.createElement("span",{style:{color:T.textDim}},"→"),
            React.createElement("span",{style:{background:"#713f12",color:"#fbbf24",padding:"2px 7px",borderRadius:5,fontWeight:700}},"Bulk %+pts"),
            React.createElement("span",{style:{color:T.textDim}},"→"),
            React.createElement("span",{style:{color:T.textSub}},"FDP Value")
          )
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"6px",marginBottom:12,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}},
          [["format","\u2AE5"],["tiers","\u2261"],["situation","\u25C7"],["bulk","\uD83D\uDC65"]].map(function(l){
            var active=valueTunerLayer===l[0];
            return React.createElement("button",{key:l[0],onClick:function(){setValueTunerLayer(l[0]);},style:{padding:"10px",borderRadius:8,border:"none",background:active?"#fff":"transparent",color:active?"#1a1a2e":T.textSub,fontSize:18,cursor:"pointer"}},l[1]);
          })
        ),
        React.createElement("div",{style:{fontSize:13,color:T.textSub,marginBottom:12,padding:"10px 14px",background:T.bgCard,border:"1px solid "+T.border,borderRadius:10}},
          React.createElement("b",{style:{color:T.text}},"Universal Trade Value Multiplier")," — One number controls all player trade values across every scoring format. Default is 80."
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:16}},
          React.createElement("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:16}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:800,fontSize:16,color:T.text}},"Trade Value Multiplier"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:4,lineHeight:1.5}},"Applied to VBD for every format. Higher = larger numbers across the board.")
            ),
            React.createElement("div",{style:{display:"flex",gap:6,flexShrink:0}},
              React.createElement("button",{onClick:function(){setAdminTvDraft(null);setAdminTvMult(80);try{localStorage.setItem('fdp_tvm_v2',"80");}catch(e){}},style:{display:"flex",alignItems:"center",gap:4,padding:"7px 10px",borderRadius:8,border:"1px solid "+T.border,background:"transparent",color:T.textSub,fontWeight:700,fontSize:11,cursor:"pointer"}},"\u21BA Reset to 80"),
              React.createElement("button",{onClick:function(){if(adminTvDraft!==null){setAdminTvMult(adminTvDraft);try{localStorage.setItem('fdp_tvm_v2',String(adminTvDraft));}catch(e){}setAdminTvDraft(null);}},style:{display:"flex",alignItems:"center",gap:4,padding:"7px 10px",borderRadius:8,border:"none",background:adminTvDraft!==null?"#f97316":"#374151",color:adminTvDraft!==null?"#fff":"#6b7280",fontWeight:700,fontSize:11,cursor:adminTvDraft!==null?"pointer":"not-allowed"}},"\uD83D\uDCBE Save Changes")
            )
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"center",background:T.bgInput,borderRadius:10,padding:"16px",marginBottom:12}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:20,color:T.purple}},adminTvMult),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:4}},"All formats · Dynasty · SF · PPR · Half · Standard")
            ),
            React.createElement("input",{type:"number",step:"10",value:adminTvDraft!==null?adminTvDraft:adminTvMult,onChange:function(e){var v=parseInt(e.target.value)||0;setAdminTvDraft(v);},style:{background:T.bg,color:T.text,border:"1px solid "+(adminTvDraft!==null?"#f97316":T.border),borderRadius:8,padding:"12px 8px",fontSize:18,fontWeight:800,textAlign:"center",outline:"none",width:"100%",boxSizing:"border-box"}})
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}},
            [["Top Player","~"+(Math.round((100*(adminTvDraft!==null?adminTvDraft:adminTvMult))/100)*100).toLocaleString(),"#22c55e"],["2026 1.01","7,500","#f59e0b"],["3rd Rd Pick","100-400","#9ca3af"]].map(function(ex){
              return React.createElement("div",{key:ex[0],style:{background:T.bgInput,borderRadius:8,padding:"10px",textAlign:"center"}},
                React.createElement("div",{style:{fontSize:10,color:T.textSub,marginBottom:4}},ex[0]),
                React.createElement("div",{style:{fontWeight:800,fontSize:14,color:ex[2]}},ex[1])
              );
            })
          ),
          adminTvDraft!==null&&React.createElement("div",{style:{background:"#f97316"+"18",border:"1px solid #f97316",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#f97316",fontWeight:600}},"Unsaved — hit Save Changes to apply"),
          React.createElement("div",{style:{background:T.bgInput,border:"1px solid "+T.border,borderRadius:8,padding:"10px 12px",display:"flex",gap:8}},
            React.createElement("span",{style:{color:T.textSub,flexShrink:0}},"\u24D8"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.6}},"Recommended: 80 puts top players at ~8,000-10,000, matching the pick scale (1.01=7,500, 3rd round=100-400). Increase if you want larger numbers.")
          )
        ),
        React.createElement("div",{style:{padding:"24px 0 8px",borderTop:"1px solid "+T.border,textAlign:"center"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},
            LogoSvg,
            React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24}},
            ["Contact","FAQ","Help"].map(function(l){return React.createElement("span",{key:l,style:{fontSize:12,color:T.textSub,cursor:"pointer"}},l);})
          )
        )
      ),
      // RB CONTEXT sub-tab
      adminSubTab==="rbcontext"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}},
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,lineHeight:1.15,marginBottom:6}},"RB Context Editor"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.5}},"Configure RB-specific factors for enhanced FDP value calculations")
          ),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6,flexShrink:0}},
            React.createElement("button",{style:{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"\u21BA Recalculate FDP Values"),
            React.createElement("button",{style:{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",borderRadius:10,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"\u21BA Refresh")
          )
        ),
        React.createElement("div",{style:{background:T.green+"18",border:"1px solid "+T.green,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8}},
          React.createElement("span",{style:{color:T.green,fontSize:18}},"\u2713"),
          React.createElement("span",{style:{color:T.green,fontWeight:600,fontSize:14}},PLAYERS.filter(function(p){return p.pos==="RB";}).length+" RBs loaded from player database")
        ),
        React.createElement("div",{style:{background:T.bgCard,borderRadius:10,padding:"10px 12px",marginBottom:16,display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.5fr 1.5fr",gap:4}},
          ["PLAYER","SOURCE","AGE","DEPTH ROLE","WORKLOAD"].map(function(h){
            return React.createElement("span",{key:h,style:{fontSize:10,fontWeight:800,color:T.textSub,letterSpacing:0.5}},h);
          })
        ),
        React.createElement("div",{style:{background:"#eef2ff",borderRadius:14,padding:"18px"}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,color:"#3730a3",marginBottom:14}},"Adjustment Guide"),
          React.createElement("div",{style:{fontWeight:700,fontSize:13,color:"#1e1b4b",marginBottom:8}},"Context Data Sources:"),
          [["Manual","Data you've entered directly (always used)"],["Auto (XX%)","AI-generated suggestions based on depth charts and value trends (used if confidence ≥75%)"],["Default","No context data, only format multiplier applied"]].map(function(s){
            return React.createElement("div",{key:s[0],style:{display:"flex",gap:6,marginBottom:6,fontSize:13,color:"#4338ca"}},
              React.createElement("span",null,"•"),
              React.createElement("span",null,React.createElement("b",null,s[0]+":"),"\u00A0"+s[1])
            );
          }),
          React.createElement("div",{style:{borderTop:"1px solid #c7d2fe",margin:"14px 0"}}),
          [["Age Adjustments:",["\u226422: +250 (elite youth)","23-24: +150 (prime youth)","25: 0 (prime window)","26: -300 (decline begins)","27: -650 (significant concern)","\u226528: -1100 (high risk)"]],["Role Adjustments:",["Feature: +500","Lead Committee: +200","Committee: -250","Handcuff: -450","Backup: -700"]],["Workload Adjustments:",["Elite (250+ touches): +350","Solid (175-250): +150","Light (<150): -250"]],["Other Adjustments:",["Injury Risk Medium: -150","Injury Risk High: -450","Contract High: +200","Contract Low: -250"]]].map(function(section){
            return React.createElement("div",{key:section[0],style:{marginBottom:12}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13,color:"#1e1b4b",marginBottom:6}},section[0]),
              section[1].map(function(item){
                return React.createElement("div",{key:item,style:{display:"flex",gap:6,marginBottom:4,fontSize:13,color:"#4338ca"}},
                  React.createElement("span",null,"•"),item
                );
              })
            );
          })
        )
      ),
      // RB AI sub-tab
      adminSubTab==="rbai"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:16}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,lineHeight:1.15,marginBottom:6}},"RB Context Suggestions"),
            React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.5}},"Review AI-generated context suggestions for running backs")
          ),
          React.createElement("button",{onClick:function(){if(rbAiGenerating)return;setRbAiGenerating(true);setRbAiSuggestions([]);setTimeout(function(){var rbs=rankedPlayers.filter(function(p){return p.pos==="RB";}).slice(0,10);var sugg=rbs.map(function(p){var conf=p.posRank<=5?90:p.posRank<=12?75:62;var roles=["lead back","bellcow","committee","backup","handcuff"];var role=p.posRank<=3?"bellcow":p.posRank<=8?"lead back":p.posRank<=15?"committee":"handcuff";return {name:p.name,team:p.team,pos:p.pos,posRank:p.posRank,tradeVal:p.tradeVal,conf:conf,role:role};});setRbAiSuggestions(sugg);setRbAiGenerating(false);},1500);},disabled:rbAiGenerating,style:{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",borderRadius:12,border:"none",background:rbAiGenerating?"#6b7280":"#3b82f6",color:"#fff",fontWeight:700,fontSize:13,cursor:rbAiGenerating?"not-allowed":"pointer",flexShrink:0,textAlign:"center",lineHeight:1.3,opacity:rbAiGenerating?0.7:1}},rbAiGenerating?"\u23F3 Generating...":"\u2728 Generate\nSuggestions")
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:24}},
          React.createElement("span",{style:{fontSize:13,color:T.textSub,fontWeight:600}},"Filter by confidence:"),
          [["all","All"],["high","High"],["medium","Medium"],["low","Low"]].map(function(f){
            var active=f[0]==="all";
            return React.createElement("button",{key:f[0],style:{padding:"6px 14px",borderRadius:8,border:"none",background:active?"#3b82f6":T.bgInput,color:active?"#fff":T.text,fontWeight:700,fontSize:13,cursor:"pointer"}},f[1]);
          }),
          React.createElement("span",{style:{fontSize:13,color:T.textSub}},rbAiSuggestions.length+" suggestions")
        ),
        rbAiGenerating&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0 32px"}},
          React.createElement("div",{style:{fontSize:48,color:"#3b82f6",marginBottom:16}},"\u23F3"),
          React.createElement("div",{style:{fontWeight:900,fontSize:20,color:T.text,marginBottom:8}},"Analyzing RB Context Data..."),
          React.createElement("div",{style:{fontSize:14,color:T.textSub}})
        ),
        !rbAiGenerating&&rbAiSuggestions.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"40px 0 32px"}},
          React.createElement("div",{style:{fontSize:48,color:T.textDim,marginBottom:16}},"\u2728"),
          React.createElement("div",{style:{fontWeight:900,fontSize:20,color:T.text,marginBottom:8}},"No Pending Suggestions"),
          React.createElement("div",{style:{fontSize:14,color:T.textSub,lineHeight:1.6}},"Click \"Generate Suggestions\" to analyze",React.createElement("br",null),"RB context data")
        ),
        !rbAiGenerating&&rbAiSuggestions.length>0&&React.createElement("div",{style:{marginBottom:16}},
          rbAiSuggestions.map(function(s){
            var confColor=s.conf>=80?"#22c55e":s.conf>=60?"#f59e0b":"#ef4444";
            return React.createElement("div",{key:s.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}},
              React.createElement(Avatar,{name:s.name,pos:s.pos,size:40}),
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{fontWeight:700,fontSize:13,color:T.text}},s.name),
                React.createElement("div",{style:{fontSize:11,color:T.textSub}},"#"+s.posRank+" RB · "+s.team+" · "+s.role)
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{background:confColor+"20",color:confColor,fontWeight:800,fontSize:11,borderRadius:6,padding:"3px 8px"}},"Conf: "+s.conf+"%")
              )
            );
          })
        ),
        React.createElement("div",{style:{background:"#eef2ff",borderRadius:14,padding:"18px",marginBottom:16}},
          React.createElement("div",{style:{fontWeight:800,fontSize:15,color:"#3730a3",marginBottom:10}},"How Suggestions Work"),
          React.createElement("div",{style:{fontSize:13,color:"#4338ca",lineHeight:1.6,marginBottom:10}},
            React.createElement("b",null,"Context suggestions are automatically generated "),"by analyzing team depth charts, player values, and dynasty trends. They help populate RB context fields faster and more consistently."
          ),
          [["High confidence (80%+):","Clear depth chart situations"],["Medium confidence (60-80%):","Some ambiguity or competition"],["Low confidence (<60%):","Unclear or rapidly changing situations"]].map(function(b){
            return React.createElement("div",{key:b[0],style:{display:"flex",gap:6,marginBottom:6,fontSize:13,color:"#4338ca"}},
              React.createElement("span",null,"•"),
              React.createElement("span",null,React.createElement("b",null,b[0]),"\u00A0"+b[1])
            );
          }),
          React.createElement("div",{style:{fontSize:13,color:"#4338ca",lineHeight:1.6,marginTop:10}},
            React.createElement("b",null,"Note:")," Suggestions never overwrite manual edits. They only appear for RBs without existing context data. Suggestions expire after 7 days and are refreshed on each generation."
          )
        ),
        React.createElement("div",{style:{padding:"24px 0 8px",borderTop:"1px solid "+T.border,textAlign:"center"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},LogoSvg,React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},["Contact","FAQ","Help"].map(function(l){return React.createElement("span",{key:l,style:{fontSize:12,color:T.textSub,cursor:"pointer"}},l);})),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},[["f","Facebook"],["@","Instagram"],["T","TikTok"]].map(function(s){return React.createElement("div",{key:s[1],style:{width:32,height:32,borderRadius:"50%",background:T.bgCard,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:T.textSub,fontWeight:700}},s[0]);})),
          React.createElement("div",{style:{fontSize:10,color:T.textDim,lineHeight:1.6}},"Player values powered by Fantasy Draft Pros. Not affiliated with",React.createElement("br",null),"Sleeper, ESPN, or Yahoo. For entertainment only.")
        )
      ),
      // HEADSHOTS sub-tab
      adminSubTab==="headshots"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{marginBottom:20}},
          React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.text,lineHeight:1.15,marginBottom:6}},"Headshot Admin"),
          React.createElement("div",{style:{fontSize:13,color:T.textSub}},"Verify player headshots from the Sleeper CDN")
        ),
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:14,padding:"16px",marginBottom:16}},
          React.createElement("div",{style:{position:"relative",marginBottom:adminHsQuery?12:0}},
            React.createElement("span",{style:{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:16}},"Q"),
            React.createElement("input",{placeholder:"Search for a player...",value:adminHsQuery,onChange:function(e){setAdminHsQuery(e.target.value);},style:{width:"100%",background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"14px 14px 14px 40px",fontSize:14,outline:"none",boxSizing:"border-box"}})
          ),
          adminHsQuery.length>=2&&(function(){
            var q=adminHsQuery.toLowerCase();
            var hits=PLAYERS.filter(function(p){return p.name.toLowerCase().includes(q);}).slice(0,12);
            if(!hits.length) return React.createElement("div",{style:{fontSize:13,color:T.textSub,padding:"10px 0"}},"No players found");
            return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
              hits.map(function(p){
                var url=headshot(p.name);
                var slId=SLEEPER_IDS[p.name];
                return React.createElement("div",{key:p.name,style:{background:T.bgInput,borderRadius:12,padding:12,textAlign:"center",border:"1px solid "+T.border}},
                  url?React.createElement("img",{src:url,alt:p.name,style:{width:64,height:64,borderRadius:"50%",objectFit:"cover",border:"2px solid "+T.border,marginBottom:8},onError:function(e){e.currentTarget.style.display="none";}})
                    :React.createElement("div",{style:{width:64,height:64,borderRadius:"50%",background:T.purpleDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 8px"}},p.name[0]),
                  React.createElement("div",{style:{fontWeight:700,fontSize:11,color:T.text,marginBottom:2}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.pos+" · "+p.team),
                  React.createElement("div",{style:{fontSize:9,color:slId?T.green:T.red,marginTop:4}},slId?"Sleeper ID: "+slId:"No Sleeper ID")
                );
              })
            );
          })()
        ),
        React.createElement("div",{style:{padding:"24px 0 8px",borderTop:"1px solid "+T.border,textAlign:"center",marginTop:32}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},LogoSvg,React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},["Contact","FAQ","Help"].map(function(l){return React.createElement("span",{key:l,style:{fontSize:12,color:T.textSub,cursor:"pointer"}},l);})),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},[["f","Facebook"],["@","Instagram"],["T","TikTok"]].map(function(s){return React.createElement("div",{key:s[1],style:{width:32,height:32,borderRadius:"50%",background:T.bgCard,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:T.textSub,fontWeight:700}},s[0]);})),
          React.createElement("div",{style:{fontSize:10,color:T.textDim,lineHeight:1.6}},"Player values powered by Fantasy Draft Pros. Not affiliated with",React.createElement("br",null),"Sleeper, ESPN, or Yahoo. For entertainment only.")
        )
      ),
      // IDP UPLOAD sub-tab
      adminSubTab==="idpupload"&&React.createElement("div",{style:{padding:"16px"}},
        React.createElement("div",{style:{marginBottom:16}},
          React.createElement("div",{style:{fontWeight:900,fontSize:24,color:T.textDim,lineHeight:1.15,marginBottom:6}},"IDP Admin Upload"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,lineHeight:1.5}},"Upload IDP player rankings via CSV to seed or update defensive player values")
        ),
        React.createElement("div",{style:{background:"#eef2ff",borderRadius:14,padding:"16px",marginBottom:14}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:12}},
            React.createElement("span",{style:{fontSize:18,color:"#3730a3"}},"\uD83D\uDCC4"),
            React.createElement("span",{style:{fontWeight:800,fontSize:15,color:"#1e1b4b"}},"CSV Format Requirements")
          ),
          [["Required columns:","full_name, position, base_value, rank"],["Optional columns:","sub_position, team"],["Valid positions:","DL, LB, DB"],["Valid sub_positions:","EDGE, DT, NT, ILB, OLB, MLB, CB, S, FS, SS"],["Value range:","0 - 10,000 (similar to offensive player scale)"]].map(function(r){
            return React.createElement("div",{key:r[0],style:{fontSize:13,color:"#4338ca",marginBottom:6,lineHeight:1.5}},
              React.createElement("b",null,r[0])," "+r[1]
            );
          }),
          React.createElement("div",{style:{marginTop:10,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}},
            React.createElement("span",{style:{color:"#3b82f6",fontSize:14}},"\u2B07"),
            React.createElement("span",{style:{color:"#3b82f6",fontWeight:600,fontSize:13}},"Download Template CSV")
          )
        ),
        React.createElement("div",{style:{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:13,color:"#374151",fontWeight:600,marginBottom:8}},"League Format"),
          React.createElement("select",{style:{width:"100%",background:"#f9fafb",color:"#1a1a2e",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",fontSize:14,outline:"none",marginBottom:14,appearance:"auto"}},
            React.createElement("option",null,"Dynasty Superflex + IDP"),
            React.createElement("option",null,"Dynasty 1QB + IDP"),
            React.createElement("option",null,"Redraft + IDP")
          ),
          React.createElement("div",{style:{fontSize:13,color:"#374151",fontWeight:600,marginBottom:8}},"Scoring Preset"),
          React.createElement("select",{style:{width:"100%",background:"#f9fafb",color:"#1a1a2e",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",fontSize:14,outline:"none",marginBottom:10,appearance:"auto"}},
            React.createElement("option",null,"\u2696 Balanced"),
            React.createElement("option",null,"\uD83D\uDD25 Tackles Heavy"),
            React.createElement("option",null,"\u26A1 Sacks Heavy")
          ),
          React.createElement("div",{style:{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px",marginBottom:14}},
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:2}},"Format: dynasty_sf_idp_balanced"),
            React.createElement("div",{style:{fontSize:12,color:"#6b7280"}},"Values will be calculated using Balanced scoring")
          ),
          React.createElement("div",{style:{fontSize:13,color:"#374151",fontWeight:600,marginBottom:8}},"Upload CSV File"),
          React.createElement("div",{style:{display:"flex",gap:8}},
            React.createElement("div",{style:{flex:1,border:"2px dashed #d1d5db",borderRadius:10,padding:"14px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",color:"#6b7280",fontSize:13}},
              React.createElement("span",null,"\u2B06"),"Choose CSV file..."
            ),
            React.createElement("button",{style:{padding:"14px 20px",borderRadius:10,border:"none",background:"#818cf8",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:6}},"\u2B06 Upload")
          )
        ),
        React.createElement("div",{style:{background:"#fff",borderRadius:14,padding:"16px",marginBottom:14}},
          React.createElement("div",{style:{fontWeight:800,fontSize:15,color:"#1a1a2e",marginBottom:12}},"How Upload Works"),
          ["Parses CSV and validates required columns","Generates unique player_id from name and position","Upserts player record into player_values table with position_group='IDP'","Calculates FDP value using IDP multipliers and adjustments","Creates snapshot in ktc_value_snapshots with source='manual_seed'","Reports success count and any errors encountered"].map(function(s,i){
            return React.createElement("div",{key:i,style:{fontSize:13,color:"#374151",marginBottom:8,lineHeight:1.6}},
              React.createElement("span",{style:{fontWeight:700}},(i+1)+". "),s
            );
          })
        ),
        React.createElement("div",{style:{background:"#fffbeb",border:"1px solid #f59e0b44",borderRadius:14,padding:"16px",marginBottom:16}},
          React.createElement("div",{style:{fontWeight:800,fontSize:15,color:"#92400e",marginBottom:10}},"Important Notes"),
          ["Duplicate uploads will update existing players","New snapshots are always created (historical tracking)","Base values should be on similar scale to offensive players","FDP values are auto-calculated with IDP-specific adjustments","Position groups and sub-positions are automatically set"].map(function(note){
            return React.createElement("div",{key:note,style:{display:"flex",gap:6,marginBottom:8,fontSize:13,color:"#92400e",lineHeight:1.5}},
              React.createElement("span",null,"•"),note
            );
          })
        ),
        React.createElement("div",{style:{padding:"24px 0 8px",borderTop:"1px solid "+T.border,textAlign:"center"}},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}},LogoSvg,React.createElement("span",{style:{fontSize:12,color:T.textSub}},"© 2026 Fantasy Draft Pros · All rights reserved")),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},["Contact","FAQ","Help"].map(function(l){return React.createElement("span",{key:l,style:{fontSize:12,color:T.textSub,cursor:"pointer"}},l);})),
          React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:14}},[["f","Facebook"],["@","Instagram"],["T","TikTok"]].map(function(s){return React.createElement("div",{key:s[1],style:{width:32,height:32,borderRadius:"50%",background:T.bgCard,border:"1px solid "+T.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:T.textSub,fontWeight:700}},s[0]);})),
          React.createElement("div",{style:{fontSize:10,color:T.textDim,lineHeight:1.6}},"Player values powered by Fantasy Draft Pros. Not affiliated with",React.createElement("br",null),"Sleeper, ESPN, or Yahoo. For entertainment only.")
        )
      ),

      // ── ANALYTICS SUB-TAB ────────────────────────────────────────────────
      adminSubTab==="analytics"&&React.createElement(AnalyticsDashboard,{T:T,data:analyticsData,loading:analyticsLoading,onLoad:function(){
        if(analyticsLoading)return;
        setAnalyticsLoading(true);
        loadAnalyticsData().then(function(d){setAnalyticsData(d);setAnalyticsLoading(false);}).catch(function(e){setAnalyticsData({error:e?.message||"Unknown error",daily:[],features:[],trades:0,recent:[]});setAnalyticsLoading(false);});
      }})
    ),

    // ════ IMPORT TAB ════
    tab==="import"&&React.createElement("div",{style:{padding:"16px",paddingBottom:80}},
      React.createElement("div",{style:{fontWeight:900,fontSize:24,marginBottom:4}},"League Import"),
      React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Import your roster from any platform"),
      React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}},
        [["sleeper","Sleeper"],["espn","ESPN"],["yahoo","Yahoo"],["mfl","MFL"],["manual","Manual"]].map(function(t){
          return React.createElement("button",{key:t[0],onClick:function(){setImpTab(t[0]);setImpStatus(null);setImpErr("");},style:{padding:"7px 16px",borderRadius:20,border:"1px solid "+(impTab===t[0]?T.purple:T.border),background:impTab===t[0]?T.purple:"transparent",color:impTab===t[0]?"#fff":T.textSub,fontWeight:700,fontSize:12,cursor:"pointer"}},t[1]);
        })
      ),
      impTab==="sleeper"&&React.createElement("div",null,
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.borderPurple,borderRadius:16,padding:20,marginBottom:16}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:4}},"Import from Sleeper"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Enter your Sleeper username to sync your roster"),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            React.createElement("input",{value:slUser,onChange:function(e){setSlUser(e.target.value);},placeholder:"Sleeper username",style:Object.assign({},inpS,{flex:1})}),
            React.createElement("button",{onClick:importSleeper,style:{padding:"10px 18px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Sync")
          ),
          impStatus==="loading"&&React.createElement("div",{style:{textAlign:"center",padding:"20px",color:T.textSub}},"Loading roster..."),
          impStatus==="error"&&React.createElement("div",{style:{padding:"10px 14px",background:T.red+"15",borderRadius:10,color:T.red,fontSize:12,marginBottom:8}},impErr),
          impStatus==="success"&&impData&&React.createElement("div",null,
            React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"12px 14px",marginBottom:12}},
              React.createElement("div",{style:{fontWeight:700,fontSize:14}},impData.username+"'s Roster"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},impData.leagueName+" | "+impData.totalTeams+" teams | "+impData.scoringFormat)
            ),
            React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:8}},"Your Players"),
            impRoster.slice(0,20).map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:28}),
                React.createElement(PBadge,{pos:p.pos}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:12}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team||(p.rank!=="—"?"#"+p.rank:"Unranked"))
                ),
                React.createElement("span",{style:{fontWeight:700,fontSize:12,color:T.purpleLight}},p.tradeVal||"—")
              );
            })
          )
        )
      ),
      impTab==="yahoo"&&React.createElement("div",null,
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
            React.createElement("span",{style:{fontSize:24}},"🏈"),
            React.createElement("div",{style:{fontWeight:800,fontSize:16}},"Yahoo Fantasy Import")
          ),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:12,lineHeight:1.6}},"Yahoo requires sign-in through their app. Follow these steps to copy your roster:"),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:12,padding:"14px 16px",marginBottom:14}},
            React.createElement("ol",{style:{color:T.text,margin:0,padding:"0 0 0 18px",lineHeight:2.2,fontSize:12}},
              React.createElement("li",null,"Open ",React.createElement("b",null,"Yahoo Fantasy")," → tap your league"),
              React.createElement("li",null,"Go to ",React.createElement("b",null,"My Team")),
              React.createElement("li",null,"Copy each player name from your roster"),
              React.createElement("li",null,"Paste into the text box below — one player per line"),
              React.createElement("li",null,'Click ',React.createElement("b",null,"Import Roster"))
            )
          ),
          React.createElement("div",{style:{fontSize:11,color:T.textSub,marginBottom:8,fontWeight:600}},"PASTE YOUR YAHOO ROSTER"),
          React.createElement("textarea",{value:manRaw,onChange:function(e){setManRaw(e.target.value);},placeholder:"Patrick Mahomes\nJa'Marr Chase\nSaquon Barkley\n...",rows:8,style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"12px 14px",fontSize:12,outline:"none",width:"100%",boxSizing:"border-box" as any,resize:"vertical" as any,fontFamily:"monospace",lineHeight:1.6,marginBottom:10}}),
          React.createElement("button",{onClick:function(){
            var names=manRaw.split("\n").map(function(n){return n.trim();}).filter(Boolean);
            var matched=names.map(function(n){return PLAYERS.find(function(p){return p.name.toLowerCase()===n.toLowerCase();});}).filter(Boolean);
            if(matched.length>0){setImpRoster(matched as any[]);setImpStatus("success");setImpData({username:"Yahoo",leagueName:"My Yahoo League",totalTeams:12,scoringFormat:"PPR"});}
            else{setImpStatus("error");setImpErr("No players matched. Check spelling and try again.");}
          },style:{width:"100%",padding:"11px",borderRadius:12,border:"none",background:"#6001D2",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Import Yahoo Roster"),
          impStatus==="error"&&React.createElement("div",{style:{padding:"10px 14px",background:T.red+"15",borderRadius:10,color:T.red,fontSize:12,marginTop:8}},impErr),
          impStatus==="success"&&impData&&React.createElement("div",{style:{marginTop:12}},
            React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"12px 14px",marginBottom:12}},
              React.createElement("div",{style:{fontWeight:700,fontSize:14}},"Yahoo Roster Imported ✓"),
              React.createElement("div",{style:{fontSize:11,color:T.textSub,marginTop:2}},impRoster.length+" players matched")
            ),
            impRoster.slice(0,20).map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}},
                React.createElement(Avatar,{name:p.name,pos:p.pos,size:28}),
                React.createElement(PBadge,{pos:p.pos}),
                React.createElement("div",{style:{flex:1}},
                  React.createElement("div",{style:{fontWeight:700,fontSize:12}},p.name),
                  React.createElement("div",{style:{fontSize:10,color:T.textSub}},p.team||"—")
                ),
                React.createElement("span",{style:{fontWeight:700,fontSize:12,color:T.purpleLight}},(p.tradeVal||0).toLocaleString())
              );
            })
          )
        )
      ),
      (impTab==="espn"||impTab==="mfl")&&React.createElement("div",null,
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:4}},"Import from "+impTab.toUpperCase()),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:16}},"Enter your league ID to connect"),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:16}},
            React.createElement("input",{value:impTab==="mfl"?mflId:espnId,onChange:function(e){impTab==="mfl"?setMflId(e.target.value):setEspnId(e.target.value);},placeholder:impTab.toUpperCase()+" League ID",style:Object.assign({},inpS,{flex:1})}),
            React.createElement("button",{onClick:function(){setImpErr(impTab.toUpperCase()+" direct import is coming soon. Try Sleeper in the meantime!");},style:{padding:"10px 18px",borderRadius:12,border:"none",background:T.purple,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}},"Connect")
          ),
          React.createElement("div",{style:{background:T.bgInput,borderRadius:10,padding:"12px 14px",fontSize:12,color:T.textSub,lineHeight:1.6}},"To find your "+impTab.toUpperCase()+" League ID: open your league and look for the league ID in the URL.")
        )
      ),
      impTab==="manual"&&React.createElement("div",null,
        React.createElement("div",{style:{background:T.bgCard,border:"1px solid "+T.border,borderRadius:16,padding:20}},
          React.createElement("div",{style:{fontWeight:800,fontSize:16,marginBottom:4}},"Manual Roster Entry"),
          React.createElement("div",{style:{fontSize:12,color:T.textSub,marginBottom:14}},"Paste player names, one per line"),
          React.createElement("textarea",{value:manRaw,onChange:function(e){setManRaw(e.target.value);},placeholder:"Saquon Barkley\nJa'Marr Chase\nLamar Jackson\n...",rows:8,style:{background:T.bgInput,color:T.text,border:"1px solid "+T.border,borderRadius:10,padding:"12px 14px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.6}}),
          React.createElement("button",{onClick:function(){
            var names=manRaw.split("\n").map(function(n){return n.trim();}).filter(Boolean);
            var matched=names.map(function(name){return rankedPlayers.find(function(p){return p.name.toLowerCase().includes(name.toLowerCase());})||{name:name,pos:"?",team:"?",rank:"—",vbd:0,tradeVal:0,ag:{g:"?",c:"#888"},tier:{t:"?",c:"#888"}};});
            setManMatched(matched);
          },style:{width:"100%",marginTop:12,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,"+T.purple+",#5b21b6)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}},"Match Players"),
          manMatched.length>0&&React.createElement("div",{style:{marginTop:16}},
            React.createElement("div",{style:{fontWeight:700,fontSize:14,marginBottom:8}},manMatched.length+" Players Matched"),
            manMatched.map(function(p){
              return React.createElement("div",{key:p.name,style:{background:T.bgInput,borderRadius:8,padding:"8px 12px",marginBottom:5,display:"flex",alignItems:"center",gap:8}},
                React.createElement(PBadge,{pos:p.pos}),
                React.createElement("span",{style:{flex:1,fontSize:12,fontWeight:600}},p.name),
                React.createElement("span",{style:{fontSize:11,color:T.purpleLight,fontWeight:700}},p.tradeVal||"—")
              );
            })
          )
        )
      )
    ),

    // GLOBAL FOOTER
    React.createElement("div",{style:{borderTop:"1px solid "+T.border,padding:"20px 16px",textAlign:"center",marginTop:8}},
      React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:24,marginBottom:8}},
        [["Contact","contact"],["FAQ","faq"],["Help","help"]].map(function(l){
          return React.createElement("span",{key:l[0],onClick:function(){setTab("reports");setReportSubTab(l[1]);},style:{fontSize:13,color:T.textSub,cursor:"pointer",textDecoration:"underline",fontWeight:500}},l[0]);
        })
      ),
      React.createElement("div",{style:{fontSize:11,color:T.textDim}},"© 2026 Fantasy Draft Pros · Not affiliated with Sleeper, ESPN, or Yahoo · For entertainment only")
    ),

    // END MAIN CONTENT WRAPPER
    ),

    // FLOATING CHAT BUTTON
    React.createElement("button",{onClick:function(){setTab("reports");setReportSubTab("contact");},style:{position:"fixed",bottom:isDesktop?20:72,right:20,width:52,height:52,borderRadius:"50%",background:"#3b82f6",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(59,130,246,0.5)",zIndex:200,fontSize:22,color:"#fff"}},"\uD83D\uDCAC")
  );
}
