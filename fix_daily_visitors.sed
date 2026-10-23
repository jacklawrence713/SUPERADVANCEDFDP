# Fix the daily visitors bar chart colorization
/daily.map(function(d:any){/{
  N
  N
  N
  N
  N
  N
  N
  s/daily\.map(function(d:any){/daily.map(function(d:any,idx:number){/
  s/var h=Math\.max(8,Math\.round((d\.count\/maxDay)\*104));/var h=Math.max(8,Math.round((d.count\/maxDay)*104));\n          var isToday=d.day===todayKey;\n          var daysAgo=daily.length-1-idx;\n          var opacity=isToday?1:Math.max(0.35,1-(daysAgo*0.08));/
  s/background:isToday?T\.purple:T\.purple+\"40\"/background:isToday?T.purple:"rgba(124, 77, 255, "+opacity+")"/
}
