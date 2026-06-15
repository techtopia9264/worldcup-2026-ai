/** 预测值 → 中文翻译（AI 输出可能含英文） */
const WINNER_TRANSLATIONS: Record<string, string> = {
    'draw': '平局',
    'France': '法国', 'Portugal': '葡萄牙', 'Argentina': '阿根廷',
    'England': '英格兰', 'Spain': '西班牙', 'Brazil': '巴西',
    'Austria': '奥地利', 'Colombia': '哥伦比亚', 'Croatia': '克罗地亚',
    'Japan': '日本', 'Iran': '伊朗', 'Egypt': '埃及',
    'Saudi Arabia': '沙特', 'Senegal': '塞内加尔', 'Algeria': '阿尔及利亚',
    'DR Congo': '民主刚果', 'Ghana': '加纳', 'Germany': '德国',
    'Belgium': '比利时', 'Netherlands': '荷兰', 'Uruguay': '乌拉圭',
    'Morocco': '摩洛哥', 'Turkey': '土耳其', 'Australia': '澳大利亚',
    'Ecuador': '厄瓜多尔', 'Sweden': '瑞典', 'Norway': '挪威',
    'Mexico': '墨西哥', 'USA': '美国', 'South Korea': '韩国',
    'Czech Republic': '捷克', 'Switzerland': '瑞士', 'Canada': '加拿大',
    'Qatar': '卡塔尔', 'Scotland': '苏格兰', 'Tunisia': '突尼斯',
    'Panama': '巴拿马', 'Paraguay': '巴拉圭', 'South Africa': '南非',
    'Haiti': '海地', 'Ivory Coast': '科特迪瓦', 'New Zealand': '新西兰',
    'Uzbekistan': '乌兹别克斯坦', 'Jordan': '约旦', 'Iraq': '伊拉克',
    'Cape Verde': '佛得角', 'Curaçao': '库拉索', 'Bosnia & Herzegovina': '波黑',
};

export function translateWinner(w: string | null | undefined): string {
    if (!w) return '—';
    return WINNER_TRANSLATIONS[w] || w;
}
