import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'dud';
import { computeStandings } from '../data/computeStandings';
import type { MatchWithPredictions } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

interface StandingsTableProps {
    open: boolean;
    onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
}

/**
 * 队伍积分排行榜
 * 前 32 名浅绿背景，后面白色背景
 */
export function StandingsTable({ open, onClose, allMatches, realResults }: StandingsTableProps) {
    const standings = useMemo(() => computeStandings(allMatches, realResults), [allMatches, realResults]);
    const top32 = standings.slice(0, 32).map((s) => s.team);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>队伍积分排行榜</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        积分 3/1/0 · 前 32 名晋级淘汰赛
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-auto mt-4 rounded-md border -mx-1 sm:mx-0">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="text-xs">国家</TableHead>
                                <TableHead className="text-xs text-center w-12 font-bold">积分</TableHead>
                                <TableHead className="text-xs text-center w-10">胜</TableHead>
                                <TableHead className="text-xs text-center w-10">平</TableHead>
                                <TableHead className="text-xs text-center w-10">负</TableHead>
                                <TableHead className="text-xs text-center w-16">进球</TableHead>
                                <TableHead className="text-xs text-center w-16">失球</TableHead>
                                <TableHead className="text-xs text-center w-12">净胜</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {standings.map((s) => {
                                const isTop32 = top32.includes(s.team);
                                return (
                                    <TableRow
                                        key={s.team}
                                        className={isTop32 ? 'bg-green-50' : 'bg-background'}
                                    >
                                        <TableCell className="text-xs font-medium py-1.5">
                                            {s.team}
                                        </TableCell>
                                        <TableCell className="text-xs text-center font-bold py-1.5">
                                            {s.points}
                                        </TableCell>
                                        <TableCell className="text-xs text-center py-1.5">{s.won}</TableCell>
                                        <TableCell className="text-xs text-center py-1.5">{s.drawn}</TableCell>
                                        <TableCell className="text-xs text-center py-1.5">{s.lost}</TableCell>
                                        <TableCell className="text-xs text-center py-1.5">{s.goalsFor || '—'}</TableCell>
                                        <TableCell className="text-xs text-center py-1.5">{s.goalsAgainst || '—'}</TableCell>
                                        <TableCell className="text-xs text-center py-1.5">
                                            <span className={s.goalDiff > 0 ? 'text-predict-correct' : s.goalDiff < 0 ? 'text-muted-foreground' : ''}>
                                                {s.goalDiff > 0 ? '+' : ''}{s.goalDiff || 0}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
