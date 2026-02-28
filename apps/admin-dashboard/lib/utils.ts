import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const LIST_DEFAULT_PAGE_SIZE = 25;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

