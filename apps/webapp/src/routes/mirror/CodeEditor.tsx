import { useTheme } from '@/components/ThemeProvider';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import tsWorkerUrl from 'monaco-editor/esm/vs/language/typescript/ts.worker?url';
import editorWorkerUrl from 'monaco-editor/esm/vs/editor/editor.worker?url';

let ran = false;

export const CodeEditor = ({ code, setCode }: { code: string; setCode: (code: string) => void }) => {
    const theme = useTheme();

    const editorRef = useRef<HTMLDivElement | null>(null);
    const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const currentTheme = theme.theme === 'dark' ? 'vs-dark' : 'vs-light';

    useEffect(() => {
        const run = async () => {
            if (!editorRef.current || ran) return;
            ran = true;

            // load this from real file that is also accessible to backend
            const res = await fetch('/mirror-types.txt');

            const text = await res.text();
            const globalText = text
                .replace(/export declare /g, 'declare ')
                .replace(/export type /g, 'type ')
                .replace(/import .* from .*/g, ''); // Imports entfernen
            monaco.typescript.typescriptDefaults.addExtraLib(globalText, 'file:///node_modules/@sigauth/generics/mirror.d.ts');
            self.MonacoEnvironment = {
                getWorkerUrl: function (_, label) {
                    if (label === 'typescript' || label === 'javascript') {
                        return tsWorkerUrl;
                    }
                    return editorWorkerUrl;
                },
            };

            const editor = monaco.editor.create(editorRef.current, {
                value:
                    code.length > 0
                        ? code
                        : `export class MyMirror extends MirrorExecutor {
                        async init() {
                            // Your mirror initialization code here
                            // This function is called once when the mirror is created
                        }

                        async run(mirror: number, progressCallback: ProgressCallback, dataUtils: DataUtils) { 
                            // Your mirror logic here
                        }

                        async delete() {
                            // Your mirror cleanup code here
                            // This function is called when the mirror is deleted
                        }
                    }`,
                language: 'typescript',
                theme: currentTheme,
                automaticLayout: true,
            });
            await new Promise(resolve => setTimeout(resolve, 100)); // wait a bit to ensure the editor is ready
            editor.getAction('editor.action.formatDocument').run(editor.getModel()!.uri);

            editor.onDidChangeModelContent(_ => {
                setCode(editor.getValue());
            });
            monacoInstanceRef.current = editor;
            ran = false;
        };
        run();

        return () => monacoInstanceRef.current?.dispose();
    }, [theme.theme]);

    return <div ref={editorRef} className="h-[800px] w-full border border-black rounded-xl overflow-hidden" />;
};
