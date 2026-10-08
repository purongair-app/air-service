"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";

export async function syncCollections(){
 const m=await getCurrentMembership();
 if(!m||!["owner","manager","admin"].includes(m.role))throw new Error("ไม่มีสิทธิ์");
 const supabase=await createClient();
 const {error}=await supabase.rpc("sync_collection_cases",{p_org:m.organization_id});
 if(error)throw new Error(error.message);
 revalidatePath("/collections");
}

export async function logCollectionEvent(formData:FormData){
 const m=await getCurrentMembership();
 if(!m||!["owner","manager","admin"].includes(m.role))throw new Error("ไม่มีสิทธิ์");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 const caseId=String(formData.get("case_id")||"");
 const promiseDate=String(formData.get("promise_date")||"")||null;
 const promiseAmount=Number(formData.get("promise_amount")||0)||null;
 const nextContact=String(formData.get("next_contact_date")||"")||null;
 const outcome=String(formData.get("outcome")||"");
 const detail=String(formData.get("detail")||"");
 const channel=String(formData.get("channel")||"phone");
 const status=String(formData.get("status")||"contacted");

 const {error}=await supabase.from("collection_events").insert({
  organization_id:m.organization_id,collection_case_id:caseId,channel,outcome,detail,
  promise_date:promiseDate,promise_amount:promiseAmount,next_contact_date:nextContact,
  actor_user_id:user?.id
 });
 if(error)throw new Error(error.message);

 const {error:updateError}=await supabase.from("collection_cases").update({
  status,promise_date:promiseDate,promise_amount:promiseAmount,
  next_contact_date:nextContact,last_contacted_at:new Date().toISOString(),
  note:detail,owner_user_id:user?.id
 }).eq("id",caseId);
 if(updateError)throw new Error(updateError.message);

 revalidatePath("/collections");
}