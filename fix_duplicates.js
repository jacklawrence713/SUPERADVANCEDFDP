const fs = require('fs');
let content = fs.readFileSync('afdp.tsx', 'utf8');

// Remove the duplicate "var isToday=d.day===todayKey;" line
content = content.replace(
  'var daysAgo=daily.length-1-idx;\n          var opacity=isToday?1:Math.max(0.35,1-(daysAgo*0.08));\n          var isToday=d.day===todayKey;',
  'var daysAgo=daily.length-1-idx;\n          var opacity=isToday?1:Math.max(0.35,1-(daysAgo*0.08));'
);

// Remove duplicate "Unique Daily Visitors" table sections (lines 2695-2760)
// First, find and remove the first duplicate table
const pattern1 = /\/\/ Unique visitors section\s*data\.uniqueVisitors && React\.createElement\("div",\{style:\{background:T\.bgCard,border:"1px solid "\+T\.border,borderRadius:14,padding:"14px 12px",marginBottom:16\}\},\s*React\.createElement\("div",\{style:\{fontWeight:700,fontSize:13,color:T\.text,marginBottom:10\}\},"Unique Daily Visitors"\),[\s\S]*?React\.createElement\("div",\{style:\{textAlign:"center",padding:"20px 0",fontSize:12,color:T\.textSub\}\},"No visitor data"\)\s*\),/;

let match1 = content.match(pattern1);
if (match1) {
  content = content.replace(pattern1, '');
  console.log('Removed first duplicate table');
}

fs.writeFileSync('afdp.tsx', content);
console.log('Fixed duplicates');
