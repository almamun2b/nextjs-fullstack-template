import type { UserListItem } from "../../server/dal/users";

// Server-rendered, so format in a fixed zone instead of the server's local one.
const formatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function UserList({ users }: { users: UserListItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {users.map((user) => (
        <li
          key={user.id}
          className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="font-medium">{user.name ?? "Unnamed user"}</p>
            <p className="text-sm break-all text-muted-foreground">
              {user.email}
            </p>
          </div>
          <time
            dateTime={user.createdAt.toISOString()}
            className="text-sm text-muted-foreground"
          >
            {formatter.format(user.createdAt)} UTC
          </time>
        </li>
      ))}
    </ul>
  );
}
