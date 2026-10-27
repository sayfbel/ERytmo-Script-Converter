import ProjectsClient from "./ProjectsClient";

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ProjectsPage() {
  return <ProjectsClient />;
}

