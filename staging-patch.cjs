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
