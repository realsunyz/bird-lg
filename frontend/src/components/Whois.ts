export function renderWhois(): string {
  return `
    <div class="space-y-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Whois Query</span>
          <span class="label-text-alt">IP address, domain, or AS number</span>
        </label>
        <div class="join w-full">
          <input 
            type="text" 
            id="whois-input" 
            class="input input-bordered join-item flex-1" 
            placeholder="8.8.8.8, google.com, or AS13335"
          />
          <button id="whois-submit" class="btn btn-primary join-item">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Lookup
          </button>
        </div>
      </div>
      
      <div id="whois-result" class="hidden">
        <!-- Results will be rendered here -->
      </div>
    </div>
  `;
}

export function renderWhoisResult(data: string, error?: string): string {
  if (error) {
    return `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${escapeHtml(error)}</span>
      </div>
    `;
  }

  // Colorize whois output
  const lines = data
    .split("\n")
    .map((line) => colorizeWhoisLine(line))
    .join("\n");

  return `
    <div class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Whois Result
        </h3>
        <pre class="code-output text-xs">${lines}</pre>
      </div>
    </div>
  `;
}

function colorizeWhoisLine(line: string): string {
  line = escapeHtml(line);

  // Comments
  if (line.startsWith("%") || line.startsWith("#")) {
    return `<span class="opacity-50">${line}</span>`;
  }

  // Key-value pairs
  const match = line.match(/^([^:]+):\s*(.*)$/);
  if (match) {
    return `<span class="text-primary">${match[1]}:</span> ${match[2]}`;
  }

  return line;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
