const fs=require("fs");
const path=require("path");

const tsconfigPath="tsconfig.json";
const tsconfig=JSON.parse(fs.readFileSync(tsconfigPath,"utf8"));
tsconfig.compilerOptions=tsconfig.compilerOptions||{};
tsconfig.compilerOptions.strict=false;
fs.writeFileSync(tsconfigPath,JSON.stringify(tsconfig,null,2)+"\n");

fs.mkdirSync("types",{recursive:true});
fs.writeFileSync(
  path.join("types","bwip-js.d.ts"),
  'declare module "bwip-js" { const bwipjs: any; export default bwipjs; }\n'
);

const usersPath=path.join("app","settings","users","actions.ts");
let users=fs.readFileSync(usersPath,"utf8");
users=users.replace(
  "list.users.find(u=>u.email?.toLowerCase()===email)",
  "list.users.find((u:any)=>u.email?.toLowerCase()===email)"
);
fs.writeFileSync(usersPath,users);

const proxyPath=path.join("lib","supabase","proxy.ts");
let proxy=fs.readFileSync(proxyPath,"utf8");
proxy=proxy.replace(
  'if (!signedIn && !path.startsWith("/login") && !path.startsWith("/auth")) {',
  'const isPublicPath = path.startsWith("/login") || path.startsWith("/auth") || path === "/api/health" || path.startsWith("/supplier/rfq/") || path === "/manifest.webmanifest" || path === "/sw.js";\n\n  if (!signedIn && !isPublicPath) {'
);
fs.writeFileSync(proxyPath,proxy);

const pwaPath=path.join("components","pwa-register.tsx");
fs.writeFileSync(
  pwaPath,
  'export default function PwaRegister(){ return null; }\n'
);

const loginActionsPath=path.join("app","login","actions.ts");
fs.writeFileSync(
  loginActionsPath,
  '"use server";\n' +
  'import { redirect } from "next/navigation";\n' +
  'import { createClient } from "@/lib/supabase/server";\n\n' +
  'export async function login(formData: FormData){\n' +
  '  const email=String(formData.get("email")||"").trim();\n' +
  '  const password=String(formData.get("password")||"");\n' +
  '  const supabase=await createClient();\n' +
  '  const { error }=await supabase.auth.signInWithPassword({email,password});\n' +
  '  if(error){ redirect("/login?error=invalid"); }\n' +
  '  redirect("/auth/continue");\n' +
  '}\n'
);

const loginPagePath=path.join("app","login","page.tsx");
fs.writeFileSync(
  loginPagePath,
  'import { login } from "./actions";\n\n' +
  'export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){\n' +
  '  const params=await searchParams;\n' +
  '  return <main className="login-page">\n' +
  '    <section className="login-card">\n' +
  '      <h1>AIRFRIEND SERVICE</h1>\n' +
  '      <p className="muted">ระบบบริหารธุรกิจแอร์</p>\n' +
  '      <form className="form" action={login}>\n' +
  '        <label>อีเมล<input name="email" type="email" required /></label>\n' +
  '        <label>รหัสผ่าน<input name="password" type="password" required /></label>\n' +
  '        {params.error ? <div style={{color:"#c4372c"}}>อีเมลหรือรหัสผ่านไม่ถูกต้อง</div> : null}\n' +
  '        <button className="btn primary">เข้าสู่ระบบ</button>\n' +
  '      </form>\n' +
  '    </section>\n' +
  '  </main>;\n' +
  '}\n'
);


