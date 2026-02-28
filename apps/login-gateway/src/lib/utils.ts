import type { JSONSerializable } from '@sigauth/sdk/architecture';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function request(method: 'POST' | 'GET', url: string, jsonBody?: JSONSerializable): Promise<Response> {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // ensure cookies are sent with request
        body: JSON.stringify(jsonBody),
    });
    if (!res.ok) console.log('Request failed: ', res.status);
    return res;
}

export async function logout() {
    const res = await request('GET', '/api/auth/logout');
    if (res.ok) {
        window.location.reload();
    }
}

export async function getSessions() {
    const res = await request('GET', '/api/auth/sessions');
    if (res.ok) {
        return await res.json();
    }
}

export async function getGernericAppData(clientId: string): Promise<{ name: string; logo: string; url: string } | null> {
    const res = await request('GET', `/api/app/generic-info?client?id=${clientId}`);
    if (res.ok) {
        const data = await res.json();
        return data;
    }
    return null;
}

export const buildRedirectUrl = (params: Record<string, string>, url: string) => {
    const target = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
        target.searchParams.set(key, value);
    });

    return target.toString();
};

