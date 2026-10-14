import { createSignal, createMemo, Show } from 'solid-js';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  FileCode,
  Quote,
  List,
  ListOrdered,
  SquareCheck,
  Link,
  Table,
  Minus,
  Eye,
  Pen,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-solid';
import clsx from 'clsx';

/**
 * Robust zero-dependency Markdown to HTML parser
 */
export function parseMarkdown(md: string): string {
  if (!md) return '';

  // 1. Preserve multi-line code blocks
  const codeBlocks: string[] = [];
  let html = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `\x00CODE${codeBlocks.length}\x00`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(
      `<pre><code class="${lang ? 'language-' + lang : ''}">${escaped}</code></pre>`
    );
    return placeholder;
  });

  // 2. Preserve inline code
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const placeholder = `\x00INLINE${inlineCodes.length}\x00`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return placeholder;
  });

  // 3. Tables
  html = html.replace(
    /((?:^|\n)\|[^\n]+\|\n\|(?:\s*:?-+:?\s*\|)+\n(?:\|[^\n]+\|\n?)+)/g,
    (tableMatch) => {
      const rows = tableMatch
        .trim()
        .split('\n')
        .map((r) => r.trim());
      if (rows.length < 2) return tableMatch;

      const headers = rows[0]
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      const bodyRows = rows.slice(2);

      let tableHtml = '<table><thead><tr>';
      headers.forEach((h) => {
        tableHtml += `<th>${h}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      bodyRows.forEach((r) => {
        const cells = r
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableHtml += '<tr>';
        cells.forEach((c) => {
          tableHtml += `<td>${c}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      return `\n${tableHtml}\n`;
    }
  );

  // 4. Blockquotes
  html = html.replace(/(?:^> ?[^\n]*(?:\n> ?[^\n]*)*)/gm, (quoteMatch) => {
    const lines = quoteMatch
      .split('\n')
      .map((l) => l.replace(/^> ?/, ''))
      .join('<br />');
    return `<blockquote>${lines}</blockquote>`;
  });

  // 5. Headings
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 6. Horizontal Rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />');

  // 7. Checklists
  html = html.replace(
    /^- \[(x|X)\] (.*)$/gm,
    '<li class="checklist-item"><input type="checkbox" checked disabled /> $2</li>'
  );
  html = html.replace(
    /^- \[ \] (.*)$/gm,
    '<li class="checklist-item"><input type="checkbox" disabled /> $1</li>'
  );

  // 8. Lists
  html = html.replace(/^[*-] (.*)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*)$/gm, '<li class="num-item">$1</li>');

  // Wrap lists
  html = html.replace(
    /((?:<li class="checklist-item">.*?<\/li>\s*)+)/gs,
    '<ul class="checklist">$1</ul>'
  );
  html = html.replace(
    /((?:<li class="num-item">.*?<\/li>\s*)+)/gs,
    (m) => `<ol>${m.replace(/class="num-item"/g, '')}</ol>`
  );
  html = html.replace(
    /((?:<li>.*?<\/li>\s*)+)/gs,
    '<ul>$1</ul>'
  );

  // 9. Links & Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 10. Inline text styles
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 11. Paragraphs (split by double newlines)
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|table|blockquote|\x00CODE|hr)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  // 12. Restore code blocks & inline code
  inlineCodes.forEach((code, i) => {
    html = html.split(`\x00INLINE${i}\x00`).join(code);
  });
  codeBlocks.forEach((code, i) => {
    html = html.split(`\x00CODE${i}\x00`).join(code);
  });

  return html;
}

export interface MarkdownViewerProps {
  content?: string;
  class?: string;
  emptyPlaceholder?: string;
}

export function MarkdownViewer(props: MarkdownViewerProps) {
  const htmlContent = createMemo(() => {
    if (!props.content?.trim()) return '';
    return parseMarkdown(props.content);
  });

  return (
    <Show
      when={props.content?.trim()}
      fallback={
        <p class="text-sm text-slate-400 italic">
          {props.emptyPlaceholder || 'No description provided.'}
        </p>
      }
    >
      <div
        class={clsx('jira-markdown', props.class)}
        innerHTML={htmlContent()}
      />
    </Show>
  );
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onSubmitShortcut?: () => void;
  showSaveCancel?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}

