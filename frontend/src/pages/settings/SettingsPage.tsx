import { createSignal, createEffect, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  Settings,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Key,
  ShieldCheck,
  Save,
  Send,
} from 'lucide-solid';
import { currentProject, updateProject } from '@/stores/project.store';
import { projectsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SettingsPage() {
  const params = useParams();
  const toast = useToast();

  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [githubRepo, setGithubRepo] = createSignal('');
  const [webhookSecret, setWebhookSecret] = createSignal('');
  const [githubToken, setGithubToken] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [copiedWebhook, setCopiedWebhook] = createSignal(false);
  const [testingBot, setTestingBot] = createSignal(false);

  createEffect(() => {
    const proj = currentProject();
    if (proj) {
      setName(proj.name || '');
      setDescription(proj.description || '');
      setGithubRepo(proj.githubRepo || '');
      setWebhookSecret(proj.githubWebhookSecret || '');
    }
  });

  const webhookUrl = () => {
    const host = window.location.origin.replace(':5173', ':3000');
    return `${host}/api/v1/github/webhook`;
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl());
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.addToast('Webhook URL copied to clipboard', 'info');
  };

  const handleSave = async () => {
    const proj = currentProject();
    if (!proj) return;
    setSaving(true);
    try {
      await projectsApi.update(proj.id, {
        name: name(),
        description: description(),
      });
      await projectsApi.updateGitHubSettings(proj.id, {
        github_repo: githubRepo().trim(),
        github_webhook_secret: webhookSecret().trim(),
        github_token: githubToken().trim(),
      });
      await updateProject(proj.id, {
        name: name(),
        description: description(),
        githubRepo: githubRepo().trim(),
        githubWebhookSecret: webhookSecret().trim(),
      });
      toast.addToast('Settings saved successfully', 'success');
    } catch {
      toast.addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    try {
      const proj = currentProject();
      const payload = {
        action: 'opened',
        pull_request: {
          number: 1,
          title: `Feat: Connect GitHub Bot to ${proj?.key}-1`,
          body: `Resolves ${proj?.key}-1 automatically`,
          html_url: githubRepo() ? `https://github.com/${githubRepo().replace(/^https?:\/\/github\.com\//, '')}/pull/1` : 'https://github.com/fvrvz/managease/pull/1',
          user: { login: 'github-bot' },
          head: { ref: `feature/${proj?.key}-1-bot-link` },
        },
        repository: {
          full_name: githubRepo().replace(/^https?:\/\/github\.com\//, '') || 'fvrvz/managease',
          html_url: githubRepo() || 'https://github.com/fvrvz/managease',
        },
      };

      const res = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/v1/github/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'pull_request',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.addToast('Test PR webhook processed successfully!', 'success');
      } else {
        toast.addToast('Webhook endpoint responded with error', 'error');
      }
    } catch {
      toast.addToast('Could not reach webhook endpoint', 'error');
    } finally {
      setTestingBot(false);
    }
  };

  return (
    <div class="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <Settings class="w-5 h-5 text-blue-600" />
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Project & GitHub Settings</h1>
          </div>
          <p class="text-xs text-slate-500">
            Manage repository link, GitHub Bot webhooks, and project metadata for{' '}
            <span class="font-semibold text-slate-700">{params.projectKey}</span>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving()}
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          <span>{saving() ? 'Saving…' : 'Save Changes'}</span>
        </button>
      </div>

      {/* GitHub Integration Section */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              <GitBranch class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">GitHub Bot & PR Integration</h2>
              <p class="text-xs text-slate-500">Automatically link PRs, commits, and update issue statuses</p>
            </div>
          </div>

          <Show when={githubRepo()}>
            <a
              href={githubRepo().startsWith('http') ? githubRepo() : `https://github.com/${githubRepo()}`}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
            >
              <span>View Repository</span>
              <ExternalLink class="w-3.5 h-3.5 text-slate-400" />
            </a>
          </Show>
        </div>

        {/* GitHub Repository */}
        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            GitHub Repository (owner/repo or full URL)
          </label>
          <input
            type="text"
            placeholder="e.g. fvrvz/managease or https://github.com/fvrvz/managease"
            value={githubRepo()}
            onInput={(e) => setGithubRepo(e.currentTarget.value)}
            class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
          />
          <p class="text-[11px] text-slate-400">Used for links on cards, modals, and commit references.</p>
        </div>

        {/* Webhook URL */}
        <div class="space-y-1">
          <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            GitHub Webhook Payload URL
          </label>
          <div class="flex items-center gap-2">
            <code class="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 break-all select-all">
              {webhookUrl()}
            </code>
            <button
              onClick={copyWebhookUrl}
              class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
            >
              <Show when={copiedWebhook()} fallback={<Copy class="w-4 h-4" />}>
                <Check class="w-4 h-4 text-emerald-600" />
              </Show>
              <span>{copiedWebhook() ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p class="text-[11px] text-slate-500">
            Paste this URL into your GitHub repository settings (<code class="text-slate-700">Settings &gt; Webhooks &gt; Add webhook</code>).
          </p>
        </div>

        {/* Webhook Secret */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Webhook Secret (optional)
            </label>
            <input
              type="password"
              placeholder="Secret token for HMAC signature"
              value={webhookSecret()}
              onInput={(e) => setWebhookSecret(e.currentTarget.value)}
              class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              GitHub Bot PAT (optional)
            </label>
            <input
              type="password"
              placeholder="ghp_xxx (to post comments back on PRs)"
              value={githubToken()}
              onInput={(e) => setGithubToken(e.currentTarget.value)}
              class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Bot Features List */}
        <div class="bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
          <div class="font-bold text-blue-900 flex items-center gap-2">
            <Bot class="w-4 h-4 text-blue-600" />
            <span>How the ManagEase GitHub Bot works:</span>
          </div>
          <ul class="list-disc pl-5 space-y-1 text-slate-700">
            <li>
              When a PR is opened containing an issue key (e.g. <span class="font-mono font-bold text-blue-700">{params.projectKey}-1</span>), the bot links the PR and moves the status to <strong>In Progress / In Review</strong>.
            </li>
            <li>
              When the PR is merged, the bot transitions the issue to <strong>Done</strong> automatically.
            </li>
            <li>
              When commits reference the issue key, the bot logs the commit link in the issue activity comments.
            </li>
          </ul>
        </div>

        {/* Test Webhook Button */}
        <div class="pt-2 flex justify-end">
          <button
            onClick={handleTestBot}
            disabled={testingBot()}
            class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
          >
            <Send class="w-3.5 h-3.5 text-blue-600" />
            <span>{testingBot() ? 'Testing…' : 'Test GitHub Bot Webhook'}</span>
          </button>
        </div>
      </div>

      {/* General Project Metadata Section */}
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Project Details</h2>
        <Input
          label="Project Name"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          fullWidth
        />
        <div>
          <label class="text-xs font-semibold text-slate-700 uppercase tracking-wide block mb-1">
            Description
          </label>
          <textarea
            class="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 min-h-[80px]"
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
      </div>
    </div>
  );
}
export default SettingsPage;
