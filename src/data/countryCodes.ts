/** 国家中文名 → ISO 3166-1 alpha-2 代码 */
const COUNTRY_CODES: Record<string, string> = {
    '阿尔及利亚': 'dz',
    '阿根廷': 'ar',
    '澳大利亚': 'au',
    '奥地利': 'at',
    '巴拿马': 'pa',
    '巴拉圭': 'py',
    '巴西': 'br',
    '比利时': 'be',
    '波黑': 'ba',
    '波兰': 'pl',
    '丹麦': 'dk',
    '德国': 'de',
    '厄瓜多尔': 'ec',
    '法国': 'fr',
    '佛得角': 'cv',
    '哥伦比亚': 'co',
    '韩国': 'kr',
    '荷兰': 'nl',
    '加拿大': 'ca',
    '加纳': 'gh',
    '捷克': 'cz',
    '卡塔尔': 'qa',
    '科特迪瓦': 'ci',
    '克罗地亚': 'hr',
    '库拉索': 'cw',
    '民主刚果': 'cd',
    '摩洛哥': 'ma',
    '墨西哥': 'mx',
    '南非': 'za',
    '挪威': 'no',
    '葡萄牙': 'pt',
    '日本': 'jp',
    '瑞典': 'se',
    '瑞士': 'ch',
    '塞内加尔': 'sn',
    '沙特': 'sa',
    '苏格兰': 'gb-sct',
    '土耳其': 'tr',
    '突尼斯': 'tn',
    '乌拉圭': 'uy',
    '乌兹别克斯坦': 'uz',
    '西班牙': 'es',
    '新西兰': 'nz',
    '伊朗': 'ir',
    '伊拉克': 'iq',
    '埃及': 'eg',
    '英格兰': 'gb-eng',
    '约旦': 'jo',
    '美国': 'us',
    '海地': 'ht',
};

/**
 * 根据中文国名获取 flagcdn.com URL
 * 不支持的返回 null
 */
export function getFlagUrl(country: string): string | null {
    const code = COUNTRY_CODES[country];
    if (!code) return null;
    return `https://flagcdn.com/w160/${code}.png`;
}
