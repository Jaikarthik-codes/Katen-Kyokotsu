import { useSkills } from "../api/hooks";
import { Section } from "../components/Section";

export function Skills() {
  const { data: skills } = useSkills();
  return (
    <Section id="skills" command="cat skills.txt">
      <div className="overflow-x-auto">
        <table className="w-full max-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-6">category</th>
              <th scope="col" className="py-2">skill</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s, i) => (
              <tr key={s.name} className="border-b border-rule">
                <td className="py-2 pr-6 text-muted">{s.category !== skills[i - 1]?.category ? s.category : ""}</td>
                <td className="py-2">
                  {s.name}
                  {s.years !== null && <span className="text-muted"> · {s.years} yrs</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
