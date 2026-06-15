import { getFlagUrl } from '../data/countryCodes';

interface FlagAvatarProps {
    country: string;
    size?: 'sm' | 'md';
}

/** 国旗尺寸 */
const SIZE_MAP = {
    sm: { container: 40, img: 32 },
    md: { container: 56, img: 48 },
} as const;

/**
 * 圆形国旗头像 + 国家名
 * 外层白色圆形容器 padding 4px，形成白色边框效果
 */
export function FlagAvatar({ country, size = 'md' }: FlagAvatarProps) {
    const dims = SIZE_MAP[size];
    const flagUrl = getFlagUrl(country);

    return (
        <div className="flex flex-col items-center gap-1.5">
            {flagUrl ? (
                <div
                    className="rounded-full bg-white shadow-lg flex items-center justify-center shrink-0"
                    style={{ width: dims.container, height: dims.container, padding: 4 }}
                >
                    <img
                        src={flagUrl}
                        alt={country}
                        className="rounded-full object-cover"
                        style={{ width: dims.img, height: dims.img }}
                    />
                </div>
            ) : (
                <div
                    className="rounded-full bg-muted border flex items-center justify-center shrink-0 text-muted-foreground text-[10px]"
                    style={{ width: dims.container, height: dims.container }}
                >
                    ?
                </div>
            )}
            <span className="text-xs text-foreground text-center leading-tight max-w-[64px] truncate">
                {country}
            </span>
        </div>
    );
}
