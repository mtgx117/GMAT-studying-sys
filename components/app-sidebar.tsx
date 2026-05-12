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
  { label: "学习看板", icon: Home, status: "当前" },
  { label: "手动录题", icon: ClipboardList, status: "第 2 阶段" },
  { label: "题库", icon: Library, status: "第 3 阶段" },
  { label: "错题本", icon: BookOpenCheck, status: "第 4 阶段" },
  { label: "截图上传", icon: UploadCloud, status: "第 6 阶段" },
  { label: "设置", icon: Settings, status: "后续" },
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
          const isCurrent = item.status === "当前";

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[current=true]:bg-secondary"
              data-current={isCurrent}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <Badge variant={isCurrent ? "default" : "outline"}>
                {item.status}
              </Badge>
            </div>
          );
        })}
      </nav>
      <div className="border-t px-5 py-4">
        <p className="text-xs leading-5 text-muted-foreground">
          第 1 阶段只提供静态首页和布局；数据写入、API、OCR/AI 均后置。
        </p>
      </div>
    </aside>
  );
}
