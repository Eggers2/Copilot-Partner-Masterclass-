import { requireTasksAuth } from "@/lib/tasks-auth";
import { getBoard, getAllTags } from "@/lib/db/tasks";
import KanbanBoard from "./components/KanbanBoard";

export default async function TasksPage() {
  await requireTasksAuth();

  const [columns, tags] = await Promise.all([getBoard(), getAllTags()]);

  // Serialize dates to strings for client component
  const serialized = JSON.parse(JSON.stringify(columns));

  return <KanbanBoard initialColumns={serialized} tags={tags} />;
}
