import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并 className，自动解决 Tailwind 类名冲突 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
