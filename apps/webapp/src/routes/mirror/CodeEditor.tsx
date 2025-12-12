import { useTheme } from '@/components/ThemeProvider';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import tsWorkerUrl from 'monaco-editor/esm/vs/language/typescript/ts.worker?url';
import editorWorkerUrl from 'monaco-editor/esm/vs/editor/editor.worker?url';

export const CodeEditor = ({ code, setCode }: { code: string; setCode: (code: string) => void }) => {
    const theme = useTheme();

    const editorRef = useRef<HTMLDivElement | null>(null);
    const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const currentTheme = theme.theme === 'dark' ? 'vs-dark' : 'vs-light';

    // Initialize editor once per component instance
    useEffect(() => {
        const run = async () => {
            if (!editorRef.current || monacoInstanceRef.current) return;

            // load this from real file that is also accessible to backend
            const res = await fetch('/mirror-types.txt');

            const text = await res.text();
            const globalText = text
                .replace(/export declare /g, 'declare ')
                .replace(/export type /g, 'type ')
                .replace(/import .* from .*/g, '');
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
                        async init(cb: Callback) {
                            // Your mirror initialization code here
                            // This function is called once when the mirror is created
                        }

                        async run(mirror: number, cb: Callback, dataUtils: DataUtils) { 
                            // Your mirror logic here
                        }

                        async delete(cb: Callback) {
                            // Your mirror cleanup code here
                            // This function is called when the mirror is deleted
                        }
                    }`,
                language: 'typescript',
                theme: currentTheme,
                automaticLayout: true,
            });

            await new Promise(resolve => setTimeout(resolve, 100));
            editor.getAction('editor.action.formatDocument').run(editor.getModel()!.uri);

            editor.onDidChangeModelContent(_ => {
                setCode(editor.getValue());
            });

            monacoInstanceRef.current = editor;
        };

        run();

        return () => {
            monacoInstanceRef.current?.dispose();
            monacoInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once per instance

    // Update editor value if `code` prop changes after mount
    useEffect(() => {
        const editor = monacoInstanceRef.current;
        if (editor && editor.getValue() !== code) {
            editor.setValue(code);
        }
    }, [code]);
    // React to theme changes without re-creating the editor
    useEffect(() => {
        if (monacoInstanceRef.current) {
            monaco.editor.setTheme(currentTheme);
        }
    }, [currentTheme]);

    return <div ref={editorRef} className="h-[800px] w-full border border-black rounded-xl overflow-hidden" />;
};
