// @ts-nocheck
import * as https from "https";
const MODEL = "gemini-2.5-flash";
function post(url: string, body: string): Promise<{status:number;data:string}> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}}, (res) => {
      let d=""; res.on("data",c=>{d+=c}); res.on("end",()=>resolve({status:res.statusCode!,data:d}));
    });
    req.on("error",reject); req.write(body); req.end();
  });
}
export async function geminiChat(messages:{role:string;content:string}[]):Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  let sys=""; const contents=[];
  for (const m of messages) { if(m.role==="system") sys=m.content; else contents.push({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}); }
  const b:any={contents}; if(sys) b.systemInstruction={parts:[{text:sys}]};
  const {status,data}=await post(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,JSON.stringify(b));
  if(status!==200) throw new Error(`Gemini ${status}: ${data.substring(0,300)}`);
  const p=JSON.parse(data); return p?.candidates?.[0]?.content?.parts?.[0]?.text||"";
}
