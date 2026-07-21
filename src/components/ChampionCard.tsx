import { FlagAvatar } from './FlagAvatar';

/** 冠军特制卡片 — 展示在决赛卡片右侧 */
export function ChampionCard() {
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]"
            style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), 0 0 60px rgba(255, 215, 0, 0.15), 0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255, 215, 0, 0.25)',
            }}
        >
            {/* 背景装饰光晕 */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.3) 0%, transparent 70%)',
                }}
            />

            {/* 大力神杯 */}
            <div
                className="text-7xl relative z-10"
                style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}
            >
                🏆
            </div>

            {/* 标题 */}
            <p
                className="text-xs tracking-widest relative z-10"
                style={{ color: 'rgba(255,215,0,0.7)', letterSpacing: '0.2em' }}
            >
                2026 美加墨世界杯冠军
            </p>

            {/* 队名 + 国旗 */}
            <div className="flex items-center gap-3 relative z-10">
                <FlagAvatar country="西班牙" size="lg" />
                <h2
                    className="text-3xl font-bold"
                    style={{
                        color: '#FFD700',
                        textShadow: '0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3), 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                >
                    西班牙
                </h2>
            </div>

            {/* 记录 */}
            <p
                className="text-[10px] relative z-10"
                style={{ color: 'rgba(255,215,0,0.5)', letterSpacing: '0.1em' }}
            >
                8场 · 7胜1平 · 仅失1球 · 37场不败
            </p>
        </div>
    );
}
