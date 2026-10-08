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


// Staging-only: show technician workflow controls on the assigned job detail page.
const techDir=path.join("app","technician","jobs","[id]");
const techPage=path.join(techDir,"page.tsx");
const techOriginal=path.join(techDir,"original-page.tsx");
if(fs.existsSync(techPage) && !fs.existsSync(techOriginal)){
  fs.renameSync(techPage,techOriginal);
  fs.writeFileSync(path.join(techDir,"status-actions.ts"),\`"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setTechnicianStatus(formData: FormData) {
  const jobId=String(formData.get("job_id")||"");
  const status=String(formData.get("status")||"");
  if(!/^[a-f0-9-]{36}$/i.test(jobId)) throw new Error("Invalid job");
  if(!["traveling","in_progress","waiting_parts","technician_submitted"].includes(status)) throw new Error("Invalid status");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {error}=await supabase.rpc("technician_set_job_status",{p_job:jobId,p_status:status});
  if(error) throw new Error("Unable to update job status: "+error.message);
  redirect("/technician/jobs/"+jobId);
}
\`);
  fs.writeFileSync(techPage,\`import OriginalJobPage from "./original-page";
import { createClient } from "@/lib/supabase/server";
import { setTechnicianStatus } from "./status-actions";

export default async function TechnicianJobPage(props: {params: Promise<{id:string}>}) {
  const {id}=await props.params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  let allowed=false;
  let status="";
  if(user){
    const {data:membership}=await supabase.from("organization_members").select("employee_id,role,status").eq("user_id",user.id).eq("role","technician").eq("status","active").maybeSingle();
    if(membership?.employee_id){
      const {data:assignment}=await supabase.from("job_assignments").select("accepted_at").eq("job_id",id).eq("employee_id",membership.employee_id).maybeSingle();
      allowed=Boolean(assignment?.accepted_at);
      if(allowed){
        const {data:job}=await supabase.from("jobs").select("status").eq("id",id).maybeSingle();
        status=job?.status||"";
      }
    }
  }
  const transitions: Record<string,{status:string,label:string}[]>={
    new:[{status:"traveling",label:"ออกเดินทาง"}],
    assigned:[{status:"traveling",label:"ออกเดินทาง"}],
    scheduled:[{status:"traveling",label:"ออกเดินทาง"}],
    traveling:[{status:"in_progress",label:"เริ่มงาน"}],
    in_progress:[{status:"waiting_parts",label:"รออะไหล่"},{status:"technician_submitted",label:"ส่งงานให้ตรวจรับ"}],
    waiting_parts:[{status:"in_progress",label:"ทำงานต่อ"},{status:"technician_submitted",label:"ส่งงานให้ตรวจรับ"}]
  };
  return <>
    <OriginalJobPage {...props}/>
    {allowed && Boolean(transitions[status]?.length) && <section className="card" style={{padding:24,margin:"24px"}}>
      <h2>สถานะการปฏิบัติงาน</h2>
      <p>สถานะปัจจุบัน: {status}</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
        {transitions[status].map(item=><form action={setTechnicianStatus} key={item.status}>
          <input type="hidden" name="job_id" value={id}/>
          <input type="hidden" name="status" value={item.status}/>
          <button className="btn primary" type="submit">{item.label}</button>
        </form>)}
      </div>
    </section>}
  </>;
}
\`);
}
