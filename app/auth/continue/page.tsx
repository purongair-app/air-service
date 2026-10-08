import { redirect } from "next/navigation";
import { getCustomerMembership } from "@/lib/customer";
export default async function Continue(){
 const customer=await getCustomerMembership();
 redirect(customer?"/portal":"/dashboard");
}