import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

export default async function Claims(){
 const m=await getCurrentMembership(); if(!m)return null; const supabase=await createClient();
 const {data=[]}=await supabase.from("warranty_claim_sla_status")
  .select("*")
  .eq("organization_id",m.organization_id)
  .order("escalation_level",{ascending:false})
  .order("response_due_at");
 return <AppShell><h1 className="page-title">Warranty Claims / SLA</h1>
  <div className="table-wrap"><table><thead><tr><th>Claim</th><th>หัวข้อ</th><th>Priority</th><th>สถานะ</th><th>Response SLA</th><th>Resolution SLA</th><th>Esc.</th></tr></thead><tbody>
   {data.map((c:any)=><tr key={c.warranty_claim_id}><td><a href={"/claims/"+c.warranty_claim_id}><b>{c.claim_no}</b></a></td><td>{c.subject}</td><td>{c.priority}</td><td>{c.status}</td><td>{c.response_sla_breached?"BREACH":c.first_responded_at?"Responded":`${c.response_hours_remaining??"-"}h`}</td><td>{c.resolution_sla_breached?"BREACH":`${c.resolution_hours_remaining??"-"}h`}</td><td>L{c.escalation_level}</td></tr>)}
  </tbody></table>{!data.length&&<div className="empty">ยังไม่มี Warranty Claim</div>}</div>
 </AppShell>
}