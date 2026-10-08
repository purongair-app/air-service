import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { seedTemplates,createDraft,approveDraft } from "./actions";

export default async function Messages(){
 const m=await getCurrentMembership(); if(!m)return null; const supabase=await createClient();
 const [{data:cases=[]},{data:templates=[]},{data:drafts=[]}]=await Promise.all([
  supabase.from("collection_cases").select("id,status,sales_document_id,customers(first_name,last_name,organization_name,email,line_user_id),sales_documents(document_no)").eq("organization_id",m.organization_id).in("status",["open","contacted","promised"]).order("updated_at",{ascending:false}),
  supabase.from("collection_message_templates").select("*").eq("organization_id",m.organization_id).eq("active",true).order("name"),
  supabase.from("collection_message_drafts").select("*").eq("organization_id",m.organization_id).order("created_at",{ascending:false}).limit(100)
 ]);
 return <AppShell>
  <div className="actions"><div><h1 className="page-title">ข้อความติดตามชำระ</h1><p className="muted">สร้าง Draft ก่อน แล้วอนุมัติจึงเข้าคิว Email/LINE</p></div><form action={seedTemplates}><button className="btn light">สร้าง Template เริ่มต้น</button></form></div>
  <section className="card" style={{marginBottom:16}}><form action={createDraft} className="form-grid">
   <label>เคส<select name="case_id">{cases.map((c:any)=><option key={c.id} value={c.id}>{c.sales_documents?.document_no} · {c.customers?.organization_name||[c.customers?.first_name,c.customers?.last_name].filter(Boolean).join(" ")}</option>)}</select></label>
   <label>Template<select name="template_id">{templates.map((t:any)=><option key={t.id} value={t.id}>{t.name} · {t.channel}</option>)}</select></label>
   <div><button className="btn primary">สร้าง Draft</button></div>
  </form></section>
  <div className="grid">{drafts.map((d:any)=><article className="card" key={d.id}>
   <div className="actions"><b>{d.subject||"LINE Message"}</b><span className="badge">{d.status}</span></div>
   <div className="muted">{d.channel} → {d.recipient||"ยังไม่มีผู้รับ"}</div>
   <p style={{whiteSpace:"pre-wrap"}}>{d.body}</p>
   {d.status==="draft"&&<form action={approveDraft}><input type="hidden" name="id" value={d.id}/><button className="btn primary" disabled={!d.recipient}>อนุมัติและเข้าคิวส่ง</button></form>}
  </article>)}{!drafts.length&&<div className="card empty">ยังไม่มี Draft</div>}</div>
 </AppShell>
}