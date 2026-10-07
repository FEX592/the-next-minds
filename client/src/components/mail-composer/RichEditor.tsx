import { useEffect, useRef, useState } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageRequest: () => void;
  onButtonRequest: () => void;
  /** Merge fields (e.g. {{firstName}}) shown as click-to-insert chips. */
  variables?: string[];
}

const commands = [
  { label: 'B', title: 'Bold', command: 'bold', className: 'toolbar-bold' },
  { label: 'I', title: 'Italic', command: 'italic', className: 'toolbar-italic' },
  { label: 'U', title: 'Underline', command: 'underline', className: 'toolbar-underline' },
];

// Readability only: put block-level tags on their own line when entering HTML view (whitespace between blocks is harmless in email).
const prettify = (html: string) => html.replace(/\s*(<(?:p|div|table|tbody|thead|tr|td|th|ul|ol|li|h[1-6]|blockquote|hr)\b)/gi, (_m, tag, offset: number) => (offset === 0 ? tag : `\n${tag}`)).trim();

export function RichEditor({ value, onChange, onImageRequest, onButtonRequest, variables }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const [htmlMode, setHtmlMode] = useState(false);

  useEffect(() => {
    if (!htmlMode && editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value, htmlMode]);

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const addLink = () => {
    const url = window.prompt('Paste a link URL');
    if (url) run('createLink', url);
  };

  const toggleHtml = () => {
    if (!htmlMode) onChange(prettify(editorRef.current?.innerHTML ?? value)); // capture the latest visual edits first
    setHtmlMode((on) => !on);
  };

  const insertVariable = (token: string) => {
    if (htmlMode) {
      const area = sourceRef.current;
      if (!area) return;
      const start = area.selectionStart, end = area.selectionEnd;
      onChange(value.slice(0, start) + token + value.slice(end));
      requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + token.length, start + token.length); });
      return;
    }
    editorRef.current?.focus();
    document.execCommand('insertText', false, token);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const keep = (event: React.MouseEvent) => event.preventDefault();
  const off = htmlMode;

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting controls">
        {commands.map((item) => <button key={item.command} type="button" disabled={off} className={item.className} title={item.title} onMouseDown={keep} onClick={() => run(item.command)}>{item.label}</button>)}
        <span className="toolbar-divider" />
        <button type="button" disabled={off} title="Align left" onMouseDown={keep} onClick={() => run('justifyLeft')}>≡</button>
        <button type="button" disabled={off} title="Align center" onMouseDown={keep} onClick={() => run('justifyCenter')}>≡</button>
        <button type="button" disabled={off} title="Align right" onMouseDown={keep} onClick={() => run('justifyRight')}>≡</button>
        <span className="toolbar-divider" />
        <button type="button" disabled={off} title="Bulleted list" onMouseDown={keep} onClick={() => run('insertUnorderedList')}>•≡</button>
        <button type="button" disabled={off} title="Numbered list" onMouseDown={keep} onClick={() => run('insertOrderedList')}>1≡</button>
        <button type="button" disabled={off} title="Add link" onMouseDown={keep} onClick={addLink}>↗</button>
        <button type="button" disabled={off} title="Insert uploaded image" onMouseDown={keep} onClick={onImageRequest}>▧</button>
        <button type="button" disabled={off} title="Insert button" onMouseDown={keep} onClick={onButtonRequest}>CTA</button>
        <span className="toolbar-divider" />
        <button type="button" disabled={off} title="Undo" onMouseDown={keep} onClick={() => run('undo')}>↶</button>
        <button type="button" disabled={off} title="Redo" onMouseDown={keep} onClick={() => run('redo')}>↷</button>
        <button type="button" disabled={off} title="Remove formatting" onMouseDown={keep} onClick={() => run('removeFormat')}>Tx</button>
        <span className="toolbar-divider" />
        <button type="button" className={`toolbar-html ${htmlMode ? 'active' : ''}`} aria-pressed={htmlMode} title={htmlMode ? 'Back to the visual editor' : 'Edit the HTML source'} onClick={toggleHtml}>{'</>'} HTML</button>
        <select aria-label="Text style" disabled={off} defaultValue="p" onChange={(event) => run('formatBlock', event.target.value)}>
          <option value="p">Body</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
      </div>
      {variables && variables.length > 0 && (
        <div className="editor-variables" aria-label="Insert merge field">
          <span>Insert</span>
          {variables.map((token) => <button key={token} type="button" onMouseDown={keep} onClick={() => insertVariable(token)}>{token}</button>)}
        </div>
      )}
      {htmlMode && (
        <textarea
          ref={sourceRef}
          className="html-editor"
          spellCheck={false}
          aria-label="HTML source"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <div
        className="rich-editor"
        style={{ display: htmlMode ? 'none' : undefined }}
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
