import type { JSONSerializable } from '@sigauth/sdk/architecture';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function streamChunks(response: Response, onChunk: (chunk: string) => void) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable body.');

    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
    }
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

