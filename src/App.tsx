import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'dud';
import { BarChart3, MessageCircle, GitCommitHorizontal, Trophy } from 'lucide-react';
import { MatchCard } from './components/MatchCard';
import { DayDivider } from './components/DayDivider';
import { DayNavigator } from './components/DayNavigator';
import { AIScoreboard } from './components/AIScoreboard';
import { AIChart } from './components/AIChart';
import { TrajectoryDialog } from './components/TrajectoryDialog';
import { CommentaryDialog } from './components/CommentaryDialog';
import { StandingsTable } from './components/StandingsTable';
import { useMatchData } from './data/useMatchData';
import { useRealResults } from './data/useRealResults';

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

/**
 * 2026 世界杯 AI 预测页面
 * 按天展示所有比赛，每场比赛一张卡片
 */
export default function App() {
    const { dayGroups, predictionSnapshots } = useMemo(() => useMatchData(), []);
    const allMatches = useMemo(() => dayGroups.flatMap((d) => d.matches), [dayGroups]);
    const realResults = useRealResults();
    const totalMatches = allMatches.length;
    const scrolledRef = useRef(false);
    const [scoreboardOpen, setScoreboardOpen] = useState(false);
    const [commentaryOpen, setCommentaryOpen] = useState(false);
    const [chartOpen, setChartOpen] = useState(false);
    const [trajectoryOpen, setTrajectoryOpen] = useState(false);
    const [standingsOpen, setStandingsOpen] = useState(false);

    // 自动滚动到当前日期
    useEffect(() => {
        if (scrolledRef.current || dayGroups.length === 0) return;

        const today = getTodayStr();
        // 找到今天或之后的第一个有天
        let targetDate = today;
        const dateSet = new Set(dayGroups.map((d) => d.date));
        if (!dateSet.has(targetDate)) {
            // 找今天之后最近的一天
            for (const d of dayGroups) {
                if (d.date >= today) {
                    targetDate = d.date;
                    break;
                }
            }
            // 如果所有日期都在今天之前（比赛已结束），滚到最后一天
            if (!dateSet.has(targetDate)) {
                targetDate = dayGroups[dayGroups.length - 1].date;
            }
        }

        const el = document.getElementById(`day-${targetDate}`);
        if (el) {
            // 延迟一帧确保 DOM 就绪
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                scrolledRef.current = true;
            });
        }
    }, [dayGroups]);

    return (
        <div className="min-h-screen bg-background">
            {/* 页面标题 */}
            <header className="py-10 text-center px-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    2026 世界杯 · AI 预言
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    6 个 AI 模型，{totalMatches} 场比赛
                </p>
            </header>

            {/* 按钮栏 — 滚动时吸附顶部 */}
            <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b py-2.5">
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2.5"
                        onClick={() => setStandingsOpen(true)}
                    >
                        <Trophy size={13} />
                        积分榜
                    </Button>
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

            {/* 比赛列表 */}
            <main className="max-w-5xl mx-auto px-4 pb-20">
                {dayGroups.map((day) => (
                    <section key={day.date} id={`day-${day.date}`}>
                        <DayDivider
                            dateLabel={day.dateLabel}
                            weekdayLabel={day.weekdayLabel}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {day.matches.map((m) => (
                                <MatchCard
                                    key={m.match.id}
                                    data={m}
                                    realResult={realResults[m.match.id] || null}
                                />
                            ))}
                        </div>
                    </section>
                ))}

            </main>

            {/* 右侧日期导航 */}
            <DayNavigator days={dayGroups} />

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

            {/* 积分榜弹窗 */}
            <StandingsTable
                open={standingsOpen}
                onClose={() => setStandingsOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
            />

            {/* 成绩图表弹窗 */}
            <AIChart
                open={chartOpen}
                onClose={() => setChartOpen(false)}
                allMatches={allMatches}
                realResults={realResults}
            />

            {/* 页脚 */}
            <footer className="py-8 text-center text-xs text-muted-foreground">
                数据来源：各 AI 模型预测 · 真实比分由 OpenFootball 提供 · npm run sync 更新
            </footer>
        </div>
    );
}
