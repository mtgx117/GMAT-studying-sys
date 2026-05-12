import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  LoaderCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type StatusPanelProps = {
  state: "empty" | "loading" | "error" | "success";
  title: string;
  description: string;
};

const stateConfig = {
  empty: {
    icon: Inbox,
    className: "bg-background",
  },
  loading: {
    icon: LoaderCircle,
    className: "bg-background",
  },
  error: {
    icon: AlertCircle,
    className: "border-destructive/40 bg-background",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-background",
  },
};

export function StatusPanel({ state, title, description }: StatusPanelProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Alert className={config.className}>
      <Icon
        className={state === "loading" ? "size-4 animate-spin" : "size-4"}
      />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {state === "loading" ? (
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-2 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      ) : null}
    </Alert>
  );
}
