interface PreviewPaneProps {
  html: string;
  mode: 'desktop' | 'mobile';
  onModeChange: (mode: 'desktop' | 'mobile') => void;
  onClose: () => void;
}

export function PreviewPane({ html, mode, onModeChange, onClose }: PreviewPaneProps) {
  return <section className="preview-panel" aria-label="Email preview">
    <div className="preview-heading">
      <div><span className="eyebrow">Recipient view</span><h2>Preview email</h2></div>
      <button type="button" className="icon-button close-preview" onClick={onClose} aria-label="Close preview">×</button>
    </div>
    <div className="preview-toolbar">
      <span className="preview-note">Rendering generated HTML</span>
      <div className="segmented-control"><button type="button" className={mode === 'desktop' ? 'active' : ''} onClick={() => onModeChange('desktop')}>Desktop</button><button type="button" className={mode === 'mobile' ? 'active' : ''} onClick={() => onModeChange('mobile')}>Mobile</button></div>
    </div>
    <div className={`preview-stage ${mode}`}><div className="preview-device"><iframe title="Generated email preview" sandbox="" srcDoc={html} /></div></div>
    <div className="preview-footnote"><span className="status-dot" /> This is the exact generated message body, wrapped in a responsive email-safe shell.</div>
  </section>;
}
