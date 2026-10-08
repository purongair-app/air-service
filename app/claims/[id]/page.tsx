import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { triageClaim,createClaimJob,changeClaimStatus,uploadClaimEvidence,recheckEligibility } from "./actions";

export default async function ClaimDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createClient();
 const [{data:c},{data:events=[]},{data:attachments=[]},{data:members=[]},{data:rmas=[]}]=await Promise.all([
  supabase.from("warranty_claims").select("*,customers(customer_no,first_name,last_name,organization_name,phone),customer_equipment(equipment_no,brand,model,btu,install_location),jobs(work_no,status)").eq("id",id).maybeSingle(),
  supabase.from("warranty_claim_events").select("*").eq("warranty_claim_id",id).order("occurred_at"),
  supabase.from("warranty_claim_attachments").select("*").eq("warranty_claim_id",id).order("uploaded_at"),
  supabase.from("organization_members").select("user_id,role,profiles(display_name)").in("role",["owner","manager","admin"]).eq("status","active"),
  supabase.from("supplier_rmas").select("id,rma_no,status,resolution_type,claimed_value").eq("warranty_claim_id",id).order("created_at",{ascending:false})
 ]);
 if(!c)notFound();
 const customerName=c.customers?.organization_name||[c.customers?.first_name,c.customers?.last_name].filter(Boolean).join(" ");
 return <AppShell>
  <div className="actions"><div><h1 className="page-title">{c.claim_no}</h1><p className="muted">{customerName} · {c.status} · Priority {c.priority}</p></div><a className="btn light" href="/claims">กลับ</a></div>
  <section className="card" style={{marginTop:16}}>
   <div className="actions"><div><b>Warranty Eligibility</b><div className="muted">{c.eligibility_source||"-"}</div></div><span className="badge">{c.eligibility_status||"review"}</span></div>
   <div style={{whiteSpace:"pre-wrap"}}>{Array.isArray(c.eligibility_detail?.reasons)?c.eligibility_detail.reasons.join(" · "):""}</div>
   <form action={recheckEligibility} style={{marginTop:10}}><input type="hidden" name="claim_id" value={c.id}/><button className="btn light">ตรวจสิทธิ์ใหม่</button></form>
  </section>
  <section className="grid cards" style={{marginTop:16}}>
   <div className="card"><div className="muted">Response Due</div><div className="kpi" style={{fontSize:16}}>{c.response_due_at?new Date(c.response_due_at).toLocaleString("th-TH"):"-"}</div></div>
   <div className="card"><div className="muted">Resolution Due</div><div className="kpi" style={{fontSize:16}}>{c.resolution_due_at?new Date(c.resolution_due_at).toLocaleString("th-TH"):"-"}</div></div>
   <div className="card"><div className="muted">Escalation</div><div className="kpi">L{c.escalation_level}</div></div>
  </section>
  <section className="grid" style={{marginTop:16}}>
   <div className="card"><h3>{c.subject}</h3><p>{c.description}</p><p className="muted">โทร {c.customers?.phone||"-"} · เครื่อง {c.customer_equipment?`${c.customer_equipment.equipment_no} ${c.customer_equipment.brand||""} ${c.customer_equipment.model||""}`:"-"}</p>{c.jobs&&<p>Job: <a href={"/jobs/"+c.job_id}>{c.jobs.work_no}</a> · {c.jobs.status}</p>}</div>
   <div className="card"><h3>Triage</h3><form action={triageClaim} className="form-grid">
    <input type="hidden" name="claim_id" value={c.id}/>
    <label>Priority<select name="priority" defaultValue={c.priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
    <label>ผู้รับผิดชอบ<select name="assigned_to_user_id" defaultValue={c.assigned_to_user_id||""}><option value="">ไม่ระบุ</option>{members.map((x:any)=><option key={x.user_id} value={x.user_id}>{x.profiles?.display_name||x.user_id} · {x.role}</option>)}</select></label>
    <label style={{gridColumn:"1/-1"}}>ข้อความตอบรับ<input name="detail" defaultValue="รับเรื่องแล้ว กำลังตรวจสอบรายละเอียด"/></label>
    <div><button className="btn primary">รับเรื่อง / Triage</button></div>
   </form></div>
   {!c.job_id&&<div className="card"><h3>สร้างใบงานตรวจเคลม</h3><form action={createClaimJob} className="form-grid"><input type="hidden" name="claim_id" value={c.id}/><label>วันที่นัด<input type="date" name="appointment_date" required/></label><label>เวลา<input name="appointment_time_label" placeholder="09:00–11:00"/></label><div><button className="btn primary">สร้าง Job</button></div></form></div>}
   <div className="card"><h3>สถานะเคส</h3><form action={changeClaimStatus} className="form-grid"><input type="hidden" name="claim_id" value={c.id}/><label>สถานะ<select name="status" defaultValue={c.status}><option value="in_progress">กำลังดำเนินการ</option><option value="waiting_supplier">รอ Supplier</option><option value="resolved">แก้ไขเสร็จ</option><option value="rejected">ไม่เข้าเงื่อนไข</option><option value="cancelled">ยกเลิก</option></select></label><label>สรุป<input name="summary"/></label><div><button className="btn light">อัปเดต</button></div></form></div>
   <div className="card"><h3>Evidence</h3><form action={uploadClaimEvidence}><input type="hidden" name="claim_id" value={c.id}/><input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" required/><button className="btn light">อัปโหลด</button></form><div className="grid">{attachments.map((a:any)=><a key={a.id} className="btn light" target="_blank" href={"/api/private-file?bucket=business-documents&path="+encodeURIComponent(a.storage_path)}>{a.original_name||"Evidence"}</a>)}</div></div>
   <div className="card"><h3>Supplier RMA</h3><a className="btn light" href={"/procurement/rma?claim_id="+c.id}>สร้าง RMA จาก Claim นี้</a>{rmas.map((r:any)=><div key={r.id}><a href={"/procurement/rma/"+r.id}><b>{r.rma_no}</b></a> · {r.status} · {r.resolution_type}</div>)}</div>
   <div className="card"><h3>Timeline</h3>{events.map((e:any)=><div key={e.id} style={{borderBottom:"1px solid #eee",padding:"8px 0"}}><b>{e.event}</b><div>{e.detail||"-"}</div><small className="muted">{e.visibility} · {new Date(e.occurred_at).toLocaleString("th-TH")}</small></div>)}</div>
  </section>
 </AppShell>
}