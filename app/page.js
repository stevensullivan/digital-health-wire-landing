import { cookies } from "next/headers";
import SubscribeForm from "./SubscribeForm";

export const dynamic = "force-dynamic"; // read cookies fresh on every request

const PERKS = ["Twice-weekly briefings", "~5-minute reads", "Always free"];

export default async function Page() {
  const jar = await cookies();
  const stage = jar.get("dhw_stage")?.value || "email"; // email | details | registered
  const email = jar.get("dhw_email")?.value || "";

  return (
    <main className="hero">
      <div className="hero-inner">
        <img className="logo" src="/logo.png" alt="The Bio Wire" />
        <h1>
          Life sciences can be complicated.
          <span className="accent"> Your news shouldn&rsquo;t be.</span>
        </h1>
        <p className="tagline">
          Join thousands of life sciences leaders today.
        </p>
        <ul className="perks">
          {PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <SubscribeForm initialStage={stage} initialEmail={email} />
      </div>
    </main>
  );
}
