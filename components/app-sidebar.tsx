import Link from "next/link";
import {
  BookOpenCheck,
  ClipboardList,
  Home,
  Library,
  Settings,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "学习看板", href: "/", icon: Home, status: "第 5 阶段", enabled: true },
  {
    label: "手动录题",
    href: "/questions/new",
    icon: ClipboardList,
    status: "第 2 阶段",
    enabled: true,
  },
  {
    label: "题库",
    href: "/questions",
    icon: Library,
    status: "第 3 阶段",
    enabled: true,
  },
  {
    label: "错题本",
    href: "#",
    icon: BookOpenCheck,
    status: "第 4 阶段",
    enabled: false,
  },
  {
    label: "截图上传",
    href: "#",
    icon: UploadCloud,
    status: "第 6 阶段",
    enabled: false,
  },
  { label: "设置", href: "#", icon: Settings, status: "后续", enabled: false },
];

export function AppSidebar() {
  return (
    <aside className="hidden w-68 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpenCheck className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">
            GMAT Study Agent
          </span>
          <span className="truncate text-xs text-muted-foreground">
            Personal study system
          </span>
        </div>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <Badge variant={item.enabled ? "outline" : "secondary"}>
                {item.status}
              </Badge>
            </>
          );

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm opacity-60"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary"
            >
              {content}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-5 py-4">
        <p className="text-xs leading-5 text-muted-foreground">
          当前推进第 3 次验收：题库列表和题目详情。截图、OCR、AI 和推荐能力仍按后续阶段推进。
        </p>
      </div>
    </aside>
  );
}
