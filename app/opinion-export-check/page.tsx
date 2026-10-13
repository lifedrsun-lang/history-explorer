import {notFound} from "next/navigation";
import Fixture from "./Fixture";
export const dynamic="force-dynamic";
export default function Page() {if(process.env.VERCEL_ENV!=="preview") notFound();return <Fixture/>;}
