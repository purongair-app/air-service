import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(){
  try{
    const supabase=await createClient();
    const {error}=await supabase.from("organizations").select("id").limit(1);
    return NextResponse.json({
      ok:!error,
      service:"AIRFRIEND SERVICE",
      database:error?"unavailable":"reachable",
      timestamp:new Date().toISOString(),
      error:error?.message||null
    },{status:error?503:200});
  }catch(e:any){
    return NextResponse.json({
      ok:false,service:"AIRFRIEND SERVICE",
      database:"unavailable",timestamp:new Date().toISOString(),
      error:String(e?.message||e)
    },{status:503});
  }
}