import { Section } from "../components/Section";
import { fallback } from "../fallback";

export function Contact() {
  const { email, github, linkedin } = fallback.profile;
  const links = [
    ["github", github],
    ["linkedin", linkedin],
  ].filter((l): l is [string, string] => Boolean(l[1]));
  return (
    <Section id="contact" command="contact">
      <ul className="grid gap-3 text-lg">
        <li>
          <span className="text-muted">email </span>
          <a href={`mailto:${email}`} className="underline underline-offset-4 [overflow-wrap:anywhere]">
            {email}
          </a>
        </li>
        {links.map(([label, url]) => (
          <li key={label}>
            <span className="text-muted">{label} </span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 [overflow-wrap:anywhere]">
              {url.replace(/^https?:\/\//, "")}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
