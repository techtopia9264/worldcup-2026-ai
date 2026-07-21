import { useEffect, useMemo, useState } from 'react';
import { Button } from 'dud';
import { BarChart3, MessageCircle, GitCommitHorizontal, Swords } from 'lucide-react';
import { MatchCard } from './components/MatchCard';
import { DayDivider } from './components/DayDivider';
import { ChampionCard } from './components/ChampionCard';
import { DayNavigator } from './components/DayNavigator';
import { AIScoreboard } from './components/AIScoreboard';
import { AIChart } from './components/AIChart';
import { TrajectoryDialog } from './components/TrajectoryDialog';
import { CommentaryDialog } from './components/CommentaryDialog';
import { BracketView, BracketInline } from './components/BracketView';
import { useMatchData } from './data/useMatchData';
import { useRealResults } from './data/useRealResults';

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

/**
 * 2026 世界杯 AI 预测页面
 * 底部日期导航切换"天"，主区域只展示当前选中日期的比赛卡片
 */
export default function App() {
    const { dayGroups, predictionSnapshots } = useMemo(() => useMatchData(), []);
    const allMatches = useMemo(() => dayGroups.flatMap((d) => d.matches), [dayGroups]);
    const realResults = useRealResults();
    const totalMatches = allMatches.length;

    // 计算默认选中日期：今天或最近的有比赛日期
    const defaultDate = useMemo(() => {
        const today = getTodayStr();
        const dateSet = new Set(dayGroups.map((d) => d.date));
        if (dateSet.has(today)) return today;
        for (const d of dayGroups) {
            if (d.date >= today) return d.date;
        }
        return dayGroups[dayGroups.length - 1]?.date || today;
    }, [dayGroups]);

    const [activeDate, setActiveDate] = useState(defaultDate);

    // 切换日期时滚回顶部
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeDate]);
    const [scoreboardOpen, setScoreboardOpen] = useState(false);
    const [commentaryOpen, setCommentaryOpen] = useState(false);
    const [chartOpen, setChartOpen] = useState(false);
    const [trajectoryOpen, setTrajectoryOpen] = useState(false);
    const [bracketOpen, setBracketOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'bracket'>('cards');

    // 当前选中天的比赛
    const activeDay = useMemo(
        () => dayGroups.find((d) => d.date === activeDate),
        [dayGroups, activeDate],
    );

    return (
        <div className="min-h-screen bg-background">
            {/* 页面标题 */}
            <header className="pt-8 pb-6 text-center px-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    2026 世界杯 · AI 预测
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    6 个 AI 模型，{totalMatches} 场比赛
                </p>
                <button
                    onClick={() => setViewMode(viewMode === 'cards' ? 'bracket' : 'cards')}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                >
                    {viewMode === 'cards' ? '切换到淘汰赛晋级图' : '切换回赛程卡片模式'}
                </button>
            </header>

            {/* 按钮栏 — sticky 吸附顶部 */}
            <div className="sticky top-0 left-0 right-0 z-10 bg-background py-2.5 shadow-[0_4px_6px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2.5"
                        onClick={() => setTrajectoryOpen(true)}
                    >
                        <GitCommitHorizontal size={13} />
                        预测轨迹
                    </Button>
                    {viewMode === 'cards' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-7 px-2.5"
                            onClick={() => setBracketOpen(true)}
                        >
                            <Swords size={13} />
                            对阵图
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2.5"
                        onClick={() => setCommentaryOpen(true)}
                    >
                        <MessageCircle size={13} />
                        AI 锐评
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1 text-xs h-7 px-2.5"
                        onClick={() => setChartOpen(true)}
                    >
                        <BarChart3 size={13} />
                        成绩图表
                    </Button>
                </div>
            </div>

            {/* 比赛列表 — 只展示当前天 */}
            {viewMode === 'cards' ? (
                <main className="max-w-5xl mx-auto px-4 pt-4 pb-40">
                    {activeDay && (
                        <section>
                            <DayDivider
                                dateLabel={activeDay.dateLabel}
                                weekdayLabel={activeDay.weekdayLabel}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeDay.matches.map((m) => (
                                    <MatchCard
                                        key={m.match.id}
                                        data={m}
                                        realResult={realResults[m.match.id] || null}
                                    />
                                ))}
                                {/* 决赛日展示冠军卡片 */}
                                {activeDay.date === '2026-07-20' && <ChampionCard />}
                            </div>
                        </section>
                    )}
                </main>
            ) : (
                <main className="max-w-6xl mx-auto px-4 pt-4 pb-40">
                    <BracketInline
                        allMatches={allMatches}
                        realResults={realResults}
                        snapshots={predictionSnapshots}
                    />
                </main>
            )}

            {/* 底部日期导航（仅卡片模式） */}
            {viewMode === 'cards' && (
                <DayNavigator
                    days={dayGroups}
                    activeDate={activeDate}
                    onSelectDate={setActiveDate}
                />
            )}

            {/* AI 成绩单弹窗（隐藏入口，保留组件） */}
            <AIScoreboard
                open={scoreboardOpen}
                onClose={() => setScoreboardOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
            />

            {/* AI 锐评弹窗 */}
            <CommentaryDialog
                open={commentaryOpen}
                onClose={() => setCommentaryOpen(false)}
                snapshots={predictionSnapshots}
            />

            {/* 预测轨迹弹窗 */}
            <TrajectoryDialog
                open={trajectoryOpen}
                onClose={() => setTrajectoryOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
                snapshots={predictionSnapshots}
            />

            {/* 成绩图表弹窗 */}
            <AIChart
                open={chartOpen}
                onClose={() => setChartOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
            />

            {/* 淘汰赛对阵图 */}
            <BracketView
                open={bracketOpen}
                onClose={() => setBracketOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
                snapshots={predictionSnapshots}
            />
        </div>
    );
}
