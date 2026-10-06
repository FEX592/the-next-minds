import { useEffect, useRef } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageRequest: () => void;
  onButtonRequest: () => void;
}

const commands = [
  { label: 'B', title: 'Bold', command: 'bold', className: 'toolbar-bold' },
  { label: 'I', title: 'Italic', command: 'italic', className: 'toolbar-italic' },
  { label: 'U', title: 'Underline', command: 'underline', className: 'toolbar-underline' },
];

export function RichEditor({ value, onChange, onImageRequest, onButtonRequest }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const addLink = () => {
    const url = window.prompt('Paste a link URL');
    if (url) run('createLink', url);
  };

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting controls">
        {commands.map((item) => <button key={item.command} type="button" className={item.className} title={item.title} onMouseDown={(event) => event.preventDefault()} onClick={() => run(item.command)}>{item.label}</button>)}
        <span className="toolbar-divider" />
        <button type="button" title="Align left" onMouseDown={(event) => event.preventDefault()} onClick={() => run('justifyLeft')}>≡</button>
        <button type="button" title="Align center" onMouseDown={(event) => event.preventDefault()} onClick={() => run('justifyCenter')}>≡</button>
        <button type="button" title="Align right" onMouseDown={(event) => event.preventDefault()} onClick={() => run('justifyRight')}>≡</button>
        <span className="toolbar-divider" />
        <button type="button" title="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => run('insertUnorderedList')}>•≡</button>
        <button type="button" title="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => run('insertOrderedList')}>1≡</button>
        <button type="button" title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>↗</button>
        <button type="button" title="Insert uploaded image" onMouseDown={(event) => event.preventDefault()} onClick={onImageRequest}>▧</button>
        <button type="button" title="Insert button" onMouseDown={(event) => event.preventDefault()} onClick={onButtonRequest}>CTA</button>
        <span className="toolbar-divider" />
        <button type="button" title="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => run('undo')}>↶</button>
        <button type="button" title="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => run('redo')}>↷</button>
        <button type="button" title="Remove formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => run('removeFormat')}>Tx</button>
        <select aria-label="Text style" defaultValue="p" onChange={(event) => run('formatBlock', event.target.value)}>
          <option value="p">Body</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
      </div>
      <div
        className="rich-editor"
        contentEditable
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        data-placeholder="Write your message…"
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        onBlur={() => onChange(editorRef.current?.innerHTML ?? '')}
        suppressContentEditableWarning
      />
    </div>
  );
}