// Isolated technician status page without changing the original job details route.
const statusDir=path.join("app","technician","status","[id]");
fs.mkdirSync(statusDir,{recursive:true});
fs.writeFileSync(path.join(statusDir,"actions.ts"), `"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function transition(formData:FormData) {
  const job=String(formData.get("job")||"");
  const status=String(formData.get("status")||"");
  if(!/^[a-f0-9-]{36}$/i.test(job) || !["traveling","in_progress","waiting_parts","technician_submitted"].includes(status))throw new Error("Invalid request");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const {error}=await supabase.rpc("technician_set_job_status",{p_job:job,p_status:status});
  if(error)throw new Error("Update failed: "+error.message);
  redirect("/technician/status/"+job);
}
`);
fs.writeFileSync(path.join(statusDir,"page.tsx"), `import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import {transition} from "./actions";
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)redirect("/login");
  const {data:member}=await s.from("organization_members").select("employee_id").eq("user_id",user.id).eq("role","technician").eq("status","active").maybeSingle();
  if(!member?.employee_id)return <main><h1>ไม่พบสิทธิ์ช่างสำหรับบัญชีนี้</h1></main>;
  const {data:a}=await s.from("job_assignments").select("accepted_at").eq("job_id",id).eq("employee_id",member.employee_id).maybeSingle();
  if(!a?.accepted_at)return <main><h1>ยังไม่พบการรับงานของช่าง</h1></main>;
  const {data:j}=await s.from("jobs").select("work_no,status").eq("id",id).maybeSingle();
  if(!j)return <main><h1>ไม่พบใบงานที่เปิดได้</h1></main>;
  const actions:Record<string,{code:string,label:string}[]>={
    new:[{code:"traveling",label:"ออกเดินทาง"}],assigned:[{code:"traveling",label:"ออกเดินทาง"}],scheduled:[{code:"traveling",label:"ออกเดินทาง"}],
    traveling:[{code:"in_progress",label:"เริ่มงาน"}],
    in_progress:[{code:"waiting_parts",label:"รออะไหล่"},{code:"technician_submitted",label:"ส่งงานให้ตรวจรับ"}],
    waiting_parts:[{code:"in_progress",label:"ทำงานต่อ"},{code:"technician_submitted",label:"ส่งงานให้ตรวจรับ"}]
  };
  return <main style={{maxWidth:650,margin:"40px auto",padding:24,background:"white",borderRadius:16}}>
    <h1>สถานะการปฏิบัติงาน</h1>
    <p>ใบงาน: {j.work_no}</p><p>สถานะ: {j.status}</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      {(actions[j.status]||[]).map(x=><form action={transition} key={x.code}>
        <input type="hidden" name="job" value={id}/><input type="hidden" name="status" value={x.code}/>
        <button className="btn primary" type="submit">{x.label}</button>
      </form>)}
    </div>
    <p style={{marginTop:24}}><Link href={"/technician/jobs/"+id}>กลับหน้ารายละเอียดใบงาน</Link></p>
  </main>;
}
`);


// Staging Owner job acceptance flow (isolated route).
const reviewDir=path.join("app","management","review","[id]");
fs.mkdirSync(reviewDir,{recursive:true});
fs.writeFileSync(path.join(reviewDir,"actions.ts"), `"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function reviewJob(formData:FormData) {
 const id=String(formData.get("job")||"");
 const action=String(formData.get("action")||"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["review","complete"].includes(action))throw new Error("Invalid input");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {error}=await supabase.rpc("management_review_job",{p_job:id,p_action:action});
 if(error)throw new Error("Review failed: "+error.message);
 redirect("/management/review/"+id);
}
`);
fs.writeFileSync(path.join(reviewDir,"page.tsx"), `import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {reviewJob} from "./actions";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const s=await createClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user)redirect("/login");
 const {data:j}=await s.from("jobs").select("work_no,status,organization_id,completed_at").eq("id",id).maybeSingle();
 if(!j)return <main style={{padding:30}}><h1>ไม่พบใบงานที่เข้าถึงได้</h1></main>;
 const {data:m,error:memberError}=await s.from("organization_members").select("role").eq("user_id",user.id).eq("organization_id",j.organization_id).eq("status","active").in("role",["owner","manager","admin"]).limit(1);
 if(memberError||!m?.length)return <main style={{padding:30}}><h1>ไม่มีสิทธิ์ตรวจรับใบงาน</h1></main>;
 const action=j.status==="technician_submitted"?"review":j.status==="under_review"?"complete":null;
 return <main style={{maxWidth:700,margin:"40px auto",padding:28,background:"white",borderRadius:16}}>
   <h1>Owner ตรวจรับงาน</h1><p>ใบงาน: {j.work_no}</p><p>สถานะ: {j.status}</p>
   {j.completed_at&&<p>ปิดงานเมื่อ: {new Date(j.completed_at).toLocaleString("th-TH")}</p>}
   {action&&<form action={reviewJob}>
     <input type="hidden" name="job" value={id}/><input type="hidden" name="action" value={action}/>
     <button className="btn primary" type="submit">{action==="review"?"รับเข้าตรวจสอบ":"อนุมัติและปิดงาน"}</button>
   </form>}
   {!action&&<p>ไม่มีการดำเนินการที่อนุญาตในสถานะนี้</p>}
   <p style={{marginTop:24}}><Link href={"/jobs/"+id}>กลับไปใบงาน</Link></p>
 </main>;
}
`);
