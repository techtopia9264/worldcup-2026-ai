interface StageLabelProps {
    stage: string;
}

const STAGE_NAMES: Record<string, string> = {
    group: '',
    round_of_32: '32强赛',
    round_of_16: '16强赛',
    quarterfinals: '四分之一决赛',
    semifinals: '半决赛',
    final: '决赛',
    third_place: '三四名决赛',
};

/** 淘汰赛阶段标签 */
export function StageLabel({ stage }: StageLabelProps) {
    const name = STAGE_NAMES[stage];
    if (!name) return null;

    return (
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
            {name}
        </span>
    );
}
