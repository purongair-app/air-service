import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

export default async function CalendarPage(){
 const member=await getCurrentMembership(); const supabase=await createClient();
 const {data=[]}=member?await supabase.from("jobs")
  .select("id,work_no,customer_name_snapshot,service_name,appointment_date,appointment_time_label,status")
  .eq("organization_id",member.organization_id)
  .not("appointment_date","is",null)
  .order("appointment_date",{ascending:true}).limit(300):{data:[]};

 const grouped=(data||[]).reduce((m:any,j:any)=>{(m[j.appointment_date]??=[]).push(j);return m;},{});
 return <AppShell>
  <h1 className="page-title">ปฏิทินงาน</h1><p className="muted">ตารางนัดหมายใบงานตามวัน</p>
  <div className="grid">{Object.keys(grouped).map(date=><section className="card" key={date}>
    <h3>{new Date(date+"T00:00:00").toLocaleDateString("th-TH",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</h3>
    <div className="grid">{grouped[date].map((j:any)=><a className="card" key={j.id} href={"/jobs/"+j.id}>
      <b>{j.appointment_time_label||"ไม่ระบุเวลา"} · {j.work_no}</b>
      <div>{j.customer_name_snapshot} · {j.service_name}</div>
      <small className="muted">{j.status}</small>
    </a>)}</div>
  </section>)}
  {!Object.keys(grouped).length&&<div className="card empty">ยังไม่มีงานที่นัดหมาย</div>}</div>
 </AppShell>
}