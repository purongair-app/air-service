import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value:string|null){
 if(!value||!value.startsWith("/")||value.startsWith("//"))return "/auth/continue";
 return value;
}

export async function GET(request:NextRequest){
 const tokenHash=request.nextUrl.searchParams.get("token_hash");
 const type=request.nextUrl.searchParams.get("type") as EmailOtpType|null;
 const code=request.nextUrl.searchParams.get("code");
 const next=safeNext(request.nextUrl.searchParams.get("next"));
 const supabase=await createClient();
 let error:any=null;

 if(tokenHash&&type){
   ({error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type}));
 }else if(code){
   ({error}=await supabase.auth.exchangeCodeForSession(code));
 }else{
   return NextResponse.redirect(new URL("/login?error=missing_auth_token",request.url));
 }

 if(error)return NextResponse.redirect(new URL("/login?error=auth_confirmation_failed",request.url));
 return NextResponse.redirect(new URL(next,request.url));
}