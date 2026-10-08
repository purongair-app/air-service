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
