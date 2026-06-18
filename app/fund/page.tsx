import { redirect } from "next/navigation";
import { FUND_LEGS } from "./legs";

export default function FundPage() {
  redirect(`/fund/${Object.keys(FUND_LEGS)[0]}`);
}
