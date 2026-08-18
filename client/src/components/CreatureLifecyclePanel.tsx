import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { selectedEggIdForHatch, unhatchedEggs } from "../../../shared/eggLifecycleRules";
import { Egg, Sprout } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OwnedEgg = {
  id: number;
  eggDefinitionId: number;
  name: string;
  description: string;
  hatchedAt: Date | string | null;
  hatchedCreatureId: number | null;
};

type CreatureHistory = {
  id: number;
  name: string;
  stage: number;
  totalStages: number;
  isActive: boolean;
  imageUrl: string | null;
};

export function CreatureLifecyclePanelV2({ pin, monster, history, embedded = false }: { pin: string; monster: { canStartNewCreature?: boolean } | undefined; history: CreatureHistory[]; embedded?: boolean }) {
  const utils = trpc.useUtils();
  const eggsQuery = trpc.learning.normalMissionStatus.useQuery({ pin });
  const [showHistory, setShowHistory] = useState(false);
  const [showEggPicker, setShowEggPicker] = useState(false);
  const [selectedEgg, setSelectedEgg] = useState<OwnedEgg | null>(null);
  const hatch = trpc.learning.hatchEgg.useMutation({
    onSuccess: async result => {
      toast.success(`${result.name}の育成を開始しました`);
      setSelectedEgg(null);
      setShowEggPicker(false);
      await Promise.all([utils.learning.dashboard.invalidate(), utils.learning.normalMissionStatus.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const availableEggs = unhatchedEggs((eggsQuery.data?.ownedEggs ?? []) as OwnedEgg[]);

  return <>
    <Card className={embedded ? "border-white/30 bg-emerald-950/55 text-white shadow-md backdrop-blur-sm" : "border-emerald-300/50 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className={embedded ? "hidden" : ""}>
            <p className="text-sm font-semibold">育成管理</p>
            <p className="text-[11px] text-muted-foreground">今まで育てた生物と、次に育てる卵を確認できます。</p>
          </div>
          <Button size="sm" variant="outline" className={embedded ? "border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white" : ""} onClick={() => setShowHistory(value => !value)}>今まで育てたモンスター</Button>
        </div>

        {monster?.canStartNewCreature && <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">新しい生物を育てられます</p>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-100/80">所持している卵を選ぶと、現在の生物を履歴に残して新しい生物の育成時間を0時間から始めます。</p>
          <Button className="mt-3 w-full bg-amber-400 text-emerald-950 hover:bg-amber-300" disabled={!availableEggs.length} onClick={() => setShowEggPicker(value => !value)}>
            <Egg className="mr-2 h-4 w-4" />{availableEggs.length ? `所持している卵を選ぶ（${availableEggs.length}個）` : "使える卵がありません"}
          </Button>
          {showEggPicker && <div className="mt-3 space-y-2" aria-label="所持している卵">
            {availableEggs.map(egg => <button key={egg.id} type="button" onClick={() => { setSelectedEgg(egg); setShowEggPicker(false); }} className="flex w-full items-center gap-3 rounded-xl border border-amber-300/80 bg-background p-3 text-left transition hover:border-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-950/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"><Egg className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{egg.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{egg.description || "タップしてこの卵を選択"}</p></div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">選ぶ</span>
            </button>)}
          </div>}
        </div>}

        {showHistory && <div className="mt-3 grid grid-cols-2 gap-2">
          {history.map(creature => <div key={creature.id} className={cn("overflow-hidden rounded-xl border p-2", creature.isActive ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : "bg-background")}>
            {creature.imageUrl ? <img src={creature.imageUrl} alt={`${creature.name} 第${creature.stage}段階`} className="h-20 w-full object-contain" /> : <div className="flex h-20 items-center justify-center"><Sprout className="h-7 w-7 text-emerald-500" /></div>}
            <p className="mt-1 truncate text-center text-xs font-semibold">{creature.name === "はじまりの生物" ? "モンスター" : creature.name}</p>
            <p className="text-center text-[10px] text-muted-foreground">第{creature.stage}段階 / {creature.totalStages}</p>
            {creature.isActive && <Badge className="mt-1 w-full justify-center bg-emerald-600 text-[10px]">現在育てている</Badge>}
          </div>)}
        </div>}
      </CardContent>
    </Card>

    {selectedEgg && <div role="dialog" aria-modal="true" aria-label="卵の確認" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{selectedEgg.name}で育成を始めますか？</CardTitle>
          <CardDescription>OKを押すと、現在の生物は完了として履歴に残り、この卵から新しい生物を第1段階・0時間から育てます。</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setSelectedEgg(null)}>キャンセル</Button>
          <Button className="flex-1" disabled={hatch.isPending} onClick={() => { const eggId = selectedEggIdForHatch(selectedEgg); if (eggId) hatch.mutate({ pin, eggId }); }}>{hatch.isPending ? "開始中…" : "OK、育成を始める"}</Button>
        </CardContent>
      </Card>
    </div>}
  </>;
}
