import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { CodeEditor } from '@/routes/mirror/CodeEditor';

let ran = false;

export const MirrorPage: React.FC = () => {
    const { session } = useSession();
    const [code, setCode] = useState<string>('// Write your mirror code here');

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Mirrors</h2>

            <p className="leading-7 text-accent-foreground">
                Create and manage your mirrors here. You can create, edit, or delete them as you wish.
            </p>
            <CodeEditor code={code} setCode={setCode} />
        </>
    );
};