export function RichTextEditor(props: RichTextEditorProps) {
  const [activeTab, setActiveTab] = createSignal<'write' | 'preview'>('write');
  let textareaRef: HTMLTextAreaElement | undefined;

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const currentVal = props.value || '';
    const selectedText = currentVal.substring(start, end) || defaultText;

    let replacement = '';
    const newCursorPos = start + prefix.length;

    if (prefix.startsWith('#') || prefix.startsWith('> ') || prefix.startsWith('- ') || prefix.startsWith('1. ')) {
      // Line-based formatting
      const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
      const beforeLine = currentVal.substring(0, lineStart);
      const afterLine = currentVal.substring(lineStart);
      replacement = `${beforeLine}${prefix}${afterLine}`;
      props.onChange(replacement);
      setTimeout(() => {
        if (!textareaRef) return;
        textareaRef.focus();
        textareaRef.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
      return;
    }

    replacement =
      currentVal.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentVal.substring(end);

    props.onChange(replacement);

    setTimeout(() => {
      if (!textareaRef) return;
      textareaRef.focus();
      if (start === end) {
        textareaRef.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
      } else {
        textareaRef.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      }
    }, 0);
  };

  const insertTable = () => {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Value 1 | Value 2 | Value 3 |\n`;
    insertFormatting(tableTemplate);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (props.onSubmitShortcut) {
        e.preventDefault();
        props.onSubmitShortcut();
      } else if (props.onSave) {
        e.preventDefault();
        props.onSave();
      }
    }
  };

  return (
    <div class="w-full flex flex-col border border-slate-200 rounded-xl bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden">
      {/* Editor Header: Formatting Toolbar & Write / Preview Tabs */}
      <div class="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 px-2.5 py-1.5 gap-1">
        {/* Left: Toolbar Actions (active in Write mode) */}
        <div class="flex flex-wrap items-center gap-0.5">
          <Show
            when={activeTab() === 'write'}
            fallback={
              <span class="text-xs font-semibold text-slate-500 px-2 py-1">
                Markdown Preview
              </span>
            }
          >
            {/* Headings */}
            <button
              type="button"
              onClick={() => insertFormatting('# ', '', 'Heading 1')}
              title="Heading 1"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Heading1 class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ', '', 'Heading 2')}
              title="Heading 2"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Heading2 class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('### ', '', 'Heading 3')}
              title="Heading 3"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Heading3 class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Inline Formatting */}
            <button
              type="button"
              onClick={() => insertFormatting('**', '**', 'bold text')}
              title="Bold (Ctrl+B)"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Bold class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*', 'italic text')}
              title="Italic (Ctrl+I)"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Italic class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
              title="Strikethrough"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Strikethrough class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Code */}
            <button
              type="button"
              onClick={() => insertFormatting('`', '`', 'code')}
              title="Inline Code"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Code class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```', 'code block')}
              title="Code Block"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <FileCode class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ', '', 'Quote')}
              title="Blockquote"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Quote class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => insertFormatting('- ', '', 'List item')}
              title="Bullet List"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <List class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('1. ', '', 'Numbered item')}
              title="Numbered List"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <ListOrdered class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- [ ] ', '', 'Task')}
              title="Checklist"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <SquareCheck class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Link & Table & Divider */}
            <button
              type="button"
              onClick={() => insertFormatting('[', '](https://)', 'Link text')}
              title="Insert Link"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Link class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertTable}
              title="Insert Table"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Table class="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n---\n')}
              title="Horizontal Divider"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded transition"
            >
              <Minus class="w-4 h-4" />
            </button>
          </Show>
        </div>

        {/* Right: Write / Preview Mode Selector */}
        <div class="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg ml-auto">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            class={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition',
              activeTab() === 'write'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Pen class="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            class={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition',
              activeTab() === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Eye class="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div class="relative bg-white">
        <Show
          when={activeTab() === 'write'}
          fallback={
            <div
              class="p-3.5 overflow-y-auto bg-slate-50/30"
              style={{ 'min-height': props.minHeight || '130px' }}
            >
              <MarkdownViewer
                content={props.value}
                emptyPlaceholder="Nothing to preview yet."
              />
            </div>
          }
        >
          <textarea
            ref={textareaRef}
            class="w-full text-sm p-3.5 outline-none resize-y text-slate-800 placeholder-slate-400 font-sans leading-relaxed transition-colors border-0 focus:ring-0"
            style={{ 'min-height': props.minHeight || '130px' }}
            placeholder={props.placeholder || 'Write markdown... (supports bold, lists, code, tables)'}
            value={props.value || ''}
            onInput={(e) => props.onChange(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            onBlur={props.onBlur}
            disabled={props.disabled}
            autofocus={props.autoFocus}
          />
        </Show>
      </div>

      {/* Footer / Status or Save-Cancel Controls */}
      <Show when={props.showSaveCancel}>
        <div class="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2">
          <span class="text-[11px] text-slate-400">
            Press <kbd class="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">Cmd+Enter</kbd> to save
          </span>
          <div class="flex items-center gap-2">
            <Show when={props.onCancel}>
              <button
                type="button"
                onClick={props.onCancel}
                class="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-200/50 transition"
              >
                Cancel
              </button>
            </Show>
            <Show when={props.onSave}>
              <button
                type="button"
                onClick={props.onSave}
                disabled={props.saving}
                class="px-3.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs disabled:opacity-50 transition"
              >
                {props.saving ? 'Saving…' : 'Save'}
              </button>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
