"use client";

import { Headphones, CheckCircle, PenLine, ListTodo, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface StatsBarProps {
  email: string;
  totalReviews: number;
  totalCorrections: number;
  remainingSegments: number;
}

export function StatsBar({
  email,
  totalReviews,
  totalCorrections,
  remainingSegments,
}: StatsBarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("selaou_session");
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <span className="font-semibold">Selaou</span>
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-6 text-sm md:flex">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{totalReviews} reviews</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <PenLine className="h-4 w-4 text-blue-500" />
            <span>{totalCorrections} corrections</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span>{remainingSegments} restants</span>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Deconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
